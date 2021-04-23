'use strict';

// Internal modules
let AmorphicContext = require('./AmorphicContext');
let buildStartUpParams = require('./buildStartUpParams').buildStartUpParams;
let logMessage = require('./utils/logger').logMessage;
let startApplication = require('./startApplication').startApplication;
let AmorphicServer = require('./AmorphicServer').AmorphicServer;
let SupertypeSession = require('@haventech/supertype').SupertypeSession;
let createServer = AmorphicServer.createServer;
let Bluebird = require('bluebird');
let BuildSupertypeConfig = require('@haventech/supertype').BuildSupertypeConfig;

const packageVersions = resolveVersions([
	'@haventech/semotus',
	'@haventech/supertype',
	'@haventech/persistor',
	'@haventech/bindster'
]);

packageVersions['amorphic'] = require('../../package.json').version;

function resolveVersions(packages) {
	const versions = {};

	packages.forEach(function(dependency) {
		try {
			const packageLocation = require.resolve(dependency);
			const index = packageLocation.lastIndexOf(dependency);
			const packageJsonLocation = packageLocation.substring(0, index).concat(dependency + '/package.json');

			versions[dependency] = require(packageJsonLocation).version;
		} catch (e) {}
	});

	return versions;
}

/**
 * asynchronous listener function (returns a promise)
 *
 * @param {unknown} appDirectory unknown
 * @param {unknown} sessionStore unknown
 * @param {unknown} preSessionInject unknown
 * @param {unknown} postSessionInject unknown
 * @param {unknown} sendToLogFunction unknown
 */
function listen(appDirectory, sessionStore, preSessionInject, postSessionInject, sendToLogFunction, statsdClient, configStore = null) {
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

	let sessionConfig = {
		secret: amorphicOptions.sessionSecret,
		cookie: {
			maxAge: amorphicOptions.sessionExpiration
		},
		resave: false,
		saveUninitialized: true,
		rolling: true
	};
	if (amorphicOptions.sameSite) {
		sessionConfig.cookie.sameSite = amorphicOptions.sameSiteCookie;
	}
	if (amorphicOptions.secureCookie) {
		sessionConfig.cookie.secure = amorphicOptions.secureCookie;
	}
	if (sessionStore) {
		sessionConfig['store'] = sessionStore;
	}
	// Initialize applications
	let appList = amorphicOptions.appList;
	let appStartList = amorphicOptions.appStartList;
	let promises = [];

	for (let appKey in appList) {
		if (appStartList.indexOf(appKey) >= 0) {
			promises.push(startApplication(appKey, appDirectory, appList, configStore, sessionStore));
		}
	}

	return Bluebird.all(promises)
		.then(
			createServer.bind(
				this,
				preSessionInject,
				postSessionInject,
				appList,
				appStartList,
				appDirectory,
				sessionConfig
			)
		)
		.then(function logStart() {
			logMessage('Amorphic has been started with versions: ');
			for (let packageVer in packageVersions) {
				logMessage(packageVer + ': ' + packageVersions[packageVer]);
			}
		})
		.catch(function error(e) {
			logMessage(e.message + ' ' + e.stack);
		});
}

module.exports = {
	listen: listen
};
