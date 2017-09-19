module.exports = function (PersistObjectTemplate) {

    var Promise = require('bluebird');
    var _ = require('underscore');

    PersistObjectTemplate.concurrency = 10;

    PersistObjectTemplate.getFromPersistWithKnexId = function (template, id, cascade, isTransient, idMap, isRefresh, logger, enableChangeTracking) {
        return this.getFromPersistWithKnexQuery(null, template, {_id: id}, cascade, null, null, isTransient, idMap, null, null, isRefresh, logger, enableChangeTracking )
            .then(function(pojos) { return pojos[0] });
    }

    /**
     * A query is performed which joins the requested entity with any others that have a one-to-one relationship.
     * This yields and array of Pojos that have all of the columns from all of the related entities.
     * These Pojos are processed a template at a time, the processing for which may cause other sub-ordinate
     * entities to be fetched.  All fetches result in promises which ultimately must be resolved on a recursive
     * basis (e.g. keep resolving until there are no more newly added ones).
     *
     * @param {object} requests Array of pending requests
     * @param {object} template super type
     * @param {object/function} queryOrChains mongo style query or function callback
     * @param {object} cascade fetch spec.
     * @param {number} skip offset for the resultset
     * @param {number} limit number of records to return
     * @param {bool} isTransient unknown.
     * @param {object} idMap object mapper for cache
     * @param {object} options sort, limit, and skip options
     * @param {object} establishedObject {need to review, used for amorphic}
     * @param {bool} isRefresh {need to review}
     * @param {object} logger object template logger
     * @returns {*}
     */
    PersistObjectTemplate.getFromPersistWithKnexQuery = function (requests, template, queryOrChains, cascade, skip, limit, isTransient, idMap, options, establishedObject, isRefresh, logger, enableChangeTracking)
    {

        var topLevel = !requests;
        requests = requests || [];

        idMap = idMap || {};
        if (!idMap['resolver'])
            idMap['resolver'] = {};

        var promises = [];
        var schema = template.__schema__;
        var results = [];

        var joins = [];

        enableChangeTracking = enableChangeTracking || schema.enableChangeTracking;

        // Determine one-to-one relationships and add function chains for where
        var props = template.getProperties();
        var join = 1;
        for (var prop in props) {
            var defineProperty = props[prop];
            if (this._persistProperty(props[prop]) && props[prop].type && props[prop].type.__objectTemplate__ && props[prop].type.__table__) {
                // Create the join spec with two keys
                if (!schema || !schema.parents || !schema.parents[prop] || !schema.parents[prop].id)
                    throw  new Error(props[prop].type.__name__ + '.' + prop + ' is missing a parents schema entry');
                var foreignKey = schema.parents[prop].id;
                var cascadeFetch = (cascade && (typeof(cascade[prop]) != 'undefined')) ? cascade[prop] : null;
                if (((defineProperty['fetch'] && !defineProperty['nojoin']) || cascadeFetch ||
                    (schema.parents[prop].fetch == true  && !schema.parents[prop].nojoin)) &&
                    cascadeFetch != false && (!cascadeFetch || !cascadeFetch.nojoin))
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

        // Request to do entire processing to be executed right now or as part of a request queue
        var request = function () {
            return Promise.resolve(true)
              .then(getPOJOsFromQuery)
              .then(getTemplatesFromPOJOS.bind(this))
              .then(resolvePromises.bind(this))
        }

        // If at the top level we want to execute this requests and any that are appended during processing
        // Otherwise we are called from within the query results processor and this entire call is already
        // in a request so we just execute it.
        if (topLevel) {
            requests.push(request.bind(this));
            return this.resolveRecursiveRequests(requests, results)
        } else
            return request.call(this);

        function getPOJOsFromQuery () {
            return PersistObjectTemplate.getPOJOsFromKnexQuery(template, joins, queryOrChains, options, idMap['resolver'], logger);
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
                promises.push(PersistObjectTemplate.getTemplateFromKnexPOJO(pojo, template, requests, idMap, cascade, isTransient,
                    null, establishedObject, null, this.dealias(template.__table__) + '___', joins, isRefresh, logger, enableChangeTracking)
                    .then(function (obj) {
                        results[sortMap[obj._id]] = obj;
                    }))
            }.bind(this));
        }

        function resolvePromises () {
            return Promise.all(promises).then(function () {return Promise.resolve(results)});
        }
    }

    PersistObjectTemplate.resolveRecursiveRequests = function (requests, results) {
        return processRequests();
        function processRequests() {
            var segLength = requests.length;
            //console.log("Processing " + segLength + " promises " + PersistObjectTemplate.concurrency);
            return Promise.map(requests, function (request, _ix) {
                return request();
            }, {concurrency: PersistObjectTemplate.concurrency})
                .then(function () {
                    requests.splice(0, segLength);
                    if (requests.length > 0)
                        return processRequests();
                    else
                        return results;
                })
        }
    }

    /**
     * Enriches a "Plane Old JavaScript Object (POJO)" by creating it using the new Operator
     * so that all prototype information such as functions are created. It will reconstruct
     * references one-to-one and one-two-many by reading them from the database
     *  *
     * @param {object} pojo is the unadorned object
     * @param {obejct} template is the template used to create the object
     * @param {object} requests Array of pending requests
     * @param {object} idMap object mapper for cache
     * @param {object} cascade fetch spec.
     * @param {bool} isTransient unknown.
     * @param {object} defineProperty {@TODO need to check}
     * @param {object} establishedObj {@TODO need to review, used for amorphic}
     * @param {unknown} specificProperties {@TODO need to review}
     * @param {unknown} prefix {@TODO need to review}
     * @param {unknown} joins {@TODO need to review}
     * @param {bool} isRefresh {need to review}
     * @param {object} logger object template logger
     * @returns {*} an object via a promise as though it was created with new template()
     */
    PersistObjectTemplate.getTemplateFromKnexPOJO =
        function (pojo, template, requests, idMap, cascade, isTransient, defineProperty, establishedObj, specificProperties, prefix, joins, isRefresh, logger, enableChangeTracking)
        {
            var self = this;
            prefix = prefix || '';

            (logger || this.logger).debug({component: 'persistor', module: 'query', activity: 'process',
                data: {template: template.__name__, id: pojo[prefix + '_id'], persistedTemplate: pojo[prefix + '_template']}});


            // For recording back refs
            if (!idMap)
                throw 'missing idMap on fromDBPOJO';
            var topLevel = !requests;
            requests = requests || [];

            // In some cases the object we were expecting to populate has changed (refresh case)
            if (pojo && pojo[prefix + '_id'] && establishedObj && establishedObj._id && pojo[prefix + '_id'] != establishedObj._id)
                establishedObj = null;

            // We also get arrays of established objects
            if (establishedObj && establishedObj instanceof Array)
                establishedObj = _.find(establishedObj, function (o) {
                    if (o)
                        return o._id == pojo[prefix + '_id']
                    else {
                        (logger || this.logger).debug({component: 'persistor', module: 'query', activity: 'getTemplateFromKnexPOJO',
                            data: 'getTemplateFromKnexPOJO found an empty establishedObj ' + template.__name__});
                    }
                });

            // Create the new object with correct constructor using embedded ID if ObjectTemplate
            if (!establishedObj && !pojo[prefix + '_template'])
                throw new Error('Missing _template on ' + template.__name__ + ' row ' + pojo[prefix + '_id']);
            var persistTemplate = (template.__schema__ && template.__schema__.subsetOf) ?
              null : this.__dictionary__[pojo[prefix + '_template']]
            var obj = establishedObj || idMap[pojo[prefix + '_id']] ||
              this._createEmptyObject(persistTemplate || template,
                this.getObjectId(template, pojo, prefix), defineProperty, isTransient);

            // Once we find an object already fetched that is not transient query as normal for the rest
            if (!obj.__transient__  && !establishedObj && !isTransient)
                isTransient = false;

            var schema = obj.__template__.__schema__;
            this.withoutChangeTracking(function () {
                obj._id = pojo[prefix + '_id'];
                obj._template = pojo[prefix + '_template'];
            }.bind(this));
            if (!establishedObj && idMap[obj._id] && allRequiredChildrenAvailableInCache(idMap[obj._id], cascade))
                return Promise.resolve(idMap[obj._id]);

            idMap[obj._id] = obj;
            //console.log("Adding " + template.__name__ + "-" + obj._id + " to idMap");
            if (pojo[prefix + '__version__'])
                this.withoutChangeTracking(function () {
                    obj.__version__ = pojo[prefix + '__version__'];
                }.bind(this));

            // Go through all the properties and transfer them to newly created object
            var props = specificProperties || obj.__template__.getProperties();
            var value;
            for (var prop in props)
            {
                value = pojo[prefix + prop];
                defineProperty = props[prop];
                var type = defineProperty.type;
                var of = defineProperty.of;
                var cascadeFetch = (cascade && typeof(cascade[prop] != 'undefined')) ? cascade[prop] : null;

                // Create a persistor if not already there
                var persistorPropertyName = prop + 'Persistor';

                // Make sure this is property is persistent and that it has a value.  We have to skip
                // undefined values in case a new property is added so it can retain it's default value
                if (!this._persistProperty(defineProperty) || !defineProperty.enumerable)
                    continue;

                if (!type)
                    throw new Error(obj.__template__.__name__ + '.' + prop + ' has no type decleration');

                if (type == Array && of.__table__)
                {
                    if (!schema || !schema.children || !schema.children[prop])
                        throw  new Error(obj.__template__.__name__ + '.' + prop + ' is missing a children schema entry');
                    if (schema.children[prop].filter && (!schema.children[prop].filter.value || !schema.children[prop].filter.property))
                        throw new Error('Incorrect filter properties on ' + prop + ' in ' + obj.__template__.__name__);

                    if ((defineProperty['fetch'] || cascadeFetch || schema.children[prop].fetch) &&
                        cascadeFetch != false && !obj[persistorPropertyName].isFetching)
                    {
                        queueChildrenLoadRequest.call(this, obj, prop, schema, defineProperty);
                    } else
                        updatePersistorProp(obj, persistorPropertyName, {isFetched: false});

                } else if (type.isObjectTemplate && (schema || obj[prop] && obj[prop]._id))
                {
                    //var foreignId = (establishedObj && obj[prop]) ? obj[prop]._id : null;
                    if (!obj[prop])
                        this.withoutChangeTracking(function () {
                            obj[prop] = null;
                        }.bind(this));

                    // Determine the id needed
                    if (!schema || !schema.parents || !schema.parents[prop] || !schema.parents[prop].id)
                        throw  new Error(obj.__template__.__name__ + '.' + prop + ' is missing a parents schema entry');
                    var foreignKey = schema.parents[prop].id;
                    var foreignId = pojo[prefix + foreignKey] || (obj[persistorPropertyName] ? obj[persistorPropertyName].id : '') || '';

                    // Return copy if already there
                    var cachedObject = idMap[foreignId];
                    if (cachedObject && (!cascadeFetch  || !cascadeFetch.fetch || allRequiredChildrenAvailableInCache(cachedObject, cascadeFetch.fetch))) {
                        if (!obj[prop] || obj[prop].__id__ != cachedObject.__id__) {
                            this.withoutChangeTracking(function () {
                                obj[prop] = cachedObject;
                            }.bind(this));
                            updatePersistorProp(obj, persistorPropertyName, {isFetched: true, id:foreignId});
                        }
                    } else {
                        if ((defineProperty['fetch'] || cascadeFetch || schema.parents[prop].fetch) &&
                            cascadeFetch != false && !obj[persistorPropertyName].isFetching) {
                            if (foreignId) {
                                queueLoadRequest.call(this, obj, prop, schema, defineProperty, cascadeFetch, persistorPropertyName, foreignId);
                            } else {
                                updatePersistorProp(obj, persistorPropertyName, {isFetched: true, id: foreignId})
                            }
                        } else {
                            updatePersistorProp(obj, persistorPropertyName, {isFetched: false, id: foreignId})
                        }
                    }
                } else
                if (typeof(pojo[prefix + prop]) != 'undefined') {
                    value = pojo[prefix + prop];
                    this.withoutChangeTracking(function () {
                        if (type == Date)
                            obj[prop] = value ? new Date(value * 1) : null;
                        else if (type == Number)
                            obj[prop] = (!value && value !== 0) ? null : value * 1;
                        else if (type == Object || type == Array)
                            try {
                                obj[prop] = value ? JSON.parse(value) : null;
                            } catch (e) {
                                (logger || this.logger).debug({component: 'persistor', module: 'query', activity: 'getTemplateFromKnexPOJO',
                                    data: 'Error retrieving ' + obj.__id__ + '.' + prop + ' -- ' + e.message});
                                obj[prop] = null;
                            }
                        else
                            obj[prop] = value;
                        if (enableChangeTracking) {
                            obj['_ct_enabled_'] = true;
                            obj['_ct_org_' + prop] = value;
                        }
                    }.bind(this));
                }
            }
            if (topLevel)
                return this.resolveRecursiveRequests(requests, obj)
            else
                return Promise.resolve(obj);



            function collectLikeFilters (_prop, _query, thisDefineProperty, foreignFilterKey) {

                // Collect a structure of similar filters (excluding the first one)
                var filters = null;
                var excluded = 0; // Exclude first
                for (var candidateProp in props) {
                    var candidateDefineProp = props[candidateProp];
                    var filter = schema.children[candidateProp] ? schema.children[candidateProp].filter : null;
                    if (filter && filter.property == foreignFilterKey &&
                        candidateDefineProp.of.__table__ == thisDefineProperty.of.__table__ &&  excluded++) {
                        filters = filters || {};
                        filters[candidateProp] = {
                            foreignFilterKey: filter.property,
                            foreignFilterValue: filter.value,
                        }
                    }
                }
                return filters;
            }
            function buildFilterQuery(query, foreignFilterKey, foreignFilterValue, alternateProps) {
                if (alternateProps) {
                    query['$or'] = _.map(alternateProps, function(prop) {
                        var condition = {}
                        condition[prop.foreignFilterKey] = prop.foreignFilterValue;
                        return condition;
                    })
                    var condition = {}
                    condition[foreignFilterKey] =  foreignFilterValue;
                    query['$or'].push(condition);
                } else
                    query[foreignFilterKey] =  foreignFilterValue;
            }
            function updatePersistorProp(obj, prop, values) {
                self.withoutChangeTracking(function () {
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
                    if (modified) {
                        var tempProps = obj[prop];
                        obj[prop] = null;
                        obj[prop] = tempProps;
                    }
                });
            }

            function queueLoadRequest(obj, prop, schema, defineProperty, cascadeFetch, persistorPropertyName, foreignId) {
                var query = {_id: foreignId};
                var options = {};
                var closureProp = prop;
                var closurePersistorProp = persistorPropertyName;
                var closureCascade = this.processCascade(query, options, cascadeFetch,
                    (schema && schema.parents) ? schema.parents[prop].fetch : null, defineProperty.fetch);
                var closureForeignId = foreignId;
                var closureType = defineProperty.type;
                var closureDefineProperty = defineProperty;

                var join = _.find(joins, function (j) {return j.prop == prop});

                requests.push(generateQueryRequest.bind(this, join, query, closureProp,
                    closurePersistorProp, closureCascade, closureForeignId, closureType, closureDefineProperty));

                function generateQueryRequest() {
                    var fetcher = join ?
                        (pojo[join.alias + '____id'] ?
                            this.getTemplateFromKnexPOJO(pojo, closureType, requests, idMap,
                                closureCascade, isTransient, closureDefineProperty,
                                obj[closureProp], null, join.alias + '___', null, isRefresh, logger)
                            : Promise.resolve(true)) :
                        this.getFromPersistWithKnexQuery(requests, closureType, query, closureCascade,
                            null, null, isTransient, idMap, {}, obj[closureProp], isRefresh, logger);
                    this.withoutChangeTracking(function () {
                        obj[closurePersistorProp].isFetching = true;
                    }.bind(this));
                    return fetcher.then(function() {
                        this.withoutChangeTracking(function () {
                            obj[closureProp] = idMap[closureForeignId];
                        }.bind(this));
                        if (obj[closurePersistorProp]) {
                            updatePersistorProp(obj, closurePersistorProp, {isFetched: true, id: closureForeignId});
                        }
                    }.bind(this))
                }

            }

            function queueChildrenLoadRequest(obj, prop, schema, defineProperty) {

                var foreignFilterKey = schema.children[prop].filter ? schema.children[prop].filter.property : null;
                var foreignFilterValue = schema.children[prop].filter ? schema.children[prop].filter.value : null;
                // Construct foreign key query
                var query = {};
                var options = defineProperty.queryOptions || {sort: {_id: 1}};
                var limit = options.limit || null;
                query[schema.children[prop].id] = obj._id;
                if (foreignFilterKey) {
                    // accumulate hash of all like properties (except the first one)
                    var alternateProps = collectLikeFilters(prop, query, defineProperty, foreignFilterKey);
                    // If other than the first one just leave it for the original to take care of
                    if (alternateProps && alternateProps[prop])
                        return;
                    else
                        buildFilterQuery(query, foreignFilterKey, foreignFilterValue, alternateProps);
                }
                // Handle
                var closureOf = defineProperty.of;
                var closureProp = prop;
                var closurePersistorProp = persistorPropertyName
                var closureCascade = this.processCascade(query, options, cascadeFetch,
                    (schema && schema.children) ? schema.children[prop].fetch : null, defineProperty.fetch);

                // Fetch sub-ordinate entities and convert to objects
                this.withoutChangeTracking(function () {
                    obj[persistorPropertyName].isFetching = true;
                }.bind(this));
                requests.push(function () {
                    return this.getFromPersistWithKnexQuery(requests, closureOf, query, closureCascade, null,
                        limit, isTransient, idMap, options, obj[closureProp], isRefresh, logger)
                        .then(function(objs) {
                            this.withoutChangeTracking(function () {
                                if (foreignFilterKey) {
                                    obj[closureProp] =  _.filter(objs, function (obj) {
                                        return obj[foreignFilterKey] == foreignFilterValue;
                                    });
                                    if (alternateProps)
                                        _.each(alternateProps, function(alternateProp, alternatePropKey) {
                                            obj[alternatePropKey] = _.filter(objs, function (obj) {
                                                return obj[alternateProp.foreignFilterKey] == alternateProp.foreignFilterValue
                                            })
                                        })
                                } else
                                    obj[closureProp] = objs;
                            }.bind(this));
                            var start = options ? options.start || 0 : 0;
                            updatePersistorProp(obj, closurePersistorProp, {isFetched: true, start: start, next: start + objs.length})
                        }.bind(this))
                }.bind(this));

            }

            function allRequiredChildrenAvailableInCache(cachedObject, fetchSpec) {
                return Object.keys(fetchSpec).reduce(function(loaded, currentObj) {
                    return loaded && (!fetchSpec[currentObj] ||
                        (cachedObject[currentObj + 'Persistor'] && cachedObject[currentObj + 'Persistor'].isFetched))
                }, true);
            }
        };

}