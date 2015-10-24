module.exports = function (PersistObjectTemplate) {

    var Q = require('q');
    var _ = require('underscore');

    PersistObjectTemplate.getFromPersistWithKnexId = function (template, id, cascade, isTransient, idMap) {
        return this.getFromPersistWithKnexQuery(template, {_id: id}, cascade, null, null, isTransient, idMap)
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
    PersistObjectTemplate.getFromPersistWithKnexQuery = function (template, queryOrChains, cascade, skip, limit, isTransient, idMap, options)
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
        for (var prop in props)
            if (props[prop].type.__objectTemplate__) {
                // Create the join spec with two keys
                if (!schema || !schema.parents || !schema.parents[prop] || !schema.parents[prop].id)
                    throw  new Error(props[prop].type.__name__ + "." + prop + " is missing a parents schema entry");
                var foreignKey = schema.parents[prop].id;
                joins.push({
                    template: props[prop].type,
                    parentKey: '_id',
                    childKey: foreignKey,
                    alias: this.dealias(props[prop].type.__collection__) + join++
                });
            }

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
            pojos.forEach(function (pojo) {
                promises.push(
                    PersistObjectTemplate.getTemplateFromKnexPOJO(pojo, template, promises, idMap, cascade, isTransient, null, null, null, this.dealias(template.__collection__) + '___', joins)
                        .then(function (obj) {results.push(obj);return Q(obj)})
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
    function (pojo, template, promises, idMap, cascade, isTransient, defineProperty, establishedObj, specificProperties, prefix, joins)
    {

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

        // Create the new object with correct constructor using embedded ID if ObjectTemplate
        var obj = establishedObj || idMap[pojo[prefix + '_id']] ||
            this._createEmptyObject(template, 'persist' + template.__name__ + '-' + pojo[prefix + '_template'].replace(/.*:/,'') +
                "-"+ pojo[prefix + '_id'].toString(), defineProperty, isTransient);

        // Once we find an object already fetched that is not transient query as normal for the rest
        if (!obj.__transient__  && !establishedObj && !isTransient)
            isTransient = false;

        var schema = obj.__template__.__schema__;
        obj._id = pojo[prefix + '_id'];
        idMap[obj._id] = obj;
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
            var cascadeFetch = (cascade && cascade[prop]) ? cascade[prop] : null;

            var persistorPropertyName = prop + "Persistor";
            obj[persistorPropertyName] = obj[persistorPropertyName] || {count: 0};

            // Make sure this is property is persistent and that it has a value.  We have to skip
            // undefined values in case a new property is added so it can retain it's default value

            if (!type)
                throw new Error(obj.__template__.__name__ + "." + prop + " has no type decleration");

            if (type == Array && of.__collection__)
            {
                obj[prop] = [];
                if(!schema || !schema.children || !schema.children[prop])
                    throw  new Error(obj.__template__.__name__ + "." + prop + " is missing a children schema entry");
                if (defineProperty['fetch'] || cascadeFetch || schema.children[prop].fetch)
                {
                    (function () {

                        // Construct foreign key query
                        var query = {};
                        var options = defineProperty.queryOptions || {sort: {_id: 1}};
                        var limit = options.limit || null;
                        query[schema.children[prop].id] = obj._id;

                        // Handle
                        var closureProp = prop;
                        var closurePersistorProp = persistorPropertyName
                        var closureCascade = this.processCascade(query, options, cascadeFetch,
                            (schema && schema.children) ? schema.children[prop].fetch : null, defineProperty.fetch);

                        // Fetch sub-ordinate entities and convert to objects
                        promises.push(this.getFromPersistWithKnexQuery(defineProperty.of, query, closureCascade, null, limit, isTransient, idMap, options)
                        .then( function(objs) {
                            obj[closureProp] = objs;
                            obj[closurePersistorProp].isFetched = true;
                            obj[closurePersistorProp].start = options ? options.start || 0 : 0;
                            obj[closurePersistorProp].next = obj[closurePersistorProp].start + objs.length;
                            obj[closurePersistorProp] = copyProps(obj[closurePersistorProp]);
                        }.bind(this)));

                    }.bind(this))();
                } else
                    obj[persistorPropertyName].isFetched = false;

                obj[persistorPropertyName] = copyProps(obj[persistorPropertyName]);  // For setters to register a change

            } else if (type.isObjectTemplate)
            {
                obj[prop] = null;
                // Determine the id needed
                if (!schema || !schema.parents || !schema.parents[prop] || !schema.parents[prop].id)
                    throw  new Error(obj.__template__.__name__ + "." + prop + " is missing a parents schema entry");
                var foreignKey = schema.parents[prop].id;
                var foreignId = pojo[prefix + foreignKey] || obj[persistorPropertyName].id || "";

                // Return copy if already there
                if (idMap[foreignId]) {
                    obj[prop] = idMap[foreignId];
                    obj[persistorPropertyName].isFetched = true;
                    obj[persistorPropertyName] = copyProps(obj[persistorPropertyName]);
                } else {
                    if (defineProperty['fetch'] || cascadeFetch || schema.parents[prop].fetch) {  // Only fetch ahead if requested
                        obj[prop] = null;
                        if (foreignId) {
                            var query = {_id: foreignId};
                            var options = {};
                            (function () {
                                var closureProp = prop;
                                var closurePersistorProp = persistorPropertyName;
                                var closureCascade = this.processCascade(query, options, cascadeFetch,
                                    (schema && schema.parents) ? schema.parents[prop].fetch : null, defineProperty.fetch);
                                var closureForeignId = foreignId;

                                var join = _.find(joins, function (j) {return j.template == defineProperty.type});

                                var fetcher = join ?
                                    this.getTemplateFromKnexPOJO(pojo, defineProperty.type, promises, idMap, closureCascade, isTransient, defineProperty,
                                                                 null, null, join.alias + "___") :
                                    this.getFromPersistWithKnexQuery(defineProperty.type, query, closureCascade, null, null, isTransient, idMap, {});
                                promises.push(fetcher.then(function(objs) {
                                        obj[closureProp] = objs[0];
                                        obj[closureProp] = idMap[closureForeignId];
                                        obj[closurePersistorProp].isFetched = true;
                                        obj[closurePersistorProp] = copyProps(obj[closurePersistorProp]);
                                    }.bind(this)));
                            }.bind(this))();
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
            } else
                if (typeof(pojo[prefix + prop]) != 'undefined') {
                    if (type == Date)
                        obj[prop] = pojo[prefix + prop] ? new Date(pojo[prefix + prop]) : null;
                    else if (type == Number)
                        obj[prop] = pojo[prefix + prop] ? pojo[prefix + prop] * 1 : null;
                    else if (type == Object || type == Array)
                        obj[prop] = pojo[prefix + prop] ? JSON.parse(pojo[prefix + prop]) : null;
                    else
                        obj[prop] = pojo[prefix + prop];
                }


            function copyProps(obj) {
                var newObj = {};
                for (var prop in obj)
                    newObj[prop] = obj[prop];
                return newObj;
            }

        }
        return topLevel ? this.resolveRecursivePromises(promises, obj).then(function (ret) {
            return Q(ret);
        }) : Q(obj);
    };

}