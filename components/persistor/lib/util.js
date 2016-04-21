module.exports = function (PersistObjectTemplate) {

    var Promise = require('bluebird');
    var _ = require('underscore');

    PersistObjectTemplate.ObjectID = require('mongodb-bluebird').mongodb.ObjectID;

    PersistObjectTemplate.createTransientObject = function (cb) {
        this.__transient__ = true;
        var obj = cb();
        this.__transient__ = false;
        return obj;
    }

    PersistObjectTemplate.saved = function (obj, txn) {
        delete obj['__dirty__'];
        delete obj['__changed__'];
        var dirtyObjects = txn ? txn.dirtyObjects : this.dirtyObjects;
        var savedObjects = txn ? txn.savedObjects : this.savedObjects;
        if (savedObjects)
            savedObjects[obj.__id__] = obj;
    }

    /**
     * Walk one-to-one links to arrive at the top level document
     * @param obj - subdocument object to start at
     */
    PersistObjectTemplate.getTopObject = function(obj) {
        var idMap = {};
        function traverse(obj) {
            idMap[obj.__id__] = obj;
            if (obj.__template__.__schema__.documentOf)
                return obj;
            var props = obj.__template__.getProperties();
            for (var prop in props) {
                var type = props[prop].type;
                var value = obj[prop];
                if (type && value && value.__id__ && !idMap[value.__id__]) {
                    var traversedObj = traverse(value);
                    if (traversedObj)
                        return traversedObj;
                }
            }
            return false;
        }
        return traverse(obj);
    }

    /**
     * Walk through all objects in a document from the top
     * @param obj - subdocument object to start at
     */
    PersistObjectTemplate.enumerateDocumentObjects = function(obj, callback) {

        var idMap = {};
        return traverse(obj);

        function traverse(obj, parentObj, prop) {
            if (!obj)
                return;
            callback.call(null, obj)
            var props = obj.__template__.getProperties();
            _.map(props, function (defineProperty, prop) {
                if (defineProperty.type == Array && defineProperty.of && defineProperty.of.isObjectTemplate)
                    if (!idMap[obj.__id__ + "-" + prop]) {
                        idMap[obj.__id__ + "-" + prop] = true;
                        _.map(obj[prop], function (value) {
                            traverse(value, obj, prop);
                        })
                    }

                if (defineProperty.type && defineProperty.type.isObjectTemplate) {
                    if (obj[prop]) {
                        if (!idMap[obj.__id__ + "-" + prop]) {
                            idMap[obj.__id__ + "-" + prop] = true;
                            traverse(obj[prop], obj, prop);
                        }
                    }
                }
            });
        }
    }

    PersistObjectTemplate.getTemplateByCollection = function (collection) {
        for (var prop in this._schema)
            if (this._schema[prop].documentOf == collection)
                return this.getTemplateByName(prop);
        throw new Error("Cannot find template for " + collection);
    }

    PersistObjectTemplate.checkObject = function (obj) {
        if (!obj.__template__)
            throw new Error("Attempt to save an non-templated Object");
        if (!obj.__template__.__schema__)
            throw  new Error("Schema entry missing for " + obj.__template__.__name__);
        var schema = obj.__template__.__schema__;
    }

    PersistObjectTemplate.createPrimaryKey = function (obj) {
        var key = (new PersistObjectTemplate.ObjectID).toString();
        if (PersistObjectTemplate.objectMap && !obj.__transient__)
            PersistObjectTemplate.objectMap[key] = obj.__id__;
        return key;
    }

    PersistObjectTemplate.getObjectId = function (template, pojo, prefix) {
        if (PersistObjectTemplate.objectMap && PersistObjectTemplate.objectMap[pojo[prefix + '_id'].toString()])
            return PersistObjectTemplate.objectMap[pojo[prefix + '_id'].toString()];
        else
            return 'persist' + template.__name__ + '-' + pojo[prefix + '_template'].replace(/.*:/,'') + "-" + pojo[prefix + '_id'].toString()
    }

    PersistObjectTemplate._persistProperty = function(defineProperty) {
        if (defineProperty.persist == false || defineProperty.isLocal == true)
            return false
        else
            return true;
    }

    /* Mongo implementation of open */
    PersistObjectTemplate.getDB = function(alias)
    {
        if (!this._db)
            throw  new Error("You must do PersistObjectTempate.setDB()");
        if (!this._db[alias || '__default__'])
            throw  new Error("DB Alias " + alias + " not set with corresponding PersistObjectTempate.setDB(db, type, alias)");
        return this._db[alias || '__default__'];
    }

    PersistObjectTemplate.dealias = function (collection) {
        return collection.replace(/\:.*/, '').replace(/.*\//,'')
    };

    PersistObjectTemplate.getDBAlias = function (collection) {
        if (!collection)
            return '__default__';
        return collection.match(/(.*)\//) ? RegExp.$1 : '__default__'
    };

    PersistObjectTemplate.getDBID = function (masterId)
    {
        if (!masterId)
            return new this.ObjectID();
        else
            return masterId.toString() + ":" + new this.ObjectID().toString();

    }

    PersistObjectTemplate.resolveRecursivePromises = function(promises, returnValue) {
        var promisesToResolve = promises.length;
        return Promise.all(promises).then(function() {
            promises.splice(0, promisesToResolve);
            return promises.length > 0 ? PersistObjectTemplate.resolveRecursivePromises(promises, returnValue)
                : Promise.resolve(returnValue);
        });
    }
}