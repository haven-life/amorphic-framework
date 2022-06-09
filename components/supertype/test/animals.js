var expect = require('chai').expect;
var ObjectTemplate = require('../dist/index.js').default;


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
});
