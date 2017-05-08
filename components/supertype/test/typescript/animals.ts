import {expect} from 'chai';
import * as mocha from 'mocha';
import {Ark} from "./model/Arc";
import {Lion} from "./model/Lion";
import {Bear} from "./model/Bear";
import {Animal} from "./model/Animal";

describe('Freeze Dried Arks', function () {
    var ark1;
    var ark2;

    it ('has parent an children classes', function () {
        expect(Animal.amorphicChildClasses.length).to.equal(2);
        expect(Animal.amorphicChildClasses[0]).to.equal(Lion);
        expect(Animal.amorphicChildClasses[1]).to.equal(Bear);
        expect(Bear.amorphicParentClass).to.equal(Animal);
        expect(Lion.amorphicParentClass).to.equal(Animal);
    });
    it ('has property values', function () {
        expect(Lion.amorphicProperties.lionStuff.type).to.equal(String);
        expect(Bear.amorphicProperties.lionStuff).to.equal(undefined);
        expect(Animal.amorphicProperties.lionStuff).to.equal(undefined);
        expect(Bear.amorphicProperties.isMammal).to.equal(undefined);
        expect(Bear.amorphicGetProperties().isMammal.type).to.equal(Boolean);
        expect(Animal.amorphicProperties.isMammal.type).to.equal(Boolean);
        var ark = new Ark();
        expect(ark.amorphicGetPropertyValues('size').length).to.equal(2);
        expect(ark.amorphicGetPropertyDescriptions('size').s).to.equal('small');
    });

    it ('create the arc', function (done) {
        Ark.createProperty('foo', {isLocal: true, type: String, value: 'foo'});
        Ark.createProperty('bar', {isLocal: true, type: String, value: 'bar'});
        Ark.createProperty('barPersistor', {isLocal: true, type: String, value: {isFetched: true}});
        ark1 = new Ark();
        expect(ark1.foo).to.equal('foo');
        expect(ark1.bar).to.equal('bar');
        expect(ark1.barPersistor.isFetched).to.equal(true);
        ark1.barPersistor.isFetched = false;
        expect(ark1.barPersistor.isFetched).to.equal(false);
        ark1.board(new Lion());
        ark1.board(new Bear());
        ark2 = new Ark();
        ark2.board(new Lion());
        ark2.board(new Bear());
        expect(ark1.__template__.__name__).to.equal('Ark');
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
        var serialArk1 = ark1.amorphicToJSON();
        var serialArk2 = ark2.amorphicToJSON();

        ark1 = Ark.amorphicFromJSON(serialArk1);
        expect(ark1.animals[0].canRoar()).to.equal(true);
        expect(ark1.animals[1].canHug()).to.equal(true);
        expect(ark1.animals[0].legs).to.equal(4);
        expect(ark1.animals[1].legs).to.equal(2);
        expect(ark1.animals[0].ark instanceof Ark).to.equal(true);
        expect(ark1.animals[1].ark instanceof Ark).to.equal(true);

        ark2 = Ark.amorphicFromJSON(serialArk2);
        expect(ark2.animals[0].canRoar()).to.equal(true);
        expect(ark2.animals[1].canHug()).to.equal(true);
        expect(ark2.animals[0].legs).to.equal(4);
        expect(ark2.animals[1].legs).to.equal(2);
        expect(ark2.animals[0].ark instanceof Ark).to.equal(true);
        expect(ark2.animals[1].ark instanceof Ark).to.equal(true);

        done();
    });
/*
TODO: Typescript -- figure this out

    it ('can log', function () {
        var date = new Date('11/11/2010');
        var output = '';

        ObjectTemplate.logger.sendToLog = function sendToLog(level, obj) {
            var str = ObjectTemplate.logger.prettyPrint(level, obj).replace(/.*: /, '');
            console.log(str);
            output += str.replace(/[\r\n ]/g, '');
        };

        ObjectTemplate.logger.startContext({name: 'supertype'});
        ObjectTemplate.logger.warn({foo: 'bar1'}, 'Yippie');
        var context = ObjectTemplate.logger.setContextProps({permFoo: 'permBar1'});
        ObjectTemplate.logger.warn({foo: 'bar2'});
        ObjectTemplate.logger.clearContextProps(context);
        ObjectTemplate.logger.warn({foo: 'bar3'});
        var child = ObjectTemplate.logger.createChildLogger({name: 'supertype_child'});
        child.setContextProps({permFoo: 'childFoo'});
        child.warn({'foo': 'bar4'});
        ObjectTemplate.logger.warn({foo: 'bar5'});
        ObjectTemplate.logger.startContext({name: 'supertype2'});
        ObjectTemplate.logger.warn({foo: 'bar6', woopie: {yea: true, oh: date}}, 'hot dog');
        ObjectTemplate.logger.setLevel('error');
        console.log('setting level to error');
        ObjectTemplate.logger.warn({foo: 'bar6', woopie: {yea: true, oh: date}}, 'hot dog');
        ObjectTemplate.logger.setLevel('error;foo:bar6');
        ObjectTemplate.logger.warn({foo: 'bar6', woopie: {yea: true, oh: date}}, 'hot dog');
        ObjectTemplate.logger.setLevel('error;foo:bar7');
        ObjectTemplate.logger.warn({foo: 'bar6', woopie: {yea: true, oh: date}}, 'hot dog');

        console.log(output);
        var result = '(foo="bar1")(permFoo="permBar1"foo="bar2")(foo="bar3")(permFoo="childFoo"foo="bar4")(foo="bar5")(foo="bar6"woopie={"yea":true,"oh":"2010-11-11T05:00:00.000Z"})(foo="bar6"woopie={"yea":true,"oh":"2010-11-11T05:00:00.000Z"})';

        expect(output).to.equal(result);
    });
*/
});
