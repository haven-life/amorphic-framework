import {expect} from 'chai';
import * as mocha from 'mocha';
import {Ark} from "./model/Ark";
import {LionContainer} from "./model/Ark";
import {AnimalContainer} from "./model/Ark";
import {Lion} from "./model/Lion";
import {Bear} from "./model/Bear";
import {Animal} from "./model/Animal";
import {amorphicStatic} from "../../dist/index";


describe('AnimalContainer', function () {
    it ('has proper types', function () {
        expect(AnimalContainer.amorphicProperties.containee.type).to.equal(Animal);
        expect(LionContainer.amorphicProperties.containee.type).to.equal(Lion);
    });
});

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
    it ('has static property values', function () {
        expect(Animal['__toClient__']).to.equal(true);
        expect(Lion.amorphicProperties.lionStuff.type).to.equal(String);
        expect(Bear.amorphicProperties.lionStuff).to.equal(undefined);
        expect(Animal.amorphicProperties.lionStuff).to.equal(undefined);
        expect(Bear.amorphicProperties.isMammal).to.equal(undefined);
        expect(Bear.amorphicGetProperties().isMammal.type).to.equal(Boolean);
        expect(Animal.amorphicProperties.isMammal.type).to.equal(Boolean);
        expect(Animal.amorphicClassName).to.equal('Animal');
        expect(Bear.amorphicClassName).to.equal('Bear');
        expect(Bear.amorphicStatic).to.equal(Bear['__objectTemplate__']);
        expect(amorphicStatic).to.equal(Bear['__objectTemplate__']);
    });
    it ('has object property values', function () {
        var ark = new Ark();
        expect(ark.amorphicGetPropertyValues('size').length).to.equal(2);
        expect(ark.amorphicGetPropertyDescriptions('size').s).to.equal('small');
        expect(ark.__template__.__name__).to.equal('Ark');
        expect(ark.amorphicClass.__name__).to.equal('Ark');
        expect(ark.amorphicClass.amorphicClassName).to.equal('Ark');
        expect(ark.amorphicGetClassName()).to.equal('Ark');
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
    it ('can log', function () {
        var date = new Date('2010-11-11T00:00:00.000Z');
        var output = '';
        
        let ark: Ark = new Ark();

        ark.amorphic.logger.sendToLog = function sendToLog(level, obj) {
            var str = ark.amorphic.logger.prettyPrint(level, obj).replace(/.*: /, '');
            console.log(str);
            output += str.replace(/[\r\n ]/g, '');
        };

        ark.amorphic.logger.startContext({name: 'supertype'});
        ark.amorphic.logger.warn({foo: 'bar1'}, 'Yippie');
        var context = ark.amorphic.logger.setContextProps({permFoo: 'permBar1'});
        ark.amorphic.logger.warn({foo: 'bar2'});
        ark.amorphic.logger.clearContextProps(context);
        ark.amorphic.logger.warn({foo: 'bar3'});
        var child = ark.amorphic.logger.createChildLogger({name: 'supertype_child'});
        child.setContextProps({permFoo: 'childFoo'});
        child.warn({'foo': 'bar4'});
        ark.amorphic.logger.warn({foo: 'bar5'});
        ark.amorphic.logger.startContext({name: 'supertype2'});
        ark.amorphic.logger.warn({foo: 'bar6', woopie: {yea: true, oh: date}}, 'hot dog');
        ark.amorphic.logger.setLevel('error');
        console.log('setting level to error');
        ark.amorphic.logger.warn({foo: 'bar6', woopie: {yea: true, oh: date}}, 'hot dog');
        ark.amorphic.logger.setLevel('error;foo:bar6');
        ark.amorphic.logger.warn({foo: 'bar6', woopie: {yea: true, oh: date}}, 'hot dog');
        ark.amorphic.logger.setLevel('error;foo:bar7');
        ark.amorphic.logger.warn({foo: 'bar6', woopie: {yea: true, oh: date}}, 'hot dog');

        console.log(output);
        var result = '(__amorphicContext={"name":"supertype"}foo="bar1")(__amorphicContext={"name":"supertype","permFoo":"permBar1"}permFoo="permBar1"foo="bar2")(__amorphicContext={"name":"supertype"}foo="bar3")(__amorphicContext={"name":"supertype","permFoo":"childFoo"}permFoo="childFoo"foo="bar4")(__amorphicContext={"name":"supertype"}foo="bar5")(__amorphicContext={"name":"supertype2"}foo="bar6"woopie={"yea":true,"oh":"2010-11-11T00:00:00.000Z"})(__amorphicContext={"name":"supertype2"}foo="bar6"woopie={"yea":true,"oh":"2010-11-11T00:00:00.000Z"})';

        expect(output).to.equal(result);
    });

});
