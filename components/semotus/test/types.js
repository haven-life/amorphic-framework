var expect = require('chai').expect;
var Q = require("q");
var _ = require("underscore");

var ClientObjectTemplate = require('../index.js')._createObject();
ClientObjectTemplate.role = "client";
ClientObjectTemplate._useGettersSetters = false;

var ServerObjectTemplate = require('../index.js')._createObject();
ServerObjectTemplate.role = "server";
ServerObjectTemplate._useGettersSetters = true;

function sendToServer(message) {
    ServerObjectTemplate.processMessage(message);
}

function sendToClient(message) {
    ClientObjectTemplate.processMessage(message);
}

var clientSessionId = ClientObjectTemplate.createSession('client', sendToServer);
var serverSessionId = ServerObjectTemplate.createSession('server', sendToClient);

ClientObjectTemplate.enableSendMessage(true, sendToServer);
ServerObjectTemplate.enableSendMessage(true, sendToClient);

var ClientController = createTemplates(ClientObjectTemplate).Controller;
var ServerController = createTemplates(ServerObjectTemplate).Controller;

var serverAssert;
function createTemplates(objectTemplate) {
    if (typeof(require) != 'undefined') {
        var fs = require('fs');
        var Q = require('q');
    }
    
    MySubTemplate = objectTemplate.create("MySubTemplate", {
        myString: {type: String, value: ""}
    });
    
    MyTemplate = objectTemplate.create("MyTemplate", {
        myNumber:   {type: Number, value: 100},
        myString:   {type: String, value: "100"},
        myDate:     {type: Date, value: (new Date("January 15, 2014"))},
        myArrayObj: {type: Array, of: Object, value:[1, 2, 3]},
        myArrayTObj: {type: Array, of: MySubTemplate, value: []},
        init: function (n, s, d) {
            this.myNumber = n;
            this.myString = s;
            this.myDate = d;
            //this.myArrayObj = a;
        }
    }),

    Controller = objectTemplate.create("Controller",
        {
            myNumber:       {type: Number},
            myString:       {type: String},
            myDate:         {type: Date},
            myArrayObj:     {type: Array, of: Object, value: []},
            myArrayTObj:    {type: Array, of: MyTemplate, value:[]},
            myObj:          {type: Object},

            assert: function (a, b) {

                var result = verify(a, b);

                function verify(a, b)
                {
                    if (a instanceof Date)
                        a = a.toString();
                    if (b instanceof Date)
                        b = b.toString();

                    if (a instanceof Array) {
                        if (a.length != b.length)
                            return false;
                        if (a.length == 0 && b.length == 0)
                            return true;
                        else
                            for (var ix = 0; ix < a.length; ++ix)
                                if (!b[ix] || !verify(a[ix], b[ix]))
                                    return false;
                        return true;
                    }

                    if (a && a.__id__)
                        a = a.__id__;
                    if (b && b.__id__)
                        b = b.__id__;


                    return JSON.stringify(a) == JSON.stringify(b);
                }
                if (!result)
                    console.log(JSON.stringify(a) + " != " + JSON.stringify(b));
                expect(result).to.equal(true);
            },

            doServer: {on: "server", body: function(prop, val, newVal) {
                this.assert(this[prop], val);
                this[prop] = newVal;
            }},

            clientInit: function () {
             },
            createMyTemplateOnServer: {on: "server", body: function () {
                var my = new MyTemplate(2, "three", new Date("January 15, 2015"));
                return my;
            }},
            validateServerIncomingObject: function (obj) {
                console.log('validateServerIncomingObject for ' + obj.__template__.__name__);
            },
            validateServerIncomingProperty: function (obj, prop, ix, defineProperty, unarray_newValue) {
                console.log('validateServerIncomingProperty for ' + obj.__template__.__name__ + "." + prop + "[" + ix + "]");
            },

            onContentRequest: function(request, response, next, file)
            {
                var file = __dirname + '/../files/gimbal_housing.pdf';
                if (file.match(/gimbal_housing.pdf/))
                {
                    try {
                        var stat = fs.statSync(file);
                    } catch(e) {
                        response.writeHead(404, {"Content-Type": "text/plain"});
                        response.end("Not found");
                        return;
                    }
                    console.log("streaming " + file + ' length=' + stat.size);
                    response.writeHead(200, {
                        'Content-Type': 'application/pdf',
                        'Content-Length': stat.size});
                    var readStream = fs.createReadStream(file);
                    readStream.pipe(response);
                    readStream.on('end', function () {
                        console.log('done');
                    });
                } else
                    next();
            }

        });
    
    return {Controller: Controller};
}

var Q = require('Q');
function client() {}
function server() {}


describe("Type Tests", function () {

    var clientController = new ClientController();
    ClientObjectTemplate.controller = clientController;
    var serverController = ServerObjectTemplate._createEmptyObject(ServerController, clientController.__id__);
    ServerObjectTemplate.controller = serverController;

    var t1 = new MyTemplate(1, "two", new Date("January 15, 2015"));
    var t2;
    var promise1,promise2,promise3;

    it ("controller.myNumber is null", function () {
        clientController.assert(clientController.myNumber, null);
    });

    it ("controller.myString is null", function () {
        clientController.assert(clientController.myString, null);
    });

    it ("controller.myDate is null", function () {
        clientController.assert(clientController.myDate, null);
    });

    it ("controller.myArrayObj is []", function () {
        clientController.assert(clientController.myArrayObj.length, 0);
    });

    it ("controller.myArrayTObj is []", function () {
        clientController.assert(clientController.myArrayTObj.length, 0);
    });

    it ("controller.myObj is null", function () {
        clientController.assert(clientController.myObj, null);
    });

    it ("can create a new template", function (done) {
        return clientController.createMyTemplateOnServer().then(function (t2s) {
            t2 = t2s;
            done();
        });
    })

    it ( "t2s.myNumber is 2", function () {
        clientController.assert(t2.myNumber, 2);
    });

    it ("t2s.myString is three", function () {
        clientController.assert(t2.myString, "three");
    });

    it ("t2s.myDate is January 15, 2015", function () {
        clientController.assert(t2.myDate, new Date("January 15, 2015"));
    });

    it ("t2s.myArrayObj is [x,x,x]", function () {
        clientController.assert(t2.myArrayObj.length, 3);
    });

    it ( "t2s.myArrayTObj is []", function () {
        clientController.assert(t2.myArrayTObj.length, 0);
    });

    it ("controller.myNumber is 1", function (done) {
        clientController.myNumber = 1;
        clientController.doServer('myNumber', 1, 2).then(function () {done()});
    });

    if ("controller.myNumber is 2", function () {
        clientController.assert(clientController.myNumber, 2);
    });

    it ("controller.myNumber is 0", function (done) {
        clientController.myNumber = 0;
        clientController.doServer('myNumber', 0, null).then(function () {done()});
    });

    if ("controller.myNumber is null", function () {
            clientController.assert(clientController.myNumber, null);
    });

    it ( "controller.myNumber is 0", function (done) {
        clientController.myNumber = 0;
        clientController.doServer('myNumber', 0, 1).then(function () {done()});
    });

    if ("controller.myNumber is 1", function () {
        clientController.assert(clientController.myNumber, 1);
    });

    it ("controller.myNumber is 0", function (done) {
        clientController.myNumber = null;
        clientController.doServer('myNumber', null, 0).then(function () {done()});
    });

    if ("controller.myNumber is 0", function () {
        clientController.assert(clientController.myNumber, 0);
    });

    if ("controller.myString is null", function () {
        clientController.myNumber = null;
        clientController.assert(clientController.myString, null);
    });

    it ("controller.myString is 'foo'", function (done) {
        clientController.myString = "foo";
        clientController.doServer('myString', "foo", 'bar').then(function () {done()});
    });

    if ("controller.myString is 'bar'", function () {
        clientController.assert(clientController.myString, 'bar');
    });

    it ("controller.myString is null", function (done) {
        clientController.myString = null;
        clientController.doServer('myString', null, "foo").then(function () {done()});
    });

    if ( "controller.myString is 'foo'", function () {
        clientController.assert(clientController.myString, 'foo');
    });

    it ("controller.myString is 'bar'", function (done) {
        clientController.myString = 'bar';
        clientController.doServer('myString', 'bar', null).then(function () {done()});
    });

    if ("controller.myString is null", function () {
        clientController.assert(clientController.myString, null);
    });

    if ("controller.myDate is null", function () {
            clientController.assert(clientController.myDate, null);
    });

    it ("controller.myDate is 'January 14, 2014'", function (done) {
        clientController.myDate = new Date("January 15, 2014");
        clientController.doServer('myDate', new Date("January 15, 2014"), new Date("January 15, 2015")).then(function () {done()});
    });

    if ("controller.myDate is 'January 15, 2015'", function () {
        clientController.assert(clientController.myDate, new Date("January 15, 2015"));
    });

    it ("controller.myDate is null", function (done) {
        clientController.myDate = null;
        clientController.doServer('myDate', null, new Date("January 15, 2014")).then(function () {done()});
    });

    if ("controller.myDate is 'January 15, 2014'", function () {
        clientController.assert(clientController.myDate, new Date("January 15, 2014"));
    });

    it ("controller.myDate is 'January 15, 2015'", function (done) {
        clientController.myDate = 'January 15, 2015';
        clientController.doServer('myDate', new Date("January 15, 2015"), null).then(function () {done()});
    });

    if ("controller.myDate is null", function () {
        clientController.assert(clientController.myDate, null);
    });

    if ("controller.myArrayTObj is []", function () {
            clientController.assert(clientController.myArrayTObj, []);
    });

    it ("controller.myArrayTObj is t1, t2", function (done) {
        clientController.myArrayTObj = [t1, t2];
        clientController.doServer('myArrayTObj', [t1, t2], [t1]).then(function () {done()});
    });

    if ("controller.myArrayTObj is t1", function () {
        clientController.assert(clientController.myArrayTObj, [t1]);
    });

    it ("controller.myArrayTObj is null", function (done) {
        clientController.myArrayTObj = null;
        t2.myNumber = null
        clientController.doServer('myArrayTObj', null, [t2]).then(function () {done()});
    });

    if ("controller.myArrayTObj is t2", function () {
        clientController.assert(clientController.this.myArrayTObj, [t2]);
    });

    it ("controller.myArrayTObj is t2, t1", function (done) {
        clientController.myArrayTObj[1] = t1;
        clientController.doServer('myArrayTObj', [t2, t1], null).then(function () {done()});
    });

    if ("controller.myArrayTObj is null", function () {
        clientController.assert(clientController.myArrayTObj, null);
    });

    if ("controller.myArrayObj is []", function () {
        clientController.assert(clientController.myArrayObj, []);
    });

    it ("controller.myArrayObj is {t: 1}, {t: 2}", function (done) {
        clientController.myArrayObj = [{t: 1}, {t: 2}];
        clientController.doServer('myArrayObj', [{t: 1}, {t: 2}], [{t: 1}]).then(function () {done()});
    });

    if ("controller.myArrayObj is {t: 1}", function () {
        clientController.assert(clientController.myArrayObj, [{t: 1}]);
    });

    it ("controller.myArrayObj is null", function (done) {
        clientController.myArrayObj = null;
        clientController.doServer('myArrayObj', null,  [{t: 2}]).then(function () {done()});
    });

    if ("controller.myArrayObj is {t: 2}", function () {
        clientController.assert(clientController.myArrayObj, [{t: 2}]);
    });

    it ("controller.myArrayObj is {t: 2}, {t: 1}", function (done) {
        clientController.myArrayObj[1] = {t: 1};
        clientController.doServer('myArrayObj', [{t: 2}, {t: 1}], null).then(function () {done()});
    });

    if ("controller.myArrayObj is null", function () {
        clientController.assert(clientController.myArrayObj, null);
    });

    it ("controller.myObj is {foo: 'one'}", function (done) {
        clientController.myObj = {foo: 'one'};
        clientController.doServer('myObj', {foo: 'one'}, {foo: 'two'}).then(function () {done()});
    });

    if ("controller.myObj is {foo: 'two'}", function () {
        clientController.assert(clientController.myObj, {foo: 'two'});
    });

    it ("controller.myObj is null", function (done) {
        clientController.myObj = null;
        clientController.doServer('myObj', null, {foo: 'one'}).then(function () {done()});
    });

    if ("controller.myObj is {foo: 'one'}", function () {
        clientController.assert(clientController.myObj, {foo: 'one'});
    });

    it ("controller.myObj is {foo: 'two'}", function (done) {
        clientController.myObj = {foo: 'two'};
        clientController.doServer('myObj', {foo: 'two'}, null).then(function () {done()});
    });

    it ("controller.myObj is null", function () {
        clientController.assert(clientController.myObj, null);
    });

});
describe("Extended Templates", function () {
    it ("has extended values", function (done) {

        var BaseTemplate1 = ClientObjectTemplate.create("BaseTemplate",
            {
            	boolTrue:   {type: Boolean, value: true},
                boolFalse:  {type: Boolean, value: false},
                num:        {type: Number, value: 100},
                str:        {type: String, value: 'Base'},
                obj:        {type: Object, value: {type: 'Base'}},
                date:       {type: Date, value: new Date(100)}
            });

        var BaseTemplate3 = ClientObjectTemplate.create("BaseTemplate",
            {
                boolTrue:   {type: Boolean},
                boolFalse:  {type: Boolean},
                num:        {type: Number},
                str:        {type: String},
                obj:        {type: Object},
                date:       {type: Date},
                init: function () {
                    BaseTemplate1.call(this);
                    this.boolTrue = true;
                    this.boolFalse = false;
                    this.num = 100;
                    this.str = 'Base';
                    this.obj = {type: 'Base'};
                    this.date = new Date(100);
                },
            });

        var ExtendedTemplate1 = BaseTemplate1.extend("ExtendedTemplate1",
            {
                boolTrue:   {type: Boolean, value: false},
                boolFalse:  {type: Boolean, value: true},
                num:        {type: Number, value: 200},
                str:        {type: String, value: 'Extended'},
                obj:        {type: Object, value: {type: 'Extended'}},
                date:       {type: Date, value: new Date(200)},
                init: function () {
                    BaseTemplate1.call(this);
                },
            });

        var ExtendedTemplate2 = BaseTemplate1.extend("ExtendedTemplate2",
            {
                boolTrue:   {type: Boolean, value: false},
                boolFalse:  {type: Boolean, value: true},
                num:        {type: Number, value: 200},
                str:        {type: String, value: 'Extended'},
                obj:        {type: Object, value: {type: 'Extended'}},
                date:       {type: Date, value: new Date(200)},
                init: function () {
                    BaseTemplate1.call(this);
                    this.boolTrue = true;
                    this.boolFalse = false;
                    this.num = 100;
                    this.str = 'Base';
                    this.obj = {type: 'Base'};
                    this.date = new Date(100);
                },
            });

        var ExtendedTemplate3 = BaseTemplate1.extend("ExtendedTemplate1",
            {
                boolTrue:   {type: Boolean, value: false},
                boolFalse:  {type: Boolean, value: true},
                num:        {type: Number, value: 200},
                str:        {type: String, value: 'Extended'},
                obj:        {type: Object, value: {type: 'Extended'}},
                date:       {type: Date, value: new Date(200)},
                init: function () {
                    BaseTemplate1.call(this);
                    this.boolTrue = false;
                    this.boolFalse = true;
                    this.num = 200;
                    this.str = 'Extended';
                    this.obj = {type: 'Extended'};
                    this.date = new Date(200);
                },
            });

        expect((new ExtendedTemplate1()).boolTrue).to.equal(false);
        expect((new ExtendedTemplate1()).boolFalse).to.equal(true);
        expect((new ExtendedTemplate1()).num).to.equal(200);
        expect((new ExtendedTemplate1()).str).to.equal('Extended');
        expect((new ExtendedTemplate1()).obj.type).to.equal('Extended');
        expect((new ExtendedTemplate1()).date.getTime()).to.equal(200);

        expect((new ExtendedTemplate2()).boolTrue).to.equal(true);
        expect((new ExtendedTemplate2()).boolFalse).to.equal(false);
        expect((new ExtendedTemplate2()).num).to.equal(100);
        expect((new ExtendedTemplate2()).str).to.equal('Base');
        expect((new ExtendedTemplate2()).obj.type).to.equal('Base');
        expect((new ExtendedTemplate2()).date.getTime()).to.equal(100);

        expect((new ExtendedTemplate3()).boolTrue).to.equal(false);
        expect((new ExtendedTemplate3()).boolFalse).to.equal(true);
        expect((new ExtendedTemplate3()).num).to.equal(200);
        expect((new ExtendedTemplate3()).str).to.equal('Extended');
        expect((new ExtendedTemplate3()).obj.type).to.equal('Extended');
        expect((new ExtendedTemplate3()).date.getTime()).to.equal(200);

        done();
    });
});