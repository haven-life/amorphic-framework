var expect = require('chai').expect;
var ObjectTemplate = require('supertype');
var PersistObjectTemplate = require('../index.js')(ObjectTemplate, null, ObjectTemplate);

/* Teacher Student Example */

var Animal = ObjectTemplate.create('Animal', {
    name: {type: String},
    isMammal: {type: Boolean, value: true},
    legs: {type: Number, value: 2}
});

var Lion = Animal.extend('Lion', {
    init: function () {
        Animal.call(this);
        this.name = 'Lion';
        this.legs = 4;
    },
    canRoar: function () {return true}
});

var Bear = Animal.extend('Bear', {
    init: function () {
        Animal.call(this);
        this.name = 'Bear';
    },
    canHug: function () {return true}
});

var Ark = ObjectTemplate.create('Ark', {
    animals: {type: Array, of: Animal, value: []},
    board: function (animal) {
        animal.ark = this;
        this.animals.push(animal)
    }
});
Animal.mixin({
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

    it ('save and restore the arc', function (done)
    {
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

    it ('check the callback', function() {
        var response = PersistObjectTemplate.createTransientObject(function() {
            return 'checkdata';
        });
        expect(response).to.equal('checkdata');
    });

    it ('if the current transient state is false, createTransientObject should retain the false state', function() {
        PersistObjectTemplate.__transient__ = false;
        PersistObjectTemplate.createTransientObject();
        expect(PersistObjectTemplate.__transient__).to.equal(false);
    });

    it ('if the current transient state is true, createTransientObject should retain the true state', function() {
        PersistObjectTemplate.__transient__ = true;
        PersistObjectTemplate.createTransientObject();
        expect(PersistObjectTemplate.__transient__).to.equal(true);
    })

});







