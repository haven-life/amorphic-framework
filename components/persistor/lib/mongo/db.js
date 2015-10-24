module.exports = function (PersistObjectTemplate) {

    var Q = require('q');

    /* Mongo implementation of save */
    PersistObjectTemplate.savePojoToMongo = function(obj, pojo, updateID) {
        this.debug('saving ' + obj.__template__.__name__ + " to " + obj.__template__.__collection__, 'io');
        var origVer = obj.__version__;
        obj.__version__ = obj.__version__ ? obj.__version__ + 1 : 1;
        pojo.__version__ = obj.__version__;
        return Q.ninvoke(this.getDB(this.getDBAlias(obj.__template__.__collection__)).connection,
            "collection", this.dealias(obj.__template__.__collection__)).then (function (collection) {
            return (updateID ?  Q.ninvoke(collection, "update",
                    origVer  ? {__version__: origVer, _id: updateID} :
                    {_id: updateID}, pojo, {w:1}) :
                    Q.ninvoke(collection, "save", pojo, {w:1})
            ).then (function (error, count) {
                if (error instanceof Array)
                    count = error[0]; // Don't know why things are returned this way
                if (updateID && count == 0) {
                    obj.__version__ = origVer;
                    throw new Error("Update Conflict");
                }
                this.debug('saved ' + obj.__template__.__name__ + " to " + obj.__template__.__collection__, 'io');
                return Q(true);
            }.bind(this));
        }.bind(this));
    }
    PersistObjectTemplate.deleteFromMongoQuery = function(template, query) {
        return Q.ninvoke(this.getDB(this.getDBAlias(template.__collection__)).connection,
            "collection", this.dealias(template.__collection__), {w:1, fsync:true}).then (function (collection) {
            return Q.ninvoke(collection, "remove", query);
        });
    }

    PersistObjectTemplate.getPOJOFromMongoQuery = function(template, query, options) {
        this.debug("db." + template.__collection__ + ".find({" + JSON.stringify(query) + "})", 'io');
        return Q.ninvoke(this.getDB(this.getDBAlias(template.__collection__)).connection,
            "collection", this.dealias(template.__collection__)).then (function (collection) {
            options = options || {};
            if (!options.sort)
                options.sort = {_id:1};
            return Q.ninvoke(collection, "find", query, null, options).then( function (cursor) {
                return Q.ninvoke(cursor, "toArray")
            });
        });
    }

    PersistObjectTemplate.countFromMongoQuery = function(template, query) {
        return Q.ninvoke(this.getDB(this.getDBAlias(template.__collection__)).connection,
            "collection", this.dealias(template.__collection__)).then (function (collection) {
            return Q.ninvoke(collection, "find", query).then( function (cursor) {
                return Q.ninvoke(cursor, "count", false);
            });
        });
    }

    PersistObjectTemplate.distinctFromMongoQuery = function(template, field, query) {
        return Q.ninvoke(this.getDB(this.getDBAlias(template.__collection__)).connection,
            "collection", this.dealias(template.__collection__)).then (function (collection) {
            return Q.ninvoke(collection, "distinct", field, query)
        });
    }


    PersistObjectTemplate.getPOJOFromMongoId = function (template, id, cascade, isTransient, idMap) {
        var self = this;
        idMap = idMap || {};
        return this.getPOJOFromQuery(template, {_id: new this.ObjectID(id)}, idMap).then(function(pojos) {
            if (pojos.length > 0)
                return self.fromDBPOJO(pojos[0], template, null, null, idMap, cascade, null, null, isTransient);
            else
                return null;
        });
    }

}