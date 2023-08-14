/*
 * Banking example shows PersistObjectTemplate
 * with remote object storage using LocalStorageDocClient
 */
const sinon = require('sinon');
const LocalStorageDocClient = require('../dist/lib/remote-doc/remote-doc-clients/LocalStorageDocClient').LocalStorageDocClient;
const expect = require('chai').expect;
const AssertionError = require('chai').AssertionError;
const ObjectTemplate = require('@haventech/supertype').default;
const PersistObjectTemplate = require('../dist/index.js')(ObjectTemplate, null, ObjectTemplate);
const logLevel = process.env.logLevel || 'debug';

PersistObjectTemplate.debugInfo = 'api;conflict;write;read;data';//'api;io';
PersistObjectTemplate.debugInfo = 'conflict;data';//'api;io';
PersistObjectTemplate.logger.setLevel(logLevel);
PersistObjectTemplate.config = { enableIsRemoteObjectFeature: true };

const sandbox = sinon.createSandbox();
const remoteKeyBase = 'test-remote-key';
const DocHolder = PersistObjectTemplate.create('DocHolder', {
    init: function (bankingDocumentValue) {
        this.bankingDocument = bankingDocumentValue;
    },
    description: {type: String, value: 'general'},
    bankingDocument: {
        type: String,
        isRemoteObject: true,
        remoteKeyBase,
        value: null
    },
    bankingDocument_RemoteMIMEType: {
        type: String,
        value: 'application/pdf'
    }
});

const schema = {
    DocHolder: {
        documentOf: 'pg/dockholder'
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

describe('Banking from pgsql Example persist_s3', function () {
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
            persistorRemoteDocEnvironment: 'local',
            persistorRemoteDocHostURL: 'https://localstack.com'
        });
        await PersistObjectTemplate.setDB(knex, PersistObjectTemplate.DB_Knex,  'pg');
        await PersistObjectTemplate.setSchema(schema);
        await PersistObjectTemplate.performInjections(); // Normally done by getTemplates

        this.timeout(4000);

        const schemaTable = 'index_schema_history';
        await knex.schema.dropTableIfExists(schemaTable)
        const count = await clearCollection(DocHolder);
        expect(count).to.equal(0);

        noBankingDocumentCustomer = new DocHolder();

        PersistObjectTemplate.begin();
        await noBankingDocumentCustomer.setDirty();
        const result = await PersistObjectTemplate.end();
        expect(result).to.equal(true);
    });

    context('when setting up config values', () => {
        it('transfers props to the base template', () => {
            expect(PersistObjectTemplate.remoteDocHostURL).to.eql('https://localstack.com');
            expect(PersistObjectTemplate.environment).to.eql('local');
            expect(PersistObjectTemplate.bucketName).to.eql('test-bucket-persistor');
        });
    });

    context('when downloading an existing banking document', () => {
        const bankingDocumentData = 'initial data';
        let bankingDocumentCustomer;

        beforeEach(async () => {
            sinon.replace(LocalStorageDocClient.prototype, 'uploadDocument', () => (
                Promise.resolve()
            ));

            bankingDocumentCustomer = new DocHolder(bankingDocumentData);
            PersistObjectTemplate.begin();
            bankingDocumentCustomer.setDirty();

            const result = await PersistObjectTemplate.end();
            expect(result).to.equal(true);
        });

        context('errors', () => {
            const downloadDocumentError = new Error('failed to download document');

            beforeEach(() => {
                sinon.replace(LocalStorageDocClient.prototype, 'downloadDocument', () => (
                    Promise.reject(downloadDocumentError)
                ));
            });

            it('returns a top level error', async () => {
                try {
                    const fetchedBankDocCust = await DocHolder.getFromPersistWithId(bankingDocumentCustomer._id);
                } catch (e) {
                    expect(e.message).to.eql('there was a problem downloading the remote object from source');
                }
            });
        });

        context('succeeds', () => {
            beforeEach(() => {
                sinon.replace(LocalStorageDocClient.prototype, 'downloadDocument', () => (
                    Promise.resolve(bankingDocumentData)
                ));
            });

            it('should match the remote', async () => {
                const fetchedBankDocCust = await DocHolder.getFromPersistWithId(bankingDocumentCustomer._id);
                fetchedBankDocCust.bankingDocument = 'license';
                await fetchedBankDocCust.persistSave();
                expect(fetchedBankDocCust.bankingDocument).to.eql('license');
            });
        });
    });

    context('when uploading a banking document', () => {
        let bankingDocumentStr = null;

        context('it succeeds', () => {
            beforeEach(() => {
                bankingDocumentStr = 'this should be stored remotely';
                sandbox.spy(LocalStorageDocClient.prototype, 'uploadDocument');
            });

            afterEach(() => {
                sandbox.restore();
            });

            it('should send with correct mime type', async () => {
                let fetchedNoBankDocCust = await DocHolder.getFromPersistWithId(noBankingDocumentCustomer._id);

                const txn = PersistObjectTemplate.begin();
                fetchedNoBankDocCust.bankingDocument = bankingDocumentStr;
                fetchedNoBankDocCust.setDirty();

                await PersistObjectTemplate.end(txn);

                fetchedNoBankDocCust = await DocHolder.getFromPersistWithId(noBankingDocumentCustomer._id);
                expect(LocalStorageDocClient.prototype.uploadDocument.calledOnce).to.eql(true);
                expect(LocalStorageDocClient.prototype.uploadDocument.getCall(0).args.length).to.eql(4);
                expect(LocalStorageDocClient.prototype.uploadDocument.getCall(0).args[3]).to.eql('application/pdf');
            });

            it('should save to remote store with transaction', async () => {
                let fetchedNoBankDocCust = await DocHolder.getFromPersistWithId(noBankingDocumentCustomer._id);

                const txn = PersistObjectTemplate.begin();
                fetchedNoBankDocCust.bankingDocument = bankingDocumentStr;
                fetchedNoBankDocCust.description = 'success transaction - new remote store doc';
                fetchedNoBankDocCust.setDirty();

                await PersistObjectTemplate.end(txn);

                fetchedNoBankDocCust = await DocHolder.getFromPersistWithId(noBankingDocumentCustomer._id);
                expect(fetchedNoBankDocCust.bankingDocument).to.eql(bankingDocumentStr);
                expect(fetchedNoBankDocCust.description).equals('success transaction - new remote store doc');
            });
            it('should save to remote store without transaction', async () => {
                let fetchedNoBankDocCust = await DocHolder.getFromPersistWithId(noBankingDocumentCustomer._id);

                fetchedNoBankDocCust.bankingDocument = bankingDocumentStr;
                fetchedNoBankDocCust.description = 'success non transaction - new remote store doc';
                await fetchedNoBankDocCust.persistSave();

                fetchedNoBankDocCust = await DocHolder.getFromPersistWithId(noBankingDocumentCustomer._id);
                expect(fetchedNoBankDocCust.bankingDocument).to.eql(bankingDocumentStr);
                expect(fetchedNoBankDocCust.description).equals('success non transaction - new remote store doc');
            });
        });

        context('it errors on upload failures', () => {
            let uploadError;
            beforeEach(() => {
                uploadError = new Error('Upload Failed');
                sinon.replace(LocalStorageDocClient.prototype, 'uploadDocument', () => (
                    Promise.reject(uploadError)
                ));
            });
            it('should rollback transaction on failure to save to remote store - with transaction', async () => {
                try {
                    const fetchedNoBankDocCust = await DocHolder.getFromPersistWithId(noBankingDocumentCustomer._id);
                    const txn = PersistObjectTemplate.begin();
                    fetchedNoBankDocCust.bankingDocument = 'Updated by Transaction commit';
                    fetchedNoBankDocCust.description = 'failure transaction - remote store';
                    fetchedNoBankDocCust.setDirty();

                    await PersistObjectTemplate.end(txn);
                    expect.fail('Expected transaction to fail');
                } catch (e) {
                    if (e instanceof AssertionError) {
                        throw e;
                    }
                    const fetchedNoBankDocCust = await DocHolder.getFromPersistWithId(noBankingDocumentCustomer._id);
                    expect(e).to.eql(uploadError);

                    expect(fetchedNoBankDocCust.bankingDocument).to.not.equal('this should have rolled back');
                    expect(fetchedNoBankDocCust.bankingDocument).to.equal(bankingDocumentStr);
                    expect(fetchedNoBankDocCust.description).equals('success non transaction - new remote store doc');
                }
            });
            it('should rollback transaction on failure to save to remote store - without transaction', async () => {
                try {
                    const fetchedNoBankDocCust = await DocHolder.getFromPersistWithId(noBankingDocumentCustomer._id);
                    fetchedNoBankDocCust.bankingDocument = 'Updated by PersistSave with no transaction';
                    fetchedNoBankDocCust.description = 'failure non transaction - remote store';
                    await fetchedNoBankDocCust.persistSave();
                    
                    
                    expect.fail(`Expected transaction to fail ${noBankingDocumentCustomer._id}`);
                } catch (e) {
                    if (e instanceof AssertionError) {
                        throw e;
                    }
                    const fetchedNoBankDocCust = await DocHolder.getFromPersistWithId(noBankingDocumentCustomer._id);
                    expect(e).to.eql(uploadError);

                    expect(fetchedNoBankDocCust.bankingDocument).to.not.equal('this should have rolled back');
                    expect(fetchedNoBankDocCust.bankingDocument).to.equal(bankingDocumentStr);
                    expect(fetchedNoBankDocCust.description).equals('success non transaction - new remote store doc');
                }
            });
        });

        context('it saves db and loses doc connection, on intermittent connection failures', () => {
            let deleteError;
            let dbSaveError;
            let customer;
            beforeEach(async () => {
                customer = new DocHolder();
                PersistObjectTemplate.begin();
                await customer.setDirty();
                await PersistObjectTemplate.end();
                deleteError = new Error('delete failed');
                dbSaveError = new Error('db error');
                sinon.replace(LocalStorageDocClient.prototype, 'deleteDocument', () => (
                    Promise.reject(deleteError)
                ));
                sinon.replace(PersistObjectTemplate, 'saveKnexPojo', () => (
                    Promise.reject(dbSaveError)
                ));
                sandbox.spy(PersistObjectTemplate.logger, 'error');
                
            });
            afterEach(()=> {
                sandbox.restore();
            })
            it('should rollback without deleting remote doc - wih transaction', async () => {
                try {
                    const fetchedNoBankDocCust = await DocHolder.getFromPersistWithId(customer._id);
                    const txn = PersistObjectTemplate.begin();
                    fetchedNoBankDocCust.bankingDocument = 'Updated by PersistSave with no transaction';
                    fetchedNoBankDocCust.description = 'failure non transaction - remote store';
                    fetchedNoBankDocCust.setDirty();
                    await PersistObjectTemplate.end(txn);
                    expect.fail(`Expected transaction to fail ${customer._id}`);
                } catch (e) {
                    if (e instanceof AssertionError) {
                        throw e;
                    }
                    const fetchedNoBankDocCust = await DocHolder.getFromPersistWithId(customer._id);
                    expect(e).to.eql(dbSaveError);

                    expect(fetchedNoBankDocCust.bankingDocument).to.not.equal('this should have rolled back');
                    // since no current doc exist.
                    expect(fetchedNoBankDocCust.bankingDocument).to.equal(null);
                    expect(PersistObjectTemplate.logger.error.getCall(0).args[0].message).to.equal(`unable to rollback remote document with key:${remoteKeyBase}-${customer._id} and bucket: ${PersistObjectTemplate.bucketName}`);
                    expect(fetchedNoBankDocCust.description).equals('general');
                }
            });
            it('should rollback without deleting remote doc - without transaction', async () => {
                try {
                    const fetchedNoBankDocCust = await DocHolder.getFromPersistWithId(customer._id);
                    fetchedNoBankDocCust.bankingDocument = 'Updated by PersistSave with no transaction';
                    fetchedNoBankDocCust.description = 'failure non transaction - remote store';
                    await fetchedNoBankDocCust.persistSave();
                    expect.fail(`Expected transaction to fail ${customer._id}`);
                } catch (e) {
                    if (e instanceof AssertionError) {
                        throw e;
                    }
                    const fetchedNoBankDocCust = await DocHolder.getFromPersistWithId(customer._id);
                    expect(e).to.eql(dbSaveError);

                    expect(fetchedNoBankDocCust.bankingDocument).to.not.equal('this should have rolled back');
                    // since no current doc exist.
                    expect(fetchedNoBankDocCust.bankingDocument).to.equal(null);
                    expect(PersistObjectTemplate.logger.error.getCall(0).args[0].message).to.equal(`unable to rollback remote document with key:${remoteKeyBase}-${customer._id} and bucket: ${PersistObjectTemplate.bucketName}`);
                    expect(fetchedNoBankDocCust.description).equals('general');
                }
            });
        });
    });

    after('closes the database', function () {
        return knex.destroy();
    });
});
