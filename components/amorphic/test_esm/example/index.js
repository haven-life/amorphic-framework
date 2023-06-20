'use strict';
import { assert } from 'chai';
import serverAmorphic from '../../dist/esm/index.js';
import axios from 'axios';
import fs from 'fs';
import os from 'os';
import path from 'path';
import amorphicContext from '../../dist/esm/lib/AmorphicContext.js';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

//const serverAmorphic = (await import('../../dist/esm/index.js?date=' + Date.now())).default;

describe('Setup amorphic', function() {
    before(function() {
        return serverAmorphic.listen(__dirname);
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
        amorphicContext.reset();
    });
});
