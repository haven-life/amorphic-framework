var chai = require('chai'),
    expect = require('chai').expect;

var chaiAsPromised = require('chai-as-promised');

chai.should();
chai.use(chaiAsPromised);

var ObjectTemplate = require('supertype');
var PersistObjectTemplate = require('../index.js')(ObjectTemplate, null, ObjectTemplate);
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


describe('persistor transaction checks', function () {
    before('arrange', function (done) {
        (function () {
            PersistObjectTemplate.setDB(knex, PersistObjectTemplate.DB_Knex);
            PersistObjectTemplate.setSchema(schema);
            PersistObjectTemplate.performInjections();

        })();
        return Promise.all([
            knex.schema.dropTableIfExists('tx_employee').then(function() {
                return knex.schema.dropTableIfExists('tx_address');
            }),

            knex.schema.dropTableIfExists('tx_employee1').then(function() {
                return knex.schema.dropTableIfExists('tx_address1');
            }),
            knex.schema.dropTableIfExists('tx_employee2').then(function() {
                return knex.schema.dropTableIfExists('tx_address2');
            }),
            knex.schema.dropTableIfExists('tx_delete_employee').then(function() {
                return knex.schema.dropTableIfExists('tx_delete_address');
            }),
            knex.schema.dropTableIfExists('tx_persistdelete_address').then(function() {
                return knex.schema.dropTableIfExists('tx_persistdelete_employee');
            }),
            knex.schema.dropTableIfExists('tx_deletewot_employee'),
            knex.schema.dropTableIfExists(schemaTable)
        ]).should.notify(done);
    });
    after('closes the database', function () {
        return knex.destroy();
    });

    it('create a simple table', function () {
        schema.Employee = {};
        schema.Address = {};
        schema.Employee.documentOf = 'tx_employee';
        schema.Address.documentOf = 'tx_address';
        schema.Employee.parents = {
            homeAddress: {id: 'address_id'}
        };
        var Address = PersistObjectTemplate.create('Address', {
            city: {type: String},
            state: {type: String}
        });
        var Employee = PersistObjectTemplate.create('Employee', {
            name: {type: String, value: 'Test Employee'},
            homeAddress: {type: Address}
        });
        var emp = new Employee();
        var add = new Address();
        add.city = 'New York';
        add.state = 'New York';
        emp.name = 'Ravi';
        emp.homeAddress = add;

        PersistObjectTemplate.performInjections();
        return syncTable(Employee)
            .then(syncTable.bind(this, Address))
            .then(createFKs.bind(this, Address))
            .then(openTransaction.bind(this))
            .then(endTransaction.bind(this));

        function transaction() {
            return insertToParent()
                .then(insertToChild.bind(this));
        }

        function createFKs() {
            return knex.raw('ALTER TABLE public.tx_employee ADD CONSTRAINT fk_tx_employee_address2 FOREIGN KEY (address_id) references public.tx_address("_id")');
        }

        function syncTable(template) {
            return PersistObjectTemplate.synchronizeKnexTableFromTemplate(template);
        }

        function openTransaction() {
            var tx =  PersistObjectTemplate.begin();
            tx.knex = knex.transaction(transaction);
            return tx;
        }

        function insertToChild(tx) {
            return emp.persistSave(tx).then(function() {
                return tx;
            });
        }
        function insertToParent(tx) {
            return add.persistSave(tx).then(function() {
                return tx;
            });
        }
        function endTransaction(tx) {
            return PersistObjectTemplate.end(tx);
        }
    });


    it('create a simple table with SaveAll', function () {
        schema.Employee1 = {};
        schema.Address1 = {};
        schema.Employee1.documentOf = 'tx_employee1';
        schema.Address1.documentOf = 'tx_address1';
        schema.Employee1.parents = {
            homeAddress: {id: 'address_id'}
        };

        var Address1 = PersistObjectTemplate.create('Address1', {
            city: {type: String},
            state: {type: String}
        });

        var Employee1 = PersistObjectTemplate.create('Employee1', {
            name: {type: String, value: 'Test Employee'},
            homeAddress: {type: Address1},
            isMarried: {type: Boolean, value: true}
        });



        PersistObjectTemplate.performInjections();
        PersistObjectTemplate._verifySchema();

        return syncTable(Employee1)
            .then(syncTable.bind(this, Address1))
            .then(createFKs.bind(this, Address1))
            .then(endTransaction.bind(this))
            .then(readAndSetDirty.bind(this));

        function readAndSetDirty(tx) {
            return Employee1.getFromPersistWithQuery({name: 'Ravi'}).then(function(employee) {
                employee.name = 'Ravi1';
                return PersistObjectTemplate.saveAll(tx);
            }.bind(this))
        }

        function createFKs() {
            return knex.raw('ALTER TABLE public.tx_employee1 ADD CONSTRAINT fk_tx_employee1_address2 FOREIGN KEY (address_id) references public.tx_address1("_id") deferrable initially deferred');
        }

        function syncTable(template) {
            return PersistObjectTemplate.synchronizeKnexTableFromTemplate(template);
        }

        function endTransaction() {
            var tx =  PersistObjectTemplate.begin();
            var emp = new Employee1();
            var add = new Address1();
            add.city = 'New York';
            add.state = 'New York';
            emp.name = 'Ravi';
            emp.homeAddress = add;
            tx.touchTop = true;
            add.setDirty(tx);
            emp.setDirty(tx);


            tx.postSave = function () {};

            return PersistObjectTemplate.saveAll(tx).then(function() {
                return PersistObjectTemplate.end(tx).then(function() {
                    return tx;
                })
            });
        }
    });

    it('create a simple table with setdirty and end operations..', function () {
        schema.Employee2 = {};
        schema.Address2 = {};
        schema.Employee2.documentOf = 'tx_employee2';
        schema.Address2.documentOf = 'tx_address2';
        schema.Employee2.cascadeSave = true;

        schema.Employee2.parents = {
            homeAddress: {id: 'address_id'}
        };

        var Address2 = PersistObjectTemplate.create('Address2', {
            city: {type: String},
            state: {type: String}
        });

        var Employee2 = PersistObjectTemplate.create('Employee2', {
            name: {type: String, value: 'Test Employee'},
            homeAddress: {type: Address2},
            isMarried: {type: Boolean, value: true}
        });



        PersistObjectTemplate.performInjections();
        PersistObjectTemplate._verifySchema();

        return syncTable(Employee2)
            .then(syncTable.bind(this, Address2))
            .then(createFKs.bind(this, Address2))
            .then(openTransaction.bind(this))
            .then(endTransaction.bind(this));


        function createFKs() {
            return knex.raw('ALTER TABLE public.tx_employee2 ADD CONSTRAINT fk_tx_employee2_address2 FOREIGN KEY (address_id) references public.tx_address2("_id") deferrable initially deferred');
        }

        function syncTable(template) {
            return PersistObjectTemplate.synchronizeKnexTableFromTemplate(template);
        }

        function openTransaction() {
            return PersistObjectTemplate.begin();
        }


        function endTransaction(tx) {
            var emp = new Employee2();
            var add = new Address2();
            add.city = 'New York';
            add.state = 'New York';
            emp.name = 'Ravi';
            emp.homeAddress = add;
            tx.touchTop = true;
            emp.setDirty(tx, false, true);
            add.setDirty(tx);
            return PersistObjectTemplate.end(tx);
        }
    });

    it('checking delete scenario', function () {
        schema.EmployeeDel = {};
        schema.AddressDel = {};
        schema.EmployeeDel.documentOf = 'tx_delete_employee';
        schema.AddressDel.documentOf = 'tx_delete_address';

        schema.EmployeeDel.parents = {
            homeAddress: {id: 'address_id'}
        }

        var AddressDel = PersistObjectTemplate.create('AddressDel', {
            city: {type: String},
            state: {type: String}
        });

        var EmployeeDel = PersistObjectTemplate.create('EmployeeDel', {
            name: {type: String, value: 'Test Del Employee'},
            homeAddress: {type: AddressDel},
            isMarried: {type: Boolean, value: true}
        });

        var emp = new EmployeeDel();
        var add = new AddressDel();
        add.city = 'New York';
        add.state = 'New York';
        emp.name = 'Kumar';
        emp.homeAddress = add;

        PersistObjectTemplate.performInjections();
        PersistObjectTemplate._verifySchema();

        return syncTable(EmployeeDel)
            .then(syncTable.bind(this, AddressDel))
            .then(createFKs.bind(this))
            .then(openTransaction.bind(this))
            .then(endTransaction.bind(this))
            .then(deleteCheck.bind(this));




        function createFKs() {
            return knex.raw('ALTER TABLE public.tx_delete_employee ADD CONSTRAINT fk_tx_delete_employee_address2 FOREIGN KEY (address_id) references public.tx_delete_address("_id") deferrable initially deferred');
        }

        function syncTable(template) {
            return PersistObjectTemplate.synchronizeKnexTableFromTemplate(template);
        }
        function openTransaction() {
            return PersistObjectTemplate.begin();
        }
        function endTransaction(txn) {
            emp.setDirty(txn);
            add.setDirty(txn);
            return PersistObjectTemplate.end(txn);
        }
        function deleteCheck() {
            return EmployeeDel.deleteFromPersistWithQuery({name: 'Kumar'}).then(function(count) {
                expect(count).to.equal(1);
                var func = function(knex) {
                    knex.where({city: 'New York'});
                };

                return AddressDel.deleteFromPersistWithQuery(func).then(function(count) {
                    expect(count).to.equal(1);
                })
            })
        }
    });

    it('checking setDirty without setting schema', function () {
        var EmployeeSetDirty = PersistObjectTemplate.create('EmployeeSetDirty', {});
        PersistObjectTemplate._injectObjectFunctions(EmployeeSetDirty);
        var emp = new EmployeeSetDirty();
        var tx =  PersistObjectTemplate.begin();
        emp.setDirty(tx);
        expect(Object.keys(tx.dirtyObjects).length).to.equal(0);
    });

    it('when an array of field used without providing the table name..', function () {
        schema.EmployeeDelWithoutTable = {};
        schema.AddressDelWithoutTable = {};
        schema.EmployeeDelWithoutTable.documentOf = 'tx_deletewot_employee';
        schema.AddressDelWithoutTable.table = null;

        schema.EmployeeDelWithoutTable.parents = {
            homeAddress: {id: 'address_id'}
        };
        schema.EmployeeDelWithoutTable.children = {};

        var AddressDelWithoutTable = PersistObjectTemplate.create('AddressDelWithoutTable', {});

        var EmployeeDelWithoutTable = PersistObjectTemplate.create('EmployeeDelWithoutTable', {
            addresses: {type: Array, of: AddressDelWithoutTable, value: []}
        });

        var emp = new EmployeeDelWithoutTable();
        var add1 = new AddressDelWithoutTable();
        var add2 = new AddressDelWithoutTable();
        emp.addresses.push(add1);
        emp.addresses.push(add2);

        PersistObjectTemplate.performInjections();
        PersistObjectTemplate._verifySchema();
        return PersistObjectTemplate.synchronizeKnexTableFromTemplate(EmployeeDelWithoutTable).then(function() {
            return emp.persistSave();
        }).catch(function(e) {
            expect(e.message).to.contain('Missing children entry for addresses');
        })
    });

    it('when an array of field used without providing the table name..', function () {
        schema.EmployeeDelWithoutTable1 = {};
        schema.AddressDelWithoutTable1 = {};
        schema.EmployeeDelWithoutTable1.table = 'tx_deletewot1_employee';
        schema.AddressDelWithoutTable1.table = 'tx_deletewot1_address';

        schema.EmployeeDelWithoutTable1.children = {
            addresses: {id: 'employee_id'}
        };
        schema.AddressDelWithoutTable1.parents = {
            employee: {id: 'employee_id'}
        };

        var AddressDelWithoutTable1 = PersistObjectTemplate.create('AddressDelWithoutTable1', {
            employee: {type: EmployeeDelWithoutTable1}
        });

        var EmployeeDelWithoutTable1 = PersistObjectTemplate.create('EmployeeDelWithoutTable1', {
            addresses: {type: Array, of: AddressDelWithoutTable1, value: []}
        });

        var emp = new EmployeeDelWithoutTable1();
        var add1 = new AddressDelWithoutTable1();
        var add2 = new AddressDelWithoutTable1();
        add1.employee = emp;
        add2.employee = emp;
        emp.addresses.push(add1);
        emp.addresses.push(add2);

        PersistObjectTemplate.performInjections();
        PersistObjectTemplate._verifySchema();

        var promises = [PersistObjectTemplate.synchronizeKnexTableFromTemplate(EmployeeDelWithoutTable1),
            PersistObjectTemplate.synchronizeKnexTableFromTemplate(AddressDelWithoutTable1)];

        return Promise.all(promises).then(function() {
            schema.AddressDelWithoutTable1.table = null;
            PersistObjectTemplate._verifySchema();
            return emp.persistSave();
        }).catch(function(e) {
            expect(e.message).to.contain('Missing children entry for addresses');
        })

    })

    it('calling setDirty to check cover cascadeSave and touch top...', function () {
        schema.EmployeeCascadeSaveWithTouchTop = {};
        schema.AddressCascadeSaveWithTouchTop = {};
        schema.EmployeeCascadeSaveWithTouchTop.table = 'tx_cascadetouch_employee';
        schema.AddressCascadeSaveWithTouchTop.table = 'tx_cascadetouch_address';
        schema.EmployeeCascadeSaveWithTouchTop.cascadeSave = true;


        schema.EmployeeCascadeSaveWithTouchTop.children = {
            addresses: {id: 'employee_id'}
        };
        schema.AddressCascadeSaveWithTouchTop.parents = {
            employee: {id: 'employee_id'}
        };

        var AddressCascadeSaveWithTouchTop = PersistObjectTemplate.create('AddressCascadeSaveWithTouchTop', {});

        var EmployeeCascadeSaveWithTouchTop = PersistObjectTemplate.create('EmployeeCascadeSaveWithTouchTop', {
            addresses: {type: Array, of: AddressCascadeSaveWithTouchTop, value: [], comment: 'ravi type check1'}
        });
        AddressCascadeSaveWithTouchTop.mixin({
            employee: {type: EmployeeCascadeSaveWithTouchTop, comment: 'comment to include'}
        })

        var txn = PersistObjectTemplate.begin();
        var emp = new EmployeeCascadeSaveWithTouchTop();
        var add1 = new AddressCascadeSaveWithTouchTop();
        var add2 = new AddressCascadeSaveWithTouchTop();
        add1.employee = emp;
        add2.employee = emp;
        emp.addresses.push(add1);
        emp.addresses.push(add2);

        PersistObjectTemplate.performInjections();
        PersistObjectTemplate._verifySchema();
        emp.setDirty(txn, false, true);

        var promises = [PersistObjectTemplate.synchronizeKnexTableFromTemplate(EmployeeCascadeSaveWithTouchTop),
            PersistObjectTemplate.synchronizeKnexTableFromTemplate(AddressCascadeSaveWithTouchTop)];


        return Promise.all(promises).then(function() {
            emp.cascadeSave(txn);
        }).then(function() {
            return PersistObjectTemplate.end(txn);
        }).then(function() {
            var sql = 'select description from pg_description ' +
                'join pg_class on pg_description.objoid = pg_class.oid where relname = \'tx_cascadetouch_address\' ' +
                'and  description like \'%comment to include%\'';
            return knex.raw(sql);
        }).then(function(columnDef) {
            expect(columnDef.rows.length).is.equal(1);
        }).catch(function(e) {
            expect(e.message).to.contain('Missing children entry for addresses');
        })
    });

    it('calling persist delete with transaction', function () {
        schema.EmployeePersistDelete = {};
        schema.AddressPersistDelete  = {};
        schema.EmployeePersistDelete .table = 'tx_persistdelete_employee';
        schema.AddressPersistDelete .table = 'tx_persistdelete_address';
        schema.EmployeePersistDelete .cascadeSave = true;


        schema.EmployeePersistDelete.children = {
            addresses: {id: 'employee_id'}
        };
        schema.AddressPersistDelete.parents = {
            employee: {id: 'employee_id'}
        };

        var AddressPersistDelete  = PersistObjectTemplate.create('AddressPersistDelete', {});

        var EmployeePersistDelete  = PersistObjectTemplate.create('EmployeePersistDelete', {
            addresses: {type: Array, of: AddressPersistDelete, value: []}
        });

        AddressPersistDelete.mixin({
            employee: {type: EmployeePersistDelete }
        });


        var txn = PersistObjectTemplate.begin();
        var emp = new EmployeePersistDelete();
        var add1 = new AddressPersistDelete();
        var add2 = new AddressPersistDelete();
        add1.employee = emp;
        add2.employee = emp;
        emp.addresses.push(add1);
        emp.addresses.push(add2);

        PersistObjectTemplate.performInjections();
        PersistObjectTemplate._verifySchema();
        emp.setDirty(txn, false, true);

        var promises = [PersistObjectTemplate.synchronizeKnexTableFromTemplate(EmployeePersistDelete),
            PersistObjectTemplate.synchronizeKnexTableFromTemplate(AddressPersistDelete)];


        return Promise.all(promises)
            .then(function() {
                emp.cascadeSave(txn);
                return PersistObjectTemplate.end(txn);
            }).then(function() {
                return knex.raw('ALTER TABLE public.tx_persistdelete_address ADD CONSTRAINT fk_tx_delete_employee_address2persistdelete FOREIGN KEY (employee_id) references public.tx_persistdelete_employee("_id") deferrable initially deferred');
            }).then(checkPersistDeletes.bind(this));

        function checkPersistDeletes() {
            var txn = PersistObjectTemplate.begin();
            txn.preSave = function (txn) {
                emp.persistDelete(txn);
                add1.persistDelete(txn);
                add2.persistDelete(txn);
            };

            return PersistObjectTemplate.end(txn);
        }
    });


});
