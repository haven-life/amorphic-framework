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
 * persistObjectTemplate is a mixin for remoteObjectTemplate which allows objects to be
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

        object.fetchProperty = function (prop, cascade, start, limit)
        {
            var properties = {}
            var objectProperties = this.__template__.getProperties();
            properties[prop] = objectProperties[prop];
            if (typeof(start) != 'undefined' || typeof(limit) != 'undefined')
                properties[prop].queryOptions = {};
            if (typeof(start) != 'undefined')
                properties[prop].queryOptions['skip'] = start;
            if (typeof(limit) != 'undefined')
                properties[prop].queryOptions['limit'] = limit;

            cascadeTop = {};
            cascadeTop[prop] = cascade || true;

            return self.fromDBPOJO(this, this.__template__, null, null, null, cascadeTop, this, properties);
        };

        object.fetch = function (cascade)
        {
            var properties = {}
            var objectProperties = this.__template__.getProperties();
            for (var prop in cascade)
                properties[prop] = objectProperties[prop];

            return self.fromDBPOJO(this, this.__template__, null, null, null, cascade, this, properties);
        };
    };

    /* Inject some functions into the template */
    PersistObjectTemplate._injectIntoTemplate = function (template)
    {
        // Extract schema and collection

        template.__schema__ = PersistObjectTemplate._schema[template.__name__];
        template.__collection__ = template.__schema__ ? template.__schema__.documentOf || template.__schema__.subDocumentOf : null;
        var parentTemplate = template.__parent__;
        while  (parentTemplate) {
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


        baseClassForPersist._injectIntoTemplate(template);

        /**
         * Return a single instance of an object of this class given an id
         *
         * @param id
         */
        template.getFromPersistWithId = function(id, cascade) {
            return PersistObjectTemplate.getFromPersistWithId(template, id, cascade)
        };

        /**
         * Return an array of objects of this class given a json query
         *
         * @param query
         */
        template.getFromPersistWithQuery = function(query, cascade, start, limit) {
            return PersistObjectTemplate.getFromPersistWithQuery(template, query, cascade, start, limit)
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

        var props = template.getProperties();
        for (var prop in props) {
            var defineProperty = props[prop];
            var type = defineProperty.type;
            var collection = template.__collection__;
            var of = defineProperty.of;
            var isCrossDocRef = this.isCrossDocRef(template, prop, defineProperty)
            if (isCrossDocRef) {
                (function () {
                    var closureProp = prop;
                    if (!props[closureProp + 'Persistor'])
                        template.createProperty(closureProp + 'Persistor', {type: Object, toServer: false, persist: false, value:{isFetched: false, isFetching: false}});
                    if (!template.prototype[closureProp + 'Fetch'])
                        template.createProperty(closureProp + 'Fetch', {on: "server", body: function (start, limit) {
                            return this.fetchProperty(closureProp, null, start, limit);
                        }});
                })();
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

    PersistObjectTemplate.getFromPersistWithQuery = function (template, query, cascade, skip, limit)
    {
        var options = {};
        if (typeof(skip) != 'undefined')
            options.skip = skip * 1;
        if (typeof(limit) != 'undefined')
            options.limit = limit * 1;

        return this.getPOJOFromQuery(template, query, options).then(function(pojos)
        {
            var promises = [];
            var results = [];
            for (var ix = 0; ix < pojos.length; ++ix)
                (function () {
                    var cix = ix;
                    promises.push(this.fromDBPOJO(pojos[ix], template, null, null, null, cascade).then( function (obj) {
                        results[cix] = obj;
                    }))
                }.bind(this))();
            return this.resolveRecursivePromises(promises, results);

        }.bind(this));
    }

    PersistObjectTemplate.getFromPersistWithId = function (template, id, cascade) {
        var self = this;
        return this.getPOJOFromQuery(template, {_id: new ObjectID(id)}).then(function(pojos) {
            if (pojos.length > 0)
                return self.fromDBPOJO(pojos[0], template, null, null, null, cascade);
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
    PersistObjectTemplate.fromDBPOJO = function (pojo, template, promises, defineProperty, idMap, cascade, establishedObj, specificProperties)
    {
        // For recording back refs
        if (!idMap)
            idMap = {};
        var topLevel = false;
        if (!promises) {
            topLevel = true;
            promises = [];
        }

        // Create the new object with correct constructor using embedded ID if ObjectTemplate
        var obj = establishedObj ||
            this._createEmptyObject(template, 'perist-' + pojo._template.replace(/.*:/,'') +
                "-"+ pojo._id.toString(), defineProperty);

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
                                    idMap[pojo[prop][ix]].push(function (value) {
                                        pojo[prop][ix] = value;
                                    });
                                else
                                    obj[prop][ix] = idMap[pojo[prop][ix]];
                            } else

                                obj[prop][ix] =
                                    this.fromDBPOJO(pojo[prop][ix], defineProperty.of, promises, defineProperty, idMap);

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
                            query[foreignKey] = new ObjectID(id.toString());
                        }
                        var options = defineProperty.queryOptions || {};
                        cascadeFetch = this.processCascade(query, options, cascadeFetch,
                            (schema && schema.children) ? schema.children[prop].fetch : null, defineProperty.fetch);
                        //console.log("fetching " + prop + " cascading " + JSON.stringify(cascadeFetch) + " " + JSON.stringify(query) + " " + JSON.stringify(options));
                        var self = this;
                        (function () {
                            var closureProp = prop;
                            var closurePersistorProp = persistorPropertyName
                            var closureCascade = cascadeFetch;
                            var closureDefineProperty = defineProperty;
                            obj[closureProp] = [];
                            promises.push(self.getPOJOFromQuery(defineProperty.of, query, options).then( function(pojos)
                            {
                                for(var ix = 0; ix < pojos.length; ++ix)
                                {
                                    // Return cached one over freshly read
                                    if (idMap[pojos[ix]._id.toString()])
                                        obj[closureProp][ix] = idMap[pojos[ix]._id.toString()];
                                    else
                                        obj[closureProp][ix] = self.fromDBPOJO(pojos[ix], closureDefineProperty.of,
                                            promises, closureDefineProperty, idMap, closureCascade)
                                }
                                obj[closurePersistorProp].isFetched = true;
                                obj[closurePersistorProp].start = options ? options.start || 0 : 0;
                                obj[closurePersistorProp].next = obj[closurePersistorProp].start + pojos.length;
                                obj[closurePersistorProp] = copyProps(obj[closurePersistorProp]);
                                return Q.fcall(function(){return true}); // Say we done
                            }));
                        })();
                    } else
                        obj[persistorPropertyName].isFetched = false;
                    obj[persistorPropertyName] = copyProps(obj[persistorPropertyName]);
                }

            } else if (type.isObjectTemplate)
            {
                // Same collection suck in from idMap if previously referenced or process pojo
                if (type.__collection__ == collection)
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
                        } else

                            obj[prop] = this.fromDBPOJO(pojo[prop], type, promises, defineProperty, idMap);

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
                                var query = {_id: new ObjectID(foreignId)};
                                var options = {};
                                cascadeFetch = this.processCascade(query, options, cascadeFetch,
                                    (schema && schema.parents) ? schema.parents[prop].fetch : null, defineProperty.fetch);
                                //console.log("fetching " + prop + " cascading " + JSON.stringify(cascadeFetch));
                                var self = this;
                                (function () {
                                    var closureProp = prop;
                                    var closureType = type;
                                    var closurePersistorProp = persistorPropertyName;

                                    var closureCascade = cascadeFetch;
                                    var closureDefineProperty = defineProperty;
                                    promises.push(self.getPOJOFromQuery(closureType, query).then(function(pojos) {
                                        if (pojos.length > 0)
                                            obj[closureProp] = self.fromDBPOJO(pojos[0], closureType, promises,
                                                closureDefineProperty, idMap, closureCascade);
                                        obj[closurePersistorProp].isFetched = true;
                                        obj[closurePersistorProp] = copyProps(obj[closurePersistorProp]);
                                        return Q.fcall(function(){return true});
                                    }));
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
     * @param masterId
     * @param idMap
     * @return {*}
     */
    PersistObjectTemplate.persistSave = function(obj, promises, masterId, idMap)
    {
        if (!obj.__template__)
            throw new Error("Attempt to save an non-templated Object");
        if (!obj.__template__.__schema__)
            throw  new Error("Schema entry missing for " + obj.__template__.__name__);
        var schema = obj.__template__.__schema__;
        var collection = obj.__template__.__collection__;
        var resolvePromises = false;    // whether we resolve all promises
        var savePOJO = false;           // whether we save this entity or just return pojo

        if (!promises) {                // accumulate promises for nested saves
            promises = [];
            resolvePromises = true;
        }

        var topLevel = false;       // top level returns a promise

        var id = obj._id ?
            (obj._id.toString().match(/:/) ?  //pseudo-id for sub-documents
                obj._id :
                (obj._id instanceof ObjectID ? obj._id : new ObjectID(obj._id))) :
            this.getDBID(masterId);
        obj._id = id.toString();
        obj.__dirty__ = false;

        if (!masterId) {
            savePOJO = true;
            masterId = id;
            idMap = {};             // Track circular references
        }

        var pojo = {_id: id, _template: obj.__template__.__name__};   // subsequent levels return pojo copy of object
        idMap[id.toString()] = pojo;

        // Enumerate all template properties for the object
        var props = obj.__template__.getProperties();
        for (var prop in props)
        {
            var defineProperty = props[prop];
            var isCrossDocRef = this.isCrossDocRef(obj.__template__, prop, defineProperty);
            var value = obj[prop];
            if (!this._persistProperty(defineProperty) || !defineProperty.enumerable ||
                typeof(value) == "undefined" || value == null)
                continue;

            // For arrays we either just copy each element or link and save each element
            if (defineProperty.type == Array)
            {
                if (!defineProperty.of)
                    throw  new Error(obj.__template__.__name__ + "." + prop + " is an Array with no 'of' declaration");

                // If type of pojo
                if (!defineProperty.of.__collection__)
                    pojo[prop] = value;

                // If this is in the same entity just copy
                else if (!isCrossDocRef)
                {
                    pojo[prop] = [];
                    if (value)
                        for (var ix = 0; ix < value.length; ++ix)
                            if (value[ix]._id && idMap[value[ix]._id.toString()]) // Previously referenced objects just get the id
                                pojo[prop][ix] = value[ix]._id.toString();
                            else // Otherwise recursively obtain pojo
                                pojo[prop][ix] = this.persistSave(value[ix], promises, masterId, idMap);

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
                                value[ix].__dirty__ = true;;
                            }
                            if (value[ix].__dirty__)
                                promises.push(this.persistSave(value[ix], promises, null, idMap));
                        }
                }
            }
            else if (defineProperty.type && defineProperty.type.isObjectTemplate)
            {
                // If this is in the same entity just copy over
                if (!isCrossDocRef)
                {
                    if (value._id && idMap[value._id.toString()])
                        pojo[prop] = value._id.toString();
                    else
                        pojo[prop] = this.persistSave(value, promises, masterId, idMap);
                }
                // Otherwise this is a database reference and we must make sure that we
                // have a foreign key that points to the entity
                else
                {
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
            promises.push(this.savePOJO(obj, pojo));
        if (resolvePromises)
            return this.resolveRecursivePromises(promises, pojo);
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
    PersistObjectTemplate.savePOJO = function(obj, pojo) {
        return Q.ninvoke(this.getDB(), "collection", obj.__template__.__collection__).then (function (collection) {
            return Q.ninvoke(collection, "save", pojo);
        });
    }

    PersistObjectTemplate.deleteFromQuery = function(template, query) {
        return Q.ninvoke(this.getDB(), "collection", template.__collection__, {w:1, fsync:true}).then (function (collection) {
            return Q.ninvoke(collection, "remove", query);
        });
    }

    PersistObjectTemplate.getPOJOFromQuery = function(template, query, options) {
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
            return false;

        var type = defineProperty.type;
        var of = defineProperty.of;
        var collection = template.__collection__;
        var childrenRef = schema && schema.children && schema.children[prop];
        var parentsRef = schema && schema.parents && schema.parents[prop];

        return (of && of.__collection__ && ((of.__collection__ != collection) || childrenRef)) ||
            (type && type.__collection__ && ((type.__collection__ != collection) || parentsRef));

    }
    return  PersistObjectTemplate;
}