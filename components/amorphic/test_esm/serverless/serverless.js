'use strict';
import { expect } from 'chai';
import serverAmorphic from '../../dist/esm/index.js';
import amorphicContext from '../../dist/esm/lib/AmorphicContext.js';
import path from 'path';
import { fileURLToPath } from 'url';
import Semotus from '@haventech/semotus';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe('serverless tests', function () {
    let modelRequires, controllerRequires, RemoteObjectTemplate, serverController;
    
    async function beforeEachDescribe(resolve, appName, createControllerFor, sourceMode, statsClient) {
        process.env.createControllerFor = createControllerFor;
        process.env.sourceMode = sourceMode || 'debug';
        amorphicContext.amorphicOptions.mainApp = appName; // we inject our main app name here

        let modelRequiresPath = './apps/' + appName + '/public/js/model.js';
        let controllerRequiresPath = './apps/' + appName + '/public/js/controller.js';
        modelRequires = (await import(modelRequiresPath)).model(RemoteObjectTemplate, function () {});
        controllerRequires = await (await import(controllerRequiresPath)).controller(RemoteObjectTemplate, function () {
            return modelRequires;
        });

        // start persistor mode
        serverAmorphic.startPersistorMode(__dirname).then(resolve());
    }

    before(async function () {
        RemoteObjectTemplate = Semotus._createObject();
        globalThis.RemoteObjectTemplate = RemoteObjectTemplate;
        globalThis.setServerController = function (controller) {
            serverController = controller;
        }
    });

    describe('Run amorphic as serverless', function () {
        this.timeout(1000000);

        before(function () {
            return new Promise((resolve) => {
                beforeEachDescribe(resolve, 'serverless');
            });
        });
        
        it("amorphic server is not listening and express app is disabled", function (done) {
            expect(!!amorphicContext.appContext.server && amorphicContext.appContext.server.listening).to.equal(false);
            done();
        });

        it("server controller has data", function (done) {
            expect(serverController.sam.firstName).to.equal('Sam');
            expect(serverController.sam.lastName).to.equal('Elsamman');
            done();
        });

        it("save data from server controller to database, and data is retrieved", function (done) {
            serverController.clearDB().then(function () {
                var ServerRemoteObjectTemplate = serverController.__template__.objectTemplate;
                ServerRemoteObjectTemplate.begin();
                ServerRemoteObjectTemplate.currentTransaction.touchTop = true;
                serverController.sam.persistSave(ServerRemoteObjectTemplate.currentTransaction);
                return ServerRemoteObjectTemplate.end();
            }).then(function () {
                return serverController.sam.__template__.persistorFetchById(serverController.sam._id);
            }).then(function(customer) {
                expect(customer.firstName).to.equal('Sam');
                expect(customer.lastName).to.equal('Elsamman');
                done();
            }).catch(function(e) {
                done(e);
            });
        });

        after(function (done) {
            // Clean up server
            if (amorphicContext.appContext.server) {
                amorphicContext.appContext.server.close();
            }
            amorphicContext.reset();
            done();
        });
    });
});