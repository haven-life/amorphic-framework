/**
 * the contract that we're using to define any remote document store clients
 */
export interface RemoteDocClient {
    /**
     *
     * @param document - the payload of the object we're trying to save
     * @param key - the unique key we're using to identify the document in the remote store
     * @param bucket - the bucket that we're storing the document in
     * @param contentType - the mime type of the object we're trying to store
     */
    uploadDocument(document: any, key: string, bucket: string, contentType: string);

    /**
     *
     * @param key - the unique key we're using to identify the document in the remote store
     * @param bucket - the bucket that we're storing the document in
     */
    downloadDocument(key: string, bucket: string);

    /**
     *
     * @param key - the unique key we're using to identify the document in the remote store
     * @param bucket - the bucket that we're storing the document in
     * @param versionId - optional version, used in the case that we don't want to delete the object entirely
     * but rather just go back a version
     */
    deleteDocument(key: string, bucket: string, versionId?: string);
}