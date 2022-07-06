var expect = require('chai').expect;
var ObjectTemplate = require('../dist/index.js').default;
var SupertypeLogger = require('../dist/SupertypeLogger.js').SupertypeLogger;
var sinon = require('sinon');

/* Teacher Student Example */
BaseTemplate = ObjectTemplate.create('BaseTemplate',
    {
        name: {type: String},
        isMammal: {type: Boolean, value: true},
        legs: {type: Number}
    });

BaseTemplate.mixin({
    legs: {type: Number, value: 2} // Make sure duplicate props work
});

Lion = BaseTemplate.extend('Lion',
    {
        init: function init() {
            BaseTemplate.call(this);
            this.name = 'Lion';
            this.legs = 4;
        },
        canRoar: function canRoar() {
            return true;
        }
    });

Bear = BaseTemplate.extend('Bear',
    {
        init: function init() {
            BaseTemplate.call(this);
            this.name = 'Bear';
        },
        canHug: function canHug() {
            return true;
        }
    });

Ark = ObjectTemplate.create('Ark',
    {
        animals: {type: Array, of: BaseTemplate, value: []},
        board: function (animal) {
            animal.ark = this;
            this.animals.push(animal);
        }
    });

BaseTemplate.mixin(
    {
        ark:    {type: Ark}
    });

describe('Freeze Dried Arks', function () {
    var ark1;
    var ark2;

    it ('create the arc', function (done) {
        ark1 = new Ark();
        ark1.board(new Lion());
        ark1.board(new Bear());
        ark2 = new Ark();
        ark2.board(new Lion());
        ark2.board(new Bear());
        expect(ark1.animals[0].canRoar()).to.equal(true);
        expect(ark1.animals[1].canHug()).to.equal(true);
        expect(ark1.animals[0].legs).to.equal(4);
        expect(ark1.animals[1].legs).to.equal(2);
        expect(ark1.animals[0].ark instanceof Ark).to.equal(true);
        expect(ark1.animals[1].ark instanceof Ark).to.equal(true);

        expect(ark2.animals[0].canRoar()).to.equal(true);
        expect(ark2.animals[1].canHug()).to.equal(true);
        expect(ark2.animals[0].legs).to.equal(4);
        expect(ark2.animals[1].legs).to.equal(2);
        expect(ark2.animals[0].ark instanceof Ark).to.equal(true);
        expect(ark2.animals[1].ark instanceof Ark).to.equal(true);

        done();
    });

    it ('save and restore the arc', function (done) {
        var serialArk1 = ark1.toJSONString();
        var serialArk2 = ark2.toJSONString();

        ark1 = Ark.fromJSON(serialArk1);
        expect(ark1.animals[0].canRoar()).to.equal(true);
        expect(ark1.animals[1].canHug()).to.equal(true);
        expect(ark1.animals[0].legs).to.equal(4);
        expect(ark1.animals[1].legs).to.equal(2);
        expect(ark1.animals[0].ark instanceof Ark).to.equal(true);
        expect(ark1.animals[1].ark instanceof Ark).to.equal(true);

        ark2 = Ark.fromJSON(serialArk2);
        expect(ark2.animals[0].canRoar()).to.equal(true);
        expect(ark2.animals[1].canHug()).to.equal(true);
        expect(ark2.animals[0].legs).to.equal(4);
        expect(ark2.animals[1].legs).to.equal(2);
        expect(ark2.animals[0].ark instanceof Ark).to.equal(true);
        expect(ark2.animals[1].ark instanceof Ark).to.equal(true);

        done();
    });

    it ('can log', function () {
        var date = new Date('2010-11-11T00:00:00.000Z');
        var output = '';

        let sendToLogStub = sinon.stub(SupertypeLogger.prototype, 'sendToLog');
        sendToLogStub.callsFake((level, obj) => {
            let str = sendToLogStub.lastCall.thisValue.prettyPrint(level, obj).replace(/.*-/, '');
            console.log(str);
            output += str.replace(/[\r\n ]/g, '');
        });
        ObjectTemplate.logger.startContext({name: 'supertype'});
        ObjectTemplate.logger.warn({foo: 'bar1'}, 'Yippie');
        var context = ObjectTemplate.logger.setContextProps({permFoo: 'permBar1'});
        ObjectTemplate.logger.warn({foo: 'bar2'});
        ObjectTemplate.logger.clearContextProps(context);
        ObjectTemplate.logger.warn({foo: 'bar3'});
        var child = ObjectTemplate.logger.childLogger({name: 'supertype_child'});
        child.setContextProps({permFoo: 'childFoo'});
        child.warn({'foo': 'bar4'});
        ObjectTemplate.logger.warn({foo: 'bar5'});
        ObjectTemplate.logger.startContext({name: 'supertype2'});
        ObjectTemplate.logger.warn({foo: 'bar6', woopie: {yea: true, oh: date}}, 'hot dog');
        ObjectTemplate.logger.warn({foo: 'bar6', woopie: {yea: true, oh: date}}, 'hot dog');
        ObjectTemplate.logger.warn({foo: 'bar6', woopie: {yea: true, oh: date}}, 'hot dog');
        ObjectTemplate.logger.error({foo: 'bar6', woopie: {yea: true, oh: date}}, 'hot dog');

        console.log(output);
        var result = '4:WARN:(0={"foo":"bar1","data":{"__amorphicContext":{"name":"supertype"}}}1="Yippie")4:WARN:(0={"foo":"bar2","data":{"__amorphicContext":{"name":"supertype","permFoo":"permBar1"}}})4:WARN:(0={"foo":"bar3","data":{"__amorphicContext":{"name":"supertype"}}})4:WARN:(0={"foo":"bar4","data":{"__amorphicContext":{"permFoo":"childFoo"}}})4:WARN:(0={"foo":"bar5","data":{"__amorphicContext":{"name":"supertype"}}})11T00:00:00.000Z"},"data":{"__amorphicContext":{"name":"supertype2"}}}1="hotdog")11T00:00:00.000Z"},"data":{"__amorphicContext":{"name":"supertype2"}}}1="hotdog")11T00:00:00.000Z"},"data":{"__amorphicContext":{"name":"supertype2"}}}1="hotdog")11T00:00:00.000Z"},"data":{"__amorphicContext":{"name":"supertype2"}}}1="hotdog")';

        expect(output).to.equal(result);
    });
});
