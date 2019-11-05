import * as fs from 'fs';
import * as path from 'path';
import { RemoteDocClient } from '../remote-doc-types/index';

/**
 * mock remote object service - where we're writing these objects to the filesystem.
 */
export class LocalStorageDocClient implements RemoteDocClient {

    private fileBaseDirectory: string;

    constructor() {
        return this.init();
    }

    init(): this {
        let remoteDocStorageDir = path.join(path.dirname(require.main.filename), 'remoteDocStorageDir');

        if (!fs.existsSync(remoteDocStorageDir)) {
            fs.mkdirSync(remoteDocStorageDir);
        }

        this.fileBaseDirectory = remoteDocStorageDir;
        return this;
    }

    /**
     * upload a document to local fs.
     *
     * @param {string} obj
     * @param {string} key
     * @param {string} bucket
     * @returns {Promise<any>}
     */
    public async uploadDocument(obj: string, key: string, bucket: string) {
        return new Promise((resolve, reject) => {
            fs.writeFile(this.fileBaseDirectory + bucket + '_' +  key + '.txt', obj, (err: NodeJS.ErrnoException) => {
                if(err) {
                    reject(err);
                }
                resolve();
            });
        });
    };

    /**
     * read the document from the filesystem.
     *
     * @param {string} key
     * @param {string} bucket
     * @returns {Promise<any>}
     */
    public async downloadDocument(key: string, bucket: string) {
        return new Promise((resolve, reject) => {
            fs.readFile(this.fileBaseDirectory + bucket + '_' + key + '.txt', (err: NodeJS.ErrnoException, data: Buffer) => {
                if(err) {
                    reject(err);
                }

                if(data) {
                    resolve(data.toString());
                } else {
                    resolve();
                }
            });
        });
    };

    /**
     * delete document from filesystem.
     *
     * @param {string} key
     * @param {string} bucket
     * @returns {Promise<any>}
     */
    public async deleteDocument(key: string, bucket: string) {
        return new Promise((resolve, reject) => {
            fs.unlink(this.fileBaseDirectory + bucket + '_' + key + '.txt', (err: NodeJS.ErrnoException) => {
                if (err) {
                    reject(err);
                }
                resolve();
            });
        });
    };
}