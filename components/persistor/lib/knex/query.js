module.exports = function (PersistObjectTemplate) {

    var Q = require('q');
    var _ = require('underscore');

    PersistObjectTemplate.getFromPersistWithKnexId = function (template, id, cascade, isTransient, idMap, isRefresh) {
        return this.getFromPersistWithKnexQuery(template, {_id: id}, cascade, null, null, isTransient, idMap, null, null, isRefresh)
            .then(function(pojos) { return pojos[0] });
    }

    /**
     * A query is performed which joins the requested entity with any others that have a one-to-one relationship.
     * This yields and array of Pojos that have all of the columns from all of the related entities.
     * These Pojos are processed a template at a time, the processing for which may cause other sub-ordinate
     * entities to be fetched.  All fetches result in promises which ultimately must be resolved on a recursive
     * basis (e.g. keep resolving until there are no more newly added ones).
     *
     * @param template
     * @param queryOrChains
     * @param cascade
     * @param skip
     * @param limit
     * @param isTransient
     * @param idMap
     * @param options
     */
    PersistObjectTemplate.getFromPersistWithKnexQuery = function (template, queryOrChains, cascade, skip, limit, isTransient, idMap, options, establishedObject, isRefresh)
    {

        idMap = idMap || {};

        var promises = [];
        var returnedObj;
        var schema = template.__schema__;
        var results = [];

        var joins = [];

        // Determine one-to-one relationships and add function chains for where
        var props = template.getProperties();
        var join = 1;
        for (var prop in props) {
            var defineProperty = props[prop];
            if (this._persistProperty(props[prop]) && props[prop].type && props[prop].type.__objectTemplate__ && props[prop].type.__table__) {
                // Create the join spec with two keys
                if (!schema || !schema.parents || !schema.parents[prop] || !schema.parents[prop].id)
                    throw  new Error(props[prop].type.__name__ + "." + prop + " is missing a parents schema entry");
                var foreignKey = schema.parents[prop].id;
                var cascadeFetch = (cascade && cascade[prop]) ? cascade[prop] : null;
                var originalForeignId = establishedObject && establishedObject[prop] ? establishedObject[prop]._id : null;
                if (originalForeignId || defineProperty['fetch'] || cascadeFetch || schema.parents[prop].fetch == true)
                    joins.push({
                        prop: prop,
                        template: props[prop].type,
                        parentKey: '_id',
                        childKey: foreignKey,
                        alias: this.dealias(props[prop].type.__table__) + join++
                    });
            }
        }
        options = options || {}
        if (skip)
            options.offset = skip;
        if (limit)
            options.limit = limit;

        return Q(true)
            .then(getPOJOsFromQuery)
            .then(getTemplatesFromPOJOS.bind(this))
            .then(resolvePromises.bind(this))

        function getPOJOsFromQuery () {
            return PersistObjectTemplate.getPOJOsFromKnexQuery(template, joins, queryOrChains, options, skip, limit)
        }

        function getTemplatesFromPOJOS(pojos) {
            joins.forEach(function(join) {
                pojos.forEach(function (pojo) {
                    pojo.__alias__ = pojo.__alias__ || [];
                    pojo.__alias__.push(join.template);
                });
            });
            var sortMap = {};
            pojos.forEach(function (pojo, ix) {
                sortMap[pojo[this.dealias(template.__table__) + '____id']] = ix;
                promises.push(
                    PersistObjectTemplate.getTemplateFromKnexPOJO(pojo, template, promises, idMap, cascade, isTransient,
                        null, establishedObject, null, this.dealias(template.__table__) + '___', joins, isRefresh)
                        .then(function (obj) {results[sortMap[obj._id]] = obj;return Q(obj)})
                );
            }.bind(this));
        }

        function resolvePromises () {
            return this.resolveRecursivePromises(promises, results);
        }

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
    PersistObjectTemplate.getTemplateFromKnexPOJO =
        function (pojo, template, promises, idMap, cascade, isTransient, defineProperty, establishedObj, specificProperties, prefix, joins, isRefresh)
        {
            var promises = [];
            prefix = prefix || "";

            this.debug("getTemplateFromKnexPOJO template=" + template.__name__ + " _id=" + pojo[prefix + '_id']+ " _template=" + pojo[prefix + '_template']);


            // For recording back refs
            if (!idMap)
                throw "missing idMap on fromDBPOJO";
            var topLevel = false;

            if (!promises) {
                topLevel = true;
                promises = [];
            }
            // We also get arrays of established objects
            if (establishedObj && establishedObj instanceof Array)
                establishedObj = _.find(establishedObj, function (o) {return o._id == pojo[prefix + '_id']});

            // Create the new object with correct constructor using embedded ID if ObjectTemplate
            if (!establishedObj &&!pojo[prefix + '_template'])
                throw new Error("Missing _template on " + template.__name__ + " row " + pojo[prefix + '_id']);
            var obj = establishedObj || idMap[pojo[prefix + '_id']] ||
                this._createEmptyObject(template, this.getObjectId(template, pojo, prefix), defineProperty, isTransient);

            // Once we find an object already fetched that is not transient query as normal for the rest
            if (!obj.__transient__  && !establishedObj && !isTransient)
                isTransient = false;

            var schema = obj.__template__.__schema__;
            obj._id = pojo[prefix + '_id'];

            var cahcedObject = this.getCachedObject(obj._id);
            if (cachedObject && !isRefresh)
                return cachedObject;
            if (idMap[obj._id])
                return Q(idMap[obj._id]);

            idMap[obj._id] = obj;
            //console.log("Adding " + template.__name__ + "-" + obj._id + " to idMap");
            if (pojo[prefix + '__version__'])
                obj.__version__ = pojo[prefix + '__version__'];

            // Go through all the properties and transfer them to newly created object
            var props = specificProperties || obj.__template__.getProperties();
            for (var prop in props)
            {

                var value = pojo[prefix + prop];
                var defineProperty = props[prop];
                var type = defineProperty.type;
                var of = defineProperty.of;
                var actualType = of || type;
                var cascadeFetch = (cascade && cascade[prop]) ? cascade[prop] : null;

                // Create a persistor if not already there
                var persistorPropertyName = prop + "Persistor";

                // Make sure this is property is persistent and that it has a value.  We have to skip
                // undefined values in case a new property is added so it can retain it's default value
                if (!this._persistProperty(defineProperty) || !defineProperty.enumerable)
                    continue;

                if (!type)
                    throw new Error(obj.__template__.__name__ + "." + prop + " has no type decleration");

                if (type == Array && of.__table__)
                {
                    if (!obj[prop])
                        obj[prop];
                    if(!schema || !schema.children || !schema.children[prop])
                        throw  new Error(obj.__template__.__name__ + "." + prop + " is missing a children schema entry");
                    if (schema.children[prop].filter && (!schema.children[prop].filter.value || !schema.children[prop].filter.property))
                        throw new Error("Incorrect filter properties on " + prop + " in " + templateName);
                    var foreignFilterKey = schema.children[prop].filter ? schema.children[prop].filter.property : null;
                    var foreignFilterValue = schema.children[prop].filter ? schema.children[prop].filter.value : null;

                    if (defineProperty['fetch'] || cascadeFetch || schema.children[prop].fetch ||
                        (obj[persistorPropertyName].isFetched && !obj[persistorPropertyName].isFetching))
                    {
                        (function () {

                            // Construct foreign key query
                            var query = {};
                            var options = defineProperty.queryOptions || {sort: {_id: 1}};
                            var limit = options.limit || null;
                            query[schema.children[prop].id] = obj._id;
                            if (foreignFilterKey)
                                query[foreignFilterKey] = foreignFilterValue;

                            // Handle
                            var closureProp = prop;
                            var closurePersistorProp = persistorPropertyName
                            var closureCascade = this.processCascade(query, options, cascadeFetch,
                                (schema && schema.children) ? schema.children[prop].fetch : null, defineProperty.fetch);

                            // Fetch sub-ordinate entities and convert to objects
                            obj[persistorPropertyName].isFetching = true;
                            promises.push(this.getFromPersistWithKnexQuery(defineProperty.of, query, closureCascade, null, limit, isTransient, idMap, options, obj[prop], isRefresh)
                                .then( function(objs) {
                                    obj[closureProp] = objs;
                                    var start = options ? options.start || 0 : 0;
                                    updatePersistorProp(obj, closurePersistorProp, {isFetched: true, start: start, next: start + objs.length})
                                }.bind(this)));

                        }.bind(this))();
                    } else
                        updatePersistorProp(obj, persistorPropertyName, {isFetched: false});

                } else if (type.isObjectTemplate && (schema || obj[prop] && obj[prop]._id))
                {
                    var foreignId = obj[prop] ? obj[prop]._id : null;
                    var originalForeignId = isRefresh ? foreignId : null;
                    if (!obj[prop])
                        obj[prop] = null;
                    // Determine the id needed
                    if (!foreignId) {
                        if (!schema || !schema.parents || !schema.parents[prop] || !schema.parents[prop].id)
                            throw  new Error(obj.__template__.__name__ + "." + prop + " is missing a parents schema entry");
                        var foreignKey = schema.parents[prop].id;
                        var foreignId = pojo[prefix + foreignKey] || (obj[persistorPropertyName] ? obj[persistorPropertyName].id : "") || "";
                    }
                    // Return copy if already there
                    var cachedObject = this.getCachedObject(foreignId) || idMap[foreignId];
                    if (cachedObject) {
                        if (!obj[prop] || obj[prop].__id__ != cachedObject.__id__) {
                            obj[prop] = cachedObject;
                            updatePersistorProp(obj, persistorPropertyName, {isFetched: true, id:foreignId});
                        }
                    } else {
                        if ((originalForeignId || defineProperty['fetch'] || cascadeFetch || schema.parents[prop].fetch) &&

                            (!obj[persistorPropertyName].isFetching)) {
                            if (foreignId) {
                                var query = {_id: foreignId};
                                var options = {};
                                (function () {
                                    var closureProp = prop;
                                    var closurePersistorProp = persistorPropertyName;
                                    var closureCascade = this.processCascade(query, options, cascadeFetch,
                                        (schema && schema.parents) ? schema.parents[prop].fetch : null, defineProperty.fetch);
                                    var closureForeignId = foreignId;

                                    var join = _.find(joins, function (j) {return j.prop == prop});

                                    var fetcher = join ?
                                        (pojo[join.alias + "____id"] ?
                                            this.getTemplateFromKnexPOJO(pojo, defineProperty.type, promises, idMap, closureCascade, isTransient, defineProperty,
                                                obj[prop], null, join.alias + "___", null, isRefresh) : Q(true)) :
                                        this.getFromPersistWithKnexQuery(defineProperty.type, query, closureCascade, null, null, isTransient, idMap, {}, obj[prop], isRefresh);
                                    obj[persistorPropertyName].isFetching = true;
                                    promises.push(fetcher.then(function(objs) {
                                        obj[closureProp] = idMap[closureForeignId];
                                        if (obj[closurePersistorProp]) {
                                            updatePersistorProp(obj, closurePersistorProp, {isFetched: true, id: closureForeignId});
                                        }
                                    }.bind(this)));
                                }.bind(this))();
                            } else {
                                updatePersistorProp(obj, persistorPropertyName, {isFetched: true, id: foreignId})
                            }
                        } else {
                            updatePersistorProp(obj, persistorPropertyName, {isFetched: false, id: foreignId})
                        }
                    }
                } else
                if (typeof(pojo[prefix + prop]) != 'undefined') {
                    var value = pojo[prefix + prop];
                    if (type == Date)
                        obj[prop] = value ? new Date(value * 1) : null;
                    else if (type == Number)
                        obj[prop] = (!value && value !== 0) ? null : value * 1;
                    else if (type == Object || type == Array)
                        try {
                            obj[prop] = value ? JSON.parse(value) : null;
                        } catch (e) {
                            console.log("Error retrieving " + obj.__id__ + "." + prop + " -- " + e.message);
                            obj[prop] = null;
                        }
                    else
                        obj[prop] = value;
                }


                function copyProps(obj) {
                    var newObj = {};
                    for (var prop in obj)
                        newObj[prop] = obj[prop];
                    return newObj;
                }
                function updatePersistorProp(obj, prop, values) {
                    values['isFetching'] = false;
                    if (!obj[prop])
                        obj[prop] = {};
                    var modified = false;
                    _.map(values, function(value, key) {
                        if (obj[prop][key] != value) {
                            obj[prop][key] = value;
                            modified = true;
                        }
                    });
                    if (modified)
                        obj[prop] = copyProps(obj[prop]);
                }


            }
            return Q.all(promises).then(function () {
                return Q(obj);
            });
            return topLevel ? this.resolveRecursivePromises(promises, obj).then(function (ret) {
                return Q(ret);
            }) : Q(obj);
        };

}