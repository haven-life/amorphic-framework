/*
 * Banking example shows PersistObjectTemplate with
 * many-to-many relationships
 *
 */

declare function require(name: string);

// RemoteObjectTemplate will be used for server template creation
var RemoteObjectTemplate = require('../../dist/index.js');

var delay = require('../../dist/helpers/Utilities.js').delay;

RemoteObjectTemplate.role = 'server';
RemoteObjectTemplate._useGettersSetters = true;
RemoteObjectTemplate.maxCallTime = 60 * 1000;
RemoteObjectTemplate.__conflictMode__ = 'soft';

var ClientObjectTemplate = RemoteObjectTemplate._createObject();
ClientObjectTemplate.role = 'client';
ClientObjectTemplate._useGettersSetters = false;
ClientObjectTemplate.__conflictMode__ = 'soft';

var ServerObjectTemplate = RemoteObjectTemplate._createObject();
ServerObjectTemplate.role = 'server';
ServerObjectTemplate._useGettersSetters = true;
ServerObjectTemplate.maxCallTime = 60 * 1000;
ServerObjectTemplate.__conflictMode__ = 'soft';
ServerObjectTemplate.memSession = { semotus: {} };
ServerObjectTemplate.__dictionary__ = RemoteObjectTemplate.__dictionary__;

import {expect} from 'chai';
import { mockRequest, mockResponse } from 'mock-req-res';

let serverMockReq, serverMockRes, clientMockReq, clientMockRes;

function sendToServer(message) {
	serverMockReq = mockRequest();
	serverMockRes = mockResponse();
	ServerObjectTemplate.processMessage(message, undefined, undefined, serverMockReq, serverMockRes);
}

function sendToClient(message) {
	clientMockReq = mockRequest();
	clientMockRes = mockResponse();
	ClientObjectTemplate.processMessage(message, undefined, undefined, clientMockReq, clientMockRes);
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
ServerObjectTemplate.reqSession = { loggingID: 'test', semotus: {} };
ServerObjectTemplate.logLevel = 1;
ServerObjectTemplate.logger.setLevel('info;activity:dataLogging');

describe('Typescript Banking Example', function () {
	it('can log in a closed loop', function () {
		var date = new Date('2010-11-11T05:00:00.000Z');
		var output = '';

		var sam = clientController.sam;
		var oldSendToLog = sam.amorphic.logger;

		sam.amorphic.logger.sendToLog = function sendToLog(level, obj) {
			var str = sam.amorphic.logger.prettyPrint(level, obj).replace(/.*: /, '');
			output += str.replace(/[\r\n ]/g, '');
		};

		sam.amorphic.logger.startContext({name: 'supertype'});
		sam.amorphic.logger.warn({foo: 'bar1'}, 'Yippie');
		var context = sam.amorphic.logger.setContextProps({ permFoo: 'permBar1' });
		sam.amorphic.logger.warn({ foo: 'bar2' });
		sam.amorphic.logger.clearContextProps(context);
		sam.amorphic.logger.warn({ foo: 'bar3' });
		var child = sam.amorphic.logger.createChildLogger({ name: 'supertype_child' });
		child.setContextProps({ permFoo: 'childFoo' });
		child.warn({ foo: 'bar4' });
		sam.amorphic.logger.warn({ foo: 'bar5' });
		sam.amorphic.logger.startContext({ name: 'supertype2' });
		sam.amorphic.logger.warn({ foo: 'bar6', woopie: { yea: true, oh: date } }, 'hot dog');
		sam.amorphic.logger.setLevel('error');
		console.log('setting level to error');
		sam.amorphic.logger.warn({ foo: 'bar6', woopie: { yea: true, oh: date } }, 'hot dog');
		sam.amorphic.logger.setLevel('error;foo:bar6');
		sam.amorphic.logger.warn({ foo: 'bar6', woopie: { yea: true, oh: date } }, 'hot dog');
		sam.amorphic.logger.setLevel('error;foo:bar7');
		sam.amorphic.logger.warn({ foo: 'bar6', woopie: { yea: true, oh: date } }, 'hot dog');

		console.log(output);
		var result =
			'(__amorphicContext={"name":"supertype"}foo="bar1")(__amorphicContext={"name":"supertype","permFoo":"permBar1"}permFoo="permBar1"foo="bar2")(__amorphicContext={"name":"supertype"}foo="bar3")(__amorphicContext={"name":"supertype","permFoo":"childFoo"}permFoo="childFoo"foo="bar4")(__amorphicContext={"name":"supertype"}foo="bar5")(__amorphicContext={"name":"supertype2"}foo="bar6"woopie={"yea":true,"oh":"2010-11-11T05:00:00.000Z"})(__amorphicContext={"name":"supertype2"}foo="bar6"woopie={"yea":true,"oh":"2010-11-11T05:00:00.000Z"})';

		expect(output).to.equal(result);
		sam.amorphic.logger = oldSendToLog;
	});

	it('pass object graph to server and return', function (done) {
		RemoteObjectTemplate.serverAssert = function () {
			expect(serverController.sam.roles[0].account.getBalance()).to.equal(100);
			expect(serverController.sam.roles[1].account.getBalance()).to.equal(125);
			expect(serverController.preServerCallObjects['Controller']).to.equal(true);
			serverController.sam.amorphic.logger.warn({}, 'kicking the bucket');
		};
		expect(clientController.sam.roles[0].account.getBalance()).to.equal(100);
		expect(clientController.sam.roles[1].account.getBalance()).to.equal(125);
		clientController
			.mainFunc()
			.then(function () {
				expect(clientController.sam.roles[0].account.getBalance()).to.equal(100);
				expect(clientController.sam.roles[1].account.getBalance()).to.equal(125);
				done();
			})
            .catch(function (e) {
				done(e);
			});
		console.log('foo');
	});
	it('change results on server by poking an amount', function (done) {
		RemoteObjectTemplate.serverAssert = function () {
			expect(serverController.sam.roles[0].account.transactions[0].__changed__).to.equal(true);
			serverController.sam.roles[0].account.transactions[0].__changed__ = false;
			serverController.sam.roles[0].account.transactions[0].amount = 200;
			expect(serverController.sam.roles[0].account.transactions[0].__changed__).to.equal(true);
		};
		clientController
			.mainFunc()
			.then(function () {
				expect(clientController.sam.roles[0].account.getBalance()).to.equal(200);
				done();
			})
            .catch(function (e) {
				done(e);
			});
	});
	it('change results on server by adding a transaction', function (done) {
		RemoteObjectTemplate.serverAssert = function () {
			serverController.sam.roles[0].account.credit(100);
		};
		clientController
			.mainFunc()
			.then(function () {
				expect(serverController.sam.roles[0].account.getBalance()).to.equal(300);
				done();
			})
            .catch(function (e) {
				done(e);
			});
	});
	it('change results on server by adding an account', function (done) {
		RemoteObjectTemplate.serverAssert = function () {
			serverController.giveSamASecondAccount();
			serverController.sam.roles[0].account.credit(100);
		};
		clientController
			.mainFunc()
			.then(function () {
				expect(serverController.sam.roles[0].account.getBalance()).to.equal(400);
				expect(serverController.sam.roles[2].account.address.lines[0]).to.equal('Plantana');
				done();
			})
            .catch(function (e) {
				done(e);
			});
	});
	it('throw an execption', function (done) {
		RemoteObjectTemplate.serverAssert = function () {
			throw 'get stuffed';
		};
		clientController
			.mainFunc()
			.then(
				function () {
					expect('Should not be here').to.equal(false);
				},
				function (e) {
					expect(e.message).to.equal('get stuffed');
					done();
				}
			)
            .catch(function (e) {
				done(e);
			});
	});
	it('can get a synchronization error', function (done) {
		RemoteObjectTemplate.serverAssert = function () {
			throw 'get stuffed';
		};
		clientController
			.mainFunc()
			.then(
				function () {
					expect('Should not be here').to.equal(false);
				},
				function (e) {
					expect(e.message).to.equal('get stuffed');
					done();
				}
			)
            .catch(function (e) {
				done(e);
			});
	});
	it('can get a synchronization error from overlapping calls', function (done) {
		this.timeout(7000);
		RemoteObjectTemplate.serverAssert = function () {
			return delay(1000);
		};
		clientController.mainFunc().then(function () {
			expect('Should not be here').to.equal(false);
		});
		clientController
			.mainFunc()
			.then(
				function () {
					expect('Should not be here').to.equal(false);
				},
				function (e) {
					console.log(e);
					delay(1000).then(function () {
						done();
					});
				}
			)
            .catch(function (e) {
				done(e);
			});
	});
	it('change tracking to work with arrays', function (done) {
		RemoteObjectTemplate.serverAssert = function () {
			expect(serverController.sam.roles[0].account.__changed__).to.equal(true);
			serverController.sam.roles[0].account.__changed__ = false;
			serverController.sam.roles[0].account.debit(50);
			expect(serverController.sam.roles[0].account.__changed__).to.equal(false);
			ServerObjectTemplate.MarkChangedArrayReferences();
			expect(serverController.sam.roles[0].account.__changed__).to.equal(true);
		};
		var balance = clientController.sam.roles[0].account.getBalance();
		serverController.sam.roles[0].account.__changed__ = false;
		clientController.sam.roles[0].account.debit(50);
		clientController
			.mainFunc()
			.then(function () {
				expect(serverController.sam.roles[0].account.getBalance()).to.equal(balance - 100);
				done();
			})
            .catch(function (e) {
				done(e);
			});
	});
	it('check onclient rules', function (done) {
		RemoteObjectTemplate.serverAssert = function () {
			serverController.setAllClientRuleCheckFalgsonServer();
		};
		clientController
			.mainFunc()
			.then(function () {
				expect(clientController.onClientFalse).to.equal(false);
				expect(clientController.onClientTrue).to.equal(true);
				expect(clientController.onClientNotRightApp).to.equal(false);
				expect(clientController.onClientWithApp).to.equal(true);
				done();
			})
            .catch(function (e) {
				done(e);
			});
	});
	it('check onserver rules', function (done) {
		clientController.setAllServerRuleCheckFalgsonClient();

		RemoteObjectTemplate.serverAssert = function () {
			expect(serverController.onServerFalse).to.equal(false);
			expect(serverController.onServerTrue).to.equal(true);
			expect(serverController.onServerNotRightApp).to.equal(false);
			expect(serverController.onServerWithApp).to.equal(true);
			done();
		};

		clientController.mainFunc();
	});
	it('check serverValidationRules to succeed', function (done) {
		clientController.setAllServerRuleCheckFalgsonClient();

		RemoteObjectTemplate.serverAssert = function () {
			expect(serverController.serverValidatorCounter).to.equal(3);
			expect(serverController.argumentValidator).to.equal(true);
			done();
		};

		clientController.testServerValidation('first', 'second', 'third');
	});
	it('check serverValidationRules to fail', function (done) {
		clientController.setAllServerRuleCheckFalgsonClient();

		RemoteObjectTemplate.serverAssert = function () {
			expect(serverController.serverValidatorCounter).to.equal(0);
			expect(serverController.argumentValidator).to.equal(false);
			done();
		};

		clientController
			.testServerValidation('first', 'second')
			.then(
				function () {
					expect('Should not be here').to.equal(false);
				},
				function (e) {
					expect(e.text).to.equal('An internal error occurred');
					done();
				}
			)
            .catch(function (e) {
				done(e);
			});
	});
	it('Test if public: true remote flag works as intended in preservercall', function (done) {
		clientController.setAllServerRuleCheckFalgsonClient();
		serverController.remotePublic = false;
		clientController.testPublicTrue().then(() => {
			expect(serverController.remotePublic).to.equal(true);
			done()
		}).catch((err) => {
			done(err);
		})
	});
	it('Test if public: false remote flag works as intended in preservercall', function (done) {
		clientController.setAllServerRuleCheckFalgsonClient();
		serverController.remotePublic = false;
		clientController.testPublicFalse().then(() => {
			expect(serverController.remotePublic).to.equal(false);
			done()
		}).catch((err) => {
			done(err);
		})
	});
	it('Test if public: undefined remote flag works as intended in preservercall', function (done) {
		clientController.setAllServerRuleCheckFalgsonClient();
		serverController.remotePublic = false;
		clientController.testNoPublic().then(() => {
			expect(serverController.remotePublic).to.equal(false);
			done();
		}).catch((err) => {
			done(err);
		})
	});
	it('Test if preServerCall and postServerCall has appropriate (dummy) request and (dummy) response objects', function (done) {
		clientController.setAllServerRuleCheckFalgsonClient();
		serverController.remotePublic = false;
		serverController.hasRequestInPreServer = serverController.hasResponseInPreServer = false;
		serverController.hasRequestInPostServer = serverController.hasResponseInPostServer = false;

		clientController.testNoPublic().then(() => {
			expect(serverController.hasRequestInPreServer).to.equal(true);
			expect(serverController.hasResponseInPreServer).to.equal(true);
			expect(serverController.hasRequestInPostServer).to.equal(true);
			expect(serverController.hasResponseInPostServer).to.equal(true);
			expect(serverMockReq.cookies['preServerCookie']).to.equal(true);
			expect(serverMockReq.cookies['postServerCookie']).to.equal(true);
			expect(serverMockRes.cookie.calledTwice).to.equal(true);
			done();
		}).catch((err) => {
			done(err);
		})
	});
	it('Post server error handling works asynchronously', function (done) {
		clientController.setAllServerRuleCheckFalgsonClient();

		RemoteObjectTemplate.serverAssert = function () {
			expect(serverController.asyncErrorHandlerCalled).to.equal(true);
			done();
		};

		clientController
			.testAsyncPostServerError()
			.then(
				function () {
					expect('Should not be here').to.equal(false);
				},
				function (e) {
					expect(e.text).to.equal('An internal error occurred');
					done();
				}
			)
            .catch(function (e) {
				done(e);
			});
	});
	it('Post server error handling can throw a new error', function (done) {

		// For this test, you need to verify if the logs are correct, it should say
		// 'User defined - postServerErrorHandler threw an error', and then the error message
		clientController.setAllServerRuleCheckFalgsonClient();

		RemoteObjectTemplate.serverAssert = function () {
			done();
		};

		clientController
			.tryThrowingAnErrorFromErrorHandler()
			.then(
				function () {
					expect('Should not be here').to.equal(false);
				},
				function (e) {
					expect(e.text).to.equal('An internal error occurred');
					done();
				}
			)
            .catch(function (e) {
				done(e);
			});
	});
	it('Mocks Update Conflict and then retries three times (tries 4 times total) and postServerErrorHandler updates Update Conflict count and throws a log only error on 3rd time', function (done) {
		this.timeout(8000);

		clientController.setAllServerRuleCheckFalgsonClient();
		let retries = 0;
		RemoteObjectTemplate.serverAssert = function () {
			if (retries < 3) {
				retries++;
				throw new Error('Update Conflict');
			}
		};

		clientController
			.testUpdateConflictErrorHandling()
			.then(
				function () {
					expect(serverController.hitMaxRetries).to.equal(true);
					expect(retries).to.equal(3);
					done();
				}
			);
	});
});
