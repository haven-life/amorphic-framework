'use strict';

// Internal modules
let AmorphicContext = require('./AmorphicContext');
let buildStartUpParams = require('./buildStartUpParams').buildStartUpParams;
let startApplication = require('./startApplication').startApplication;
let SupertypeSession = require('@haventech/supertype').SupertypeSession;
let BuildSupertypeConfig = require('@haventech/supertype').BuildSupertypeConfig;
let resolveVersions = require('./listen').resolveVersions;
const path = require('path');

const moduleName = `${path.basename(__dirname)}/${path.basename(__filename)}`;

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
 * @param {unknown} logger unknown
 * @param {unknown} statsdClient unknown
 * @param {unknown} configStore unknown
 */
function startPersistorMode(appDirectory, logger, statsdClient, configStore = null) {
	const functionName = startPersistorMode.name;
	configStore = configStore != null ? configStore : BuildSupertypeConfig(appDirectory);
	let amorphicOptions = AmorphicContext.amorphicOptions;

	if (typeof logger === 'function') {
		const message = 'sendToLog is deprecated, please pass in a bunyan logger';
		SupertypeSession.logger.error({
			module: moduleName,
			function: functionName,
			category: 'request',
			error: { isHumanRelated: true },
			message
		});
		throw new Error(message);
	}

	if (logger && typeof logger === 'object' && 
			(typeof logger.info === 'function' ||
            typeof logger.error === 'function' ||
            typeof logger.debug === 'function' ||
            typeof logger.warn === 'function')) {
			SupertypeSession.logger.setLogger(logger);
	}
    else {
		SupertypeSession.logger.warn({
			module: moduleName,
			function: functionName,
			category: 'request',
			error: { isHumanRelated: true },
			message: 'A valid bunyan logger was not passed at initialization. Defaulting to internal supertype logger.'
		});
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

	SupertypeSession.logger.info({
		module: moduleName,
		function: functionName,
		category: 'milestone',
		message: 'Starting Amorphic with options: ' + JSON.stringify(sanitizedAmorphicOptions)
	});

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
			let msg = 'Amorphic persistor mode has been started with versions, needs serverless set as serverMode: ';
			for (let packageVer in packageVersions) {
				msg += packageVer + ': ' + packageVersions[packageVer] + ', ';
			}
			SupertypeSession.logger.info({
				module: moduleName,
				function: functionName,
				category: 'request',
				message: msg
			});
		})
		.catch(function error(e) {
			SupertypeSession.logger.error({
				module: moduleName,
				function: functionName,
				category: 'request',
				message: 'Error encountered while initializing amorphic in PersistorMode',
				error: e
			});
		});
}

module.exports = {
	startPersistorMode: startPersistorMode
};
