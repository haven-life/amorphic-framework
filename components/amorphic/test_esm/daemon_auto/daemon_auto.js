'use strict';
import { assert } from 'chai';
import amorphic from '../../dist/esm/index.js';
import axios from 'axios';
import path from 'path';
import amorphicContext from '../../dist/esm/lib/AmorphicContext.js';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let daemonAutoController;

describe('Run amorphic as a deamon with template mode "auto"', function() {
    before(function() {
        globalThis.setController = function(controller) {
            daemonAutoController = controller;
        }
        return amorphic.listen(__dirname);
    });

    it('can call the listen function to setup amorphic, and init the app controller', function() {
        assert.isOk(daemonAutoController, 'The daemonAutoController was created');
        assert.isTrue(daemonAutoController.prop, 'The daemonAutoController was initialized');
        assert.isTrue(daemonAutoController.baseProp, 'The daemonAutoController can see base props');

        assert.equal(daemonAutoController.getObjectTemplate().controller, daemonAutoController, 'The objectTemplate\'s controller references where set up');
    });

    it('should have values with descriptions', function() {
        assert.strictEqual(daemonAutoController.__values__('propWithValuesAndDescriptions').length, 1, 'The correct values for the prop');
        assert.strictEqual(daemonAutoController.__values__('propWithValuesAndDescriptions')[0], 'value', 'The correct values for the prop');
        assert.strictEqual(daemonAutoController.__descriptions__('propWithValuesAndDescriptions')['value'], 'Description', 'The correct description for the value');
    });

    it('should have virtual properties', function() {
        assert.strictEqual(daemonAutoController.virtualProp, 'I am virtual', 'Can use virutal props');
    });

    it('should have access to statics', function() {
        assert.isOk(daemonAutoController.getMapFromStatic(), 'Can get the static map');
        assert.strictEqual('value', daemonAutoController.getMapFromStatic().key, 'Static map values correct');
    });


    it('should get a response from a custom endpoint', function() {
        return axios.get('http://localhost:3001/api/test')
            .then(function(response) {
                assert.isOk(response, 'The response is ok');
                assert.strictEqual(response.status, 200, 'The response code was 200');
                assert.strictEqual(response.data, 'test API endpoint OK');
            });
    });

    it('should get a response from a second custom endpoint', function() {
        return axios.get('http://localhost:3001/api/test_other_endpoint')
            .then(function(response) {
                assert.isOk(response, 'The response is ok');
                assert.strictEqual(response.status, 200, 'The response code was 200');
                assert.strictEqual(response.data, 'test API endpoint OK');
            });
    });

    after(function(done) {
        // Clean up server
        if(amorphicContext.appContext.server){
            amorphicContext.appContext.server.close();
        }
        amorphicContext.reset();
        done();
    });
});
