'use strict';
let nconf = require('nconf');

module.exports = {
    ConfigBuilder: ConfigBuilder,
    ConfigAPI: ConfigAPI
};

function ConfigAPI() {
    let cfg = new nconf.Provider();
    cfg.argv().env({ separator: '__' });
    this._configProvider = cfg;
}

ConfigAPI.prototype.get = function get(key) {
    return this._configProvider.get(key);
};
ConfigAPI.prototype.set = function set(key, value) {
    return this._configProvider.set(key, value);
};
ConfigAPI.prototype.loadFile = function loadFile(fileKey, file) {
    this._configProvider.file(fileKey, file);
};

ConfigAPI.createInstance = function createInstance() {
    return new ConfigAPI();
};

function ConfigBuilder(configApi) {
    this._configApi = configApi;
}

ConfigBuilder.prototype.build = function build(rootDir) {

    (function validate(rootDir) {
        if (null === rootDir || undefined === rootDir || '' === rootDir) {
            throw new Error('Valid root path expected. rootDir[' + rootDir + ']');
        }
    })(rootDir);

    let configStore = {};

    let envName = this._configApi.get('APP_ENV');

    if(envName) {
        this._configApi.loadFile('root_env', rootDir + '/config_' + envName.toLowerCase() + '.json');
    }
    this._configApi.loadFile('root_secure', rootDir +  '/config_secure.json');
    this._configApi.loadFile('root', rootDir + '/config.json');

    configStore['root'] = this._configApi;

    let appList = this._configApi.get('applications') || {};

    for (let appKey in appList) {
        let appCfg = {};
        appCfg.appName = appKey;
        appCfg.appPath = rootDir + '/' + appList[appCfg.appName];
        appCfg.appCommonPath = rootDir + '/apps/common';

        let appCfgApi = ConfigAPI.createInstance();

        if(envName) {
            appCfgApi.loadFile('app_env', appCfg.appPath +  '/config_' + envName.toLowerCase() + '.json');
        }
        appCfgApi.loadFile('app_secure', appCfg.appPath +  '/config_secure.json');
        appCfgApi.loadFile('app', appCfg.appPath + '/config.json');

        if(envName) {
            appCfgApi.loadFile('common_env', appCfg.appCommonPath +  '/config_' + envName.toLowerCase() + '.json');
        }
        appCfgApi.loadFile('common_secure', appCfg.appCommonPath +  '/config_secure.json');
        appCfgApi.loadFile('common', appCfg.appCommonPath + '/config.json');

        if(envName) {
            appCfgApi.loadFile('root_env', rootDir +  '/config_' + envName.toLowerCase() + '.json');
        }
        appCfgApi.loadFile('root_secure', rootDir +  '/config_secure.json');
        appCfgApi.loadFile('root', rootDir + '/config.json');


        configStore[appKey] = appCfgApi;
    }

    return configStore;

};
