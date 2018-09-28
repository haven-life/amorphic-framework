var expect = require('chai').expect;
var ObjectTemplate = require('../dist/index.js').default;

var Main = ObjectTemplate.create('Main', {
    name: {type: String, value: ''},
    init: function (name) {
        this.name = name;
    }
});

var SubOne = ObjectTemplate.create('SubOne', {
    name: {type: String, value: ''},
    init: function (name) {
        this.name = name;
    }
});

var SubOneExtended = SubOne.extend('SubOneExtended', {
    init: function (name) {
        SubOne.call(this, name);
    }
});

var SubMany = ObjectTemplate.create('SubMany', {
    main: {type: Main},
    name: {type: String, value: ''},
    init: function (name) {
        this.name = name;
    }
});

var SubManyExtended = SubMany.extend('SubManyExtended', {
    init: function (name) {
        SubMany.call(this, name);
    }
});

Main.mixin({
    subA: {type: SubOne},
    subB: {type: SubOne},
    subsA: {type: Array, of: SubMany, value: []},
    subsB: {type: Array, of: SubMany, value: []},
    addSubManyA: function (subMany) {
        subMany.main = this;
        this.subsA.push(subMany);
    },
    addSubManyB: function (subMany) {
        subMany.main = this;
        this.subsB.push(subMany);
    }
});

var main = new Main('main');
main.subA = new SubOne('mainOneA');
main.subB = new SubOneExtended('mainOneB');

main.addSubManyA(new SubMany('mainManyA'));
main.addSubManyB(new SubMany('mainManyB'));
main.addSubManyB(new SubManyExtended('mainManyExtendedB'));

it('can clone', function () {
    var relationship;
    var calledForTopLeve = false;
    var main2 = main.createCopy(function (obj, prop, template) {
        console.log(template.__name__);
        switch (template.__name__) {
        case 'Main':
            calledForTopLevel = true;
            return null; // Clone normally
        }
        switch (obj.__template__.__name__ + '.' + prop) {
        case 'Main.subA':
            return undefined;  // Don't clone
        case 'Main.subsA':
            return undefined;	// Don't clone
        }
        return null;    // normal create process
    });
    expect(main2.subA).to.equal(null);
    expect(main2.subB.name).to.equal('mainOneB');
    expect(main2.subB instanceof SubOneExtended).to.equal(true);
    expect(main2.subsB[0].name).to.equal('mainManyB');
    expect(main2.subsB[1].name).to.equal('mainManyExtendedB');
    expect(main2.subsB[1] instanceof SubManyExtended);
    expect(main2.subsA.length).to.equal(0);
    expect(main2.subsB.length).to.equal(2);
    expect(main2.subA).to.equal(null);
});
