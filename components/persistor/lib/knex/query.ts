import { RemoteDocService } from '../remote-doc/RemoteDocService';
import { PersistorUtils } from '../utils/PersistorUtils';
import { PersistorCtx } from './PersistorCtx';

module.exports = function (PersistObjectTemplate) {
    const moduleName = `persistor/lib/knex/query`;
    var _ = require('underscore');

    PersistObjectTemplate.concurrency = 10;

    PersistObjectTemplate.getFromPersistWithKnexId = function (template, id, cascade, isTransient, idMap, isRefresh, logger, enableChangeTracking, projection) {
        return this.getFromPersistWithKnexQuery(null, template, {_id: id}, cascade, null, null, isTransient, idMap, null, null, isRefresh, logger, enableChangeTracking, projection)
            .then(pojos => pojos[0]);
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
     * @param {object} options order, limit, and skip options
     * @param {object} establishedObject {need to review, used for amorphic}
     * @param {bool} isRefresh {need to review}
     * @param {object} logger object template logger
     * @param {object} enableChangeTracking callback to get the change details
     * @param {object} projection types with property names, will be used to ignore the fields from selects
     * @returns {*}
     */
    PersistObjectTemplate.getFromPersistWithKnexQuery = function (requests, template, queryOrChains, cascade, skip, limit, isTransient, idMap, options, establishedObject, isRefresh, logger, enableChangeTracking, projection, orgCascade)
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
        options = options || {};
        var key = PersistorCtx.executionCtx?.asOfDate ? '_snapshot_id' : '_id';
        options.sort = options.sort || { [key]: 1};
        enableChangeTracking = enableChangeTracking || schema.enableChangeTracking;

        idMap['queryMapper'] = idMap['queryMapper'] || {};
        
        const keyIds = idMap['queryMapper'] && idMap['queryMapper'][`${template.__name__}___${JSON.stringify(queryOrChains)}`];
        var resultsPromise = [];
        if (keyIds && PersistorCtx.persistorCacheCtx) {
            keyIds.split(',').forEach(keyId => {
                if (idMap[keyId]) {
                    const obj = idMap[keyId];
                    cascade && resultsPromise.push(checkAllChildrenLoaded.call(this, obj, obj, cascade));
                }
            });
            return Promise.all(resultsPromise);
        }
        async function checkAllChildrenLoaded(parentObject, obj, fetchSpec, promiseHandlers) {
            if (!obj) {
                return Promise.resolve(parentObject);
            }
            promiseHandlers = promiseHandlers || [];
            for (const key of Object.keys(fetchSpec)) {
                const typeDef = obj.__template__.getProperties()[key]
                if (!typeDef.type.isObjectTemplate) {
                    continue;
                }
                if (typeDef.type === Array) {
                    for(obj of parentObject[key]){
                        await checkAllChildrenLoaded(obj, obj, fetchSpec[key].fetch, promiseHandlers)
                    }
                }
                else {
                    if (obj[key + 'Persistor'].isFetched && fetchSpec[key].fetch) {
                        await checkAllChildrenLoaded.call(this, obj, obj[key], fetchSpec[key].fetch, promiseHandlers);
                    }
        
                    if (!obj[key + 'Persistor'].isFetched) {
                        promiseHandlers.push(obj.fetchProperty.bind(obj, key, fetchSpec[key].fetch, {_id: obj[key + 'Persistor'].id}, isTransient, idMap, logger));
                    }
                }
            }

            return this.resolveRecursiveRequests(promiseHandlers, obj);
        }       
        // Determine one-to-one relationships and add function chains for where
        var props = this.getPropsRecursive(template);
        for (var prop in props) {
            var defineProperty = props[prop];
            if (cascade && !cascade[prop] && props[prop] && props[prop]['fetch'] && !props[prop]['nojoin']) {
                cascade[prop] = true; 
            }
            if (this._persistProperty(props[prop]) && props[prop].type && props[prop].type.__objectTemplate__ && props[prop].type.__table__) {
                this.generateJoins(prop, props[prop].type, 'parents', schema, cascade, orgCascade, joins, this.dealias(template.__table__));
            }
            else if (this._persistProperty(props[prop]) && props[prop].of && props[prop].of.__objectTemplate__ && props[prop].of.__table__) {
                this.generateJoins(prop, props[prop].of, 'children', schema, cascade, orgCascade, joins, this.dealias(template.__table__));
            }
        }

        options = options || {};
        if (skip)
            options.offset = skip;
        if (limit)
            options.limit = limit;
        // Request to do entire processing to be executed right now or as part of a request queue
        var request = function () {
            return Promise.resolve(true)
                .then(getPOJOsFromQuery)
                .then(getTemplatesFromPOJOS.bind(this))
        }

        // If at the top level we want to execute this requests and any that are appended during processing
        // Otherwise we are called from within the query results processor and this entire call is already
        // in a request so we just execute it.
        if (topLevel) {
            requests.push(request.bind(this));
            return this.resolveRecursiveRequests(requests, results)
        } else
            return request.call(this);

        function getPOJOsFromQuery() {
            return PersistObjectTemplate.getPOJOsFromKnexQuery(template, joins, queryOrChains, options, idMap['resolver'], logger, projection);
        }

        async function getTemplatesFromPOJOS(pojos) {
            joins.forEach(function (join) {
                pojos.forEach(function (pojo) {
                    pojo.__alias__ = pojo.__alias__ || [];
                    pojo.__alias__.push(join.template);
                    pojo.__allpojos__ = pojos;;
                });
            });
            const sortMap = {};
            let ix = 0;
            for (const pojo of pojos) {
                if (Object.keys(sortMap).includes(pojo[this.dealias(template.__table__) + '____id'])) {
                    continue; 
                }
                sortMap[pojo[this.dealias(template.__table__) + '____id']] = ix++;
                const obj = await PersistObjectTemplate.getTemplateFromKnexPOJO(pojo, template, requests, idMap, cascade, isTransient,
                    null, establishedObject, null, this.dealias(template.__table__) + '___', joins, isRefresh, logger, enableChangeTracking, projection, orgCascade);
                results[sortMap[obj._id]] = obj;

                idMap['queryMapper'] = idMap['queryMapper'] || {};
                const keyId = `${template.__name__}___${JSON.stringify(queryOrChains)}`;
                if (!idMap['queryMapper'][keyId]) {
                    idMap['queryMapper'][keyId] = pojo[this.dealias(template.__table__) + '____id'];
                }
                else {
                    idMap['queryMapper'][keyId] += ',' + pojo[this.dealias(template.__table__) + '____id'];
                }
                
                if (!queryOrChains || !Object.keys(queryOrChains).includes('_id')) {
                    idMap['queryMapper'][`${template.__name__}___${JSON.stringify({_id: pojo[this.dealias(template.__table__) + '____id']})}`] = pojo[this.dealias(template.__table__) + '____id']
                }
            }

            return results;
        }
    }

    PersistObjectTemplate.generateJoins = function (prop, propDef, schemaKey, schema, cascade, orgCascade, joins, childAlias, parentProp, visitedTypes) {
        visitedTypes = visitedTypes || [];
        
        if (!schema || !schema[schemaKey] || !schema[schemaKey][prop] || !schema[schemaKey][prop].id)
            throw new Error(propDef.type.__name__ + '.' + prop + ' is missing a parents schema entry');
        var foreignKey = schema[schemaKey][prop].id;
        var cascadeFetch = (cascade && (typeof (cascade[prop]) != 'undefined')) ? cascade[prop] : null;
        orgCascade = orgCascade || cascade;

        if (((propDef.props[prop] &&propDef.props[prop]['fetch'] && !propDef.props[prop]['nojoin']) || cascadeFetch ||
            (schema[schemaKey][prop].fetch == true && !schema[schemaKey][prop].nojoin)) &&
            cascadeFetch != false && (!cascadeFetch || !cascadeFetch.nojoin)) {
            const alias = this.dealias(propDef.__table__) + (joins.length + 1)
            const id = PersistorCtx.executionCtx?.asOfDate ? '_snapshot_id' : '_id';
            joins.push({
                prop: prop,
                template: propDef,
                parentKey: schemaKey === 'children' ? foreignKey : id,
                childKey: schemaKey === 'children' ? id : foreignKey,
                alias: alias,
                childAlias: childAlias,
                parentProp: parentProp,
                schemaFilter: schema[schemaKey][prop] && schema[schemaKey][prop].filter
            });
        }
    }

    PersistObjectTemplate.generateNextLevelJoins = function (prop, propDef, schemaKey, schema, cascade, orgCascade, joins, childAlias, parentProp, visitedTypes) {
        var fields = this.getPropsRecursive(propDef);
        const alias = this.dealias(propDef.__table__) + (joins.length + 1)
        for (var field in fields) {
            var cascadeFetch = (cascade && cascade[prop] && cascade[prop].fetch && (typeof (cascade[prop].fetch[field]) != 'undefined')) ? cascade[prop].fetch[field] : null;
            const typeFetch = fields[field] && fields[field].fetch && !fields[field]['nojoin'];
            if (!cascadeFetch && typeFetch) {
                cascadeFetch = true; 
            }
            var schemaFetch =(propDef.__schema__.children && propDef.__schema__.children[field] && propDef.__schema__.children[field].fetch)|| 
            (propDef.__schema__.parents && propDef.__schema__.parents[field] && propDef.__schema__.parents[field].fetch)
            var childType = fields[field].of || fields[field].type;
            if ((!cascadeFetch && !schemaFetch) || field === prop || visitedTypes.includes(parentProp  + prop + '_' + childType.__name__)) {
                continue;
            }
            visitedTypes.push((parentProp || '') + prop + '_' + childType.__name__);
            cascadeFetch = cascadeFetch || true;
            if (this._persistProperty(fields[field]) && fields[field].type && fields[field].type.__objectTemplate__ && fields[field].type.__table__) {
                this.generateJoins(field, fields[field].type , 'parents', propDef.__schema__, { [field]: {fetch: cascadeFetch} }, orgCascade, joins, alias, prop, visitedTypes);
            } else if (this._persistProperty(fields[field]) && fields[field].of && fields[field].of.__objectTemplate__ && fields[field].of.__table__) {
                this.generateJoins(field, fields[field].of, 'children', propDef.__schema__, { [field]: {fetch: cascadeFetch} }, orgCascade, joins, alias, prop, visitedTypes);
            }
        }
    }

    PersistObjectTemplate.resolveRecursiveRequests = function (requests, results) {
        return processRequests();
        async function processRequests() {
            var segLength = requests.length;
            
            await PersistorUtils.asyncMap(requests, PersistObjectTemplate.concurrency || 1, function (request, _ix) {
                return request();
            }.bind(this))
            requests.splice(0, segLength);
            if (requests.length > 0)
                return processRequests();
            else
                return results;
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
     * @param {object} enableChangeTracking callback to get the change details
     * @param {object} projection types with property names, will be used to ignore the fields from selects
     * @returns {*} an object via a promise as though it was created with new template()
     */
    PersistObjectTemplate.getTemplateFromKnexPOJO =
        async function (pojo, template, requests, idMap, cascade, isTransient, defineProperty, establishedObj, specificProperties, prefix, joins, isRefresh, logger, enableChangeTracking, projection, orgCascade)
        {
            const functionName = 'getTemplateFromKnexPOJO';
            let remoteDocService = null;
            var self = this;
            prefix = prefix || '';

            (logger || this.logger).debug({
                module: moduleName,
                function: functionName,
                category: 'milestone',
                data: {
                    template: template.__name__, id: pojo[prefix + '_id'],
                    persistedTemplate: pojo[prefix + '_template']
                }
            });
            
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
                        (logger || this.logger).debug({ 
                            module: moduleName,
                            function: functionName,
                            category: 'milestone',
                            message: 'getTemplateFromKnexPOJO found an empty establishedObj ' + template.__name__
                        });
                    }
                });

            // Create the new object with correct constructor using embedded ID if ObjectTemplate
            if (!establishedObj && !pojo[prefix + '_template'])
                throw new Error('Missing _template on ' + template.__name__ + ' row ' + pojo[prefix + '_id']);
            var persistTemplate = (template.__schema__ && template.__schema__.subsetOf) ?
              null : this.__dictionary__[pojo[prefix + '_template']]
            var obj = establishedObj || idMap[pojo[prefix + '_id']] ||
              this._createEmptyObject(persistTemplate || template,
                this.getObjectId(persistTemplate || template, pojo, prefix), defineProperty, isTransient);

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
            idMap['queryMapper'] = idMap['queryMapper'] || {};
            idMap['queryMapper'][`${obj.__template__.__name__}___${JSON.stringify({ _id: obj._id })}`] = obj._id;

            if (pojo[prefix + '__version__'])
                this.withoutChangeTracking(function () {
                    obj.__version__ = pojo[prefix + '__version__'];
                }.bind(this));

            // Go through all the properties and transfer them to newly created object
            var props = specificProperties || obj.__template__.getProperties();
            var value;

            if (enableChangeTracking) {
                obj.__template__['_ct_enabled_'] = true;
            }

            for (var prop in props)
            {
                value = pojo[prefix + prop];
                defineProperty = props[prop];
                var type = defineProperty.type;
                var of = defineProperty.of;
                const isRemoteDoc = PersistorUtils.isRemoteObjectSetToTrue(this.config && this.config.enableIsRemoteObjectFeature, defineProperty.isRemoteObject);
                var cascadeFetch = (cascade && typeof(cascade[prop] != 'undefined')) ? cascade[prop] : null;
                orgCascade = orgCascade || cascade;
                if (cascadeFetch && cascadeFetch.fetch) {
                    Object.keys(cascadeFetch.fetch).map(key => {
                        if (typeof cascadeFetch.fetch[key] === 'string') {
                            var fetchSpec = cascadeFetch.fetch[key];
                            var [, parentProp] = fetchSpec.match(/recursive:(.*)/)
                            var recursiveFetch = parentProp ? this.processRecursiveFetch(orgCascade, parentProp) : fetchSpec;
                            cascadeFetch.fetch[key] = recursiveFetch;
                        }
                    })
                }
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
                        updatePersistorProp(obj, persistorPropertyName, {isFetched: false});
                        queueChildrenLoadRequest.call(this, obj, prop, schema, defineProperty, projection, cascade);
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

                    if (enableChangeTracking) {
                        obj['_ct_org_' + prop] = foreignId !== '' ? foreignId : null;
                    }
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
                                updatePersistorProp(obj, persistorPropertyName, { isFetched: false, id: foreignId })
                                queueLoadRequest.call(this, obj, prop, type, schema, defineProperty, cascadeFetch, persistorPropertyName, foreignId, enableChangeTracking, projection, orgCascade);
                            } else {
                                updatePersistorProp(obj, persistorPropertyName, {isFetched: true, id: foreignId})
                            }
                        } else {
                            updatePersistorProp(obj, persistorPropertyName, {isFetched: false, id: foreignId})
                        }
                    }
                }
                else if (isRemoteDoc) {
                    remoteDocService = remoteDocService || RemoteDocService.new(this.environment, this.remoteDocHostURL);
                    // if we have a remote object type, fetch it and place it in the template
                    if (value && typeof value === 'string') {
                        try {
                            const document = await remoteDocService.downloadDocument(value, this.bucketName);

                            this.withoutChangeTracking(function () {
                                obj[prop] = document;
                            });
                        } catch (e) {
                            (logger || this.logger).error({
                                module: moduleName,
                                function: functionName,
                                category: 'milestone',
                                message: `there was a problem downloading the remote object from source.`,
                                error: e
                            });

                            throw new Error('there was a problem downloading the remote object from source');
                        }
                    } else {
                        (logger || this.logger).info({
                            module: moduleName,
                            function: functionName,
                            category: 'milestone',
                            message: 'fetch called on remote object with no remote address value'
                        });
                    }
                }
                else {
                    if (typeof(pojo[prefix + prop]) != 'undefined') {
                        value = pojo[prefix + prop];
                        this.withoutChangeTracking(function () {
                            if (type == Date)
                                obj[prop] = value ? new Date(value * 1) : null;
                            else if (type == Number) {
                                obj[prop] = (!value && value !== 0) ? null : value * 1;
                            }
                            else if (type == Object || type == Array) {
                                try {
                                    obj[prop] = value ? JSON.parse(value) : null;
                                } catch (e) {
                                    (logger || this.logger).debug({
                                        module: moduleName,
                                        function: functionName,
                                        category: 'milestone',
                                        message: 'Error retrieving ' + obj.__id__ + '.' + prop + ' -- ' + e.message,
                                        error: e
                                    });
                                    obj[prop] = null;
                                }
                            }
                            else {
                                obj[prop] = value;
                            }


                            if (enableChangeTracking) {
                                obj['_ct_org_' + prop] = obj[prop];
                            }
                        }.bind(this));
                    }
                }
            }
            if (topLevel)
                return this.resolveRecursiveRequests(requests, obj);
            else
                return Promise.resolve(obj);



            function collectLikeFilters (_prop, _query, thisDefineProperty, foreignFilterKey, fetchSpec) {

                // Collect a structure of similar filters (excluding the first one)
                var filters = null;
                var excluded = 0; // Exclude first
                for (var candidateProp in props) {
                    var candidateDefineProp = props[candidateProp];
                    var filter = schema.children[candidateProp] ? schema.children[candidateProp].filter : null;
                    var includedInFetch = fetchSpec && fetchSpec[candidateProp] && fetchSpec[candidateProp].fetch;
                    if (filter && filter.property == foreignFilterKey &&
                        candidateDefineProp.of.__table__ == thisDefineProperty.of.__table__ && includedInFetch && excluded++) {
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

            function queueLoadRequest(obj, prop, type, schema, defineProperty, cascadeFetch, persistorPropertyName, foreignId, enableChangeTracking, projection, orgCascade) {
                var query = {_id: foreignId};
                var options = {};
                var closureProp = prop;
                var closurePersistorProp = persistorPropertyName;
                var closureCascade = this.processCascade(query, options, cascadeFetch,
                    (schema && schema.parents) ? schema.parents[prop].fetch : null, defineProperty.fetch);
                var closureForeignId = foreignId;
                var closureType = defineProperty.type;
                var closureDefineProperty = defineProperty;
                 
                var join = _.filter(joins, function (j) { return j.prop == prop });
                var currentJoin = null;
                let allpojos = pojo.__allpojos__ && pojo.__allpojos__.find(currPojo =>  
                    join.find(j =>  {
                        currentJoin = j;
                        return currPojo[j.childAlias + '___' + j.parentKey.replace('_snapshot', '')] && 
                        currPojo[j.childAlias + '___' + j.parentKey.replace('_snapshot', '')] === obj._id
                    }));
            
                requests.push(generateQueryRequest.bind(this, join, query, closureProp,
                    closurePersistorProp, closureCascade, closureForeignId, closureType, closureDefineProperty));

                function generateQueryRequest() {
                        var fetcher =  allpojos && currentJoin &&
                        allpojos[currentJoin.alias + '____id'] ?
                            this.getTemplateFromKnexPOJO(pojo, closureType, requests, idMap,
                                closureCascade, isTransient, closureDefineProperty,
                                obj[closureProp], null, currentJoin.alias + '___', joins, isRefresh, logger, enableChangeTracking, projection, orgCascade)
                              : this.getFromPersistWithKnexQuery(requests, closureType, query, closureCascade,
                            null, null, isTransient, idMap, {}, obj[closureProp], isRefresh, logger, enableChangeTracking, projection, orgCascade);
                    
                        return fetcher.then(function () {
                        this.withoutChangeTracking(function () {
                            obj[closureProp] = idMap[closureForeignId];
                        }.bind(this));
                        if (obj[closurePersistorProp]) {
                            updatePersistorProp(obj, closurePersistorProp, { isFetched: true, id: closureForeignId });
                        }
                    }.bind(this))
                }
            }

            function queueChildrenLoadRequest(obj, prop, schema, defineProperty, projection, fetchSpec) {

                var foreignFilterKey = schema.children[prop].filter ? schema.children[prop].filter.property : null;
                var foreignFilterValue = schema.children[prop].filter ? schema.children[prop].filter.value : null;
                // Construct foreign key query
                var query = {};
                var options = defineProperty.queryOptions || {_id: 1};
                var limit = options.limit || null;
                query[schema.children[prop].id] = obj._id;
                if (foreignFilterKey) {
                    // accumulate hash of all like properties (except the first one)
                    var alternateProps = collectLikeFilters(prop, query, defineProperty, foreignFilterKey, fetchSpec);
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

                async function generateAllObjects(propJoins) {
                        if (!propJoins || propJoins.length === 0) {
                            return this.getFromPersistWithKnexQuery(requests, closureOf, query, closureCascade, null,
                                limit, isTransient, idMap, options, obj[closureProp], isRefresh, logger, null, projection, orgCascade);
                        }
                        const aliasIdKey = propJoins[0].alias + '____id';
                        const visited = [];
                        const aliasId = propJoins && pojo[aliasIdKey];
                        let allpojos = pojo.__allpojos__.reduce((final, currPojo) => { 
                            const result = propJoins.reduce((result, join ) => {
                                if (join  && !visited.includes(currPojo[join.alias + '___' + join.childKey.replace('_snapshot', '')])  && currPojo[join.alias + '___' + join.parentKey.replace('_snapshot', '')] === obj._id) {
                                    currPojo.__currentJoin__ = join;
                                    result.push(currPojo);
                                    visited.push(currPojo[join.alias + '___' + join.childKey.replace('_snapshot', '')]);
                                }
                                return result;
                            }, [])
                            final.push(...result);
                            return final;
                        }, []);
                        allpojos.sort((a, b) => a[a.__currentJoin__.alias + '____id'].localeCompare(b[b.__currentJoin__.alias + '____id']));
                        // allpojos = allpojos.filter((e, i) => allpojos.findIndex(a => a[aliasIdKey] === e[joaliasIdKey]) === i);
                        const allObjectsPromise = allpojos.map(p => this.getTemplateFromKnexPOJO(p, closureOf, requests, idMap,
                            closureCascade, isTransient, defineProperty,
                            obj[closureProp], null, p.__currentJoin__.alias + '___', joins, isRefresh, logger, enableChangeTracking, projection, orgCascade))
                       
                        return Promise.all(allObjectsPromise);
                }
                

                requests.push(function () {
                    var propJoins = _.filter(joins, function (j) { 
                        return !!j && j.prop == prop 
                    });

                    var fetch = generateAllObjects.call(this, propJoins);
                            
                    return fetch
                        .then(function (objs) {
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
                if (!fetchSpec) {
                    return true;
                }
                return Object.keys(fetchSpec).reduce(function(loaded, currentObj) {
                    return loaded && (!fetchSpec[currentObj] ||
                        (cachedObject[currentObj + 'Persistor'] && cachedObject[currentObj + 'Persistor'].isFetched))
                }, true);
            }
        };

}