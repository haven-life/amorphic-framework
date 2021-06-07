/*
 * Banking example shows PersistObjectTemplate
 * with remote object storage using S3RemoteDocClient
 */
const sinon = require('sinon');
const S3RemoteDocClient = require('../dist/lib/remote-doc/remote-doc-clients/S3RemoteDocClient').S3RemoteDocClient;
const expect = require('chai').expect;
const AssertionError = require('chai').AssertionError;
const ObjectTemplate = require('@haventech/supertype').default;
const PersistObjectTemplate = require('../dist/index.js')(ObjectTemplate, null, ObjectTemplate);
const logLevel = process.env.logLevel || 'debug';

PersistObjectTemplate.debugInfo = 'api;conflict;write;read;data';//'api;io';
PersistObjectTemplate.debugInfo = 'conflict;data';//'api;io';
PersistObjectTemplate.logger.setLevel(logLevel);

const sandbox = sinon.createSandbox();

const Customer = PersistObjectTemplate.create('Customer', {
    init: function (bankingDocumentValue) {
        this.bankingDocument = bankingDocumentValue;
    },
    bankingDocument: {
        type: String,
        isRemoteObject: true,
        remoteKeyBase: 'test-remote-key',
        value: null
    },
    bankingDocument_RemoteMIMEType: {
        type: String,
        value: 'application/pdf'
    }
});

const schema = {
    Customer: {
        documentOf: 'pg/customer'
    }
}

function clearCollection(template) {
    let collectionName = template.__collection__.match(/\//) ? template.__collection__ : 'mongo/' + template.__collection__;
    if (collectionName.match(/pg\/(.*)/)) {
        collectionName = RegExp.$1;
        return PersistObjectTemplate.dropKnexTable(template)
            .then(function () {
                return PersistObjectTemplate.synchronizeKnexTableFromTemplate(template).then(function() {return 0});
            });
    } else
        throw 'Invalid collection name ' + collectionName;
}

describe('Banking from pgsql Example persist_banking_s3', function () {
    let knex;

    afterEach(function() {
        sinon.restore();
    });

    let noBankingDocumentCustomer;

    before(async () => {
        knex = require('knex')({
            client: 'pg',
            connection: {
                host: process.env.dbPath,
                database: process.env.dbName,
                user: process.env.dbUser,
                password: process.env.dbPassword,

            }
        });
        PersistObjectTemplate.setRemoteDocConnection({
            persistorBucketName: 'test-bucket-persistor',
            persistorRemoteDocEnvironment: 'S3',
            persistorRemoteDocHostURL: 'https://localstack.com'
        });
        PersistObjectTemplate.setDB(knex, PersistObjectTemplate.DB_Knex,  'pg');
        PersistObjectTemplate.setSchema(schema);
        PersistObjectTemplate.performInjections(); // Normally done by getTemplates

        this.timeout(4000);

        const schemaTable = 'index_schema_history';
        await knex.schema.dropTableIfExists(schemaTable)
        const count = await clearCollection(Customer);
        expect(count).to.equal(0);

        noBankingDocumentCustomer = new Customer();

        PersistObjectTemplate.begin();
        noBankingDocumentCustomer.setDirty();
        const result = await PersistObjectTemplate.end();
        expect(result).to.equal(true);
    });

    context('when setting up config values', () => {
        it('transfers props to the base template', () => {
            expect(PersistObjectTemplate.remoteDocHostURL).to.eql('https://localstack.com');
            expect(PersistObjectTemplate.environment).to.eql('S3');
            expect(PersistObjectTemplate.bucketName).to.eql('test-bucket-persistor');
        });
    });

    context('when downloading an existing banking document', () => {
        const bankingDocumentData = 'initial data';
        let bankingDocumentCustomer;

        beforeEach(async () => {
            sinon.replace(S3RemoteDocClient.prototype, 'uploadDocument', () => (
                Promise.resolve()
            ));

            bankingDocumentCustomer = new Customer(bankingDocumentData);
            PersistObjectTemplate.begin();
            bankingDocumentCustomer.setDirty();

            const result = await PersistObjectTemplate.end();
            expect(result).to.equal(true);
        });

        context('errors', () => {
            const downloadDocumentError = new Error('failed to download document');

            beforeEach(() => {
                sinon.replace(S3RemoteDocClient.prototype, 'downloadDocument', () => (
                    Promise.reject(downloadDocumentError)
                ));
            });

            it('returns the original value for the remote field and logs error', async () => {
                try {
                    const fetchedBankDocCust = await Customer.getFromPersistWithId(bankingDocumentCustomer._id);
                } catch (e) {
                    expect(e.message).to.eql('there was a problem downloading the remote object from source');
                    // expect(fetchedBankDocCust.bankingDocument).to.eql(bankingDocumentData);
                }
            });
        });

        context('succeeds', () => {
            beforeEach(() => {
                sinon.replace(S3RemoteDocClient.prototype, 'downloadDocument', () => (
                    Promise.resolve(bankingDocumentData)
                ));
            });

            it('should match the remote', async () => {
                const fetchedBankDocCust = await Customer.getFromPersistWithId(bankingDocumentCustomer._id);
                expect(fetchedBankDocCust.bankingDocument).to.eql(bankingDocumentData);
            });
        });
    });

    context('when uploading a banking document', () => {
        let bankingDocumentStr = null;

        beforeEach(() => {
            sinon.replace(S3RemoteDocClient.prototype, 'downloadDocument', () => (
                Promise.resolve(bankingDocumentStr)
            ));
        });

        context('it succeeds', () => {
            beforeEach(() => {
                bankingDocumentStr = 'this should be stored remotely';
                sinon.replace(S3RemoteDocClient.prototype, 'uploadDocument', () => (
                    Promise.resolve()
                ));

                sandbox.spy(S3RemoteDocClient.prototype, 'uploadDocument');
            });

            afterEach(() => {
                sandbox.restore();
            });

            it('should send with correct mime type', async () => {
                let fetchedNoBankDocCust = await Customer.getFromPersistWithId(noBankingDocumentCustomer._id);

                const txn = PersistObjectTemplate.begin();
                fetchedNoBankDocCust.bankingDocument = bankingDocumentStr;
                fetchedNoBankDocCust.setDirty();

                await PersistObjectTemplate.end(txn);

                fetchedNoBankDocCust = await Customer.getFromPersistWithId(noBankingDocumentCustomer._id);
                expect(S3RemoteDocClient.prototype.uploadDocument.calledOnce).to.eql(true);
                expect(S3RemoteDocClient.prototype.uploadDocument.getCall(0).args.length).to.eql(4);
                expect(S3RemoteDocClient.prototype.uploadDocument.getCall(0).args[3]).to.eql('application/pdf');
            });

            it('should save to remote store', async () => {
                let fetchedNoBankDocCust = await Customer.getFromPersistWithId(noBankingDocumentCustomer._id);

                const txn = PersistObjectTemplate.begin();
                fetchedNoBankDocCust.bankingDocument = bankingDocumentStr;
                fetchedNoBankDocCust.setDirty();

                await PersistObjectTemplate.end(txn);

                fetchedNoBankDocCust = await Customer.getFromPersistWithId(noBankingDocumentCustomer._id);
                expect(fetchedNoBankDocCust.bankingDocument).to.eql(bankingDocumentStr);
            });
        });

        context('it errors', () => {
            let uploadError;
            beforeEach(() => {
                uploadError = new Error('Upload Failed');
                sinon.replace(S3RemoteDocClient.prototype, 'uploadDocument', () => (
                    Promise.reject(uploadError)
                ));
            });

            it('should rollback transaction on failure to save to remote store', async () => {
                let fetchedNoBankDocCust;

                try {
                    fetchedNoBankDocCust = await Customer.getFromPersistWithId(noBankingDocumentCustomer._id);
                    const txn = PersistObjectTemplate.begin();
                    fetchedNoBankDocCust.bankingDocument = 'this should have rolled back';
                    fetchedNoBankDocCust.setDirty();

                    await PersistObjectTemplate.end(txn);
                    expect.fail('Expected transaction to fail');
                } catch (e) {
                    if (e instanceof AssertionError) {
                        throw e;
                    }
                    expect(e).to.eql(uploadError);

                    fetchedNoBankDocCust = await Customer.getFromPersistWithId(noBankingDocumentCustomer._id);
                    expect(fetchedNoBankDocCust.bankingDocument).to.not.equal('this should have rolled back');
                    expect(fetchedNoBankDocCust.bankingDocument).to.equal(bankingDocumentStr);
                }
            });
        });
    });

    after('closes the database', function () {
        return knex.destroy();
    });
});
