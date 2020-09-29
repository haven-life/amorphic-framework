export type PersistorTransaction = {
    updateConflict?: boolean;
    id: number;
    dirtyObjects: object;
    savedObjects: object;
    touchObjects: object;
    deletedObjects: object;
    remoteObjects: Set<string>; // identifiers for objects not stored directly in our db
    deleteQueries: DeleteQueries | {};
    postSave?: (txn: PersistorTransaction, logger: any, changeTracking: any) => Promise<any>;
    innerError?: Error;
    knex?: any;
    preSave?: (txn: PersistorTransaction, logger: any) => Promise<any>
};

export type DeleteQueries = Array<DeleteQuery>;

export type DeleteQuery = { __name__: string, __template__: any, queryOrChains: any };