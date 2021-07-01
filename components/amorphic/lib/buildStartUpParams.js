'use strict';

let AmorphicContext = require('./AmorphicContext');

/*
    Amorphic startup options setup
 */
function buildStartUpParams(configStore) {
    let amorphicOptions = AmorphicContext.amorphicOptions || {};
    let rootCfg = configStore['root'];

    amorphicOptions.compressXHR = rootCfg.get('compressXHR') || amorphicOptions.compressXHR;
    amorphicOptions.sourceMode = rootCfg.get('sourceMode') || amorphicOptions.sourceMode;
    amorphicOptions.compressSession = rootCfg.get('compressSession') || amorphicOptions.compressSession;
    amorphicOptions.conflictMode = rootCfg.get('conflictMode') || amorphicOptions.conflictMode;
    amorphicOptions.sessionExpiration = rootCfg.get('sessionSeconds') * 1000;
    amorphicOptions.objectCacheExpiration = rootCfg.get('objectCacheSeconds') * 1000;
    amorphicOptions.appList = rootCfg.get('applications');

    if (!rootCfg.get('application')) {
        throw new Error('FATAL you did not define an application in your config.json file.');
    }

    amorphicOptions.appStartList = rootCfg.get('application').split(';');
    amorphicOptions.mainApp = amorphicOptions.appStartList[0];
    amorphicOptions.port = rootCfg.get('port') || 3000; // default to 3000 if not listed

    if (!amorphicOptions.appList) {
        throw new Error('FATAL you did not define an applications list in your config.json file.');
    }
    for (let i = 0; i < amorphicOptions.appStartList.length; i++) {
        if (!amorphicOptions.appList[amorphicOptions.appStartList[i]]) {
            throw new Error('FATAL your application: %s is not in the applications list in your root config.');
        }
    }

    if (rootCfg.get('sessionSecret')) {
        amorphicOptions.sessionSecret = rootCfg.get('sessionSecret');
    }
    else {
        throw new Error('FATAL you are starting amorphic with no sessionSecret.');
    }
}

module.exports = {
    buildStartUpParams: buildStartUpParams
};
