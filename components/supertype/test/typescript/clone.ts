import {expect} from 'chai';
import * as mocha from 'mocha';
import {property, Supertype, supertypeClass} from "../../dist/index";

@supertypeClass
class Main extends Supertype {

    @property()
    name: String = '';
    constructor (name) {
        super();
        this.name = name;
    }
    @property({getType: () => {return SubOne}})
    subA: SubOne;
    @property({getType: () => {return SubOne}})
    subB: SubOne;
    @property({getType: () => {return SubMany}})
    subsA: Array<SubMany> = [];
    @property({getType: () => {return SubMany}})
    subsB: Array<SubMany> = [];
    addSubManyA (subMany) {
        subMany.main = this;
        this.subsA.push(subMany);
    }
    addSubManyB (subMany) {
        subMany.main = this;
        this.subsB.push(subMany);
    }
};
@supertypeClass
class SubOne extends Supertype {
    @property()
    name: String = '';
    constructor (name) {
        super();
        this.name = name;
    }
};
@supertypeClass
class SubOneExtended extends SubOne {
    constructor (name) {
        super(name);
    }
};
@supertypeClass
class SubMany extends Supertype {
    @property()
    main: Main;
    @property()
    name: String = '';
    constructor (name) {
        super();
        this.name = name;
    }
};
@supertypeClass
class SubManyExtended  extends SubMany {
    constructor (name) {
        super(name);
    }
};


var main = new Main('main');
main.subA = new SubOne('mainOneA');
main.subB = new SubOneExtended('mainOneB');

main.addSubManyA(new SubMany('mainManyA'));
main.addSubManyB(new SubMany('mainManyB'));
main.addSubManyB(new SubManyExtended('mainManyExtendedB'));

main.amorphic.getClasses();

it('can clone', function () {
    var relationship;
    var calledForTopLeve = false;
    var main2 = main.createCopy(function (obj, prop, template) {
        console.log(template.__name__);
        switch (template.__name__) {
        case 'Main':
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
