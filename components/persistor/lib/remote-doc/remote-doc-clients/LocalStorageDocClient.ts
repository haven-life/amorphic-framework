import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { RemoteDocClient } from '../remote-doc-types/index.js';

/**
 * mock remote object service - where we're writing these objects to the filesystem.
 */
export class LocalStorageDocClient implements RemoteDocClient {

    private fileBaseDirectory: string;

    constructor() {
        return this.init();
    }

    init(): this {
        let remoteDocStorageDir = path.join(os.tmpdir(), 'remoteDocStorageDir');

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
     * @param {string} contentType
     * @returns {Promise<any>}
     *
     * @TODO add content type into local testing solution
     */
    public async uploadDocument(obj: string, key: string, bucket: string, contentType: string) {
        return new Promise((resolve, reject) => {
            fs.writeFile(this.fileBaseDirectory + bucket + '_' +  key + '.txt', obj, (err: NodeJS.ErrnoException) => {
                if(err) {
                    reject(err);
                }
                resolve(undefined);
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
                    resolve(undefined);
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
            fs.writeFile(this.fileBaseDirectory + bucket + '_' +  key + '.txt', "DELETED / ROLLED BACK", (err: NodeJS.ErrnoException) => {
                if(err) {
                    reject(err);
                }
                resolve(undefined);
            });
        });
    };
}