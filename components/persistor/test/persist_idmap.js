var expect = require('chai').expect;
var ObjectTemplate = require('@havenlife/supertype').default;
var PersistObjectTemplate = require('../dist/index.js')(ObjectTemplate, null, ObjectTemplate);


var Address = PersistObjectTemplate.create('Address', {});
var Customer = PersistObjectTemplate.create('Customer', {
    name: {type: String, value: 'test'},
    addresses: {type: Array, of: Address, value: []}
});

var schema = {
    Customer: {
        documentOf: 'customer_idmap',
        children: {
            addresses: {id: 'customer_id'}
        }
    },
    Address: {
        documentOf: 'address_idmap'
    }
}

var MongoClient = require('mongodb-bluebird');
var db;

function clearCollection(collectionName) {
    var collection = db.collection(collectionName);
    return collection.remove({}, {w:1}).then (function () {
        return collection.count()
    });
}

describe('IdMap checks', function () {

    before('opens the database for idmap checks', function () {
        return MongoClient.connect(`mongodb://${process.env.mongoHost}:27017/testpersist`).then(function (dbopen) {
            db = dbopen;
            PersistObjectTemplate.setDB(db);
            PersistObjectTemplate.setSchema(schema);
            PersistObjectTemplate.performInjections(); // Normally done by getTemplates
        }).then(function() {
            return clearCollection('customer_idmap')
        }).then(function (count) {
            expect(count).to.equal(0);
            return clearCollection('address_idmap')
        }).then(function (count) {
            expect(count).to.equal(0);
        }).catch(function (e) {
            throw e;
        });
    });

    after('close db connection', function() {
        return db.close();
    });

    it('checking flags..', function() {
        var cust = new Customer();
        var address1 = new Address();
        var address2 = new Address();
        cust.addresses.push(address1);
        cust.addresses.push(address2);
        var changedCallbackFlag = false;
        PersistObjectTemplate.MarkChangedArrayReferences = function() {
            changedCallbackFlag = true;
        };

        cust.setDirty(null, true);
        expect(changedCallbackFlag).to.equal(true);
    })

    it('create customers and addresses', function () {
        var cust = new Customer();
        var address1 = new Address();
        var address2 = new Address();
        cust.addresses.push(address1);
        cust.addresses.push(address2);
        return cust.persistSave();
    });

    it('fetch customer object', function() {
        return Customer.getFromPersistWithQuery({name: {$eq: 'test'}}).then(function(customers) {
            expect(customers[0].name).to.equal('test');
        })
    });


})