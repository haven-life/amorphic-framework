/*
 * Banking example shows PersistObjectTemplate with
 * many-to-many relationships
 *
 */

declare function require(name: string);

// RemoteObjectTemplate will be used for server template creation
var RemoteObjectTemplate = require('../../../dist');

var delay = require('../../../dist/helpers/Utilities.js').delay;

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
ServerObjectTemplate.memSession = {semotus: {}};
ServerObjectTemplate.__dictionary__ = RemoteObjectTemplate.__dictionary__;

import {expect} from 'chai';

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
ServerObjectTemplate.reqSession = {loggingID: 'test', semotus: {}};
ServerObjectTemplate.logLevel = 1;
ServerObjectTemplate.logger.setLevel('info;activity:dataLogging');

describe('Typescript Banking Example', function () {
	it('can log in a closed loop', function () {
		console.log(serverController);
		console.log(clientController);
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
		var context = sam.amorphic.logger.setContextProps({permFoo: 'permBar1'});
		sam.amorphic.logger.warn({foo: 'bar2'});
		sam.amorphic.logger.clearContextProps(context);
		sam.amorphic.logger.warn({foo: 'bar3'});
		var child = sam.amorphic.logger.createChildLogger({name: 'supertype_child'});
		child.setContextProps({permFoo: 'childFoo'});
		child.warn({foo: 'bar4'});
		sam.amorphic.logger.warn({foo: 'bar5'});
		sam.amorphic.logger.startContext({name: 'supertype2'});
		sam.amorphic.logger.warn({foo: 'bar6', woopie: {yea: true, oh: date}}, 'hot dog');
		sam.amorphic.logger.setLevel('error');
		console.log('setting level to error');
		sam.amorphic.logger.warn({foo: 'bar6', woopie: {yea: true, oh: date}}, 'hot dog');
		sam.amorphic.logger.setLevel('error;foo:bar6');
		sam.amorphic.logger.warn({foo: 'bar6', woopie: {yea: true, oh: date}}, 'hot dog');
		sam.amorphic.logger.setLevel('error;foo:bar7');
		sam.amorphic.logger.warn({foo: 'bar6', woopie: {yea: true, oh: date}}, 'hot dog');

		console.log(output);
		var result =
			'(__amorphicContext={"name":"supertype"}foo="bar1")(__amorphicContext={"name":"supertype","permFoo":"permBar1"}permFoo="permBar1"foo="bar2")(__amorphicContext={"name":"supertype"}foo="bar3")(__amorphicContext={"name":"supertype","permFoo":"childFoo"}permFoo="childFoo"foo="bar4")(__amorphicContext={"name":"supertype"}foo="bar5")(__amorphicContext={"name":"supertype2"}foo="bar6"woopie={"yea":true,"oh":"2010-11-11T05:00:00.000Z"})(__amorphicContext={"name":"supertype2"}foo="bar6"woopie={"yea":true,"oh":"2010-11-11T05:00:00.000Z"})';

		expect(output).to.equal(result);
		sam.amorphic.logger = oldSendToLog;
	});
});
