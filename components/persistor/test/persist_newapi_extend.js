var chai = require('chai'),
    expect = require('chai').expect;

var chaiAsPromised = require('chai-as-promised');

chai.should();
chai.use(chaiAsPromised);

var Promise = require('bluebird');

var knexInit = require('knex');
var knex;

var schema = {};
var Employee, Person, Manager, empId, Address;
var PersistObjectTemplate, ObjectTemplate;

describe('persist newapi extend', function () {
    // this.timeout(5000);
    before('drop schema table once per test suit', async function() {
        knex = knexInit({
            client: 'pg',
            connection: {
                host: process.env.dbPath,
                database: process.env.dbName,
                user: process.env.dbUser,
                password: process.env.dbPassword,
            }
        });
        return await knex.schema.dropTableIfExists('tx_person')
    })
    after('closes the database', function () {
        return knex.destroy();
    });
    beforeEach('arrange', function () {
        ObjectTemplate = require('@haventech/supertype').default;
        PersistObjectTemplate = require('../dist/index.js')(ObjectTemplate, null, ObjectTemplate);
        schema.Person = {};
        schema.Person.table =  'tx_person';
        schema.Person.documentOf =  'tx_person';
        schema.Employee = {};
        schema.Person.parents = {
            manager: {
                id: 'person_id'
            },
            address: {
                id: 'address_id'
            }
        };
        Person = PersistObjectTemplate.create('Person', {
            firstName: {type: String},
            lastName: {type: String},
            age: { type: Number}
        });

        Address = PersistObjectTemplate.create('Address', {
            address1: {type: String},
            address2: {type: String}
        });

        schema.Address = {};


        Employee = Person.extend('Employee', {
            salary: {type: Number},
            manager: {type: Person}
        });

        Manager = Person.extend('Manager', {
            salary: {type: Number},
            address: {type: Address}
        });

        var emp = new Employee();
        emp.firstName = 'test firstName';
        emp.lastName = 'lastName';
        emp.salary = 10000;
        var manager = new Manager();
        manager.firstName = 'manager';

        var add = new Address();
        add.address1 = 'adress 1';
        add.address2 = 'adress 2';
        manager.address = add;

        emp.manager = manager;

        (function () {
            PersistObjectTemplate.setDB(knex, PersistObjectTemplate.DB_Knex);
            PersistObjectTemplate.setSchema(schema);
            PersistObjectTemplate.performInjections();

        })();
        return Promise.resolve(prepareData());

        function prepareData() {
            PersistObjectTemplate.performInjections();
            return syncTable(Employee)
                .then(syncTable.bind(this, Address))
                .then(createRecords.bind(this));


            function syncTable(template) {
                return PersistObjectTemplate.synchronizeKnexTableFromTemplate(template);
            }

            function createRecords() {
                var tx =  PersistObjectTemplate.beginDefaultTransaction();
                return emp.persist({transaction: tx, cascade: false}).then(function() {
                    return PersistObjectTemplate.commit({transaction: tx}).then(function() {
                        empId = emp._id;
                    });
                })
            }
        }
    });

    afterEach('remove tables and after each test', async function() {
        return await knex.schema.dropTableIfExists('tx_person')
    });

    it('persistorFetchById without fetch spec should not return the records', function () {
        return Employee.persistorFetchById(empId, {fetch: {manager:true}})
            .then(function(employee) {
                expect(employee.firstName).is.not.equal(null);
            });
    });
    it('fetch without fetch spec should not return the records', function () {
        return Employee.persistorFetchByQuery({salary: 10000}).then(function(employee) {
            expect(employee[0].firstName).is.equal(null);
        }).catch(function(err) {
            expect(err).not.equal(null);
        });
    });

    it('Use supertype to load all properties defined in the subtypes', function() {
        return loadPersons()
            .then(checkSubTypes);

        function loadPersons() {
            return Person.persistorFetchByQuery({}, {fetch: {manager: true, address: true}})
        }

        function checkSubTypes(persons) {
            expect(persons[0].manager).not.equal(undefined);
            expect(persons[1].address).not.equal(undefined);
        }
    });

    it('version should be reverted', function() {
        return loadPersons()
            .then(persistSaveToGenerateException);
           
        function loadPersons() {
            return Person.persistorFetchByQuery({}, {fetch: {manager: true, address: true}})
        }

        function persistSaveToGenerateException(persons) {
            var person = persons[0];
            person.age = 'to throw error';
            return person.persistSave().should.be.rejectedWith(Error, 'invalid input syntax for type double precision:')
                .then(() => {
                    expect(person.__version__).to.equal('1');
                    person.age = 10;
                    return person.persistSave().should.eventually.be.fulfilled;
                });
        }
    });
});