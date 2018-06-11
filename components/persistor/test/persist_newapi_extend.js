var chai = require('chai'),
    expect = require('chai').expect;

var chaiAsPromised = require('chai-as-promised');

chai.should();
chai.use(chaiAsPromised);

var Promise = require('bluebird');

var knex = require('knex')({
    client: 'pg',
    connection: {
        host: '127.0.0.1',
        database: 'test',
        user: 'postgres',
        password: 'postgres'
    }
});

var schema = {};
var schemaTable = 'index_schema_history';
var Employee, Person, Manager, empId, Address;
var PersistObjectTemplate, ObjectTemplate;

describe('persistor transaction checks', function () {
    before('drop schema table once per test suit', function() {
        return Promise.all([knex.schema.dropTableIfExists('tx_person'),
            knex.schema.dropTableIfExists(schemaTable)]);
    })
    after('closes the database', function () {
        return knex.destroy();
    });
    beforeEach('arrange', function () {
        ObjectTemplate = require('supertype');
        PersistObjectTemplate = require('../index.js')(ObjectTemplate, null, ObjectTemplate);
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
            lastName: {type: String}
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

    afterEach('remove tables and after each test', function() {
        return Promise.all([
            knex.schema.dropTableIfExists('tx_person'),
            knex.schema.dropTableIfExists(schemaTable)]);
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
});