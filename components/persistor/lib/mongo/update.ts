module.exports = function (PersistObjectTemplate) {

    var Promise = require('bluebird');

    /**
     * Save the object to persistent storage
     *
     * A copy of the object is made which has only the persistent properties
     * and all objects references for objects not stored in the the document
     * replaced by foreign keys.  Arrays of objects not stored in the document
     * are adjusted such that their foreign keys point back to this object.
     * Any related objects stored in other documents are also saved.
     *
     * @param {Supertype} obj  Only required parameter - the object to be saved
     * @param {promises} promises accumulate promises for nested save
     * @param {string} masterId - if we are here to save sub-documents this is the top level id
     * @param {Array} idMap - already loaded objects are being cached
     * @param {Object} txn - uses persistobjecttemplate properties
     * @param {Object} logger = objecttemplate logger
     * @returns {POJO}
     */
    PersistObjectTemplate.persistSaveMongo = function(obj, promises, masterId, idMap, txn, logger) {
        if (!obj.__template__)
            throw new Error('Attempt to save an non-templated Object');
        if (!obj.__template__.__schema__)
            throw  new Error('Schema entry missing for ' + obj.__template__.__name__);
        var schema = obj.__template__.__schema__;

        // Trying to save other than top document work your way to the top
        if (!schema.documentOf && !masterId) {
            var originalObj = obj;
            (logger || this.logger).debug({component: 'persistor', module: 'update.persistSaveMongo', activity: 'save'}, 'Search for top of ' + obj.__template__.__name__);
            obj = this.getTopObject(obj);
            if (!obj)
                throw new Error('Attempt to save ' + originalObj.__template__.__name__ +
                    ' which subDocument without necessary parent links to reach top level document');
            schema = obj.__template__.__schema__;
            (logger || this.logger).debug({component: 'persistor', module: 'update.persistSaveMongo', activity: 'processing'}, 'Found top as ' + obj.__template__.__name__);
        }

        var collection = obj.__template__.__collection__;
        var resolvePromises = false;    // whether we resolve all promises
        var savePOJO = false;           // whether we save this entity or just return pojo

        if (!promises) {                // accumulate promises for nested saves
            promises = [];
            resolvePromises = true;
        }

        if (typeof(obj._id) == 'function') {
            var followUp = obj._id;
            obj._id = undefined;
        }
        var isDocumentUpdate = obj._id && typeof(masterId) == 'undefined';
        var id = obj._id ?
            (obj._id.toString().match(/:/) ?  //pseudo-id for sub-documents
                obj._id :
                (obj._id instanceof this.ObjectID ? obj._id : new this.ObjectID(obj._id))) :
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
            (logger || this.logger).debug({component: 'persistor', module: 'update.persistSaveMongo', activity: 'processing'},
                'Duplicate processing of ' + obj.__template__.__name__ + ':' + id.toString());
            return idMap[id.toString()];
        }
        (logger || this.logger).debug({component: 'persistor', module: 'update.persistSaveMongo', activity: 'save'},
            'Saving ' + obj.__template__.__name__ + ':' + id.toString() + ' master_id=' + masterId);

        var pojo = !isDocumentUpdate ? {_id: id, _template: obj.__template__.__name__} :
        {_template: obj.__template__.__name__};   // subsequent levels return pojo copy of object
        idMap[id.toString()] = pojo;

        // Enumerate all template properties for the object
        var template = obj.__template__;
        var templateName = template.__name__;
        var props = template.getProperties();
        var ix, foreignKey;
        for (var prop in props)
        {
            var defineProperty = props[prop];
            var isCrossDocRef = this.isCrossDocRef(template, prop, defineProperty);
            var value = obj[prop];
            if (!this._persistProperty(defineProperty) || !defineProperty.enumerable || typeof(value) == 'undefined' || value == null) {

                // Make sure we don't wipe out foreign keys of non-cascaded object references
                if (defineProperty.type != Array &&
                    defineProperty.type && defineProperty.type.isObjectTemplate &&
                    !(!isCrossDocRef || !defineProperty.type.__schema__.documentOf) &&
                    obj[prop + 'Persistor'] && !obj[prop + 'Persistor'].isFetched && obj[prop + 'Persistor'].id &&
                    !(!schema || !schema.parents || !schema.parents[prop] || !schema.parents[prop].id))
                {
                    pojo[schema.parents[prop].id] = new this.ObjectID(obj[prop + 'Persistor'].id.toString())
                    continue;
                }
                if (!this._persistProperty(defineProperty) || !defineProperty.enumerable || typeof(value) == 'undefined')
                    continue;
            }

            // For arrays we either just copy each element or link and save each element
            if (defineProperty.type == Array)
            {
                if (!defineProperty.of)
                    throw  new Error(templateName + '.' + prop + " is an Array with no 'of' declaration");

                // If type of pojo
                if (!defineProperty.of.__collection__)
                    pojo[prop] = value;

                // Is this a subdocument
                else if (!isCrossDocRef || !defineProperty.of.__schema__.documentOf)
                {
                    pojo[prop] = [];
                    if (value) {
                        var values = pojo[prop];
                        for (ix = 0; ix < value.length; ++ix)
                        {
                            // Is this a sub-document being treated as a cross-document reference?
                            // If so it's foreign key gets updated with our id
                            if (isCrossDocRef) {

                                (logger || this.logger).debug({component: 'persistor', module: 'update.persistSaveMongo',
                                    activity: 'processing'}, 'Treating ' + prop + ' as cross-document sub-document');

                                // Get the foreign key to be updated
                                if (!schema || !schema.children || !schema.children[prop] || !schema.children[prop].id)
                                    throw new Error(templateName + '.' + prop + ' is missing a children schema entry');
                                foreignKey = schema.children[prop].id;

                                // If not up-to-date put in our id
                                if (!value[ix][foreignKey] || value[ix][foreignKey].toString() != id.toString()) {
                                    value[ix][foreignKey] = id;
                                    value[ix].__dirty__ = true;
                                    (logger || this.logger).debug({component: 'persistor', module: 'update.persistSaveMongo',
                                        activity: 'processing'}, 'updated it\'s foreign key');
                                }

                                // If we were waiting to resolve where this should go let's just put it here
                                if ((typeof(value[ix]._id) == 'function'))
                                {   // This will resolve the id and it won't be a function anymore
                                    (logger || this.logger).debug({component: 'persistor', module: 'update.persistSaveMongo',
                                        activity: 'processing'}, prop + ' waiting for placement, ebmed as subdocument');
                                    values.push(this.persistSaveMongo(value[ix], promises, masterId, idMap, txn, logger));
                                }
                                // If it was this placed another document or another place in our document
                                // we don't add it as a sub-document
                                if (value[ix]._id && (idMap[value[ix]._id.toString()] ||    // Already processed
                                    value[ix]._id.replace(/:.*/, '') != masterId))          // or in another doc
                                {
                                    if (value[ix].__dirty__) // If dirty save it
                                        promises.push(this.persistSaveMongo(value[ix], promises, null, idMap, txn, logger));
                                    continue;  // Skip saving it as a sub-doc
                                }
                                // Save as sub-document
                                (logger || this.logger).debug({component: 'persistor', module: 'update.persistSaveMongo',
                                    activity: 'processing'}, 'Saving subdocument ' + prop);
                                values.push(this.persistSaveMongo(value[ix], promises, masterId, idMap, txn, logger));
                            } else {
                                if (value[ix]._id && idMap[value[ix]._id.toString()]) // Previously referenced objects just get the id
                                    values.push(value[ix]._id.toString());
                                else // Otherwise recursively obtain pojo
                                    values.push(this.persistSaveMongo(value[ix], promises, masterId, idMap, txn, logger));
                            }

                        }
                    }
                    // Otherwise this is a database reference and we must make sure that the
                    // foreign key points back to the id of this entity
                } else {
                    if (value instanceof Array)
                        for (ix = 0; ix < value.length; ++ix)
                        {
                            if (!schema || !schema.children || !schema.children[prop] || !schema.children[prop].id)
                                throw   new Error(obj.__template__.__name__ + '.' + prop + ' is missing a children schema entry');
                            foreignKey = schema.children[prop].id;
                            if (!value[ix][foreignKey] || value[ix][foreignKey].toString() != id.toString()) {
                                value[ix][foreignKey] = this._id;
                                value[ix].__dirty__ = true;
                            }
                            if (value[ix].__dirty__) {
                                (logger || this.logger).debug({component: 'persistor', module: 'update.persistSaveMongo',
                                    activity: 'processing'}, 'Saving ' + prop + ' as document because we updated it\'s foreign key');
                                promises.push(this.persistSaveMongo(value[ix], promises, null, idMap, txn, logger));
                            }
                        }
                }
            }
            // One-to-One or Many-to-One
            else if (defineProperty.type && defineProperty.type.isObjectTemplate)
            {
                foreignKey = (schema.parents && schema.parents[prop]) ? schema.parents[prop].id : prop;

                if (!isCrossDocRef || !defineProperty.type.__schema__.documentOf)  // Subdocument processing:
                {

                    // If already stored in this document or stored in some other document make reference an id
                    if (value == null)
                        pojo[foreignKey] = null;
                    else if (value._id && (idMap[value._id.toString()] || value._id.replace(/:.*/, '') != masterId))
                        pojo[foreignKey] = value._id.toString();

                    // otherwise as long as in same collection just continue saving the sub-document
                    else if (defineProperty.type.__collection__ == collection)
                        pojo[foreignKey] = this.persistSaveMongo(value, promises, masterId, idMap, txn, logger);

                    // If an a different collection we have to get the id generated
                    else {
                        // This should cause an id to be generated eventually
                        promises.push(this.persistSaveMongo(value, promises, null, idMap, txn, logger));
                        // If it is not generated then queue up a function to set it when we get 'round to it
                        (function () {
                            var closureId = value._id;
                            var closurePojo = pojo;
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
                        throw   new Error(obj.__template__.__name__ + '.' + prop + ' is missing a parents schema entry');

                    foreignKey = schema.parents[prop].id;
                    let isChanged = value && (!value._id || !value.__version__);
                    // Make sure referenced entity has an id
                    if (value && !value._id) {
                        value._id = this.getDBID().toString(); // Create one
                    }
                    if (isChanged) {
                        value.__dirty__ = true;     // Will need to be saved
                    }
                    // Make sure we point to that id
                    if (!obj[foreignKey] || obj[foreignKey].toString != value._id.toString()) {
                        obj[foreignKey] = value ? value._id.toString() : null;
                    }
                    pojo[foreignKey] = value ? new this.ObjectID(obj[foreignKey]) : null;
                    if (value && value.__dirty__)
                        promises.push(this.persistSaveMongo(value, promises, null, idMap, txn, logger));
                }
            }
            else if (defineProperty.type == Date)
                pojo[prop] = obj[prop] ? obj[prop].getTime() : null;
            else
                pojo[prop] = obj[prop];
        }

        if (savePOJO)
            promises.push(this.savePojoToMongo(obj, pojo, isDocumentUpdate ? new this.ObjectID(obj._id) : null, txn, logger));
        if (resolvePromises)
            return this.resolveRecursivePromises(promises, pojo).then(function (pojo) {
                pojo._id = obj._id;
                return pojo;
            });
        else
            return pojo;
    }

    /**
     * Remove objects from a collection/table
     *
     * @param {SuperType} template object to delete
     * @param {json} query mongo style queries
     * @param {object} logger objecttemplate logger
     * @returns {object} commandresult of mongo client
     */
    PersistObjectTemplate.deleteFromPersistWithMongoQuery = function(template, query, logger)
    {
        return PersistObjectTemplate.getFromPersistWithMongoQuery(template, query, undefined, undefined, undefined, undefined, undefined, undefined, logger).then (function (objs) {
            var promises = [];
            objs.forEach(function(obj) {
                promises.push(obj.persistDelete());
            });
            return Promise.all(promises);
        });
    };

    /**
     * Remove object from a collection/table
     *
     * @param {SuperType} template object to delete
     * @param {string} id mongo id
     * @param {object} logger objecttemplate logger
     * @returns {object} commandresult of mongo client
     */
    PersistObjectTemplate.deleteFromPersistWithMongoId = function(template, id, logger)
    {
        return PersistObjectTemplate.deleteFromMongoQuery(template, {_id: PersistObjectTemplate.ObjectID(id.toString())}, logger);
    }
}