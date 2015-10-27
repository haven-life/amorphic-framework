module.exports = function (PersistObjectTemplate) {

    var Q = require('q');

    PersistObjectTemplate.ObjectID = require('mongodb').ObjectID;

    PersistObjectTemplate.createTransientObject = function (cb) {
        this.__transient__ = true;
        var obj = cb();
        this.__transient__ = false;
        return obj;
    }

    PersistObjectTemplate.saved = function (obj, txn) {
        var dirtyObjects = txn ? txn.dirtyObjects : this.dirtyObjects;
        delete dirtyObjects[obj.__id__];
    }

    /**
     * Walk one-to-one links to arrive at the top level document
     * @param obj - subdocument object to start at
     */
    PersistObjectTemplate.getTopObject = function(obj) {
        var idMap = [];
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

    PersistObjectTemplate.createPrimaryKey = function () {
        return (new PersistObjectTemplate.ObjectID).toString();
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
        if (!this._db[alias])
            throw  new Error("DB Alias " + alias + " not set with corresponding PersistObjectTempate.setDB(db, type, alias)");
        return this._db[alias];
    }

    PersistObjectTemplate.dealias = function (collection) {
        return collection.replace(/\:.*/, '').replace(/.*\//,'')
    };

    PersistObjectTemplate.getDBAlias = function (collection) {
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
        return Q.all(promises).then(function() {
            promises.splice(0, promisesToResolve);
            return promises.length > 0 ? PersistObjectTemplate.resolveRecursivePromises(promises, returnValue)
                : Q.fcall(function(){return returnValue});
        });
    }
}