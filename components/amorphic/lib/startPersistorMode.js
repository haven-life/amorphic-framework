'use strict';

// Internal modules
let AmorphicContext = require('./AmorphicContext');
let buildStartUpParams = require('./buildStartUpParams').buildStartUpParams;
let logMessage = require('./utils/logger').logMessage;
let startApplication = require('./startApplication').startApplication;
let SupertypeSession = require('@haventech/supertype').SupertypeSession;
let BuildSupertypeConfig = require('@haventech/supertype').BuildSupertypeConfig;
let resolveVersions = require('./listen').resolveVersions;

const packageVersions = resolveVersions([
	'@haventech/supertype',
	'@haventech/persistor',
	'@haventech/bindster'
]);

packageVersions['amorphic'] = require('../../package.json').version;

/**
 * asynchronous start persistor function (returns a promise)
 *
 * @param {unknown} appDirectory unknown
 * @param {unknown} sendToLogFunction unknown
 * @param {unknown} statsdClient unknown
 * @param {unknown} configStore unknown
 */
function startPersistorMode(appDirectory, sendToLogFunction, statsdClient, configStore = null) {
	configStore = configStore != null ? configStore : BuildSupertypeConfig(appDirectory);
	let amorphicOptions = AmorphicContext.amorphicOptions;

	if (typeof sendToLogFunction === 'function') {
		AmorphicContext.appContext.sendToLog = sendToLogFunction;
		SupertypeSession.logger.setLogger(sendToLogFunction);
	}

	buildStartUpParams(configStore);

	// fetch main app after building startup configs, which populates 'mainApp' field.
	const mainApp = AmorphicContext.amorphicOptions.mainApp;

	// check the app level config to see if we should be sending stats.
	let shouldEnableStatsdSending = configStore[mainApp] ? configStore[mainApp].get('amorphicEnableStatsd') : false;

	// if we decide we want to send stats, and we also have a stats client to use, make it available via the session.
	if (shouldEnableStatsdSending && statsdClient) {
		SupertypeSession.statsdClient = statsdClient;
	}

	let sanitizedAmorphicOptions = Object.assign({}, amorphicOptions);
	delete sanitizedAmorphicOptions.sessionSecret;

	logMessage('Starting Amorphic with options: ' + JSON.stringify(sanitizedAmorphicOptions));

	// Initialize applications
	let appList = amorphicOptions.appList;
	let appStartList = amorphicOptions.appStartList;
	let promises = [];

	for (let appKey in appList) {
		if (appStartList.indexOf(appKey) >= 0) {
			promises.push(startApplication(appKey, appDirectory, appList, configStore));
		}
	}

	return Promise.all(promises)
		.then(function logStart() {
			logMessage('Amorphic persistor mode has been started with versions, needs serverless set as serverMode: ');
			for (let packageVer in packageVersions) {
				logMessage(packageVer + ': ' + packageVersions[packageVer]);
			}
		})
		.catch(function error(e) {
			logMessage(e.message + ' ' + e.stack);
		});
}

module.exports = {
	startPersistorMode: startPersistorMode
};
