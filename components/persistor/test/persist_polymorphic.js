/*Need to skip unused variables as object hierarchies are synchronized based on these definitions*/
/*eslint no-unused-vars: 0*/

var chai = require('chai');
var expect = require('chai').expect;

var chaiAsPromised = require('chai-as-promised');

chai.should();
chai.use(chaiAsPromised);


var Promise = require('bluebird');
var ObjectTemplate = require('supertype');
var PersistObjectTemplate = require('../index.js')(ObjectTemplate, null, ObjectTemplate);


var Parent = PersistObjectTemplate.create('Parent', {
    id: {type: Number},
    name: {type: String, value: 'Test Parent'},
    init: function (id, name) {
        this.id = id;
        this.name = name;
    }
});


var Child = Parent.extend('Child', {
    init: function () {
        this.id = 12312;
        this.name = 'Child';
        Parent.call(this);
    },
    dob: {type: Date, value: new Date()}
});

var Parent_Idx = PersistObjectTemplate.create('Parent_Idx', {
    id: {type: Number},
    name: {type: String, value: 'Test Parent'},
    init: function (id, name) {
        this.id = id;
        this.name = name;
    }
});


var Child_Idx = Parent_Idx.extend('Child_Idx', {
    init: function () {
        this.id = 12312;
        this.name = 'Child';
        Parent.call(this);
    },
    dob: {type: Date, value: new Date()}
});

var ChildCreatesThisParent = PersistObjectTemplate.create('ChildCreatesThisParent', {
    id: {type: Number},
    name: {type: String, value: 'Test ChildCreatesThisParent'},
    init: function (id, name) {
        this.id = id;
        this.name = name;
    }
});


var ChildToCreate = ChildCreatesThisParent.extend('ChildToCreate', {
    init: function () {
        this.id = 12312;
        this.name = 'ChildToCreate';
        Parent.call(this);
    },
    dob: {type: Date, value: new Date()}
});

var ChildCreatesThisParent1 = PersistObjectTemplate.create('ChildCreatesThisParent1', {
    id: {type: Number},
    name: {type: String, value: 'Test ChildCreatesThisParent'},
    init: function (id, name) {
        this.id = id;
        this.name = name;
    }
})


var ChildToCreate1 = ChildCreatesThisParent1.extend('ChildToCreate1', {
    init: function () {
        this.id = 12312;
        this.name = 'ChildToCreate';
        Parent.call(this);
    },
    dob: {type: Date, value: new Date()}
});

var ParentMulteLevel1 = PersistObjectTemplate.create('ParentMulteLevel1', {
    id: {type: Number},
    name: {type: String, value: 'Test Parent'},
    init: function (id, name) {
        this.id = id;
        this.name = name;
    }
});

var ChildLevel1 = ParentMulteLevel1.extend('ChildLevel1', {
    init: function () {
        this.id = 12312;
        this.name = 'Child';
        Parent.call(this);
    },
    ScdLevel: {type: Boolean}
});

var ChildLevel2 = ParentMulteLevel1.extend('ChildLevel2', {
    init: function () {
        this.id = 12312;
        this.name = 'Child';
        Parent.call(this);
    },
    Level22: {type: Boolean}
});


var ChildLevel12 = ChildLevel1.extend('ChildLevel12', {
    init: function () {
        this.id = 12312;
        this.name = 'Child';
        Parent.call(this);
    },
    dob: {type: Date, value: new Date()}
});

var ParentMulteLevelIndx1 = PersistObjectTemplate.create('ParentMulteLevelIndx1', {
    id: {type: Number},
    name: {type: String, value: 'Test Parent'},
    init: function (id, name) {
        this.id = id;
        this.name = name;
    }
})


var ChildLevelIndx1 = ParentMulteLevelIndx1.extend('ChildLevelIndx1', {
    init: function () {
        this.id = 12312;
        this.name = 'Child';
        Parent.call(this);
    },
    ScdLevel: {type: Boolean}
});


var ChildLevel2Indx1 = ChildLevelIndx1.extend('ChildLevel2Indx1', {
    init: function () {
        this.id = 12312;
        this.name = 'Child';
        Parent.call(this);
    },
    dob: {type: Date, value: new Date()}
});

var ParentWithMultiChildAttheSameLevel = PersistObjectTemplate.create('ParentWithMultiChildAttheSameLevel', {
    id: {type: Number},
    name: {type: String, value: 'Test Parent'},
    init: function (id, name) {
        this.id = id;
        this.name = name;
    }
})

var ChildLevel11MultiChildAttheSameLevel = ParentWithMultiChildAttheSameLevel.extend('ChildLevel1MultiChildAttheSameLevel', {
    init: function () {
        this.id = 12312;
        this.name = 'Child';
        Parent.call(this);
    },
    Level11: {type: Date, value: new Date()}
});

var ChildLevel12MultiChildAttheSameLevel = ParentWithMultiChildAttheSameLevel.extend('ChildLevel12MultiChildAttheSameLevel', {
    init: function () {
        this.id = 12312;
        this.name = 'Child';
        Parent.call(this);
    },
    Level12: {type: Date, value: new Date()}
});

var Scenario_2_ParentWithMultiChildAttheSameLevel = PersistObjectTemplate.create('Scenario_2_ParentWithMultiChildAttheSameLevel', {
    id: {type: Number},
    name: {type: String, value: 'Test Parent'},
    init: function (id, name) {
        this.id = id;
        this.name = name;
    }
})

var Scenario_2_ChildLevel11MultiChildAttheSameLevel = Scenario_2_ParentWithMultiChildAttheSameLevel.extend('Scenario_2_ChildLevel11MultiChildAttheSameLevel', {
    init: function () {
        this.id = 12312;
        this.name = 'Child';
        Parent.call(this);
    },
    Level11: {type: Date, value: new Date()}
});

var Scenario_2_ChildLevel12MultiChildAttheSameLevel = Scenario_2_ParentWithMultiChildAttheSameLevel.extend('Scenario_2_ChildLevel12MultiChildAttheSameLevel', {
    init: function () {
        this.id = 12312;
        this.name = 'Child';
        Parent.call(this);
    },
    Level12: {type: Date, value: new Date()}
});

var Scenario_2_ChildLevel21MultiChildAttheSameLevel = Scenario_2_ChildLevel11MultiChildAttheSameLevel.extend('Scenario_2_ChildLevel21MultiChildAttheSameLevel', {
    init: function () {
        this.id = 12312;
        this.name = 'Child';
        Parent.call(this);
    },
    Level21: {type: Date, value: new Date()}
});

var Scenario_2_ChildLevel22MultiChildAttheSameLevel = Scenario_2_ChildLevel11MultiChildAttheSameLevel.extend('Scenario_2_ChildLevel22MultiChildAttheSameLevel', {
    init: function () {
        this.id = 12312;
        this.name = 'Child';
        Parent.call(this);
    },
    Level22: {type: Date, value: new Date()}
});

var Scenario_2_ChildLevel211MultiChildAttheSameLevel = Scenario_2_ChildLevel12MultiChildAttheSameLevel.extend('Scenario_2_ChildLevel211MultiChildAttheSameLevel', {
    init: function () {
        this.id = 12312;
        this.name = 'Child';
        Parent.call(this);
    },
    Level211: {type: Date, value: new Date()}
});

var Scenario_2_ChildLevel212MultiChildAttheSameLevel = Scenario_2_ChildLevel12MultiChildAttheSameLevel.extend('Scenario_2_ChildLevel212MultiChildAttheSameLevel', {
    init: function () {
        this.id = 12312;
        this.name = 'Child';
        Parent.call(this);
    },
    Level212: {type: Date, value: new Date()}
});

var Scenario_2_ChildLevel221MultiChildAttheSameLevel = Scenario_2_ChildLevel22MultiChildAttheSameLevel.extend('Scenario_2_ChildLevel221MultiChildAttheSameLevel', {
    init: function () {
        this.id = 12312;
        this.name = 'Child';
        Parent.call(this);
    },
    Level221: {type: Date, value: new Date()}
});

var Scenario_2_ChildLevel222MultiChildAttheSameLevel = Scenario_2_ChildLevel22MultiChildAttheSameLevel.extend('Scenario_2_ChildLevel222MultiChildAttheSameLevel', {
    init: function () {
        this.id = 12312;
        this.name = 'Child';
        Parent.call(this);
    },
    Level222: {type: Date, value: new Date()}
});

var ParentWithMultiChildAttheSameLevelWithIndexes = PersistObjectTemplate.create('ParentWithMultiChildAttheSameLevelWithIndexes', {
    id: {type: Number},
    name: {type: String, value: 'Test Parent'},
    init: function (id, name) {
        this.id = id;
        this.name = name;
    }
})

var ChildLevel11MultiChildAttheSameLevelWithIndexes = ParentWithMultiChildAttheSameLevelWithIndexes.extend('ChildLevel11MultiChildAttheSameLevelWithIndexes', {
    init: function () {
        this.id = 12312;
        this.name = 'Child';
        Parent.call(this);
    },
    Level11: {type: Date, value: new Date()}
});

var ChildLevel12MultiChildAttheSameLevelWithIndexes = ParentWithMultiChildAttheSameLevelWithIndexes.extend('ChildLevel12MultiChildAttheSameLevelWithIndexes', {
    init: function () {
        this.id = 12312;
        this.name = 'Child';
        Parent.call(this);
    },
    Level12: {type: Date, value: new Date()}
});

var ChildLevel21MultiChildAttheSameLevelWithIndexes = ChildLevel11MultiChildAttheSameLevelWithIndexes.extend('ChildLevel21MultiChildAttheSameLevelWithIndexes', {
    init: function () {
        this.id = 12312;
        this.name = 'Child';
        Parent.call(this);
    },
    Level21: {type: Date, value: new Date()}
});

var ChildLevel22MultiChildAttheSameLevelWithIndexes = ChildLevel11MultiChildAttheSameLevelWithIndexes.extend('ChildLevel22MultiChildAttheSameLevelWithIndexes', {
    init: function () {
        this.id = 12312;
        this.name = 'Child';
        Parent.call(this);
    },
    Level22: {type: Date, value: new Date()}
});

var ChildLevel211MultiChildAttheSameLevelWithIndexes = ChildLevel21MultiChildAttheSameLevelWithIndexes.extend('ChildLevel211MultiChildAttheSameLevelWithIndexes', {
    init: function () {
        this.id = 12312;
        this.name = 'Child';
        Parent.call(this);
    },
    Level211: {type: Date, value: new Date()}
});
var ChildLevel212MultiChildAttheSameLevelWithIndexes = ChildLevel21MultiChildAttheSameLevelWithIndexes.extend('ChildLevel212MultiChildAttheSameLevelWithIndexes', {
    init: function () {
        this.id = 12312;
        this.name = 'Child';
        Parent.call(this);
    },
    Level212: {type: Date, value: new Date()}
});

var ChildLevel221MultiChildAttheSameLevelWithIndexes = ChildLevel12MultiChildAttheSameLevelWithIndexes.extend('ChildLevel221MultiChildAttheSameLevelWithIndexes', {
    init: function () {
        this.id = 12312;
        this.name = 'Child';
        Parent.call(this);
    },
    Level221: {type: Date, value: new Date()}
});

var ChildLevel222MultiChildAttheSameLevelWithIndexes = ChildLevel12MultiChildAttheSameLevelWithIndexes.extend('ChildLevel222MultiChildAttheSameLevelWithIndexes', {
    init: function () {
        this.id = 12312;
        this.name = 'Child';
        Parent.call(this);
    },
    Level222: {type: Date, value: new Date()}
});


var parentSynchronize = PersistObjectTemplate.create('parentSynchronize', {
    id: {type: Number},
    name: {type: String, value: 'Test Parent'},
    init: function (id, name) {
        this.id = id;
        this.name = name;
    }
});


var schema = {
    Parent: {
        documentOf: 'pg/Parent'
    },
    Child: {
        documentOf: 'pg/Child'
    },

    Parent_Idx: {
        documentOf: 'pg/Parent_Idx',
        indexes: [
            {
                name: 'name',
                def: {
                    columns: ['id', 'name'],
                    type: 'index'
                }
            }]
    },
    Child_Idx: {
        documentOf: 'pg/Child_Idx',
        indexes: [
            {
                name: 'name',
                def: {
                    columns: ['dob'],
                    type: 'index'
                }
            }]
    },
    ChildCreatesThisParent: {
        documentOf: 'pg/ChildCreatesThisParent'
    },
    ChildToCreate: {
        documentOf: 'pg/ChildToCreate'
    },
    ChildCreatesThisParent1: {
        documentOf: 'pg/ChildCreatesThisParent1',
        indexes: [
            {
                name: 'name',
                def: {
                    columns: ['id', 'name'],
                    type: 'index'
                }
            }]
    },
    ChildToCreate1: {
        documentOf: 'pg/ChildToCreate1',
        indexes: [
            {
                name: 'name',
                def: {
                    columns: ['dob'],
                    type: 'index'
                }
            }]
    },
    ParentMulteLevel1: {
        documentOf: 'pg/ParentMulteLevel1'
    },
    ChildLevelIndx1: {
        documentOf: 'pg/ChildLevelIndx1',
        indexes: [
            {
                name: 'name',
                def: {
                    columns: ['ScdLevel'],
                    type: 'index'
                }
            }]
    },
    ChildLevel2Indx1: {
        documentOf: 'pg/ChildLevel2Indx1',
        indexes: [
            {
                name: 'name',
                def: {
                    columns: ['dob'],
                    type: 'index'
                }
            }]
    },
    ParentMulteLevelIndx1: {
        documentOf: 'pg/ParentMulteLevelIndx1'
    },
    ParentWithMultiChildAttheSameLevel: {
        documentOf: 'pg/ParentWithMultiChildAttheSameLevel'
    },
    Scenario_2_ParentWithMultiChildAttheSameLevel : {
        documentOf: 'pg/Scenario_2_ParentWithMultiChildAttheSameLevel'
    },
    ParentWithMultiChildAttheSameLevelWithIndexes: {
        documentOf:'pg/ParentWithMultiChildAttheSameLevelWithIndexes'
    },
    ChildLevel11MultiChildAttheSameLevelWithIndexes : {
        indexes: [{
            name: 'level11',
            def: {
                columns: ['Level11'],
                type: 'index'
            }
        }]
    },
    ChildLevel21MultiChildAttheSameLevelWithIndexes: {
        indexes: [{
            name: 'Level21',
            def: {
                columns: ['Level21'],
                type: 'index'
            }
        }]
    },
    ChildLevel22MultiChildAttheSameLevelWithIndexes: {
        indexes: [{
            name: 'Level22',
            def: {
                columns: ['Level22'],
                type: 'index'
            }
        }]
    },
    parentSynchronize : {
        documentOf: 'pg/parentSynchronize'
    }
}


var schemaTable = 'index_schema_history';
describe('type mapping tests for parent/child relations', function () {
    var knex = require('knex')({
        client: 'pg',
        connection: {
            host: '127.0.0.1',
            database: 'persistor_banking',
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

        return Promise.all([PersistObjectTemplate.dropKnexTable(Parent),
            PersistObjectTemplate.dropKnexTable(Parent_Idx),
            PersistObjectTemplate.dropKnexTable(ChildCreatesThisParent),
            PersistObjectTemplate.dropKnexTable(ChildCreatesThisParent1),
            PersistObjectTemplate.dropKnexTable(ParentMulteLevel1),
            PersistObjectTemplate.dropKnexTable(ParentMulteLevelIndx1),
            PersistObjectTemplate.dropKnexTable(ParentWithMultiChildAttheSameLevel),
            PersistObjectTemplate.dropKnexTable(Scenario_2_ParentWithMultiChildAttheSameLevel),
            PersistObjectTemplate.dropKnexTable(ParentWithMultiChildAttheSameLevelWithIndexes),
            PersistObjectTemplate.dropKnexTable(parentSynchronize),
            knex.schema.dropTableIfExists('NewTableWithComments'),
            knex.schema.dropTableIfExists('NewTableWithComments1'),
            knex.schema.dropTableIfExists('ExistingTableWithComments'),
            knex.schema.dropTableIfExists('ExistingTableWithAField'),
            knex.schema.dropTableIfExists(schemaTable)
        ]).should.notify(done);
    })
    after('closes the database', function () {
        return knex.destroy();
    });

    it('Parent type with an associated child will add add the fields from the child tables to the parent table', function (done) {
        return PersistObjectTemplate.createKnexTable(Parent).then(function () {
            return PersistObjectTemplate.checkForKnexTable(Parent).should.eventually.equal(true);
        }).should.notify(done);
    });

    it('Both parent and child index definitions are added to the parent table', function () {
        return PersistObjectTemplate.createKnexTable(Parent_Idx).then(function () {
            return knex.schema.table('Parent_Idx', function (table) {
                table.dropIndex([], 'idx_parent_idx_id_name');
            }).should.eventually.have.property('command')
        });
    });

    it('When trying to create child table, system should create the parent table', function () {
        return PersistObjectTemplate.createKnexTable(ChildToCreate).then(function () {
            return Promise.all([PersistObjectTemplate.checkForKnexTable(ChildCreatesThisParent, 'ChildCreatesThisParent').should.eventually.equal(true),
                PersistObjectTemplate.checkForKnexTable(ChildToCreate, 'ChildToCreate').should.eventually.equal(false)
            ]);
        })
    });

    // it('When trying to create child table, system should create the parent table and the corresonding indexes in the object graph must be added to the table', function () {
    //     return PersistObjectTemplate.createKnexTable(ChildToCreate1).then(function () {
    //         return knex.schema.table('ChildCreatesThisParent1', function (table) {
    //             table.dropIndex([], 'idx_childcreatesthisparent1_dob');
    //         }).should.eventually.have.property('command')
    //     })
    // });

    it('Creating a parent with children defined with multilevel inheritance', function () {
        return PersistObjectTemplate.createKnexTable(ParentMulteLevel1).then(function () {
            return PersistObjectTemplate.checkForKnexColumnType(ParentMulteLevel1, 'ScdLevel').should.eventually.equal('boolean');
        })
    });

    // it('Multilevel inheritance with indexes defined at different levels', function () {
    //     return PersistObjectTemplate.createKnexTable(ParentMulteLevelIndx1).then(function () {
    //         return knex.schema.table('ParentMulteLevelIndx1', function (table) {
    //             table.dropIndex([], 'idx_parentmultelevelindx1_dob');
    //         }).should.eventually.have.property('command')
    //     })
    // });
    it('Multilevel inheritance with multiple children at the same level', function () {
        return PersistObjectTemplate.createKnexTable(ParentWithMultiChildAttheSameLevel).then(function () {
            return PersistObjectTemplate.checkForKnexTable(ParentWithMultiChildAttheSameLevel).should.eventually.equal(true);
        })
    });

    it('Multilevel inheritance with multiple children at the multiple levels', function () {
        return PersistObjectTemplate.createKnexTable(Scenario_2_ParentWithMultiChildAttheSameLevel).then(function () {
            return PersistObjectTemplate.checkForKnexTable(Scenario_2_ParentWithMultiChildAttheSameLevel).should.eventually.equal(true);
        })
    });

    it('Multilevel inheritance with multiple children at the multiple levels', function () {
        return PersistObjectTemplate.createKnexTable(ParentWithMultiChildAttheSameLevelWithIndexes).then(function () {
            return PersistObjectTemplate.checkForKnexTable(ParentWithMultiChildAttheSameLevelWithIndexes).should.eventually.equal(true);
        })
    });



    it('Adding a child with index to a parent and synchronize.', function () {
        var childSynchronize = parentSynchronize.extend('childSynchronize', {
            init: function() {
                this.id = 12312;
                this.name = 'Child';
                Parent.call(this);
            },
            dob: {type: Date}
        });

        schema.childSynchronize = {};

        schema.childSynchronize.indexes = JSON.parse('[{"name": "single_index","def": {"columns": ["dob"],"type": "unique"}}]');

        PersistObjectTemplate._verifySchema();

        return PersistObjectTemplate.synchronizeKnexTableFromTemplate(childSynchronize).then(function () {
            return PersistObjectTemplate.checkForKnexTable(parentSynchronize).should.eventually.equal(true).then(function() {
                schema.childSynchronize.indexes = JSON.parse('[{"name": "scd_index","def": {"columns": ["name"],"type": "unique"}}]');
                return PersistObjectTemplate.synchronizeKnexTableFromTemplate(childSynchronize);
            })
        })

    });


    it('Create a new table and check if the comments added to the fields are included in the database', function () {
        var NewTableWithComments = PersistObjectTemplate.create('NewTableWithComments', {
            id: {type: Number},
            name: {type: String, value: 'Test Parent', comment: 'comment on a new table...'},
            init: function (id, name) {
                this.id = id;
                this.name = name;
            }
        });

        schema.NewTableWithComments = {documentOf: 'pg/NewTableWithComments'};
        PersistObjectTemplate._verifySchema();
        return PersistObjectTemplate.synchronizeKnexTableFromTemplate(NewTableWithComments).then(function () {
            return knex('pg_catalog.pg_description')
                .count()
                .where('description', 'like', '%comment on a new table...%')
                .should.eventually.contain({ count: '1' });
        })
    });

    it('table notification should only work with function callbacks', function () {
        var NewTableWithComments1 = PersistObjectTemplate.create('NewTableWithComments1', {});

        schema.NewTableWithComments1 = {documentOf: 'pg/NewTableWithComments1'};
        PersistObjectTemplate._verifySchema();
        return PersistObjectTemplate.synchronizeKnexTableFromTemplate(NewTableWithComments1, {}).catch(function(e) {
            expect(e.message).to.equal('persistor can only notify the table changes through a callback');
        });

    });

    it('field change notification should only work with function callbacks', function () {
        var NewTableWithComments1 = PersistObjectTemplate.create('NewTableWithComments1', {});

        schema.NewTableWithComments1 = {documentOf: 'pg/NewTableWithComments1'};
        PersistObjectTemplate._verifySchema();
        return PersistObjectTemplate.synchronizeKnexTableFromTemplate(NewTableWithComments1)
            .then(PersistObjectTemplate.synchronizeKnexTableFromTemplate.bind(PersistObjectTemplate, NewTableWithComments1, {}))
            .catch(function(e) {
                expect(e.message).to.equal('persistor can only notify the field changes through a callback');
            });
    });

    it('Create a new table and check if the comments added to the fields are included in the database', function () {

        var AddressSyncChecks = PersistObjectTemplate.create('AddressSyncChecks', {});
        var CustomerSyncChecks = PersistObjectTemplate.create('CustomerSyncChecks', {});

        schema.AddressSyncChecks = {documentOf: 'pg/AddressSyncChecks'};
        schema.CustomerSyncChecks = {documentOf: 'pg/CustomerSyncChecks'};
        PersistObjectTemplate._verifySchema();
        return PersistObjectTemplate.synchronizeKnexTableFromTemplate(CustomerSyncChecks)
            .then(function() {
                CustomerSyncChecks.mixin({
                    homeAddress: {type: AddressSyncChecks},
                    alternateNames: {type: Array, of: String}
                });

                PersistObjectTemplate._verifySchema();
                return PersistObjectTemplate.synchronizeKnexTableFromTemplate(CustomerSyncChecks);
            }).catch(function (e) {
                expect(e.message).to.equal('CustomerSyncChecks.homeAddress is missing a parents schema entry');
            });
    });

    it('Adding a comment to an existing table', function () {
        var ExistingTableWithComments = PersistObjectTemplate.create('ExistingTableWithComments', {
            id: {type: Number},
            name: {type: String, value: 'Test Parent'},
            init: function (id, name) {
                this.id = id;
                this.name = name;
            }
        })

        schema.ExistingTableWithComments = {documentOf: 'pg/ExistingTableWithComments'};
        PersistObjectTemplate._verifySchema();
        return PersistObjectTemplate.synchronizeKnexTableFromTemplate(ExistingTableWithComments).then(function () {
            ExistingTableWithComments.mixin({
                name: {type: String, value: 'Test Parent', comment:    'comment on an existing table'}
            });
            PersistObjectTemplate._verifySchema();
            return PersistObjectTemplate.synchronizeKnexTableFromTemplate(ExistingTableWithComments).then(function () {
                return knex('pg_catalog.pg_description')
                    .count()
                    .where('description', 'like', '%comment on an existing table%')
                    .should.eventually.contain({ count: '1' });

            })
        })

    });

    it('Adding a new field with comment to an existing table', function () {
        var ExistingTableWithAField = PersistObjectTemplate.create('ExistingTableWithAField', {
            id: {type: Number},
            name: {type: String, value: 'Test Parent'},
            init: function (id, name) {
                this.id = id;
                this.name = name;
            }
        });

        schema.ExistingTableWithAField = {documentOf: 'pg/ExistingTableWithAField'};
        PersistObjectTemplate._verifySchema();
        return PersistObjectTemplate.synchronizeKnexTableFromTemplate(ExistingTableWithAField).then(function () {
            ExistingTableWithAField.mixin({
                newField: {type: String, value: 'Test Parent', comment:    'Adding a new field comment'}
            });
            PersistObjectTemplate._verifySchema();
            return PersistObjectTemplate.synchronizeKnexTableFromTemplate(ExistingTableWithAField).then(function () {
                return knex('pg_catalog.pg_description')
                    .count()
                    .where('description', 'like', '%Adding a new field comment%')
                    .should.eventually.contain({ count: '1' });
            })
        });

    });

    it('Adding a foreign key refrence in children', function () {
        var ObjectTemplate1 = require('supertype');
        var PersistObjectTemplate1 = require('../index.js')(ObjectTemplate1, null, ObjectTemplate1);
        var BaseTemplate_FK_on_Child = PersistObjectTemplate1.create('BaseTemplate_FK_on_Child', {
            name: {type: String, value: 'Test Parent'}
        });

        var Address_FK_on_Child = PersistObjectTemplate1.create('Address_FK_on_Child', {
            street: {type: String}
        })

        var ChildTemplateLevel1 = BaseTemplate_FK_on_Child.extend('ChildTemplateLevel1', {
            dob: {type: Date}
        });

        var ChildTemplateLevel2 = ChildTemplateLevel1.extend('ChildTemplateLevel2', {
            dob: {type: Date},
            addresses: {type: Array, of: Address_FK_on_Child}
        });
        var schema = {};
        schema.ChildTemplateLevel2 = {};
        schema.ChildTemplateLevel1 = {};
        schema.BaseTemplate_FK_on_Child = {};
        schema.BaseTemplate_FK_on_Child = {
            documentOf: 'basetemplate_tbl',
            children: {
                addresses: {id: 'address_id'}
            }
        };
        schema.Address_FK_on_Child = {};
        schema.Address_FK_on_Child = {documentOf: 'address_ref_tbl'};

        PersistObjectTemplate1.setDB(knex, PersistObjectTemplate1.DB_Knex);
        PersistObjectTemplate1.setSchema(schema);
        PersistObjectTemplate1.performInjections();
        PersistObjectTemplate1._verifySchema();
    });

    it('getDB without setting database', function () {
        var ObjectTemplate1 = require('supertype');
        var PersistObjectTemplate1 = require('../index.js')(ObjectTemplate1, null, ObjectTemplate1);
        expect(PersistObjectTemplate1.getDB.bind(this, 'pg')).to.throw('You must do PersistObjectTempate.setDB');

    });

    it('without schema..', function () {
        var ObjectTemplate1 = require('supertype');
        var PersistObjectTemplate1 = require('../index.js')(ObjectTemplate1, null, ObjectTemplate1);
        var emptySchema = PersistObjectTemplate1._verifySchema();
        expect(emptySchema).to.be.an('undefined');
    });



});
