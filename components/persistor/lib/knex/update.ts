module.exports = function (PersistObjectTemplate) {

    var Promise = require('bluebird');
    var _ = require('underscore');

    /**
     * Save the object to persistent storage
     *
     * A copy of the object is made which has only the persistent properties
     * and all objects references for objects not stored in the the document
     * replaced by foreign keys.  Arrays of objects not stored in the document
     * are adjusted such that their foreign keys point back to this object.
     * Any related objects stored in other documents are also saved.
     *
     * @param {object} obj  Only required parameter - the object to be saved
     * @param {object} txn transaction object -- can be used only in the end trasaction callback.
     * @param {object} logger object template logger
     * @returns {*}
     */
    PersistObjectTemplate.persistSaveKnex = function(obj, txn, logger) {

        (logger || this.logger).debug({component: 'persistor', module: 'db.persistSaveKnex', activity: 'pre', data:{template: obj.__template__.__name__, id: obj.__id__, _id: obj._id}});
        this.checkObject(obj);

        var template = obj.__template__;
        var schema = template.__schema__;
        var templateName = template.__name__;
        var isDocumentUpdate = obj.__version__ ? true : false;
        var props = template.getProperties();
        var promises = [];
        var dataSaved = {};

        obj._id = obj._id || this.createPrimaryKey(obj);
        var pojo = {_template: obj.__template__.__name__, _id: obj._id};

        /**
         *  Walk through all the properties and copy them to POJO with special treatment for
         *  references to templated objects where we have to maintain foreign key relationships
         */

        for (var prop in props)
        {

            var defineProperty = props[prop];
            var value = obj[prop];

            // Deal with properties we don't plan to save
            if (!this._persistProperty(defineProperty) || !defineProperty.enumerable || typeof(value) == 'undefined' || value == null) {

                // Make sure we don't wipe out foreign keys of non-cascaded object references
                if (defineProperty.type != Array &&
                    defineProperty.type && defineProperty.type.isObjectTemplate &&
                    obj[prop + 'Persistor'] && !obj[prop + 'Persistor'].isFetched && obj[prop + 'Persistor'].id &&
                    !(!schema || !schema.parents || !schema.parents[prop] || !schema.parents[prop].id)) {

                    pojo[schema.parents[prop].id] = obj[prop + 'Persistor'].id;
                    continue;
                }

                if (!this._persistProperty(defineProperty) || !defineProperty.enumerable || typeof(value) == 'undefined')
                    continue;
            }

            // Handle Arrays
            if (defineProperty.type == Array && defineProperty.of.isObjectTemplate)
            {
                // Arrays of Pojos just get saved
                if (!defineProperty.of.__table__) {
                    pojo[prop] = value;

                    // Templated arrays we need to make sure their foreign keys are up-to-date
                } else if (value instanceof Array) {
                    if (!schema.children[prop])
                        throw new Error('Missing children entry for ' + prop + ' in ' + templateName);
                    var childForeignKey = schema.children[prop].id;
                    if (schema.children[prop].filter && (!schema.children[prop].filter.value || !schema.children[prop].filter.property))
                        throw new Error('Incorrect filter properties on ' + prop + ' in ' + templateName);
                    var foreignFilterKey = schema.children[prop].filter ? schema.children[prop].filter.property : null;
                    var foreignFilterValue = schema.children[prop].filter ? schema.children[prop].filter.value : null;
                    value.forEach(function (referencedObj, ix) {

                        if (!referencedObj) {
                            (logger || this.logger).debug({component: 'persistor', module: 'db.persistSaveKnex'}, obj.__id__ + '.' + prop + '[' + ix + '] is null');
                            return;
                        }

                        if (!defineProperty.of.__schema__.parents)
                            throw new Error('Missing parent entry in ' + defineProperty.of.__name__ + ' for ' + templateName);

                        // Go through each of the parents in the schema to find the one matching this reference
                        _.each(defineProperty.of.__schema__.parents, function(parentSchemaEntry, parentProp) {

                            if (parentSchemaEntry.id == childForeignKey) {

                                // If anything is missing in the child such as the persistor property not having been
                                // setup or the filter property not being setup, fill in and set it dirty
                                if (!referencedObj[parentProp + 'Persistor'] || !referencedObj[parentProp + 'Persistor'].id ||
                                    referencedObj[parentProp + 'Persistor'].id != obj._id ||
                                    (foreignFilterKey ? referencedObj[foreignFilterKey] != foreignFilterValue : false))
                                {
                                    // Take care of filter property
                                    if (foreignFilterKey)
                                        referencedObj[foreignFilterKey] = foreignFilterValue;

                                    // Force parent pointer
                                    if (referencedObj[parentProp] != obj)
                                        referencedObj[parentProp] = obj;

                                    referencedObj.setDirty(txn);
                                }
                            }
                        })
                        if (!referencedObj._id)
                            referencedObj._id = this.createPrimaryKey(referencedObj);
                    }.bind(this));
                    if (schema.children[prop].pruneOrphans && obj[prop + 'Persistor'].isFetched)
                        promises.push(this.knexPruneOrphans(obj, prop, txn, foreignFilterKey, foreignFilterValue, logger));
                }
                updatePersistorProp(obj, prop + 'Persistor', {isFetching: false, isFetched: true});

                // One-to-One
            } else if (defineProperty.type && defineProperty.type.isObjectTemplate)
            {
                // Make sure schema is in order
                if (!schema || !schema.parents || !schema.parents[prop] || !schema.parents[prop].id)
                    throw   new Error(obj.__template__.__name__ + '.' + prop + ' is missing a parents schema entry');

                var foreignKey = (schema.parents && schema.parents[prop]) ? schema.parents[prop].id : prop;
                let isChanged = value && (!value._id || !value.__version__);
                if (value && !value._id) {
                    value._id = this.createPrimaryKey(value);
                }
                if (isChanged) {
                    value.setDirty(txn);
                }

                pojo[foreignKey] =  value ? value._id : null
                updatePersistorProp(obj, prop + 'Persistor', {isFetching: false, id: value ? value._id : null, isFetched: true})

                dataSaved[foreignKey] = pojo[foreignKey] || 'null';


            } else if (defineProperty.type == Array || defineProperty.type == Object) {
                pojo[prop] = (obj[prop] === null || obj[prop] === undefined)  ? null : JSON.stringify(obj[prop]);
                log(defineProperty, pojo, prop);
            } else if (defineProperty.type == Date) {
                pojo[prop] = obj[prop] ? obj[prop] : null;
                log(defineProperty, pojo, prop);
            } else if (defineProperty.type == Boolean) {
                pojo[prop] = obj[prop] == null ? null : (obj[prop] ? true : false);
                log(defineProperty, pojo, prop);
            }  else {
                pojo[prop] = obj[prop];
                log(defineProperty, pojo, prop);
            }
        }
        (logger || this.logger).debug({component: 'persistor', module: 'db', activity: 'dataLogging', data: {template: obj.__template__.__name__, _id: pojo._id, values: dataSaved}});

        promises.push(this.saveKnexPojo(obj, pojo, isDocumentUpdate ? obj._id : null, txn, logger))
        return Promise.all(promises)
            .then (function () {
                return obj
            });
        function log(defineProperty, pojo, prop) {
            if (defineProperty.logChanges)
                dataSaved[prop]  = pojo[prop];
        }
        function copyProps(obj) {
            var newObj = {};
            for (var prop in obj)
                newObj[prop] = obj[prop];
            return newObj;
        }
        function updatePersistorProp(obj, prop, values) {
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
    // /**
    //  * Remove objects from a collection/table
    //  *
    //  * @param {object} template supertype
    //  * @param {object/function} query conditions to use, can even pass functions to add extra conditions
    //  * @param {object} txn transaction object
    //  * @param {object} _logger objecttemplate logger
    //  */
    // PersistObjectTemplate.deleteFromPersistWithKnexQuery = function(template, query, txn, logger)
    // {
    //     return this.deleteFromKnexQuery(template, query, txn, logger);
    // }
    //
    // /**
    //  * Remove object from a collection/table
    //  *
    //  * @param options
    //  */
    // PersistObjectTemplate.deleteFromPersistWithKnexId = function(template, id, txn, logger)
    // {
    //     return this.deleteFromKnexId(template, id, txn, logger);
    // }

}