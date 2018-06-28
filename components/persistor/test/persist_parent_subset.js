/*eslint-disable no-unused-vars*/
//need to disable this rule as the template definitions for testing are not being used
var chai = require('chai'),
    expect = require('chai').expect;

var chaiAsPromised = require('chai-as-promised');

chai.should();
chai.use(chaiAsPromised);

var ObjectTemplate = require('supertype');
var PersistObjectTemplate = require('../index.js')(ObjectTemplate, null, ObjectTemplate);
var Promise = require('bluebird');
var knexInit = require('knex');
var knex;

var schema = {};
var schemaTable = 'index_schema_history';


describe('persistor transaction checks', function () {
    before('arrange', function (done) {
        knex = knexInit({
            client: 'pg',
            connection: {
                host: process.env.dbPath,
                database: process.env.dbName,
                user: process.env.dbUser,
                password: process.env.dbPassword,
            }
        });
        (function () {
            PersistObjectTemplate.setDB(knex, PersistObjectTemplate.DB_Knex);
            PersistObjectTemplate.setSchema(schema);
            PersistObjectTemplate.performInjections();

        })();
        return Promise.all([
            knex.schema.dropTableIfExists('employee_parent').then(function () {
                return knex.schema.dropTableIfExists('employee_parent');
            }),
            knex.schema.dropTableIfExists('employee_subset').then(function () {
                return knex.schema.dropTableIfExists('employee_subset');
            }),
            knex.schema.dropTableIfExists('tx_employee_parentchild_subset').then(function () {
                return knex.schema.dropTableIfExists('tx_employee_parentchild_subset');
            }),
            knex.schema.dropTableIfExists(schemaTable)
        ]).should.notify(done);
    });
    after('closes the database', function () {
        return knex.destroy();
    });

    it('Creating multiple levels objects, only parent object can have the schema entry', function () {
        schema.Employee = {};
        schema.Employee.table = 'employee_parent';

        var Employee = PersistObjectTemplate.create('Employee', {});
        var Manager = Employee.extend('Manager', {});
        var RegionalManager = Manager.extend('RegionalManager', {});

        PersistObjectTemplate._injectIntoTemplate(RegionalManager);
    });

    it('Creating multiple levels objects, using table property', function () {
        schema.Employee = {};
        schema.Employee.documentOf = 'employee_parent';
        schema.Manager = {};
        schema.Manager.table = 'employee_parent';

        var Employee = PersistObjectTemplate.create('Employee', {});
        var Manager = Employee.extend('Manager', {});
        var RegionalManager = Manager.extend('RegionalManager', {});

        PersistObjectTemplate._injectIntoTemplate(RegionalManager);
    });

    it('get top template object, call without having params and without assigning documentOf property within the hierarchy..', function() {
        schema.Employee = {};
        var Employee = PersistObjectTemplate.create('Employee', {});

        var emp = new Employee();
        PersistObjectTemplate._verifySchema();
        expect(PersistObjectTemplate.getTopObject(emp)).to.equal(false);
    });

    it('using subset property', function () {
        schema.EmployeeSubSet = {};
        schema.EmployeeSubSet.documentOf = 'employee_subset';
        schema.EmployeeSubSet.subsetOf = 'EmployeeSubSet';

        var EmployeeSubSet = PersistObjectTemplate.create('EmployeeSubSet', {});
        PersistObjectTemplate._verifySchema();
        PersistObjectTemplate._injectIntoTemplate(EmployeeSubSet);
    });

    it('subset property referring a nonexisting template', function() {
        schema.EmployeeSubSet = {};
        schema.EmployeeSubSet.documentOf = 'employee_subset';
        schema.EmployeeSubSet.subsetOf = 'EmployeeSubSet1';

        var EmployeeSubSet = PersistObjectTemplate.create('EmployeeSubSet', {});
        PersistObjectTemplate._verifySchema();
        expect(wrapInjectCall.bind(this)).to.throw(/Reference to subsetOf EmployeeSubSet1 not found for EmployeeSubSet/);

        function wrapInjectCall() {
            return PersistObjectTemplate._injectIntoTemplate(EmployeeSubSet);
        }
    });

    it('Creating parent child relationship with subset of propery in the schema', function () {
        schema.Employee = {};
        schema.Address = {};
        schema.Employee.documentOf = 'tx_children_subset';
        schema.Address.subsetOf = 'Employee';

        schema.Employee.children = {
            homeAddress: {id: 'address_id'}
        };


        var Address = PersistObjectTemplate.create('Address', {
            city: {type: String},
            state: {type: String}
        });

        PersistObjectTemplate._verifySchema();
        return PersistObjectTemplate._injectIntoTemplate(Address);
    });


    it('Creating multiple levels objects, using subsetOf property', function () {
        schema.EmployeeMultiLevelsWithSubset = {};
        schema.EmployeeMultiLevelsWithSubset.documentOf = 'employee_parent';
        schema.AddressMultiLevelsWithSubset = {};
        schema.AddressMultiLevelsWithSubset.subsetOf = 'ManagerMultiLevelsWithSubset';

        var EmployeeMultiLevelsWithSubset = PersistObjectTemplate.create('EmployeeMultiLevelsWithSubset', {});
        var ManagerMultiLevelsWithSubset = EmployeeMultiLevelsWithSubset.extend('ManagerMultiLevelsWithSubset', {});
        var AddressMultiLevelsWithSubset = PersistObjectTemplate.create('AddressMultiLevelsWithSubset', {
            city: {type: String},
            state: {type: String}
        });

        PersistObjectTemplate._verifySchema();
        PersistObjectTemplate._injectIntoTemplate(AddressMultiLevelsWithSubset);
    });

    it('Creating parent child relationship with subset of propery in the schema', function () {
        schema.Employee = {};
        schema.Address = {};
        schema.Employee.documentOf = 'tx_parents_subset';
        schema.Address.subsetOf = 'Employee';

        schema.Employee.parents = {
            homeAddress: {id: 'address_id'}
        };


        var Address = PersistObjectTemplate.create('Address', {});
        PersistObjectTemplate._verifySchema();
        return PersistObjectTemplate._injectIntoTemplate(Address);
    });

    it('Calling getTemplateByCollection for a dummy value should throw cannot find template for', function () {
        expect(PersistObjectTemplate.getTemplateByCollection.bind('dummy')).to.throw(Error);
    });

    it('No schema entries for templates referred in subsetOf', function () {
        schema.AddressMainTemplate = {};
        schema.AddressMainTemplate.subsetOf = 'ManagerMainTemplate';


        var AddressMainTemplate = PersistObjectTemplate.create('AddressMainTemplate', {});

        var EmployeeMainTemplate = PersistObjectTemplate.create('EmployeeMainTemplate', {});
        var ExtEmployeeMainTemplate = EmployeeMainTemplate.extend('ExtEmployeeMainTemplate', {});
        var ManagerMainTemplate = ExtEmployeeMainTemplate.extend('ManagerMainTemplate', {});

        PersistObjectTemplate._verifySchema();
        try {
            PersistObjectTemplate._injectIntoTemplate(AddressMainTemplate);
        }
        catch (e) {
            expect(e.message).to.equal('Missing schema entry for ManagerMainTemplate');
        }
    });

    it('top object contains the documentOf entry', function () {
        schema.EmployeeMainTemplate2 = {};
        schema.EmployeeMainTemplate2.table = 'employee_main_template2';
        schema.AddressMainTemplate2 = {};
        schema.AddressMainTemplate2.subsetOf = 'ManagerMainTemplate2';

        var AddressMainTemplate2 = PersistObjectTemplate.create('AddressMainTemplate2', {});

        var EmployeeMainTemplate2 = PersistObjectTemplate.create('EmployeeMainTemplate2', {});
        var ExtEmployeeMainTemplate2 = EmployeeMainTemplate2.extend('ExtEmployeeMainTemplate2', {});
        var ManagerMainTemplate2 = ExtEmployeeMainTemplate2.extend('ManagerMainTemplate2', {});

        PersistObjectTemplate._verifySchema();
        try {
            PersistObjectTemplate._injectIntoTemplate(AddressMainTemplate2);
        }
        catch (e) {
            expect(e.message).to.equal('Missing schema entry for ManagerMainTemplate');
        }
    });
});

/*eslint-enable no-unused-vars*/