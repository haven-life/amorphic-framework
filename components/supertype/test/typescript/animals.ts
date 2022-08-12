import {expect} from 'chai';
import * as mocha from 'mocha';
import {Ark} from "./model/Ark";
import {LionContainer} from "./model/Ark";
import {AnimalContainer} from "./model/Ark";
import {Lion} from "./model/Lion";
import {Bear} from "./model/Bear";
import {Animal} from "./model/Animal";
import {amorphicStatic} from "../../dist/index";
import * as sinon from 'sinon';


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

        let sendToLogStub = sinon.stub(ark.amorphic.logger, 'sendToLog');
        sendToLogStub.callsFake((level, obj) => {
            var str = sendToLogStub.lastCall.thisValue.prettyPrint(level, obj).replace(/.*: /, '');
            console.log(str);
            output += str.replace(/[\r\n ]/g, '');
        });

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
        var result = '(foo="bar1"data={}context={"data":{"__amorphicContext":{"name":"supertype"}}})(foo="bar2"data={}context={"data":{"__amorphicContext":{"name":"supertype","permFoo":"permBar1"}}})(foo="bar3"data={}context={"data":{"__amorphicContext":{"name":"supertype"}}})(foo="bar4"data={}context={"data":{"__amorphicContext":{"name":"supertype","permFoo":"childFoo"}}})(foo="bar5"data={}context={"data":{"__amorphicContext":{"name":"supertype"}}})(foo="bar6"woopie={"yea":true,"oh":"2010-11-11T00:00:00.000Z"}data={}context={"data":{"__amorphicContext":{"name":"supertype2"}}})(foo="bar6"woopie={"yea":true,"oh":"2010-11-11T00:00:00.000Z"}data={}context={"data":{"__amorphicContext":{"name":"supertype2"}}})';

        expect(output).to.equal(result);
        sinon.restore();
    });
    it ('can log with custom logger', function () {
        var date = new Date('2010-11-11T00:00:00.000Z');
        var output = '';
        
        let ark: Ark = new Ark();

        class CustomLogger {
            info(obj) {
                this.log(30, obj);
            }
            error(obj) {
                this.log(50, obj);
            }
            warn(obj) {
                this.log(40, obj);
            }
            debug(obj) {
                this.log(20, obj);
            }

            childLogger() {
                return new CustomLogger();
            }

            log(level, obj) {
                var str = this.prettyPrint(level, obj);//.replace(/.*: /, '');
                console.log(str);
                output += str.replace(/[\r\n ]/g, '');
            }

            split(json, props) {
                const a: { name?, msg? } = {};
                const b: { name?, msg? } = {};

                for (const prop in json) {
                    (props[prop] ? b : a)[prop] = json[prop];
                }

                return [a, b];
            }

            prettyPrint(level, json) {
                let split = this.split(json, {time: 1, msg: 1, level: 1, name: 1});
        
                return level + ': ' +
                    addColonIfToken(split[1].name, ': ') +
                    addColonIfToken(split[1].msg, ': ') +
                    xy(split[0]);
        
                function addColonIfToken (token, colonAndSpace) {
                    if (token) {
                        return token + colonAndSpace;
                    }
        
                    return '';
                }
        
                function xy(j) {
                    var str = '';
                    var sep = '';
        
                    for (var prop in j) {
                        str += sep + prop + '=' + JSON.stringify(j[prop]);
                        sep = ' ';
                    }
        
                    if (str.length > 0) {
                        return '(' + str + ')';
                    }
        
                    return '';
                }
            }
        };

        ark.amorphic.logger.setLogger(new CustomLogger());

        ark.amorphic.logger.startContext({name: 'supertype'});
        ark.amorphic.logger.setLevel('info');
        ark.amorphic.logger.info({foo: 'bar1'}, 'Yippie');
        var context = ark.amorphic.logger.setContextProps({permFoo: 'permBar1'});
        ark.amorphic.logger.warn({foo: 'bar2'});
        ark.amorphic.logger.clearContextProps(context);
        ark.amorphic.logger.error({foo: 'bar3'});
        var child = ark.amorphic.logger.createChildLogger({name: 'supertype_child'});
        child.setContextProps({permFoo: 'childFoo'});
        child.warn({'foo': 'bar4'});
        ark.amorphic.logger.debug({foo: 'bar5'});
        ark.amorphic.logger.startContext({name: 'supertype2'});
        ark.amorphic.logger.warn({foo: 'bar6', woopie: {yea: true, oh: date}}, 'hot dog');
        ark.amorphic.logger.setLevel('debug');
        console.log('setting level to debug');
        ark.amorphic.logger.debug({foo: 'bar5'});
        ark.amorphic.logger.warn({foo: 'bar6', woopie: {yea: true, oh: date}}, 'hot dog');
        ark.amorphic.logger.setLevel('error;foo:bar6');
        ark.amorphic.logger.warn({foo: 'bar6', woopie: {yea: true, oh: date}}, 'hot dog');
        ark.amorphic.logger.setLevel('error;foo:bar7');
        ark.amorphic.logger.warn({foo: 'bar6', woopie: {yea: true, oh: date}}, 'hot dog');

        console.log(output);
        var result = '30:(foo="bar1"context={"data":{"__amorphicContext":{"name":"supertype"}}})40:(foo="bar2"context={"data":{"__amorphicContext":{"name":"supertype","permFoo":"permBar1"}}})50:(foo="bar3"context={"data":{"__amorphicContext":{"name":"supertype"}}})40:(foo="bar4"context={"data":{"__amorphicContext":{"name":"supertype","permFoo":"childFoo"}}})40:(foo="bar6"woopie={"yea":true,"oh":"2010-11-11T00:00:00.000Z"}context={"data":{"__amorphicContext":{"name":"supertype2"}}})20:(foo="bar5"context={"data":{"__amorphicContext":{"name":"supertype2"}}})40:(foo="bar6"woopie={"yea":true,"oh":"2010-11-11T00:00:00.000Z"}context={"data":{"__amorphicContext":{"name":"supertype2"}}})40:(foo="bar6"woopie={"yea":true,"oh":"2010-11-11T00:00:00.000Z"}context={"data":{"__amorphicContext":{"name":"supertype2"}}})';

        expect(output).to.equal(result);
    });

});
