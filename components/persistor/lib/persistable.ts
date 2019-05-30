import {SupertypeSession} from '@havenlife/supertype';
type Constructable<BC> = new (...args: any[]) => BC;


export class Persistor extends SupertypeSession {
    /**
     * @TODO: was typed `Persistor` but that's weird? doesn't work need to figure out what's going on.
     */
    static create(): any | undefined {return undefined}; 
    beginDefaultTransaction() : any {}
    beginTransaction(nodefault? : boolean) : any {}
    endTransaction(persistorTransaction?, logger?) : any {}
    begin (isdefault?) : any {}
    end (persistorTransaction?, logger?) : any {};
    setDirty (obj, txn?, onlyIfChanged?, noCascade?, logger?) {};
    setAsDeleted (obj, txn?, onlyIfChanged?) {};
    saveAll (txn?, logger?) : any {return undefined};
    setDB(db, type, alias) {};
    getPOJOFromQuery (template, query, options?, logger?) : any {}
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
        static persistorDeleteByQuery(query, options?) : any {}
        static persistorFetchByQuery (query, options?) : any {}
        static persistorCountByQuery (query, options?) : any {}
        static persistorFetchById (id, options?) : any {}
        static persistorIsKnex() : any{}
        static persistorGetTableName(alias?) : any{}
        static persistorGetParentKey(prop, alias?) : any{}
        static persistorGetPrimaryKey(alias?) : any{}
        static persistorGetChildKey(prop, alias?) : any{}
        static persistorGetKnex() : any{}
        static persistorKnexParentJoin(targetTemplate, primaryAlias, targetAlias, joinKey) : any{}
        static persistorKnexChildJoin(targetTemplate, primaryAlias, targetAlias, joinKey) : any{}

        persistorSave(options?) : any {};
        persistorRefresh(logger?) : any {}
        persistorDelete (options?) : any {};
        persistorIsStale () : any {}
        generateId() : any {};

        _id: string;
        __version__: number;
        amorphic : Persistor;

        // Legacy
        static getFromPersistWithId(id?, cascade?, isTransient?, idMap?, isRefresh?, logger?) : any{}
        static getFromPersistWithQuery(query, cascade?, start?, limit?, isTransient?, idMap?, options?, logger?) : any {}
        static deleteFromPersistWithQuery (query, txn?, logger?) : any{}
        static deleteFromPersistWithId (id, txn?, logger?) : any{}
        static countFromPersistWithQuery(query?, logger?) : any{}
        static getTableName(alias?) : any{}
        static getParentKey(prop, alias?) : any{}
        static getPrimaryKey(alias?) : any{}
        static getChildKey(prop, alias?) : any{}
        static getKnex() : any{}
        static isKnex() : any{}
        static knexParentJoin(targetTemplate, primaryAlias, targetAlias, joinKey) : any{}
        static knexChildJoin(targetTemplate, primaryAlias, targetAlias, joinKey) : any{}

        fetchProperty (prop, cascade?, queryOptions?, isTransient?, idMap?, logger?) : any{}
        fetch(cascade, isTransient?, idMap?, logger?) : any{}
        fetchReferences(options) : any{}
        persistSave (txn?, logger?) : any{}
        persistTouch (txn?, logger?) : any{}
        persistDelete (txn?, logger?) : any{}
        cascadeSave(any) : any{}
        isStale () : any{}
        persist (options) : any{}
        setDirty(txn?, onlyIfChanged?, noCascade?, logger?) : any{}
        setAsDeleted(txn?, onlyIfChanged?): any{}
        refresh (logger?) : any{};

        getTableName () : any {}
        getParentKey () : any {}
    };
}
