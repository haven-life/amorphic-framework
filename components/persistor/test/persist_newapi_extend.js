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
        database: 'persistor_banking',
        user: 'postgres',
        password: 'postgres'
    }
});

var schema = {};
var schemaTable = 'index_schema_history';
var Employee, Person, empId;
var PersistObjectTemplate, ObjectTemplate;

describe('persistor transaction checks', function () {
    before('drop schema table once per test suit', function() {
        return Promise.all([knex.schema.dropTableIfExists('tx_person'),
            knex.schema.dropTableIfExists(schemaTable)]);
    })
    beforeEach('arrange', function () {
        ObjectTemplate = require('supertype');
        PersistObjectTemplate = require('../index.js')(ObjectTemplate, null, ObjectTemplate);
        schema.Person = {};
        schema.Person.table =  'tx_person';
        //schema.Employee.documentOf = 'tx_person';
        Person = PersistObjectTemplate.create('Person', {
            firstName: {type: String},
            lastName: {type: String}
        });
        Employee = Person.extend('Employee', {
            salary: {type: Number}
        });

        var emp = new Employee();
        emp.firstName = 'test firstName';
        emp.lastName = 'lastName';
        emp.salary = 10000;
        (function () {
            PersistObjectTemplate.setDB(knex, PersistObjectTemplate.DB_Knex);
            PersistObjectTemplate.setSchema(schema);
            PersistObjectTemplate.performInjections();

        })();
        return Promise.resolve(prepareData());

        function prepareData() {
            PersistObjectTemplate.performInjections();
            return syncTable(Employee)
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
        return Employee.persistorFetchById(empId)
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
});