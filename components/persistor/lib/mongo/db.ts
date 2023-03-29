export default function (PersistObjectTemplate) {
    const moduleName = `persistor/lib/mongo/db`;
    /* Mongo implementation of save */
    PersistObjectTemplate.savePojoToMongo = function(obj, pojo, updateID, _txn, logger) {
        const functionName = 'savePojoToMongo';
        (logger || this.logger).debug({
            module: moduleName,
            function: functionName,
            category: 'milestone',
            message: 'saving ' + obj.__template__.__name__ + ' to ' + obj.__template__.__collection__,
            data: {
                activity: 'write'
            }
        });
        var origVer = obj.__version__;
        obj.__version__ = obj.__version__ ? obj.__version__ + 1 : 1;
        pojo.__version__ = obj.__version__;
        var db = this.getDB(this.getDBAlias(obj.__template__.__collection__)).connection;
        var collection = db.collection(this.dealias(obj.__template__.__collection__));
        return (updateID ?
                collection.update(origVer  ? {__version__: origVer, _id: updateID} :  {_id: updateID}, pojo, {w:1}) :
                collection.save(pojo, {w:1})
        );
        // ).then (function (error, count) {
        //     if (error instanceof Array)
        //         count = error[0]; // Don't know why things are returned this way
        //     if (updateID && count == 0) {
        //         obj.__version__ = origVer;
        //         if (txn && txn.onUpdateConflict) {
        //             txn.onUpdateCoxnflict(pojo)
        //             txn.updateConflict =  new Error("Update Conflict");
        //         } else
        //             throw new Error("Update Conflict");
        //     }
        //     (logger || this.logger).debug({component: 'persistor', module: 'db', activity: 'write'}, 'saved ' + obj.__template__.__name__ + " to " + obj.__template__.__collection__);
        //     return true;
        // }.bind(this));
    }

    /**
     * Removes documents based on a query
     * @param {SuperType} template object to delete
     * @param {json} query mongo style queries
     * @param {object} _logger objecttemplate logger
     * @returns {object} commandresult of mongo client
     */
    PersistObjectTemplate.deleteFromMongoQuery = function(template, query, _logger) {
        var db = this.getDB(this.getDBAlias(template.__collection__)).connection;
        var collection = db.collection(this.dealias(template.__collection__));
        return collection.deleteMany(query, {w:1, fsync:true});
    };

    PersistObjectTemplate.getPOJOFromMongoQuery = async function(template, query, options, logger) {
        const functionName = 'getPOJOFromMongoQuery';
        (logger || this.logger).debug({
            module: moduleName,
            function: functionName,
            category: 'milestone',
            message: 'db.' + template.__collection__ + '.find({" + JSON.stringify(query) + "})',
            data: {
                activity: 'read'
            }
        });
        var db = this.getDB(this.getDBAlias(template.__collection__)).connection;
        var collection = db.collection(this.dealias(template.__collection__));
        options = options || {};
        if (!options.sort)
            options.sort = {_id:1};

        if (typeof(options) === "function") {
            return collection.find(query, undefined, options).toArray();
        }
        else {
            return collection.find(query, options).toArray();
        }
    };

    PersistObjectTemplate.countFromMongoQuery = function(template, query) {
        var db = this.getDB(this.getDBAlias(template.__collection__)).connection;
        var collection = db.collection(this.dealias(template.__collection__));
        return collection.countDocuments(query);
    };

    PersistObjectTemplate.distinctFromMongoQuery = function(template, field, query) {
        var db = this.getDB(this.getDBAlias(template.__collection__)).connection;
        var collection = db.collection(this.dealias(template.__collection__));
        return collection.distinct(field, query);
    };

    PersistObjectTemplate.getPOJOFromMongoId = function (template, id, _cascade, _isTransient, idMap) {
        idMap = idMap || {};
        return this.getPOJOFromQuery(template, {_id: new this.ObjectID(id)}, idMap).then(function(pojos) {
            if (pojos.length > 0)
                return pojos[0];
            else
                return null;
        });
    }

};