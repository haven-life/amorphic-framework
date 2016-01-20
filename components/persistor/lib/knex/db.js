module.exports = function (PersistObjectTemplate) {



    var Q = require('q');
    var _ = require('underscore');

    /**
     * Save the schema so we can keep track of indexes. Must be called before tables are synchronized
     * Should maybe be incorporated in setSchema as a trackIndexes option.
     * @param alias
     * @returns {*}
     */
    PersistObjectTemplate.saveSchema = function (alias) {

        var knex = this.getDB(alias).connection;
        var maxdbversion;
        var schemaTable = 'haven_schema1';
        var schemaField = 'schema';
        var latestVersion = 1;
        this._schematracker = this._schematracker || {};
        this._schemacache = {};

        var isSchemaUpdated = function(){
            return _.keys(this._schematracker.adds).length > 0 ||
                _.keys(this._schematracker.changes).length > 0 ||
                _.keys(this._schematracker.dels).length > 0
        }.bind(this)

        var updateSchema = (function () {
            if (isSchemaUpdated) {
                return knex(schemaTable).insert({
                    sequence_id: ++latestVersion,
                    schema: JSON.stringify(this._schema)
                })
            }
            return Q();
        }).bind(this);

        var diff = (function (memSchema, dbSchema) {
            var track = {add: {}, change: {}, delete: {}};
            _diff(dbSchema, memSchema, 'delete', true, function (dbIdx, memIdx) {
                return !memIdx;
            }, _diff(memSchema, dbSchema, 'change', false, function (memIdx, dbIdx) {
                return memIdx && dbIdx && !_.isEqual(memIdx, dbIdx);
            }, _diff(memSchema, dbSchema, 'add', true, function (memIdx, dbIdx) {
                return !dbIdx;
            }, track)));

            this._schematracker.dels = track.delete;
            this._schematracker.changes = track.change;
            this._schematracker.adds = track.add;

            function _diff(masterSchema, shadowSchema, opr, addMissingTable, addPredicate, diffs) {
                return Object.keys(masterSchema).reduce(function (diffs, table) {
                    if (shadowSchema[table]) {
                        (masterSchema[table].indexes || []).forEach(function (mstIdx) {
                            var shdIdx = _.findWhere(shadowSchema[table].indexes, {name: mstIdx.name});

                            if (addPredicate(mstIdx, shdIdx)) {
                                diffs[opr][table] = diffs[opr][table] || [];
                                diffs[opr][table].push(mstIdx);
                            }
                        });
                    } else {
                        diffs[opr][table] = diffs[opr][table] || [];
                        diffs[opr][table].push.apply(diffs[opr][table], masterSchema[table].indexes);
                    }
                    return diffs;
                }, diffs);
            }
        }).bind(this);

        var processDataAndUpdate = (function (dbSchema) {
            var currentschema = this._schema;
            var prevschema = {};
            if (dbSchema && dbSchema.schema)
                prevschema = JSON.parse(dbSchema.schema);
            diff(currentschema, prevschema);
        }).bind(this);


        function storeSchemaAndExtractChanges(alias) {
            var cx = this;
            return knex.schema.createTableIfNotExists(schemaTable, function (table) {
                table.increments('sequence_id').primary();
                table.text(schemaField);
                table.timestamps();
            }).then(function () {
                return knex(schemaTable)
                    .orderBy('sequence_id', 'desc')
                    .limit(1)
            }).then(function (record) {
                if (record[0] !== undefined)
                    latestVersion = record[0].sequence_id;
                return Q().then(processDataAndUpdate(record[0]));
            }).then(updateSchema).catch(function (error) {
                throw error;
            });
        }

        return storeSchemaAndExtractChanges.call(this, alias);
    }


    /**
     * Get a POJO by reading a table, optionally joining it to other tables
     *
     * @param template
     * @param joins
     * @param queryOrChains
     * @param options
     * @returns {*}
     */
    PersistObjectTemplate.getPOJOsFromKnexQuery = function (template, joins, queryOrChains, options) {

        var tableName = this.dealias(template.__table__);
        var knex = this.getDB(this.getDBAlias(template.__table__)).connection(tableName);

        // tack on outer joins.  All our joins are outerjoins and to the right.  There could in theory be
        // foreign keys pointing to rows that no longer exists
        var select = knex.select(getColumnNames.bind(this)()).from(tableName);
        joins.forEach(function (join) {
            select = select.leftOuterJoin(this.dealias(join.template.__table__) + " as " + join.alias,
                join.alias + "." + join.parentKey,
                this.dealias(template.__table__) + "." + join.childKey);
        }.bind(this));

        // execute callback to chain on filter functions or convert mongo style filters
        if (queryOrChains)
            if (typeof(queryOrChains) == "function")
                queryOrChains(select);
            else if (queryOrChains)
                select = this.convertMongoQueryToChains(tableName, select, queryOrChains);

        // Convert mongo style sort
        if (options && options.sort) {
            var ascending = [];
            var descending = [];
            _.each(options.sort, function (value, key) {
                if (value > 0)
                    ascending.push(tableName + "." + key);
                else
                    descending.push(tableName + "." + key);
            });
            if (ascending.length)
                select = select.orderBy(ascending);
            if (descending.length)
                select = select.orderBy(descending, 'DESC');
        }
        if (options && options.limit) {
            select = select.limit(options.limit)
            select = select.offset(0)
        }
        if (options && options.offset)
            select = select.offset(options.offset)

        var selectString = select.toSQL().sql;
        return select.then(processResults, processError);
        function processResults(res) {
            var joinstr = joins.reduce(function (prev, curr) {return prev + curr.template.__name__ + " "}, "");
            console.log("Fetched " + res.length + " " + template.__name__ + ' ' + joinstr +  ' ' + JSON.stringify(queryOrChains));
            return res;
        }

        function processError(err) {
            console.log(JSON.stringify(err));
            throw err;
        }

        function getColumnNames() {
            var cols = [];
            var self = this;

            asStandard(template, this.dealias(template.__table__));
            _.each(getPropsRecursive(template), function (defineProperties, prop) {
                as(template, this.dealias(template.__table__), prop, defineProperties)
            }.bind(this));
            _.each(joins, function (join) {
                asStandard(join.template, join.alias);
                _.each(getPropsRecursive(join.template), function (defineProperties, prop) {
                    as(join.template, join.alias, prop, defineProperties)
                })
            }.bind(this));
            return cols;
            function asStandard(template, prefix) {
                as(template, prefix, '__version__', {type: {}, persist: true, enumerable: true});
                as(template, prefix, '_template', {type: {}, persist: true, enumerable: true});
                as(template, prefix, '_id', {type: {}, persist: true, enumerable: true});
            }

            function as(template, prefix, prop, defineProperty) {
                var schema = template.__schema__;
                var type = defineProperty.type;
                var of = defineProperty.of;
                if (!self._persistProperty(defineProperty) || !defineProperty.enumerable)
                    return;
                if (type == Array && of.__table__) {
                    return;
                } else if (type.isObjectTemplate) {
                    if (!schema || !schema.parents || !schema.parents[prop] || !schema.parents[prop].id)
                        throw  new Error(type.__name__ + "." + prop + " is missing a parents schema entry");
                    prop = schema.parents[prop].id;
                }
                cols.push(prefix + "." + prop + " as " + (prefix ? prefix + "___" : "") + prop);
            }
            function getPropsRecursive(template, map) {
                map = map || {};
                _.map(template.getProperties(), function (val, prop) {map[prop] = val});
                template = template.__children__;
                template.forEach(function(template){
                    getPropsRecursive(template, map);
                });
                return map;
            }        }
    }
    /**
     * Get the count of rows
     *
     * @param template
     * @param queryOrChains
     * @returns {*}
     */
    PersistObjectTemplate.countFromKnexQuery = function (template, queryOrChains) {

        var tableName = this.dealias(template.__table__);
        var knex = this.getDB(this.getDBAlias(template.__table__)).connection(tableName);
        // execute callback to chain on filter functions or convert mongo style filters
        if (typeof(queryOrChains) == "function")
            queryOrChains(knex);
        else if (queryOrChains)
            (this.convertMongoQueryToChains)(tableName, knex, queryOrChains);

        return knex.count('_id').then(function (ret) {
            return ret[0].count * 1;
        });
    }


    /**
     *Check for table existence
     *
     * @param template
     * @param queryOrChains
     */
    PersistObjectTemplate.checkForKnexTable = function (template, tableName) {
        var tableName = tableName ? tableName : this.dealias(template.__table__);
        var knex = this.getDB(this.getDBAlias(template.__table__)).connection;
        return Q(knex.schema.hasTable(tableName));
    };

    /**
     * Check for column type in the database
     * @param template
     * @param column
     * @returns {*}
     */
    PersistObjectTemplate.checkForKnexColumnType = function(template, column) {
        var tableName = this.dealias(template.__table__);
        var knex = this.getDB(this.getDBAlias(template.__table__)).connection;
        return knex(tableName).columnInfo(column).then(function(column) {
            return column.type;
        });
    }

    /**
     * Drop the index if exists, tries to delete the constrain if the givne name is not an index.
     * @param template
     * @param indexName
     * @constructor
     */
    PersistObjectTemplate.DropIfKnexIndexExists = function (template, indexName) {
        var tableName = this.dealias(template.__table__)
        var knex = this.getDB(this.getDBAlias(template.__table__)).connection;
        if (indexName.indexOf('idx_') === -1)
            indexName = 'idx_' + tableName + '_' + indexName;

        return knex.schema.table(tableName, function (table) {
            table.dropIndex([], indexName);
        }).catch(function (error) {
            return knex.schema.table(tableName, function (table) {
                table.dropUnique([], indexName);

            })
        });
    }

    /**
     * Delete Rows
     *
     * @param template
     * @param queryOrChains

     * @returns {*}
     */
    PersistObjectTemplate.deleteFromKnexQuery = function (template, queryOrChains, txn) {

        var tableName = this.dealias(template.__table__);
        var knex = this.getDB(this.getDBAlias(template.__table__)).connection(tableName);
        knex.transacting(txn ? txn.knex : null);

        // execute callback to chain on filter functions or convert mongo style filters
        if (typeof(queryOrChains) == "function")
            queryOrChains(knex);
        else if (queryOrChains)
            (this.convertMongoQueryToChains)(tableName, knex, queryOrChains);

        return knex.delete();
    }
    PersistObjectTemplate.knexPruneOrphans = function (obj, property, txn, filterKey, filterValue) {

        var template= obj.__template__;
        var defineProperty = template.getProperties()[property]
        var tableName = this.dealias(defineProperty.of.__table__);
        var knex = this.getDB(this.getDBAlias(template.__table__)).connection(tableName);
        knex.transacting(txn ? txn.knex : null);
        var foreignKey = template.__schema__.children[property].id;
        var goodList = []
        _.each(obj[property], function(o) {
            if (o._id)
                goodList.push(o._id);
        });
        knex = (goodList.length > 0 ? knex.whereNotIn('_id', goodList) : knex)
        knex = knex.andWhere(foreignKey, obj._id)
        knex = (filterKey ? knex.andWhere(filterKey, filterValue) : knex);
        //console.log(knex.toSQL().sql + " ? = " + (filterValue || "") + " ? = " + obj._id + " ? = " + goodList.join(","))
        knex = knex.delete().then(function (res) {
            if (res)
                console.log(res + " " + tableName + " records pruned from " + obj._id);
        });

        return knex;
    }

    /**
     * Delete a Row
     *
     * @param template
     * @param queryOrChains

     * @returns {*}
     */
    PersistObjectTemplate.deleteFromKnexId = function (template, id, txn) {

        var tableName = this.dealias(template.__table__);
        var knex = this.getDB(this.getDBAlias(template.__table__)).connection(tableName);
        knex.transacting(txn ? txn.knex : null);
        return knex.where({_id: id}).delete();
    }

    /**
     * Save a Plain Old Javascript object given an Id.
     * @param obj
     * @param pojo
     * @param updateID
     * @returns {*}
     */
    PersistObjectTemplate.saveKnexPojo = function (obj, pojo, updateID, txn) {
        this.debug('saving ' + obj.__template__.__name__ + " to " + obj.__template__.__table__, 'io');
        var origVer = obj.__version__;
        var tableName = this.dealias(obj.__template__.__table__);
        var knex = this.getDB(this.getDBAlias(obj.__template__.__table__)).connection(tableName);

        obj.__version__ = obj.__version__ ? obj.__version__ * 1 + 1 : 1;
        pojo.__version__ = obj.__version__;
        console.log(txn ? txn.id : '-#-', (updateID ? 'updating ' : 'insert ') + obj.__id__ + ' ' + pojo.__version__);
        if (updateID)
            return Q(knex
                .where('__version__', '=', origVer).andWhere('_id', '=', updateID)
                .update(pojo)
                .transacting(txn ? txn.knex : null)
                .then(checkUpdateResults)
                .then(logSuccess.bind(this)))
        else
            return Q(knex
                .insert(pojo)
                .transacting(txn ? txn.knex : null)
                .then(logSuccess.bind(this)));

        function checkUpdateResults(countUpdated) {
            if (countUpdated < 1) {
                console.log(txn ? txn.id : '-#-', "update conflict on " + obj.__id__ + " looking for " + origVer);
                obj.__version__ = origVer;
                if (txn && txn.onUpdateConflict) {
                    txn.onUpdateConflict(obj)
                    txn.updateConflict =  true;
                } else
                    throw new Error("Update Conflict");
            }
        }

        function logSuccess() {
            this.debug('saved ' + obj.__template__.__name__ + " to " + obj.__template__.__table__ + " version " + obj.__version__, 'io');
        }
    }

    /**
     * tries to synchronize the POJO model updates to the table definition.
     * e.g. adding a new field will add a field to the table.
     * @param template
     * @returns {*}
     */
    PersistObjectTemplate.synchronizeKnexTableFromTemplate = function (template) {
        var aliasedTableName = template.__table__;
        var tableName = this.dealias(aliasedTableName);
        (function (){
            while(template.__parent__)
                template =  template.__parent__;
        })();
        if(!template.__table__)
            throw new Error(template.__name__ + " is missing a schema entry");

        var props = template.getProperties();
        var knex = this.getDB(this.getDBAlias(template.__table__)).connection
        var schema = template.__schema__;
        var _newFields = {};
        return Q().then(function(){
            return knex.schema.hasTable(tableName).then(function (exists) {
                if (!exists) {
                    return PersistObjectTemplate.createKnexTable(template, aliasedTableName);
                }
                else {
                    return discoverColumns(tableName).then(function () {
                        return knex.schema.table(tableName, columnMapper.bind(this))
                    }.bind(this));
                }
            }.bind(this))}.bind(this));

        function synchronizeIndexes(table) {
            _.each(Object.getOwnPropertyNames(this._schematracker), function (key) {
                var templateClone = _.clone(template);
                syncIndexesForHierarchy.call(this, key, templateClone);
            }.bind(this));

            function syncIndexesForHierarchy (operation, templateClone) {
                var tn = templateClone.__name__;
                _.map(this._schematracker[operation][tn], (function (object, key) {
                    var type = object.def.type;
                    var columns = object.def.columns;
                    var name = 'idx_' + tableName + '_' + object.name;
                    if (!this._schemacache[name]) {
                        this._schemacache[name] = true;
                        if (operation === 'add')
                            return table[type](columns, name);
                        else if (operation === 'dels')
                            return table['drop' + type.replace(/index/, 'Index')](name);
                        else
                            return table[type](columns, name);
                    }

                }).bind(this));
                templateClone.__children__.forEach(function (o) {
                    syncIndexesForHierarchy.call(this, operation, o);
                }.bind(this))
            };
        };

        function columnMapper(table) {

            for (var prop in _newFields) {
                var defineProperty = props[prop];
                if (!this._persistProperty(defineProperty) || !defineProperty.enumerable)
                    continue;

                if (defineProperty.type === Array) {
                    if (!defineProperty.of.__objectTemplate__)
                        table.text(prop);
                } else if (defineProperty.type.__objectTemplate__) {
                    if (!schema || !schema.parents || !schema.parents[prop] || !schema.parents[prop].id)
                        throw   new Error(defineProperty.type.__name__ + "." + prop + " is missing a parents schema entry");
                    var foreignKey = (schema.parents && schema.parents[prop]) ? schema.parents[prop].id : prop;
                    table.text(foreignKey);
                } else if (defineProperty.type === Number) {
                    table.float(prop);
                } else if (defineProperty.type === Date) {
                    table.timestamp(prop);
                } else if (defineProperty.type === Boolean) {
                    table.boolean(prop);
                } else
                    table.text(prop);
            }
            synchronizeIndexes.call(this, table);
        }


        function discoverColumns(table) {
            return knex(table).columnInfo().then(function (info) {
                for (var prop in props) {
                    var defineProperty = props[prop];
                    if (PersistObjectTemplate._persistProperty(defineProperty)) {
                        if (!info[propToColumnName(prop)]) {
                            _newFields[prop] = props[prop];
                        }
                        else {
                            if (!iscompatible(props[prop].type.name, info[propToColumnName(prop)].type)) {
                                throw new Error("changing types for the fields is not allowed, please use scripts to make these changes");
                            }
                        }
                    }
                }
            });

            function propToColumnName(prop) {
                var defineProperty = props[prop];
                if (defineProperty.type.__objectTemplate__)
                    if (!schema || !schema.parents || !schema.parents[prop] || !schema.parents[prop].id)
                        throw   new Error(template.__name__ + "." + prop + " is missing a parents schema entry");
                    else
                        prop = (schema.parents && schema.parents[prop]) ? schema.parents[prop].id : prop;
                return prop;
            }
        }

        function iscompatible(persistortype, pgtype) {
            switch (persistortype) {
                case 'String':
                case 'Object':
                case 'Array':
                    return pgtype.indexOf('text') > -1;
                case 'Number':
                    return pgtype.indexOf('real') > -1;
                case 'Boolean':
                    return pgtype.indexOf('bool') > -1;
                case 'Date':
                    return pgtype.indexOf('timestamp') > -1;
                default:
                    return pgtype.indexOf('text') > -1; // Typed objects have no name
            }
        }
    }

    PersistObjectTemplate.persistTouchKnex = function(obj, txn) {
        this.debug('touching ' + obj.__template__.__name__ + " to " + obj.__template__.__table__, 'io');
        console.log('touching ' + obj.__template__.__name__ + " to " + obj.__template__.__table__);
        var tableName = this.dealias(obj.__template__.__table__);
        var knex = this.getDB(this.getDBAlias(obj.__template__.__table__)).connection(tableName);
        obj.__version__++;
        return knex
            .transacting(txn ? txn.knex : null)
            .where('_id', '=', obj._id)
            .increment('__version__', 1)
    }

    /**
     * Create a table based on the schema definitions, will consider even indexes creation.
     * @param template
     * @returns {*}
     */
    PersistObjectTemplate.createKnexTable = function (template, collection) {
        var collection = collection || template.__table__;
        (function (){
            while(template.__parent__)
                template =  template.__parent__;
        })();

        var props = template.getProperties();
        var knex = this.getDB(this.getDBAlias(collection)).connection
        var tableName = this.dealias(collection);
        var _cacheIndex = [];

        return knex.schema.createTable(tableName, createColumns.bind(this));
        function setIndex(table, index) {
            if (index.def) {
                if (index.def.type !== 'unique' && index.def.type !== 'index')
                    throw new Error('index type can be only "unique" or "index"');
                var name = _.reduce(index.def.columns, function (name, col) {
                    return name + '_' + col;
                }, 'idx_' + tableName);
                if (!_.contains(_cacheIndex, name)) {
                    _cacheIndex.push(name);
                    table[index.def.type](index.def.columns, name);
                }
            }
        }
        function createIndexes(table, schema) {
            if (!schema) return;
            if (schema.indexes) {
                schema.indexes.forEach(function (index) {
                        setIndex(table, index);
                    }.bind(this)
                )
            }
        }

        function createColumns(table) {
            table.string('_id').primary();
            table.string('_template');
            table.biginteger('__version__');
            var columnMap = {};

            recursiveColumnMap.call(this, template);

            function mapTableAndIndexes(table, props, schema) {
                for (var prop in props) {
                    if (!columnMap[prop]) {
                        var defineProperty = props[prop];
                        if (!this._persistProperty(defineProperty) || !defineProperty.enumerable)
                            continue;
                        if (defineProperty.type === Array) {
                            if (!defineProperty.of.__objectTemplate__)
                                table.text(prop);
                        } else if (defineProperty.type.__objectTemplate__) {
                            if (!schema || !schema.parents || !schema.parents[prop] || !schema.parents[prop].id)
                                throw   new Error(template.__name__ + "." + prop + " is missing a parents schema entry");
                            var foreignKey = (schema.parents && schema.parents[prop]) ? schema.parents[prop].id : prop;
                            table.text(foreignKey);
                        } else if (defineProperty.type === Number) {
                            table.float(prop);
                        } else if (defineProperty.type === Date) {
                            table.timestamp(prop);
                        } else if (defineProperty.type === Boolean) {
                            table.boolean(prop);
                        } else
                            table.text(prop);
                        columnMap[prop] = true;
                    }
                }
                createIndexes.call(this, table, schema);
            }

            function recursiveColumnMap(childTemplate) {
                if(childTemplate) {
                    mapTableAndIndexes.call(this, table, childTemplate.defineProperties, childTemplate.__schema__);
                    childTemplate = childTemplate.__children__;
                    childTemplate.forEach(function(o){
                        recursiveColumnMap.call(this, o);
                    }.bind(this));
                }
            }
        }
    }

    /**
     * Drop table if exists, just a wrapper method on Knex library.
     * @param template
     * @returns {*}
     */
    PersistObjectTemplate.dropKnexTable = function (template, tableName) {

        var props = template.getProperties();
        var knex = this.getDB(this.getDBAlias(template.__table__)).connection
        var tableName = tableName ? tableName : this.dealias(template.__table__);
        var schema = template.__schema__;

        return Q(knex.schema.dropTableIfExists(tableName));
    }

    /**
     * Take a query object like {$or: [{type: 'foo'}, {x: {$gt: 4}, y: {$lte: 6}}]}
     * which could also be expressed as: {$or: [{type: 'foo'}, {$and: [{x: {$gt: 4}}, {y: {$lte: 6}}]}]}
     * and append to a knex statement like knex('table').select('*') these chains ...
     * .where('type', '=', 'foo').orWhere(function () {
     *    this.where(x, '>', 4).andWhere(y, '<=', 6)
     * });
     *
     * {$or: [{type: 'foo', subtype: 'bar'}, {$or:[{x: {$gt: 4}}, {x: 9}], y: {$lte: 6}}]}
     * .where('type', '=', 'foo').orWhere(function () {
     *    this.where(function () {
     *      this.where(x, '>', 4).orWhere(x, '=' 9)
     *    }).andWhere(y, '<=', 6)
     * });     *
     * @param statement
     * @param query
     * @returns {*}
     */
    PersistObjectTemplate.convertMongoQueryToChains = function (alias, statement, query) {

        /**
         * Traverse an object and produce a promise chain of where and andWhere
         * @param statement
         * @param query
         * @returns {*}
         */
        function traverse(statement, query) {
            var firstProp = true;
            for (var prop in query) {
                var params = processProp(statement, prop, query[prop]);
                statement = firstProp ?
                    (params.length > 1 ? statement.where(params[0], params[1], params[2]) :
                        statement.where(params[0])) :
                    (params.length > 1 ? statement.andWhere(params[0], params[1], params[2]) :
                        statement.andWhere(params[0]));
                firstProp = false;
            }
            return statement;
        }

        function processProp(statement, prop, value) {
            if (value instanceof Array)
                return processArrayProp(prop, value);
            else
                return processNonArrayProp(prop, value)
        }

        function processArrayProp(prop, value) {
            return [function () {
                var statement = this;
                if (prop.toLowerCase() == '$and') {
                    var firstProp = true;
                    _.each(value, function (obj) {
                        var params = processObject(statement, obj);
                        statement = firstProp ?
                            (params.length > 1 ? statement.where(params[0], params[1], params[2]) :
                                statement.where(params[0])) :
                            (params.length > 1 ? statement.andWhere(params[0], params[1], params[2]) :
                                statement.andWhere(params[0]));
                        firstProp = false;
                    });
                } else if (prop.toLowerCase() == '$or') {
                    var firstProp = true;
                    _.each(value, function (obj) {
                        var params = processObject(statement, obj);
                        statement = firstProp ?
                            (params.length > 1 ? statement.where(params[0], params[1], params[2]) :
                                statement.where(params[0])) :
                            (params.length > 1 ? statement.orWhere(params[0], params[1], params[2]) :
                                statement.andWhere(params[0]));
                        firstProp = false
                    });
                } else if (prop.toLowerCase() == '$in')
                    statement = statement.whereIn(value);
                else if (prop.toLowerCase() == '$nin')
                    statement = statement.whereNotIn(value);
                else
                    throw "Don't support " + prop + ":" + JSON.stringify(value)
            }];
        }

        /**
         * Process an array element of a $or or $and.  This will result in either three parameters in
         * the form of prop, compare operator, value or a single parameter which is a function that
         * will chain together a nested expression.
         * @param statment
         * @param obj
         * @returns {Function}
         */
        function processObject(statement, obj) {
            var propCount = 0;
            var singleProp;

            // Do we have more than one prop
            for (var prop in obj) {
                singleProp = prop;
                ++propCount;
            }
            var value = obj[singleProp];

            // If so fetch the 3 parameters for a where, orWhere or andWhere chain
            // Otherwise return a function that will chain sub-ordinate clauses
            if (propCount == 1)
                return processProp(statement, singleProp, obj[singleProp]);
            else
                return [function () {
                    traverse(statement, obj)
                }]
        }

        function processNonArrayProp(prop, value) {
            var params = [];
            if (value instanceof Date || typeof(value) == 'string' || typeof(value) == 'number') {
                params[0] = alias + "." + prop;
                params[1] = '=';
                params[2] = value;
            } else
                for (subProp in value) {
                    params[0] = alias + "." + prop;
                    params[2] = value[subProp];
                    if (subProp.toLowerCase() == '$eq')
                        params[1] = '=';
                    else if (subProp.toLowerCase() == '$gt')
                        params[1] = '>';
                    else if (subProp.toLowerCase() == '$gte')
                        params[1] = '>=';
                    else if (subProp.toLowerCase() == '$lt')
                        params[1] = '<';
                    else if (subProp.toLowerCase() == '$lte')
                        params[1] = '<=';
                    else if (subProp.toLowerCase() == '$ne')
                        params[1] = '!=';
                    else if (subProp.toLowerCase() == '$in')
                        (function () {
                            var attr = params[0];
                            var values = params[2];
                            params = [function () {
                                this.whereIn(attr, values)
                            }];
                        })()
                    else if (subProp.toLowerCase() == '$nin')
                        (function () {
                            var attr = params[0];
                            var values = params[2];
                            params = [function () {
                                this.whereNotIn(attr, values)
                            }];
                        })()
                    else if (subProp.toLowerCase() == '$regex') {
                        params[1] = value.$options && value.$options.match(/i/) ? '~*' : '~';
                        delete value['$options']
                        if (params[2] && params[2].source)
                            params[2] = params[2].source;
                    } else
                        throw "Can't handle " + prop + ":" + JSON.stringify((value));
                }
            return params;
        }

        return traverse(statement, query)
    }


}