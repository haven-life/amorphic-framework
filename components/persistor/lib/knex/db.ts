import {DeleteQueries, PersistorTransaction} from '../types';
import {LoggerHelpers} from '../LoggerHelpers';
import {Transaction} from './commit/Transaction';
import { Helpers } from './Helpers';
import { MongoQuery } from './MongoQuery';

module.exports = function (PersistObjectTemplate) {

    var Promise = require('bluebird');
    var _ = require('underscore');

    var processedList = [];
    /**
     * Get a POJO by reading a table, optionally joining it to other tables
     *
     * @param {object} template - super type
     * @param {Array} joins - array of tables that need to be joined at the current level
     * @param {object/function} queryOrChains conditions to use, can even pass functions to add extra conditions
     * @param {object} options start, limit, and sort options can be passed..
     * @param {object} map mapper to cache
     * @param {object} logger objecttemplate logger
     * @param {object} projection types with property names, will be used to ignore the fields from selects
     * @returns {*}
     */
    PersistObjectTemplate.getPOJOsFromKnexQuery = function (template, joins, queryOrChains, options, map, logger, projection) {

        var tableName = this.dealias(template.__table__);
        var knex = this.getDB(this.getDBAlias(template.__table__)).connection(tableName);

        // tack on outer joins.  All our joins are outerjoins and to the right.  There could in theory be
        // foreign keys pointing to rows that no longer exists
        var select = knex.select(getColumnNames.bind(this, template)()).from(tableName);
        joins.forEach(function (join) {
            select = select.leftOuterJoin(this.dealias(join.template.__table__) + ' as ' + join.alias,
                join.alias + '.' + join.parentKey,
                this.dealias(template.__table__) + '.' + join.childKey);
        }.bind(this));

        // execute callback to chain on filter functions or convert mongo style filters
        if (queryOrChains)
            if (typeof(queryOrChains) == 'function')
                queryOrChains(select);
            else if (queryOrChains)
                select = MongoQuery.convertMongoQueryToChains(tableName, select, queryOrChains);

        // Convert mongo style sort
        if (options && options.sort) {
            var ascending = [];
            var descending = [];
            _.each(options.sort, function (value, key) {
                if (value > 0)
                    ascending.push(tableName + '.' + key);
                else
                    descending.push(tableName + '.' + key);
            });
            if (ascending.length)
                select = ascending.reduce((result, column) => select.orderBy(column), select);
            if (descending.length)
                select = descending.reduce((result, column) => select.orderBy(column, 'desc'), select);
            }
        if (options && options.limit) {
            select = select.limit(options.limit);
            select = select.offset(0)
        }
        if (options && options.offset) {
            select = select.offset(options.offset);
        }

        (logger || this.logger).debug({component: 'persistor', module: 'db.getPOJOsFromKnexQuery', activity: 'pre',
            data: {template: template.__name__, query: queryOrChains}});

        var selectString = select.toString();
        if (map && map[selectString])
            return new Promise(function (resolve) {
                map[selectString].push(resolve);
            });
        if (map)
            map[selectString] = [];

        return select.then(processResults.bind(this), processError.bind(this));
        function processResults(res) {
            (logger || this.logger).debug({component: 'persistor', module: 'db.getPOJOsFromKnexQuery', activity: 'post',
                data: {count: res.length, template: template.__name__, query: queryOrChains}});
            if (map && map[selectString]) {
                map[selectString].forEach(function(resolve) {
                    //console.log('Consolidated request for ' + selectString);
                    resolve(res)
                });
                delete map[selectString];
            }
            return res;
        }

        function processError(err) {
            (logger || this.logger).debug({component: 'persistor', module: 'db.getPOJOsFromKnexQuery', activity: 'select',
                error: JSON.stringify(err)});
            throw err;
        }

        function getColumnNames(template) {
            var cols = [];
            var self = this;

            while (template.__parent__)
                template = template.__parent__;

            asStandard(template, this.dealias(template.__table__));
            _.each(Helpers.getPropsRecursive(template), function (defineProperties, prop) {
                as(template, this.dealias(template.__table__), prop, defineProperties)
            }.bind(this));
            _.each(joins, function (join) {
                asStandard(join.template, join.alias);
                _.each(Helpers.getPropsRecursive(join.template), function (defineProperties, prop) {
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
                }
                if (!prop.match(/^_./i) && !type.isObjectTemplate && !!projection && projection[template.__name__] instanceof Array && projection[template.__name__].indexOf(prop) === -1) {
                    return;
                }
                else if (type.isObjectTemplate) {
                    if (!schema || !schema.parents || !schema.parents[prop] || !schema.parents[prop].id)
                        throw  new Error(type.__name__ + '.' + prop + ' is missing a parents schema entry');
                    prop = schema.parents[prop].id;
                }
                cols.push(prefix + '.' + prop + ' as ' + (prefix ? prefix + '___' : '') + prop);
            }

            function getPropsRecursive(template, map?) {
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
    };
    /**
     * Get the count of rows
     *
     * @param {object} template super type
     * @param {object/function} queryOrChains conditions to use, can even pass functions to add extra conditions
     * @param {object} _logger objecttemplate logger
     * @returns {*}
     */
    PersistObjectTemplate.countFromKnexQuery = function (template, queryOrChains, _logger) {

        var tableName = this.dealias(template.__table__);
        var knex = this.getDB(this.getDBAlias(template.__table__)).connection(tableName);
        // execute callback to chain on filter functions or convert mongo style filters
        if (typeof(queryOrChains) == 'function')
            queryOrChains(knex);
        else if (queryOrChains)
            (MongoQuery.convertMongoQueryToChains)(tableName, knex, queryOrChains);

        return knex.count('_id').then(function (ret) {
            return ret[0].count * 1;
        });
    };


    /**
     *Check for table existence
     *
     * @param {object} template super type
     * @param {string} tableName table to search on the database.
     * @returns {*}
     */
    PersistObjectTemplate.checkForKnexTable = function (template, tableName) {
        tableName = tableName ? tableName : this.dealias(template.__table__);
        var knex = this.getDB(this.getDBAlias(template.__table__)).connection;
        return knex.schema.hasTable(tableName);
    };

    /**
     * Check for column type in the database
     * @param {object} template super type
     * @param {string} column column to search.
     * @returns {*}
     */
    PersistObjectTemplate.checkForKnexColumnType = function(template, column) {
        var tableName = this.dealias(template.__table__);
        var knex = this.getDB(this.getDBAlias(template.__table__)).connection;
        return knex(tableName).columnInfo(column).then(function(column) {
            return column.type;
        });
    };

    /**
     * Drop the index if exists, tries to delete the constrain if the givne name is not an index.
     * @param {object} template supertype
     * @param {string} indexName index name to drop
     * @constructor
     */
    PersistObjectTemplate.DropIfKnexIndexExists = function (template, indexName) {
        var tableName = this.dealias(template.__table__);
        var knex = this.getDB(this.getDBAlias(template.__table__)).connection;
        if (indexName.indexOf('idx_') === -1)
            indexName = 'idx_' + tableName + '_' + indexName;

        return knex.schema.table(tableName, function (table) {
            table.dropIndex([], indexName);
        }).catch(function (_error) {
            return knex.schema.table(tableName, function (table) {
                table.dropUnique([], indexName);

            })
        });
    };

    /**
     * Delete Rows
     *
     * @param {object} template supertype
     * @param {object/function} queryOrChains conditions to use, can even pass functions to add extra conditions
     * @param {object} txn transaction object
     * @param {object} _logger objecttemplate logger
     * @returns {*}
     */
    PersistObjectTemplate.deleteFromKnexQuery = function (template, queryOrChains, txn, _logger) {

        var tableName = this.dealias(template.__table__);
        var knex = this.getDB(this.getDBAlias(template.__table__)).connection(tableName);
        if (txn && txn.knex) {
            knex.transacting(txn.knex);
        }

        // execute callback to chain on filter functions or convert mongo style filters
        if (typeof(queryOrChains) == 'function')
            queryOrChains(knex);
        else if (queryOrChains)
            (MongoQuery.convertMongoQueryToChains)(tableName, knex, queryOrChains);

        return knex.delete();
    };

    PersistObjectTemplate.deleteFromKnexByQuery = async function (template, queryOrChains, txn: PersistorTransaction, _logger) {
        if (!txn) {
            return PersistObjectTemplate.deleteFromKnexQuery(template, queryOrChains, txn, _logger);
        }
        var deleteQueries: DeleteQueries = txn ? txn.deleteQueries : this.deleteQueries;
        deleteQueries[template.__name__] = {
            __name__: template.__name__,
            __template__: template,
            queryOrChains: queryOrChains
        };
        txn.deleteQueries = deleteQueries;
    };

    PersistObjectTemplate.knexPruneOrphans = function (obj, property, txn, filterKey, filterValue, logger) {
        var template = obj.__template__;
        var defineProperty = template.getProperties()[property];
        var tableName = this.dealias(defineProperty.of.__table__);
        var knex = this.getDB(this.getDBAlias(template.__table__)).connection(tableName);
        if (txn && txn.knex) {
            knex.transacting(txn.knex);
        }
        var foreignKey = template.__schema__.children[property].id;
        var goodList = [];
        _.each(obj[property], function(o) {
            if (o._id)
                goodList.push(o._id);
        });
        knex = (goodList.length > 0 ? knex.whereNotIn('_id', goodList) : knex);
        knex = knex.andWhere(foreignKey, obj._id);
        knex = (filterKey ? knex.andWhere(filterKey, filterValue) : knex);
        //console.log(knex.toSQL().sql + ' ? = ' + (filterValue || '') + ' ? = ' + obj._id + ' ? = ' + goodList.join(','))
        knex = knex.delete().then(function (res) {
            if (res)
                (logger || this.logger).debug({component: 'persistor', module: 'db.knexPruneOrphans', activity: 'post',
                    data: {count: res, table: tableName, id: obj._id}});
        }.bind(this));

        return knex;
    };

    /**
     * Delete a Row
     *
     * @param {object} template supertype
     * @param {string} id primary key
     * @param {object} txn transaction object
     * @param {object} _logger objecttemplate logger
     * @returns {*}
     */
    PersistObjectTemplate.deleteFromKnexId = function (template, id, txn, _logger) {

        var tableName = this.dealias(template.__table__);
        var knex = this.getDB(this.getDBAlias(template.__table__)).connection(tableName);
        if (txn && txn.knex) {
            knex.transacting(txn.knex);
        }
        return knex.where({_id: id}).delete();
    };

    /**
     * Save a Plain Old Javascript object given an Id.
     * @param {object} obj supertype
     * @param {string} pojo primary key
     * @param {string} updateID primary key if updated..
     * @param {object} txn transaction object
     * @param {object} logger objecttemplate logger
     * @returns {*}
     */
    PersistObjectTemplate.saveKnexPojo = function (obj, pojo, updateID, txn, logger) {
        var origVer = obj.__version__;
        var tableName = this.dealias(obj.__template__.__table__);
        var knex = this.getDB(this.getDBAlias(obj.__template__.__table__)).connection(tableName);

        obj.__version__ = obj.__version__ ? obj.__version__ * 1 + 1 : 1;
        pojo.__version__ = obj.__version__;
        (logger || this.logger).debug({component: 'persistor', module: 'db.saveKnexPojo', activity: 'pre',
            data: {txn: (txn ? txn.id + ' ' : '-#- '), type: (updateID ? 'updating ' : 'insert '),
                template: obj.__template__.__name__, id: obj.__id__, _id: obj._id, __version__: pojo.__version__}});
        if (txn && txn.knex) {
            knex.transacting(txn.knex)
        }
        if (updateID) {
            return Promise.resolve(knex
                .where('__version__', '=', origVer).andWhere('_id', '=', updateID)
                .update(pojo)
                .then(checkUpdateResults.bind(this))
                .then(logSuccess.bind(this)))
        } else {
            return Promise.resolve(knex
                .insert(pojo)
                .then(logSuccess.bind(this)));
        }


        function checkUpdateResults(countUpdated) {
            if (countUpdated < 1) {
                (logger || this.logger).debug({component: 'persistor', module: 'db.saveKnexPojo', activity: 'updateConflict',
                    data: {txn: (txn ? txn.id : '-#-'), id: obj.__id__, __version__: origVer}});
                obj.__version__ = origVer;
                if (txn && txn.onUpdateConflict) {
                    txn.onUpdateConflict(obj);
                    txn.updateConflict =  true;
                } else {
                    throw new Error('Update Conflict');
                }
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
     * @param {object} template supertype
     * @param {function} changeNotificationCallback callback to get the information on table or fields changes.
     * @param {bool} forceSync forces the function to proceed with sync table step, useful for unit tests.
     * @returns {*}
     */
    PersistObjectTemplate.synchronizeKnexTableFromTemplate = function (template, changeNotificationCallback, forceSync) {
        var aliasedTableName = template.__table__;
        var tableName = this.dealias(aliasedTableName);
        //no need to synchronize Query objects if there is an entry for the corresponding main object in schema.json
        if (template.name.match(/Query$/) && isTableCorrespondsToOtherSchemaEntry.call(this, template.name, tableName)) {
            return Promise.resolve();
        }

        while (template.__parent__) {
            template =  template.__parent__;
        }

        //can skip the templates that were already processed.
        if (processedList.includes(template.__name__) && !forceSync) {
            return Promise.resolve();
        }
        processedList.push(template.__name__);

        if (!template.__table__) {
            throw new Error(template.__name__ + ' is missing a schema entry');
        }

        var props = Helpers.getPropsRecursive(template);
        var knex = this.getDB(this.getDBAlias(template.__table__)).connection;
        var schema = template.__schema__;
        var _newFields = {};

        return Promise.resolve()
            .then(buildTable.bind(this))
            .then(addComments.bind(this, tableName))
            .then(synchronizeIndexes.bind(this, tableName, template));

        function buildTable() {
            return knex.schema.hasTable(tableName).then(function (exists) {
                if (!exists) {
                    if (!!changeNotificationCallback) {
                        if (typeof changeNotificationCallback !== 'function')
                            throw new Error('persistor can only notify the table changes through a callback');
                        changeNotificationCallback('A new table, ' + tableName + ', has been added\n');
                    }
                    return PersistObjectTemplate._createKnexTable(template, aliasedTableName);
                }
                else {
                    return discoverColumns(tableName).then(function () {
                        fieldChangeNotify(changeNotificationCallback, tableName);
                        return knex.schema.table(tableName, columnMapper.bind(this))
                    }.bind(this));
                }
            }.bind(this))
        }

        function fieldChangeNotify(callBack, table) {
            if (!callBack) return;
            if (typeof callBack !== 'function')
                throw new Error('persistor can only notify the field changes through a callback');
            var fieldsChanged = _.reduce(_newFields, function(current, field, key) {
                return field.type !== Array ? current + ',' + key : current;
            }, '');

            if (fieldsChanged.length > 0) {
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
                        throw   new Error(defineProperty.type.__name__ + '.' + prop + ' is missing a parents schema entry');
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
        function addComments(table) {
            return knex(table).columnInfo().then(function (info) {
                var promises = [];
                for (var columnName in info) {
                    var knexCommentPromise = processComment(columnName);
                    if (!!knexCommentPromise) {
                        promises.push(knexCommentPromise);
                    }
                }
                return Promise.all(promises);
            });

            function processComment(columnName) {
                var prop = columnNameToProp(columnName);
                if (!prop) {
                    PersistObjectTemplate.logger.info({component: 'persistor', module: 'db.synchronizeKnexTableFromTemplate', activity: 'discoverColumns'}, 'Extra column ' + columnName + ' on ' + table);
                    return commentOn(table, columnName, 'now obsolete');
                } else {
                    if (prop == '_id')
                        return commentOn(table, columnName, 'primary key');
                    else if (prop.match(/:/)) {
                        prop = prop.substr(1);
                        var fkComment = getForeignKeyDescription(props[prop]);
                        var commentField = getDescription(prop, props[prop])
                        var comment = (commentField === '') ?  fkComment : fkComment + ', ' + commentField;
                        return commentOn(table, columnName, comment);
                    } else if (prop == '_template')
                        return commentOn(table, columnName, getClassNames(prop));
                    else if (prop != '__version__')
                        return commentOn(table, columnName, getDescription(prop, props[prop]));
                }
            }
            function columnNameToProp(columnName) {
                if (columnName  == '_id' || columnName == '__version__' || columnName == '_template')
                    return columnName;
                if (props[columnName])
                    return columnName;
                if (!schema || !schema.parents)
                    return false;
                for (var parent in schema.parents) {
                    if (columnName == schema.parents[parent].id && !props[parent]) {
                        PersistObjectTemplate.logger.info({component: 'persistor', module: 'db.synchronizeKnexTableFromTemplate', activity: 'discoverColumns'},
                            'schema out-of-sync: schema contains ' + columnName + ' on ' + table + ', which is not defined in the template');
                        return false;
                    }
                    else if (columnName == schema.parents[parent].id)
                        return ':' + parent;
                }
                return null;
            }
            function getForeignKeyDescription(defineProperty) {
                if (!defineProperty.type)
                    return '';
                var prop = defineProperty.type.__name__;
                var template = PersistObjectTemplate.__dictionary__[prop];
                if (!template)
                    return '';
                return 'foreign key for ' + template.__table__;
            }
            function getClassNames (_prop) {
                var className = '';
                getClassName(template);
                return className;
                function getClassName(template) {
                    className += (className.length > 0 ? ', ' + template.__name__ : 'values: ' + template.__name__);
                    if (template.__children__)
                        _.each(template.__children__, getClassName);
                }
            }
            function getDescription (prop, defineProperty) {
                if (!defineProperty)
                    return '';
                var values = {};
                var valStr = '';
                processValues(template);
                var comment = defineProperty.comment ? defineProperty.comment + '; ' : '';
                comment = defineProperty.sensitiveData ? comment + ';;sensitiveData;;' : comment;
                _.each(values, function (_val, key) {valStr += (valStr.length == 0 ? '' : ', ') + key});
                comment = valStr.length > 0 ? comment + 'values: ' + valStr : comment;
                return comment;

                function processValues(template) {
                    var defineProperty = template.defineProperties ? template.defineProperties[prop] : null;
                    if (defineProperty && defineProperty.values)
                        _.each(defineProperty.values, function (val, key) {values[(defineProperty.values instanceof Array ? val : key)] = true;});
                    if (template.__children__)
                        _.each(template.__children__, processValues);
                }
            }
            function commentOn(table, column, comment) {
                if (knex.client.config.client === 'pg' && comment !== '') {
                    return knex.raw('COMMENT ON COLUMN "' + table + '"."' + column + '" IS \'' + comment.replace(/'/g, '\'\'') + '\';')
                        .then(function() {}, function (e) {
                            /*eslint-disable no-console*/
                            console.log(e)
                            /*eslint-enable no-console*/
                        });
                }
                return;
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
                            if (!Helpers.iscompatible(props[prop].type.name, info[propToColumnName(prop)].type)) {
                                throw new Error('Changing the type of ' + prop + ' on ' + table
                                    + ', changing types for the fields is not allowed, please use scripts to make these changes');
                            }
                        }
                    }
                }
            });

            function propToColumnName(prop) {
                var defineProperty = props[prop];
                if (defineProperty.type.__objectTemplate__)
                    if (!schema || !schema.parents || !schema.parents[prop] || !schema.parents[prop].id)
                        throw   new Error(template.__name__ + '.' + prop + ' is missing a parents schema entry');
                    else
                        prop = (schema.parents && schema.parents[prop]) ? schema.parents[prop].id : prop;
                return prop;
            }

        }

        function isTableCorrespondsToOtherSchemaEntry(name, table) {
            if (this._schema[name.replace('Query', '')]) {
                return true;
            }
            var schemEntry = Object.keys(this._schema).find(function(k) {
                return this._schema[k].table === table && k != name;
            }.bind(this));
            if (!!schemEntry) {
                return true;
            }
            return false;
        }
    }

    function synchronizeIndexes(tableName, template) {

        var aliasedTableName = template.__table__;
        tableName = this.dealias(aliasedTableName);

        while (template.__parent__) {
            template =  template.__parent__;
        }

        if (!template.__table__) {
            throw new Error(template.__name__ + ' is missing a schema entry');
        }

        var knex = this.getDB(this.getDBAlias(template.__table__)).connection;
        var schema = this._schema;

        var _dbschema;
        var _changes =  {};
        var schemaTable = 'index_schema_history';
        var schemaField = 'schema';


        var loadSchema = function (tableName) {

            if (!!_dbschema) {
                //@ts-ignore
                return (_dbschema, tableName);
            }

            return knex.schema.hasTable(schemaTable).then(function(exists) {
                if (!exists) {
                    return knex.schema.createTable(schemaTable, function(table) {
                        table.increments('sequence_id').primary();
                        table.text(schemaField);
                        table.timestamps();
                    })
                }
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
                    response = JSON.parse(record[0][schemaField]);
                }
                _dbschema = response;
                return [response, template.__name__];
            })
        };

        var loadTableDef = function(dbschema, tableName) {
            if (!dbschema[tableName])
                dbschema[tableName] = {};
            return [dbschema, schema, tableName];
        };

        var diffTable = function(dbschema, schema, tableName) {
            var dbTableDef = dbschema[tableName];
            var memTableDef = schema[tableName];
            var track = {add: [], change: [], delete: []};
            _diff(dbTableDef, memTableDef, 'delete', false, function (_dbIdx, memIdx) {
                return !memIdx;
            }, _diff(memTableDef, dbTableDef, 'change', false, function (memIdx, dbIdx) {
                return memIdx && dbIdx && !_.isEqual(memIdx, dbIdx);
            }, _diff(memTableDef, dbTableDef, 'add', true, function (_memIdx, dbIdx) {
                return !dbIdx;
            }, track)));
            _changes[tableName] = _changes[tableName] || {};

            _.map(_.keys(track), function(key) {
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
        };

        var generateChanges = function (localtemplate, _value) {
            return _.reduce(localtemplate.__children__, function (_curr, o) {
                return Promise.resolve()
                    .then(loadTableDef.bind(this, _dbschema, o.__name__))
                    .spread(diffTable)
                    .then(generateChanges.bind(this, o));
            }, {});
        };

        var getFilteredTarget = function(src, target) {
            return _.filter(target, function(o, _filterkey) {
                var currName = _.reduce(o.def.columns, function (name, col) {
                    return name + '_' + col;
                }, 'idx_' + tableName);
                return !_.find(src, function(cached) {
                    var cachedName = _.reduce(cached.def.columns, function (name, col) {
                        return name + '_' + col;
                    }, 'idx_' + tableName);
                    return (cachedName.toLowerCase() === currName.toLowerCase())
                })
            });
        };

        var mergeChanges = function() {
            var dbChanges =   {add: [], change: [], delete: []};
            _.map(dbChanges, function(_object, key) {
                _.each(_changes, function(change) {
                    var uniqChanges = _.uniq(change[key], function(o) {
                        return o.name;
                    });
                    var filtered = getFilteredTarget(dbChanges[key], uniqChanges);
                    dbChanges[key].push.apply(dbChanges[key], filtered);
                })
            });

            return dbChanges;
        };

        var applyTableChanges = function(dbChanges) {
            function syncIndexesForHierarchy (operation, diffs, table) {
                _.map(diffs[operation], (function (object, _key) {
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
                        type = type.replace(/index/, 'Index');
                        type = type.replace(/unique/, 'Unique');
                        table['drop' + type]([], name);
                    }
                    else
                        table[type](columns, name);

                }));
            }


            return knex.transaction(function (trx) {
                return trx.schema.table(tableName, function (table) {
                    syncIndexesForHierarchy('delete', dbChanges, table);
                    syncIndexesForHierarchy('add', dbChanges, table);
                    syncIndexesForHierarchy('change', dbChanges, table);
                })
            })
        };

        var isSchemaChanged = function(object) {
            return (object.add.length || object.change.length || object.delete.length)
        };

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
                    _.each(_changes, function (_o, chgKey) {
                        response[chgKey] = schema[chgKey];
                    });

                    return knex(schemaTable).insert({
                        sequence_id: sequence_id,
                        schema: JSON.stringify(response)
                    });
                })
        };

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
    }

    PersistObjectTemplate.persistTouchKnex = function(obj, txn, logger) {
        (logger || this.logger).debug({component: 'persistor', module: 'db.persistTouchKnex', activity: 'pre',
            data: {template: obj.__template__.__name__, table: obj.__template__.__table__}});
        var tableName = this.dealias(obj.__template__.__table__);
        var knex = this.getDB(this.getDBAlias(obj.__template__.__table__)).connection(tableName);
        obj.__version__++;
        if (txn && txn.knex) {
            knex.transacting(txn.knex)
        }
        return knex
            .where('_id', '=', obj._id)
            .increment('__version__', 1)
            .then(function () {
                (logger || this.logger).debug({component: 'persistor', module: 'db.persistTouchKnex', activity: 'post',
                    data: {template: obj.__template__.__name__, table: obj.__template__.__table__}});
            }.bind(this))
    };

    PersistObjectTemplate.createKnexTable = function (template, collection) {
        collection = collection || template.__table__;
        var tableName = this.dealias(collection);
        return PersistObjectTemplate._createKnexTable(template, collection)
            .then(synchronizeIndexes.bind(this, tableName, template))
    };

    /**
     * Create a table based on the schema definitions, will consider even indexes creation.
     * @param {object} template super type
     * @param {string} collection collection/table name
     * @returns {*}
     */
    PersistObjectTemplate._createKnexTable = function (template, collection) {
        collection = collection || template.__table__;
        (function () {
            while (template.__parent__) {
                template =  template.__parent__;
            }
        })();

        var knex = this.getDB(this.getDBAlias(collection)).connection;
        var tableName = this.dealias(collection);
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
                        if (!this._persistProperty(defineProperty))
                            continue;
                        if (defineProperty.type === Array) {
                            if (!defineProperty.of.__objectTemplate__)
                                table.text(prop);
                        } else if (defineProperty.type && defineProperty.type.__objectTemplate__) {
                            if (!schema || !schema.parents || !schema.parents[prop] || !schema.parents[prop].id)
                                throw   new Error(template.__name__ + '.' + prop + ' is missing a parents schema entry');
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
                if (childTemplate) {
                    mapTableAndIndexes.call(this, table, childTemplate.defineProperties, childTemplate.__schema__);
                    childTemplate = childTemplate.__children__;
                    childTemplate.forEach(function(o) {
                        recursiveColumnMap.call(this, o);
                    }.bind(this));
                }
            }
        }
    };

    /**
     * Drop table if exists, just a wrapper method on Knex library.
     * @param {object} template super type
     * @param {string} tableName table to drop
     * @returns {*}
     */
    PersistObjectTemplate.dropKnexTable = function (template, tableName) {
        var knex = this.getDB(this.getDBAlias(template.__table__)).connection;
        tableName = tableName ? tableName : this.dealias(template.__table__);

        return knex.schema.dropTableIfExists(tableName);
    };

    // Start the knex transaction
    // We generate SQLs to save and to Delete and touches
    // Each save / delete is done in 2 stages
    // 1) We iterate through the objects and check to see if the version of any dirty / deleted objects are outdated
    //    if so, we set an update conflict flag to `True` on the transaction. @TODO: Perhaps should throw an error
    //    instead so we can stop generating random SQLS and end early
    // 2) As we iterate through the objects in the first step, we generate SQL statements / attach them to the knex
    //    transaction
    // 3) We identify which properties are changed, for change tracking purposes
    // 4) We commit / finish the transaction
    PersistObjectTemplate._commitKnex = async function _commitKnex(txn: PersistorTransaction, logger, notifyChanges) {
        logger.debug({component: 'persistor', module: 'api', activity: 'commit'}, 'end of transaction ');
        const knex = _.findWhere(this._db, {type: PersistObjectTemplate.DB_Knex}).connection;
        let innerError;

        // Apparently it seems like Knex takes an async callback, and implicitly waits for it to trigger knex.commit.
        // This is confusing behavior
        try {
            innerError = await knex.transaction((knexTxn) => Transaction.transaction(this, notifyChanges, txn, knexTxn, logger)); // @TODO: Is Knex.transaction async?
            LoggerHelpers.debug(this, logger, {component: 'persistor', module: 'api'}, 'End - transaction completed');
            return true;
        } catch (e) {
            const err = e || innerError;
            if (err && err.message && err.message != 'Update Conflict') {
                LoggerHelpers.error(this, logger, {
                    component: 'persistor',
                    module: 'api',
                    activity: 'end',
                    error: err.message + err.stack
                }, 'Transaction ended with error');
            }
            throw err;
        }
    }
};