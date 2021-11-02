var expect = require('chai').expect;
let assert = require('chai').assert;
var request = require('request');
var axios = require('axios');
var path = require('path');
var fs = require('fs');
var sinon = require('sinon');

// This module emulates XMLHTTPRequest for the benefit of client.js which uses it to communicate with the server
var xhrc = require('xmlhttprequest-cookie');
XMLHttpRequest = xhrc.XMLHttpRequest;
var CookieJar = xhrc.CookieJar;

// Copy index.js (amorphic) into it's rightful place in node_modules so it will be found

// The root must be test since amorphic depends on this to find app

// Fire up amorphic as the server

// Create global variables for the benefit of client.js
PostCallAssert = function () {};
ObjectTemplate = require('@haventech/supertype').default;
RemoteObjectTemplate = require('@haventech/semotus')._createObject();
RemoteObjectTemplate.role = 'client';
RemoteObjectTemplate._useGettersSetters = false;
Bluebird = require('bluebird');
_ = require('underscore');
__ver = 0;
document = {
    body: {
        addEventListener: function () {}
    },
    write: function (content) {}
};
alert = function (msg) {
    console.log('alert ' + content);
};
clientController = null;

var modelRequires;
var controllerRequires;
var Controller;
var serverAmorphic = require('../../dist/index.js');
var amorphicContext = require('../../dist/lib/AmorphicContext');
const SupertypeSession = require('@haventech/supertype').SupertypeSession;
const sendToLog = SupertypeSession.logger.sendToLog;

// Fire up amorphic as the client
require('../../client.js');

function afterEachDescribe(done) {
    if (amorphicContext.appContext.server) {
        amorphicContext.appContext.server.close();
    }
    // reset the session statsd client
    SupertypeSession.statsdClient = undefined;
    done();
}
function beforeEachDescribe(done, appName, createControllerFor, sourceMode, statsClient) {
    process.env.createControllerFor = createControllerFor;
    process.env.sourceMode = sourceMode || 'debug';
    amorphicContext.amorphicOptions.mainApp = appName; // we inject our main app name here

    // need to inject the amorphicStatic send to log because due to loading up both client and server in the same module resolution
    // we override our sendToLog with the the clients sometimes
    serverAmorphic.listen(__dirname + '/', undefined, undefined, undefined, sendToLog, statsClient);
    var modelRequiresPath = './apps/' + appName + '/public/js/model.js';
    var controllerRequiresPath = './apps/' + appName + '/public/js/controller.js';
    modelRequires = require(modelRequiresPath).model(RemoteObjectTemplate, function () {});
    controllerRequires = require(controllerRequiresPath).controller(RemoteObjectTemplate, function () {
        return modelRequires;
    });
    Controller = controllerRequires.Controller;
    window = modelRequires;
    window.addEventListener = function () {};
    window.Controller = controllerRequires.Controller;
    var isDone = false;

    var serverUrl = 'http://localhost:3001/amorphic/init/' + appName + '.js';

    request(serverUrl, function (error, response, body) {
        if (!error && response.statusCode == 200) {
            try {
                eval(body);

                amorphic.initializationData.url = 'http://localhost:3001' + amorphic.initializationData.url;
                amorphic.establishClientSession(
                    'Controller', __ver,
                    function (newController, sessionExpiration) {
                        if (clientController && typeof(clientController.shutdown) === 'function') {
                            clientController.shutdown();
                        }
                        clientController = newController;
                        if (typeof(clientController.clientInit) === 'function') {
                            clientController.clientInit(sessionExpiration);
                        }
                        if (!isDone) {
                            isDone = true;
                            done();
                        }
                    },
                    function (hadChanges) {
                    },

                    // When a new version is detected pop up "about to be refreshed" and
                    // then reload the document after 5 seconds.
                    function () {
                        clientController.amorphicStatus = 'reloading';
                    },

                    // If communication lost pop up dialog
                    function () {
                        controller.amorphicStatus = 'offline';
                    }
                );
            }
            catch (e) {
                done(e);
            }
        }

    });
}

describe('First Group of Tests', function () {
    this.timeout(1000000);
    before(function(done) {
        return beforeEachDescribe(done, 'test');
    });
    after(afterEachDescribe);

    it('clears the bank and saves everything', function (done) {
        serverAssert = function (count) {
            expect(count).to.equal(0);
            serverController.sam.roles[0].account.listTransactions();
            serverController.sam.roles[1].account.listTransactions();
            expect(serverController.sam.roles[0].account.getBalance() +
                serverController.sam.roles[1].account.getBalance()).to.equal(225);
            expect(serverController.preServerCallObjects['Controller']).to.equal(true);
        };
        clientController.clearDB().then(function () {
            done();
        }).catch(function(e) {
            done(e);
        });
    });

    it('fetch everything back', function (done) {
        serverAssert = function () {
            serverController.sam.roles[0].account.listTransactions();
            serverController.sam.roles[1].account.listTransactions();
            expect(serverController.sam.roles[0].account.getBalance() +
                serverController.sam.roles[1].account.getBalance()).to.equal(225);
            expect(serverController.preServerCallObjects['Controller']).to.equal(true);
        };
        clientController.mainFunc().then(function () {
            expect(serverController.sam.roles[0].account.getBalance() +
                serverController.sam.roles[1].account.getBalance()).to.equal(225);
            expect(serverController.preServerCallObjects['Controller']).to.equal(true);
            done();
        }).catch(function(e) {
            done(e);
        });
    });
    it('change results on server', function (done) {
        serverAssert = function () {
            serverController.sam.roles[0].account.transactions[0].amount += 1;
            serverController.version = serverController.sam.roles[0].account.__version__;
        };
        PostCallAssert = function () {
            expect(serverController.__template__.__objectTemplate__.currentTransaction.touchObjects[serverController.sam.roles[0].account.__id__])
                .to.equal(serverController.sam.roles[0].account);
        };
        clientController.mainFunc().then(function () {
            expect(serverController.sam.roles[0].account.getBalance() +
                serverController.sam.roles[1].account.getBalance()).to.equal(226);
            done();
        }).catch(function(e) {
            done(e);
        });
    });

    it('throw an execption', function (done) {
        serverAssert = function () {
            throw 'get stuffed';
        };
        PostCallAssert = function () {
        };
        clientController.mainFunc()
            .then(function () {
                expect('Should not be here').to.equal(false);
            }, function (e) {
                expect(e.message).to.equal('get stuffed');
                done();
            }).catch(function(e) {
            done(e);
        });
    });

    it("can get it's data freshened", function (done) {
        serverAssert = function () {
            expect(Number(serverController.sam.roles[0].account.__version__)).to.equal(Number(serverController.version) + 1);
            expect(serverController.sam.firstName).to.equal('Sammy');
        };
        var knex = serverController.__template__.objectTemplate.getDB('__default__').connection;
        Bluebird.resolve().then(function () {
            return knex('customer').where({'_id': serverController.sam._id}).update({'firstName': 'Sammy', '__version__': 100});
        }).then(function () {
            return clientController.mainFunc();
        }).then(function () {
            expect(clientController.sam.firstName).to.equal('Sammy');
            done();
        }).catch(function(e) {
            done(e);
        });
    });
    it('can retry an update conflict', function (done) {
        var retryCount = 0;
        this.timeout(4000);
        serverAssert = function () {
            serverController.sam.firstName = 'Sam';
            ++retryCount;
            return knex('customer').where({'_id': serverController.sam._id}).update({'__version__': 200, lastName: 'The Man'});
        };
        var knex = serverController.__template__.objectTemplate.getDB('__default__').connection;
        Bluebird.resolve().then(function () {
            return clientController.mainFunc();
        }).then(function () {
            expect(clientController.sam.firstName).to.equal('Sam');
            expect(clientController.sam.lastName).to.equal('The Man');
            expect(retryCount).to.equal(2);
            done();
        }).catch(function(e) {
            done(e);
        });
    });

    it('can do a resetSession', function (done) {
        clientController.conflictData = 'foo';
        Bluebird.resolve().then(function () {
            serverAssert = function () {
                expect(serverController.conflictData).to.equal('foo');
            };
            return clientController.mainFunc();
        }).then(function () {
            amorphic.resetSession();
            return clientController.mainFunc();
        }).then(function () {
            expect('Should not be here').to.equal(false);
        }, function (e) {
            serverAssert = function () {
                expect(serverController.conflictData).to.equal('initial');
            };
            return clientController.mainFunc();
        }).then(function () {
            expect(clientController.conflictData).to.equal('initial');
            done();
        }).catch(function(e) {
            done(e instanceof Error ? e : new Error(JSON.stringify(e)));
        });
    });

    it('can get a synchronization error', function (done) {
        serverAssert = function () {
            expect(serverController.conflictData).to.equal('foo');
        };
        clientController.conflictData = 'foo';
        Bluebird.resolve().then(function () {
            return clientController.mainFunc();
        }).then(function () {
            expect('Should not be here').to.equal(false);
        }, function (e) {
            expect(e.text).to.equal('An internal error occured');
            serverAssert = function () {
                expect(serverController.conflictData).to.equal('foo');
            };
            return clientController.mainFunc();  // Next call will fail too because it gets a sync
        }).then(function () {
            expect(clientController.conflictData).to.equal('foo');
            done();
        }).catch(function(e) {
            if (e.code == 'reset') {
                done();
            }
            else               {
                done(e instanceof Error ? e : new Error(JSON.stringify(e)));
            }
        });
        serverController.conflictData = 'bar';

    });
    it('change results on server', function (done) {
        var version;
        serverAssert = function () {
            serverController.sam.roles[0].account.transactions[0].amount += 1;
            serverController.version = serverController.sam.roles[0].account.__version__;
        };
        PostCallAssert = function () {
            expect(serverController.__template__.__objectTemplate__.currentTransaction.touchObjects[serverController.sam.roles[0].account.__id__])
                .to.equal(serverController.sam.roles[0].account);
        };
        clientController.mainFunc().then(function () {
            expect(serverController.sam.roles[0].account.getBalance() +
                serverController.sam.roles[1].account.getBalance()).to.equal(226);
            PostCallAssert = function () {};
            done();
        }).catch(function(e) {
            PostCallAssert = function () {};
            done(e);
        });
    });
});

describe('Second Group of Tests', function () {
    before(function(done) {
        return beforeEachDescribe(done, 'test');
    });
    after(afterEachDescribe);
    it ('clears the bank and saves everything', function (done) {
        serverAssert = function (count) {
            expect(count).to.equal(0);
            serverController.sam.roles[0].account.listTransactions();
            serverController.sam.roles[1].account.listTransactions();
            expect(serverController.sam.roles[0].account.getBalance() +
                serverController.sam.roles[1].account.getBalance()).to.equal(225);
            expect(serverController.preServerCallObjects['Controller']).to.equal(true);
        };
        clientController.clearDB().then(function () {
            done();
        }).catch(function(e) {
            done(e);
        });
    });

    it('Testing the request and response functionality passed into pre and post servercall', function(done) {
        clientController.emptyFunc().then(function () {
            expect(serverController.hasRequestInPreServer).to.equal(true);
            expect(serverController.hasResponseInPreServer).to.equal(true);
            expect(serverController.hasRequestInPostServer).to.equal(true);
            expect(serverController.hasResponseInPostServer).to.equal(true);
            expect(serverController.requestConstructorName).to.equal('IncomingMessage');
            expect(serverController.responseConstructorName).to.equal('ServerResponse');
            done();
        }).catch(function(err) {
            done(err);
        });
    });

    it('fetch everything back', function (done) {
        serverAssert = function () {
            serverController.sam.roles[0].account.listTransactions();
            serverController.sam.roles[1].account.listTransactions();
            expect(serverController.sam.roles[0].account.getBalance() +
                serverController.sam.roles[1].account.getBalance()).to.equal(225);
            expect(serverController.preServerCallObjects['Controller']).to.equal(true);
        };
        clientController.mainFunc().then(function () {
            expect(serverController.sam.roles[0].account.getBalance() +
                serverController.sam.roles[1].account.getBalance()).to.equal(225);
            expect(serverController.preServerCallObjects['Controller']).to.equal(true);
            done();
        }).catch(function(e) {
            done(e);
        });
    });
    it('change results on server', function (done) {
        var version;
        serverAssert = function () {
            serverController.sam.roles[0].account.transactions[0].amount += 1;
            serverController.version = serverController.sam.roles[0].account.__version__;
        };
        PostCallAssert = function () {
            expect(serverController.__template__.__objectTemplate__.currentTransaction.touchObjects[serverController.sam.roles[0].account.__id__])
                .to.equal(serverController.sam.roles[0].account);
        };
        clientController.mainFunc().then(function () {
            expect(serverController.sam.roles[0].account.getBalance() +
                serverController.sam.roles[1].account.getBalance()).to.equal(226);
            done();
        }).catch(function(e) {
            done(e);
        });
    });
    it('throw an execption', function (done) {
        serverAssert = function () {
            throw 'get stuffed';
        };
        PostCallAssert = function () {
        };
        clientController.mainFunc()
            .then(function () {
                expect('Should not be here').to.equal(false);
            }, function (e) {
                expect(e.message).to.equal('get stuffed');
                done();
            }).catch(function(e) {
            done(e);
        });
    });
    it('block calls', function (done) {
        this.timeout(6000);
        var startTime = new Date().getTime();
        serverAssert = function () {
            return Bluebird.delay(200).then(function () {
                console.log('completing call');
            });
        };
        PostCallAssert = function () {
        };
        clientController.mainFunc()
            .then(function () {
                // We are now back from the first call.  The second call should be waiting in semotus blocking delay
                // so we pull a fast one on semotus and replace it's send message handling so when the delay ends
                // and semotus tries to send back a sync: false messages to force the client to refresh we handle
                // it ourselves and end the test.  Note that for whaever reason the implementation of XMLHTTPRequest
                // used here doesn not handle overlapping calls properly.  It will send the second call but will
                // never see the response for the inner call.  For this reason the full reset sequence never happens.
                var ServerRemoteObjectTemplate = serverController.__template__.objectTemplate;
                var oldSendMessage = ServerRemoteObjectTemplate._getSession().sendMessage;
                ServerRemoteObjectTemplate._getSession().sendMessage =  function (message) {
                    oldSendMessage.call(ServerRemoteObjectTemplate, message);
                    expect(message.sync).to.equal(false);
                    expect((new Date()).getTime() > (startTime + 5000));
                    done();
                };
            }).catch(function(e) {
            done(e);
        });
        Bluebird.delay(100).then(function () {
            RemoteObjectTemplate._getSession().sendMessageEnabled = true; // Force duplicate message
            clientController.mainFunc()
                .then(function () {
                    expect('Should not be here').to.equal(false);
                }, function (e) {
                    expect('Should not be here').to.equal(false);
                }).catch(function(e) {
                done(e);
            });
        });
    });

    it("can get it's data freshened", function (done) {
        serverAssert = function () {
            expect(Number(serverController.sam.roles[0].account.__version__)).to.equal(Number(serverController.version) + 1);
            expect(serverController.sam.firstName).to.equal('Sammy');
        };
        var knex = serverController.__template__.objectTemplate.getDB('__default__').connection;
        Bluebird.resolve().then(function () {
            return knex('customer').where({'_id': serverController.sam._id}).update({'firstName': 'Sammy', '__version__': 100});
        }).then(function () {
            return clientController.mainFunc();
        }).then(function () {
            expect(clientController.sam.firstName).to.equal('Sammy');
            done();
        }).catch(function(e) {
            done(e);
        });
    });
    it('can retry an update conflict', function (done) {
        var retryCount = 0;
        this.timeout(4000);
        serverAssert = function () {
            serverController.sam.firstName = 'Sam';
            ++retryCount;
            return knex('customer').where({'_id': serverController.sam._id}).update({'__version__': 200, lastName: 'The Man'});
        };
        var knex = serverController.__template__.objectTemplate.getDB('__default__').connection;
        Bluebird.resolve().then(function () {
            return clientController.mainFunc();
        }).then(function () {
            expect(clientController.sam.firstName).to.equal('Sam');
            expect(clientController.sam.lastName).to.equal('The Man');
            expect(retryCount).to.equal(2);
            done();
        }).catch(function(e) {
            done(e);
        });
    });
    it('can do a resetSession', function () {
        clientController.conflictData = 'foo';
        return Bluebird.resolve().then(function () {
            serverAssert = function () {
                expect(serverController.conflictData).to.equal('foo');
            };
            return clientController.mainFunc();
        }).then(function () {
            amorphic.resetSession();
            serverAssert = function() {
                expect(serverController.conflictData).to.equal('initial');
            };
            return clientController.mainFunc().catch(function(e) {
                expect(e.code).to.equal('reset');
                expect(e.text).to.equal('Session resynchronized');
                expect(clientController.conflictData).to.equal('initial');
                return clientController.mainFunc();
            });
        }).then(function () {
            expect(clientController.conflictData).to.equal('initial');
        });
    });

    it('can get a synchronization error', function (done) {
        serverAssert = function () {
            expect(serverController.conflictData).to.equal('foo');
        };
        clientController.conflictData = 'foo';
        Bluebird.resolve().then(function () {
            return clientController.mainFunc();
        }).then(function () {
            expect('Should not be here').to.equal(false);
        }, function (e) {
            expect(e.text).to.equal('An internal error occured');
            serverAssert = function () {
                expect(serverController.conflictData).to.equal('foo');
            };
            return clientController.mainFunc();  // Next call will fail too because it gets a sync
        }).then(function () {
            expect(clientController.conflictData).to.equal('foo');
            done();
        }).catch(function(e) {
            if (e.code == 'reset') {
                done();
            }
            else {
                done(e instanceof Error ? e : new Error(JSON.stringify(e)));
            }
        });
        serverController.conflictData = 'bar';
    });
    it('change results on server', function (done) {
        var version;
        serverAssert = function () {
            serverController.sam.roles[0].account.transactions[0].amount += 1;
            serverController.version = serverController.sam.roles[0].account.__version__;
        };
        PostCallAssert = function () {
            expect(serverController.__template__.__objectTemplate__.currentTransaction.touchObjects[serverController.sam.roles[0].account.__id__])
                .to.equal(serverController.sam.roles[0].account);
        };
        clientController.mainFunc().then(function () {
            expect(serverController.sam.roles[0].account.getBalance() +
                serverController.sam.roles[1].account.getBalance()).to.equal(226);
            done();
        }).catch(function(e) {
            done(e);
        });
    });

    //Internal Routes (aka used by client.js)
    it('should ignore a non-sequenced post message', function() {
        return axios({
            method: 'post',
            url: 'http://localhost:3001/amorphic/xhr?path=test',
            data: {
                key:'value'
            },
            validateStatus: function (status) {
                return true;
            }
        }).then(function(res) {
            expect(res.status).to.equal(500);
            expect(res.data).to.equal('Invalid or no sequence number detected. Ignoring message - will not process this message');
        });
    });

    it('should establish a session for a request with a sequence number in the payload', function () {
        return axios({
            method: 'post',
            url: 'http://localhost:3001/amorphic/xhr?path=test',
            data: {
                sequence: 1
            },
            validateStatus: function (status) {
                return true;
            }
        }).then(function (res) {
            expect(res.status).to.equal(200);
            expect(res.data.changes).to.equal('{"server-Controller-1":{"conflictData":[null,"initial"],"someData":[null,"A"],"sam":[null,null],"karen":[null,null],"ashling":[null,null],"updatedCount":[null,0]}}');
        });
    });

    it('should throw an error if you are making a request to a non registered app', function() {
        return axios({
            method: 'post',
            url: 'http://localhost:3001/amorphic/xhr?path=error',
            data: {
                sequence: 1
            },
            validateStatus: function (status) {
                return true;
            }
        }).then(function(res) {
            //TODO: Add a test later for the specific res.data message being sent back unfortunately that is currently a server stack trace
            expect(res.status).to.equal(500);
            expect(res.statusText).to.equal('Internal Server Error');
        });
    });

    it('should not be able to process a post from xhr request if no processPost function is defined', function() {
        return axios({
            method: 'post',
            url: 'http://localhost:3001/amorphic/xhr?path=test&form=true',
            data: {
                sequence: 1,
                loggingContext: {
                    requestID: 1000
                }
            },
            validateStatus: function (status) {
                return true;
            }
        }).then(function (res) {
            console.log(res.req);
            expect(res.status).to.equal(500);
            expect(res.data).to.equal('Internal Error');
        });
    });
});

describe('third group of tests', function() {
    before(function(done) {
        return beforeEachDescribe(done, 'test', 'yes');
    });
    after(afterEachDescribe);

    it('should handle a post request without a processPost function', function() {
        return axios({
            method: 'post',
            url: 'http://localhost:3001/amorphic/init/test.js'
        }).then(function(res) {
            expect(res.status).to.equal(200);
            expect(res.data).to.equal('document.write("<script src=\'/test/js/model.js?ver=0\'></script>");\n\ndocument.write("<script src=\'/config/js/mail.js?ver=0\'></script>");\n\ndocument.write("<script src=\'/common/js/anotherMail.js?ver=0\'></script>");\n\ndocument.write("<script src=\'/test/js/controller.js?ver=0\'></script>");\n\namorphic.setApplication(\'test\');amorphic.setSchema({"Customer":{"referredBy":1,"referrers":1,"addresses":1,"roles":1},"Address":{"customer":1,"returnedMail":1,"account":1},"ReturnedMail":{"address":1},"Role":{"customer":1,"account":1},"Account":{"roles":1,"address":1,"transactions":1,"fromAccountTransactions":1},"Transaction":{"account":1,"fromAccount":1}});amorphic.setConfig({"modules":{}});amorphic.setInitialMessage({"url":"/amorphic/xhr?path=test","message":{"type":"sync","sync":true,"value":null,"name":null,"remoteCallId":null,"changes":"{\\"server-Controller-1\\":{\\"conflictData\\":[null,\\"initial\\"],\\"someData\\":[null,\\"A\\"],\\"sam\\":[null,null],\\"karen\\":[null,null],\\"ashling\\":[null,null],\\"updatedCount\\":[null,0]}}","newSession":true,"rootId":"server-Controller-1","startingSequence":100001,"sessionExpiration":3600000,"ver":"0"}});');
        });
    });

    // WORK IN PROGRESS
    it('should handle a post request with a processPost function', function() {
        return axios({
            method: 'post',
            url: 'http://localhost:3001/amorphic/init/config.js',
            data: {
                test: 'hellooo'
            }
        }).then(function(res) {
            expect(res.status).to.equal(200);
            expect(res.data).to.equal('hellooo');
        });
    });

    it('should process a POST from xhr request when a processPost function is defined', function() {
        return axios({
            method: 'post',
            url: 'http://localhost:3001/amorphic/xhr?path=config&form=true',
            data: {
                test: 'hellooooo'
            },
            validateStatus: function (status) {
                return true;
            }
        }).then(function(res) {
            expect(res.status).to.equal(200);
            expect(res.data).to.equal('hellooooo');
        });
    });

    it('should be able to read cookies that I set on the front end', function() {
        return axios({
            method: 'post',
            url: 'http://localhost:3001/amorphic/init/config.js',
            data: {
                test: 'hellooo',
                testCookie: true
            },
            headers: {
                Cookie: "cookie1=Cookie1; cookie2=Cookie2; cookie3=Cookie3;"
            }
        }).then(function(res) {
            expect(res.status).to.equal(200);
            expect(res.data).to.not.equal(false);
            expect(res.data.cookie1).to.equal('Cookie1');
            expect(res.data.cookie2).to.equal('Cookie2');
            expect(res.data.cookie3).to.equal('Cookie3');
        });
    });

    it('should be able to mutate cookies on the back end', function() {
        return axios({
            method: 'get',
            url: 'http://localhost:3001/amorphic/xhr?path=test&file=test.txt'
        }).then(function(res) {
            expect(res.headers['set-cookie'][0]).to.deep.equal('iamthecookiemonster=megacookie; Path=/');
        });
    });

});

describe('processLoggingMessage', function() {
    before(function(done) {
        return beforeEachDescribe(done, 'test', 'no');
    });

    beforeEach(function() {
        sinon.spy(amorphic, '_post');
    });

    after(afterEachDescribe);

    afterEach(function() {
        amorphic._post.restore();
    });

    it('should post a message to the server of type "logging"', function() {
        amorphic.sendLoggingMessage('warn', { foo: 'bar' });

        var url = 'http://localhost:3001/amorphic/xhr?path=test';
        var payload = {
            type: 'logging',
            loggingLevel: 'warn',
            loggingContext: {},
            loggingData: { foo: 'bar' }
        };

        expect(amorphic._post.calledOnce).to.be.true;
        expect(amorphic._post.calledWith(url, sinon.match(payload))).to.be.true;
    });
});

describe('source mode prod testing', function () {

    describe('createControllerFor no', function () {
        before(function(done) {
            return beforeEachDescribe(done, 'config', 'no', 'prod');
        });
        after(afterEachDescribe);

        it('should go thru some random path', function () {
            return axios({
                method: 'get',
                url: 'http://localhost:3001/amorphic/init/config.js'
            }).then(function(res) {
                expect(res.status).to.equal(200);
                expect(res.data).to.equal('document.write("<script src=\'/amorphic/init/config.cached.js\'></script>");\namorphic.setApplication(\'config\');amorphic.setSchema({"Customer":{"referredBy":1,"referrers":1,"addresses":1,"roles":1},"Address":{"customer":1,"returnedMail":1,"account":1},"ReturnedMail":{"address":1},"Role":{"customer":1,"account":1},"Account":{"roles":1,"address":1,"transactions":1,"fromAccountTransactions":1},"Transaction":{"account":1,"fromAccount":1}});amorphic.setConfig({"modules":{}});amorphic.setInitialMessage({"url":"/amorphic/xhr?path=config","message":{"ver":"0","startingSequence":0,"sessionExpiration":3600000}});');
            });
        });
    });

    describe('createControllerFor yes', function() {
        before(function(done) {
            return beforeEachDescribe(done, 'config', 'yes', 'prod');
        });
        after(afterEachDescribe);

        it('should write to the document the cached.js file', function () {
            return axios({
                method: 'post',
                url: 'http://localhost:3001/amorphic/init/test.js'
            }).then(function (res) {
                expect(res.status).to.equal(200);
                expect(res.data).to.equal('document.write("<script src=\'/amorphic/init/test.cached.js\'></script>");\namorphic.setApplication(\'test\');amorphic.setSchema({"Customer":{"referredBy":1,"referrers":1,"addresses":1,"roles":1},"Address":{"customer":1,"returnedMail":1,"account":1},"ReturnedMail":{"address":1},"Role":{"customer":1,"account":1},"Account":{"roles":1,"address":1,"transactions":1,"fromAccountTransactions":1},"Transaction":{"account":1,"fromAccount":1}});amorphic.setConfig({"modules":{}});amorphic.setInitialMessage({"url":"/amorphic/xhr?path=test","message":{"type":"sync","sync":true,"value":null,"name":null,"remoteCallId":null,"changes":"{\\"server-Controller-1\\":{\\"conflictData\\":[null,\\"initial\\"],\\"someData\\":[null,\\"A\\"],\\"sam\\":[null,null],\\"karen\\":[null,null],\\"ashling\\":[null,null],\\"updatedCount\\":[null,0]}}","newSession":true,"rootId":"server-Controller-1","startingSequence":100001,"sessionExpiration":3600000,"ver":"0"}});');
            });
        });
        it('should retrieve the cached.js file', function () {
            return axios({
                method: 'get',
                url: 'http://localhost:3001/amorphic/init/test.cached.js',
                validateStatus: function (status) {
                    return true;
                }
            }).then(function (res) {
                expect(res.status).to.equal(200);
                expect(res.data).to.equal('module.exports.model=function(objectTemplate){var Customer=objectTemplate.create("Customer",{init:function(first,middle,last){this.firstName=first,this.lastName=last,this.middleName=middle},email:{type:String,value:"",length:50,rule:["text","email","required"]},firstName:{type:String,value:"",length:40,rule:["name","required"]},middleName:{type:String,value:"",length:40,rule:"name"},lastName:{type:String,value:"",length:40,rule:["name","required"]},local1:{type:String,persist:!1,value:"local1"},local2:{type:String,isLocal:!0,value:"local2"}}),Address=objectTemplate.create("Address",{init:function(customer){this.customer=customer},lines:{type:Array,of:String,value:[],max:3},city:{type:String,value:"",length:20},state:{type:String,value:"",length:20},postalCode:{type:String,value:"",length:20},country:{type:String,value:"US",length:3}});Customer.mixin({referredBy:{type:Customer,fetch:!0},referrers:{type:Array,of:Customer,value:[],fetch:!0},addAddress:function(lines,city,state,zip){var address=new Address(this);address.lines=lines,address.city=city,address.state=state,address.postalCode=zip,address.customer=this,this.addresses.push(address)},addresses:{type:Array,of:Address,value:[],fetch:!0}});var ReturnedMail=objectTemplate.create("ReturnedMail",{date:{type:Date},address:{type:Address},init:function(address,date){this.address=address,this.date=date}});Address.mixin({customer:{type:Customer},returnedMail:{type:Array,of:ReturnedMail,value:[]},addReturnedMail:function(date){this.returnedMail.push(new ReturnedMail(this,date))}});var Role=objectTemplate.create("Role",{init:function(customer,account,relationship){this.customer=customer,this.account=account,relationship&&(this.relationship=relationship)},relationship:{type:String,value:"primary"},customer:{type:Customer}}),Account=objectTemplate.create("Account",{init:function(number,title,customer,address){address&&(this.address=address,this.address.account=this),this.number=number,this.title=title,customer&&this.addCustomer(customer)},addCustomer:function(customer,relationship){var role=new Role(customer,this,relationship);this.roles.push(role),customer.roles.push(role)},number:{type:Number},title:{type:Array,of:String,max:4},roles:{type:Array,of:Role,value:[],fetch:!0},address:{type:Address},debit:function(amount){new Transaction(this,"debit",amount)},credit:function(amount){new Transaction(this,"credit",amount)},transferFrom:function(amount,fromAccount){new Transaction(this,"xfer",amount,fromAccount)},transferTo:function(amount,toAccount){new Transaction(toAccount,"xfer",amount,this)},listTransactions:function(){function processTransactions(transactions){transactions.forEach(function(transaction){str+=transaction.type+" "+transaction.amount+" "+(transaction.type.xfer?transaction.fromAccount.__id__:"")+" "})}var str="";processTransactions(this.transactions),processTransactions(this.fromAccountTransactions),console.log(str)},getBalance:function(){function processTransactions(transactions){for(var ix=0;ix<transactions.length;++ix)switch(transactions[ix].type){case"debit":balance-=transactions[ix].amount;break;case"credit":balance+=transactions[ix].amount;break;case"xfer":balance+=transactions[ix].amount*(transactions[ix].fromAccount===thisAccount?-1:1)}}var balance=0,thisAccount=this;return processTransactions(this.transactions),processTransactions(this.fromAccountTransactions),balance}});Address.mixin({account:{type:Account}});var Transaction=objectTemplate.create("Transaction",{init:function(account,type,amount,fromAccount){this.account=account,this.fromAccount=fromAccount,this.type=type,this.amount=amount,account&&account.transactions.push(this),fromAccount&&fromAccount.fromAccountTransactions.push(this)},amount:{type:Number},type:{type:String},account:{type:Account,fetch:!0},fromAccount:{type:Account,fetch:!0}});return Customer.mixin({roles:{type:Array,of:Role,value:[]}}),Role.mixin({account:{type:Account}}),Account.mixin({transactions:{type:Array,of:Transaction,value:[],fetch:!0},fromAccountTransactions:{type:Array,of:Transaction,value:[],fetch:!0}}),{Customer:Customer,Address:Address,ReturnedMail:ReturnedMail,Role:Role,Account:Account,Transaction:Transaction}},module.exports.mail=function(objectTemplate,getTemplate){var Mail=objectTemplate.create("Mail",{init:function(){}});return Mail},module.exports.anotherMail=function(objectTemplate,getTemplate){var AnotherMail=objectTemplate.create("AnotherMail",{init:function(){}});return AnotherMail},module.exports.controller=function(objectTemplate,getTemplate){objectTemplate.debugInfo="io;api";var Customer=getTemplate("model.js").Customer,Account=getTemplate("model.js").Account,Address=getTemplate("model.js").Address,ReturnedMail=getTemplate("model.js").ReturnedMail,Role=getTemplate("model.js").Role,Transaction=getTemplate("model.js").Transaction;getTemplate("mail.js",{app:"config"}),getTemplate("anotherMail.js");var Controller=objectTemplate.create("Controller",{mainFunc:{on:"server",body:function(){}},emptyFunc:{on:"server",body:function(){}},onContentRequest:{on:"server",body:function(req,res){}},conflictData:{type:String,value:"initial"},someData:{type:String,value:"A"},sam:{type:Customer,fetch:!0},karen:{type:Customer,fetch:!0},ashling:{type:Customer,fetch:!0},updatedCount:{type:Number,value:0},serverInit:function(){if(!objectTemplate.objectMap)throw new Error("Missing keepOriginalIdForSavedObjects in config.json");serverController=this},clearDB:{on:"server",body:function(){}},clientInit:function(){clientController=this;var sam=new Customer("Sam","M","Elsamman"),karen=new Customer("Karen","M","Burke"),ashling=new Customer("Ashling","","Burke");sam.referrers=[ashling,karen],ashling.referredBy=sam,karen.referredBy=sam,sam.local1="foo",sam.local2="bar",sam.addAddress(["500 East 83d","Apt 1E"],"New York","NY","10028"),sam.addAddress(["38 Haggerty Hill Rd",""],"Rhinebeck","NY","12572"),sam.addresses[0].addReturnedMail(new Date),sam.addresses[0].addReturnedMail(new Date),sam.addresses[1].addReturnedMail(new Date),karen.addAddress(["500 East 83d","Apt 1E"],"New York","NY","10028"),karen.addAddress(["38 Haggerty Hill Rd",""],"Rhinebeck","NY","12572"),karen.addresses[0].addReturnedMail(new Date),ashling.addAddress(["End of the Road",""],"Lexington","KY","34421");var samsAccount=new Account(1234,["Sam Elsamman"],sam,sam.addresses[0]),jointAccount=new Account(123,["Sam Elsamman","Karen Burke","Ashling Burke"],sam,karen.addresses[0]);jointAccount.addCustomer(karen,"joint"),jointAccount.addCustomer(ashling,"joint"),samsAccount.credit(100),samsAccount.debit(50),jointAccount.credit(200),jointAccount.transferTo(100,samsAccount),jointAccount.transferFrom(50,samsAccount),jointAccount.debit(25),this.sam=sam,this.karen=karen,this.ashling=ashling},preServerCall:function(changeCount,objectsChanged,callContext,forceUpdate,functionName,remoteCall,isPublic,HTTPObjs){for(var templateName in objectsChanged)this.preServerCallObjects[templateName]=!0;return HTTPObjs&&HTTPObjs.request&&HTTPObjs.response&&(this.hasRequestInPreServer=this.hasResponseInPreServer=!0),Bluebird.resolve().then(!this.sam||this.sam.refresh.bind(this.sam,null)).then(!this.karen||this.karen.refresh.bind(this.karen,null)).then(!this.ashling||this.ashling.refresh.bind(this.ashling,null)).then(function(){objectTemplate.begin(),console.log(this.sam?this.sam.__version__:""),objectTemplate.currentTransaction.touchTop=!0}.bind(this))},postServerCall:function(hasChanges,callContext,changeString,HTTPObjs){if(this.postServerCallThrowException)throw"postServerCallThrowException";if(this.postServerCallThrowRetryException)throw"Retry";if(HTTPObjs&&HTTPObjs.request&&HTTPObjs.response){var request=HTTPObjs.request,response=HTTPObjs.response;this.requestConstructorName=request.constructor.name,this.responseConstructorName=response.constructor.name,this.hasRequestInPostServer=this.hasResponseInPostServer=!0}return serverController.sam.cascadeSave(),serverController.karen.cascadeSave(),serverController.ashling.cascadeSave(),objectTemplate.currentTransaction.postSave=function(txn){this.updatedCount=_.toArray(txn.savedObjects).length}.bind(this),objectTemplate.end().then(function(){PostCallAssert()})},validateServerCall:function(){return this.canValidateServerCall},preServerCallObjects:{isLocal:!0,type:Object,value:{}},preServerCalls:{isLocal:!0,type:Number,value:0},postServerCalls:{isLocal:!0,type:Number,value:0},preServerCallThrowException:{isLocal:!0,type:Boolean,value:!1},postServerCallThrowException:{isLocal:!0,type:Boolean,value:!1},postServerCallThrowRetryException:{isLocal:!0,type:Boolean,value:!1},serverCallThrowException:{isLocal:!0,type:Boolean,value:!1},canValidateServerCall:{isLocal:!0,type:Boolean,value:!0}});return{Controller:Controller}};');
            });
        });

        it('should retrieve the cached.js.map file', function () {
            return axios({
                method: 'get',
                url: 'http://localhost:3001/amorphic/init/test.cached.js.map',
                validateStatus: function (status) {
                    return true;
                }
            }).then(function (res) {
                expect(res.status).to.equal(200);
                expect(res.data.version).to.equal(3);
                expect(typeof res.data.mappings).to.equal('string');
            });
        });
    });
});

describe('error handling upload api', function() {
    before(function(done) {
        return beforeEachDescribe(done, 'test', 'yes', 'prod');
    });

    after(afterEachDescribe);


    it('should handle trying to upload no filename', function () {
        return axios({
            method: 'post',
            url: 'http://localhost:3001/amorphic/xhr?path=test&file=',

            validateStatus: function (status) {
                return true;
            }
        }).then(function(res) {
            expect(res.status).to.equal(400);
            expect(res.data).to.equal('Invalid request parameters');
        });
    });

    it('should handle trying to upload a file with garbage payload', function() {
        return axios({
            method: 'post',
            url: 'http://localhost:3001/amorphic/xhr?path=test&file=notARealFile',
            data: '{hello my name is shanks! }',
            validateStatus: function (status) {
                return true;
            }
        }).then(function(res) {
            expect(res.status).to.equal(400);
            expect(res.data).to.equal('Invalid request parameters');
        });
    });
});

describe('statsd module enabled', function () {

    const statsModule = {
        timing: 'timing stub'
    };

    before(function (done) {
        return beforeEachDescribe(done, 'test', 'yes', 'prod', statsModule);
    });

    after(afterEachDescribe);

    it('should be able to consume a module and put it on amorphic static (supertype session)', () => {
        const statsdClient = SupertypeSession.amorphicStatic.statsdClient;
        expect(statsdClient.timing).to.equal('timing stub');
    });
});

describe('amorphic api enabled', function () {

    before(function (done) {
        return beforeEachDescribe(done, 'test', 'yes', 'prod');
    });

    after(afterEachDescribe);

    it('should get an 200 response from a custom GET endpoint', function () {
        return axios.get('http://localhost:3001/api/test')
            .then(function (response) {
                assert.isOk(response, 'The response is ok');
                assert.strictEqual(response.status, 200, 'The response code was 200');
                assert.strictEqual(response.data, 'test API endpoint OK');
            });
    });

    it('should get a response from a second custom endpoint', function () {
        return axios.get('http://localhost:3001/api/test-other-endpoint')
            .then(function (response) {
                assert.isOk(response, 'The response is ok');
                assert.strictEqual(response.status, 200, 'The response code was 200');
                assert.strictEqual(response.data, 'test API endpoint OK');
            });
    });

    it('should use middleware limits to reject a POST request that\'s too large', function () {
        return axios.post('http://localhost:3001/api/middleware-endpoint', {
            firstName: 'Fred',
            lastName: 'Flintstone'
        })
            .catch(function (response) {
                assert.strictEqual(response.response.status, 413, 'The response code was 413');
            });
    });

    it('should post to the endpoint successfully', function () {
        return axios.post('http://localhost:3001/api/middleware-endpoint', {})
            .then(function (response) {
                assert.strictEqual(response.status, 200, 'The response code was 200');
            });
    });

});