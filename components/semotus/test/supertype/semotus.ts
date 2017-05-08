/*
 * Banking example shows PersistObjectTemplate with
 * many-to-many relationships
 *
 */

declare function require(name:string);


// RemoteObjectTemplate will be used for server template creation
var RemoteObjectTemplate  = require('../../index.js');
RemoteObjectTemplate.role = "server";
RemoteObjectTemplate._useGettersSetters = true;
RemoteObjectTemplate.maxCallTime = 60 * 1000;
RemoteObjectTemplate.__conflictMode__ = 'soft';

var ClientObjectTemplate = RemoteObjectTemplate._createObject();
ClientObjectTemplate.role = "client";
ClientObjectTemplate._useGettersSetters = false;
ClientObjectTemplate.__conflictMode__ = 'soft';

var ServerObjectTemplate = RemoteObjectTemplate._createObject();
ServerObjectTemplate.role = "server";
ServerObjectTemplate._useGettersSetters = true;
ServerObjectTemplate.maxCallTime = 60 * 1000;
ServerObjectTemplate.__conflictMode__ = 'soft';
ServerObjectTemplate.__dictionary__ = RemoteObjectTemplate.__dictionary__;

import { expect } from 'chai';
import * as mocha from 'mocha';
import * as Q from 'Q';

function sendToServer(message) {
    ServerObjectTemplate.processMessage(message);
}

function sendToClient(message) {
    ClientObjectTemplate.processMessage(message);
}

ClientObjectTemplate.createSession('client', sendToServer);
ServerObjectTemplate.createSession('server', sendToClient);

ClientObjectTemplate.enableSendMessage(true, sendToServer);
ServerObjectTemplate.enableSendMessage(true, sendToClient);

// Create a client controller template with an objectTemplate that has a session.
var ClientController = createController(ClientObjectTemplate, {});

// Create a server controller template with an objectTemplate that has no session since the
// session will be propagated with sessionize.
var ServerController = createController(RemoteObjectTemplate, ClientObjectTemplate.getClasses());

expect(ClientController == ServerController).to.equal(false);

ClientController.debug = 'client';
ServerController.debug = 'server';

function createController(objectTemplate, toClear) {

    RemoteObjectTemplate.bindDecorators(objectTemplate);

    for (var obj in toClear) {
        delete require['cache'][__dirname + '/' + obj + '.js'];
    }
    return require('./Controller.js').Controller;
}

var clientController = new ClientController();
ClientObjectTemplate.controller = clientController;

// Create the server controller with the same Id so they can sync up
var serverController = ServerObjectTemplate._createEmptyObject(ServerController, clientController.__id__);

ServerObjectTemplate.syncSession();
ServerObjectTemplate.controller = serverController;
ServerObjectTemplate.__changeTracking__ = true;
ServerObjectTemplate.reqSession = {loggingID: "test", semotus: {}};
ServerObjectTemplate.logLevel = 1;
ServerObjectTemplate.logger.setLevel('info;activity:dataLogging');

describe("Typescript Banking Example", function () {

    it("pass object graph to server and return", function (done) {
       RemoteObjectTemplate.serverAssert = function () {
            expect(serverController.sam.roles[0].account.getBalance()).to.equal(100);
            expect(serverController.sam.roles[1].account.getBalance()).to.equal(125);
            expect(serverController.preServerCallObjects['Controller']).to.equal(true);
       }
        expect(clientController.sam.roles[0].account.getBalance()).to.equal(100);
        expect(clientController.sam.roles[1].account.getBalance()).to.equal(125);
       clientController.mainFunc().then(function () {
           expect(clientController.sam.roles[0].account.getBalance()).to.equal(100);
           expect(clientController.sam.roles[1].account.getBalance()).to.equal(125);
           done();
       }).fail(function(e) {
           done(e)
       });
       console.log('foo');
    });
    it("change results on server by poking an amount", function (done) {
        RemoteObjectTemplate.serverAssert = function () {
            expect(serverController.sam.roles[0].account.transactions[0].__changed__).to.equal(true);
            serverController.sam.roles[0].account.transactions[0].__changed__ = false;
            serverController.sam.roles[0].account.transactions[0].amount = 200;
            expect(serverController.sam.roles[0].account.transactions[0].__changed__).to.equal(true);
        }
        clientController.mainFunc().then(function () {
            expect(clientController.sam.roles[0].account.getBalance()).to.equal(200);
            done();
        }).fail(function(e) {
            done(e)
        });
    });
    it("change results on server by adding a transaction", function (done) {
        RemoteObjectTemplate.serverAssert = function () {
            serverController.sam.roles[0].account.credit(100);
        }
        clientController.mainFunc().then(function () {
            expect(serverController.sam.roles[0].account.getBalance()).to.equal(300);
            done();
        }).fail(function(e) {
            done(e)
        });
    });
    it("change results on server by adding an account", function (done) {
        RemoteObjectTemplate.serverAssert = function () {
            serverController.giveSamASecondAccount();
            serverController.sam.roles[0].account.credit(100);
        }
        clientController.mainFunc().then(function () {
            expect(serverController.sam.roles[0].account.getBalance()).to.equal(400);
            expect(serverController.sam.roles[2].account.address.lines[0]).to.equal('Plantana');
            done();
        }).fail(function(e) {
            done(e)
        });
    });

    it("throw an execption", function (done) {
        RemoteObjectTemplate.serverAssert = function () {
            throw "get stuffed";
        }
        clientController.mainFunc()
            .then(function () {
                expect("Should not be here").to.equal(false);
            }, function (e) {
                expect(e.message).to.equal("get stuffed");
                done()
            }).fail(function(e) {
                done(e)
            });
    });
    it("can get a synchronization error", function (done) {
        RemoteObjectTemplate.serverAssert = function () {
            throw "get stuffed";
        }
        clientController.mainFunc()
            .then(function () {
                expect("Should not be here").to.equal(false);
            }, function (e) {
                expect(e.message).to.equal("get stuffed");
                done()
            }).fail(function(e) {
                done(e)
            });
    });
    it("can get a synchronization error from overlapping calls", function (done) {
        this.timeout(7000);
        RemoteObjectTemplate.serverAssert = function () {
            return Q.delay(1000);
        }
        clientController.mainFunc()
            .then(function () {
                expect("Should not be here").to.equal(false);
            });
        clientController.mainFunc()
            .then(function () {
                expect("Should not be here").to.equal(false);
            }, function (e) {
                console.log(e);
                Q.delay(1000).then(function () {done()});
            }).fail(function(e) {
                done(e)
            });
    });

    it("change tracking to work with arrays", function (done) {
        RemoteObjectTemplate.serverAssert = function () {
            expect(serverController.sam.roles[0].account.__changed__).to.equal(true);
            serverController.sam.roles[0].account.__changed__ = false;
            serverController.sam.roles[0].account.debit(50);
            expect(serverController.sam.roles[0].account.__changed__).to.equal(false);
            ServerObjectTemplate.MarkChangedArrayReferences();
            expect(serverController.sam.roles[0].account.__changed__).to.equal(true);
        }
        var balance = clientController.sam.roles[0].account.getBalance();
        serverController.sam.roles[0].account.__changed__ = false;
        clientController.sam.roles[0].account.debit(50);
        clientController.mainFunc().then(function () {
             expect(serverController.sam.roles[0].account.getBalance()).to.equal(balance - 100);
             done();
        }).fail(function(e) {
            done(e)
        });
    });


});
