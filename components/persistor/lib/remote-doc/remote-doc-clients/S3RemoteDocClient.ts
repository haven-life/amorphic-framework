import { RemoteDocClient } from '../remote-doc-types/index.js';
import AWS from 'aws-sdk';
export class S3RemoteDocClient implements RemoteDocClient {

    private S3Instance: AWS.S3;
    private S3Host: string;

    constructor(remoteDocHost?: string) {
        this.S3Host = remoteDocHost || 'https://s3.amazonaws.com/';
    }

    /**
     * establish connection to s3
     *
     * @returns {Promise<AWS.S3>}
     */
    private async getConnection(bucket: string): Promise<AWS.S3> {

        if (!this.hasCredentials() || (this.hasCredentials() && !this.isCredentialsValid())) {

            const endPoint = `${this.S3Host}${bucket}`;

            let S3Instance = new AWS.S3({
                endpoint: endPoint,
                region: 'us-east-1',
                s3BucketEndpoint: true
            });

            return new Promise<AWS.S3>((resolve, reject) => {
                S3Instance.config.getCredentials((err: any) => {
                    if (err) {
                        return reject(err);
                    } else {
                        this.S3Instance = S3Instance;
                        return resolve(this.S3Instance);
                    }
                });
            });
        } else {
            return this.S3Instance;
        }
    };

    /**
     * placing a document in AWS.S3 storage.
     * handles both `create` and `update` scenarios.
     *
     * @param s3ObjectToBeUploaded - the specific item being uploaded to s3
     * @param {string} key - the unique identifier for this item within its s3 bucket
     * @param {string} bucket - the name of the s3 bucket
     * @param {string} contentType - the mime type of the content being uploaded
     * @returns {Promise<AWS.AWS.S3.PutObjectOutput>} - standard aws result object following an s3 upload
     */
    public async uploadDocument(s3ObjectToBeUploaded: AWS.S3.Body, key: string, bucket: string, contentType?: string): Promise<AWS.S3.PutObjectOutput> {

        const bucketParams: AWS.S3.PutObjectRequest = {
            Bucket: bucket,
            Key: key,
            Body: s3ObjectToBeUploaded,
            ContentType: contentType ? contentType : 'application/octet-stream'
        };

        const s3Conn = await this.getConnection(bucket);

        return new Promise((resolve, reject) => {
            (<AWS.S3>s3Conn).putObject(bucketParams, async (err: any, data: AWS.S3.PutObjectOutput) => {
                if (err) {
                    reject(err.message);
                } else {
                    resolve(data);
                }
            });
        });
    };


    /**
     * download s3 object by key.
     *
     * @param {string} key - the unique identifier for this item within its s3 bucket
     * @param {string} bucket - the name of the s3 bucket
     * @returns {Promise<AWS.S3.GetObjectOutput>} - standard aws result object following an s3 download
     */
    public async downloadDocument(key: string, bucket: string): Promise<any> {
        const bucketParams: AWS.S3.GetObjectRequest = {
            Bucket: bucket,
            Key: key
        };

        const s3Conn = await this.getConnection(bucket);

        return new Promise((resolve, reject) => {
            s3Conn.getObject(bucketParams, (err: Error, data: AWS.S3.GetObjectOutput) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(data ? data.Body : undefined);
                }
            });
        });
    };

    /**
     * assuming a versioned AWS.S3 bucket, deleting a document without supplying a version ID places a delete marker
     * on the object at the top of the stack. on subsequent get, the most recently placed object in that key space
     * will be returned. without permanent deletion (passing in version ID), all docs still exist in AWS.S3.
     *
     * @param {string} key - the unique identifier for this item within its s3 bucket
     * @param {string} bucket - the name of the s3 bucket
     * @param {string} versionId? - the versionId for the item in the case the bucket is versioned
     * @returns {Promise<any>}
     */
    public async deleteDocument(key: string, bucket: string, versionId?: string) {
        const params: AWS.S3.DeleteObjectRequest = {
            Bucket: bucket,
            Key: key
        };

        if (versionId) {
            params.VersionId = versionId;
        }

        const s3Conn = await this.getConnection(bucket);

        return new Promise<void>((resolve, reject) => {
            s3Conn.deleteObject(params, (err: Error, data: AWS.S3.DeleteObjectOutput) => {
                if (err) {
                    reject(err.message);
                } else {
                    resolve();
                }
            });
        });
    };

    private hasCredentials(): boolean {
        return this.S3Instance && this.S3Instance.config && Boolean(this.S3Instance.config.credentials);
    }

    private isCredentialsValid(): boolean {
        return !(<AWS.Credentials>this.S3Instance.config.credentials).expired;
    }
}
