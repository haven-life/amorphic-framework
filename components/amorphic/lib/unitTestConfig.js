'use strict';

let BuildSupertypeConfig = require('@haventech/supertype').BuildSupertypeConfig;
let startApplication = require('./startApplication');
let readFile = require('./utils/readFile').readFile;

/**
 * Connect to the database
 *
 * @param {unknown} configPath unknown
 * @param {unknown} schemaPath unknown
 *
 * @returns {unknown} unknown.
 */
function startup(configPath, schemaPath, configStore = null, externalSchemas) {
    if (!configPath) {
        throw new Error('startup(configPath, schemaPath?) called without a config path');
    }

    schemaPath = schemaPath || configPath;

	configStore = configStore != null ? configStore : BuildSupertypeConfig(configPath);
    let config = configStore['root'].get();

    config.nconf = configStore['root']; // Global config
    config.configStore = configStore;
    let schema = null;
    if (externalSchemas) {
        schema = externalSchemas;
    }
    else {
        const schemaDef = readFile(schemaPath + '/schema.json');
        schema = schemaDef ? JSON.parse(schemaDef.toString()) : schema;
    }
    
    if (!schema) {
        throw new Error('schema definitions are not provided and are not available in the schemPath provided');
    }

    return startApplication.setUpInjectObjectTemplate('__noapp__', config, schema)
        .then (function a(injectObjectTemplate) {
            return injectObjectTemplate(this);
        }.bind(this))
        .then (function b() {
            this.performInjections();
        }.bind(this));
}

module.exports = {
    startup: startup
};
