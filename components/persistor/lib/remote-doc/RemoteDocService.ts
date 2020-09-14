import { RemoteDocClient } from './remote-doc-types/index';
import { LocalStorageDocClient } from './remote-doc-clients/LocalStorageDocClient';
import { S3RemoteDocClient } from './remote-doc-clients/S3RemoteDocClient';

export type UploadDocumentResponse = {
    key: string,
    versionId?: string
};

export class RemoteDocService {
    private remoteDocClient: RemoteDocClient;

    static new(remoteDocClient: string, remoteDocHost?: string) {
        return new RemoteDocService().init(remoteDocClient, remoteDocHost);
    }

    private init(remoteDocClient: string, remoteDocHost?: string): this {
        this.remoteDocClient = RemoteDocService.remoteDocClientFactory(remoteDocClient, remoteDocHost);
        return this;
    }

    public async uploadDocument(base64: string, key: string, bucket: string): Promise<UploadDocumentResponse|any> {
        const uploadDocumentResponse = await this.remoteDocClient.uploadDocument(base64, key, bucket);
        return {
            key,
            versionId: (uploadDocumentResponse || {}).VersionId
        };
    }

    public async downloadDocument(key: string, bucket: string) {
        return this.remoteDocClient.downloadDocument(key, bucket);
    }

    public async deleteDocument(key: string, bucket: string, versionId?: string) {
        return this.remoteDocClient.deleteDocument(key, bucket, versionId);
    }

    private static remoteDocClientFactory (remoteDocClient: string, remoteDocHost?: string): RemoteDocClient {
        switch (remoteDocClient) {
            case 'S3':
                return new S3RemoteDocClient(remoteDocHost);
            case 'local':
                return new LocalStorageDocClient();
            default:
                throw new Error('no remote client specified.');
        }
    }
}
