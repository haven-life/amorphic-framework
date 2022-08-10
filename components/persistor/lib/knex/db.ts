import {RemoteDocService} from "../remote-doc/RemoteDocService";

module.exports = function (PersistObjectTemplate) {
    const moduleName = `persistor/lib/knex/db`;
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
        const functionName = 'getPOJOsFromKnexQuery';

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
                select = this.convertMongoQueryToChains(tableName, select, queryOrChains);

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

        (logger || this.logger).debug({
            module: moduleName,
            function: functionName,
            category: 'milestone',
            data: {
                activity: 'pre',
                template: template.__name__, 
                query: queryOrChains
            }
        });

        var selectString = select.toString();
        if (map && map[selectString])
            return new Promise(function (resolve) {
                map[selectString].push(resolve);
            });
        if (map)
            map[selectString] = [];

        return select.then(processResults.bind(this), processError.bind(this));
        function processResults(res) {
            (logger || this.logger).debug({
                module: moduleName,
                function: functionName,
                category: 'milestone',
                data: {
                    activity: 'post',
                    count: res.length, 
                    template: template.__name__, 
                    query: queryOrChains
                }
            });
            if (map && map[selectString]) {
                map[selectString].forEach(function(resolve) {
                    resolve(res)
                });
                delete map[selectString];
            }
            return res;
        }

        function processError(err) {
            (logger || this.logger).debug({
                module: moduleName,
                function: functionName,
                category: 'milestone',
                error: err,
                data: {
                    activity: 'select'
                }
            });
            throw err;
        }

        function getColumnNames(template) {
            var cols = [];
            var self = this;

            while (template.__parent__)
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
            (this.convertMongoQueryToChains)(tableName, knex, queryOrChains);

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
            (this.convertMongoQueryToChains)(tableName, knex, queryOrChains);

        if (txn && txn.knex && txn.queriesToNotify) {
            generateNotifyQueries(template, txn.queriesToNotify, knex.delete().toString());
        }
        return knex.delete();
    };

    PersistObjectTemplate.deleteFromKnexByQuery = async function (template, queryOrChains, txn, _logger) {
        if (!txn) {
            return PersistObjectTemplate.deleteFromKnexQuery(template, queryOrChains, txn, _logger);
        }
        var deleteQueries = txn ? txn.deleteQueries : this.deleteQueries;
        var deleteQuery = {name: template.__name__, template: template, queryOrChains: queryOrChains};
        deleteQueries[template.__name__] = deleteQuery;
        txn.deleteQueries = deleteQueries;
    };

    PersistObjectTemplate.knexPruneOrphans = function (obj, property, txn, filterKey, filterValue, logger) {
        var template = obj.__template__;
        var defineProperty = template.getProperties()[property];
        var tableName = this.dealias(defineProperty.of.__table__);
        var knex = this.getDB(this.getDBAlias(template.__table__)).connection(tableName);
        const functionName = 'knexPruneOrphans';
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
        if (txn && txn.knex && txn.queriesToNotify) {
            generateNotifyQueries(template, txn.queriesToNotify, knex.delete().toString());
        }
        knex = knex.delete().then(function (res) {
            if (res)
                (logger || this.logger).debug({
                    module: moduleName,
                    function: functionName,
                    category: 'milestone',
                    data: {
                        activity: 'post',
                        count: res, 
                        table: tableName, 
                        id: obj._id
                    }
                });
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
            if (txn.queriesToNotify) {
                generateNotifyQueries(template, txn.queriesToNotify, knex.where({_id: id}).delete().toString());
            }
            
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
        const functionName = 'saveKnexPojo';

        obj.__version__ = obj.__version__ ? obj.__version__ * 1 + 1 : 1;
        logChange();
        pojo.__version__ = obj.__version__;
        (logger || this.logger).debug({
            module: moduleName,
            function: functionName,
            category: 'milestone',
            data: {
                activity: 'pre',
                txn: (txn ? txn.id + ' ' : '-#- '), 
                type: (updateID ? 'updating ' : 'insert '),
                template: obj.__template__.__name__, 
                id: obj.__id__, 
                _id: obj._id, 
                __version__: pojo.__version__
            }
        });
        if (txn && txn.knex) {
            knex.transacting(txn.knex)
        }
        var sqlToRun;
        if (updateID) {
            sqlToRun = knex
            .where('__version__', '=', origVer).andWhere('_id', '=', updateID)
            .update(pojo).toString();
            return Promise.resolve(knex
                .where('__version__', '=', origVer).andWhere('_id', '=', updateID)
                .update(pojo)
                .then(checkUpdateResults.bind(this))
                .then(logSuccessAndTrack.bind(this))
                .catch(revertVersion.bind(this)));
        } else {
            sqlToRun = knex
            .insert(pojo).toString();
            return Promise.resolve(knex
                .insert(pojo)
                .then(logSuccessAndTrack.bind(this))
                .catch(revertVersion.bind(this)));
        }

        function revertVersion(error) {
            //we need revert the version wheen there is an exception thrown by the db.
            if (error.message !== 'Update Conflict') {
                (logger || this.logger).error({
                    module: moduleName,
                    function: functionName,
                    category: 'milestone',
                    error: error,
                    data: {
                        activity: 'saveKnexPojo',
                        template: obj.__template__.__name__,
                        _id: obj._id,
                        __version__: pojo.__version__
                    }
                });
                //If there is a db error, revert the version value to the original version.
                obj.__version__ = origVer;
            }
            throw error;
        }
        function checkUpdateResults(countUpdated) {
            if (countUpdated < 1) {
                (logger || this.logger).info({
                    module: moduleName,
                    function: functionName,
                    category: 'milestone',
                    data: {
                        activity: 'updateConflict',
                        txn: (txn ? txn.id : '-#-'), 
                        id: obj.__id__, __version__: origVer
                    }
                });
                obj.__version__ = origVer;
                if (txn && txn.onUpdateConflict) {
                    txn.onUpdateConflict(obj);
                    txn.updateConflict =  true;
                    return;
                } else {
                    throw new Error('Update Conflict');
                }
            }
        }

        function logChange() {
            if (!txn) {
                return;
            }
            txn.changedObjects = txn.changedObjects || [];
            let updateState = {
                orgVersion: origVer,
                value: obj
            };
            txn.changedObjects.push(updateState);
        }

        function logSuccessAndTrack() {
            (logger || this.logger).debug({
                module: moduleName,
                function: functionName,
                category: 'milestone',
                data: {
                    activity: 'post',
                    template: obj.__template__.__name__, 
                    table: obj.__template__.__table__, 
                    __version__: obj.__version__
                }
            });
            if (txn && txn.knex && txn.queriesToNotify) {
                generateNotifyQueries(obj.__template__, txn.queriesToNotify, sqlToRun);
            }
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
        const functionName = 'synchronizeKnexTableFromTemplate';
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

        var props = getPropsRecursive(template);
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
                    PersistObjectTemplate.logger.info({
                        module: moduleName,
                        function: functionName,
                        category: 'milestone',
                        message: 'Extra column ' + columnName + ' on ' + table,
                        data: {
                            activity: 'discoverColumns'
                        }
                    });
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
                        PersistObjectTemplate.logger.info({
                            module: moduleName,
                            function: functionName,
                            category: 'milestone',
                            message: 'schema out-of-sync: schema contains ' + columnName + ' on ' + table + ', which is not defined in the template',
                            data: {
                                activity: 'discoverColumns'
                            }
                        });
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
                            PersistObjectTemplate.logger.info({
                                module: moduleName,
                                function: functionName,
                                category: 'milestone',
                                data: {
                                    commentOn: e
                                }
                            });
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
                            if (!iscompatible(props[prop].type.name, info[propToColumnName(prop)].type)) {
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
        const functionName = synchronizeIndexes.name;

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

        var applyTableChanges = async function(dbChanges) {
            function logTableChangesWarningMessage(columns, type, indexName, operation, error) {
                const logger = PersistObjectTemplate && PersistObjectTemplate.logger;
                if (logger) {
                    logger.warn({
                        module: moduleName,
                        function: functionName,
                        category: 'milestone',
                        message: 'Executing one index at a time - Unable to update index',
                        error: error,
                        data: {
                            type,
                            columns,
                            operation,
                            indexName,
                            tableName
                        }
                    });
                }
            }
            /**
             * This function loops through index changes (add/change/delete) and 
             * executes them one by one. In case of errors, while executing indexes, 
             * we will log a warning message. This approach handles each index at 
             * its own merit without impacting the behavior or another index. 
             * This is a change from previous code where were trying to run index 
             * changes together in a transaction. 
             * @param operation 
             * @param diffs 
             */
            async function syncIndexesForHierarchy (operation, diffs) {
                for (const _key in diffs[operation]) {
                    try {
                        const object = diffs[operation][_key];
                        var type = object.def.type;
                        var columns = object.def.columns;
                        if (type !== 'unique' && type !== 'index') {
                            throw new Error('index type can be only "unique" or "index"');
                        }

                        var name = _.reduce(object.def.columns, function (name, col) {
                            return name + '_' + col;
                        }, 'idx_' + tableName);

                        name = name.toLowerCase();
                        if (operation === 'add') {
                            try {
                                await knex.schema.table(tableName, async function (table) {
                                    // This table function callback does not necessarily need to be 
                                    // an async callback, but making the callback async/await as a guard.
                                    await table[type](columns, name);
                                });
                            }
                            catch(error) {
                                logTableChangesWarningMessage(columns, type, name, operation, error);
                            }
                        }
                        else if (operation === 'delete') {
                            type = type.replace(/index/, 'Index');
                            type = type.replace(/unique/, 'Unique');
                            try {
                                await knex.schema.table(tableName, async function (table) {
                                    // This table function callback does not necessarily need to be 
                                    // an async callback, but making the callback async/await as a guard.
                                    await table['drop' + type]([], name);
                                });
                            }
                            catch (error) {
                                    logTableChangesWarningMessage(columns, type, name, operation, error);
                            };
                        }
                        else {
                            try {
                                await knex.schema.table(tableName, async function (table) {
                                    // This table function callback does not necessarily need to be 
                                    // an async callback, but making the callback async/await as a guard.
                                    await table[type](columns, name);
                                });
                            } catch(error) {
                                logTableChangesWarningMessage(columns, type, name, operation, error);
                            };
                        }
                    }
                    catch(error) {    
                        const logger = PersistObjectTemplate && PersistObjectTemplate.logger;
                        if (logger) {
                            logger.warn({
                                module: moduleName,
                                function: functionName,
                                category: 'milestone',
                                message: 'Unable to apply index changes for '+ tableName,
                                error: error,
                            });
                        }
                    };
                }
            }

            return Promise.all([
                syncIndexesForHierarchy('delete', dbChanges), 
                syncIndexesForHierarchy('add', dbChanges), 
                syncIndexesForHierarchy('change', dbChanges)
            ]);
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

    function generateNotifyQueries(template, queriesToNotify, query) {
        if (!queriesToNotify[template.__name__]) {
            queriesToNotify[template.__name__] = { tableType: template.__schema__.tableType, queries: []}
        }

        queriesToNotify[template.__name__].queries.push(query);
    }

    PersistObjectTemplate.persistTouchKnex = function(obj, txn, logger) {
        const functionName = 'persistTouchKnex';
        (logger || this.logger).debug({
            module: moduleName,
            function: functionName,
            category: 'milestone',
            data: {
                activity: 'pre',
                template: obj.__template__.__name__, 
                table: obj.__template__.__table__
            }
        });
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
                (logger || this.logger).debug({
                    module: moduleName,
                    function: functionName,
                    category: 'milestone',
                    data: {
                        activity: 'post',
                        template: obj.__template__.__name__, 
                        table: obj.__template__.__table__
                    }
                });
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
     * Get the insert sql for the given object
     *
     * @param {object} template super type
     * @returns {string} raw insert sql
     */
     PersistObjectTemplate.getInsertScript = function (obj) {
        var template = obj.__template__;
        var tableName = this.dealias(template.__table__);
        var knex = this.getDB(this.getDBAlias(template.__table__)).connection(tableName);
        const props = template.getProperties();
        var schema = template.__schema__;
        var data = {};
        for (var prop in props) {
            var defineProperty = props[prop];
            if (!this._persistProperty(defineProperty) ||
                (defineProperty.type === Array && defineProperty.of.isObjectTemplate))
                continue;
            else if (defineProperty.type && defineProperty.type.__objectTemplate__) {
                if (!schema || !schema.parents || !schema.parents[prop] || !schema.parents[prop].id)
                    throw new Error(template.__name__ + '.' + prop + ' is missing a parents schema entry');
                var foreignKey = (schema.parents && schema.parents[prop]) ? schema.parents[prop].id : prop;
                data[foreignKey] = obj[prop];
            }
            else
                data[prop] = obj[prop];
        }

        return knex.insert(data).toString();
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
     * @param {string} alias db alias name used when setting the database client object
     * @param {string} statement knex query
     * @param {object} query mongo style query object
     * @returns {*}
     */
    PersistObjectTemplate.convertMongoQueryToChains = function (alias, statement, query) {

        /**
         * Traverse an object and produce a promise chain of where and andWhere
         * @param {object} statement knex query
         * @param {object} query mongo style query object
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

        function processProp(_statement, prop, value) {
            if (value instanceof Array)
                return processArrayProp(prop, value);
            else
                return processNonArrayProp(prop, value)
        }

        function processArrayProp(prop, value) {
            return [function () {
                var firstProp;
                var statement = this;
                if (prop.toLowerCase() == '$and') {
                    firstProp = true;
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
                    firstProp = true;
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
                    throw 'Don\'t support ' + prop + ':' + JSON.stringify(value)
            }];
        }

        /**
         * Process an array element of a $or or $and.  This will result in either three parameters in
         * the form of prop, compare operator, value or a single parameter which is a function that
         * will chain together a nested expression.
         * @param {object} statement knex query object
         * @param {object} obj object of supertype
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
                params[0] = alias + '.' + prop;
                params[1] = '=';
                params[2] = value;
            } else
                for (var subProp in value) {
                    params[0] = alias + '.' + prop;
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
                    else if (subProp.toLowerCase() == '$in') {
                        (function () {
                            var attr = params[0];
                            var values = params[2];
                            params = [function () {
                                this.whereIn(attr, values)
                            }];
                        })()
                    }
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
                        throw 'Can\'t handle ' + prop + ':' + JSON.stringify((value));
                }
            return params;
        }

        return traverse(statement, query)
    }


    PersistObjectTemplate._commitKnex = function _commitKnex(persistorTransaction, logger, notifyChanges, notifyQueries) {
        const functionName = _commitKnex.name;
        logger.debug({
            module: moduleName,
            function: functionName,
            category: 'milestone',
            message: 'end of transaction ',
            data: {
                activity: 'commit'
            }
        });
        var knex = _.findWhere(this._db, {type: PersistObjectTemplate.DB_Knex}).connection;
        var dirtyObjects = persistorTransaction.dirtyObjects;
        var touchObjects = persistorTransaction.touchObjects;
        var savedObjects = persistorTransaction.savedObjects;
        var deletedObjects = persistorTransaction.deletedObjects;
        var deleteQueries = persistorTransaction.deleteQueries;
        var innerError;
        var changeTracking;

        persistorTransaction.changedObjects = null;
        if (!notifyQueries) {
            persistorTransaction.queriesToNotify = null;
        }
        // Start the knex transaction
        return knex.transaction(function(knexTransaction) {
            persistorTransaction.knex = knexTransaction;


            Promise.resolve(true)
                .then(processPreSave.bind(this))
                .then(processSaves.bind(this))
                .then(processDeletes.bind(this))
                .then(processDeleteQueries.bind(this))
                .then(processTouches.bind(this))
                .then(processPostSave.bind(this))
                .then(processCommit.bind(this))
                .catch(rollback.bind(this));

            function processPreSave() {
                return persistorTransaction.preSave
                    ? persistorTransaction.preSave.call(persistorTransaction, persistorTransaction, logger)
                    : true
            }

            // Walk through the dirty objects
            function processSaves() {
                return Promise.map(_.toArray(dirtyObjects), function (obj) {
                    delete dirtyObjects[obj.__id__];  // Once scheduled for update remove it.
                    return callSave(obj).then(generateChanges.bind(this, obj, obj.__version__ === 1 ? 'insert' : 'update'));
                }.bind(this), {concurrency: PersistObjectTemplate.concurrency}).then (function () {
                    if (_.toArray(dirtyObjects). length > 0) {
                        return processSaves.call(this);
                    }
                });

                function callSave(obj) {
                    return (obj.__template__ && obj.__template__.__schema__
                        ?  obj.persistSave(persistorTransaction, logger)
                        : Promise.resolve(true));
                }
            }


            function processDeletes() {
                return Promise.map(_.toArray(deletedObjects), function (obj) {
                    delete deletedObjects[obj.__id__];  // Once scheduled for update remove it.
                    return callDelete(obj).then(generateChanges.bind(this, obj, 'delete'));
                }.bind(this), {concurrency: PersistObjectTemplate.concurrency}).then (function () {
                    if (_.toArray(deletedObjects). length > 0) {
                        return processDeletes.call(this);
                    }
                });

                function callDelete(obj) {
                    return (obj.__template__ && obj.__template__.__schema__
                        ?  obj.persistDelete(persistorTransaction, logger)
                        : Promise.resolve(true))
                }
            }

            function processDeleteQueries() {
                return Promise.map(_.toArray(deleteQueries), function (obj) {
                    delete deleteQueries[obj.name];  // Once scheduled for update remove it.
                    return (obj.template && obj.template.__schema__
                        ?  PersistObjectTemplate.deleteFromKnexQuery(obj.template, obj.queryOrChains, persistorTransaction, logger)
                        : true)
                }.bind(this), {concurrency: PersistObjectTemplate.concurrency}).then (function () {
                    if (_.toArray(deleteQueries). length > 0) {
                        return processDeleteQueries.call(this);
                    }
                });
            }


            function processPostSave() {
                return persistorTransaction.postSave ?
                    persistorTransaction.postSave(persistorTransaction, logger, changeTracking, persistorTransaction.queriesToNotify) :
                    true;
            }

            // And we are done with everything
            function processCommit() {
                this.dirtyObjects = {};
                this.savedObjects = {};
                if (persistorTransaction.updateConflict) {
                    throw 'Update Conflict';
                }
                return knexTransaction.commit();
            }

            // Walk through the touched objects
            function processTouches() {
                return Promise.map(_.toArray(touchObjects), function (obj) {
                    return (obj.__template__ && obj.__template__.__schema__ && !savedObjects[obj.__id__]
                        ?  obj.persistTouch(persistorTransaction, logger)
                        : true)
                }.bind(this))
            }

            async function rollback (err) {
                const deadlock = err.toString().match(/deadlock detected$/i);
                persistorTransaction.innerError = err;
                innerError = deadlock ? new Error('Update Conflict') : err;

                if (persistorTransaction.remoteObjects && persistorTransaction.remoteObjects.size > 0) {
                    (logger || this.logger).info({
                        module: moduleName,
                        function: functionName,
                        category: 'milestone',
                        message: `Rolling back transaction of remote keys`,
                        data: {
                            activity: 'end'
                        }
                    });

                    let remoteDocService = RemoteDocService.new(this.environment, this.remoteDocHostURL);

                    let toDeletePromiseArr = [];

                    persistorTransaction.remoteObjects.forEach((versionId: string, key: string) => {
                        toDeletePromiseArr.push(
                            remoteDocService.deleteDocument(key, this.bucketName, versionId)
                            .catch(error => {
                                (logger || this.logger).error({
                                    module: moduleName,
                                    function: functionName,
                                    category: 'milestone',
                                    message: 'unable to rollback remote document with key:' + key + ' and bucket: ' + this.bucketName,
                                    error: error,
                                    data: {
                                        activity: 'end'
                                    }
                                });
                            })
                        );
                    });

                    // fire off our delete requests in parallel
                    await Promise.all(toDeletePromiseArr);
                }
                revertVersionsOnAllObjects();
                return knexTransaction.rollback(innerError).then(() => {
                    (logger || this.logger).debug({
                        module: moduleName,
                        function: functionName,
                        category: 'milestone',
                        message: 'transaction rolled back ' + innerError.message + (deadlock ? ' from deadlock' : ''),
                        data: {
                            activity: 'end'
                        }
                    });
                });
            }

            function revertVersionsOnAllObjects() {
                if (!persistorTransaction || !persistorTransaction.changedObjects) {
                    return;
                }
                persistorTransaction.changedObjects.forEach((obj, key) => {
                    obj.value.__version__ = obj.orgVersion;
                })
                persistorTransaction.changedObjects = null;
            }

            function isOnetoManyRelationsOrPersistorProps(propName, propType, allProps) {
                return (propType.type === Array && propType.of.isObjectTemplate) ||
                    (propName.match(/Persistor$/) && typeof allProps[propName.replace(/Persistor$/, '')] === 'object');
            }

            function postCommit() {
                persistorTransaction.changedObjects && persistorTransaction.changedObjects.forEach(obj => {
                    var props = obj.value.__template__.getProperties();
                    for (var prop in props) {
                        var propType = props[prop];
                        if (isOnetoManyRelationsOrPersistorProps(prop, propType, props) || !PersistObjectTemplate._persistProperty(propType)) {
                            continue;
                        }
                        var oldKey = '_ct_org_' + prop;
                        const replaceNullValuesWithUndefined = function (k, v) { return v === null ? undefined : v; };
                        if (!props[prop].type.isObjectTemplate && (obj[oldKey] != obj[prop] || ((props[prop].type === Date || props[prop].type === Object) &&
                            JSON.stringify(obj[oldKey], replaceNullValuesWithUndefined) !== JSON.stringify(obj[prop], replaceNullValuesWithUndefined))))  {
                            obj[oldKey] = obj[prop];
                        }
                        //For one to one relations, we need to check the ids associated to the parent record.
                        else if (props[prop].type.isObjectTemplate && obj[prop + 'Persistor'] && obj['_ct_org_' + prop] !== obj[prop + 'Persistor'].id) {
                            obj[oldKey] = obj[prop + 'Persistor'].id;
                        }
                    }
                });
                persistorTransaction.changedObjects = null;
            }

            function generateChanges(obj, action) {
                var objChanges;

                if (notifyChanges && obj.__template__ && obj.__template__.__schema__ && obj.__template__.__schema__.enableChangeTracking) {
                    changeTracking = changeTracking || {};
                    changeTracking[obj.__template__.__name__] = changeTracking[obj.__template__.__name__] || [];
                    changeTracking[obj.__template__.__name__].push(objChanges = {
                        table: obj.__template__.__table__,
                        primaryKey: obj._id,
                        action: action,
                        properties: []
                    });
                    if (action === 'update' || action === 'delete') {
                        var props = obj.__template__.getProperties();
                        for (var prop in props) {
                            var propType = props[prop];
                            if (isOnetoManyRelationsOrPersistorProps(prop, propType, props) || !PersistObjectTemplate._persistProperty(propType)) {
                                continue;
                            }
                            generatePropertyChanges(prop, obj);
                        }
                    }
                }



                function generatePropertyChanges(prop, obj) {
                    //When the property type is not an object template, need to compare the values.
                    //for date and object types, need to compare the stringified values.
                    var oldKey = '_ct_org_' + prop;
                    const replaceNullValuesWithUndefined = function (k, v) { return v === null ? undefined : v; };
                    if (!props[prop].type.isObjectTemplate && (obj[oldKey] != obj[prop] || ((props[prop].type === Date || props[prop].type === Object) &&
                        JSON.stringify(obj[oldKey], replaceNullValuesWithUndefined) !== JSON.stringify(obj[prop], replaceNullValuesWithUndefined))))  {
                        addChanges(prop, obj[oldKey], obj[prop], prop);
                        obj[oldKey] = obj[prop];
                    }
                    //For one to one relations, we need to check the ids associated to the parent record.
                    else if (props[prop].type.isObjectTemplate && obj[prop + 'Persistor'] && obj['_ct_org_' + prop] !== obj[prop + 'Persistor'].id) {
                        addChanges(prop, obj[oldKey], obj[prop + 'Persistor'].id, getColumnName(prop, obj));
                        obj[oldKey] = obj[prop + 'Persistor'].id;
                    }
                }

                function getColumnName(prop, obj) {
                    var schema = obj.__template__.__schema__;
                    if (!schema || !schema.parents || !schema.parents[prop] || !schema.parents[prop].id)
                        throw  new Error(obj.__template__.__name__ + '.' + prop + ' is missing a parents schema entry');
                    return schema.parents[prop].id;
                }

                function addChanges(prop, originalValue, newValue, columnName) {
                    objChanges.properties.push({
                        name: prop,
                        originalValue: originalValue,
                        newValue: newValue,
                        columnName: columnName
                    });
                }
            }
        }.bind(this)).then(function () {
            (logger || this.logger).debug({
                module: moduleName,
                function: functionName,
                category: 'milestone',
                message: 'end - transaction completed'
            });
            return true;
        }.bind(this)).catch(function (e) {
            var err = e || innerError;
            if (err && err.message && err.message != 'Update Conflict') {
                (logger || this.logger).error({
                    module: moduleName,
                    function: functionName,
                    category: 'milestone',
                    message: 'transaction ended with error',
                    error: err,
                    data: {
                        activity: 'end',
                    }
                });
            } //@TODO: Why throw error in all cases but log only in some cases
            throw (e || innerError);
        }.bind(this))
    }
};