var chai = require('chai');
var expect = require('chai').expect;

var chaiAsPromised = require('chai-as-promised');

chai.should();
chai.use(chaiAsPromised);

// 
var ObjectTemplate = require('@haventech/supertype').default;
var PersistObjectTemplate = require('../dist/index.js')(ObjectTemplate, null, ObjectTemplate);


var Address = PersistObjectTemplate.create('Address', {
    id: { type: Number },
    init: function(id) {
        this.id = id;
    }
});

var Employee = PersistObjectTemplate.create('Employee', {
    id: {type: Number},
    name: {type: String, value: 'Test Employee'},
    newField: {type: String, value: 'Test Employee', customField: 'customValue'},
    address: { type: Address },
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

/*eslint-disable no-unused-vars*/
var Executive = Manager.extend('Executive', {
    init: function () {
        this.id = 12312;
        this.name = 'Manager';
        Employee.call(this);
    },
    execRole: {type: String, value: ''}
});

var ChangeFieldTypeTable = PersistObjectTemplate.create('ChangeFieldTypeTable', {
    id: {type: String},
    name: {type: String, value: 'Test Employee'},
    init: function (id, name) {
        this.id = id;
        this.name = name;
    }
});
/*eslint-enable no-unused-vars*/
var  BoolTable = PersistObjectTemplate.create('BoolTable', {
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
        documentOf: 'pg/employee',
        parents: {
            address: {
                id: 'address_id',
                fetch: 'yes',
                skipIndexCreation: true
            },
        },
        indexes: [{
            name: 'fst_index',
            def: {
                columns: ['name'],
                type: 'unique'
            }
        },
            {
                name: 'new_index',
                def: {
                    columns: ['id'],
                    type: 'unique'
                }
            }]
    },
    Manager: {
        documentOf: 'pg/Manager',
        indexes: [{
            name: 'single_index',
            def: {
                columns: ['name'],
                type: 'unique'
            }
        }]
    },
    Address: {
        documentOf: 'pg/address',
        table: 'address'
    },
    Executive: {
        documentOf: 'pg/Manager',
        indexes: [{
            name: 'exec_index',
            def: {
                columns: ['execRole'],
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
        documentOf: 'pg/singleIndexTable',
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
var knexInit = require('knex');
var knex;
var schemaTable = 'index_schema_history';
describe('index synchronization checks', function () {
    var checkKeyExistsInSchema;
    var getIndexes;

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

        checkKeyExistsInSchema = function(key) {
            return knex(schemaTable)
                .select('schema')
                .orderBy('sequence_id', 'desc')
                .limit(1)
                .then(function (records) {
                    if (!records[0]) return false;
                    var pattern = new RegExp(key);
                    return !!records[0].schema.match(pattern);
                })
        };

        getIndexes = function(key) {
            return knex(schemaTable)
                .select('schema')
                .orderBy('sequence_id', 'desc')
                .limit(1)
                .then(function (records) {
                    if (!records[0]) return [];
                    return JSON.parse(records[0].schema)[key].indexes;
                });
        };

        (function () {
            PersistObjectTemplate.setDB(knex, PersistObjectTemplate.DB_Knex, 'pg');
            PersistObjectTemplate.setSchema(schema);
            PersistObjectTemplate.performInjections(); // Normally done by getTemplates
        })();

        return Promise.all([
            knex.schema.dropTableIfExists('notificationCheck'),
            knex.schema.dropTableIfExists('caseChangeCheck'),
            PersistObjectTemplate.dropKnexTable(Employee),
            //PersistObjectTemplate.dropKnexTable(Manager),
            PersistObjectTemplate.dropKnexTable(BoolTable),
            PersistObjectTemplate.dropKnexTable(DateTable),
            PersistObjectTemplate.dropKnexTable(SingleIndexTable),
            PersistObjectTemplate.dropKnexTable(IndexSyncTable),
            PersistObjectTemplate.dropKnexTable(MultipleIndexTable),
            PersistObjectTemplate.dropKnexTable(Parent),
            knex(schemaTable).del(),
            knex.schema.dropTableIfExists('IndexSyncTable')
        ]).should.notify(done);
    });
    after('closes the database', function () {
        return knex.destroy();
    });


    it('synchronize the table without defining the indexes and make sure that the process does not make any entries to the schema table', function () {
        //sync table
        return  PersistObjectTemplate.synchronizeKnexTableFromTemplate(ExtendParent).then(function() {
            return checkKeyExistsInSchema('ExtendParent').should.eventually.equal(false);
        })
    });

    it('synchronize the index definition and check if the index exists on the table by dropping the index in indexdefchnages', function () {
        return  PersistObjectTemplate.synchronizeKnexTableFromTemplate(IndexSyncTable).should.eventually.have.property('command').that.match(/INSERT/);
    });

    it('calling synchronizeKnexTableFromTemplate without any changes to the schema definitions..', function () {
        return  PersistObjectTemplate.synchronizeKnexTableFromTemplate(IndexSyncTable).should.eventually.be.fulfilled;
    });

    it('synchronize the index definition for a new table and leave it in the schema table..', function () {
        return  PersistObjectTemplate.synchronizeKnexTableFromTemplate(MultipleIndexTable).then(function() {
            return checkKeyExistsInSchema('MultipleIndexTable').should.eventually.equal(true);
        })
    });

    it('remove the existing index definition, system should delete the index', function () {
        return PersistObjectTemplate.synchronizeKnexTableFromTemplate(IndexSyncTable).then(function () {
            schema.IndexSyncTable.indexes = [];
            return PersistObjectTemplate.synchronizeKnexTableFromTemplate(IndexSyncTable, null, true).then(function () {
                return getIndexes('IndexSyncTable').should.eventually.have.length(0);
            })
        });
    });

    it('add index and sync', function () {
        schema.IndexSyncTable.indexes = [
            {
                name: 'Fst_Index',
                def: {
                    columns: ['name'],
                    type: 'index'
                }
            }
        ];
        return PersistObjectTemplate.synchronizeKnexTableFromTemplate(IndexSyncTable, null, true).then(function () {
            return getIndexes('IndexSyncTable').should.eventually.have.length(1);
        });
    });

    it('adding an index should update the table again..', function () {
        schema.IndexSyncTable.indexes = [
            {
                name: 'Fst_Index',
                def: {
                    columns: ['name'],
                    type: 'index'
                }
            },
            {
                name: 'Scd_Index',
                def: {
                    columns: ['id'],
                    type: 'index'
                }
            }
        ];
        return PersistObjectTemplate.synchronizeKnexTableFromTemplate(IndexSyncTable, null, true).then(function () {
            return getIndexes('IndexSyncTable').should.eventually.have.length(2);
        });
    });

    it('changing the index type should update the table again..', function () {
        schema.IndexSyncTable.indexes = [
            {
                name: 'Fst_Index_New',
                def: {
                    columns: ['name'],
                    type: 'unique'
                }
            },
            {
                name: 'Scd_Index',
                def: {
                    columns: ['id'],
                    type: 'index'
                }
            }
        ];
        return PersistObjectTemplate.synchronizeKnexTableFromTemplate(IndexSyncTable, null, true).then(function () {
            return getIndexes('IndexSyncTable').should.eventually.have.length(2);
        });
    });

    it('adding a new field and verifying the notification', function () {
        function fieldsNotify(fields) {
            expect(fields).to.match(/newField|notificationCheck/);
        }
        schema.notificationCheck = {};
        schema.notificationCheck.documentOf = 'pg/notificationCheck';
        var notificationCheck = PersistObjectTemplate.create('notificationCheck', {
            id: {type: String},
            name: {type: String, value: 'PrimaryIndex'},
            init: function (id, name) {
                this.id = id;
                this.name = name;
            }
        });
        PersistObjectTemplate._verifySchema();
        return PersistObjectTemplate.synchronizeKnexTableFromTemplate(notificationCheck, fieldsNotify).then(function () {
            var notificationCheck = PersistObjectTemplate.create('notificationCheck', {
                id: {type: String},
                name: {type: String, value: 'PrimaryIndex'},
                newField: {type: String, value: 'PrimaryIndex'},
                init: function (id, name) {
                    this.id = id;
                    this.name = name;
                }
            });
            PersistObjectTemplate._verifySchema();
            return PersistObjectTemplate.synchronizeKnexTableFromTemplate(notificationCheck, fieldsNotify);
        });
    });

    // we have two indexes manually placed on the employee table. without index skipping behavior,
    // we would have three, an additional one being placed on address FK. test to make sure that
    // we are indeed skipping this index
    it('should skip creating the address index', () => {
        return PersistObjectTemplate.synchronizeKnexTableFromTemplate(Employee, null, true).then(function () {
            return getIndexes('Employee').should.eventually.have.length(2);
        });
    });

    it('should create the address FK index', () => {
        // don't skip this particular FK index creation anymore
        schema.Employee.parents.address.skipIndexCreation = false;

        // in a normal app startup scenario, this wouldn't need to be touched, but since
        // we're in a testing environment, pretend as if we haven't indexed things yet
        PersistObjectTemplate._schema.__indexed__ = false;

        // take our updated schema and place it on the global object template
        PersistObjectTemplate.setSchema(schema);

        // run through the pathway that creates the dynamically generated indexes
        // e.g. foreign key indexes
        // don't need this if we're manually creating indexes in the `indexes` property on the schema
        PersistObjectTemplate._verifySchema();

        // synchronize DB with our in memory schema definition
        return PersistObjectTemplate.synchronizeKnexTableFromTemplate(Employee, null, true).then(function () {
            return getIndexes('Employee').should.eventually.have.length(3);
        });
    });
});