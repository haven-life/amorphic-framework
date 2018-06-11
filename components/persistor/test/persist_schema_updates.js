/**
 * Created by RSagiraji on 10/29/15.
 */

var chai = require('chai');
var expect = require('chai').expect;

var chaiAsPromised = require('chai-as-promised');
var Promise = require('bluebird');

chai.should();
chai.use(chaiAsPromised);

var ObjectTemplate = require('supertype');
var PersistObjectTemplate = require('../index.js')(ObjectTemplate, null, ObjectTemplate);


var Employee = PersistObjectTemplate.create('Employee', {
    id: {type: Number},
    name: {type: String, value: 'Test Employee'},
    newField: {type: String, value: 'Test Employee', customField: 'customValue'},
    init: function (id, name) {
        this.id = id;
        this.name = name;
    }
});


var Manager = Employee.extend('Manager', {
    init: function () {
        this.id = 12312;
        this.name = 'Manager';
        Employee.call(this);
    },
    dob: {type: Date, value: new Date()}
});

var BoolTable = PersistObjectTemplate.create('BoolTable', {
    boolField: {type: Boolean}
});

var DateTable = PersistObjectTemplate.create('DateTable', {
    dateField: {type: Date}
});

var SingleIndexTable = PersistObjectTemplate.create('SingleIndexTable', {
    id: {type: Number},
    name: {type: String, value: 'Name'},
    init: function (id, name) {
        this.id = id;
        this.name = name;
    }
});


var MultipleIndexTable = PersistObjectTemplate.create('MultipleIndexTable', {
    id: {type: Number},
    name: {type: String, value: 'Name'},
    init: function (id, name) {
        this.id = id;
        this.name = name;
    }
});

var ChangeFieldTypeTable = PersistObjectTemplate.create('ChangeFieldTypeTable', {
    id: {type: String},
    name: {type: String, value: 'Test Employee'},
    init: function (id, name) {
        this.id = id;
        this.name = name;
    }
});

var IndexSyncTable = PersistObjectTemplate.create('IndexSyncTable', {
    id: {type: Number},
    name: {type: String, value: 'Test Employee'}
});

var Parent = PersistObjectTemplate.create('Parent', {
    first: {type: String},
    last: {type: String}
});

var ExtendParent = Parent.extend('ExtendParent', {
    extend: {type: String}
});

var schema = {
    Employee: {
        documentOf: 'pg/employee'
    },
    Manager: {
        documentOf: 'pg/Manager',
        indexes: [{
            name: 'single_index',
            def: {
                columns: ['dob', 'name'],
                type: 'unique'
            }
        }]
    },
    Parent: {
        documentOf:'pg/ParentExtendTest'
    },
    BoolTable: {
        documentOf: 'pg/BoolTable'
    },
    DateTable: {
        documentOf: 'pg/DateTable'
    },
    ChangeFieldTypeTable: {
        documentOf: 'pg/ChangeFieldTypeTable'
    },
    SingleIndexTable: {
        documentOf: 'pg/SingleIndexTable',
        indexes: [{
            name: 'single_index',
            def: {
                columns: ['id', 'name'],
                type: 'unique'
            }
        }]
    },
    MultipleIndexTable: {
        documentOf: 'pg/MultipleIndexTable',
        indexes: [
            {
                name: 'fst_index',
                def: {
                    columns: ['name'],
                    type: 'index'
                }
            },
            {
                name: 'scd_index',
                def: {
                    columns: ['name', 'id'],
                    type: 'index'
                }
            }]
    },
    IndexSyncTable: {
        documentOf: 'pg/IndexSyncTable',
        indexes: [
            {
                name: 'Fst_Index',
                def: {
                    columns: ['name'],
                    type: 'index'
                }
            }
        ]
    }
}


var schemaTable = 'index_schema_history';

describe('schema update checks', function () {
    var knex = require('knex')({
        client: 'pg',
        connection: {
            host: '127.0.0.1',
            database: 'test',
            user: 'postgres',
            password: 'postgres'
        }
    });

    before('arrange', function (done) {
        (function () {

            PersistObjectTemplate.setDB(knex, PersistObjectTemplate.DB_Knex, 'pg');
            PersistObjectTemplate.setSchema(schema);
            PersistObjectTemplate.performInjections(); // Normally done by getTemplates
        })();
        return Promise.all([
            knex.schema.dropTableIfExists('NewTable'),
            knex.schema.dropTableIfExists('employee'),
            PersistObjectTemplate.dropKnexTable(Employee),
            PersistObjectTemplate.dropKnexTable(Manager),
            PersistObjectTemplate.dropKnexTable(BoolTable),
            PersistObjectTemplate.dropKnexTable(DateTable),
            PersistObjectTemplate.dropKnexTable(SingleIndexTable),
            PersistObjectTemplate.dropKnexTable(MultipleIndexTable),
            PersistObjectTemplate.dropKnexTable(Parent),
            knex.schema.dropTableIfExists('employee'),
            knex.schema.dropTableIfExists('ChangeFieldTypeTable'),
            knex.schema.dropTableIfExists('DateTable'),
            knex.schema.dropTableIfExists('CreatingTable'),
            knex.schema.dropTableIfExists('CreateNewType'),
            knex.schema.dropTableIfExists('newTableWithoutTableDef'),
            knex.schema.dropTableIfExists('IndexSyncTable').then(function() {
                knex.schema.createTableIfNotExists('IndexSyncTable', function (table) {
                    table.double('id');
                    table.text('name')
                })
            }),
            knex.schema.dropTableIfExists(schemaTable)

        ]).should.notify(done);
    });
    after('closes the database', function () {
        return knex.destroy();
    });



    it('create a simple table', function (done) {
        return PersistObjectTemplate.createKnexTable(Employee).then(function () {
            return PersistObjectTemplate.checkForKnexTable(Employee).should.eventually.equal(true);
        }).should.notify(done);
    });

    it('change to incompatible type and check for exception', function () {
        return knex.schema.createTableIfNotExists('ChangeFieldTypeTable', function (table) {
            table.integer('id');
            table.text('name')
        }).then(function () {
            return PersistObjectTemplate.synchronizeKnexTableFromTemplate(ChangeFieldTypeTable).should.eventually.be.rejectedWith(Error);
        });
    });

    it('create a table for extended object', function () {
        return PersistObjectTemplate.createKnexTable(ExtendParent).then(function() {
            return PersistObjectTemplate.checkForKnexTable(Parent).should.eventually.equal(true);
        })
    });

    it('create a table with a boolean field', function () {
        return PersistObjectTemplate.createKnexTable(BoolTable).then(function () {
            return PersistObjectTemplate.checkForKnexColumnType(BoolTable, 'boolField').should.eventually.equal('boolean');
        })
    });

    it('create a table with a date field', function () {
        return PersistObjectTemplate.createKnexTable(DateTable).then(function () {
            return PersistObjectTemplate.checkForKnexColumnType(DateTable, 'dateField').should.eventually.contains('timestamp');
        })
    });

    it('create a table with an index', function () {
        return PersistObjectTemplate.synchronizeKnexTableFromTemplate(SingleIndexTable).then(function () {
            return PersistObjectTemplate.checkForKnexTable(SingleIndexTable).should.eventually.equal(true);
        })
    });

    it('synchronize the index definition and check if the index exists on the table by dropping the index', function () {
        return  PersistObjectTemplate.synchronizeKnexTableFromTemplate(IndexSyncTable).then(function () {
            return knex.schema.table('IndexSyncTable', function (table) {
                table.dropIndex([], 'idx_indexsynctable_name');
            }).should.eventually.have.property('command')
        });
    });

    it('create a new type and synchronize the table.. ', function () {
        schema.CreateNewType = {};
        schema.CreateNewType.documentOf = 'pg/CreateNewType';
        var CreateNewType = PersistObjectTemplate.create('CreateNewType', {
            id: {type: String}
        })

        PersistObjectTemplate._verifySchema();
        return PersistObjectTemplate.synchronizeKnexTableFromTemplate(CreateNewType).then(function () {
            return PersistObjectTemplate.checkForKnexTable(CreateNewType).should.eventually.equal(true);
        })
    });

    it('add a new type and check if the table creation is adding the index definition...', function() {
        schema.CreatingTable = {};
        schema.CreatingTable.documentOf = 'pg/CreatingTable';
        schema.CreatingTable.indexes = JSON.parse('[{"name": "single_index_1","def": {"columns": ["id"],"type": "unique"}}]');
        var CreatingTable = PersistObjectTemplate.create('CreatingTable', {
            id: {type: String},
            name: {type: String, value: 'CreatingTable'},
            init: function (id, name) {
                this.id = id;
                this.name = name;
            }
        });

        return Promise.resolve(PersistObjectTemplate._verifySchema()).then(function () {
            return PersistObjectTemplate.createKnexTable(CreatingTable).then(function () {
                return PersistObjectTemplate.checkForKnexTable(CreatingTable).should.eventually.equal(true);
            })
        })
    })

    it('Add a new index and call createKnexTable to create the table and the corresponding indexes', function () {
        schema.newTable = {};
        schema.newTable.documentOf = 'pg/NewTable';
        var newTable = PersistObjectTemplate.create('newTable', {
            id: {type: String},
            name: {type: String, value: 'PrimaryIndex'},
            init: function (id, name) {
                this.id = id;
                this.name = name;
            }
        })
        schema.newTable.indexes = (JSON.parse('[{"name": "scd_index","def": {"columns": ["id"],"type": "primary"}}]'));

        PersistObjectTemplate._verifySchema();
        return PersistObjectTemplate.synchronizeKnexTableFromTemplate(newTable).should.eventually.be.rejectedWith(Error, 'index type can be only "unique" or "index"');
    });

    it('add a new table definition to the schema and try to synchronize', function () {
        schema.newTable = {};
        schema.newTable.documentOf = 'pg/NewTable';
        var newTable = PersistObjectTemplate.create('newTable', {
            id: {type: String},
            name: {type: String, value: 'PrimaryIndex'},
            init: function (id, name) {
                this.id = id;
                this.name = name;
            }
        })
        schema.newTable.indexes = JSON.parse('[{"name": "single_index","def": {"columns": ["id", "name"],"type": "unique"}}]');
        PersistObjectTemplate._verifySchema();
        return PersistObjectTemplate.synchronizeKnexTableFromTemplate(newTable).then(function () {
            return knex(schemaTable)
                .select('schema')
                .orderBy('sequence_id', 'desc')
                .limit(1)
                .then(function (records) {
                    return Promise.resolve(records[0].schema);
                })
        }).should.eventually.contain('NewTable');

    });


    it('drop an index if exits', function () {
        return PersistObjectTemplate.DropIfKnexIndexExists(SingleIndexTable, 'idx_singleindextable_id_name').should.eventually.have.property('command').that.match(/DROP|ALTER/);
    });

    it('drop an index which does not exists to check the exception', function () {
        return PersistObjectTemplate.DropIfKnexIndexExists(SingleIndexTable, 'notavailable').should.be.rejectedWith(Error);
    });

    it('create a table with multiple indexes', function () {
        //don't like to check the result this way.. but I felt that using knex in the test cases is equally bad
        //and the knex responses are not clean, will check with Sam and make necessary changes..
        return PersistObjectTemplate.createKnexTable(MultipleIndexTable).then(function () {
            return PersistObjectTemplate.checkForKnexTable(MultipleIndexTable).should.eventually.equal(true);
        })
    });


    it('save all employees in the cache...', function () {
        var tx = PersistObjectTemplate.begin();
        var ravi = new Employee(2, 'kumar334444');
        ravi.setDirty(tx);
        return PersistObjectTemplate.saveAll(tx).then(function(records) {
            expect(records).to.equal(true);
        });
    });

    it('save bool type and check the return value and type', function () {
        var boolData = new BoolTable(true);
        return boolData.persistSave().should.eventually.equal(boolData._id);
    });

    it('save employee individually...', function (done) {
        var validEmployee = new Employee('1111', 'New Employee');
        try {
            validEmployee.persistSave().then(function (id) {
                expect(id.length).to.equal(24);
                expect(validEmployee._id).to.equal(id);
                done();
            });
        }
        catch (e) {
            expect(e).to.equal(null);
            done(e);
        }
    });

    it('should throw exception for non numeric ids', function () {
        var invalidEmployee = new Employee('AAAA', 'Failed Employee');
        return invalidEmployee.persistSave().should.be.rejectedWith(Error, 'insert into');
    });

    it('without defining the default db alias', function () {
        var WithOutSchema = PersistObjectTemplate.create('WithOutSchema', {});
        PersistObjectTemplate._injectObjectFunctions(WithOutSchema);
        var obj = new WithOutSchema();
        expect(obj.persistSave.bind(obj)).to.throw('DB Alias __default__ not set');

    });

    it('checkobject calls', function () {
        var WithOutSchema1 = function() {};
        var obj = new WithOutSchema1();
        expect(PersistObjectTemplate.checkObject.bind(this, obj)).to.throw(Error, 'Attempt to save an non-templated Object');

        WithOutSchema1 = PersistObjectTemplate.create('WithOutSchema1', {});
        obj = new WithOutSchema1();
        expect(PersistObjectTemplate.checkObject.bind(this, obj)).to.throw(Error, 'Schema entry missing for');
    });

    it('without defining table in the schema, try to synchronize', function () {
        schema.newTableWithoutTableDef = {};
        schema.newTableWithoutTableDef.documentOf = 'pg/newTableWithoutTableDef';
        schema.newTableWithoutTableDef.parents = {
            homeAddress: {id: 'homeaddress_id' }
        };
        var AddressForMissingTableDef =  PersistObjectTemplate.create('AddressForMissingTableDef', {
            street: {type: String, value: 'test'}
        });

        var newTableWithoutTableDef = PersistObjectTemplate.create('newTableWithoutTableDef', {
            id: {type: String},
            name: {type: String, value: 'PrimaryIndex', description:'comment name'},
            init: function (id, name) {
                this.id = id;
                this.name = name;
            }

        });
        PersistObjectTemplate._verifySchema();
        return PersistObjectTemplate.synchronizeKnexTableFromTemplate(newTableWithoutTableDef).then(function() {
            newTableWithoutTableDef.mixin(
                {
                    homeAddress: {type: AddressForMissingTableDef},
                    addresses: {type: Array, of: AddressForMissingTableDef, value: []},
                    isMarried: {type: Boolean},
                    numberOfKids: {type: Number},
                    dob: {type:Date, description:'comment date' }
                });
            PersistObjectTemplate._verifySchema();
            return PersistObjectTemplate.synchronizeKnexTableFromTemplate(newTableWithoutTableDef)
        });

    });

})

