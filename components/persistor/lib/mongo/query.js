module.exports = function (PersistObjectTemplate) {

    var Q = require('q');

    PersistObjectTemplate.getFromPersistWithMongoId = function (template, id, cascade, isTransient, idMap) {
        return this.getFromPersistWithMongoQuery(template, {_id: PersistObjectTemplate.ObjectID(id.toString())}, cascade, null, null, isTransient, idMap)
            .then(function(pojos) { return pojos[0] });
    }


    PersistObjectTemplate.getFromPersistWithMongoQuery = function (template, query, cascade, skip, limit, isTransient, idMap, options)
    {
        idMap = idMap || {};
        options = options || {};
        if (typeof(skip) != 'undefined')
            options.skip = skip * 1;
        if (typeof(limit) != 'undefined')
            options.limit = limit * 1;
        if (template.__schema__.subDocumentOf) {
            var subQuery = this.createSubDocQuery(query, template)
            return this.getPOJOFromMongoQuery(template, subQuery.query, options, idMap).then(function(pojos) {
                var promises = [];
                var results = [];
                for (var ix = 0; ix < pojos.length; ++ix) {

                    // Populate the idMap for any references
                    if (!idMap[pojos[ix]._id.toString()]) {
                        var topType = this.getTemplateByCollection(template.__collection__);
                        this.getTemplateFromMongoPOJO(pojos[ix], topType, promises, {type: topType}, idMap, {},
                            null, null, isTransient)
                    }
                    var subPojos = this.getPOJOSFromPaths(template, subQuery.paths, pojos[ix], query)
                    for (var jx = 0; jx < subPojos.length; ++jx) {
                        promises.push(this.getTemplateFromMongoPOJO(subPojos[jx], template, null, null, idMap, cascade, null, null, isTransient).then(function (pojo) {
                            results.push(pojo);
                        }));
                    }
                }
                return this.resolveRecursivePromises(promises, results);
            }.bind(this));
        } else
            return this.getPOJOFromMongoQuery(template, query, options, idMap).then(function(pojos)
            {
                var promises = [];
                var results = [];
                for (var ix = 0; ix < pojos.length; ++ix)
                    (function () {
                        var cix = ix;
                        promises.push(this.getTemplateFromMongoPOJO(pojos[ix], template, null, null, idMap, cascade, null, null, isTransient).then( function (obj) {
                            results[cix] = obj;
                        }))
                    }.bind(this))();
                return this.resolveRecursivePromises(promises, results);

            }.bind(this));
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
    PersistObjectTemplate.getTemplateFromMongoPOJO = function (pojo, template, promises, defineProperty, idMap, cascade, establishedObj, specificProperties, isTransient)
    {
        // For recording back refs
        if (!idMap)
            throw "missing idMap on getTemplateFromMongoPOJO";
        var topLevel = false;
        if (!promises) {
            topLevel = true;
            promises = [];
        }

        // Create the new object with correct constructor using embedded ID if ObjectTemplate
        var obj = establishedObj || idMap[pojo._id.toString()] ||
            this._createEmptyObject(template, 'persist' + template.__name__ + '-' + pojo._template.replace(/.*:/,'') +
                "-"+ pojo._id.toString(), defineProperty, isTransient);

        // Once we find an object already fetch that is not transient query as normal for the rest
        if (!obj.__transient__  && !establishedObj && !isTransient)
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
            var isCrossDocRef = this.isCrossDocRef(obj.__template__, prop, defineProperty) || defineProperty.autoFetch;
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
                                    this.getTemplateFromMongoPOJO(pojo[prop][ix], defineProperty.of, promises, defineProperty, idMap,
                                        cascadeFetchProp, null, null, isTransient);
                            }
                        } else
                            obj[prop][ix] = null;
                    }
                    /*
                     obj[prop][ix] = pojo[prop][ix] ?
                     (typeof(pojo[prop][ix]) == "string" ?
                     idMap[pojo[prop][ix]] :
                     this.getTemplateFromMongoPOJO(pojo[prop][ix], defineProperty.of, promises, defineProperty, idMap))
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
                            promises.push(self.countFromMongoQuery(closureOf, query).then( function(count) {
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
                            query[foreignKey] = id.toString().match(/:/) ? id.toString() : new this.ObjectID(id.toString());
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
                            promises.push(self.getPOJOFromMongoQuery(defineProperty.of, query, options, idMap).then( function(pojos)
                            {
                                // For subdocs we have to fish them out of the documents making sure the query matches
                                if (closureIsSubDoc) {
                                    obj[closureProp] = [];
                                    for (var ix = 0; ix < pojos.length; ++ix)
                                    {
                                        // Populate the idMap for any references
                                        if (!idMap[pojos[ix]._id.toString()]) {
                                            var topType = self.getTemplateByCollection(closureOf.__collection__);
                                            self.getTemplateFromMongoPOJO(pojos[ix], topType, promises, {type: topType}, idMap, {},
                                                null, null, isTransient)
                                        }
                                        // Grab the actual Pojos since may not be avail from processing parent
                                        var subPojos = self.getPOJOSFromPaths(defineProperty.of, closurePaths, pojos[ix], closureOrigQuery)
                                        for (var jx = 0; jx < subPojos.length; ++jx)
                                            // Take them from cache or fetch them
                                            obj[closureProp].push((!closureCascade && idMap[subPojos[jx]._id.toString()]) ||
                                                self.getTemplateFromMongoPOJO(subPojos[jx], closureDefineProperty.of,
                                                    promises, closureDefineProperty, idMap, closureCascade, null, null, isTransient));
                                    }
                                } else
                                    for(var ix = 0; ix < pojos.length; ++ix)
                                    {
                                        // Return cached one over freshly read
                                        obj[closureProp][ix] = idMap[pojos[ix]._id.toString()] ||
                                            self.getTemplateFromMongoPOJO(pojos[ix], closureDefineProperty.of,
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

                            obj[prop] = idMap[pojo[prop]._id.toString()] || this.getTemplateFromMongoPOJO(pojo[prop], type, promises,
                                    defineProperty, idMap, cascadeFetchProp, null, null, isTransient);
                        }

                    } else

                        obj[prop] = null;

                    /*
                     var newObject = pojo[prop] ? (typeof(pojo[prop]) == "string" ? idMap[pojo[prop]] :
                     this.getTemplateFromMongoPOJO(pojo[prop], type, promises, defineProperty, idMap))	: null;
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
                                var query = {_id: new this.ObjectID(foreignId.replace(/:.*/, ''))};
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
                                        promises.push(self.getPOJOFromMongoQuery(closureType, query, idMap).then(function(pojos) {

                                            // Assuming the reference is still there
                                            if (pojos.length > 0) {
                                                if (closureIsSubDoc) {
                                                    // Process the document and the sub-document will end up in idMap
                                                    if (!idMap[pojos[0]._id.toString()]) {
                                                        var topType = this.getTemplateByCollection(closureType.__collection__);
                                                        self.getTemplateFromMongoPOJO(pojos[0], topType, promises, {type: topType}, idMap, {},
                                                            null, null, isTransient);
                                                    }
                                                    // Get actual sub-doc since it may not yet be available from processing doc
                                                    var subDocPojo = self.getPOJOSFromPaths(
                                                        closureType, this.createSubDocQuery(null, closureType).paths, pojos[0],
                                                        {_id: closureForeignId}
                                                    )[0];
                                                    // Process actual sub-document to get cascade right and specific sub-doc
                                                    if (subDocPojo && subDocPojo._id) {
                                                        if (!idMap[subDocPojo._id.toString()])
                                                            self.getTemplateFromMongoPOJO(subDocPojo, closureType, promises,
                                                                closureDefineProperty, idMap, closureCascade, null, null, isTransient);
                                                    } else
                                                        console.log("Orphaned subdoc on " + obj.__template__.__name__ + "[" + closureProp + ":" + obj._id + "] " +
                                                            "foreign key: " + closureForeignId + " query: " + JSON.stringify(this.createSubDocQuery(null, closureType)));
                                                } else
                                                if (!idMap[pojos[0]._id.toString()])
                                                    self.getTemplateFromMongoPOJO(pojos[0], closureType, promises,
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
                if (type == Number)
                    obj[prop] = (!pojo[prop] && pojo[prop] !== 0) ? null : pojo[prop] * 1;
                else if (type == Boolean)
                    obj[prop] = (pojo[prop] === true || obj[prop] === "true") ? true : ((pojo[prop] === false || obj[prop] === "false") ? false : null)
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
                else if (pojo[prop] && typeof(query[prop]) != 'string' && typeof(query[prop]) != 'number'  && !(pojo[prop] instanceof PersistObjectTemplate.ObjectID))
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
        function isObjectID(elem) {return elem &&  (elem instanceof PersistObjectTemplate.ObjectID || elem._bsontype)}
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
                    else if (typeof (elem) == 'string' || typeof(elem) == 'number' || isObjectID(elem))
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
                this.debug("subdocument query for " + targetTemplate.__name__ + '; ' + JSON.stringify(results.query), 'subdoc');
            }
        }
        return results;
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


}