'use strict';
let assert = require('chai').assert;
let Bluebird = require('bluebird');
let amorphic = require('../../dist/index.js');
let axios = require('axios');
let fs = require('fs');
let path = require('path');
let amorphicContext = require('../../dist/lib/AmorphicContext');

describe('Run amorphic as secure daemon', function() {

    this.timeout(5000);

    before(function(done) {
        amorphic.listen(__dirname);
        done();
    });

    it('can call the listen function to setup amorphic, and init the app controller', function() {
        assert.isOk(daemonController, 'The daemonController was created');
        assert.isTrue(daemonController.prop, 'The daemonController was initialized');

        assert.equal(daemonController.getObjectTemplate().controller, daemonController, 'The objectTemplate\'s controller references where set up');
    });

    it('should create the download directory', function() {
        let downloadPath = path.join(path.dirname(require.main.filename), 'download');
        assert.isTrue(fs.existsSync(downloadPath), 'The download path exists');
    });

    it('should have values with descriptions', function() {
        assert.strictEqual(daemonController.__values__('propWithValuesAndDescriptions').length, 1, 'The correct values for the prop');
        assert.strictEqual(daemonController.__values__('propWithValuesAndDescriptions')[0], 'value', 'The correct values for the prop');
        assert.strictEqual(daemonController.__descriptions__('propWithValuesAndDescriptions')['value'], 'Description', 'The correct description for the value');
    });

    //**@TODO: Add tests for secure server testing with certs */

    it('should post to the HTTP unsecure endpoint successfully', function() {
        return axios.post('http://localhost:3001/api/middleware-endpoint', {})
            .then(function(response) {
                assert.strictEqual(response.status, 200, 'The response code was 200');
            });
    });
    
    it('should have the appropriate server details', function() {
        assert.strictEqual(amorphicContext.appContext.secureServer.address().port, 8443, 'The express server correctly gets the port');
    });

    it('should have the appropriate server options', function() {
        assert.strictEqual(amorphicContext.appContext.expressApp.locals.name, 'daemon_secure', 'The app name was correct in express');
        assert.strictEqual(amorphicContext.appContext.expressApp.locals.version, '1', 'The version was correct in express');
        assert.strictEqual(amorphicContext.applicationConfig['daemon_secure'].appConfig.serverOptions.ca, 'none', 'The certificate authority config was correct');
        assert.strictEqual(amorphicContext.applicationConfig['daemon_secure'].appConfig.serverOptions.securePort, 8443, 'The secure port was correct');
    });

    after(function(done) {
        // Clean up server
        if(amorphicContext.appContext.server){
            amorphicContext.appContext.server.close();
        }
        if(amorphicContext.appContext.secureServer){
            amorphicContext.appContext.secureServer.close();
        }
        done();
    });
});
