export type PersistorTransaction = {
    id: number,
    dirtyObjects: object,
    savedObjects: object,
    touchObjects: object,
    deletedObjects: object,
    remoteObjects: Map<string, string> // identifiers for objects not stored directly in our db. key -> S3VersionId
    deleteQueries: {}
};
