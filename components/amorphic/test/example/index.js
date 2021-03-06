'use strict';
let assert = require('chai').assert;
let serverAmorphic = require('../../dist/index.js');
let axios = require('axios');
let fs = require('fs');
const os = require('os');
let path = require('path');
let amorphicContext = require('../../dist/lib/AmorphicContext');

describe('Setup amorphic', function() {
    before(function(done) {
        serverAmorphic.listen(__dirname);
        done();
    });

    it('can call the listen function to setup amorphic and then it can be called on the default port', function() {
        return axios.get('http://localhost:3001').catch(function(error) {
            assert.strictEqual(error.response.status, 404);
        });
    });

    it('make sure that the downloads directory exists', function() {
        let downloadPath = path.join(os.tmpdir(), 'download');
        assert.isTrue(fs.existsSync(downloadPath), 'The download path exists');
    });

    after(function() {
        // Clean up server
        if(amorphicContext.appContext.server){
            amorphicContext.appContext.server.close();
        }
    });
});
