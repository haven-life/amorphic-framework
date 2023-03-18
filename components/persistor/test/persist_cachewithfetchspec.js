var chai = require('chai'),
    expect = require('chai').expect;

const { AsyncLocalStorage } = require('async_hooks');
var chaiAsPromised = require('chai-as-promised');

chai.should();
chai.use(chaiAsPromised);


var knexInit = require('knex');
const { PersistorUtils } = require('../lib/utils/PersistorUtils.js');
var knex;

var schema = {};
var schemaTable = 'index_schema_history';
var Phone, Address, Employee, empId, addressId, phoneId, Role, dob, Responsibility;
var PersistObjectTemplate, ObjectTemplate;


var ExecutionCtx = /** @class */ (function () {
    function ExecutionCtx(asOfDate) {
        this._asOfDate = asOfDate;
    }
    Object.defineProperty(ExecutionCtx.prototype, "asOfDate", {
        get: function () {
            return this._asOfDate;
        },
        enumerable: false,
        configurable: true
    });
    return ExecutionCtx;
}());
    

describe('persist newapi tests', function () {
    before('drop schema table once per test suit', function () {
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
        return knex.raw(`
                DO $$ DECLARE
            r RECORD;
        BEGIN
            FOR r IN (SELECT tablename FROM pg_tables WHERE schemaname = current_schema()) LOOP
                EXECUTE 'DROP TABLE IF EXISTS ' || quote_ident(r.tablename) || ' CASCADE';
            END LOOP;
        END $$;
        `);
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
        schema.Employee.audit = 'v2';
        schema.Address.table = 'tx_address';
        schema.Address.audit = 'v2';
        schema.Address.tableType = 'reference_data';
        schema.Phone.table = 'tx_phone';

        schema.Employee.parents = {
            homeAddress: {
                id: 'homeaddress_id'
            },
            residentialAddress: {
                id: 'residentialaddress_id'
            }
        };
        schema.Employee.children = {
            roles: { id: 'employee_id', fetch: true }
        };

        schema.Employee.enableChangeTracking = true;

        schema.Role = {};
        schema.Role.table = 'tx_role';
        schema.Role.audit = 'v2';
        schema.Role.parents = {
            employee: { id: 'employee_id' }
        };
        schema.Role.children = {
            responsibilities: { id: 'role_id' }
        };

        schema.Address.parents = {
            phone: { id: 'phone_id' }
        };
        schema.Responsibility = {};
        schema.Responsibility.table = 'tx_responsibility';
        schema.Responsibility.audit = 'v2';
        Phone = PersistObjectTemplate.create('Phone', {
            number: { type: String }
        });

        Address = PersistObjectTemplate.create('Address', {
            city: { type: String },
            state: { type: String },
            phone: { type: Phone }
        });


        Role = PersistObjectTemplate.create('Role', {
            name: { type: String },

        });

        Responsibility = PersistObjectTemplate.create('Responsibility', {
            description: { type: String },
            role: { type: Role}
        });

        Employee = PersistObjectTemplate.create('Employee', {
            name: { type: String, value: 'Test Employee' },
            homeAddress: { type: Address },
            residentialAddress: { type: Address },
            roles: { type: Array, of: Role, value: [] },
            dob: { type: Date },
            customObj: { type: Object },
            isMarried: { type: Boolean }
        });

        Role.mixin({
            employee: { type: Employee },
            responsibilities: { type: Array, of: Responsibility, value: [] },
        });
        var emp = new Employee();
        var emp1 = new Employee();
        var add = new Address();
        var resAdd = new Address();
        var phone = new Phone();
        var residentialPhone = new Phone();
         var role1 = new Role();
        // role1.name = 'firstRole2';
        // role1.employee = emp;
         var role2 = new Role();
        // role2.name = 'secondRole2';
        // role2.employee = emp;

        phone.number = '1231231234';
        residentialPhone.number = '1111111111';
        add.city = 'New York';
        add.state = 'New York';
        resAdd.city = 'Princeton';
        resAdd.state = 'New Jersey';
        resAdd.phone = residentialPhone;
        add.phone = phone;
        dob = new Date();
        emp.name = 'InitialName';
        emp.dob = dob;
        emp.homeAddress = add;
        emp.residentialAddress = resAdd;

        emp1.name = 'InitialName';
        emp1.dob = dob;
        emp1.homeAddress = add;
        emp1.residentialAddress = resAdd;

        

        // emp.roles.push(role1);
        // emp.roles.push(role2);

        (function () {
            PersistObjectTemplate.setDB(knex, PersistObjectTemplate.DB_Knex);
            PersistObjectTemplate.setSchema(schema);
            PersistObjectTemplate.performInjections();

        })();
        return Promise.resolve(prepareData());

        function prepareData() {
            return syncTable(Employee)
                .then(syncTable.bind(this, Address))
                .then(syncTable.bind(this, Phone))
                .then(syncTable.bind(this, Role))
                .then(syncTable.bind(this, Responsibility))
                .then(createRecords.bind(this))
                .catch(e => {
                    console.log(e);
                });


            function syncTable(template) {
                return PersistObjectTemplate.synchronizeKnexTableFromTemplate(template);
            }
        
            function createRecords() {
                var tx = PersistObjectTemplate.beginDefaultTransaction();
                emp1.setDirty(tx);
                return emp.persist({ transaction: tx, cascade: false }).then(function () {
                    return PersistObjectTemplate.commit({ transaction: tx, notifyChanges: true }).then(function () {
                        empId = emp._id;
                        addressId = add._id;
                        phoneId = phone._id;
                    });
                })
            }
        }
    });

    afterEach('remove tables and after each test', function () {
        return knex.raw(`
                DO $$ DECLARE
            r RECORD;
        BEGIN
            FOR r IN (SELECT tablename FROM pg_tables WHERE schemaname = current_schema()) LOOP
                EXECUTE 'DROP TABLE IF EXISTS  ' || quote_ident(r.tablename) || ' CASCADE';
            END LOOP;
        END $$;
        `);
    });

    it('Adding data and capturing for persistorFetchById cache', async function () {
    
        var asyncLocalStorage = new AsyncLocalStorage();
        var cacheKey = PersistObjectTemplate.persistorCacheCtxKey
        var ctxProps = {
            name: "persistorTest",
            properties: { [cacheKey]: {}},
        };

        return asyncLocalStorage.run(ctxProps, async function () {
            PersistObjectTemplate.setPersistorCacheContext(asyncLocalStorage);
            return loadChecks();
        })

        async function loadChecks() {
            var employees = await Employee.persistorFetchByQuery({name: 'InitialName'},
                {
                    fetch: { homeAddress: { fetch: { phone: true } }, roles: { fetch: { responsibilities: true}}  }
                });
            var employee = employees[0];
            expect(employee.name).is.equal('InitialName');
            employees = await Employee.persistorFetchByQuery({name: 'InitialName'},
                {
                    fetch: { homeAddress: { fetch: { phone: true } }, roles: { fetch: { responsibilities: true}}  }
                });
            var employee1 = employees[0];
            expect(employee1.name).is.equal('InitialName');

            employee = await Employee.persistorFetchById(empId,
                {
                    fetch: { homeAddress: { fetch: { phone: true } }, roles: { fetch: { responsibilities: true}}  }
                });

            expect(employee.homeAddress.city).is.equal('New York');
            // expect(employee.roles[0].name).is.equal('firstRole2');
            expect(employee.residentialAddress).to.equal(null);
            employee = await Employee.persistorFetchById(empId,
                {
                    fetch: { residentialAddress: true } 
                });
            expect(employee.residentialAddress).to.not.equal(null);
            expect(employee.residentialAddress.phone).to.equal(null);
            employee = await Employee.persistorFetchById(empId,
                {
                    fetch: { homeAddress: { fetch: { phone: true } }, residentialAddress: { fetch: { phone: true } }, roles: true }
                });
            expect(employee.residentialAddress.phone).to.not.equal(null);
            employee = await Employee.persistorFetchById(empId,
                {
                    fetch: { homeAddress: { fetch: { phone: true } }, residentialAddress: { fetch: { phone: true } }, roles: true }
                });
        }
    });
});