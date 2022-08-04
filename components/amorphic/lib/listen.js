'use strict';

// Internal modules
let AmorphicContext = require('./AmorphicContext');
let buildStartUpParams = require('./buildStartUpParams').buildStartUpParams;
let startApplication = require('./startApplication').startApplication;
let AmorphicServer = require('./AmorphicServer').AmorphicServer;
let SupertypeSession = require('@haventech/supertype').SupertypeSession;
let createServer = AmorphicServer.createServer;
let BuildSupertypeConfig = require('@haventech/supertype').BuildSupertypeConfig;
const path = require('path');

const packageVersions = resolveVersions([
	'@haventech/semotus',
	'@haventech/supertype',
	'@haventech/persistor',
	'@haventech/bindster'
]);

packageVersions['amorphic'] = require('../../package.json').version;

const moduleName = `${path.basename(__dirname)}/${path.basename(__filename)}`;

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
 * @param {unknown} logger unknown
 */
function listen(appDirectory, sessionStore, preSessionInject, postSessionInject, logger, statsdClient, configStore = null) {
	configStore = configStore != null ? configStore : BuildSupertypeConfig(appDirectory);
	let amorphicOptions = AmorphicContext.amorphicOptions;
	const functionName = listen.name;

	if (typeof logger === 'function') {
        if (typeof logger.info === 'function' ||
            typeof logger.error === 'function' ||
            typeof logger.debug === 'function' ||
            typeof logger.warn === 'function') {
			SupertypeSession.logger.setLogger(logger);
        } else {
			SupertypeSession.logger.error({
				module: moduleName,
				function: functionName,
				category: 'request',
				isHumanRelated: true,
				message: 'no bunyan logger passed in'
			});
			throw new Error('sendToLog is deprecated, please pass in a bunyan logger');
		}
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
		category: 'request',
		message: 'Starting Amorphic with options: ' + JSON.stringify(sanitizedAmorphicOptions)
	});

	let sessionConfig = {
		secret: amorphicOptions.sessionSecret,
		cookie: {
			maxAge: amorphicOptions.sessionExpiration
		},
		resave: false,
		saveUninitialized: true,
		rolling: true
	};
	if(configStore[mainApp].get('sameSiteCookie')) {
		sessionConfig.cookie.sameSite = configStore[mainApp].get('sameSiteCookie');
	}
	if(configStore[mainApp].get('secureCookie')) {
		sessionConfig.cookie.secure = configStore[mainApp].get('secureCookie');
	};
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

	return Promise.all(promises)
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
			let msg = 'Amorphic has been started with versions: ';
			for (let packageVer in packageVersions) {
				msg += packageVer + ': ' + packageVersions[packageVer] + ', ';
			}
			SupertypeSession.logger.info({
				module: moduleName,
				function: functionName,
				category: 'request',
				message: msg,
				data: {
					packageVersions: packageVersions
				}
			});
		})
		.catch(function error(e) {
			SupertypeSession.logger.error({
				module: moduleName,
				function: functionName,
				category: 'request',
				message: e.message + ' ' + e.stack,
				error: e
			});
		});
}

module.exports = {
	listen: listen,
	resolveVersions: resolveVersions
};
