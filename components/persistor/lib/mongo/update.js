module.exports = function (PersistObjectTemplate) {

    var Q = require('q');

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
    PersistObjectTemplate.persistSaveMongo = function(obj, promises, masterId, idMap, txn) {
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
            if (!this._persistProperty(defineProperty) || !defineProperty.enumerable || typeof(value) == "undefined" || value == null) {

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
                if (!this._persistProperty(defineProperty) || !defineProperty.enumerable || typeof(value) == "undefined")
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
                                    values.push(this.persistSaveMongo(value[ix], promises, masterId, idMap));
                                }
                                // If it was this placed another document or another place in our document
                                // we don't add it as a sub-document
                                if (value[ix]._id && (idMap[value[ix]._id.toString()] ||    // Already processed
                                    value[ix]._id.replace(/:.*/, '') != masterId))          // or in another doc
                                {
                                    if (value[ix].__dirty__) // If dirty save it
                                        promises.push(this.persistSaveMongo(value[ix], promises, null, idMap));
                                    continue;  // Skip saving it as a sub-doc
                                }
                                // Save as sub-document
                                this.debug("Saving subdocument " + prop, 'save');
                                values.push(this.persistSaveMongo(value[ix], promises, masterId, idMap));
                            } else {
                                if (value[ix]._id && idMap[value[ix]._id.toString()]) // Previously referenced objects just get the id
                                    values.push(value[ix]._id.toString());
                                else // Otherwise recursively obtain pojo
                                    values.push(this.persistSaveMongo(value[ix], promises, masterId, idMap));
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
                                value[ix][foreignKey] = this._id;
                                value[ix].__dirty__ = true;
                            }
                            if (value[ix].__dirty__) {
                                this.debug("Saving " + prop + " as document because we updated it's foreign key", 'save');
                                promises.push(this.persistSaveMongo(value[ix], promises, null, idMap));
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
                    if (value == null)
                        pojo[foreignKey] = null;
                    else if (value._id && (idMap[value._id.toString()] || value._id.replace(/:.*/, '') != masterId))
                        pojo[foreignKey] = value._id.toString();

                    // otherwise as long as in same collection just continue saving the sub-document
                    else if (defineProperty.type.__collection__ == collection)
                        pojo[foreignKey] = this.persistSaveMongo(value, promises, masterId, idMap);

                    // If an a different collection we have to get the id generated
                    else {
                        // This should cause an id to be generated eventually
                        promises.push(this.persistSaveMongo(value, promises, null, idMap));
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
                    if (value && !value._id) {
                        value._id = this.getDBID().toString(); // Create one
                        value.__dirty__ = true;     // Will need to be saved
                    }
                    // Make sure we point to that id
                    if (!obj[foreignKey] || obj[foreignKey].toString != value._id.toString()) {
                        obj[foreignKey] = value ? value._id.toString() : null;
                    }
                    pojo[foreignKey] = value ? new this.ObjectID(obj[foreignKey]) : null;
                    if (value && value.__dirty__)
                        promises.push(this.persistSaveMongo(value, promises, null, idMap));
                }
            }
            else if (defineProperty.type == Date)
                pojo[prop] = obj[prop] ? obj[prop].getTime() : null;
            else
                pojo[prop] = obj[prop];
        }

        if (savePOJO)
            promises.push(this.savePojoToMongo(obj, pojo, isDocumentUpdate ? new this.ObjectID(obj._id) : null, txn));
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
     * @param options
     */
    PersistObjectTemplate.deleteFromPersistWithMongoQuery = function(template, query)
    {
        return PersistObjectTemplate.getFromPersistWithMongoQuery(template, query).then (function (objs) {
            var promises = [];
            objs.each(function(obj) {
                promises.push(obj.persistDelete());
            });
            return Q.all(promises);
        });
    }

    /**
     * Remove object from a collection/table
     *
     * @param options
     */
    PersistObjectTemplate.deleteFromPersistWithMongoId = function(template, id)
    {
        return PersistObjectTemplate.deleteFromMongoQuery(template, {_id: PersistObjectTemplate.ObjectID(id.toString())});
    }
}