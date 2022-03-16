'use strict';
var expect = require('chai').expect;
let assert = require('chai').assert;
let Bluebird = require('bluebird');
let serverAmorphic = require('../../dist/index.js');
let fs = require('fs');
const os = require('os');
let path = require('path');
let amorphicContext = require('../../dist/lib/AmorphicContext');

clientController = null;

let modelRequires;
let controllerRequires;
let Controller;

function beforeEachDescribe(done, appName, createControllerFor, sourceMode, statsClient) {
    process.env.createControllerFor = createControllerFor;
    process.env.sourceMode = sourceMode || 'debug';
    amorphicContext.amorphicOptions.mainApp = appName; // we inject our main app name here

    // need to inject the amorphicStatic send to log because due to loading up both client and server in the same module resolution
    // we override our sendToLog with the the clients sometimes
    serverAmorphic.listen(__dirname);
    let modelRequiresPath = './apps/' + appName + '/public/js/model.js';
    let controllerRequiresPath = './apps/' + appName + '/public/js/controller.js';
    modelRequires = require(modelRequiresPath).model(RemoteObjectTemplate, function () {});
    controllerRequires = require(controllerRequiresPath).controller(RemoteObjectTemplate, function () {
        return modelRequires;
    });
    Controller = controllerRequires.Controller;
    window = modelRequires;
    window.addEventListener = function () {};
    window.Controller = controllerRequires.Controller;
    let isDone = false;

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
            clientController.amorphicStatus = 'offline';
        }
    );
}

describe('Run amorphic as serverless', function () {
    this.timeout(1000000);

    before(function (done) {
        return beforeEachDescribe(done, 'serverless');
    });
    
    it("amorphic server is not listening", function (done) {
        expect(amorphicContext.appContext.server.listening).to.equal(false);
        done();
    });

    it("client controller has data", function (done) {
        expect(clientController.sam.firstName).to.equal('Sam');
        expect(clientController.sam.lastName).to.equal('Elsamman');
        done();
    });

    after(function (done) {
        // Clean up server
        if (amorphicContext.appContext.server) {
            amorphicContext.appContext.server.close();
        }
        done();
    });
});
