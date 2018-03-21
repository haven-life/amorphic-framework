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
var Phone, Address, Employee, empId, addressId, phoneId, Role, AddressType;
var PersistObjectTemplate, ObjectTemplate;
describe('persistor transaction checks', function () {
    before('drop schema table once per test suit', function() {
        return Promise.all([

            knex.schema.dropTableIfExists('tx_employee')
                .then(function () {
                    return knex.schema.dropTableIfExists('tx_address')
                }).then(function () {
                    return knex.schema.dropTableIfExists('tx_phone')
                }).then(function () {
                    return knex.schema.dropTableIfExists('tx_department')
                }).then(function () {
                    return knex.schema.dropTableIfExists('tx_role')
                }).then(function () {
                    return knex.schema.dropTableIfExists('tx_address_type')
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
        schema.Address = {};
        schema.Phone = {};
        schema.Dept = {};
        schema.Employee.table = 'tx_employee';
        schema.Address.table = 'tx_address';
        schema.Phone.table = 'tx_phone';

        schema.Employee.parents = {
            homeAddress: {id: 'address_id',
                fetch: false}
        };
        schema.Employee.children = {
            roles: {id: 'employee_id'}
        };
        schema.Role = {};
        schema.Role.table = 'tx_role';
        schema.Role.parents = {
            employee: {id: 'employee_id'}
        };
        schema.Role.children = {
            department: {id: 'role_id'}
        };

        schema.Address.parents = {
            phone: {id: 'phone_id'}
        };
        schema.Address.children = {
            types : {id: 'address_type_id'}
        };
        schema.AddressType = {};
        schema.AddressType.table = 'tx_address_type';
        schema.AddressType.parents = {
            address: {id: 'address_type_id'}
        }
        Phone = PersistObjectTemplate.create('Phone', {
            number: {type: String}
        });

        AddressType = PersistObjectTemplate.create('AddressType', {
            value: {type: String}

        });

        Address = PersistObjectTemplate.create('Address', {
            city: {type: String},
            state: {type: String},
            phone: {type: Phone},
            types: {type: Array, of: AddressType, value: []}
        });

        AddressType.mixin({
            address: {type: Address}
        })


        Role = PersistObjectTemplate.create('Role', {
            name: {type:String}
        });

        Employee = PersistObjectTemplate.create('Employee', {
            name: {type: String, value: 'Test Employee'},
            homeAddress: {type: Address},
            roles: {type: Array, of:Role, value: []}
        });

        Role.mixin({
            employee: {type: Employee}
        });
        var emp = new Employee();
        var add = new Address();
        var phone = new Phone();
        var role1 = new Role();
        role1.name = 'firstRole';
        role1.employee = emp;
        var role2 = new Role();
        role2.name = 'secondRole';
        role2.employee = emp;

        phone.number = '1231231234';


        add.city = 'New York';
        add.state = 'New York';
        add.phone = phone;
        emp.name = 'Ravi';
        var type = new AddressType();
        type.value = 'home';
        type.address = add;
        add.types.push(type);
        var type1 = new AddressType();
        type1.value = 'office';
        type1.address = add;
        add.types.push(type1);
        emp.homeAddress = add;
        emp.roles.push(role1);
        emp.roles.push(role2);

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
                .then(syncTable.bind(this, Phone))
                .then(syncTable.bind(this, Role))
                .then(syncTable.bind(this, AddressType))
                .then(createRecords.bind(this));


            function syncTable(template) {
                return PersistObjectTemplate.synchronizeKnexTableFromTemplate(template);
            }

            function createRecords() {
                var tx =  PersistObjectTemplate.begin();
                emp.setDirty(tx);
                return PersistObjectTemplate.end(tx).then(function() {
                    empId = emp._id;
                    addressId = add._id;
                    phoneId = phone._id;
                });
            }
        }
    });

    afterEach('remove tables and after each test', function() {
        return Promise.all([
            knex.schema.dropTableIfExists('tx_employee')
                .then(function () {
                    return knex.schema.dropTableIfExists('tx_address')
                }).then(function () {
                    return knex.schema.dropTableIfExists('tx_phone')
                }).then(function () {
                    return knex.schema.dropTableIfExists('tx_department')
                }).then(function () {
                    return knex.schema.dropTableIfExists('tx_role')
                }).then(function () {
                    return knex.schema.dropTableIfExists('tx_address_type')
                }),
            knex.schema.dropTableIfExists(schemaTable)]);
    });

    it('check basic fetch without fetch spec should not return the records', function () {
        return Employee.getFromPersistWithId(empId, {homeAddress: false}).then(function(employee) {
            expect(employee.homeAddress).is.equal(null);
        });
    });

    it('start, limit options are not working', function () {
        return Employee.getFromPersistWithId(empId, {homeAddress: false}).then(function(employee) {
            return employee.fetch({homeAddress: {fetch: {types: {offset: 1, limit: 1, sort: {value: 1}}}}, roles: {skip: 1, limit: 1, sort: {name: 0}}}).then(function(emp) {
                expect(emp.homeAddress).is.not.equal(null);
            });
        });
    });

    it('check basic fetch without fetch spec should not return the records', function () {
        return Employee.getFromPersistWithId(empId, {fetch: {homeAddress: false}}).then(function(emp) {
            expect(emp.homeAddress).is.equal(null);
        });
    });

    it('check basic fetch with fetch spec should return the records', function () {
        return Employee.getFromPersistWithId(empId, { homeAddress: {fetch: {phone: true}}, roles: true}).then(function(employee) {
            expect(employee.homeAddress._id).is.equal(addressId);
            expect(employee.homeAddress.phone._id).is.equal(phoneId);
        });
    });

    it('check basic fetch without fetch spec should not return the records', function () {
        return Employee.getFromPersistWithId(empId, {homeAddress: false}).then(function(employee) {
            expect(employee.homeAddress).is.equal(null);
        });
    });

    it('check basic query without fetch spec should not return the records', function () {
        return Employee.getFromPersistWithQuery({_id: empId}, {homeAddress: false}, 0, 5, true, {}, {customOptions: 'custom'}, PersistObjectTemplate.logger).then(function(employee) {
            expect(employee[0].homeAddress).is.equal(null);
        });
    });

    it('check basic fetch with fetch spec should return the records', function () {
        return Employee.getFromPersistWithQuery({_id: empId}, {homeAddress: true}, 0, 5, true, {}, {customOptions: 'custom'}, PersistObjectTemplate.logger).then(function(employee) {
            expect(employee[0].homeAddress._id).is.equal(addressId);
            expect(employee[0].homeAddress.phone).is.equal(null);
        });
    });


    it('use setDirty and add one more record', function () {
        var emp1 = new Employee();
        var add1 = new Address();
        var phone1 = new Phone();
        phone1.number = '222222222';
        add1.city = 'New York1';
        add1.state = 'New York1';
        add1.phone = phone1;
        emp1.name = 'Ravi1';
        emp1.homeAddress = add1;

        var tx =  PersistObjectTemplate.begin();
        emp1.setDirty(tx);
        add1.setDirty(tx);
        phone1.setDirty(tx);
        return PersistObjectTemplate.end(tx).then(function() {
            return Employee.countFromPersistWithQuery().then(function(count) {
                expect(count).to.equal(2);
            });
        });
    });
    it('use setAsDeleted', function () {
        var emp1 = new Employee();
        emp1.name = 'Ravi setAsDeleted';

        var tx =  PersistObjectTemplate.begin();
        emp1.setDirty(tx);
        return PersistObjectTemplate.end(tx).then(function() {
            return Employee.countFromPersistWithQuery({name: 'Ravi setAsDeleted'}).then(function(count) {
                expect(count).to.equal(1);
                var txInner =  PersistObjectTemplate.beginTransaction();
                emp1.setAsDeleted(txInner);
                return PersistObjectTemplate.commit({transaction: txInner}).then(function() {
                    return Employee.countFromPersistWithQuery({name: 'Ravi setAsDeleted'}).then(function(count) {
                        expect(count).to.equal(0);
                    });
                });
            });
        });
    });
});