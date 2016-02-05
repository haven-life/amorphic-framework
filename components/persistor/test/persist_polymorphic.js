/**
 * Created by RSagiraji on 11/24/15.
 */
var chai = require("chai");
var expect = require('chai').expect;

var chaiAsPromised = require("chai-as-promised");
var sinon = require('sinon');
var sinonChai = require('sinon-chai');

chai.should();
chai.use(chaiAsPromised);

var Q = require("q");
var _ = require("underscore");
var ObjectTemplate = require('supertype');
var PersistObjectTemplate = require('../index.js')(ObjectTemplate, null, ObjectTemplate);
var knex = require("knex");


var Parent = PersistObjectTemplate.create("Parent", {
    id: {type: Number},
    name: {type: String, value: "Test Parent"},
    init: function (id, name) {
        this.id = id;
        this.name = name;
    }
})


Child = Parent.extend("Child", {
    init: function () {
        this.id = 12312;
        this.name = "Child";
        Parent.call(this);
    },
    dob: {type: Date, value: new Date()}
});

var Parent_Idx = PersistObjectTemplate.create("Parent_Idx", {
    id: {type: Number},
    name: {type: String, value: "Test Parent"},
    init: function (id, name) {
        this.id = id;
        this.name = name;
    }
})


Child_Idx = Parent_Idx.extend("Child_Idx", {
    init: function () {
        this.id = 12312;
        this.name = "Child";
        Parent.call(this);
    },
    dob: {type: Date, value: new Date()}
});

var ChildCreatesThisParent = PersistObjectTemplate.create("ChildCreatesThisParent", {
    id: {type: Number},
    name: {type: String, value: "Test ChildCreatesThisParent"},
    init: function (id, name) {
        this.id = id;
        this.name = name;
    }
})


ChildToCreate = ChildCreatesThisParent.extend("ChildToCreate", {
    init: function () {
        this.id = 12312;
        this.name = "ChildToCreate";
        Parent.call(this);
    },
    dob: {type: Date, value: new Date()}
});

var ChildCreatesThisParent1 = PersistObjectTemplate.create("ChildCreatesThisParent1", {
    id: {type: Number},
    name: {type: String, value: "Test ChildCreatesThisParent"},
    init: function (id, name) {
        this.id = id;
        this.name = name;
    }
})


ChildToCreate1 = ChildCreatesThisParent1.extend("ChildToCreate1", {
    init: function () {
        this.id = 12312;
        this.name = "ChildToCreate";
        Parent.call(this);
    },
    dob: {type: Date, value: new Date()}
});


var ParentMulteLevel1 = PersistObjectTemplate.create("ParentMulteLevel1", {
    id: {type: Number},
    name: {type: String, value: "Test Parent"},
    init: function (id, name) {
        this.id = id;
        this.name = name;
    }
})


ChildLevel1 = ParentMulteLevel1.extend("ChildLevel1", {
    init: function () {
        this.id = 12312;
        this.name = "Child";
        Parent.call(this);
    },
    ScdLevel: {type: Boolean}
});


ChildLevel2 = ChildLevel1.extend("ChildLevel2", {
    init: function () {
        this.id = 12312;
        this.name = "Child";
        Parent.call(this);
    },
    dob: {type: Date, value: new Date()}
});

var ParentMulteLevel1 = PersistObjectTemplate.create("ParentMulteLevel1", {
    id: {type: Number},
    name: {type: String, value: "Test Parent"},
    init: function (id, name) {
        this.id = id;
        this.name = name;
    }
})


ChildLevel1 = ParentMulteLevel1.extend("ChildLevel1", {
    init: function () {
        this.id = 12312;
        this.name = "Child";
        Parent.call(this);
    },
    ScdLevel: {type: Boolean}
});

ChildLevel2 = ParentMulteLevel1.extend("ChildLevel2", {
    init: function () {
        this.id = 12312;
        this.name = "Child";
        Parent.call(this);
    },
    Level22: {type: Boolean}
});


ChildLevel12 = ChildLevel1.extend("ChildLevel12", {
    init: function () {
        this.id = 12312;
        this.name = "Child";
        Parent.call(this);
    },
    dob: {type: Date, value: new Date()}
});

var ParentMulteLevelIndx1 = PersistObjectTemplate.create("ParentMulteLevelIndx1", {
    id: {type: Number},
    name: {type: String, value: "Test Parent"},
    init: function (id, name) {
        this.id = id;
        this.name = name;
    }
})


ChildLevelIndx1 = ParentMulteLevelIndx1.extend("ChildLevelIndx1", {
    init: function () {
        this.id = 12312;
        this.name = "Child";
        Parent.call(this);
    },
    ScdLevel: {type: Boolean}
});


ChildLevel2Indx1 = ChildLevelIndx1.extend("ChildLevel2Indx1", {
    init: function () {
        this.id = 12312;
        this.name = "Child";
        Parent.call(this);
    },
    dob: {type: Date, value: new Date()}
});

var ParentWithMultiChildAttheSameLevel = PersistObjectTemplate.create("ParentWithMultiChildAttheSameLevel", {
    id: {type: Number},
    name: {type: String, value: "Test Parent"},
    init: function (id, name) {
        this.id = id;
        this.name = name;
    }
})

ChildLevel11MultiChildAttheSameLevel = ParentWithMultiChildAttheSameLevel.extend("ChildLevel1MultiChildAttheSameLevel", {
    init: function () {
        this.id = 12312;
        this.name = "Child";
        Parent.call(this);
    },
    Level11: {type: Date, value: new Date()}
});

ChildLevel12MultiChildAttheSameLevel = ParentWithMultiChildAttheSameLevel.extend("ChildLevel12MultiChildAttheSameLevel", {
    init: function () {
        this.id = 12312;
        this.name = "Child";
        Parent.call(this);
    },
    Level12: {type: Date, value: new Date()}
});

var Scenario_2_ParentWithMultiChildAttheSameLevel = PersistObjectTemplate.create("Scenario_2_ParentWithMultiChildAttheSameLevel", {
    id: {type: Number},
    name: {type: String, value: "Test Parent"},
    init: function (id, name) {
        this.id = id;
        this.name = name;
    }
})

Scenario_2_ChildLevel11MultiChildAttheSameLevel = Scenario_2_ParentWithMultiChildAttheSameLevel.extend("Scenario_2_ChildLevel11MultiChildAttheSameLevel", {
    init: function () {
        this.id = 12312;
        this.name = "Child";
        Parent.call(this);
    },
    Level11: {type: Date, value: new Date()}
});

Scenario_2_ChildLevel12MultiChildAttheSameLevel = Scenario_2_ParentWithMultiChildAttheSameLevel.extend("Scenario_2_ChildLevel12MultiChildAttheSameLevel", {
    init: function () {
        this.id = 12312;
        this.name = "Child";
        Parent.call(this);
    },
    Level12: {type: Date, value: new Date()}
});

Scenario_2_ChildLevel21MultiChildAttheSameLevel = Scenario_2_ChildLevel11MultiChildAttheSameLevel.extend("Scenario_2_ChildLevel21MultiChildAttheSameLevel", {
    init: function () {
        this.id = 12312;
        this.name = "Child";
        Parent.call(this);
    },
    Level21: {type: Date, value: new Date()}
});

Scenario_2_ChildLevel22MultiChildAttheSameLevel = Scenario_2_ChildLevel11MultiChildAttheSameLevel.extend("Scenario_2_ChildLevel22MultiChildAttheSameLevel", {
    init: function () {
        this.id = 12312;
        this.name = "Child";
        Parent.call(this);
    },
    Level22: {type: Date, value: new Date()}
});

Scenario_2_ChildLevel211MultiChildAttheSameLevel = Scenario_2_ChildLevel12MultiChildAttheSameLevel.extend("Scenario_2_ChildLevel211MultiChildAttheSameLevel", {
    init: function () {
        this.id = 12312;
        this.name = "Child";
        Parent.call(this);
    },
    Level211: {type: Date, value: new Date()}
});

Scenario_2_ChildLevel212MultiChildAttheSameLevel = Scenario_2_ChildLevel12MultiChildAttheSameLevel.extend("Scenario_2_ChildLevel212MultiChildAttheSameLevel", {
    init: function () {
        this.id = 12312;
        this.name = "Child";
        Parent.call(this);
    },
    Level212: {type: Date, value: new Date()}
});

Scenario_2_ChildLevel221MultiChildAttheSameLevel = Scenario_2_ChildLevel22MultiChildAttheSameLevel.extend("Scenario_2_ChildLevel221MultiChildAttheSameLevel", {
    init: function () {
        this.id = 12312;
        this.name = "Child";
        Parent.call(this);
    },
    Level221: {type: Date, value: new Date()}
});

Scenario_2_ChildLevel222MultiChildAttheSameLevel = Scenario_2_ChildLevel22MultiChildAttheSameLevel.extend("Scenario_2_ChildLevel222MultiChildAttheSameLevel", {
    init: function () {
        this.id = 12312;
        this.name = "Child";
        Parent.call(this);
    },
    Level222: {type: Date, value: new Date()}
});

var ParentWithMultiChildAttheSameLevelWithIndexes = PersistObjectTemplate.create("ParentWithMultiChildAttheSameLevelWithIndexes", {
    id: {type: Number},
    name: {type: String, value: "Test Parent"},
    init: function (id, name) {
        this.id = id;
        this.name = name;
    }
})

ChildLevel11MultiChildAttheSameLevelWithIndexes = ParentWithMultiChildAttheSameLevelWithIndexes.extend("ChildLevel11MultiChildAttheSameLevelWithIndexes", {
    init: function () {
        this.id = 12312;
        this.name = "Child";
        Parent.call(this);
    },
    Level11: {type: Date, value: new Date()}
});

ChildLevel12MultiChildAttheSameLevelWithIndexes = ParentWithMultiChildAttheSameLevelWithIndexes.extend("ChildLevel12MultiChildAttheSameLevelWithIndexes", {
    init: function () {
        this.id = 12312;
        this.name = "Child";
        Parent.call(this);
    },
    Level12: {type: Date, value: new Date()}
});

ChildLevel21MultiChildAttheSameLevelWithIndexes = ChildLevel11MultiChildAttheSameLevelWithIndexes.extend("ChildLevel21MultiChildAttheSameLevelWithIndexes", {
    init: function () {
        this.id = 12312;
        this.name = "Child";
        Parent.call(this);
    },
    Level21: {type: Date, value: new Date()}
});

ChildLevel22MultiChildAttheSameLevelWithIndexes = ChildLevel11MultiChildAttheSameLevelWithIndexes.extend("ChildLevel22MultiChildAttheSameLevelWithIndexes", {
    init: function () {
        this.id = 12312;
        this.name = "Child";
        Parent.call(this);
    },
    Level22: {type: Date, value: new Date()}
});

ChildLevel211MultiChildAttheSameLevelWithIndexes = ChildLevel21MultiChildAttheSameLevelWithIndexes.extend("ChildLevel211MultiChildAttheSameLevelWithIndexes", {
    init: function () {
        this.id = 12312;
        this.name = "Child";
        Parent.call(this);
    },
    Level211: {type: Date, value: new Date()}
});
ChildLevel212MultiChildAttheSameLevelWithIndexes = ChildLevel21MultiChildAttheSameLevelWithIndexes.extend("ChildLevel212MultiChildAttheSameLevelWithIndexes", {
    init: function () {
        this.id = 12312;
        this.name = "Child";
        Parent.call(this);
    },
    Level212: {type: Date, value: new Date()}
});

ChildLevel221MultiChildAttheSameLevelWithIndexes = ChildLevel12MultiChildAttheSameLevelWithIndexes.extend("ChildLevel221MultiChildAttheSameLevelWithIndexes", {
    init: function () {
        this.id = 12312;
        this.name = "Child";
        Parent.call(this);
    },
    Level221: {type: Date, value: new Date()}
});

ChildLevel222MultiChildAttheSameLevelWithIndexes = ChildLevel12MultiChildAttheSameLevelWithIndexes.extend("ChildLevel222MultiChildAttheSameLevelWithIndexes", {
    init: function () {
        this.id = 12312;
        this.name = "Child";
        Parent.call(this);
    },
    Level222: {type: Date, value: new Date()}
});


var parentSynchronize = PersistObjectTemplate.create("parentSynchronize", {
    id: {type: Number},
    name: {type: String, value: "Test Parent"},
    init: function (id, name) {
        this.id = id;
        this.name = name;
    }
});



var obj1 = new Parent(100, 'temp employee');
var obj2 = new Child(000, 'contractor');

var Q = require('Q');
var db;
var schema = {
    Parent: {
        documentOf: "pg/Parent"
    },
    Child: {
        documentOf: "pg/Child"
    },

    Parent_Idx: {
        documentOf: "pg/Parent_Idx",
        indexes: [
            {
                name: "name",
                def: {
                    columns: ["id", "name"],
                    type: "index"
                }
            }]
    },
    Child_Idx: {
        documentOf: "pg/Child_Idx",
        indexes: [
            {
                name: "name",
                def: {
                    columns: ["dob"],
                    type: "index"
                }
            }]
    },
    ChildCreatesThisParent: {
        documentOf: "pg/ChildCreatesThisParent"
    },
    ChildToCreate: {
        documentOf: "pg/ChildToCreate"
    },
    ChildCreatesThisParent1: {
        documentOf: "pg/ChildCreatesThisParent1",
        indexes: [
            {
                name: "name",
                def: {
                    columns: ["id", "name"],
                    type: "index"
                }
            }]
    },
    ChildToCreate1: {
        documentOf: "pg/ChildToCreate1",
        indexes: [
            {
                name: "name",
                def: {
                    columns: ["dob"],
                    type: "index"
                }
            }]
    },
    ParentMulteLevel1: {
        documentOf: "pg/ParentMulteLevel1"
    },
    ParentMulteLevelIndx1: {
        documentOf: "pg/ParentMulteLevelIndx1"
    },
    ChildLevelIndx1: {
        documentOf: "pg/ChildLevelIndx1",
        indexes: [
            {
                name: "name",
                def: {
                    columns: ["ScdLevel"],
                    type: "index"
                }
            }]
    },
    ChildLevel2Indx1: {
        documentOf: "pg/ChildLevel2Indx1",
        indexes: [
            {
                name: "name",
                def: {
                    columns: ["dob"],
                    type: "index"
                }
            }]
    },
    ParentMulteLevelIndx1: {
        documentOf: "pg/ParentMulteLevelIndx1"
    },
    ParentWithMultiChildAttheSameLevel: {
        documentOf: "pg/ParentWithMultiChildAttheSameLevel"
    },
    Scenario_2_ParentWithMultiChildAttheSameLevel : {
        documentOf: "pg/Scenario_2_ParentWithMultiChildAttheSameLevel"
    },
    ParentWithMultiChildAttheSameLevelWithIndexes: {
        documentOf:"pg/ParentWithMultiChildAttheSameLevelWithIndexes"
    },
    ChildLevel11MultiChildAttheSameLevelWithIndexes : {
        indexes: [{
            name: "level11",
            def: {
                columns: ["Level11"],
                type: "index"
            }
        }]
    },
    ChildLevel21MultiChildAttheSameLevelWithIndexes: {
        indexes: [{
            name: "Level21",
            def: {
                columns: ["Level21"],
                type: "index"
            }
        }]
    },
    ChildLevel22MultiChildAttheSameLevelWithIndexes: {
        indexes: [{
            name: "Level22",
            def: {
                columns: ["Level22"],
                type: "index"
            }
        }]
    },
    parentSynchronize : {
        documentOf: "pg/parentSynchronize"
    }
}

var knex = require('knex')({
        client: 'pg',
        connection: {
            host: '127.0.0.1',
            database: 'persistor_banking',
            user: 'postgres',
            password: 'postgres'

        }
    });

describe('type mapping tests for parent/child relations', function () {
    before('arrange', function (done) {
        (function () {
            var db = require('knex')({
                client: 'pg',
                connection: {
                    host: '127.0.0.1',
                    database: 'persistor_banking',
                    user: 'postgres',
                    password: 'postgres'

                }
            });
            PersistObjectTemplate.setDB(db, PersistObjectTemplate.DB_Knex, 'pg');
            PersistObjectTemplate.setSchema(schema);
            PersistObjectTemplate.performInjections(); // Normally done by getTemplates
            var resetdata = (function () {
                return knex('haven_schema1')
                    .select('sequence_id')
                    .orderBy('sequence_id', 'desc')
                    .limit(1)
                    .then(function (v) {
                        var sc = JSON.parse(JSON.stringify(schema));
                        return knex('haven_schema1').insert({
                            sequence_id: ++v[0].sequence_id,
                            schema: JSON.stringify(sc)
                        })
                    })
            })();
        })();

        return Q.all([PersistObjectTemplate.dropKnexTable(Parent),
            PersistObjectTemplate.dropKnexTable(Parent_Idx),
            PersistObjectTemplate.dropKnexTable(ChildCreatesThisParent),
            PersistObjectTemplate.dropKnexTable(ChildCreatesThisParent1),
            PersistObjectTemplate.dropKnexTable(ParentMulteLevel1),
            PersistObjectTemplate.dropKnexTable(ParentMulteLevelIndx1),
            PersistObjectTemplate.dropKnexTable(ParentWithMultiChildAttheSameLevel),
            PersistObjectTemplate.dropKnexTable(Scenario_2_ParentWithMultiChildAttheSameLevel),
            PersistObjectTemplate.dropKnexTable(ParentWithMultiChildAttheSameLevelWithIndexes),
            PersistObjectTemplate.dropKnexTable(parentSynchronize)
        ]).should.notify(done);;
    })

    it("Parent type with an associated child will add add the fields from the child tables to the parent table", function (done) {
        return PersistObjectTemplate.createKnexTable(Parent).then(function (status) {
            return PersistObjectTemplate.checkForKnexTable(Parent).should.eventually.equal(true);
        }).should.notify(done);
    });

    it("Both parent and child index definitions are added to the parent table", function () {
        return PersistObjectTemplate.createKnexTable(Parent_Idx).then(function (status) {
            return knex.schema.table('Parent_Idx', function (table) {
                        table.dropIndex([], 'Idx_parent_Idx_id_name');
                    }).should.eventually.have.property("command")
        });
    });

    it("When trying to create child table, system should create the parent table", function () {
        return PersistObjectTemplate.createKnexTable(ChildToCreate).then(function (status) {
            return Q.all([PersistObjectTemplate.checkForKnexTable(ChildCreatesThisParent, 'ChildCreatesThisParent').should.eventually.equal(true),
                PersistObjectTemplate.checkForKnexTable(ChildToCreate, 'ChildToCreate').should.eventually.equal(false)
            ]);
        })
    });
    it("When trying to create child table, system should create the parent table and the corresonding indexes in the object graph must be added to the table", function () {
        return PersistObjectTemplate.createKnexTable(ChildToCreate1).then(function (status) {
            return knex.schema.table('ChildCreatesThisParent1', function (table) {
                table.dropIndex([], 'Idx_ChildCreatesThisParent1_dob');
            }).should.eventually.have.property("command")
        })
    });
    it("Creating a parent with children defined with multilevel inheritance", function () {
        return PersistObjectTemplate.createKnexTable(ParentMulteLevel1).then(function (status) {
            return PersistObjectTemplate.checkForKnexColumnType(ParentMulteLevel1, 'ScdLevel').should.eventually.equal('boolean');
        })
    });
    it("Multilevel inheritance with indexes defined at different levels", function () {
        return PersistObjectTemplate.createKnexTable(ParentMulteLevelIndx1).then(function (status) {
            return knex.schema.table('ParentMulteLevelIndx1', function (table) {
                table.dropIndex([], 'Idx_ParentMulteLevelIndx1_dob');
            }).should.eventually.have.property("command")
        })
    });
    it("Multilevel inheritance with multiple children at the same level", function () {
        return PersistObjectTemplate.createKnexTable(ParentWithMultiChildAttheSameLevel).then(function (status) {
            return PersistObjectTemplate.checkForKnexTable(ParentWithMultiChildAttheSameLevel).should.eventually.equal(true);
        })
    });
    it("Multilevel inheritance with multiple children at the multiple levels", function () {
        return PersistObjectTemplate.createKnexTable(Scenario_2_ParentWithMultiChildAttheSameLevel).then(function (status) {
            return PersistObjectTemplate.checkForKnexTable(Scenario_2_ParentWithMultiChildAttheSameLevel).should.eventually.equal(true);
        })
    });

    it("Multilevel inheritance with multiple children at the multiple levels", function () {
        return PersistObjectTemplate.createKnexTable(ParentWithMultiChildAttheSameLevelWithIndexes).then(function (status) {
            return PersistObjectTemplate.checkForKnexTable(ParentWithMultiChildAttheSameLevelWithIndexes).should.eventually.equal(true);
        })
    });

    it("Adding a child to a parent and synchronize.", function () {
        childSynchronize = parentSynchronize.extend("childSynchronize", {
            init: function() {
                this.id = 12312;
                this.name = "Child";
                Parent.call(this);
            },
            dob: {type: Date}
        })

        schema.childSynchronize = {};
        PersistObjectTemplate._verifySchema();
        return  PersistObjectTemplate.saveSchema('pg').should.eventually.have.property('command').then(function() {
            return PersistObjectTemplate.synchronizeKnexTableFromTemplate(childSynchronize).then(function (status) {
                return PersistObjectTemplate.checkForKnexTable(parentSynchronize).should.eventually.equal(true);
            })
        })

    });

    it("Adding a child with index to a parent and synchronize.", function () {
        childSynchronize = parentSynchronize.extend("childSynchronize", {
            init: function() {
                this.id = 12312;
                this.name = "Child";
                Parent.call(this);
            },
            dob: {type: Date}
        })

        schema.childSynchronize = {};
        schema.childSynchronize.indexes = JSON.parse('[{"name": "single_index","def": {"columns": ["dob"],"type": "unique"}}]');

        PersistObjectTemplate._verifySchema();

        return PersistObjectTemplate.saveSchema('pg').should.eventually.have.property('command').then(function() {
            return PersistObjectTemplate.synchronizeKnexTableFromTemplate(childSynchronize).then(function (status) {
                return PersistObjectTemplate.checkForKnexTable(parentSynchronize).should.eventually.equal(true);
            })
        })

    });
})

