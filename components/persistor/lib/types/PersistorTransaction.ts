export type PersistorTransaction = {
    id: number,
    dirtyObjects: object,
    savedObjects: object,
    touchObjects: object,
    deletedObjects: object,
    remoteObjects: Set<string> // identifiers for objects not stored directly in our db
    deleteQueries: {}
};