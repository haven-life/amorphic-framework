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

module.exports = function (PersistObjectTemplate, baseClassForPersist) {

    var Q = require('q');
    var _ = require('underscore');

    /**
     * PUBLIC INTERFACE FOR OBJECTS
     */

    PersistObjectTemplate._injectIntoObject = function (object)
    {
        baseClassForPersist._injectIntoObject(object);
        var self = this;

        object.persistSave = function (txn)
        {
            var dbType = PersistObjectTemplate.getDB(PersistObjectTemplate.getDBAlias(object.__template__.__collection__)).type;
            return dbType == PersistObjectTemplate.DB_Mongo ?
                PersistObjectTemplate.persistSaveMongo(object)
                    .then (function (obj) {
                    return Q(obj._id.toString())
                })
                : PersistObjectTemplate.persistSaveKnex(object, txn)
                .then (function (obj) {
                return Q(obj._id.toString());
            });
        };

        object.persistDelete = function () {
            return this.__template__.deleteFromPersistWithId(this._id)
        };

        object.setDirty = function (txn) {
            this.__dirty__ = true;
            PersistObjectTemplate.setDirty(this, txn);
        };
        object.saved = function (txn) {
            delete this['__dirty__'];
            PersistObjectTemplate.saved(this,txn);
        };
        object.isDirty = function () {
            return this['__dirty__'] ? true : false
        };

        object.fetchProperty = function (prop, cascade, queryOptions, isTransient, idMap)
        {
            idMap = idMap || {};
            var properties = {}
            var objectProperties = this.__template__.getProperties();
            properties[prop] = objectProperties[prop];
            if (queryOptions)
                properties[prop].queryOptions = queryOptions;
            cascadeTop = {};
            cascadeTop[prop] = cascade || true;

            var dbType = PersistObjectTemplate.getDB(PersistObjectTemplate.getDBAlias(object.__template__.__collection__)).type;
            return dbType == PersistObjectTemplate.DB_Mongo ?
                self.getTemplateFromMongoPOJO(this, this.__template__, null, null, idMap, cascadeTop, this, properties, isTransient) :
                self.getTemplateFromKnexPOJO(this, this.__template__, null, null, idMap, cascadeTop, this, properties, isTransient);

        };

        object.fetch = function (cascade, isTransient, idMap)
        {
            idMap = idMap || {};

            var properties = {}
            var objectProperties = this.__template__.getProperties();
            for (var prop in cascade)
                properties[prop] = objectProperties[prop];
            var dbType = PersistObjectTemplate.getDB(PersistObjectTemplate.getDBAlias(object.__template__.__collection__)).type;
            return dbType == PersistObjectTemplate.DB_Mongo ?
                self.getTemplateFromMongoPOJO(this, this.__template__, null, null, idMap, cascade, this, properties, isTransient) :
                self.getTemplateFromKnexPOJO(this, this.__template__, null, idMap, cascade, isTransient, null, this, properties);
        };
        /*
         PersistObjectTemplate.getTemplateFromMongoPOJO = function (pojo, template, promises, defineProperty, idMap, cascade, establishedObj, specificProperties, isTransient)
         */
    };
    /**
     * PUBLIC INTERFACE FOR TEMPLATES
     */
    PersistObjectTemplate._injectIntoTemplate = function (template)
    {
        if(!this.schemaVerified)
            this._verifySchema();
        this.schemaVerified = true;

        // Process subclasses that didn't have schema entries
        var parent = template.__parent__;
        while(!template.__schema__ && parent)
            if (parent.__schema__) {
                template.__schema__ = parent.__schema__;
                template.__collection__ = parent.__collection__;
                template.__topTemplate = parent.__topTemplate__;
                parent = null;
            } else
                parent = parent.__parent__;


        baseClassForPersist._injectIntoTemplate(template);

        /**
         * Return a single instance of an object of this class given an id
         *
         * @param id
         */
        template.getFromPersistWithId = function(id, cascade, isTransient, idMap) {
            var dbType = PersistObjectTemplate.getDB(PersistObjectTemplate.getDBAlias(template.__collection__)).type;
            return dbType == PersistObjectTemplate.DB_Mongo ?
                PersistObjectTemplate.getFromPersistWithMongoId(template, id, cascade, isTransient, idMap) :
                PersistObjectTemplate.getFromPersistWithKnexId(template, id, cascade, isTransient, idMap)
        };

        /**
         * Return an array of objects of this class given a json query
         *
         * @param query
         */
        template.getFromPersistWithQuery = function(query, cascade, start, limit, isTransient, idMap, options) {
            var dbType = PersistObjectTemplate.getDB(PersistObjectTemplate.getDBAlias(template.__collection__)).type;
            return dbType == PersistObjectTemplate.DB_Mongo ?
            PersistObjectTemplate.getFromPersistWithMongoQuery(template, query, cascade, start, limit, isTransient, idMap, options) :
            PersistObjectTemplate.getFromPersistWithKnexQuery(template, query, cascade, start, limit, isTransient, idMap, options)
        };

        /**
         * Delete objects given a json query
         *
         * @param query
         */
        template.deleteFromPersistWithQuery = function(query) {
            var dbType = PersistObjectTemplate.getDB(PersistObjectTemplate.getDBAlias(template.__collection__)).type;
            return dbType == PersistObjectTemplate.DB_Mongo ?
                PersistObjectTemplate.deleteFromPersistWithMongoQuery(template, query) :
                PersistObjectTemplate.deleteFromPersistWithKnexId(template, query);
        };

        /**
         * Delete objects given a json query
         *
         * @param id
         */
        template.deleteFromPersistWithId = function(id) {
            var dbType = PersistObjectTemplate.getDB(PersistObjectTemplate.getDBAlias(template.__collection__)).type;
            return dbType == PersistObjectTemplate.DB_Mongo ?
                PersistObjectTemplate.deleteFromPersistWithMongoId(template, id) :
                PersistObjectTemplate.deleteFromPersistWithKnexId(template, id);
        };

        /**
         * Return count of objects of this class given a json query
         *
         * @param query
         */
        template.countFromPersistWithQuery = function(query) {
            var dbType = PersistObjectTemplate.getDB(PersistObjectTemplate.getDBAlias(template.__collection__)).type;
            return dbType == PersistObjectTemplate.DB_Mongo ?
                PersistObjectTemplate.countFromMongoQuery(template, query) :
                PersistObjectTemplate.countFromKnexQuery(template, query);
        };


        // Add persistors to foreign key references

        var props = template.defineProperties;
        for (var prop in props) {
            var defineProperty = props[prop];
            var type = defineProperty.type;
            var collection = template.__collection__;
            var of = defineProperty.of;
            var refType = of || type;
            if (refType && refType.__schema__) {
                var isCrossDocRef = this.isCrossDocRef(template, prop, defineProperty)
                if (isCrossDocRef || defineProperty.autoFetch) {
                    (function () {
                        var closureProp = prop;
                        var closureFetch = defineProperty.fetch ? defineProperty.fetch : {};
                        var closureQueryOptions = defineProperty.queryOptions ? defineProperty.queryOptions : {};
                        var toClient = !(defineProperty.isLocal || (defineProperty.toClient === false))
                        if (!props[closureProp + 'Persistor'])
                            template.createProperty(closureProp + 'Persistor', {type: Object, toClient: toClient,
                                toServer: false, persist: false, value: {isFetched: false, isFetching: false}});
                        if (!template.prototype[closureProp + 'Fetch'])
                            template.createProperty(closureProp + 'Fetch', {on: "server", body: function (start, limit)
                            {
                                if (typeof(start) != 'undefined')
                                    closureQueryOptions['skip'] = start;
                                if (typeof(limit) != 'undefined')
                                    closureQueryOptions['limit'] = limit;
                                return this.fetchProperty(closureProp, closureFetch, closureQueryOptions);
                            }});
                    })();
                }
            }
        }
    }
    /**
     * PUBLIC INTERFACE FOR OBJECTTEMPLATE
     */

    /**
     * Begin a transaction that will ultimately be ended with end. It is passed into setDirty so
     * dirty objects can be accumulated.  Does not actually start a knex transaction until end
     * @returns {{dirtyObjects: Array}}
     */
    PersistObjectTemplate.begin = function () {
        return {dirtyObjects: {}};
    }

    /**
     * Does a saveAll on the set of dirty objects in the txn which was obtained from begin
     * You may catch the error or look for a reject.  T
     * @param txn
     * @param callback = a callback that is passed a knex txn that can be used to do things like delete
     * @returns {*|promise}
     */
    PersistObjectTemplate.end = function (txn, callback) {
        var deferred = Q.defer();
        var knex = _.findWhere(this._db, {type: PersistObjectTemplate.DB_PG}).connection;
        knex.transaction(function(knexTransaction) {
            (callback ? callback.call(null, knexTransaction) : Q())
                .then(function () {
                    txn.knex = knexTransaction;
                    this.saveAll(txn)
                        .then(function() {
                            knexTransaction.commit();
                            deferred.resolve(true);
                        })
                        .catch(function(e) {
                            knexTransaction.rollback();
                            deferred.reject(e);
                        })
                }.bind(this))
                .catch(function(e) {
                    knexTransaction.rollback();
                    deferred.reject(e);
                })
        }.bind(this));
        return deferred.promise;
    }
    PersistObjectTemplate.setDirty = function (obj, txn) {
        (txn ? txn.dirtyObjects : this.dirtyObjects)[obj.__id__] = obj;
    }

    PersistObjectTemplate.saveAll = function (txn) {
        var promises = [];
        var somethingSaved = false;
        var dirtyObjects = txn ? txn.dirtyObjects : this.dirtyObjects;
        for (var id in dirtyObjects) {
            var obj = dirtyObjects[id];
            promises.push(obj.persistSave(txn).then(function () {
                obj.saved(txn);
                somethingSaved = true;
                return Q()
            }));
        };
        return Q.all(promises)
            .then(function () {
                return somethingSaved ? this.saveAll(txn) : true;
            }.bind (this));
    }

    /**
     * Set a data base to be used
     * @param db - the connection
     * @param type - the type which is defined in index.js
     * @param alias - An alias that can be used in the schema to specify the database at a table level
     */
    PersistObjectTemplate.setDB = function (db, type, alias) {
        type = type || PersistObjectTemplate.DB_Mongo;
        alias = alias || '__default__';
        this._db = this._db || {};
        this._db[alias] = {connection: db, type: type}
    }


}