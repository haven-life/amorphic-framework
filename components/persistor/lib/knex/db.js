module.exports = function (PersistObjectTemplate) {

    var Promise = require('bluebird');
    var _ = require('underscore');

    /**
     * Get a POJO by reading a table, optionally joining it to other tables
     *
     * @param template
     * @param joins
     * @param queryOrChains
     * @param options
     * @returns {*}
     */
    PersistObjectTemplate.getPOJOsFromKnexQuery = function (template, joins, queryOrChains, options, map, logger) {

        var tableName = this.dealias(template.__table__);
        var knex = this.getDB(this.getDBAlias(template.__table__)).connection(tableName);

        // tack on outer joins.  All our joins are outerjoins and to the right.  There could in theory be
        // foreign keys pointing to rows that no longer exists
        var select = knex.select(getColumnNames.bind(this, template)()).from(tableName);
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

        var selectString = select.toString();
        if (map && map[selectString])
            return new Promise(function (resolve) {
                map[selectString].push(resolve);
            })
        if (map)
            map[selectString] = [];

        (logger || this.logger).debug({component: 'persistor', module: 'db.getPOJOsFromKnexQuery', activity: 'pre',
            data: {template: template.__name__, query: queryOrChains}});
        return select.then(processResults.bind(this), processError);
        function processResults(res) {
            var joinstr = joins.reduce(function (prev, curr) {return prev + curr.template.__name__ + " "}, "");
            (logger || this.logger).debug({component: 'persistor', module: 'db.getPOJOsFromKnexQuery', activity: 'post',
                data: {count: res.length, template: template.__name__, query: queryOrChains}});
            if (map && map[selectString]) {
                map[selectString].forEach(function(resolve){
                    //console.log("Consolidated request for " + selectString);
                    resolve(res)
                });
                delete map[selectString];
            }
            return res;
        }

        function processError(err) {
            console.log(JSON.stringify(err));
            throw err;
        }

        function getColumnNames(template) {
            var cols = [];
            var self = this;

            while(template.__parent__)
                template = template.__parent__;

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
                _.map(template.getProperties(), function (val, prop) {
                    map[prop] = val
                });
                template = template.__children__;
                template.forEach(function (template) {
                    getPropsRecursive(template, map);
                });
                return map;
            }
        }
    }
    /**
     * Get the count of rows
     *
     * @param template
     * @param queryOrChains
     * @returns {*}
     */
    PersistObjectTemplate.countFromKnexQuery = function (template, queryOrChains, logger) {

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
        return knex.schema.hasTable(tableName);
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
    PersistObjectTemplate.deleteFromKnexQuery = function (template, queryOrChains, txn, logger) {

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
    PersistObjectTemplate.knexPruneOrphans = function (obj, property, txn, filterKey, filterValue, logger) {

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
                (logger || this.logger).debug({component: 'persistor', module: 'db.knexPruneOrphans', activity: 'post',
                    data: {count: res, table: tableName, id: obj._id}});
        }.bind(this));

        return knex;
    }

    /**
     * Delete a Row
     *
     * @param template
     * @param queryOrChains

     * @returns {*}
     */
    PersistObjectTemplate.deleteFromKnexId = function (template, id, txn, logger) {

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
    PersistObjectTemplate.saveKnexPojo = function (obj, pojo, updateID, txn, logger) {
        var origVer = obj.__version__;
        var tableName = this.dealias(obj.__template__.__table__);
        var knex = this.getDB(this.getDBAlias(obj.__template__.__table__)).connection(tableName);

        obj.__version__ = obj.__version__ ? obj.__version__ * 1 + 1 : 1;
        pojo.__version__ = obj.__version__;
        (logger || this.logger).debug({component: 'persistor', module: 'db.saveKnexPojo', activity: 'pre',
            data: {txn: (txn ? txn.id + " ": '-#- '), type: (updateID ? 'updating ' : 'insert '),
                template: obj.__template__.__name__, id: obj.__id__, _id: obj._id, __version__: pojo.__version__}});
        if (updateID)
            return Promise.resolve(knex
                .where('__version__', '=', origVer).andWhere('_id', '=', updateID)
                .update(pojo)
                .transacting(txn ? txn.knex : null)
                .then(checkUpdateResults.bind(this))
                .then(logSuccess.bind(this)))
        else
            return Promise.resolve(knex
                .insert(pojo)
                .transacting(txn ? txn.knex : null)
                .then(logSuccess.bind(this)));

        function checkUpdateResults(countUpdated) {
            if (countUpdated < 1) {
                (logger || this.logger).debug({component: 'persistor', module: 'db.saveKnexPojo', activity: 'updateConflict',
                    data: {txn: (txn ? txn.id : '-#-'), id: obj.__id__, __version__: origVer}});
                obj.__version__ = origVer;
                if (txn && txn.onUpdateConflict) {
                    txn.onUpdateConflict(obj)
                    txn.updateConflict =  true;
                } else
                    throw new Error("Update Conflict");
            }
        }

        function logSuccess() {
            (logger || this.logger).debug({component: 'persistor', module: 'db.saveKnexPojo', activity: 'post',
                data: {template: obj.__template__.__name__, table: obj.__template__.__table__, __version__: obj.__version__}});
        }
    }

    /**
     * tries to synchronize the POJO model updates to the table definition.
     * e.g. adding a new field will add a field to the table.
     * @param template
     * @returns {*}
     */
    PersistObjectTemplate.synchronizeKnexTableFromTemplate = function (template, changeNotificationCallback) {
        var aliasedTableName = template.__table__;
        var tableName = this.dealias(aliasedTableName);

        while(template.__parent__)
            template =  template.__parent__;

        if(!template.__table__)
            throw new Error(template.__name__ + " is missing a schema entry");

        var props = getPropsRecursive(template);
        var knex = this.getDB(this.getDBAlias(template.__table__)).connection
        var schema = template.__schema__;
        var _newFields = {};

        return Promise.resolve().then(function () {
                return knex.schema.hasTable(tableName).then(function (exists) {
                    if (!exists) {
                        if (!!changeNotificationCallback) changeNotificationCallback('A new table, ' + tableName + ', has been added\n');
                        return PersistObjectTemplate._createKnexTable(template, aliasedTableName);
                    }
                    else {
                        return discoverColumns(tableName).then(function () {
                            fieldChangeNotify(changeNotificationCallback, tableName);
                            return knex.schema.table(tableName, columnMapper.bind(this))
                        }.bind(this));
                    }
                }.bind(this))
            }.bind(this))
            .then(synchronizeIndexes.bind(this, tableName, template));

        function fieldChangeNotify(callBack, table) {
            if (!callBack) return;
            if (typeof callBack !== 'function')
                throw new Error('persistor can only notify the field changes through a callback')
            var fieldsChanged = _.reduce(_newFields, function(current, field, key){
                return field.type !== Array ? current + ',' + key: current;
            }, '');

            if (fieldsChanged.length > 0){
                callBack('Following fields are being added to ' + table + ' table: \n ' + fieldsChanged.slice(1, fieldsChanged.length));
            }
        }
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
                    table.double(prop);
                } else if (defineProperty.type === Date) {
                    table.timestamp(prop);
                } else if (defineProperty.type === Boolean) {
                    table.boolean(prop);
                } else
                    table.text(prop);
            }
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
                for (var columnName in info) {
                    var prop = columnNameToProp(columnName);
                    if (!prop) {
                        PersistObjectTemplate.logger.info({component: 'persistor', module: 'db.synchronizeKnexTableFromTemplate', activity: 'discoverColumns'}, "Extra column " + columnName + " on " + table);
                        commentOn(table, columnName, 'now obsolete');
                    } else {
                        if (prop == '_id')
                            commentOn(table, columnName, "primary key");
                        else if (prop.match(/:/)) {
                            prop = prop.substr(1);
                            commentOn(table, columnName, getForeignKeyDescription(props[prop]));
                        } else if (prop == '_template')
                            commentOn(table, columnName, getClassNames(prop));
                        else if (prop != '__version__')
                            commentOn(table, columnName, getDescription(prop, props[prop]));
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
            function columnNameToProp(columnName) {
                if (columnName  == '_id' || columnName == '__version__' || columnName == '_template')
                    return columnName;
                if (props[columnName])
                    return columnName;
                if (!schema || !schema.parents)
                    return false;
                for (var parent in schema.parents)
                    if (columnName == schema.parents[parent].id)
                        return ":" + parent;
                return null;
            }
            function getForeignKeyDescription(defineProperty) {
                if (!defineProperty.type)
                    return "";
                var prop = defineProperty.type.__name__
                var template = PersistObjectTemplate.__dictionary__[prop]
                if (!template)
                    return "";
                return "foreign key for " + template.__table__;
            }
            function getClassNames (prop) {
                var className = "";
                getClassName(template);
                return className;
                function getClassName(template) {
                    className += (className.length > 0 ? ", " + template.__name__ : "values: " + template.__name__)
                    if (template.__children__)
                        _.each(template.__children__, getClassName);
                }
            }
            function getDescription (prop, defineProperty) {
                if (!defineProperty)
                    return "";
                var values = {};
                var valStr = "";
                processValues(template);
                var comment = defineProperty.comment ? defineProperty.comment + "; " : "";
                _.each(values, function (val, key) {valStr += (valStr.length == 0 ? "" : ", ") + key});
                comment = valStr.length > 0 ? comment + "values: " + valStr : comment;
                return comment;
                function processValues(template) {
                    var defineProperty = template.defineProperties[prop];
                    if (defineProperty && defineProperty.values)
                        _.each(defineProperty.values, function (val, key) {values[(defineProperty.values instanceof Array ? val : key)] = true;})
                    if (template.__children__)
                        _.each(template.__children__, processValues);
                }
            }
            function commentOn(table, column, comment) {
                if (knex.client.config.client == 'pg') {
                    knex.raw("COMMENT ON COLUMN \"" + table + "\".\"" + column + "\" IS '" + comment.replace(/'/g,"''") +"';")
                        .then(function() {}, function (e) {console.log(e)});
                }
                //console.log(table + "." + column + '=' + comment);
            }
        }
    }

    function synchronizeIndexes(tableName, template) {

        var aliasedTableName = template.__table__;
        var tableName = this.dealias(aliasedTableName);

        while(template.__parent__)
            template =  template.__parent__;

        if(!template.__table__)
            throw new Error(template.__name__ + " is missing a schema entry");

        var props = getPropsRecursive(template);
        var knex = this.getDB(this.getDBAlias(template.__table__)).connection
        var schema = this._schema;
        var _newFields = {};

        var _dbschema;
        var _changes =  {};
        var schemaTable = 'index_schema_history';
        var schemaField = 'schema';


        var loadSchema = function (tableName) {

            if (!!_dbschema) return(_dbschema, tableName);

            return  knex.schema.createTableIfNotExists(schemaTable, function (table) {
                table.increments('sequence_id').primary();
                table.text(schemaField);
                table.timestamps();
            }).then(function () {
                return knex(schemaTable)
                    .orderBy('sequence_id', 'desc')
                    .limit(1);
            }).then(function (record) {
                var response;
                if (!record[0]) {
                    response = {};
                }
                else {
                    latestVersion = record[0].sequence_id;
                    response = JSON.parse(record[0][schemaField]);
                }
                _dbschema = response;
                return [response, template.__name__];
            })
        }

        var loadTableDef = function(dbschema, tableName) {
            if (!dbschema[tableName])
                dbschema[tableName] = {};
            return [dbschema, schema, tableName];
        }

        var diffTable = function(dbschema, schema, tableName){
            var dbTableDef = dbschema[tableName];
            var memTableDef = schema[tableName]
            var track = {add: [], change: [], delete: []};
            _diff(dbTableDef, memTableDef, 'delete', false, function (dbIdx, memIdx) {
                return !memIdx;
            }, _diff(memTableDef, dbTableDef, 'change', false, function (memIdx, dbIdx) {
                return memIdx && dbIdx && !_.isEqual(memIdx, dbIdx);
            }, _diff(memTableDef, dbTableDef, 'add', true, function (memIdx, dbIdx) {
                return !dbIdx;
            }, track)));
            _changes[tableName] = _changes[tableName] || {};

            _.map(_.keys(track), function(key){
                _changes[tableName][key] = _changes[tableName][key] || [];
                _changes[tableName][key].push.apply(_changes[tableName][key], track[key]);
            });

            function _diff(masterTblSchema, shadowTblSchema, opr, addMissingTable, addPredicate, diffs) {

                if (!!masterTblSchema && !!masterTblSchema.indexes && masterTblSchema.indexes instanceof Array && !!shadowTblSchema) {
                    (masterTblSchema.indexes || []).forEach(function (mstIdx) {
                        var shdIdx = _.findWhere(shadowTblSchema.indexes, {name: mstIdx.name});

                        if (addPredicate(mstIdx, shdIdx)) {
                            diffs[opr] = diffs[opr] || [];
                            diffs[opr].push(mstIdx);
                        }
                    });
                } else if (addMissingTable && !!masterTblSchema && !!masterTblSchema.indexes) {
                    diffs[opr] = diffs[opr] || [];
                    diffs[opr].push.apply(diffs[opr], masterTblSchema.indexes);
                }
                return diffs;
            }
        }

        var generateChanges = function (localtemplate, value) {
            return _.reduce(localtemplate.__children__, function (curr, o) {
                return Promise.resolve()
                    .then(loadTableDef.bind(this, _dbschema, o.__name__))
                    .spread(diffTable)
                    .then(generateChanges.bind(this, o))
                    .catch(function (e) {
                        throw e;
                    })
            }, {});
        }

        var getFilteredTarget = function(src, target){
            return _.filter(target, function(o, filterkey){
                var currName = _.reduce(o.def.columns, function (name, col) {
                    return name + '_' + col;
                }, 'idx_' + tableName);
                return !_.find(src, function(cached){
                    var cachedName = _.reduce(cached.def.columns, function (name, col) {
                        return name + '_' + col;
                    }, 'idx_' + tableName);
                    return (cachedName.toLowerCase() === currName.toLowerCase())
                })
            });
        }

        var mergeChanges = function() {
            var dbChanges =   {add: [], change: [], delete: []};
            _.map(dbChanges, function(object, key){
                _.each(_changes, function(change){
                    var filtered = getFilteredTarget(dbChanges[key], change[key])
                    dbChanges[key].push.apply(dbChanges[key], filtered);
                })
            })

            return dbChanges;
        }

        var applyTableChanges = function(dbChanges) {
            function syncIndexesForHierarchy (operation, diffs, table) {
                _.map(diffs[operation], (function (object, key) {
                    var type = object.def.type;
                    var columns = object.def.columns;
                    if (type !== 'unique' && type !== 'index')
                        throw new Error('index type can be only "unique" or "index"');

                    var name = _.reduce(object.def.columns, function (name, col) {
                        return name + '_' + col;
                    }, 'idx_' + tableName);

                    name = name.toLowerCase();
                    if (operation === 'add') {
                        table[type](columns, name);
                    }
                    else if (operation === 'delete') {
                        type= type.replace(/index/, 'Index');
                        type = type.replace(/unique/, 'Unique')
                        table['drop' + type]([], name);
                    }
                    else
                        table[type](columns, name);

                }).bind(this));
            };


            return knex.transaction(function (trx) {
                return trx.schema.table(tableName, function (table) {
                    _.map(Object.getOwnPropertyNames(dbChanges), function (key) {
                        return syncIndexesForHierarchy.call(this, key, dbChanges, table);
                    }.bind(this));
                })
            })
        }

        var isSchemaChanged = function(object) {
            return (object.add.length || object.change.length || object.delete.length)
        }

        var makeSchemaUpdates = function () {
            var chgFound = _.reduce(_changes, function (curr, change) {
                return curr || !!isSchemaChanged(change);
            }, false);

            if (!chgFound) return;

            return knex(schemaTable)
                .orderBy('sequence_id', 'desc')
                .limit(1).then(function (record) {
                    var response = {}, sequence_id;
                    if (!record[0]) {
                        sequence_id = 1;
                    }
                    else {
                        response = JSON.parse(record[0][schemaField]);
                        sequence_id = ++record[0].sequence_id;
                    }
                    _.each(_changes, function (o, chgKey) {
                        response[chgKey] = schema[chgKey];
                    });

                    return knex(schemaTable).insert({
                        sequence_id: sequence_id,
                        schema: JSON.stringify(response)
                    });
                })
        }

        return Promise.resolve()
            .then(loadSchema.bind(this, tableName))
            .spread(loadTableDef)
            .spread(diffTable)
            .then(generateChanges.bind(this, template))
            .then(mergeChanges)
            .then(applyTableChanges)
            .then(makeSchemaUpdates)
            .catch(function(e) {
                throw e;
            })
    };



    function iscompatible(persistortype, pgtype) {
        switch (persistortype) {
            case 'String':
            case 'Object':
            case 'Array':
                return pgtype.indexOf('text') > -1;
            case 'Number':
                return pgtype.indexOf('double precision') > -1;
            case 'Boolean':
                return pgtype.indexOf('bool') > -1;
            case 'Date':
                return pgtype.indexOf('timestamp') > -1;
            default:
                return pgtype.indexOf('text') > -1; // Typed objects have no name
        }
    }

    function getPropsRecursive(template, map) {
        map = map || {};
        _.map(template.getProperties(), function (val, prop) {
            map[prop] = val
        });
        template = template.__children__;
        template.forEach(function (template) {
            getPropsRecursive(template, map);
        });
        return map;
    }

    PersistObjectTemplate.persistTouchKnex = function(obj, txn, logger) {
        (logger || this.logger).debug({component: 'persistor', module: 'db.persistTouchKnex', activity: 'pre',
            data: {template: obj.__template__.__name__, table: obj.__template__.__table__}});
        var tableName = this.dealias(obj.__template__.__table__);
        var knex = this.getDB(this.getDBAlias(obj.__template__.__table__)).connection(tableName);
        obj.__version__++;
        return knex
            .transacting(txn ? txn.knex : null)
            .where('_id', '=', obj._id)
            .increment('__version__', 1)
            .then(function () {
                (logger || this.logger).debug({component: 'persistor', module: 'db.persistTouchKnex', activity: 'post',
                    data: {template: obj.__template__.__name__, table: obj.__template__.__table__}});
            }.bind(this))
    }

    PersistObjectTemplate.createKnexTable = function (template, collection) {
        var collection = collection || template.__table__;
        var tableName = this.dealias(collection);
        return PersistObjectTemplate._createKnexTable(template, collection)
            .then(synchronizeIndexes.bind(this, tableName, template))
    }
    /**
     * Create a table based on the schema definitions, will consider even indexes creation.
     * @param template
     * @returns {*}
     */
    PersistObjectTemplate._createKnexTable = function (template, collection) {
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
                            table.double(prop);
                        } else if (defineProperty.type === Date) {
                            table.timestamp(prop);
                        } else if (defineProperty.type === Boolean) {
                            table.boolean(prop);
                        } else
                            table.text(prop);
                        columnMap[prop] = true;
                    }
                }
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

        return knex.schema.dropTableIfExists(tableName);
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