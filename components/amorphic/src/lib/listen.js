'use strict';

// Internal modules
import AmorphicContext from './AmorphicContext.js'
import { buildStartUpParams } from './buildStartUpParams.js'
import { startApplication } from './startApplication.js'
import { AmorphicServer } from './AmorphicServer.js'
import { SupertypeSession, BuildSupertypeConfig } from '@haventech/supertype';
let createServer = AmorphicServer.createServer;

import { resolveVersions } from './resolve/resolveVersions.js';
const moduleName = `amorphic/lib/listen`;
/**
 * asynchronous listener function (returns a promise)
 *
 * @param {unknown} appDirectory unknown
 * @param {unknown} sessionStore unknown
 * @param {unknown} preSessionInject unknown
 * @param {unknown} postSessionInject unknown
 * @param {unknown} logger unknown
 * @param {unknown} statsdClient unknown
 * @param {unknown} configStore unknown
 * @param {unknown} externalSchemas can inject schemas directly by the apps
 */
export function listen(appDirectory, sessionStore, preSessionInject, postSessionInject, logger, statsdClient, configStore = null, externalSchemas) {
	configStore = configStore != null ? configStore : BuildSupertypeConfig(appDirectory);
	let amorphicOptions = AmorphicContext.amorphicOptions;
	const functionName = listen.name;

	if (typeof logger === 'function') {
		const message = 'sendToLog is deprecated, please pass in a valid bunyan logger instead of sendToLog function';
		SupertypeSession.logger.error({
			module: moduleName,
			function: functionName,
			category: 'availability',
			error: { isHumanRelated: true },
			message
		});
		throw new Error(message);
	}

	if (logger && typeof logger === 'object' && 
			(typeof logger.info === 'function' &&
            typeof logger.error === 'function' &&
            typeof logger.debug === 'function' &&
            typeof logger.warn === 'function'  &&
			typeof logger.child === 'function')) {
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
		category: 'availability',
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
			promises.push(startApplication(appKey, appDirectory, appList, configStore, sessionStore, externalSchemas));
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
		.then(function () {
			return resolveVersions({});
		})
		.then(function logStart(packageVersions) {
			let msg = 'Amorphic has been started with versions: ';
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
				message: 'Error encountered while initializing amorphic.',
				error: e
			});
		});
}
