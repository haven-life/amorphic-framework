var chai = require('chai');
var expect = require('chai').expect;

var chaiAsPromised = require('chai-as-promised');

chai.should();
chai.use(chaiAsPromised);

var Promise = require('bluebird');
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

var schemaTable = 'index_schema_history';
describe('index synchronization checks', function () {
    var knex = require('knex')({
        client: 'pg',
        connection: {
            host: '127.0.0.1',
            database: 'persistor_banking',
            user: 'postgres',
            password: 'postgres'
        }
    });
    var checkKeyExistsInSchema = function(key) {
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
    var getIndexes = function(key) {
        return knex(schemaTable)
            .select('schema')
            .orderBy('sequence_id', 'desc')
            .limit(1)
            .then(function (records) {
                if (!records[0]) return [];
                return JSON.parse(records[0].schema)[key].indexes;
            })
    };

    before('arrange', function (done) {

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


    it('synchronize the table without defining the indexes and make sure that the process does not make any entries to the schema table', function () {
        //sync table
        return  PersistObjectTemplate.synchronizeKnexTableFromTemplate(ExtendParent).then(function() {
            return checkKeyExistsInSchema('ExtendParent').should.eventually.equal(false);
        })
    });

    it('synchronize the index definition and check if the index exists on the table by dropping the index', function () {
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
            return PersistObjectTemplate.synchronizeKnexTableFromTemplate(IndexSyncTable).then(function () {
                return getIndexes('IndexSyncTable').should.eventually.have.length(0);
            })
        });
    });

    it('adding an index should upddate the table again..', function () {
        schema.IndexSyncTable.indexes = [
            {
                name: 'Fst_Index',
                def: {
                    columns: ['name'],
                    type: 'index'
                }
            }
        ];
        return PersistObjectTemplate.synchronizeKnexTableFromTemplate(IndexSyncTable).then(function () {
            return getIndexes('IndexSyncTable').should.eventually.have.length(1);
        });
    });

    it('adding an index should upddate the table again..', function () {
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
        return PersistObjectTemplate.synchronizeKnexTableFromTemplate(IndexSyncTable).then(function () {
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

    it('creating parent and child and synchronize the parent to check the child table indexes', function (done) {
        PersistObjectTemplate.synchronizeKnexTableFromTemplate(Employee).then(function () {
            Promise.all([getIndexes('Employee').should.eventually.have.length(2),
                getIndexes('Manager').should.eventually.have.length(1),
                getIndexes('Executive').should.eventually.have.length(1)]).should.notify(done);
        });
    });
});