/**
 *  All public interfaces are contained here.  They either fan out to query.js, update.js or db.js in the
 *  individual database directories.  Three kinds of interfaces are available
 *
 *  - Object Intefaces are methods added to objects instantiated from PersistObjectTemplate contexts
 *
 *  - Template interfaces are methods added to templates instantiated from PersistObjectTemplate
 *
 *  - ObjectTemplate intefaces are session level interfaces
 *
 */

import { PersistorTransaction, RemoteDocConnectionOptions } from './types';


module.exports = function (PersistObjectTemplate, baseClassForPersist) {
    const moduleName = `persistor/lib/api`;
    let supertypeRequire = require('@haventech/supertype');
    let statsDHelper = supertypeRequire.StatsdHelper;

    var Promise = require('bluebird');
    var _ = require('underscore');

    function getTime() {
        return process.hrtime();
    }

    function getStats(startTime, templateName: string, queryType: string, error = false) {
        return statsDHelper.computeTimingAndSend(
            startTime,
            `persistor.${queryType}`,
            {
                error: error,
                templateName: templateName,
            });
    }

    /**
     * PUBLIC INTERFACE FOR OBJECTS
     */

    PersistObjectTemplate.getPersistorProps = function () {
        var persistorProps = {};
        _.each(PersistObjectTemplate.__dictionary__, processTemplate);
        return persistorProps;

        function processTemplate(template) {

            var props = template.getProperties();
            _.each(props, processDefineProperty);

            function processDefineProperty(_defineProperty, prop) {
                if (prop.match(/Persistor$/) && prop.substr(0, 2) != '__') {
                    persistorProps[template.__name__] = persistorProps[template.__name__] || {}
                    persistorProps[template.__name__][prop.replace(/Persistor$/, '')] = 1;
                }
            }
        }
    }

    /**
     * PUBLIC INTERFACE FOR TEMPLATES
     *
     * @param {supertype} template - load all parent/child/subdocument/subsetof defitions
     */
    PersistObjectTemplate._injectIntoTemplate = function (template) {
        this._prepareSchema(template);
        this._injectTemplateFunctions(template);
        this._injectObjectFunctions(template);
    }
    PersistObjectTemplate._prepareSchema = function (template) {
        if (!this.schemaVerified) {
            this._verifySchema();
        }
        this.schemaVerified = true;

        // Process subclasses that didn't have schema entries
        var parent = template.__parent__;
        while (!template.__schema__ && parent) {
            if (parent.__schema__) {
                template.__schema__ = parent.__schema__;
                template.__collection__ = parent.__collection__;
                template.__table__ = template.__schema__.table ? template.__schema__.table : parent.__table__;
                template.__topTemplate = parent.__topTemplate__;
                parent = null;
            } else {
                parent = parent.__parent__;
            }
        }

        // Process subsets
        if (template.__schema__ && template.__schema__.subsetOf) {
            var mainTemplate = this.__dictionary__[template.__schema__.subsetOf];
            if (!mainTemplate) {
                throw new Error('Reference to subsetOf ' + template.__schema__.subsetOf + ' not found for ' + template.__name__);
            }
            template.__subsetOf__ = template.__schema__.subsetOf
            if (!mainTemplate.__schema__) {
                parent = mainTemplate.__parent__;
                while (!mainTemplate.__schema__ && parent) {
                    if (parent.__schema__) {
                        mainTemplate.__schema__ = parent.__schema__;
                        mainTemplate.__collection__ = parent.__collection__;
                        mainTemplate.__table__ = mainTemplate.__schema__.table ? mainTemplate.__schema__.table : parent.__table__;
                        mainTemplate.__topTemplate = parent.__topTemplate__;
                        parent = null;
                    } else {
                        parent = parent.__parent__;
                    }
                }
                if (!mainTemplate.__schema__) {
                    throw new Error('Missing schema entry for ' + template.__schema__.subsetOf);
                }
            }
            mergeRelationships(template.__schema__, mainTemplate.__schema__);
            template.__collection__ = mainTemplate.__collection__;
            template.__table__ = mainTemplate.__table__;
        }
        baseClassForPersist._injectIntoTemplate(template);

        function mergeRelationships(orig, overlay) {
            _.each(overlay.children, function (value, key) {
                orig.children = orig.children || {};
                if (!orig.children[key]) {
                    orig.children[key] = value;
                }
            });
            _.each(overlay.parents, function (value, key) {
                orig.parents = orig.parents || {};
                if (!orig.parents[key]) {
                    orig.parents[key] = value;
                }
            });
        }
    }
    PersistObjectTemplate._injectTemplateFunctions = function (template) {
        function logExceptionAndRethrow(exception, logger, template, query, activity) {
            const functionName = logExceptionAndRethrow.name;
            if (typeof (query) === 'undefined') {
                query = 'undefined value provided';
            } else if (typeof (query) === 'object') {
                let undefHandler = (key, value) => typeof (value) === 'undefined' ? 'undefined value provided for ' + key : value;
                query = JSON.stringify(query, undefHandler);
            }

            logger.error({
                module: moduleName,
                function: functionName,
                category: 'milestone',
                error: exception,
                data: { 
                    activity: activity,
                    template: template, 
                    query: query 
                }
            });
            throw exception;
        }

        /**
         * Return a single instance of an object of this class given an id
         *
         * @param {string} id mongo style id
         * @param {bool} cascade, loads children if requested
         * @param {bool} isTransient - marking the laoded object as transient.
         * @param {object} idMap id mapper for cached objects
         * @param {bool} isRefresh force load
         * @param {object} logger objecttemplate logger
         * @returns {object}
         * @legacy Use persistorFetchById instead
         */
        template.getFromPersistWithId = async function (id, cascade, isTransient, idMap, isRefresh, logger) {
            const functionName = 'getFromPersistWithId';
            (logger || PersistObjectTemplate.logger).debug({
                module: moduleName,
                function: functionName,
                category: 'milestone',
                data: { 
                    template: template.__name__, 
                    id: id 
                }
            });
            var dbType = PersistObjectTemplate.getDB(PersistObjectTemplate.getDBAlias(template.__collection__)).type;
            const time = getTime();

            let getQuery = (dbType == PersistObjectTemplate.DB_Mongo ?
                PersistObjectTemplate.getFromPersistWithMongoId(template, id, cascade, isTransient, idMap, logger) :
                PersistObjectTemplate.getFromPersistWithKnexId(template, id, cascade, isTransient, idMap, isRefresh, logger));

            const name = 'getFromPersistWithId';
            return getQuery
                .then(result => {
                    getStats(time, template.__name__, name);
                    return result;
                })
                .catch(e => {
                    getStats(time, template.__name__, name, true);
                    return logExceptionAndRethrow(e, logger || PersistObjectTemplate.logger, template.__name__, id, name)
                });

        };

        /**
         * Return an array of objects of this class given a json query
         *
         * @param {json} query mongo style queries
         * @param {bool} cascade, loads children if requested
         * @param {numeric} start - starting position of the result set.
         * @param {numeric} limit - limit the result set
         * @param {bool} isTransient {@TODO}
         * @param {object} idMap id mapper for cached objects
         * @param {bool} options {@TODO}
         * @param {object} logger objecttemplate logger
         * @returns {object}
         * @legacy in favor of persistorFetchByQuery
         */
        template.getFromPersistWithQuery = async function (query, cascade, start, limit, isTransient, idMap, options, logger) {
            const functionName = 'getFromPersistWithQuery';
            (logger || PersistObjectTemplate.logger).debug({
                module: moduleName,
                function: functionName,
                category: 'milestone',
                data: { 
                    template: template.__name__ 
                }
            });
            var dbType = PersistObjectTemplate.getDB(PersistObjectTemplate.getDBAlias(template.__collection__)).type;
            const time = getTime();

            let getQuery = (dbType == PersistObjectTemplate.DB_Mongo ?
                PersistObjectTemplate.getFromPersistWithMongoQuery(template, query, cascade, start, limit, isTransient, idMap, options, logger) :
                PersistObjectTemplate.getFromPersistWithKnexQuery(null, template, query, cascade, start, limit, isTransient, idMap, options, undefined, undefined, logger));


            const name = 'getFromPersistWithQuery';
            return getQuery
                .then(result => {
                    getStats(time, template.__name__, name);
                    return result;
                })
                .catch(e => {
                    getStats(time, template.__name__, name, true);
                    return logExceptionAndRethrow(e, logger || PersistObjectTemplate.logger, template.__name__, query, name)
                });
        };

        /**
         * Delete objects given a json query
         *
         * @param {json} query mongo style queries
         * @param {object} txn persistObjectTemplate transaciton object
         * @param {object} logger objecttemplate logger
         * @returns {object}
         * @legacy in favor of persitorDeleteByQuery
         */
        template.deleteFromPersistWithQuery = async function (query, txn, logger) {
            var dbType = PersistObjectTemplate.getDB(PersistObjectTemplate.getDBAlias(template.__collection__)).type;
            const time = getTime();

            let getQuery = dbType == PersistObjectTemplate.DB_Mongo ?
                PersistObjectTemplate.deleteFromPersistWithMongoQuery(template, query, logger) :
                PersistObjectTemplate.deleteFromKnexQuery(template, query, txn, logger);

            const name = 'deleteFromQuery';
            return getQuery
                .then(result => {
                    getStats(time, template.__name__, name);
                    return result;
                })
                // @TODO: need to handle errors with log

                .catch(e => {
                    getStats(time, template.__name__, name, true);
                });
        };

        /**
         * Fetch an object by id
         * @param {string} id mongo style id
         * @param {json} options @todo
         * @returns {*}
         */
        template.persistorFetchById = async function (id, options) {
            const time = getTime();
            const functionName = 'persistorFetchById';

            PersistObjectTemplate._validateParams(options, 'fetchSchema', template);

            options = options || {};

            var persistObjectTemplate = options.session || PersistObjectTemplate;
            (options.logger || persistObjectTemplate.logger).debug({
                module: moduleName,
                function: functionName,
                category: 'milestone',
                data: { 
                    template: template.__name__, 
                    id: id 
                }
            });
            var dbType = persistObjectTemplate.getDB(persistObjectTemplate.getDBAlias(template.__collection__)).type;
            let fetchQuery = (dbType == persistObjectTemplate.DB_Mongo ?
                persistObjectTemplate.getFromPersistWithMongoId(template, id, options.fetch, options.transient, null, options.logger) :
                persistObjectTemplate.getFromPersistWithKnexId(template, id, options.fetch, options.transient, null, null, options.logger, options.enableChangeTracking, options.projection));

            const name = 'persistorFetchById';
            return fetchQuery
                .then(result => {
                    getStats(time, template.__name__, name);
                    return result;
                })
                .catch(e => {
                    getStats(time, template.__name__, name, true);
                    return logExceptionAndRethrow(e, options.logger || PersistObjectTemplate.logger, template.__name__, id, name)
                });
        };

        /**
         * Delete all objects matching a query
         * @param {JSON} query @TODO
         * @param {JSON} options @TODO
         * @returns {Object}
         */
        template.persistorDeleteByQuery = async function (query, options) {
            const time = getTime();

            PersistObjectTemplate._validateParams(options, 'persistSchema', template);

            options = options || {};
            var dbType = PersistObjectTemplate.getDB(PersistObjectTemplate.getDBAlias(template.__collection__)).type;
            let deleteQuery = dbType == PersistObjectTemplate.DB_Mongo ?
                PersistObjectTemplate.deleteFromPersistWithMongoQuery(template, query, options.logger) :
                PersistObjectTemplate.deleteFromKnexByQuery(template, query, options.transaction, options.logger);

            const name = 'persistorDeleteByQuery';
            return deleteQuery
                .then(result => {
                    getStats(time, template.__name__, name);
                    return result;
                })
                // @TODO: need to handle errors with log
                .catch(e => {
                    getStats(time, template.__name__, name, true);
                    return logExceptionAndRethrow(e, options.logger || PersistObjectTemplate.logger, template.__name__, query, name);
                });
        };

        /**
         * Fetch all objects matching a query
         * @param {JSON} query @TODO
         * @param {JSON} options @TODO
         * @returns {*}
         */
        template.persistorFetchByQuery = async function (query, options) {
            const time = getTime();
            const functionName = 'persistorFetchByQuery';

            PersistObjectTemplate._validateParams(options, 'fetchSchema', template);

            options = options || {};
            var persistObjectTemplate = options.session || PersistObjectTemplate;
            var logger = options.logger || persistObjectTemplate.logger;
            logger.debug({
                module: moduleName,
                function: functionName,
                category: 'milestone',
                data: { 
                    template: template.__name__ 
                }
            });
            var dbType = persistObjectTemplate.getDB(persistObjectTemplate.getDBAlias(template.__collection__)).type;
            if (options.order && !options.order.sort) {
                options.order = { sort: options.order };
            }
            let fetchQuery = (dbType == persistObjectTemplate.DB_Mongo ?
                persistObjectTemplate.getFromPersistWithMongoQuery(template, query, options.fetch, options.start,
                    options.limit, options.transient, options.order, options.order, logger) :
                persistObjectTemplate.getFromPersistWithKnexQuery(null, template, query, options.fetch, options.start,
                    options.limit, options.transient, null, options.order,
                    undefined, undefined, logger, options.enableChangeTracking, options.projection));

            const name = 'persistorFetchByQuery';
            return fetchQuery
                .then(result => {
                    getStats(time, template.__name__, name);
                    return result;
                })
                .catch(e => {
                    getStats(time, template.__name__, name, true);
                    return logExceptionAndRethrow(e, options.logger || PersistObjectTemplate.logger, template.__name__, query, name)
                });
        };
        /**
         * Return count of objects of this class given a json query
         *
         * @param {json} query mongo style queries
         * @param {object} options @TODO
         * @returns {Number}
         */
        template.persistorCountByQuery = async function (query, options) {
            const time = getTime();
            const functionName = 'persistorCountByQuery';

            PersistObjectTemplate._validateParams(options, 'fetchSchema', template);

            options = options || {};
            var logger = options.logger || PersistObjectTemplate.logger;
            logger.debug({
                module: moduleName,
                function: functionName,
                category: 'milestone',
                data: { 
                    activity: 'persistorCountByQuery',
                    template: template.__name__ 
                }
            });

            var dbType = PersistObjectTemplate.getDB(PersistObjectTemplate.getDBAlias(template.__collection__)).type;
            let countQuery = (dbType == PersistObjectTemplate.DB_Mongo ?
                PersistObjectTemplate.countFromMongoQuery(template, query, logger) :
                PersistObjectTemplate.countFromKnexQuery(template, query, logger));

            const name = 'persistorCountByQuery';
            return countQuery
                .then(result => {
                    getStats(time, template.__name__, name);
                    return result;
                })
                .catch(e => {
                    getStats(time, template.__name__, name, true);
                    return logExceptionAndRethrow(e, options.logger || PersistObjectTemplate.logger, template.__name__, query, { activity: 'persistorCountByQuery' })
                });
        };

        /**
         * Delete objects given id
         *
         * @param {string} id mongo style id
         * @param {object} txn persistObjectTemplate transaciton object
         * @param {object} logger objecttemplate logger
         * @returns {object}
         * @legacy in favor of persistorDeleteByQuery
         */
        template.deleteFromPersistWithId = async function (id, txn, logger) {
            const time = getTime();
            const functionName = 'deleteFromPersistWithId';

            (logger || PersistObjectTemplate.logger).debug({
                module: moduleName,
                function: functionName,
                category: 'milestone',
                data: { 
                    template: template.__name__, 
                    id: id 
                }
            });
            var dbType = PersistObjectTemplate.getDB(PersistObjectTemplate.getDBAlias(template.__collection__)).type;
            let deleteQuery = (dbType == PersistObjectTemplate.DB_Mongo ?
                PersistObjectTemplate.deleteFromPersistWithMongoId(template, id, logger) :
                PersistObjectTemplate.deleteFromKnexId(template, id, txn, logger));

            const name = 'deleteFromPersistWithId';
            return deleteQuery
                .then(result => {
                    getStats(time, template.__name__, name);
                    return result;
                })
                .catch(e => {
                    getStats(time, template.__name__, name, true);
                    return logExceptionAndRethrow(e, logger || PersistObjectTemplate.logger, template.__name__, id, { activity: 'deleteFromPersistWithId' })
                });
        };

        /**
         * Return count of objects of this class given a json query
         *
         * @param {json} query mongo style queries
         * @param {object} logger objecttemplate logger
         * @returns {Number}
         * @legacy in favor of persistorCountWithQuery
         */
        template.countFromPersistWithQuery = async function (query, logger) {
            const time = getTime();
            const functionName = 'countFromPersistWithQuery';

            (logger || PersistObjectTemplate.logger).debug({
                module: moduleName,
                function: functionName,
                category: 'milestone',
                data: { 
                    template: template.__name__ 
                }
            });
            var dbType = PersistObjectTemplate.getDB(PersistObjectTemplate.getDBAlias(template.__collection__)).type;
            let countQuery = (dbType == PersistObjectTemplate.DB_Mongo ?
                PersistObjectTemplate.countFromMongoQuery(template, query, logger) :
                PersistObjectTemplate.countFromKnexQuery(template, query, logger));

            const name = 'countFromPersistWithQuery';
            return countQuery
                .then(result => {
                    getStats(time, template.__name__, name);
                    return result;
                })
                .catch(e => {
                    getStats(time, template.__name__, name, true);
                    return logExceptionAndRethrow(e, logger || PersistObjectTemplate.logger, template.__name__, query, name)
                });
        };

        /**
         * Determine whether we are using knex on this table
         * @returns {boolean}
         */
        template.persistorIsKnex = function () {
            var dbType = PersistObjectTemplate.getDB(PersistObjectTemplate.getDBAlias(template.__collection__)).type;
            return dbType != PersistObjectTemplate.DB_Mongo;
        };

        /**
         * Get a knex object that can be used to create native queries (e.g. template.getKnex().select().from())
         * @returns {*}
         */
        template.persistorGetKnex = function () {
            var tableName = PersistObjectTemplate.dealias(template.__table__);
            return PersistObjectTemplate.getDB(PersistObjectTemplate.getDBAlias(template.__table__)).connection(tableName);
        };

        /**
         * Return knex table name for template for use in native queries
         * @param {string} alias - table alias alias named used when setting the DB object
         * @returns {string}
         */
        template.persistorGetTableName = function (alias) {
            return PersistObjectTemplate.dealias(template.__table__) + (alias ? ' as ' + alias : '');
        };

        /**
         * Return the foreign key for a given parent property for use in native queries
         * @param {string} prop field name
         * @param {string} alias - table alias name used for query generation
         * @returns {string}
         */
        template.persistorGetParentKey = function (prop, alias) {
            return (alias ? alias + '.' : '') + template.__schema__.parents[prop].id;
        };

        /**
         * Return the foreign key for a given child property for use in native queries
         * @param {string} prop field name
         * @param {string} alias - table alias name used for query generation
         * @returns {string}
         */
        template.persistorGetChildKey = function (prop, alias) {
            return (alias ? alias + '.' : '') + template.__schema__.children[prop].id;
        };

        /**
         * Return '_id'
         * @param {string} alias - table alias name used for query generation
         * @returns {string}
         */
        template.persistorGetId = function (alias) {
            return (alias ? alias + '.' : '') + '_id';
        };

        /**
         * return an array of join parameters (e.g. .rightOuterJoin.apply(template.getKnex(), Transaction.knexChildJoin(...)))
         * @param {object} targetTemplate objecttemplate
         * @param {string} primaryAlias - table alias name used for query generation
         * @param {string} targetAlias - table alias name used for query generation
         * @param {string} joinKey - field name
         * @returns {*[]}
         */
        template.persistorKnexParentJoin = function (targetTemplate, primaryAlias, targetAlias, joinKey) {
            return [template.getTableName() + ' as ' + primaryAlias, targetTemplate.getParentKey(joinKey, targetAlias), template.getPrimaryKey(primaryAlias)];
        };

        /**
         * return an array of join parameters (e.g. .rightOuterJoin.apply(template.getKnex(), Transaction.knexChildJoin(...)))
         * @param {object} targetTemplate target table to join with
         * @param {object} primaryAlias table alias name for the source/current object
         * @param {object} targetAlias table alias name for the target table.
         * @param {string} joinKey source table field name
         * @returns {*[]}
         */
        template.persistorKnexChildJoin = function (targetTemplate, primaryAlias, targetAlias, joinKey) {
            return [template.getTableName() + ' as ' + primaryAlias, targetTemplate.getChildKey(joinKey, primaryAlias), targetTemplate.getPrimaryKey(targetAlias)];
        };


        // Deprecated API
        template.isKnex = template.persistorIsKnex;
        template.getKnex = template.persistorGetKnex;
        template.getTableName = template.persistorGetTableName;
        template.getParentKey = template.persistorGetParentKey;
        template.getChildKey = template.persistorGetChildKey;
        template.getPrimaryKey = template.persistorGetId;
        template.knexParentJoin = template.persistorKnexParentJoin;
        template.knexChildJoin = template.persistorKnexChildJoin;

        /**
         * Inject the persitor properties and get/fetch methods need for persistence.  This is either called
         * as part of _injectTemplate if the template was fully created or when the template is instantiated lazily
         * @private
         */
        template._injectProperties = function () {
            if (this.hasOwnProperty('__propertiesInjected__'))
                return;
            var props = this.defineProperties;
            for (var prop in props) {
                var defineProperty = props[prop];
                var type = defineProperty.type;
                var of = defineProperty.of;
                var refType = of || type;

                if (refType && refType.isObjectTemplate && PersistObjectTemplate._persistProperty(defineProperty)) {
                    var isCrossDocRef = PersistObjectTemplate.isCrossDocRef(template, prop, defineProperty)
                    if (isCrossDocRef || defineProperty.autoFetch) {
                        (function () {
                            var closureProp = prop;
                            var closureFetch = defineProperty.fetch ? defineProperty.fetch : {};
                            var closureQueryOptions = defineProperty.queryOptions ? defineProperty.queryOptions : {};
                            var toClient = !(defineProperty.isLocal || (defineProperty.toClient === false))
                            if (!props[closureProp + 'Persistor']) {
                                template.createProperty(closureProp + 'Persistor', {
                                    type: Object, toClient: toClient,
                                    toServer: false, persist: false,
                                    value: { isFetched: defineProperty.autoFetch ? false : true, isFetching: false }
                                });
                            }
                            if (!template.prototype[closureProp + 'Fetch'])
                                template.createProperty(closureProp + 'Fetch', {
                                    on: 'server', body: function (start, limit) {
                                        if (typeof (start) != 'undefined') {
                                            closureQueryOptions['skip'] = start;
                                        }
                                        if (typeof (limit) != 'undefined') {
                                            closureQueryOptions['limit'] = limit;
                                        }
                                        return this.fetchProperty(closureProp, closureFetch, closureQueryOptions);
                                    }
                                });
                        })();
                    }
                }
            }
            this.__propertiesInjected__ = true;
        }
    }
    PersistObjectTemplate._injectObjectFunctions = function (template) {

        var self = this; // this is the objectTemplate for non-TS apps or daemons or other non-sessionized use-cases

        template.prototype.persistSave = // Legacy
            function (txn, logger) {
                const time = getTime();
                const functionName = 'persistSave';

                var persistObjectTemplate = this.__objectTemplate__ || self;
                (logger || persistObjectTemplate.logger).debug({
                    module: moduleName,
                    function: functionName,
                    category: 'milestone',
                    data: { 
                        template: this.__template__.__name__, 
                        id: this.__id__ 
                    }
                });
                var dbType = persistObjectTemplate.getDB(persistObjectTemplate.getDBAlias(this.__template__.__collection__)).type;
                let query = dbType == persistObjectTemplate.DB_Mongo ?
                    persistObjectTemplate.persistSaveMongo(this, undefined, undefined, undefined, txn, logger)
                        .then(function (obj) {
                            if (txn) {
                                persistObjectTemplate.saved(obj, txn);
                            }
                            return Promise.resolve(obj._id.toString())
                        })
                    : persistObjectTemplate.persistSaveKnex(this, txn, logger)
                        .then(function (obj) {
                            if (txn) {
                                persistObjectTemplate.saved(obj, txn);
                            }
                            return Promise.resolve(obj._id.toString());
                        });
                const name = 'persistSave';
                return query
                    .then(result => {
                        getStats(time, template.__name__, name);
                        return result;
                    })
                    // @TODO: need to handle errors with log
                    .catch(e => {
                        getStats(time, template.__name__, name, true);
                        throw e;
                    });
            };

        template.prototype.persistTouch = // Legacy -- just use persistorSave
            async function (txn, logger) {
                const time = getTime();
                const functionName = 'persistTouch';
                var persistObjectTemplate = this.__objectTemplate__ || self;
                (logger || persistObjectTemplate.logger).debug({
                    module: moduleName,
                    function: functionName,
                    category: 'milestone',
                    data: { 
                        template: this.__template__.__name__, 
                        id: this.__id__ 
                    }
                });
                var dbType = persistObjectTemplate.getDB(persistObjectTemplate.getDBAlias(this.__template__.__collection__)).type;
                let query = dbType == persistObjectTemplate.DB_Mongo ?
                    persistObjectTemplate.persistSaveMongo(this, undefined, undefined, undefined, txn, logger)
                    : persistObjectTemplate.persistTouchKnex(this, txn, logger);

                const name = 'persistTouch';
                return query
                    .then(result => {
                        getStats(time, template.__name__, name);
                        return result;
                    })
                    // @TODO: need to handle errors with log
                    .catch(e => {
                        getStats(time, template.__name__, name, true);
                        throw e;
                    });
            };

        //persistDelete is modified to support both legacy and V2, options this is passed for V2 as the first parameter.
        template.prototype.persistDelete = // Legacy
            async function (txn, logger) {
                const time = getTime();
                const functionName = 'persistDelete';

                var persistObjectTemplate = this.__objectTemplate__ || self;
                let query;
                if (!txn || (txn && txn.knex && txn.knex.transacting)) {
                    (logger || persistObjectTemplate.logger).debug({
                        module: moduleName,
                        function: functionName,
                        category: 'milestone',
                        data: { 
                            template: this.__template__.__name__, 
                            id: this.__id__ 
                        }
                    });
                    if (txn) {
                        delete txn.dirtyObjects[this.__id__];
                    }
                    query = this.__template__.deleteFromPersistWithId(this._id, txn, logger)
                }
                else {
                    //for V2 options are passed as the first paramter.
                    query = this.deleteV2.call(this, txn);
                }

                const name = 'persistDelete';
                return query
                    .then(result => {
                        getStats(time, template.__name__, name);
                        return result;
                    })
                    // @TODO: need to handle errors with log
                    .catch(e => {
                        getStats(time, template.__name__, name, true);
                        throw e;
                    });

            };

        template.prototype.setDirty = function (txn, onlyIfChanged, cascade, logger) {
            var persistObjectTemplate = this.__objectTemplate__ || self;
            persistObjectTemplate.setDirty(this, txn, onlyIfChanged, !cascade, logger);
        };

        template.prototype.setAsDeleted = function (txn, onlyIfChanged) {
            var persistObjectTemplate = this.__objectTemplate__ || self;
            persistObjectTemplate.setAsDeleted(this, txn, onlyIfChanged)
        };

        // Legacy
        template.prototype.cascadeSave = function (txn, logger) {
            var persistObjectTemplate = this.__objectTemplate__ || self;
            persistObjectTemplate.setDirty(this, txn || persistObjectTemplate.currentTransaction, true, false, logger);
        };

        template.prototype.isStale = // Legacy
            template.prototype.persistorIsStale = function () {
                var time = getTime();
                var name = 'isStale';
                var persistObjectTemplate = this.__objectTemplate__ || self;
                var dbType = persistObjectTemplate.getDB(persistObjectTemplate.getDBAlias(this.__template__.__collection__)).type;
                return this.__template__.countFromPersistWithQuery(
                    {
                        _id: (dbType == persistObjectTemplate.DB_Mongo) ? persistObjectTemplate.ObjectID(this._id.toString()) : this._id,
                        __version__: this.__version__
                    }).then(function (count) {
                    return !count
                }.bind(this))
                    .then(result => {
                        getStats(time, template.__name__, name);
                        return result;
                    })
                    // @TODO: need to handle errors with log
                    .catch(e => {
                        getStats(time, template.__name__, name, true);
                        throw e;
                    });
            };

        // Legacy
        template.prototype.fetchProperty = async function (prop, cascade, queryOptions, isTransient, idMap, logger) {
            const functionName = 'fetchProperty';
            var persistObjectTemplate = this.__objectTemplate__ || self;
            var time = getTime();
            (logger || persistObjectTemplate.logger).debug({
                module: moduleName,
                function: functionName,
                category: 'milestone',
                data: { 
                    template: this.__template__.__name__, 
                    id: this.__id__ 
                }
            });
            idMap = idMap || {};
            var properties = {};
            var objectProperties = this.__template__.getProperties();
            properties[prop] = objectProperties[prop];
            if (queryOptions) {
                properties[prop].queryOptions = queryOptions;
            }
            var cascadeTop = {};
            cascadeTop[prop] = cascade || true;

            var dbType = persistObjectTemplate.getDB(persistObjectTemplate.getDBAlias(this.__template__.__collection__)).type;
            var promise;
            promise = dbType == persistObjectTemplate.DB_Mongo ?
                persistObjectTemplate.getTemplateFromMongoPOJO(this, this.__template__, null, null, idMap, cascadeTop, this, properties, isTransient, logger) :
                persistObjectTemplate.getTemplateFromKnexPOJO(this, this.__template__, null, idMap, cascadeTop, isTransient, null, this, properties, undefined, undefined, undefined, logger);

            var name = 'fetchProperty';
            return promise.then(result => {
                getStats(time, template.__name__, name);
                return result;
            })
            // @TODO: need to handle errors with log
                .catch(e => {
                    getStats(time, template.__name__, name, true);
                    throw e;
                });

        };

        template.prototype.fetch = async function (cascade, isTransient, idMap, logger) {
            const functionName = 'fetch';
            var persistObjectTemplate = this.__objectTemplate__ || self;
            var time = getTime();
            (logger || persistObjectTemplate.logger).debug({
                module: moduleName,
                function: functionName,
                category: 'milestone',
                data: {
                    template: this.__template__.__name__, 
                    id: this.__id__ 
                }
            });
            idMap = idMap || {};

            var properties = {}
            var objectProperties = this.__template__.getProperties();
            for (var prop in cascade) {
                properties[prop] = objectProperties[prop];
            }
            var dbType = persistObjectTemplate.getDB(persistObjectTemplate.getDBAlias(this.__template__.__collection__)).type;
            var previousDirtyTracking = persistObjectTemplate.__changeTracking__;
            var promise = (dbType == persistObjectTemplate.DB_Mongo) ?
                persistObjectTemplate.getTemplateFromMongoPOJO(this, this.__template__, null, null, idMap, cascade, this, properties, isTransient, logger) :
                persistObjectTemplate.getTemplateFromKnexPOJO(this, this.__template__, null, idMap, cascade, isTransient, null, this, properties, undefined, undefined, undefined, logger);
            var name = 'fetch';
            return promise.then(result => {
                getStats(time, template.__name__, name);
                return result;
            })
            // @TODO: need to handle errors with log
                .catch(e => {
                    getStats(time, template.__name__, name, true);
                    throw e;
                });
        };

        template.prototype.persistorIsFetched = function (prop: string) {
            const persistorPropertyName = prop + 'Persistor';
            if (this.hasOwnProperty(persistorPropertyName)) {
                return this[persistorPropertyName].isFetched;
            }
            throw new Error('Unable to find Persistor property for ' + prop);
        };

        template.prototype.persistorFetchReferences = template.prototype.fetchReferences = async function (options) {
            const functionName = 'persistorFetchReferences';
            var persistObjectTemplate = this.__objectTemplate__ || self;
            persistObjectTemplate._validateParams(options, 'fetchSchema', this.__template__);
            var time = getTime();

            options = options || {};
            var logger = options.logger || persistObjectTemplate.logger;
            logger.debug({
                module: moduleName,
                function: functionName,
                category: 'milestone',
                data: {
                    template: this.__template__.__name__, 
                    id: this.__id__ 
                }
            });


            var properties = {}
            var objectProperties = this.__template__.getProperties();
            for (var prop in options.fetch) {
                properties[prop] = objectProperties[prop];
            }
            var dbType = persistObjectTemplate.getDB(persistObjectTemplate.getDBAlias(this.__template__.__collection__)).type;
            var promise = (dbType == persistObjectTemplate.DB_Mongo ?
                persistObjectTemplate.getTemplateFromMongoPOJO(this, this.__template__, null, null, {},
                    options.fetch, this, properties, options.transient, logger) :
                persistObjectTemplate.getTemplateFromKnexPOJO(this, this.__template__, null, {},
                    options.fetch, options.transient, null, this,
                    properties, undefined, undefined, undefined, logger));

            var name = 'persistorFetchReferences';
            return promise
                .then(result => {
                    getStats(time, template.__name__, name);
                    return result;
                })// @TODO: need to handle errors with log
                .catch(e => {
                    getStats(time, template.__name__, name, true);
                    throw e;
                });
        };

        template.prototype.persistorRefresh = template.prototype.refresh = async function (logger) {
            const functionName = 'persistorRefresh';
            // @TODO: need to add stats collection to this method for success and failure
            var persistObjectTemplate = this.__objectTemplate__ || self;
            (logger || persistObjectTemplate.logger).debug({
                module: moduleName,
                function: functionName,
                category: 'milestone',
                data: {
                    template: this.__template__.__name__, 
                    id: this.__id__
                }
            });
            var dbType = persistObjectTemplate.getDB(persistObjectTemplate.getDBAlias(template.__collection__)).type;
            //return this.__template__.getFromPersistWithId(this._id, null, null, null, true, logger)
            return (dbType == PersistObjectTemplate.DB_Mongo ?
                persistObjectTemplate.getFromPersistWithMongoId(template, this._id, null, null, null, logger) :
                persistObjectTemplate.getFromPersistWithKnexId(template, this._id, null, null, null, true, logger));

        };

        template.prototype.persistorSave = template.prototype.persist = async function (options) {
            const functionName = 'persistorSave';
            var time = getTime();

            var persistObjectTemplate = this.__objectTemplate__ || self;
            persistObjectTemplate._validateParams(options, 'persistSchema', this.__template__);

            options = options || {};
            var txn = persistObjectTemplate.getCurrentOrDefaultTransaction(options.transaction);
            var cascade = options.cascade;
            var logger = options.logger || persistObjectTemplate.logger;
            logger.debug({
                module: moduleName,
                function: functionName,
                category: 'milestone',
                data: {
                    template: this.__template__.__name__, 
                    id: this.__id__ 
                }
            });

            var promise;
            if (!txn) {
                promise = this.persistSave(null, logger);
            }
            else {
                promise = Promise.resolve(this.setDirty(txn, false, cascade, logger));
            }

            const name = 'persistorSave';
            return promise
                .then(result => {
                    getStats(time, template.__name__, name);
                    return result;
                })
                // @TODO: need to handle errors with log

                .catch(e => {
                    getStats(time, template.__name__, name, true);
                    throw e;
                });
        };

        /**
         * Can generate object id even before saving the record to the database.
         * @returns {string}
         */
        template.prototype.generateId = function (): string {
            let persistObjectTemplate = this.__objectTemplate__ || self;
            return (this._id = this._id || persistObjectTemplate.createPrimaryKey(this));
        };

        Object.defineProperty(template.prototype, 'objectId', {
            get: function () {
                return this.generateId();
            },
            enumerable: true,
            configurable: true
        })


        Object.defineProperty(template.prototype, 'objectTemplateName', {
            get: function () {
                return (this.constructor && this.constructor.name) || template.__name__;
            },
            enumerable: true,
            configurable: true
        })

        /**
         * Can generate insert sql for the give object
         * @returns {string}
         */
         template.prototype.getInsertScript = function (): string {
            let persistObjectTemplate = this.__objectTemplate__ || self;
            var dbType = persistObjectTemplate.getDB(persistObjectTemplate.getDBAlias(template.__collection__)).type;
            if (dbType == PersistObjectTemplate.DB_Mongo) {
                throw new Error('Not supported this functionality for MongoDb.');
            }

            return persistObjectTemplate.getInsertScript(this);
        };

        //persistorDelete will only support new API calls.
        template.prototype.persistorDelete = template.prototype.deleteV2 = async function (options) {
            const functionName = 'persistorDelete';
            var time = getTime();
            var persistObjectTemplate = this.__objectTemplate__ || self;
            persistObjectTemplate._validateParams(options, 'persistSchema', this.__template__);

            options = options || {};
            var txn = persistObjectTemplate.getCurrentOrDefaultTransaction(options.transaction);
            var cascade = options.cascade;
            var logger = options.logger || persistObjectTemplate.logger;
            logger.debug({
                module: moduleName,
                function: functionName,
                category: 'milestone',
                data: {
                    template: this.__template__.__name__, 
                    id: this.__id__ 
                }
            });

            var promise;
            if (!txn) {
                promise = this.__template__.deleteFromPersistWithId(this._id, null, logger)
            }
            else {
                promise = Promise.resolve(persistObjectTemplate.setAsDeleted(this, txn, false, !cascade, logger));
            }

            const name = 'persistorDelete';
            return promise.then(result => {
                getStats(time, template.__name__, name);
                return result;
            })
            // @TODO: need to handle errors with log

                .catch(e => {
                    getStats(time, template.__name__, name, true);
                    throw e;
                });
        }

        // Add persistors to foreign key references
        if (template.defineProperties && typeof (template._injectProperties) == 'function')
            template._injectProperties();

    };
    /**
     * PUBLIC INTERFACE FOR objectTemplate
     */

    /**
     * Begin a transaction that will ultimately be ended with end. It is passed into setDirty so
     * dirty objects can be accumulated.  Does not actually start a knex transaction until end
     * @param {bool} notDefault used for marking the transaction created as the default transaction
     * @returns {object} returns transaction object
     */
    PersistObjectTemplate.begin = function (notDefault) {
        var txn = { id: new Date().getTime(), dirtyObjects: {}, savedObjects: {}, touchObjects: {}, deletedObjects: {}, queriesToNotify: {}};
        if (!notDefault) {
            this.currentTransaction = txn;
        }
        return txn;
    };


    PersistObjectTemplate.end = function (persistorTransaction, logger) {
        persistorTransaction = persistorTransaction || this.currentTransaction;
        logger = logger || PersistObjectTemplate.logger;
        return PersistObjectTemplate.commit({ transaction: persistorTransaction, logger: logger });
    };
    /**
     * Set the object dirty along with all descendant objects in the logical "document"
     *
     * @param {supertype} obj objecttempate
     * @param {object} txn persistobjecttemplate transaction object
     * @param {bool} onlyIfChanged mark dirty only if changed
     * @param {bool} noCascade, avoids loading children
     * @param {object} logger objecttemplate logger
     */
    PersistObjectTemplate.setDirty = function (obj, txn, onlyIfChanged, noCascade, logger) {
        const functionName = 'setDirty';
        var topObject;
        // Get array references too
        if (onlyIfChanged && this.MarkChangedArrayReferences) {
            this.MarkChangedArrayReferences();
        }

        txn = txn || this.currentTransaction;

        if (!obj || !obj.__template__.__schema__) {
            return;
        }

        // Use the current transaction if none passed
        txn = txn || PersistObjectTemplate.currentTransaction || null;

        if (!onlyIfChanged || obj.__changed__) {
            (txn ? txn.dirtyObjects : this.dirtyObjects)[obj.__id__] = obj;
        }

        if (txn && obj.__template__.__schema__.cascadeSave && !noCascade) {
            // Potentially cascade to set other related objects as dirty
            topObject = PersistObjectTemplate.getTopObject(obj);
            if (!topObject) {
                (logger || this.logger).error({ 
                    module: moduleName,
                    function: functionName,
                    category: 'milestone',
                    message: 'Warning: setDirty called for ' + obj.__id__ + ' which is an orphan'
                });
            }
            if (topObject && topObject.__template__.__schema__.cascadeSave) {
                PersistObjectTemplate.enumerateDocumentObjects(PersistObjectTemplate.getTopObject(obj), function (obj) {
                    if (!onlyIfChanged || obj.__changed__) {
                        (txn ? txn.dirtyObjects : this.dirtyObjects)[obj.__id__] = obj;
                        // Touch the top object if required so that if it will be modified and can be refereshed if needed
                        if (txn && txn.touchTop && obj.__template__.__schema__) {
                            var topObject = PersistObjectTemplate.getTopObject(obj);
                            if (topObject) {
                                txn.touchObjects[topObject.__id__] = topObject;
                            }
                        }

                    }
                }.bind(this));
            }
        }
        if (txn && txn.touchTop && obj.__template__.__schema__) {
            topObject = PersistObjectTemplate.getTopObject(obj);
            if (topObject) {
                txn.touchObjects[topObject.__id__] = topObject;
            }
        }
    };

    PersistObjectTemplate.setAsDeleted = function (obj, txn, onlyIfChanged) {
        // Get array references too
        if (onlyIfChanged && this.MarkChangedArrayReferences) {
            this.MarkChangedArrayReferences();
        }

        txn = txn || this.__defaultTransaction__;

        if (!obj || !obj.__template__.__schema__) {
            return;
        }

        if (!onlyIfChanged || obj.__deleted__) {
            (txn ? txn.deletedObjects : this.deletedObjects)[obj.__id__] = obj;
        }

        //Do we need to support cascase delete, if so we need to check the dependencies and delete them.
    };

    PersistObjectTemplate.saveAll = async function (txn, logger) {
        var time = getTime();
        var promises = [];
        var somethingSaved = false;
        var dirtyObjects = txn ? txn.dirtyObjects : this.dirtyObjects;
        for (var id in dirtyObjects) {
            (function () {
                var obj = dirtyObjects[id];
                delete dirtyObjects[obj.__id__];
                promises.push(obj.persistSave(txn, logger).then(function () {
                    PersistObjectTemplate.saved(obj, txn);
                    somethingSaved = true;
                }));
            })();
        }

        return Promise.all(promises)
            .then(function () {
                if (!somethingSaved && txn && txn.postSave) {
                    txn.postSave(txn, logger);
                    this.dirtyObjects = {};
                    this.savedObjects = {};
                }
                if (somethingSaved) {
                    return this.saveAll(txn)
                } else {
                    return true;
                }
            }.bind(this))
            .then(result => {
                getStats(time, 'PersistObjectTemplate', 'saveAll');
                return result;
            })
            // @TODO: need to handle errors with log
            .catch(e => {
                getStats(time, 'PersistObjectTemplate', 'saveAll', true);
                throw e;
            });
    }

    /**
     * Set a data base to be used
     * @param {knex|mongoclient} db - the native client objects used
     * @param {knex|mongo} type - the type which is defined in index.js
     * @param {pg|mongo|__default} alias - An alias that can be used in the schema to specify the database at a table level
     */
    PersistObjectTemplate.setDB = function (db, type, alias) {
        type = type || PersistObjectTemplate.DB_Mongo;
        alias = alias || '__default__';
        this._db = this._db || {};
        this._db[alias] = { connection: db, type: type }
    };

    /**
     * hook to pass in remote doc configurations and place them onto the base object template.
     *
     * @param {remoteDocConnectionOptions} options - enable our remote
     * object storage functionality. if enabled, config
     */
    PersistObjectTemplate.setRemoteDocConnection = function (options: RemoteDocConnectionOptions): void {
        this.bucketName = options.persistorBucketName;
        this.environment = options.persistorRemoteDocEnvironment;
        this.remoteDocHostURL = options.persistorRemoteDocHostURL
    };

    /**
     * retrieve a PLain Old Javascript Object given a query
     * @param {SuperType} template - template to load
     * @param {json|function} query - can pass either mongo style queries or callbacks to add knex calls..
     * @param {json} options - sort, limit, and offset options
     * @param {ObjectTemplate.logger} logger - objecttemplate logger
     * @returns {*}
     */
    PersistObjectTemplate.getPOJOFromQuery = async function (template, query, options, logger) {
        var dbType = PersistObjectTemplate.getDB(PersistObjectTemplate.getDBAlias(template.__collection__)).type;
        var prefix = PersistObjectTemplate.dealias(template.__collection__);
        return dbType == PersistObjectTemplate.DB_Mongo ?
            PersistObjectTemplate.getPOJOFromMongoQuery(template, query, options, logger) :
            PersistObjectTemplate.getPOJOsFromKnexQuery(template, [], query, options, undefined, logger).then(function (pojos) {
                pojos.forEach(function (pojo) {
                    _.map(pojo, function (_val, prop) {
                        if (prop.match(RegExp('^' + prefix + '___'))) {
                            pojo[prop.replace(RegExp('^' + prefix + '___'), '')] = pojo[prop];
                            delete pojo[prop];
                        }
                    });
                });
                return pojos;
            });
    }

    PersistObjectTemplate.beginTransaction = function (): PersistorTransaction {
        return {
            id: new Date().getTime(),
            dirtyObjects: {},
            savedObjects: {},
            touchObjects: {},
            deletedObjects: {},
            remoteObjects: new Map(),
            deleteQueries: {},
            queriesToNotify: {}
        };
    };

    PersistObjectTemplate.beginDefaultTransaction = function (): PersistorTransaction {
        const defaultTransaction: PersistorTransaction = {
            id: new Date().getTime(),
            dirtyObjects: {},
            savedObjects: {},
            touchObjects: {},
            deletedObjects: {},
            remoteObjects: new Map(),
            deleteQueries: {},
            queriesToNotify: {}
        };

        this.__defaultTransaction__ = defaultTransaction;
        return this.__defaultTransaction__;
    };

    PersistObjectTemplate.commit = async function commit(options) {
        var time = getTime();
        PersistObjectTemplate._validateParams(options, 'commitSchema');
        options = options || {};
        var logger = options.logger || PersistObjectTemplate.logger;

        //var dbType = PersistObjectTemplate.getDB(PersistObjectTemplate.getDBAlias(template.__collection__)).type;
        //var prefix = PersistObjectTemplate.dealias(template.__collection__);
        var persistorTransaction = options.transaction || this.__defaultTransaction__;

        var promise;
        if (PersistObjectTemplate.DB_Knex) {
            promise = PersistObjectTemplate._commitKnex(persistorTransaction, logger, options.notifyChanges, options.notifyQueries);
        }

        const name = 'commit';
        return promise.then(result => {
            getStats(time, 'PersistObjectTemplate', name);
            return result;
        })
        // @TODO: need to handle errors with log
            .catch(e => {
                getStats(time, 'PersistObjectTemplate', name, true);
                throw e;
            });
    };

    /**
     * Mostly used for unit testing.  Does a knex connect, schema setup and injects templates
     * @param {object} config knex connection
     * @param {JSON} schema data model definitions
     * @returns {*}
     */
    PersistObjectTemplate.connect = function (config, schema) {
        var knex = require('knex');
        var connection = knex(config);
        this.setDB(connection, this.DB_Knex, config.client);
        this.setRemoteDocConnection(config);
        this.setSchema(schema);
        this.performInjections(); // Normally done by getTemplates
        return connection;
    };

    /**
     * Mostly used for unit testing.  Drops all tables for templates that have a schema
     * @returns {*|Array}
     */
    PersistObjectTemplate.dropAllTables = function () {
        return this.onAllTables(function (template) {
            return this.dropKnexTable(template);
        }.bind(this));
    }

    /**
     * Mostly used for unit testing.  Synchronize all tables for templates that have a schema
     * @returns {*|Array}
     */
    PersistObjectTemplate.syncAllTables = function () {
        return this.onAllTables(function (template) {
            return this.synchronizeKnexTableFromTemplate(template);
        }.bind(this));
    }
    /**
     * Mostly used for unit testing.  Synchronize all tables for templates that have a schema
     * @param {string} action common actions
     * @param {string} concurrency #parallel
     * @returns {*|Array}
     */
    PersistObjectTemplate.onAllTables = function (action, concurrency) {
        var templates = [];
        _.each(this.__dictionary__, drop);
        function drop(template) {
            if (template.__schema__ && (!template.__schema__.documentOf || !template.__schema__.documentOf.match(/not persistent/i))) {
                templates.push(template);
            }
        }
        return Promise.map(templates, action, { concurrency: concurrency || 1 });
    }

};
