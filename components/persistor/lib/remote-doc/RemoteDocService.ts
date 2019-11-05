import { RemoteDocClient } from './remote-doc-types/index';
import { LocalStorageDocClient } from './remote-doc-clients/LocalStorageDocClient';
import { S3RemoteDocClient } from './remote-doc-clients/S3RemoteDocClient';

export class RemoteDocService {
    private remoteDocClient: RemoteDocClient;

    static new(remoteDocClient: string) {
        return new RemoteDocService().init(remoteDocClient);
    }

    private init(remoteDocClient: string): this {
        this.remoteDocClient = RemoteDocService.remoteDocClientFactory(remoteDocClient);
        return this;
    }

    public async uploadDocument(base64: string, key: string, bucket: string) {
        return this.remoteDocClient.uploadDocument(base64, key, bucket);
    }

    public async downloadDocument(key: string, bucket: string) {
        return this.remoteDocClient.downloadDocument(key, bucket);
    }

    public async deleteDocument(key: string, bucket: string) {
        return this.remoteDocClient.deleteDocument(key, bucket);
    }

    private static remoteDocClientFactory (remoteDocClient: string): RemoteDocClient {
        switch (remoteDocClient) {
            case 'S3':
                return new S3RemoteDocClient();
            case 'local':
                return new LocalStorageDocClient();
            default:
                throw new Error('no remote client specified.');
        }
    }
}