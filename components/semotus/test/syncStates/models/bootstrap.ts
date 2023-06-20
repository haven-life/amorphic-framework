declare function require(name: string);

import { expect } from 'chai';

export type retVal =
    {
        client: any;
        server: any;
    }

export let ServerObjectTemplate = undefined;
export let ClientObjectTemplate = undefined;

function resetAppRuleSet(RemoteObjectTemplate, app) {
    RemoteObjectTemplate['toClientRuleSet'] = [app];
    RemoteObjectTemplate['toServerRuleSet'] = [app];
}

/**
 * Bootstrap for Semotus tests. Create a server controller and a client controller
 */
export function bootstrap(app): retVal {

    // RemoteObjectTemplate will be used for server template creation
    var RemoteObjectTemplate = require('../../../dist/cjs').default;
    resetAppRuleSet(RemoteObjectTemplate, app);

    RemoteObjectTemplate.role = 'server';
    RemoteObjectTemplate._useGettersSetters = true;
    RemoteObjectTemplate.maxCallTime = 60 * 1000;
    RemoteObjectTemplate.__conflictMode__ = 'soft';

    ClientObjectTemplate = RemoteObjectTemplate._createObject();
    ClientObjectTemplate.role = 'client';
    ClientObjectTemplate._useGettersSetters = false;
    ClientObjectTemplate.__conflictMode__ = 'soft';

    ServerObjectTemplate = RemoteObjectTemplate._createObject();
    ServerObjectTemplate.role = 'server';
    ServerObjectTemplate._useGettersSetters = true;
    ServerObjectTemplate.maxCallTime = 60 * 1000;
    ServerObjectTemplate.__conflictMode__ = 'soft';
    ServerObjectTemplate.memSession = {
        semotus: {}
    };

    ServerObjectTemplate.__dictionary__ = RemoteObjectTemplate.__dictionary__;


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
    var ServerController = createController(ServerObjectTemplate, ClientObjectTemplate.getClasses());

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

    sync();
    ServerObjectTemplate.controller = serverController;
    ServerObjectTemplate.__changeTracking__ = true;
    ServerObjectTemplate.reqSession = {loggingID: 'test', semotus: {}};
    ServerObjectTemplate.logLevel = 1;
    ServerObjectTemplate.logger.setLevel('info;activity:dataLogging');

    return {server: serverController, client: clientController};
}

export function sync() {
    ServerObjectTemplate.syncSession(undefined);
}

export async function callBootstrap(app, scope?, state?) {
    const ret = bootstrap(app);
    const server = ret.server;
    const client = ret.client;
    return await setup(client, server, scope, state);
}

export async function setup(client, server, scope?, state?) {
    if (scope) {
        await server.setState('server', scope, state);
    }
    server.mockServerInit(); // Act as if we're initializing the server here
    return {client, server};
}