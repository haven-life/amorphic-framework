var expect = require('chai').expect;
var ObjectTemplate = require('../dist/index.js').default;
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

        let sendToLogStub = sinon.stub(ObjectTemplate.logger, 'sendToLog');
        sendToLogStub.callsFake((level, obj) => {
            var str = sendToLogStub.lastCall.thisValue.prettyPrint(level, obj).replace(/.*: /, '');
            console.log(str);
            output += str.replace(/[\r\n ]/g, '');
        });

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
        var result = '(foo="bar1"data={}context={"data":{"__amorphicContext":{"name":"supertype"}}}request={})(foo="bar2"data={}context={"data":{"__amorphicContext":{"name":"supertype","permFoo":"permBar1"}}}request={})(foo="bar3"data={}context={"data":{"__amorphicContext":{"name":"supertype"}}}request={})(foo="bar4"data={}context={"data":{"__amorphicContext":{"name":"supertype","permFoo":"childFoo"}}}request={})(foo="bar5"data={}context={"data":{"__amorphicContext":{"name":"supertype"}}}request={})(foo="bar6"woopie={"yea":true,"oh":"2010-11-11T00:00:00.000Z"}data={}context={"data":{"__amorphicContext":{"name":"supertype2"}}}request={})(foo="bar6"woopie={"yea":true,"oh":"2010-11-11T00:00:00.000Z"}data={}context={"data":{"__amorphicContext":{"name":"supertype2"}}}request={})';

        sinon.restore();
        expect(output).to.equal(result);
    });

    it ('can log with custom logger', function () {
        var date = new Date('2010-11-11T00:00:00.000Z');
        var output = '';

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
                const a = {};
                const b = {};

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

        ObjectTemplate.logger.setLogger(new CustomLogger());

        ObjectTemplate.logger.startContext({name: 'supertype'});
        ObjectTemplate.logger.setLevel('info');
        ObjectTemplate.logger.info({foo: 'bar1'}, 'Yippie');
        var context = ObjectTemplate.logger.setContextProps({permFoo: 'permBar1'});
        ObjectTemplate.logger.warn({foo: 'bar2'});
        ObjectTemplate.logger.clearContextProps(context);
        ObjectTemplate.logger.error({foo: 'bar3'});
        var child = ObjectTemplate.logger.createChildLogger({name: 'supertype_child'});
        child.setContextProps({permFoo: 'childFoo'});
        child.warn({'foo': 'bar4'});
        ObjectTemplate.logger.debug({foo: 'bar5'});
        ObjectTemplate.logger.startContext({name: 'supertype2'});
        ObjectTemplate.logger.warn({foo: 'bar6', woopie: {yea: true, oh: date}}, 'hot dog');
        ObjectTemplate.logger.setLevel('debug');
        console.log('setting level to debug');
        ObjectTemplate.logger.debug({foo: 'bar5'});
        ObjectTemplate.logger.warn({foo: 'bar6', woopie: {yea: true, oh: date}}, 'hot dog');
        ObjectTemplate.logger.setLevel('error;foo:bar6');
        ObjectTemplate.logger.warn({foo: 'bar6', woopie: {yea: true, oh: date}}, 'hot dog');
        ObjectTemplate.logger.setLevel('error;foo:bar7');
        ObjectTemplate.logger.warn({foo: 'bar6', woopie: {yea: true, oh: date}}, 'hot dog');

        console.log(output);
        var result = '30:(foo="bar1"context={"data":{"__amorphicContext":{"name":"supertype"}}}request={})40:(foo="bar2"context={"data":{"__amorphicContext":{"name":"supertype","permFoo":"permBar1"}}}request={})50:(foo="bar3"context={"data":{"__amorphicContext":{"name":"supertype"}}}request={})40:(foo="bar4"context={"data":{"__amorphicContext":{"name":"supertype","permFoo":"childFoo"}}}request={})40:(foo="bar6"woopie={"yea":true,"oh":"2010-11-11T00:00:00.000Z"}context={"data":{"__amorphicContext":{"name":"supertype2"}}}request={})20:(foo="bar5"context={"data":{"__amorphicContext":{"name":"supertype2"}}}request={})40:(foo="bar6"woopie={"yea":true,"oh":"2010-11-11T00:00:00.000Z"}context={"data":{"__amorphicContext":{"name":"supertype2"}}}request={})40:(foo="bar6"woopie={"yea":true,"oh":"2010-11-11T00:00:00.000Z"}context={"data":{"__amorphicContext":{"name":"supertype2"}}}request={})';

        expect(output).to.equal(result);
    });
});
