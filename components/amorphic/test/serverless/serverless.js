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

    // start persistor mode
    serverAmorphic.startPersistorMode(__dirname).then(done());
}

describe('Run amorphic as serverless', function () {
    this.timeout(1000000);

    before(function (done) {
        return beforeEachDescribe(done, 'serverless');
    });
    
    it("amorphic server is not listening and express app is disabled", function (done) {
        expect(amorphicContext.appContext.server.listening).to.equal(false);
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
        done();
    });
});
