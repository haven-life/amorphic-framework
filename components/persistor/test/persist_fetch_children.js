var chai = require('chai'),
    expect = require('chai').expect;

var chaiAsPromised = require('chai-as-promised');

chai.should();
chai.use(chaiAsPromised);

var Promise = require('bluebird');

var knexInit = require('knex');
var knex;

var schema = {};
var schemaTable = 'index_schema_history';
var Employee, Department, Role, roleId, EmployeeRef;
var PersistObjectTemplate, ObjectTemplate;
describe('persistor transaction checks', function () {
    before('drop schema table once per test suit', function() {
        knex = knexInit({
            client: 'pg',
            connection: {
                host: process.env.dbPath,
                database: process.env.dbName,
                user: process.env.dbUser,
                password: process.env.dbPassword,
            }
        });
        return Promise.all([

            knex.schema.dropTableIfExists('tx_employee')
            .then(function () {
                return knex.schema.dropTableIfExists('tx_role')
            }).then(function () {
                return knex.schema.dropTableIfExists('tx_department')
            }).then(function () {
                return knex.schema.dropTableIfExists('tx_employee_ref')
            }),
            knex.schema.dropTableIfExists(schemaTable)]);
    })
    after('closes the database', function () {
        return knex.destroy();
    });
    beforeEach('arrange', function () {
        ObjectTemplate = require('@havenlife/supertype').default;
        PersistObjectTemplate = require('../dist/index.js')(ObjectTemplate, null, ObjectTemplate);

        schema.Employee = {};
        schema.EmployeeRef = {};
        schema.Department = {};
        schema.Role = {};
        schema.Role.table = 'tx_role';
        schema.Employee.table = 'tx_employee';
        schema.EmployeeRef.table = 'tx_employee_ref';
        schema.Department.table = 'tx_department';
        schema.Employee.parents = {
            department: {id: 'department_id'},
            referral: {id: 'referral_id'}
        };
        schema.Employee.children = {
            roles: {id: 'employee_id'}
        };
        schema.Role.parents = {
            employee: {id: 'employee_id'},
            department: {id: 'role_id'}
        };
        schema.EmployeeRef.parents = {
            friend: {id: 'friend_id'}
        };
        schema.Department.children = {
            employees: {id: 'employee_id'}
        };
        schema.Department.parents = {
            manager: {id: 'manager_id'}
        };

        Employee = PersistObjectTemplate.create('Employee', {
            name: {type: String}
        });
        Department = PersistObjectTemplate.create('Department', {
            name: {type: String},
            manager: {type: Employee}
        });
        EmployeeRef = PersistObjectTemplate.create('EmployeeRef', {
            name: {type: String}
        });
        Role = PersistObjectTemplate.create('Role', {
            name: {type:String}
        });
        Employee.mixin({
            department: {type: Department},
            roles: {type: Array, of: Role, value: []},
            referral: {type: EmployeeRef}
        });
        EmployeeRef.mixin({
            friend: {type: Employee}
        });
        Role.mixin({
            employee: {type: Employee},
            department: {type: Department}
        });
        var emp = new Employee();
        var role1 = new Role();
        var dep1  = new Department();
        role1.name = 'firstRole';
        role1.employee = emp;
        role1.department = dep1;
        dep1.manager = emp;
        var role2 = new Role();
        role2.name = 'secondRole';
        role2.employee = emp;
        role2.department = dep1;

        emp.department = dep1;
        emp.roles = [role1, role2];
        var referral = new EmployeeRef();
        referral.name = 'referral';
        var second = new Employee();
        second.name = 'second'
        referral.friend = second;

        var referralSecond = new EmployeeRef();
        referral.name = 'referralSecond';
        second.referral = referralSecond
        emp.referral = referral;

        (function () {
            PersistObjectTemplate.setDB(knex, PersistObjectTemplate.DB_Knex);
            PersistObjectTemplate.setSchema(schema);
            PersistObjectTemplate.performInjections();

        })();
        return Promise.resolve(prepareData());

        function prepareData() {
            PersistObjectTemplate.performInjections();
            return syncTable(Employee)
                .then(syncTable.bind(this, EmployeeRef))
                .then(syncTable.bind(this, Department))
                .then(syncTable.bind(this, Role))
                .then(createRecords.bind(Employee));


            function syncTable(template) {
                return PersistObjectTemplate.synchronizeKnexTableFromTemplate(template);
            }

            function createRecords() {
                var tx =  PersistObjectTemplate.begin();
                emp.setDirty(tx);
                return PersistObjectTemplate.end(tx).then(function() {
                    roleId = emp.roles[0]._id;
                });
            }
        }
    });

    afterEach('remove tables and after each test', function() {
        return Promise.all([
            knex.schema.dropTableIfExists('tx_employee')
            .then(function () {
                return knex.schema.dropTableIfExists('tx_department')
            }).then(function () {
                return knex.schema.dropTableIfExists('tx_role')
            }).then(function () {
                return knex.schema.dropTableIfExists('tx_employee_ref')
            }),
            knex.schema.dropTableIfExists(schemaTable)]);
    });

    it('load intermediate objects first and then try to load the parents ', function () {
        return Role.getFromPersistWithId(roleId, {employee: { fetch: { department: { fetch: { manager: { fetch: { roles: true }}}}, referral: { fetch: { friend: 'recursive:employee'}}}}}).then(function (role) {
            expect(role.employee.department.manager.roles.length).is.equal(2);
        });
    });

});