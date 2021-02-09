'use strict';

let ConfigBuilder = require('./utils/configBuilder').ConfigBuilder;
let ConfigApi = require('./utils/configBuilder').ConfigAPI;
let startApplication = require('./startApplication');
let readFile = require('./utils/readFile').readFile;
let fs = require('fs');
/**
 * Connect to the database
 *
 * @param {unknown} configPath unknown
 * @param {unknown} schemaPath unknown
 *
 * @returns {unknown} unknown.
 */
function startup(configPath, schemaPath) {
    if (!configPath) {
        throw new Error('startup(configPath, schemaPath?) called without a config path');
    }

    schemaPath = schemaPath || configPath;

    let builder = new ConfigBuilder(new ConfigApi());
    let configStore = builder.build(configPath);
    let config = configStore['root'].get();

    config.nconf = configStore['root']; // Global config
    config.configStore = configStore;

    let schema = JSON.parse((readFile(schemaPath + '/schema.json')).toString());
    
    var files = fs.readdirSync(schemaPath);
    var dbDrivers = [];
    schema = files.reduce((result, file) => {
        var prefix = file.match(/(.*)_schema.json/);
        if (!prefix) {
            return result;
        }
        schema = JSON.parse(String(fs.readFileSync(`${schemaPath}/${file}`)));
        dbDrivers.push(prefix[1]);
        Object.keys(schema).forEach(ele => {
            schema[ele]['table'] = `${prefix[1]}/${schema[ele].table}` ; 
        });
        Object.assign(result, schema);
        return result;
    }, schema);



    return startApplication.setUpInjectObjectTemplate('__noapp__', config, schema, dbDrivers)
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
