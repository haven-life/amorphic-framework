import * as Knex from 'knex';
import * as _ from 'underscore';

export namespace Indexes {
    export async function sync (persistor, tableName, template) {
        let aliasedTableName: string = template.__table__;
        tableName = persistor.dealias(aliasedTableName);

        while (template.__parent__) {
            template =  template.__parent__;
        }

        if (!template.__table__) {
            throw new Error(`${template.__name__} is missing a schema entry`);
        }
        const knex = persistor.getDB(persistor.getDBAlias(template.__table__)).connection;
        let schema = persistor._schema;

        var _changes =  {};
        const schemaTable = 'index_schema_history';
        const schemaField = 'schema';

        try {
            // Loading the Schema definition
            const loadRes = await loadSchema(tableName, undefined, knex, schemaTable, schemaField, template);
            let _dbschema = loadRes._dbschema;
            let name = loadRes.name && loadRes.name;

            // Loading Table Definition
            let res = loadTableDef(_dbschema, schema, name);
            _dbschema = res._dbschema;
            name = res.name;
            schema = res.schema;

            diffTable(_dbschema, schema, name, _changes);

            generateChanges(template, undefined, tableName, _changes, _dbschema);

            const dbChanges = mergeChanges(_changes, tableName);

            await applyTableChanges(dbChanges, knex, tableName);

            return await makeSchemaUpdates(_changes, knex, schemaTable, schemaField, schema);
        }
        catch (err) {
            throw err;
        }
    }

    async function loadSchema (tableName: string, _dbschema, knex: Knex, schemaTable: string, schemaField: string, template) {

        if (!!_dbschema) {
            //@ts-ignore
            return {_dbschema: tableName};
        }

        const exists = await knex.schema.hasTable(schemaTable);

        // create
        if (!exists) {
            await knex.schema.createTable(schemaTable, (table) => { // @TODO: need to issue a PR to knex for bad type. This is ASYNC
                table.increments('sequence_id').primary();
                table.text(schemaField);
                table.timestamps();
            })
        }

        const record = knex(schemaTable).orderBy('sequence_id', 'desc').limit(1);

        if(!record[0]) {
            return {_dbschema: {}, name: template.__name__};
        }
        else {
            const parsedSchema = JSON.parse(record[0][schemaField]);
            return {_dbschema: parsedSchema, name: template.__name__};
        }
    }

    // Check to see if Table Definition exists
    function loadTableDef(dbschema, schema, tableName) {
        if (!dbschema[tableName])
            dbschema[tableName] = {};
        return {_dbschema: dbschema, schema: schema, name: tableName};
    }

    // Wizardry @TODO: ask Ravi
    function diffTable (_dbSchema, schema, tableName: string, _changes) {
        const dbTableDef = _dbSchema[tableName];
        const memTableDef = schema[tableName];
        const track = {add: [], change: [], delete: []};

        const firstDiffs = diff(memTableDef, dbTableDef, 'add', true, function (_memIdx, dbIdx) {
            return !dbIdx;
        }, track);

        const secondDiffs =  diff(memTableDef, dbTableDef, 'change', false, function (memIdx, dbIdx) {
            return memIdx && dbIdx && !_.isEqual(memIdx, dbIdx);
        }, firstDiffs);

        const thirdDiffs = diff(dbTableDef, memTableDef, 'delete', false, function (_dbIdx, memIdx) {
            return !memIdx;
        }, secondDiffs);

        _changes[tableName] = _changes[tableName] || {};

        _.map(_.keys(track), function(key) {
            _changes[tableName][key] = _changes[tableName][key] || [];
            _changes[tableName][key].push.apply(_changes[tableName][key], track[key]);
        });
    }

    function generateChanges(localTemplate, _value, tableName, _changes, _dbSchema) {
        const children = localTemplate.__children__;
        for (let index = 0; index < children.length; index++) {
            const child = children[index];

            const res = loadTableDef(_dbSchema, child, tableName);
            diffTable(res._dbschema, res.schema, res.name, _changes);
            generateChanges(child, _value, tableName, _changes, _dbSchema);
        }
    }

    function mergeChanges(_changes, tableName) {
        const dbChanges =  {add: [], change: [], delete: []};
        _.map(dbChanges, function(_object, key) {
            _.each(_changes, function(change) {
                var uniqChanges = _.uniq(change[key], (o: any) => o.name);
                const filtered = getFilteredTarget(dbChanges[key], uniqChanges, tableName);
                dbChanges[key].push.apply(dbChanges[key], filtered);
            })
        });

        return dbChanges;
    }

    async function applyTableChanges(dbChanges, knex: Knex, tableName: string) {
        return await knex.transaction(async function (trx) {
            return await trx.schema.table(tableName, function (table) {
                syncIndexesForHierarchy('delete', dbChanges, table, tableName);
                syncIndexesForHierarchy('add', dbChanges, table, tableName);
                syncIndexesForHierarchy('change', dbChanges, table, tableName);
            })
        })
    }

    async function makeSchemaUpdates(_changes, knex: Knex, schemaTable: string, schemaField: string, schema): Promise<number[]> {
        const chgFound = _.reduce(_changes, (curr, change) => curr || !!isSchemaChanged(change), false);

        if (!chgFound) return;

        const record = await knex(schemaTable).orderBy('sequence_id', 'desc').limit(1);
        let response = {}, sequence_id;
        if (!record[0]) {
            sequence_id = 1;
        } else {
            response = JSON.parse(record[0][schemaField]);
            sequence_id = ++record[0].sequence_id;
        }

        _.each(_changes,  (_o, chgKey) => response[chgKey] = schema[chgKey]);

        return knex(schemaTable).insert({
            sequence_id: sequence_id,
            schema: JSON.stringify(response)
        });
    }


    // Helpers

    function diff(masterTblSchema, shadowTblSchema, opr, addMissingTable, addPredicate, diffs) {

        if (!!masterTblSchema && !!masterTblSchema.indexes && masterTblSchema.indexes instanceof Array && !!shadowTblSchema) {
            if (masterTblSchema.indexes) {
                masterTblSchema.indexes.forEach((mstIdx) => {
                    var shdIdx = _.findWhere(shadowTblSchema.indexes, {name: mstIdx.name});

                    if (addPredicate(mstIdx, shdIdx)) {
                        diffs[opr] = diffs[opr] || [];
                        diffs[opr].push(mstIdx);
                    }
                });
            }
        } else if (addMissingTable && !!masterTblSchema && !!masterTblSchema.indexes) {
            diffs[opr] = diffs[opr] || [];
            diffs[opr].push.apply(diffs[opr], masterTblSchema.indexes);
        }
        return diffs;
    }

    function getFilteredTarget(src, target, tableName) {
        return _.filter(target, function iterator(o: any, _filterkey) {
            var currName: string = _.reduce(o.def.columns,  (name, col) => `${name}_${col}`, `idx_${tableName}`);

            return !_.find(src, function(cached: any) {
                var cachedName = _.reduce(cached.def.columns, (name, col) => `${name}_${col}`, `idx_${tableName}`);
                return cachedName.toLowerCase() === currName.toLowerCase()
            })
        });
    }

    function syncIndexesForHierarchy (operation, diffs, table, tableName) {
        _.map(diffs[operation], function (object: any, _key) {
            var type = object.def.type;
            var columns = object.def.columns;
            if (type !== 'unique' && type !== 'index')
                throw new Error('index type can be only "unique" or "index"');

            var name = _.reduce(object.def.columns, function (name, col) {
                return `${name}_${col}`;
            }, `idx_${tableName}`);

            name = name.toLowerCase();
            if (operation === 'add') {
                table[type](columns, name);
            }
            else if (operation === 'delete') {
                type = type.replace(/index/, 'Index');
                type = type.replace(/unique/, 'Unique');
                table[`drop${type}`]([], name);
            }
            else
                table[type](columns, name);

        });
    }

    function isSchemaChanged(object) {
        return (object.add.length || object.change.length || object.delete.length);
    }
}