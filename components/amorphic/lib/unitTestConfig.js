'use strict';

let Config = require('@havenlife-public/amorphic-contracts').Config;
let SuperTypeConfig = require('@havenlife/supertype').SupertypeConfig;
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
function startup(configPath, schemaPath, configBuilder = null) {
    if (!configPath) {
        throw new Error('startup(configPath, schemaPath?) called without a config path');
    }

    schemaPath = schemaPath || configPath;

	let builder = configBuilder != null ? configBuilder : new SuperTypeConfig();
	let configStore = builder.build(appDirectory);
    let config = configStore['root'].get();

    config.nconf = configStore['root']; // Global config
    config.configStore = configStore;

    let schema = JSON.parse((readFile(schemaPath + '/schema.json')).toString());

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
