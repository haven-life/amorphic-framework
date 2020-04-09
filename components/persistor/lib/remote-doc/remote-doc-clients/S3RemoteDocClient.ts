import { RemoteDocClient } from '../remote-doc-types/index';
import { S3, AWSError } from 'aws-sdk';

export class S3RemoteDocClient implements RemoteDocClient {

    private S3Instance: S3;

    /**
     * establish connection to s3
     *
     * @returns {Promise<S3>}
     */
    private async getConnection(bucket: string): Promise<S3> {

        if (!this.hasCredentials() || (this.hasCredentials() && !this.isCredentialsValid())) {

            const endPoint = 'https://s3.amazonaws.com/' + bucket;

            let S3Instance = new S3({
                endpoint: endPoint,
                region: 'us-east-1',
                s3BucketEndpoint: true
            });

            return new Promise<S3>((resolve, reject) => {
                S3Instance.config.getCredentials((err: AWS.AWSError) => {
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
     * placing a document in S3 storage.
     * handles both `create` and `update` scenarios.
     *
     * @param s3ObjectToBeUploaded - the specific item being uploaded to s3
     * @param {string} key - the unique identifier for this item within its s3 bucket
     * @param {string} bucket - the name of the s3 bucket
     * @returns {Promise<S3.PutObjectOutput>} - standard aws result object following an s3 upload
     */
    public async uploadDocument(s3ObjectToBeUploaded: string, key: string, bucket: string) {
        const bucketParams: S3.PutObjectRequest = {
            Bucket: bucket,
            Key: key,
            Body: s3ObjectToBeUploaded
        };

        const s3Conn = await this.getConnection(bucket);

        return new Promise((resolve, reject) => {
            (<AWS.S3>s3Conn).putObject(bucketParams, async (err: AWSError, data: S3.PutObjectOutput) => {
                if (err) {
                    reject(err.message);
                } else {
                    resolve();
                }
            });
        });
    };

    /**
     * download s3 object by key.
     *
     * @param {string} key - the unique identifier for this item within its s3 bucket
     * @param {string} bucket - the name of the s3 bucket
     * @returns {Promise<S3.GetObjectOutput>} - standard aws result object following an s3 download
     */
    public async downloadDocument(key: string, bucket: string): Promise<any> {
        const bucketParams: S3.GetObjectRequest = {
            Bucket: bucket,
            Key: key
        };

        const s3Conn = await this.getConnection(bucket);

        return new Promise((resolve, reject) => {
            s3Conn.getObject(bucketParams, (err: Error, data: S3.GetObjectOutput) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(data && data.Body ? data.Body.toString() : data.Body);
                }
            });
        });
    };

    /**
     * assuming a versioned S3 bucket, deleting a document without supplying a version ID places a delete marker
     * on the object at the top of the stack. on subsequent get, the most recently placed object in that key space
     * will be returned. without permanent deletion (passing in version ID), all docs still exist in S3.
     *
     * @param {string} key - the unique identifier for this item within its s3 bucket
     * @param {string} bucket - the name of the s3 bucket
     * @returns {Promise<any>}
     */
    public async deleteDocument(key: string, bucket: string) {
        const params: S3.DeleteObjectRequest = {
            Bucket: bucket,
            Key: key
        };

        const s3Conn = await this.getConnection(bucket);

        return new Promise((resolve, reject) => {
            s3Conn.deleteObject(params, (err: Error, data: S3.DeleteObjectOutput) => {
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