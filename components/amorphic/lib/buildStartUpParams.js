'use strict';

let AmorphicContext = require('./AmorphicContext');
let chalk = require('chalk');

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
        console.error(chalk.red('FATAL you did not define an application in your config.json file.'));
    }

    amorphicOptions.appStartList = rootCfg.get('application').split(';');
    amorphicOptions.mainApp = amorphicOptions.appStartList[0];
    amorphicOptions.port = rootCfg.get('port') || 3000; // default to 3000 if not listed

    if (!amorphicOptions.appList) {
        console.error(chalk.red('FATAL you did not define an applications list in your config.json file.'));
    }
    for (let i = 0; i < amorphicOptions.appStartList.length; i++) {
        if (!amorphicOptions.appList[amorphicOptions.appStartList[i]]) {
            console.error(chalk.red('FATAL your application: %s is not in the applications list in your root config.'), amorphicOptions.appStartList[i]);
        }
    }

    if (rootCfg.get('sessionSecret')) {
        amorphicOptions.sessionSecret = rootCfg.get('sessionSecret');
    }
    else {
        amorphicOptions.sessionSecret = 'swat_team';
        console.warn('WARNING you are starting amorphic with no sessionSecret.');
    }
}

module.exports = {
    buildStartUpParams: buildStartUpParams
};
