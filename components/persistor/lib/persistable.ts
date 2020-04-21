import {SupertypeSession} from '@havenlife/supertype';
type Constructable<BC> = new (...args: any[]) => BC;


export class Persistor extends SupertypeSession {
    /**
     * @TODO: was typed `Persistor` but that's weird? doesn't work need to figure out what's going on.
     */
    static create(): any | undefined {return undefined}; 
    beginDefaultTransaction() : any {}

    /**
     * Creates A persistor transaction, and returns it
     */
    beginTransaction() : any {}
    endTransaction(persistorTransaction?, logger?) : any {}

    /**
     * Begin a transaction that will ultimately be ended with end. It is passed into setDirty so
     * dirty objects can be accumulated.  Does not actually start a knex transaction until end
     *
     * @param {bool} isDefault used for marking the transaction created as the default transaction
     * @returns {object} returns transaction object
     * @legacy  use beginTransaction instead
     */
    begin (isdefault?) : any {}

    /**
     * Ends a transaction
     *
     * @param persistorTransaction
     * @param logger
     * @legacy use commit instead
     * @async
     */
    end (persistorTransaction?, logger?) : any {};

    /**
     * Set the object dirty along with all descendant objects in the logical "document"
     *
     * @param {supertype} obj objecttempate
     * @param {object} txn persistobjecttemplate transaction object
     * @param {bool} onlyIfChanged mark dirty only if changed
     * @param {bool} noCascade, avoids loading children
     * @param {object} logger objecttemplate logger
     */
    setDirty (obj, txn?, onlyIfChanged?, noCascade?, logger?) {};

    /**
     * Called by <Template>.setAsDeleted
     * @param obj
     * @param txn
     * @param onlyIfChanged
     */
    setAsDeleted (obj, txn?, onlyIfChanged?) {};

    /**
     * Saves all objects that are not marked as dirty on a transaction
     *
     * @param txn
     * @param logger
     * @legacy Use persistorSave instead
     * @async
     */
    saveAll (txn?, logger?) : any {return undefined};
    setDB(db, type, alias) {};
    getPOJOFromQuery (template, query, options?, logger?) : any {}

    /**
     * Ends a transaction
     * @param options - See commitSchema in utils.ts for example options
     * @async
     */
    commit (options?) : any {};

    getPersistorProps () : any {}

    connect (connect : any, schema : any) : any {}
    dropAllTables () : any {}
    syncAllTables () : any {}
    onAllTables (callback : Function, concurrency? : number) : any {}

    debugInfo : any
    DB_Knex : any;

    countFromKnexQuery (template, queryOrChains, _logger?) : any {}
    dropKnexTable (template : string) : any {};
    synchronizeKnexTableFromTemplate (template : string, changeNotificationCallback? : any, forceSync? : boolean) : any {};
    setSchema(schema : any) {};
    appendSchema(schema : any) {};
    performInjections() {}
    config: any
    __transient__ : any
    objectMap: any
    static createTransientObject(callback : any) : any {};
}

export function ContainsPersistable<BC extends Constructable<{}>>(Base: BC) {
    return class extends Base {
        amorphic : Persistor;
    }
}

export function Persistable<BC extends Constructable<{}>>(Base: BC) {

    return class extends Base {

        // New names
        /**
         * Delete all objects matching a query
         * @param {JSON} query
         * @param {JSON} options
         * @returns {Object}
         * @async
         */
        static persistorDeleteByQuery(query, options?) : any {}

        /**
         * Fetch all objects matching a query
         * @param {JSON} query
         * @param {JSON} options
         * @returns {*}
         * @async
         */
        static persistorFetchByQuery (query, options?) : any {}
        /**
         * Return count of objects of this class given a json query
         *
         * @param {json} query mongo style queries
         * @param {object} options @TODO
         * @returns {Number
         * @async
         */
        static persistorCountByQuery (query, options?) : any {}


        /**
         * Fetch an object by id
         * @param {string} id mongo style id
         * @param {json} options @todo
         * @returns {*}
         * @async
         */
        static persistorFetchById (id, options?) : any {}
        static persistorIsKnex() : any{}
        static persistorGetTableName(alias?) : any{}
        static persistorGetParentKey(prop, alias?) : any{}
        static persistorGetPrimaryKey(alias?) : any{}
        static persistorGetChildKey(prop, alias?) : any{}

        /**
         * A way to get the handle to the underlying Knex client so that you can run raw queries
         * as long as you have the handle for the underlying client.
         * @returns Knex Handler
         */
        static persistorGetKnex() : any{}
        static persistorKnexParentJoin(targetTemplate, primaryAlias, targetAlias, joinKey) : any{}
        static persistorKnexChildJoin(targetTemplate, primaryAlias, targetAlias, joinKey) : any{}

        /**
         * New approach to saving a call in isomorphic apps. It takes all options in calls and saves them
         *
         * @param options
         * @async
         */
        persistorSave(options?) : any {};

        /**
         * Reloads object from database in case it has changed.
         * @param logger
         * @async
         */
        persistorRefresh(logger?) : any {}

        /**
         * Deletes an object if not passed a transaction, or sets it to be deleted on the transaction, to be committed when the transaction is committed
         * @param options
         * @async
         */
        persistorDelete (options?) : any {};

        /**
         * Checks to see if the object is stale (has been changed elsewhere)
         * @async
         */
        persistorIsStale () : any {}

        /**
         * Can generate object id even before saving the record to the database
         *
         * @returns the string id
         */
        generateId() : any {};

        
        objectId : string ;
        objectTemplateName : string ;
        
        _id: string;
        __version__: number;
        amorphic : Persistor;

        /**
         * Return a single instance of an object of this class given an id
         *
         * @param {string} id mongo style id
         * @param {bool} cascade, loads children if requested
         * @param {bool} isTransient - marking the laoded object as transient.
         * @param {object} idMap id mapper for cached objects
         * @param {bool} isRefresh force load
         * @param {object} logger objecttemplate logger
         * @returns {object}
         * @legacy Use persistorFetchById instead
         * @async
         */
        static getFromPersistWithId(id?, cascade?, isTransient?, idMap?, isRefresh?, logger?) : any{}

        /**
         * Return an array of objects of this class given a json query
         *
         * @param {json} query mongo style queries
         * @param {bool} cascade, loads children if requested
         * @param {numeric} start - starting position of the result set.
         * @param {numeric} limit - limit the result set
         * @param {bool} isTransient {@TODO}
         * @param {object} idMap id mapper for cached objects
         * @param {bool} options {@TODO}
         * @param {object} logger objecttemplate logger
         * @returns {object}
         * @legacy in favor of persistorFetchByQuery
         * @async
         */
        static getFromPersistWithQuery(query, cascade?, start?, limit?, isTransient?, idMap?, options?, logger?) : any {}
        
        /**
         * Delete objects given a json query
         *
         * @param {json} query mongo style queries
         * @param {object} txn persistObjectTemplate transaciton object
         * @param {object} logger objecttemplate logger
         * @returns {object}
         * @legacy in favor of persistorDeleteByQuery
         * @async
         */
        static deleteFromPersistWithQuery (query, txn?, logger?) : any{}

        /**
         * Delete objects given id
         *
         * @param {string} id mongo style id
         * @param {object} txn persistObjectTemplate transaciton object
         * @param {object} logger objecttemplate logger
         * @returns {object}
         * @legacy in favor of persistorDeleteByQuery
         * @async
         */
        static deleteFromPersistWithId (id, txn?, logger?) : any{}

        /**
         * Return count of objects of this class given a json query
         *
         * @param {json} query mongo style queries
         * @param {object} logger objecttemplate logger
         * @returns {Number}
         * @legacy in favor of persistorCountWithQuery
         * @async
         */
        static countFromPersistWithQuery(query?, logger?) : any{}

        /**
         * This gets the underlying table name of a type that is being mapped in schema.json.
         *
         * @legacy in favor of persistorGetTableName
         */
        static getTableName(alias?) : any{}

        /**
         * Gets a parent key
         *
         * @legacy in favor of persistorGetParentKey
         */
        static getParentKey(prop, alias?) : any{}


        /**
         * Gets a primary key
         *
         * @legacy in favor of persistorGetId
         */
        static getPrimaryKey(alias?) : any{}

        /**
         * Gets a child key
         *
         * @legacy in favor of persistorGetChildKey
         */
        static getChildKey(prop, alias?) : any{}


        /**
         * Gets the knex handler
         *
         * @legacy in favor of persistorGetKnex
         */
        static getKnex() : any{}


        /**
         * Gets a primary key
         *
         * @legacy in favor of persistorIsKnex
         */
        static isKnex() : any{}


        /**
         * @legacy in favor of persistorKnexParentJoin
         */
        static knexParentJoin(targetTemplate, primaryAlias, targetAlias, joinKey) : any{}

        /**
         * @legacy in favor of persistorKnexChildJoin
         */
        static knexChildJoin(targetTemplate, primaryAlias, targetAlias, joinKey) : any{}

        fetchProperty (prop, cascade?, queryOptions?, isTransient?, idMap?, logger?) : any{}
        fetch(cascade, isTransient?, idMap?, logger?) : any{}
        fetchReferences(options) : any{}

        /**
         *  Saves an object immediately, and if passed a transaction, marks it on the transaction as already saved
         *
         * @param txn - transaction
         * @param logger - logger object
         * @legacy - Use persistorSave OR cascadeSave (for multiple entities) OR setDirty (for daemon applications) for alternative approaches'
         * @async
         */
        persistSave (txn?, logger?) : any{}

        /**
         * Marks an object as dirty on a transaction
         *
         * @param txn
         * @param logger
         * @legacy Use persistorSave or setDirty instead
         * @async
         */
        persistTouch (txn?, logger?) : any{}
        persistDelete (txn?, logger?) : any{}

        /**
         * From the root object given (this), we set it, and all of its descendants as dirty, on either the txn passed into it
         * or the current or default transaction
         * @param any
         */
        cascadeSave(any) : any{}

        /**
         * Checks to see if we have the latest copy of an object
         * @async
         */
        isStale () : any{}
        persist (options) : any{}

        /**
         * Marks an object as dirty on the specified transaction
         *
         *  For daemons that may have multiple transactions in flight.
         * Begin()/End() bracket a transaction within which you indicate what is to be saved
         * End will save all the entities as a single Postgres transaction
         * If an update conflict occurs everything is rolled back and “Update Conflict” is thrown
         * Amorphic (web apps) will catch and retry. In daemons you must handle on your own
         * Web apps only save dirty object with cascadeSave so that is the preferred pattern
         * @param txn
         * @param onlyIfChanged
         * @param noCascade
         * @param logger
         */
        setDirty(txn?, onlyIfChanged?, noCascade?, logger?) : any{}

        /**
         * Delete any object in a transaction as part of a commit (setDirty delete variant)
         * @param txn
         * @param onlyIfChanged
         */
        setAsDeleted(txn?, onlyIfChanged?): any{}

        /**
         * Reloads object from database in case it has changed.
         * Same as persistorRefresh
         *
         * @param logger
         * @async
         */
        refresh (logger?) : any{};

        getTableName () : any {}
        getParentKey () : any {}
    };
}
