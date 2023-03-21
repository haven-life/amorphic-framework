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
var Phone, Address, Employee, empId, addressId, phoneId, Role;
var PersistObjectTemplate, ObjectTemplate;

describe('persist newapi tests', function () {
    before('drop schema table once per test suit', function() {
        knex = knexInit({
            client: 'pg',
            debug: true,
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
                    return knex.schema.dropTableIfExists('tx_address')
                }).then(function () {
                    return knex.schema.dropTableIfExists('tx_phone')
                }).then(function () {
                    return knex.schema.dropTableIfExists('tx_department')
                }).then(function () {
                    return knex.schema.dropTableIfExists('tx_role')
                }),
            knex.schema.dropTableIfExists(schemaTable)]);
    })
    after('closes the database', function () {
        return knex.destroy();
    });
    beforeEach('arrange', function () {
        ObjectTemplate = require('@haventech/supertype').default;
        PersistObjectTemplate = require('../dist/index.js')(ObjectTemplate, null, ObjectTemplate);

        schema.Employee = {};
        schema.Address = {};
        schema.Phone = {};
        schema.Dept = {};
        schema.Employee.table = 'tx_employee';
        schema.Address.table = 'tx_address';
        schema.Address.tableType = 'reference_data';
        schema.Phone.table = 'tx_phone';

        schema.Employee.parents = {
            homeAddress: {id: 'address_id',
                fetch: true}
        };
        schema.Employee.children = {
            roles: {id: 'employee_id', fetch: true}
        };

        schema.Employee.enableChangeTracking = true;

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
        Phone = PersistObjectTemplate.create('Phone', {
            number: {type: String}
        });

        Address = PersistObjectTemplate.create('Address', {
            city: {type: String},
            state: {type: String},
            phone: {type: Phone}
        });


        Role = PersistObjectTemplate.create('Role', {
            name: {type:String},

        });

        Employee = PersistObjectTemplate.create('Employee', {
            name: {type: String, value: 'Test Employee'},
            homeAddress: {type: Address},
            roles: {type: Array, of:Role, value: []},
            dob: {type: Date},
            customObj: {type: Object},
            isMarried: {type: Boolean}
        });

        Role.mixin({
            employee: {type: Employee}
        });
        var emp = new Employee();
        var add = new Address();
        var phone = new Phone();
        var role1 = new Role();
        role1.name = 'firstRole2';
        role1.employee = emp;
        var role2 = new Role();
        role2.name = 'secondRole2';
        role2.employee = emp;

        phone.number = '1231231234';
        add.city = 'New York';
        add.state = 'New York';
        add.phone = phone;
        emp.name = 'Ravi';
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
                .then(addConstraint.bind(this))
                .then(createRecords.bind(this));


            function syncTable(template) {
                return PersistObjectTemplate.synchronizeKnexTableFromTemplate(template);
            }

            function addConstraint() {
                return knex.raw('ALTER TABLE tx_role ADD CONSTRAINT namechk CHECK (char_length(name) <= 50);')
            }

            function createRecords() {
                var tx =  PersistObjectTemplate.beginDefaultTransaction();

                return emp.persist({transaction: tx, cascade: false}).then(function() {
                    return PersistObjectTemplate.commit({transaction: tx, notifyChanges: true}).then(function() {
                        empId = emp._id;
                        addressId = add._id;
                        phoneId = phone._id;
                    });
                })
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
                }),
            knex.schema.dropTableIfExists(schemaTable)]);
    });

    it('persistorFetchById without fetch spec should not return the records', function () {
        return Employee.persistorFetchById(empId, { fetch: {homeAddress: false}, enableChangeTracking: true})
            .then(function(employee) {
                expect(employee.homeAddress).is.equal(null);
            });
    });

    it('persistorFetchById with fetch spec should return the records', function () {
        return Employee.persistorFetchById(empId, {fetch: { homeAddress: {fetch: {phone: false}}, roles: true}}).then(function(employee) {
            expect(employee.homeAddress._id).is.equal(addressId);
            expect(employee.homeAddress.phone).is.equal(null);
        });
    });

    it('persistorFetchById with fetch spec with type projections', function () {
        return Employee.persistorFetchById(empId, {fetch: { homeAddress: {fetch: {phone: true}}, roles: true}, projection: { Address: ['city'], Role: ['name'], Phone: ['']}}).then(function(employee) {
            expect(employee.homeAddress.state).is.equal(undefined);
            expect(employee.homeAddress.city).is.equal('New York');
            expect(employee.homeAddress.phone.number).is.equal(undefined);
            expect(employee.homeAddress.phone._id).is.equal(phoneId);
        });
    });

    it('persistorFetchById with fetch spec should return the records', function () {
        return Employee.persistorFetchById(empId, {fetch: { homeAddress: {fetch: {phone: false}}, roles: true}}).then(function(employee) {
            expect(employee.homeAddress._id).is.equal(addressId);
            expect(employee.homeAddress.phone).is.equal(null);
        });
    });

    it('persistorFetchById with multiple level fetch spec should return the records', function () {
        return Employee.persistorFetchById(empId, {fetch: { homeAddress: {fetch: {phone: true}}, roles: true}}).then(function(employee) {
            expect(employee.homeAddress._id).is.equal(addressId);
            expect(employee.homeAddress.phone._id).is.equal(phoneId);
        });
    });

    it('fetch without fetch spec should not return the records', function () {
        return Employee.persistorFetchByQuery({_id: empId}, {fetch: {homeAddress: false}}).then(function(employee) {
            expect(employee[0].homeAddress).is.equal(null);
        }).catch(function(err) {
            expect(err).not.equal(null);
        });
    });

    it('fetch with fetch spec should return the records', function () {
        return Employee.persistorFetchByQuery({_id: empId},  {fetch: {homeAddress: true}, logger: PersistObjectTemplate.logger, start: 0, limit: 5, order: {name: 1} }).then(function(employee) {
            expect(employee[0].homeAddress._id).is.equal(addressId);
            expect(employee[0].homeAddress.phone).is.equal(null);
        });
    });

    it('persistorCountByQuery counts records properly', function () {
        return Employee.persistorCountByQuery({_id: empId},  {fetch: {homeAddress: true}, logger: PersistObjectTemplate.logger, start: 0, limit: 5, order: {name: 1} }).then(function(count) {
            expect(count).to.equal(1);
        });
    });

    it('persistorFetchByQuery to check the fetchSpec cache', function () {
        return Employee.persistorFetchByQuery({_id: empId}, {
            fetch: {
                roles: true
            }
        }).then(function () {
            expect(Object.keys(PersistObjectTemplate._validFetchSpecs.Employee).length).is.equal(1);
        })
    });

    it('persistorFetchByQuery without objecttemplate field', function () {
        return Promise.resolve()
            .then(actualTest)
            .catch(function (error) {
                expect(error).is.not.equal(null);
            })

        function actualTest() {
            return Employee.persistorFetchByQuery({_id: empId}, {
                fetch: {
                    name: true
                }
            })
        }

    });

    it('Multiple fetch calls to check the validFetchSpec cache', function () {
        return Employee.persistorFetchById(empId, {fetch: {homeAddress: false}})
        .then(function(employee) {
            expect(PersistObjectTemplate._validFetchSpecs).is.not.equal(null);
            return employee.fetchReferences({fetch: { homeAddress: {fetch: {phone: true}}, roles: true}}).then(function() {
                expect(Object.keys(PersistObjectTemplate._validFetchSpecs.Employee).length).is.equal(2);
            });
        });
    });

    it('Multiple fetch calls with the same fetch string to check the validFetchSpec cache', function () {
        return Employee.persistorFetchById(empId, {fetch: {homeAddress: false}})
            .then(function() {
                expect(PersistObjectTemplate._validFetchSpecs).is.not.equal(null);
                return Employee.persistorFetchById(empId, {fetch: {homeAddress: false}}).then(function() {
                    expect(Object.keys(PersistObjectTemplate._validFetchSpecs.Employee).length).is.equal(1);
                });
            });
    });

    it('fetch with fetch with multiple levels should return the records', function () {
        return Employee.persistorFetchByQuery({_id: empId}, {
            fetch: { homeAddress: {fetch: {phone: false}},
                roles: true},
            logger: PersistObjectTemplate.logger
        }, 0, 5, true, {}, {customOptions: 'custom'})
            .then(function(employee) {
                expect(employee[0].homeAddress._id).is.equal(addressId);
                expect(employee[0].homeAddress.phone).is.equal(null);
            });
    });

    it('persistorFetchById with multiple level fetch spec should return the records', function () {
        return Employee.persistorFetchById(empId, {fetch: { homeAddress: {fetch: {phone: true}}, roles: true}}).then(function(employee) {
            expect(employee.homeAddress._id).is.equal(addressId);
            expect(employee.homeAddress.phone._id).is.equal(phoneId);
        });
    });

    it('persistorFetchByQuery with fetch spec should return the records and also load the child objects in the calling object', function () {
        return Employee.persistorFetchById(empId, {fetch: {homeAddress: false}})
            .then(function(employee) {
                return employee.fetchReferences({fetch: { homeAddress: {fetch: {phone: true}}, roles: true}}).then(function(obj) {
                    expect(obj.homeAddress._id).is.equal(addressId);
                    expect(employee.homeAddress._id).is.equal(addressId);
                })
            });
    });

    it('using commit will save all the objects in the graph', function () {
        var emp1 = new Employee();
        var add1 = new Address();
        var phone1 = new Phone();
        phone1.number = '222222222';
        add1.city = 'New York1';
        add1.state = 'New York1';
        add1.phone = phone1;
        emp1.name = 'Ravi1';
        emp1.homeAddress = add1;

        var tx =  PersistObjectTemplate.beginDefaultTransaction();
        return emp1.persist({transaction: tx, cascade: false}).then(function() {
            return PersistObjectTemplate.commit().then(function() {
                return Address.countFromPersistWithQuery().then(function(count) {
                    expect(count).to.equal(2);
                });
            });
        })

    });

    it('using beginTransaction will not set the objects as dirty in default trasaction', function () {
        var emp1 = new Employee();
        var add1 = new Address();
        var phone1 = new Phone();
        phone1.number = '222222222';
        add1.city = 'New York1';
        add1.state = 'New York1';
        add1.phone = phone1;
        emp1.name = 'Ravi1';
        emp1.homeAddress = add1;

        var tx =  PersistObjectTemplate.beginTransaction();
        return emp1.persist({transaction: tx, cascade: true}).then(function() {
            return PersistObjectTemplate.commit().then(function() {
                return Address.countFromPersistWithQuery().then(function(count) {
                    expect(count).to.equal(1);
                });
            });
        })

    });

    it('using save with wrong option should throw exception', function () {
        var emp1 = new Employee();
        return Promise.resolve()
            .then(actualTest)
            .catch(function(error) {
                expect(error.message).to.contain('Parameter validation failed, Field: #/additionalProperties, Validation error: must NOT have additional properties');
            });

        function actualTest() {
            return emp1.persist({transaction: null, cascade: true, unknown: false}).then(function() {
                throw new Error('should not reach here');
            })
        }

    });

    it('using beginTransaction will not set the objects as dirty in default trasaction', function () {
        var emp1 = new Employee();
        var add1 = new Address();
        var phone1 = new Phone();
        phone1.number = '222222222';
        add1.city = 'New York1';
        add1.state = 'New York1';
        add1.phone = phone1;
        emp1.name = 'RaviNotSaved';
        emp1.homeAddress = add1;

        var tx =  PersistObjectTemplate.beginTransaction();
        return emp1.persist({transaction: tx, cascade: false}).then(function() {
            return PersistObjectTemplate.commit().then(function() {
                return Employee.persistorFetchByQuery({name: 'RaviNotSaved'}).then(function(employees) {
                    expect(employees.length).to.equal(0);
                });
            });
        })
    });

    it('test a bunch of parallel commits and reads to check for race condition', async () => {
        for (let i = 0; i < 1000; ++i) {
            var phoneTemp = new Phone();
            phoneTemp.number = `${i}`;
    
            var tx =  PersistObjectTemplate.beginTransaction();
            await phoneTemp.persist({transaction: tx, cascade: false});
            await PersistObjectTemplate.commit({transaction: tx});
            const phones =  await Phone.persistorFetchByQuery({number: `${i}`});
            expect(phones.length).to.equal(1);
        }
    });

    it('load the object with change tracking flag and make changes to get notified', function () {
        var emp1 = new Employee();
        var add1 = new Address();
        var phone1 = new Phone();
        phone1.number = '222222222';
        add1.city = 'New York1';
        add1.state = 'New York1';
        add1.phone = phone1;
        emp1.name = 'LoadObjectForNotificationCheck';
        emp1.homeAddress = add1;
        var dob1 =  new Date('01/01/1975');
        emp1.customObj = {name: 'testName', dob: JSON.stringify(dob1)};
        emp1.dob = dob1;
        emp1.isMarried = true;

        var tx =  PersistObjectTemplate.beginTransaction();
        tx.postSave = function(txn, _logger, changes, queries) {
            expect(queries['Employee'].queries.length).to.equal(1);
            expect(queries['Address'].queries.length).to.equal(1);
            expect(queries['Address'].tableType).to.equal('reference_data');
            expect(queries['Phone'].queries.length).to.equal(1);
        }

        const insertScript = emp1.getInsertScript();
        expect(insertScript).to.contain('insert into "tx_employee"');
        return emp1.persist({transaction: tx, cascade: false}).then(function() {
            return PersistObjectTemplate.commit({transaction: tx, notifyQueries: true}).then(function() {
                return Employee.persistorFetchByQuery({name: 'LoadObjectForNotificationCheck'}, {enableChangeTracking: true}).then(function(employees) {
                    expect(employees.length).to.equal(1);
                    var emp = employees[0];
                    emp.dob = new Date('01/01/1976');
                    emp.customObj = {name: 'testName', dob: JSON.stringify (emp.dob)};
                    emp.isMarried = false;
                    emp.homeAddress = new Address();
                    var innerTxn =  PersistObjectTemplate.beginTransaction();
                    emp.setDirty(innerTxn);


                    innerTxn.postSave = function(txn, _logger, changes, queries) {
                        expect(Object.keys(changes)).to.contain('Employee');
                        expect(Object.keys(changes.Employee[0])).to.contain('primaryKey');
                        expect(changes.Employee[0].properties[0].name).to.equal('homeAddress');
                        expect(changes.Employee[0].properties[1].name).to.equal('dob');
                        var empNew = new Employee();
                        empNew.setDirty(txn);
                    };
                    return PersistObjectTemplate.commit({transaction: innerTxn, notifyChanges: true, notifyQueries: true});
                });
            });
        })
    });

    it('using beginTransaction and passing trasaction object to the commit', function () {
        var emp1 = new Employee();
        var add1 = new Address();
        var phone1 = new Phone();
        phone1.number = '222222222';
        add1.city = 'New York1';
        add1.state = 'New York1';
        add1.phone = phone1;
        emp1.name = 'RaviNotSaved';
        emp1.homeAddress = add1;
        
        var tx =  PersistObjectTemplate.beginTransaction();
        return emp1.persist({transaction: tx, cascade: false}).then(function() {
            return PersistObjectTemplate.commit({transaction: tx}).then(function() {
                return Employee.persistorFetchByQuery({name: 'RaviNotSaved'}).then(function(employees) {
                    expect(employees.length).to.equal(1);
                });
            });
        })
    });

    it('calling persist delete with transaction', function () {
        var emp, add;
        return createFKs()
            .then(loadEmployee.bind(this))
            .then(setTestObjects.bind(this))
            .then(realTest.bind(this));

        function loadEmployee() {
            return Employee.persistorFetchById(empId, {fetch: {homeAddress: true}})
        }

        function setTestObjects(employee) {
            emp = employee;
            add = employee.homeAddress;
        }
        function realTest() {
            var notifyChanges;  
            var tx =  PersistObjectTemplate.beginTransaction();
            add.persistDelete({transaction: tx});
            emp.persistDelete({transaction: tx});
            return PersistObjectTemplate.commit({transaction: tx, notifyChanges: notifyChanges, notifyQueries: true});
        }

        function createFKs() {
            return knex.raw('ALTER TABLE public.tx_employee ADD CONSTRAINT fk_tx_employee_address FOREIGN KEY (address_id) references public.tx_address("_id") deferrable initially deferred');
        }
    });

    it('calling delete with transaction', function () {
        return createFKs()
            .then(loadEmployee.bind(this))
            .then(realTest.bind(this));

        function loadEmployee() {
            return Employee.persistorFetchById(empId, {fetch: {homeAddress: true}})
        }

        function realTest() {
            var tx =  PersistObjectTemplate.beginTransaction();
            Employee.persistorDeleteByQuery({name: 'Ravi'}, {transaction: tx});
            Address.persistorDeleteByQuery({city: 'New York'}, {transaction: tx})
            return PersistObjectTemplate.commit({transaction: tx}).then(function() {
                return Employee.persistorFetchByQuery({name: 'Ravi'}).then(function(employees) {
                    expect(employees.length).to.equal(0);
                })
            });
        }

        function createFKs() {
            return knex.raw('ALTER TABLE public.tx_employee ADD CONSTRAINT fk_tx_employee_address FOREIGN KEY (address_id) references public.tx_address("_id") deferrable initially deferred');
        }
    });

    it('calling delete without transaction', function () {
        return createFKs()
            .then(loadEmployee.bind(this))
            .then(realTest.bind(this));

        function loadEmployee() {
            return Employee.persistorFetchById(empId, {fetch: {homeAddress: true}})
        }

        async function realTest() {
            await Employee.persistorDeleteByQuery({name: 'Ravi'});
            return Employee.persistorFetchByQuery({name: 'Ravi'}).then(function(employees) {
                expect(employees.length).to.equal(0);
            })
        }

        function createFKs() {
            return knex.raw('ALTER TABLE public.tx_employee ADD CONSTRAINT fk_tx_employee_address FOREIGN KEY (address_id) references public.tx_address("_id") deferrable initially deferred');
        }
    });

    it('update conflict should revert the version', function () {
        return createRecords()
            .then(loadEmployee.bind(this))
            .then(realTest.bind(this));

        function loadEmployee() {
            return Employee.persistorFetchByQuery({name: 'Ravi'})
        }

        async function realTest(emps) {
            var tx =  PersistObjectTemplate.beginTransaction();
            emps[0].setDirty(tx);
            emps[1].__version__ = emps[1].__version__ + 1;
            emps[1].setDirty(tx);
            try {
                await PersistObjectTemplate.commit({transaction: tx});
            }
            catch (err) {
                expect(emps[0].__version__).to.equal('1');
                expect(err.message).to.equal('Update Conflict');
            }
        }

        function createRecords() {
            var emp1 = new Employee();
            var add1 = new Address();
            var phone1 = new Phone();
            phone1.number = '222222222';
            add1.city = 'New York1';
            add1.state = 'New York1';
            add1.phone = phone1;
            emp1.name = 'Ravi';
            emp1.homeAddress = add1;
            var tx =  PersistObjectTemplate.beginTransaction();
            emp1.persist({transaction: tx, cascade: false});
            return PersistObjectTemplate.commit({transaction: tx});
        }
    });

    it('create an object copy and save, _id only assigned at db save', async  () => {
        var emp1 = new Employee();
        var add1 = new Address();
        var phone1 = new Phone();
        phone1.number = '222222222';
        add1.city = 'New York1';
        add1.state = 'New York1';
        add1.phone = phone1;
        emp1.name = 'EmployeeObject';
        emp1.homeAddress = add1;

        var roleTest = new Role();
        roleTest.name = 'firstTestRole';
        roleTest.employee = emp1;
        var roleTest2 = new Role();
        roleTest2.name = 'secondTestRole';
        roleTest2.employee = emp1;

        emp1.roles.push(roleTest);
        emp1.roles.push(roleTest2);
        
        var tx =  PersistObjectTemplate.beginTransaction();
        await emp1.persist({transaction: tx, cascade: true});
        await PersistObjectTemplate.commit({transaction: tx});
        const employee = await Employee.persistorFetchByQuery({name: 'EmployeeObject'});
        
        const clonedEmp = employee[0].createCopy(function(obj, prop, template){
            return null;
        });
        
        expect(clonedEmp._id).to.equal(undefined);
        expect(clonedEmp.roles[0]._id).to.equal(undefined);
        expect(clonedEmp.roles[1]._id).to.equal(undefined);

        clonedEmp.name = 'ClonedEmployeeObject';
        var tx =  PersistObjectTemplate.beginTransaction();
        await clonedEmp.persist({transaction: tx, cascade: true});
        await PersistObjectTemplate.commit({transaction: tx});
        
        const employeesClonedSaved = await Employee.persistorFetchByQuery({name: 'ClonedEmployeeObject'});
        
        expect(employeesClonedSaved.length).to.equal(1);
        expect(employeesClonedSaved[0].roles[0]._id).to.equal(clonedEmp?.roles[0]._id);
        expect(employeesClonedSaved[0].roles[1]._id).to.equal(clonedEmp?.roles[1]._id);
        expect(employeesClonedSaved[0].roles[0]._id).to.not.equal(employeesClonedSaved[0].roles[1]._id);
        expect(employee[0]._id).to.not.equal(employeesClonedSaved[0]._id);
        expect(employee[0].roles[0]._id).to.not.equal(employeesClonedSaved[0].roles[0]._id);
        expect(employee[0].roles[1]._id).to.not.equal(employeesClonedSaved[0].roles[1]._id);
    });
});