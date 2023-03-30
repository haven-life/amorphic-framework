var chai = require('chai'),
    expect = require('chai').expect;

var chaiAsPromised = require('chai-as-promised');

chai.should();
chai.use(chaiAsPromised);


var knexInit = require('knex');
const { PersistorUtils } = require('../lib/utils/PersistorUtils.js');
var knex;

var schema = {};
var schemaTable = 'index_schema_history';
var Phone, Address, Employee, empId, addressId, phoneId, Role, dob;
var PersistObjectTemplate, ObjectTemplate;

describe('persist pointintime tests', function () {
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
        schema.Phone.audit = 'v2';

        schema.Employee.parents = {
            homeAddress: {
                id: 'address_id',
                fetch: true
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
            department: { id: 'role_id' }
        };

        schema.Address.parents = {
            phone: { id: 'phone_id' }
        };
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

        Employee = PersistObjectTemplate.create('Employee', {
            name: { type: String, value: 'Test Employee' },
            homeAddress: { type: Address },
            roles: { type: Array, of: Role, value: [] },
            dob: { type: Date },
            customObj: { type: Object },
            isMarried: { type: Boolean }
        });

        Role.mixin({
            employee: { type: Employee }
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
        emp.name = 'InitialName';
        dob = new Date();
        emp.dob = dob;
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
            return syncTable(Employee)
                .then(syncTable.bind(this, Address))
                .then(syncTable.bind(this, Phone))
                .then(syncTable.bind(this, Role))
                .then(addConstraint.bind(this))
                .then(addDateFields.bind(this))
                .then(addTriggers.bind(this))
                .then(createRecords.bind(this));


            function syncTable(template) {
                return PersistObjectTemplate.synchronizeKnexTableFromTemplate(template);
            }

            function addConstraint() {
                 return knex.raw('ALTER TABLE tx_role ADD CONSTRAINT namechk CHECK (char_length(name) <= 50);')
            }

            function addDateFields() {
                return knex.raw(` DO $$ DECLARE
                r RECORD;
            BEGIN
                FOR r IN (SELECT tablename FROM pg_tables WHERE schemaname = current_schema()) LOOP
                    EXECUTE 'ALTER table ' || quote_ident(r.tablename) || ' ADD COLUMN "createdTime" TIMESTAMP with time zone';
                    EXECUTE 'ALTER table ' || quote_ident(r.tablename) || ' ADD COLUMN "lastUpdatedTime" TIMESTAMP with time zone';
                END LOOP;
            END $$;`);
            }

            async function addTriggers() {
                await Promise.all([knex.raw(`
                CREATE OR REPLACE FUNCTION public.createddate_trigger()
            RETURNS trigger
            LANGUAGE plpgsql
            AS $function$
                DECLARE columns text;
                table_exists bool;
            begin
                
            --using now as we track timezone in date fields..
            NEW."createdTime" = now();
            NEW."lastUpdatedTime" = now();
            execute format(
            ' SELECT EXISTS (
                SELECT FROM 
                    information_schema.tables 
                WHERE 
                    table_type LIKE ''BASE TABLE'' AND
                    table_name = ''%1$s___history''
                );
                ', TG_TABLE_NAME ) into table_exists;
                
                
            
            if POSITION('___history' in TG_TABLE_NAME) = 0  and table_exists then
            EXECUTE format('SELECT  string_agg(''"'' || c1.attname || ''"'', '','')
                FROM    pg_attribute c1
                where      c1.attrelid = ''%s''::regclass
                AND     c1.attname <> ''_id''
                AND     c1.attnum > 0;', TG_TABLE_NAME) INTO columns;
            
            
                execute  format(
                    '   INSERT INTO %1$s___history ( _id, _snapshot_id, %2$s )
                        values (md5(random()::text || ''%3$s'' || clock_timestamp()::text)::uuid, $1.*)
                    ', TG_TABLE_NAME, columns, new._id) using new;
                    
            end if;
            RETURN NEW;
            END
            $function$
            ;



`), knex.raw(`
                CREATE OR REPLACE FUNCTION public.modifieddate_trigger()
                    RETURNS trigger
                    LANGUAGE plpgsql
                    AS $function$
                        DECLARE columns text;
                        table_exists bool;
                    begin
                        
                    --using now as we track timezone in date fields..
                    NEW."lastUpdatedTime" = now();
                    
                    execute format(
                        ' SELECT EXISTS (
                        SELECT FROM 
                            information_schema.tables 
                        WHERE 
                            table_type LIKE ''BASE TABLE'' AND
                            table_name = ''%1$s___history''
                        );
                        ', TG_TABLE_NAME ) into table_exists;
                    

                    if POSITION('___history' in TG_TABLE_NAME) = 0 AND table_exists then
                    EXECUTE format('SELECT  string_agg(''"'' || c1.attname || ''"'', '','')
                        FROM    pg_attribute c1
                        where      c1.attrelid = ''%s''::regclass
                        AND     c1.attname <> ''_id''
                        AND     c1.attnum > 0;', TG_TABLE_NAME) INTO columns;
                    
                    
                        execute  format(
                            '   INSERT INTO %1$s___history ( _id, _snapshot_id, %2$s )
                                values (md5(random()::text || ''%3$s'' || clock_timestamp()::text)::uuid, $1.*)
                            ', TG_TABLE_NAME, columns, new._id) using new;
                            
                    end if;
                    RETURN NEW;
                    END
                    $function$
                    ;

                `)]);

                return Promise.all([knex.raw(`
                DO $$ DECLARE
                r RECORD;
                table_exists bool;
                                BEGIN
                                    FOR r IN (SELECT tablename FROM pg_tables WHERE schemaname = current_schema()) LOOP
                                    execute format(
                                        ' SELECT EXISTS (
                                        SELECT FROM 
                                            information_schema.tables 
                                        WHERE 
                                            table_type LIKE ''BASE TABLE'' AND
                                            table_name = ''%1$s''
                                        );
                                        ', r.tablename ) into table_exists;

                                    if POSITION('___history' in r.tablename) = 0 AND table_exists then
                                        EXECUTE 'create trigger createddate_inserttrigger before
                                        insert
                                            on
                                            ' || quote_ident(r.tablename) || '  for each row execute procedure createddate_trigger();';
                                    end if;
                                    END LOOP;
                                END $$;
                                    `),
                knex.raw(`
                                    DO $$ DECLARE
                                    r RECORD;
                                BEGIN
                                    FOR r IN (SELECT tablename FROM pg_tables WHERE schemaname = current_schema()) LOOP
                                    if POSITION('___history' in r.tablename) = 0 then
                                        EXECUTE 'create trigger modifieddate_updatetrigger before
                                        update
                                            on
                                            ' || quote_ident(r.tablename) || '  for each row execute procedure modifieddate_trigger();';
                                    end if;
                                    END LOOP;
                                END $$;
                `)]);
            }

            function createRecords() {
                var tx = PersistObjectTemplate.beginDefaultTransaction();

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

    it('Adding data and capturing for persistorFetchById', async function () {
        var orgRecordedTime = new Date();
        var employee = await Employee.persistorFetchById(empId,
            {
                fetch: { homeAddress: { fetch: { phone: true } }, roles: true }, projection: { Address: ['city'], Role: ['name'], Phone: [''] }
            });

        employee.name = 'First Update';
        employee.homeAddress.city = 'First city update';
        employee.roles[0].name = 'First role update';
        
        var tx = PersistObjectTemplate.beginDefaultTransaction();
        employee.setDirty(tx);
        employee.homeAddress.setDirty(tx);
        employee.roles[0].setDirty(tx);
        // await employee.persistSave();
        await PersistObjectTemplate.commit({transaction: tx});
        var updatedTime = new Date();
        employee = await Employee.persistorFetchById(empId,
            {
                asOfDate: orgRecordedTime,
                fetch: { homeAddress: { fetch: { phone: true } }, roles: true }, projection: { Address: ['city'], Role: ['name'], Phone: [''] }
            });
        expect(employee.name).is.equal('InitialName');
        expect(employee.homeAddress.city).is.equal('New York');
        expect(employee.roles[0].name).is.equal('firstRole2');
        employee = await Employee.persistorFetchById(empId,
            {
                asOfDate: updatedTime,
                fetch: { homeAddress: { fetch: { phone: true } }, roles: true }, projection: { Address: ['city'], Role: ['name'], Phone: [''] }
            });
        expect(employee.name).is.equal('First Update');
        expect(employee.homeAddress.city).is.equal('First city update');
        expect(employee.roles[0].name).is.equal('First role update');
    });
    it('Adding data and capturing for persistorFetchByQuery', async function () {
        var orgRecordedTime = new Date();
        var employee = (await Employee.persistorFetchByQuery({dob: dob},
            {
                fetch: { homeAddress: { fetch: { phone: true } }, roles: true }, projection: { Address: ['city'], Role: ['name'], Phone: [''] }
            }))[0];

        employee.name = 'First Update';
        employee.homeAddress.city = 'First city update';
        employee.roles[0].name = 'First role update';
        
        var tx = PersistObjectTemplate.beginDefaultTransaction();
        employee.setDirty(tx);
        employee.homeAddress.setDirty(tx);
        employee.roles[0].setDirty(tx);
        // await employee.persistSave();
        await PersistObjectTemplate.commit({transaction: tx});
        var updatedTime = new Date();
        employee = (await Employee.persistorFetchByQuery({dob: dob},
            {
                asOfDate: orgRecordedTime,
                fetch: { homeAddress: { fetch: { phone: true } }, roles: true }, projection: { Address: ['city'], Role: ['name'], Phone: [''] }
            }))[0];

        expect(employee.name).is.equal('InitialName');
        expect(employee.homeAddress.city).is.equal('New York');
        expect(employee.roles[0].name).is.equal('firstRole2');
        employee = (await Employee.persistorFetchByQuery({dob: dob},
            {
                asOfDate: updatedTime,
                fetch: { homeAddress: { fetch: { phone: true } }, roles: true }, projection: { Address: ['city'], Role: ['name'], Phone: [''] }
            }))[0];
        expect(employee.name).is.equal('First Update');
        expect(employee.homeAddress.city).is.equal('First city update');
        expect(employee.roles[0].name).is.equal('First role update');
    });
    it('Adding data and capturing for getFromPersistWithId', async function () {
        var orgRecordedTime = new Date();
        var employee = await Employee.getFromPersistWithId(empId,
            { homeAddress: { fetch: { phone: true } }, roles: true });

        employee.name = 'First Update';
        employee.homeAddress.city = 'First city update';
        employee.roles[0].name = 'First role update';
        
        var tx = PersistObjectTemplate.beginDefaultTransaction();
        employee.setDirty(tx);
        employee.homeAddress.setDirty(tx);
        employee.roles[0].setDirty(tx);
        // await employee.persistSave();
        await PersistObjectTemplate.commit({transaction: tx});
        var updatedTime = new Date();
        employee = await Employee.getFromPersistWithId(empId,
            { homeAddress: { fetch: { phone: true } }, roles: true }, false, undefined, false, undefined, orgRecordedTime);

        expect(employee.name).is.equal('InitialName');
        expect(employee.homeAddress.city).is.equal('New York');
        expect(employee.roles[0].name).is.equal('firstRole2');
        employee = await Employee.getFromPersistWithId(empId,
            { homeAddress: { fetch: { phone: true } }, roles: true }, false, undefined, false, undefined, updatedTime);
        expect(employee.name).is.equal('First Update');
        expect(employee.homeAddress.city).is.equal('First city update');
        expect(employee.roles[0].name).is.equal('First role update');
    });
    it('Adding data and capturing for getFromPersistWithQuery', async function () {
        var orgRecordedTime = new Date();
        var employee = (await Employee.getFromPersistWithQuery({dob: dob},
            { homeAddress: { fetch: { phone: true } }, roles: true }))[0];

        employee.name = 'First Update';
        employee.homeAddress.city = 'First city update';
        employee.roles[0].name = 'First role update';
        
        var tx = PersistObjectTemplate.beginDefaultTransaction();
        employee.setDirty(tx);
        employee.homeAddress.setDirty(tx);
        employee.roles[0].setDirty(tx);
        // await employee.persistSave();
        await PersistObjectTemplate.commit({transaction: tx});
        var updatedTime = new Date();
        employee = (await Employee.getFromPersistWithQuery({dob: dob},
            { homeAddress: { fetch: { phone: true } }, roles: true }, false, undefined, false, undefined, undefined, undefined, orgRecordedTime))[0];

        expect(employee.name).is.equal('InitialName');
        expect(employee.homeAddress.city).is.equal('New York');
        expect(employee.roles[0].name).is.equal('firstRole2');
        employee = (await Employee.getFromPersistWithQuery({dob: dob},
            { homeAddress: { fetch: { phone: true } }, roles: true }, false, undefined, false, undefined, undefined, undefined, updatedTime))[0];
        expect(employee.name).is.equal('First Update');
        expect(employee.homeAddress.city).is.equal('First city update');
        expect(employee.roles[0].name).is.equal('First role update');
    });
});