var chai = require('chai'),
    expect = require('chai').expect;

var chaiAsPromised = require('chai-as-promised');

chai.should();
chai.use(chaiAsPromised);

var Promise = require('bluebird');

var knex = require('knex')({
    client: 'pg',
    debug: true,
    connection: {
        host: '127.0.0.1',
        database: 'test',
        user: 'postgres',
        password: 'postgres'
    }
});



var schema = {};
var schemaTable = 'index_schema_history';
var Employee, Department, Role, roleId;
var PersistObjectTemplate, ObjectTemplate;
describe('persistor transaction checks', function () {
    before('drop schema table once per test suit', function() {
        return Promise.all([

            knex.schema.dropTableIfExists('tx_employee')
            .then(function () {
                return knex.schema.dropTableIfExists('tx_role')
            }).then(function () {
                return knex.schema.dropTableIfExists('tx_department')
            }),
            knex.schema.dropTableIfExists(schemaTable)]);
    })
    after('closes the database', function () {
        return knex.destroy();
    });
    beforeEach('arrange', function () {
        ObjectTemplate = require('supertype');
        PersistObjectTemplate = require('../index.js')(ObjectTemplate, null, ObjectTemplate);

        schema.Employee = {};
        schema.Department = {};
        schema.Role = {};
        schema.Role.table = 'tx_role';
        schema.Employee.table = 'tx_employee';
        schema.Department.table = 'tx_department';


        schema.Employee.parents = {
            department: {id: 'department_id'}
        };
        schema.Employee.children = {
            roles: {id: 'employee_id'}
        };
        schema.Role.parents = {
            employee: {id: 'employee_id'},
            department: {id: 'role_id'}
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

        Role = PersistObjectTemplate.create('Role', {
            name: {type:String}
        });

        Employee.mixin({
            department: {type: Department},
            roles: {type: Array, of: Role, value: []}
        })


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


        (function () {
            PersistObjectTemplate.setDB(knex, PersistObjectTemplate.DB_Knex);
            PersistObjectTemplate.setSchema(schema);
            PersistObjectTemplate.performInjections();

        })();
        return Promise.resolve(prepareData());

        function prepareData() {
            PersistObjectTemplate.performInjections();
            return syncTable(Employee)
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
           }),
            knex.schema.dropTableIfExists(schemaTable)]);
    });

    it('load intermediate objects first and then try to load the parents ', function () {
        return Role.getFromPersistWithId(roleId, {employee: {fetch: {department: {fetch: {manager: {fetch: {roles: true}}}}}}}).then(function(role) {
            expect(role.employee.department.manager.roles.length).is.equal(2);
        });
    });

});