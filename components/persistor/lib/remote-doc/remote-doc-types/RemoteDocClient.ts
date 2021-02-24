export interface RemoteDocClient {
    uploadDocument(base64: string, key: string, bucket: string, contentType: string);
    downloadDocument(key: string, bucket: string);
    deleteDocument(key: string, bucket: string, versionId?: string);
}