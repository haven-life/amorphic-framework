module.exports = function (PersistObjectTemplate) {

    var Q = require('q');
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
     * @param obj  Only required parameter - the object to be saved
     * @param promises
     * @param masterId - if we are here to save sub-documents this is the top level id
     * @param txn
     * @return {*}
     */
    PersistObjectTemplate.persistSaveKnex = function(obj, txn) {

        this.debug("Saving " + obj.__template__.__name__);
        this.checkObject(obj);

        var template = obj.__template__;
        var schema = template.__schema__;
        var templateName = template.__name__;
        var isDocumentUpdate = obj.__version__ ? true : false;
        var props = template.getProperties();

        obj._id = obj._id || this.createPrimaryKey();
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
            if (!this._persistProperty(defineProperty) || !defineProperty.enumerable ||
                typeof(value) == "undefined" || value == null) {

                // Make sure we don't wipe out foreign keys of non-cascaded object references
                if (defineProperty.type != Array &&
                    defineProperty.type && defineProperty.type.isObjectTemplate &&
                    obj[prop + 'Persistor'] && !obj[prop + 'Persistor'].isFetched && obj[prop + 'Persistor'].id &&
                    !(!schema || !schema.parents || !schema.parents[prop] || !schema.parents[prop].id))

                    pojo[schema.parents[prop].id] = obj[prop + 'Persistor'].id;

                continue;
            }
            // Handle Arrays
            if (defineProperty.type == Array && defineProperty.of.isObjectTemplate)
            {
                if (!defineProperty.of)
                    throw  new Error(templateName + "." + prop + " is an Array with no 'of' declaration");

                // Arrays of Pojos just get saved
                if (!defineProperty.of.__table__) {
                    pojo[prop] = value;

                    // Templated arrays we need to make sure their foreign keys are up-to-date
                } else if (value instanceof Array) {
                    if (!schema.children[prop])
                        throw new Error("Missing children entry for " + prop + " in " + templateName);
                    var foreignKey = schema.children[prop].id;
                    value.forEach(function (referencedObj) {
                        if (!defineProperty.of.__schema__.parents)
                            throw new Error("Missing parent entry in " + defineProperty.of.__name__ + " for " + templateName);
                        _.each(defineProperty.of.__schema__.parents, function(value, key) {
                            if (value.id == foreignKey) {
                                if(!referencedObj[key + 'Persistor'] || (referencedObj[key + 'Persistor'].id != obj._id)) {
                                    referencedObj.setDirty(txn);
                                }
                            }
                        })
                    });
                }
                updatePersistorProp(obj, prop + 'Persistor', {isFetching: false, isFetched: true});

                // One-to-One
            } else if (defineProperty.type && defineProperty.type.isObjectTemplate)
            {
                // Make sure schema is in order
                if (!schema || !schema.parents || !schema.parents[prop] || !schema.parents[prop].id)
                    throw   new Error(obj.__template__.__name__ + "." + prop + " is missing a parents schema entry");

                var foreignKey = (schema.parents && schema.parents[prop]) ? schema.parents[prop].id : prop;
                if (!value._id) {
                    value._id = this.createPrimaryKey();
                    value.setDirty(txn);
                }

                pojo[foreignKey] =  value._id;
                updatePersistorProp(obj, prop + 'Persistor', {isFetching: false, id: value._id, isFetched: true})

            } else if (defineProperty.type == Array || defineProperty.type == Object) {
                pojo[prop] = obj[prop] ? JSON.stringify(obj[prop]) : null;
            } else if (defineProperty.type == Date) {
                pojo[prop] = obj[prop] ? obj[prop] : null;
            } else if (defineProperty.type == Boolean) {
                pojo[prop] = obj[prop] == null ? null : (obj[prop] ? true : false);
            }  else
                pojo[prop] = obj[prop];
        }
        return this.saveKnexPojo(obj, pojo, isDocumentUpdate ? obj._id : null, txn)
            .then (function (){return obj});

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
    /**
     * Remove objects from a collection/table
     *
     * @param options
     */
    PersistObjectTemplate.deleteFromPersistWithKnexQuery = function(template, query, txn)
    {
        return this.deleteFromKnexQuery(template, query, txn);
    }

    /**
     * Remove object from a collection/table
     *
     * @param options
     */
    PersistObjectTemplate.deleteFromPersistWithKnexId = function(template, id, txn)
    {
        return this.deleteFromKnexId(template, id, txn);
    }

}