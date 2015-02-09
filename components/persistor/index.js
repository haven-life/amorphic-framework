/* Copyright 2012-2013 Sam Elsamman
 Permission is hereby granted, free of charge, to any person obtaining
 a copy of this software and associated documentation files (the
 "Software"), to deal in the Software without restriction, including
 without limitation the rights to use, copy, modify, merge, publish,
 distribute, sublicense, and/or sell copies of the Software, and to
 permit persons to whom the Software is furnished to do so, subject to
 the following conditions:

 The above copyright notice and this permission notice shall be
 included in all copies or substantial portions of the Software.

 THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
 EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
 MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
 NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE
 LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION
 OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION
 WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */

/**
 *
 * persistObjectTemplate is a sublclass for remoteObjectTemplate which allows objects to be
 * persisted in some data store.  The key functions which can only be executed on the server are:
 *
 * - Save an object to a document / table which will either
 *   - create a new document
 *   - update and existing document
 *
 * - Retrieve an object from persistence given either
 *   - A primary key (object id)
 *   - A search criteria
 *   - A primary key reference driven by a relationship with another object
 *
 * All objects have unique ids dispensed by remoteObjectTemplate and these are the
 * id's that are exposed to the client.  The database unique id's are never
 * transported to or from the client to ensure they are not manipulated.
 *
 * The save operation will synchronize a set of related objects.  It does this by
 * determining whether the related objects are dirty, new or removed and performs
 * all appropriate key management and save operations.
 *
 */

/**
 *
 * @param objectTemplate
 * @param RemoteObjectTemplate
 * @param baseClassForPersist
 */
var nextId = 1;
var promiseNumber = 1;

module.exports = function (ObjectTemplate, RemoteObjectTemplate, baseClassForPersist)
{
    var Q = require('q');

    /**
     *
     * @type {PersistObjectTemplate}
     */
    var PersistObjectTemplate = baseClassForPersist._createObject();
    PersistObjectTemplate.__id__ = nextId++;
    PersistObjectTemplate._superClass = baseClassForPersist;

    PersistObjectTemplate.debug = function (message) {
    }

    PersistObjectTemplate.setDBURI = function (uri) {
        this._dbURI = uri;
    }
    PersistObjectTemplate.setDB = function (db) {
        this._db = db;
    }
    PersistObjectTemplate.setSchema = function (schema) {
        this._schema = schema;
    }

    PersistObjectTemplate._injectIntoObject = function (object)
    {
        baseClassForPersist._injectIntoObject(object);
        var self = this;

        object.persistSave = function ()
        {
            return PersistObjectTemplate.persistSave(object)
                .then (function (obj) {
                return Q.fcall(function() {return obj._id.toString()});
            });
        };

        object.persistDelete = function () {
            return PersistObjectTemplate.deleteFromQuery(object.__template__, {_id: new ObjectID(object._id.toString())})
        };

        object.setDirty = function () {
            this.__dirty__ = true;
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

            return self.fromDBPOJO(this, this.__template__, null, null, idMap, cascadeTop, this, properties, isTransient);
        };

        object.fetch = function (cascade, isTransient, idMap)
        {
            idMap = idMap || {};

            var properties = {}
            var objectProperties = this.__template__.getProperties();
            for (var prop in cascade)
                properties[prop] = objectProperties[prop];

            return self.fromDBPOJO(this, this.__template__, null, null, idMap, cascade, this, properties, isTransient);
        };
    };

    /**
     * Run through the schema entries and setup these properites on templates
     *  __schema__: the schema for each template
     *  __collection__: the name of the Mongo Collection
     *  __topTemplate__: for a template that represents a subDocument the template that is primary for that colleciton
     * @private
     */
    PersistObjectTemplate._verifySchema = function ()
    {
        var schema = this._schema;

        // Helper to get the base class walking the __parent__ chain
        function getBaseClass(template) {
            while (template.__parent__)
                template = template.__parent__
            return template;
        }

        // Establish a hash of collections keyed by collection name that has the main template for the collection
        var collections = {};
        for (var templateName in schema) {
            var template = this.getTemplateByName(templateName);
            if (template && schema[templateName].documentOf) {
                if (collections[schema[templateName].documentOf] &&
                    collections[schema[templateName].documentOf] != getBaseClass(template))
                    throw new Error(templateName + " and " + collections[schema[templateName].documentOf]._name +
                        " are both defined to be top documents of " + schema[templateName].documentOf);
                collections[schema[templateName].documentOf] = getBaseClass(template);
            }
        }

        // For any templates with subdocuments fill in the __topTemplate__
        for (var templateName in schema) {
            var template = this.getTemplateByName(templateName)
            if (template && schema[templateName].subDocumentOf)
                template.__topTemplate__ = collections[schema[templateName].subDocumentOf];
        }

        // Fill in the __schema__ and __collection properties
        for (var templateName in this._schema) {
            var template = this.__dictionary__[templateName];
            if (template) {
                template.__schema__ = this._schema[template.__name__];
                template.__collection__ = template.__schema__ ? template.__schema__.documentOf || template.__schema__.subDocumentOf : null;
                var parentTemplate = template.__parent__;
                while (parentTemplate) {
                    var schema = parentTemplate.__schema__;
                    if (schema && schema.children) {
                        if (!template.__schema__)
                            template.__schema__ = {};
                        if (!template.__schema__.children)
                            template.__schema__.children = [];
                        for (var key in schema.children)
                            template.__schema__.children[key] = schema.children[key];
                    }
                    if (schema && schema.parents) {
                        if (!template.__schema__)
                            template.__schema__ = {};
                        if (!template.__schema__.parents)
                            template.__schema__.parents = [];
                        for (var key in schema.parents)
                            template.__schema__.parents[key] = schema.parents[key];
                    }
                    parentTemplate = parentTemplate.__parent__;
                }
            }
        }

    }

    /* Inject some functions into the template */
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
            return PersistObjectTemplate.getFromPersistWithId(template, id, cascade, isTransient, idMap)
        };

        /**
         * Return an array of objects of this class given a json query
         *
         * @param query
         */
        template.getFromPersistWithQuery = function(query, cascade, start, limit, isTransient, idMap, options) {
            return PersistObjectTemplate.getFromPersistWithQuery(template, query, cascade, start, limit, isTransient, idMap, options)
        };

        /**
         * Delete objects given a json query
         *
         * @param query
         */
        template.deleteFromPersistWithQuery = function(query) {
            return PersistObjectTemplate.deleteFromQuery(template, query)
        };

        /**
         * Return count of objects of this class given a json query
         *
         * @param query
         */
        template.countFromPersistWithQuery = function(query) {
            return PersistObjectTemplate.countFromQuery(template, query)
        };

        /**
         * Return an array of distinct values for a field given a json query
         *
         * @param query
         */
        template.distinctFromPersistWithQuery = function(field, query) {
            return PersistObjectTemplate.distinctFromQuery(template, field, query)
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
                if (isCrossDocRef) {
                    (function () {
                        var closureProp = prop;
                        var closureFetch = defineProperty.fetch ? defineProperty.fetch : {};
                        var closureQueryOptions = defineProperty.queryOptions ? defineProperty.queryOptions : {};
                        if (!props[closureProp + 'Persistor'])
                            template.createProperty(closureProp + 'Persistor', {type: Object, toServer: false, persist: false, value: {isFetched: false, isFetching: false}});
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
     * Remove object from a collection/table, optionally removing
     * any dependent objects or references
     *
     * @param options
     */
    PersistObjectTemplate.deleteFromPersistWithQuery = function(template, query)
    {
        return this.getFromPersistWithQuery(template, query).then (function (obj) {
            return obj.persistDelete();
        });
    }

    PersistObjectTemplate.getFromPersistWithQuery = function (template, query, cascade, skip, limit, isTransient, idMap, options)
    {
        idMap = idMap || {};
        options = options || {};
        if (typeof(skip) != 'undefined')
            options.skip = skip * 1;
        if (typeof(limit) != 'undefined')
            options.limit = limit * 1;
        if (template.__schema__.subDocumentOf) {
            var subQuery = this.createSubDocQuery(query, template)
            return this.getPOJOFromQuery(template, subQuery.query, options, idMap).then(function(pojos) {
                var promises = [];
                var results = [];
                for (var ix = 0; ix < pojos.length; ++ix) {
                    var subPojos = this.getPOJOSFromPaths(template, subQuery.paths, pojos[ix], query)
                    for (var jx = 0; jx < subPojos.length; ++jx) {
                        promises.push(this.fromDBPOJO(subPojos[jx], template, null, null, idMap, cascade, null, null, isTransient).then(function (pojo) {
                            results.push(pojo);
                        }));
                    }
                }
                return this.resolveRecursivePromises(promises, results);
            }.bind(this));
        } else
            return this.getPOJOFromQuery(template, query, options, idMap).then(function(pojos)
            {
                var promises = [];
                var results = [];
                for (var ix = 0; ix < pojos.length; ++ix)
                    (function () {
                        var cix = ix;
                        promises.push(this.fromDBPOJO(pojos[ix], template, null, null, idMap, cascade, null, null, isTransient).then( function (obj) {
                            results[cix] = obj;
                        }))
                    }.bind(this))();
                return this.resolveRecursivePromises(promises, results);

            }.bind(this));
    }

    PersistObjectTemplate.getFromPersistWithId = function (template, id, cascade, isTransient, idMap) {
        var self = this;
        idMap = idMap || {};
        return this.getPOJOFromQuery(template, {_id: new ObjectID(id)}, idMap).then(function(pojos) {
            if (pojos.length > 0)
                return self.fromDBPOJO(pojos[0], template, null, null, idMap, cascade, null, null, isTransient);
            else
                return null;
        });
    }

    /**
     * Enriches a "Plane Old JavaScript Object (POJO)" by creating it using the new Operator
     * so that all prototype information such as functions are created. It will reconstruct
     * references one-to-one and one-two-many by reading them from the database
     *  *
     * @param pojo is the unadorned object
     * @param template is the template used to create the object
     * @return {*} an object via a promise as though it was created with new template()
     */
    PersistObjectTemplate.fromDBPOJO = function (pojo, template, promises, defineProperty, idMap, cascade, establishedObj, specificProperties, isTransient)
    {
        // For recording back refs
        if (!idMap)
            throw "missing idMap on fromDBPOJO";
        var topLevel = false;
        if (!promises) {
            topLevel = true;
            promises = [];
        }

        // Create the new object with correct constructor using embedded ID if ObjectTemplate
        var obj = establishedObj || idMap[pojo._id.toString()] ||
            this._createEmptyObject(template, 'perist-' + pojo._template.replace(/.*:/,'') +
                "-"+ pojo._id.toString(), defineProperty, isTransient);

        if (!obj.__transient__) // Once we find an object that is not transient query as normal for the rest
            isTransient = false;

        var collection = obj.__template__.__collection__;
        var schema = obj.__template__.__schema__;

        var id = null;
        if (pojo._id) { // If object is persistent make sure id is a string and in map
            id = pojo._id;
            obj._id = id.toString();

            // If we have a real value and an array of value store functions, call them
            if (idMap[id.toString()] && idMap[id.toString()] instanceof Array)
                for (var fx = 0; fx < idMap[id.toString()].length; ++fx)
                    idMap[id.toString()][fx].call(null, obj);

            idMap[id.toString()] = obj;
        }
        if (pojo.__version__)
            obj.__version__ = pojo.__version__;

        function copyProps(obj) {
            var newObj = {};
            for (var prop in obj)
                newObj[prop] = obj[prop];
            return newObj;
        }

        // Go through all the properties and transfer them to newly created object
        var props = specificProperties || obj.__template__.getProperties();
        for (var prop in props)
        {
            //if (prop.match(/Persistor$/))
            //    continue;

            var value = pojo[prop];
            var defineProperty = props[prop];
            var type = defineProperty.type;
            var of = defineProperty.of;
            var isCrossDocRef = this.isCrossDocRef(obj.__template__, prop, defineProperty);
            var cascadeFetch = (cascade && cascade[prop]) ? cascade[prop] : null;
            var doFetch = defineProperty['fetch'] || cascadeFetch;

            var persistorPropertyName = prop + "Persistor";
            obj[persistorPropertyName] = obj[persistorPropertyName] || {count: 0};

            // Make sure this is property is persistent and that it has a value.  We have to skip
            // undefined values in case a new property is added so it can retain it's default value
            //@@@ Not sure this should test for null as you should be able to store null values
            if (!this._persistProperty(defineProperty) || !defineProperty.enumerable ||
                (!isCrossDocRef && (typeof(value) == "undefined" || value == null)))
                continue;
            if (!type)
                throw new Error(obj.__template__.__name__ + "." + prop + " has no type decleration");

            if (type == Array)
            {
                // If type of pojo
                if (!defineProperty.of.__collection__)
                    obj[prop] = value;
                // If this is in the same entity just copy over
                else if (!isCrossDocRef)
                {
                    obj[prop] = [];
                    for (var ix = 0; ix < pojo[prop].length; ++ix)
                    {
                        // Did we get a value ?
                        if (pojo[prop][ix]) {

                            // is it a cached id reference
                            if (typeof(pojo[prop][ix]) == "string")
                            {
                                // If nothing in the map create an array
                                if (!idMap[pojo[prop][ix]])
                                    idMap[pojo[prop][ix]] = [];

                                // If an array of value store functions add ours to the list
                                if (idMap[pojo[prop][ix]] instanceof Array)
                                    (function () {
                                        var closureIx = ix;
                                        var closureProp = prop;
                                        idMap[pojo[prop][ix]].push(function (value) {
                                            pojo[closureProp][closureIx] = value;
                                        });
                                    })()
                                else
                                    obj[prop][ix] = idMap[pojo[prop][ix]];
                            } else {
                                var options = defineProperty.queryOptions || {};
                                cascadeFetchProp = this.processCascade(query, options, cascadeFetch, null, defineProperty.fetch);
                                obj[prop][ix] = idMap[pojo[prop][ix]._id.toString()] ||
                                    this.fromDBPOJO(pojo[prop][ix], defineProperty.of, promises, defineProperty, idMap,
                                        cascadeFetchProp, null, null, isTransient);
                            }
                        } else
                            obj[prop][ix] = null;
                    }
                    /*
                     obj[prop][ix] = pojo[prop][ix] ?
                     (typeof(pojo[prop][ix]) == "string" ?
                     idMap[pojo[prop][ix]] :
                     this.fromDBPOJO(pojo[prop][ix], defineProperty.of, promises, defineProperty, idMap))
                     : null;
                     */
                }
                // Otherwise this is a database reference and we have to find the collection of kids
                else {
                    var self = this;
                    (function () {
                        var closurePersistorProp = persistorPropertyName;
                        var closureOf = defineProperty.of;
                        var closureDefineProperty = defineProperty;
                        var closureIsSubDoc = !!closureDefineProperty.of.__schema__.subDocumentOf;
                        if (closureIsSubDoc) {
                            obj[closurePersistorProp] = copyProps(obj[closurePersistorProp]);
                        } else
                            promises.push(self.countFromQuery(closureOf, query).then( function(count) {
                                obj[closurePersistorProp].count = count;
                                obj[closurePersistorProp] = copyProps(obj[closurePersistorProp]);
                            }));
                    })();
                    if (doFetch)
                    {
                        var query = {};
                        var options = {};
                        if (id) {
                            if(!schema || !schema.children || !schema.children[prop])
                                throw  new Error(obj.__template__.__name__ + "." + prop + " is missing a children schema entry");
                            var foreignKey = schema.children[prop].id;
                            query[foreignKey] = id.toString().match(/:/) ? id.toString() : new ObjectID(id.toString());
                        }
                        //this.debug("fetching " + prop + " cascading " + JSON.stringify(cascadeFetch) + " " + JSON.stringify(query) + " " + JSON.stringify(options));
                        var self = this;
                        (function () {
                            var closureProp = prop;
                            var closureOf = defineProperty.of;
                            var closurePersistorProp = persistorPropertyName
                            var closureCascade = this.processCascade(query, options, cascadeFetch,
                                (schema && schema.children) ? schema.children[prop].fetch : null, defineProperty.fetch);
                            var closureDefineProperty = defineProperty;
                            var closureIsSubDoc = !!closureDefineProperty.of.__schema__.subDocumentOf;
                            obj[closureProp] = [];

                            // For subdocs we have to build up a query to fetch all docs with these little buggers
                            if (closureIsSubDoc) {
                                var closureOrigQuery = query;
                                var results = this.createSubDocQuery(query, closureDefineProperty.of);
                                query = results.query;
                                var closurePaths = results.paths;
                            }
                            promises.push(self.getPOJOFromQuery(defineProperty.of, query, options, idMap).then( function(pojos)
                            {
                                // For subdocs we have to fish them out of the documents making sure the query matches
                                if (closureIsSubDoc) {
                                    obj[closureProp] = [];
                                    for (var ix = 0; ix < pojos.length; ++ix)
                                    {
                                        // Populate the idMap for any references
                                        if (!idMap[pojos[ix]._id.toString()]) {
                                            var topType = self.getTemplateByCollection(closureOf.__collection__);
                                            self.fromDBPOJO(pojos[ix], topType, promises, {type: topType}, idMap, {},
                                                null, null, isTransient)
                                        }
                                        // Grab the actual Pojos since may not be avail from processing parent
                                        var subPojos = self.getPOJOSFromPaths(defineProperty.of, closurePaths, pojos[ix], closureOrigQuery)
                                        for (var jx = 0; jx < subPojos.length; ++jx)
                                            // Take them from cache or fetch them
                                            obj[closureProp].push((closureCascade && idMap[subPojos[jx]._id.toString()]) ||
                                                self.fromDBPOJO(subPojos[jx], closureDefineProperty.of,
                                                    promises, closureDefineProperty, idMap, closureCascade, null, null, isTransient));
                                    }
                                } else
                                    for(var ix = 0; ix < pojos.length; ++ix)
                                    {
                                        // Return cached one over freshly read
                                        obj[closureProp][ix] = idMap[pojos[ix]._id.toString()] ||
                                            self.fromDBPOJO(pojos[ix], closureDefineProperty.of,
                                                promises, closureDefineProperty, idMap, closureCascade, null, null, isTransient)
                                    }
                                obj[closurePersistorProp].isFetched = true;
                                obj[closurePersistorProp].start = options ? options.start || 0 : 0;
                                obj[closurePersistorProp].next = obj[closurePersistorProp].start + pojos.length;
                                obj[closurePersistorProp] = copyProps(obj[closurePersistorProp]);
                                return Q.fcall(function(){return true}); // Say we done
                            }));
                        }.bind(this))();
                    } else
                        obj[persistorPropertyName].isFetched = false;
                    obj[persistorPropertyName] = copyProps(obj[persistorPropertyName]);
                }

            } else if (type.isObjectTemplate)
            {
                // Same collection suck in from idMap if previously referenced or process pojo
                if (type.__collection__ == collection && !isCrossDocRef)
                {
                    // Did we get a value ?
                    if (pojo[prop]) {

                        // is it a cached id reference
                        if (typeof(pojo[prop]) == "string")
                        {
                            // If nothing in the map create an array
                            if (!idMap[pojo[prop]])
                                idMap[pojo[prop]] = [];

                            // If an array of value store functions add ours to the list
                            if (idMap[pojo[prop]] instanceof Array)
                                idMap[pojo[prop]].push(function (value) {
                                    pojo[prop] = value;
                                });
                            else
                                obj[prop] = idMap[pojo[prop]];
                        } else {
                            var options = defineProperty.queryOptions || {};
                            cascadeFetchProp = this.processCascade(query, options, cascadeFetch, null, defineProperty.fetch);

                            obj[prop] = idMap[pojo[prop]._id.toString()] || this.fromDBPOJO(pojo[prop], type, promises,
                                defineProperty, idMap, cascadeFetchProp, null, null, isTransient);
                        }

                    } else

                        obj[prop] = null;

                    /*
                     var newObject = pojo[prop] ? (typeof(pojo[prop]) == "string" ? idMap[pojo[prop]] :
                     this.fromDBPOJO(pojo[prop], type, promises, defineProperty, idMap))	: null;
                     obj[prop] = newObject;
                     */

                } else // Otherwise read from idMap or query for it
                {
                    // Determine the id needed
                    if (!schema || !schema.parents || !schema.parents[prop] || !schema.parents[prop].id)
                        throw  new Error(obj.__template__.__name__ + "." + prop + " is missing a parents schema entry");

                    var foreignKey = schema.parents[prop].id;

                    // ID is in pojo or else it was left in the persistor
                    var foreignId = (pojo[foreignKey] || obj[persistorPropertyName].id || "").toString();

                    // Return copy if already there
                    if (idMap[foreignId]) {
                        obj[prop] = idMap[foreignId];
                        obj[persistorPropertyName].isFetched = true;
                        obj[persistorPropertyName] = copyProps(obj[persistorPropertyName]);
                    } else {
                        if (doFetch) {  // Only fetch ahead if requested
                            obj[prop] = null;
                            if (foreignId) {
                                var query = {_id: new ObjectID(foreignId.replace(/:.*/, ''))};
                                var options = {};
                                //this.debug("fetching " + prop + " cascading " + JSON.stringify(cascadeFetch));
                                var self = this;
                                (function () {
                                    var closureProp = prop;
                                    var closureType = type;
                                    var closurePersistorProp = persistorPropertyName;

                                    var closureCascade = self.processCascade(query, options, cascadeFetch,
                                        (schema && schema.parents) ? schema.parents[prop].fetch : null, defineProperty.fetch);
                                    var closureDefineProperty = defineProperty;
                                    var closureForeignId = foreignId;
                                    var closureIsSubDoc = !!closureDefineProperty.type.__schema__.subDocumentOf;

                                    // Maybe we already fetched it
                                    if (idMap[foreignId]) {
                                        obj[closureProp] = idMap[closureForeignId];
                                        obj[closurePersistorProp].isFetched = true;
                                        obj[closurePersistorProp] = copyProps(obj[closurePersistorProp]);
                                    } else

                                    // Otherwise fetch top level document (which will contain sub-doc if sub-doc)
                                        promises.push(self.getPOJOFromQuery(closureType, query, idMap).then(function(pojos) {

                                            // Assuming the reference is still there
                                            if (pojos.length > 0) {
                                                if (closureIsSubDoc) {
                                                    // Process the document and the sub-document will end up in idMap
                                                    if (!idMap[pojos[0]._id.toString()]) {
                                                        var topType = this.getTemplateByCollection(closureType.__collection__);
                                                        self.fromDBPOJO(pojos[0], topType, promises, {type: topType}, idMap, {},
                                                            null, null, isTransient);
                                                    }
                                                    // Get actual sub-doc since it may not yet be available from processing doc
                                                    var subDocPojo = self.getPOJOSFromPaths(
                                                        closureType, this.createSubDocQuery(null, closureType).paths, pojos[0],
                                                        {_id: closureForeignId}
                                                    )[0];
                                                    // Process actual sub-document to get cascade right and specific sub-doc
                                                    if (!idMap[subDocPojo._id.toString()])
                                                        self.fromDBPOJO(subDocPojo, closureType, promises,
                                                            closureDefineProperty, idMap, closureCascade, null, null, isTransient);
                                                } else
                                                if (!idMap[pojos[0]._id.toString()])
                                                    self.fromDBPOJO(pojos[0], closureType, promises,
                                                        closureDefineProperty, idMap, closureCascade, null, null, isTransient);
                                            }
                                            obj[closureProp] = idMap[closureForeignId];
                                            obj[closurePersistorProp].isFetched = true;
                                            obj[closurePersistorProp] = copyProps(obj[closurePersistorProp]);
                                            return Q(true);
                                        }.bind(self)));
                                })();
                            } else {
                                obj[persistorPropertyName].isFetched = true;
                                obj[persistorPropertyName] = copyProps(obj[persistorPropertyName]);
                            }
                        } else {
                            obj[persistorPropertyName].isFetched = false;
                            obj[persistorPropertyName].id = foreignId;
                            obj[persistorPropertyName] = copyProps(obj[persistorPropertyName]);
                        }
                    }
                }
            } else
            if (typeof(pojo[prop]) != 'undefined') {
                if (type == Date)
                    obj[prop] = pojo[prop] ? new Date(pojo[prop]) : null;
                else
                    obj[prop] = pojo[prop];
            }
        }
        if (topLevel)
            return this.resolveRecursivePromises(promises, obj);
        else
            return obj;
    };
    /**
     * Traverse a pojo returned form MongoDB given a set of paths and locate the sub-document
     * matching it on the original query
     * @param template
     * @param path
     * @param pojo
     * @param query
     * @returns {Array}
     */
    PersistObjectTemplate.getPOJOSFromPaths = function (template, paths, pojo, query)
    {
        function matches(pojo, query)
        {
            var allFound = true;
            for (var prop in query)

                if (prop.toLowerCase() == '$and')
                {
                    var allFoundAnd = true;
                    for (var ix = 0; ix < query[prop].length; ++ix)
                        if (matches(pojo, query[prop][ix])) {allFoundAnd = false}
                    if (allFoundAnd)
                        allFound = false;
                }
                else if (prop.toLowerCase() == '$or')
                {
                    var oneFoundOr = false;
                    for (var ix = 0; ix < query[prop].length; ++ix)
                        if (matches(pojo, query[prop][ix])) {oneFoundOr = true;}
                    oneFound = true;
                    if (!oneFoundOr)
                        allFound = false;
                }
                else if (prop.toLowerCase() == '$in')
                {
                    var isIn = false;
                    for (var ix = 0; ix < query[prop].length; ++ix)
                        if (query[prop][ix] == pojo)
                            isIn = true;
                    if (!isIn)
                        allFound = false;
                }
                else if (prop.toLowerCase() == '$nin')
                {
                    var notIn = true;
                    for (var ix = 0; ix < query[prop].length; ++ix)
                        if (query[prop][ix] == pojo)
                            notIn = false;
                    if (notIn)
                        allFound = false;
                }
                else if (prop.toLowerCase() == '$gt')
                {
                    if(!(pojo > query[prop]))
                        allFound = false;
                }
                else if (prop.toLowerCase() == '$gte')
                {
                    if(!(pojo >= query[prop]))
                        allFound = false;
                }
                else if (prop.toLowerCase() == '$lt')
                {
                    if(!(pojo < query[prop]))
                        allFound = false;
                }
                else if (prop.toLowerCase() == '$lte')
                {
                    if(!(pojo <= query[prop]))
                        allFound = false;
                }
                else if (prop.toLowerCase() == '$ne')
                {
                    if(!(pojo != query[prop]))
                        allFound = false;
                }
                else if (pojo[prop] && typeof(query[prop]) != 'string' && typeof(query[prop]) != 'number'  && !(pojo[prop] instanceof ObjectID))
                {
                    // Sub doc all must be true
                    if (!matches(pojo[prop], query[prop], false))
                        allFound = false;
                } else
                {
                    // Otherwise the value must match
                    if (!pojo[prop] || pojo[prop].toString() != query[prop].toString())
                        allFound = false;
                }

            return allFound
        }
        var pathparts;
        function traverse(ref, level) {
            if (level == pathparts.length) {
                if (matches(ref, query))
                    pojos.push(ref)
                return;
            }
            ref = ref[pathparts[level]];
            if (ref instanceof Array)
                for (var jx = 0; jx < ref.length; ++jx)
                    traverse(ref[jx], level + 1)
            else if (ref)
                traverse(ref, level + 1);
        }
        var pojos = [];
        for (var ix = 0; ix < paths.length; ++ix) {
            pathparts = paths[ix].split(".");
            var ref = pojo;
            traverse(pojo, 0);
        }
        return pojos;
    }
    /**
     * Create a query for a sub document by find the top level document and traversing to all references
     * building up the query object in the process
     * @param targetQuery - the query where this not a sub-document (e.g. key: value)
     * @param targetTemplate - the template to which it applies
     */
    PersistObjectTemplate.createSubDocQuery = function (targetQuery, targetTemplate)
    {
        var topTemplate = targetTemplate.__topTemplate__;

        // Build up an array of string paths that traverses down to the desired template
        var paths = [];
        var templates = {};
        function traverse(template, queryString)
        {
            var props = template.getProperties();
            for (var prop in props) {
                var defineProperty = props[prop];
                var propTemplate = defineProperty.of || defineProperty.type;
                if (propTemplate && propTemplate.__name__ &&
                    !templates[template.__name__ + "." + prop] && propTemplate.__schema__ && propTemplate.__schema__.subDocumentOf) {
                    if (propTemplate == targetTemplate)
                        paths.push(queryString + prop);
                    templates[template.__name__ + "." + prop] = true;
                    traverse(propTemplate, queryString + prop + ".")
                }
            }
        };
        traverse(topTemplate, "");
        // Walk through the expression substituting the path for any refs
        var results = {paths: [], query: {'$or' : []}};
        for (var ix = 0; ix < paths.length; ++ix)
        {
            var path = paths[ix];
            results.paths.push(path);
            var newQuery = {};
            function queryTraverse(newQuery, query)
            {
                for (var prop in query)
                {
                    var newProp = path + "." + prop;
                    var elem = query[prop];
                    if (prop.match(/\$(gt|lt|gte|lte|ne|in)/i))
                        newQuery[prop] = elem;
                    else if (typeof (elem) == 'string' || typeof(elem) == 'number' || elem instanceof ObjectID)
                        newQuery[newProp] = elem;
                    else if (elem instanceof Array) { // Should be for $and and $or
                        newQuery[prop] = [];
                        for (var ix = 0; ix < elem.length; ++ix) {
                            newQuery[prop][ix] = {}
                            queryTraverse(newQuery[prop][ix], elem[ix]);
                        }
                    } else { // this would be for sub-doc exact matches which is unlikely but possible
                        newQuery[newProp] = {}
                        queryTraverse(newQuery[newProp], elem)
                    }
                }
            }
            paths[ix] = {}
            if (targetQuery) {
                queryTraverse(newQuery, targetQuery);
                results.query['$or'].push(newQuery);
                this.debug("subdocument query for " + targetTemplate + '; ' + JSON.stringify(results.query), 'subdoc');
            }
        }
        return results;
    }

    PersistObjectTemplate.resolveRecursivePromises = function(promises, returnValue) {
        var promisesToResolve = promises.length;
        return Q.all(promises).then(function() {
            promises.splice(0, promisesToResolve);
            return promises.length > 0 ? PersistObjectTemplate.resolveRecursivePromises(promises, returnValue)
                : Q.fcall(function(){return returnValue});
        });
    }

    /**
     * Extract query and options out of cascade spec and return new subordinate cascade spec
     *
     * @param parameterFetch
     * @param query to fill in
     * @param options to fill in
     * @param parameterFetch options specified in call
     * @param schemaFetch options specified in schema
     * @param propertyFetch options specified in template
     * @returns {{}}
     */
    PersistObjectTemplate.processCascade = function (query, options, parameterFetch, schemaFetch, propertyFetch) {

        var fetch = {}; // Merge fetch specifications in order of priority

        if (propertyFetch)
            for (var prop in propertyFetch)
                fetch[prop] = propertyFetch[prop];

        if (schemaFetch)
            for (var prop in schemaFetch)
                fetch[prop] = schemaFetch[prop];

        if (parameterFetch)
            for (var prop in parameterFetch)
                fetch[prop] = parameterFetch[prop];

        var newCascade = {}; // Split out options, query and cascading fetch

        for (var option in fetch)
            switch (option)
            {
                case 'fetch':
                    newCascade = fetch.fetch;
                    break;

                case 'query':
                    for (var prop in fetch.query)
                        query[prop] = fetch.query[prop];
                    break;

                default:
                    options[option] = fetch[option];

            }
        return newCascade;
    }

    //
    /**
     * Walk one-to-one links to arrive at the top level document
     * @param obj - subdocument object to start at
     */
    PersistObjectTemplate.getTopObject = function(obj) {
        var idMap = [];
        function traverse(obj) {
            idMap[obj.__id__] = obj;
            if (obj.__template__.__schema__.documentOf)
                return obj;
            var props = obj.__template__.getProperties();
            for (var prop in props) {
                var type = props[prop].type;
                var value = obj[prop];
                if (type && value && value.__id__ && !idMap[value.__id__]) {
                    var traversedObj = traverse(value);
                    if (traversedObj)
                        return traversedObj;
                }
            }
            return false;
        }
        return traverse(obj);
    }
    PersistObjectTemplate.getTemplateByCollection = function (collection) {
        for (var prop in this._schema)
            if (this._schema[prop].documentOf == collection)
                return this.getTemplateByName(prop);
        throw new Error("Cannot find template for " + collection);
    }
    /**
     * Save the object to persistent storage
     *
     * A copy of the object is made which has only the persistent properties
     * and all objects references for objects not stored in the the document
     * replaced by foreign keys.  Arrays of objects not stored in the document
     * are adjusted such that their foreign keys point back to this object.
     * Any related objects stored in other documents are also saved.
     *
     * @param obj  Only required parameter - the object to be saved
     * @param promises
     * @param masterId - if we are here to save sub-documents this is the top level id
     * @param idMap
     * @return {*}
     */
    PersistObjectTemplate.persistSave = function(obj, promises, masterId, idMap) {
         if (!obj.__template__)
            throw new Error("Attempt to save an non-templated Object");
        if (!obj.__template__.__schema__)
            throw  new Error("Schema entry missing for " + obj.__template__.__name__);
        var schema = obj.__template__.__schema__;

        // Trying to save other than top document work your way to the top
        if (!schema.documentOf && !masterId) {
            var originalObj = obj;
            this.debug("Search for top of " + obj.__template__.__name__, 'save');
            var obj = this.getTopObject(obj);
            if (!obj)
                throw new Error("Attempt to save " + originalObj.__template__.__name__ +
                    " which subDocument without necessary parent links to reach top level document");
            schema = obj.__template__.__schema__;
            this.debug("Found top as " + obj.__template__.__name__, 'save');
        }

        var collection = obj.__template__.__collection__;
        var resolvePromises = false;    // whether we resolve all promises
        var savePOJO = false;           // whether we save this entity or just return pojo

        if (!promises) {                // accumulate promises for nested saves
            promises = [];
            resolvePromises = true;
        }

        var topLevel = false;       // top level returns a promise

        if (typeof(obj._id) == "function") {
            var followUp = obj._id;
            obj._id = undefined;
        }
        var isDocumentUpdate = obj._id && typeof(masterId) == 'undefined';
        var id = obj._id ?
            (obj._id.toString().match(/:/) ?  //pseudo-id for sub-documents
                obj._id :
                (obj._id instanceof ObjectID ? obj._id : new ObjectID(obj._id))) :
            this.getDBID(masterId);
        obj._id = id.toString();
        obj.__dirty__ = false;

        if (followUp)
            followUp.call(null, obj._id);

        if (!masterId) {
            savePOJO = true;
            if (typeof(masterId) == 'undefined')
                idMap = {};             // Track circular references
            masterId = id;
        }

        // Eliminate circular references
        if (idMap[id.toString()]) {
            this.debug("Duplicate processing of " + obj.__template__.__name__ + ":" + id.toString(), 'save');
            return idMap[id.toString()];
        }
        this.debug("Saving " + obj.__template__.__name__ + ":" + id.toString() + " master_id=" + masterId, 'save');

        var pojo = !isDocumentUpdate ? {_id: id, _template: obj.__template__.__name__} :
        {_template: obj.__template__.__name__};   // subsequent levels return pojo copy of object
        idMap[id.toString()] = pojo;

        // Enumerate all template properties for the object
        var template = obj.__template__;
        var templateName = template.__name__;
        var props = template.getProperties();
        for (var prop in props)
        {
            var defineProperty = props[prop];
            var isCrossDocRef = this.isCrossDocRef(template, prop, defineProperty);
            var value = obj[prop];
            if (!this._persistProperty(defineProperty) || !defineProperty.enumerable ||
                typeof(value) == "undefined" || value == null) {

                // Make sure we don't wipe out foreign keys of non-cascaded object references
                if (defineProperty.type != Array &&
                    defineProperty.type && defineProperty.type.isObjectTemplate &&
                    !(!isCrossDocRef || !defineProperty.type.__schema__.documentOf) &&
                    obj[prop + 'Persistor'] && !obj[prop + 'Persistor'].isFetched && obj[prop + 'Persistor'].id &&
                    !(!schema || !schema.parents || !schema.parents[prop] || !schema.parents[prop].id))
                {
                    pojo[schema.parents[prop].id] = new ObjectID(obj[prop + 'Persistor'].id.toString())
                }
                continue;
            }

            // For arrays we either just copy each element or link and save each element
            if (defineProperty.type == Array)
            {
                if (!defineProperty.of)
                    throw  new Error(templateName + "." + prop + " is an Array with no 'of' declaration");

                // If type of pojo
                if (!defineProperty.of.__collection__)
                    pojo[prop] = value;

                // Is this a subdocument
                else if (!isCrossDocRef || !defineProperty.of.__schema__.documentOf)
                {
                    pojo[prop] = [];
                    if (value) {
                        var values = pojo[prop];
                        for (var ix = 0; ix < value.length; ++ix)
                        {
                            // Is this a sub-document being treated as a cross-document reference?
                            // If so it's foreign key gets updated with our id
                            if (isCrossDocRef) {

                                this.debug("Treating " + prop + " as cross-document sub-document", 'save');

                                // Get the foreign key to be updated
                                if (!schema || !schema.children || !schema.children[prop] || !schema.children[prop].id)
                                    throw new Error(templateName + "." + prop + " is missing a children schema entry");
                                var foreignKey = schema.children[prop].id;

                                // If not up-to-date put in our id
                                if (!value[ix][foreignKey] || value[ix][foreignKey].toString() != id.toString()) {
                                    value[ix][foreignKey] = id;
                                    value[ix].__dirty__ = true;
                                    this.debug("updated it's foreign key", 'save');
                                }

                                // If we were waiting to resolve where this should go let's just put it here
                                if ((typeof(value[ix]._id) == 'function'))
                                {   // This will resolve the id and it won't be a function anymore
                                    this.debug(prop + " waiting for placement, ebmed as subdocument", 'save');
                                    values.push(this.persistSave(value[ix], promises, masterId, idMap));
                                }
                                // If it was this placed another document or another place in our document
                                // we don't add it as a sub-document
                                if (value[ix]._id && (idMap[value[ix]._id.toString()] ||    // Already processed
                                    value[ix]._id.replace(/:.*/, '') != masterId))          // or in another doc
                                {
                                    if (value[ix].__dirty__) // If dirty save it
                                        promises.push(this.persistSave(value[ix], promises, null, idMap));
                                    continue;  // Skip saving it as a sub-doc
                                }
                                // Save as sub-document
                                this.debug("Saving subdocument " + prop, 'save');
                                values.push(this.persistSave(value[ix], promises, masterId, idMap));
                            } else {
                                if (value[ix]._id && idMap[value[ix]._id.toString()]) // Previously referenced objects just get the id
                                    values.push(value[ix]._id.toString());
                                else // Otherwise recursively obtain pojo
                                    values.push(this.persistSave(value[ix], promises, masterId, idMap));
                            }

                        }
                    }
                    // Otherwise this is a database reference and we must make sure that the
                    // foreign key points back to the id of this entity
                } else {
                    if (value instanceof Array)
                        for (var ix = 0; ix < value.length; ++ix)
                        {
                            if (!schema || !schema.children || !schema.children[prop] || !schema.children[prop].id)
                                throw   new Error(obj.__template__.__name__ + "." + prop + " is missing a children schema entry");
                            var foreignKey = schema.children[prop].id;
                            if (!value[ix][foreignKey] || value[ix][foreignKey].toString() != id.toString()) {
                                value[ix][foreignKey] = id;
                                value[ix].__dirty__ = true;
                            }
                            if (value[ix].__dirty__) {
                                this.debug("Saving " + prop + " as document because we updated it's foreign key", 'save');
                                promises.push(this.persistSave(value[ix], promises, null, idMap));
                            }
                        }
                }
            }
            // One-to-One or Many-to-One
            else if (defineProperty.type && defineProperty.type.isObjectTemplate)
            {
                var foreignKey = (schema.parents && schema.parents[prop]) ? schema.parents[prop].id : prop;

                if (!isCrossDocRef || !defineProperty.type.__schema__.documentOf)  // Subdocument processing:
                {

                    // If already stored in this document or stored in some other document make reference an id
                    if (value._id && (idMap[value._id.toString()] || value._id.replace(/:.*/, '') != masterId))
                        pojo[foreignKey] = value._id.toString();

                    // otherwise as long as in same collection just continue saving the sub-document
                    else if (defineProperty.type.__collection__ == collection)
                        pojo[foreignKey] = this.persistSave(value, promises, masterId, idMap);

                    // If an a different collection we have to get the id generated
                    else {
                        // This should cause an id to be generated eventually
                        promises.push(this.persistSave(value, promises, null, idMap));
                        // If it is not generated then queue up a function to set it when we get 'round to it
                        (function () {
                            var closureId = value._id;
                            var closurePojo = pojo;
                            var closureProp = prop;
                            var closureForeignKey = foreignKey;
                            if (!closureId || typeof(closureId == 'function'))
                                value._id = function (value) {
                                    closurePojo[closureForeignKey] = value;
                                    if (typeof(closureId) == 'function')
                                        closureId.call(null, value);
                                }
                            else
                                pojo[foreignKey] = value._id.toString();
                        })();
                    }

                } else
                {   // Otherwise this is a database reference and we must make sure that we
                    // have a foreign key that points to the entity
                    if (!schema || !schema.parents || !schema.parents[prop] || !schema.parents[prop].id)
                        throw   new Error(obj.__template__.__name__ + "." + prop + " is missing a parents schema entry");

                    var foreignKey = schema.parents[prop].id;
                    // Make sure referenced entity has an id
                    if (!value._id) {
                        value._id = this.getDBID().toString(); // Create one
                        value.__dirty__ = true;     // Will need to be saved
                    }
                    // Make sure we point to that id
                    if (!obj[foreignKey] || obj[foreignKey].toString != value._id.toString()) {
                        obj[foreignKey] = value._id.toString();
                    }
                    pojo[foreignKey] = new ObjectID(obj[foreignKey]);
                    if (value.__dirty__)
                        promises.push(this.persistSave(value, promises, null, idMap));
                }
            }
            else if (defineProperty.type == Date)
                pojo[prop] = obj[prop] ? obj[prop].getTime() : null;
            else
                pojo[prop] = obj[prop];
        }

        if (savePOJO)
            promises.push(this.savePOJO(obj, pojo, isDocumentUpdate ? new ObjectID(obj._id) : null));
        if (resolvePromises)
            return this.resolveRecursivePromises(promises, pojo).then(function (pojo) {
                pojo._id = obj._id;
                return pojo;
            });
        else
            return pojo;
    }

    PersistObjectTemplate._persistProperty = function(defineProperty) {
        if (defineProperty.persist == false || defineProperty.isLocal == true)
            return false
        else
            return true;
    }

    var ObjectID = require('mongodb').ObjectID;

    /* Mongo implementation of open */
    PersistObjectTemplate.getDB = function()
    {
        if (!this._db)
            throw  new Error("You must do PersistObjectTempate.setDB()");
        return this._db;
    }

    /* Mongo implementation of save */
    PersistObjectTemplate.savePOJO = function(obj, pojo, updateID) {
        this.debug('saving ' + obj.__template__.__name__ + " to " + obj.__template__.__collection__, 'io');
        var origVer = obj.__version__;
        obj.__version__ = obj.__version__ ? obj.__version__ + 1 : 1;
        pojo.__version__ = obj.__version__;
        return Q.ninvoke(this.getDB(), "collection", obj.__template__.__collection__).then (function (collection) {
            return (updateID ?  Q.ninvoke(collection, "update",
                origVer  ? {__version__: origVer, _id: updateID} :
                {_id: updateID}, pojo, {w:1}) :
                Q.ninvoke(collection, "save", pojo, {w:1})
                ).then (function (error, count) {
                if (error instanceof Array)
                    count = error[0]; // Don't know why things are returned this way
                if (updateID && count == 0)
                    throw new Error("Update Conflict");
                this.debug('saved ' + obj.__template__.__name__ + " to " + obj.__template__.__collection__, 'io');
                return Q(true);
            }.bind(this));
        }.bind(this));
    }
    PersistObjectTemplate.deleteFromQuery = function(template, query) {
        return Q.ninvoke(this.getDB(), "collection", template.__collection__, {w:1, fsync:true}).then (function (collection) {
            return Q.ninvoke(collection, "remove", query);
        });
    }

    PersistObjectTemplate.getPOJOFromQuery = function(template, query, options) {
        this.debug("db." + template.__collection__ + ".find({" + JSON.stringify(query) + "})", 'io');
        return Q.ninvoke(this.getDB(), "collection", template.__collection__).then (function (collection) {
            options = options || {};
            if (!options.sort)
                options.sort = {_id:1};
            return Q.ninvoke(collection, "find", query, null, options).then( function (cursor) {
                return Q.ninvoke(cursor, "toArray")
            });
        });
    }

    PersistObjectTemplate.countFromQuery = function(template, query) {
        return Q.ninvoke(this.getDB(), "collection", template.__collection__).then (function (collection) {
            return Q.ninvoke(collection, "find", query).then( function (cursor) {
                return Q.ninvoke(cursor, "count", false);
            });
        });
    }

    PersistObjectTemplate.distinctFromQuery = function(template, field, query) {
        return Q.ninvoke(this.getDB(), "collection", template.__collection__).then (function (collection) {
            return Q.ninvoke(collection, "distinct", field, query)
        });
    }

    PersistObjectTemplate.getDBID = function (masterId)
    {
        if (!masterId)
            return new ObjectID();
        else
            return masterId.toString() + ":" + new ObjectID().toString();

    }

    PersistObjectTemplate.isCrossDocRef = function (template, prop, defineProperty)
    {
        var schema = template.__schema__;
        if (!schema)
            return true;

        var type = defineProperty.type;
        var of = defineProperty.of;
        var refType = of || type;
        if (refType && refType.__name__ && !refType.__schema__  && this._persistProperty(defineProperty))
            throw new Error("Missing schema entry for " + refType.__name__);

        var collection = template.__collection__;
        var childrenRef = schema && schema.children && schema.children[prop];
        var parentsRef = schema && schema.parents && schema.parents[prop];
        var crossChildren = schema && schema.children && schema.children[prop]  && schema.children[prop].crossDocument;
        var crossParent = schema && schema.parents && schema.parents[prop] && schema.parents[prop].crossDocument;
        return (of && of.__collection__ && ((of.__collection__ != collection) || (childrenRef && crossChildren))) ||
            (type && type.__collection__ && ((type.__collection__ != collection) || (parentsRef && crossParent)));

    }
    return  PersistObjectTemplate;
}