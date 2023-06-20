'use strict';

// Internal modules
import AmorphicContext from './AmorphicContext.js'
import { buildStartUpParams } from './buildStartUpParams.js'
import { startApplication } from './startApplication.js'
import { SupertypeSession, BuildSupertypeConfig } from '@haventech/supertype';

const moduleName = `amorphic/lib/startPersistorMode`;

import packageJson from '../../../package.json' assert { type: 'json' };
import { resolveVersions } from './resolve/resolveVersions.js';
let packageVersions;
(async () => {
	packageVersions = await resolveVersions([
		'@haventech/supertype',
		'@haventech/persistor',
		'@haventech/bindster'
	]);
	packageVersions['amorphic'] = packageJson.version;
})();

/**
 * asynchronous start persistor function (returns a promise)
 *
 * @param {unknown} appDirectory unknown
 * @param {unknown} logger unknown
 * @param {unknown} statsdClient unknown
 * @param {unknown} configStore unknown
 * @param {unknown} externalSchemas can inject schemas directly by the apps
 */
export function startPersistorMode(appDirectory, logger, statsdClient, configStore = null, externalSchemas) {
	const functionName = startPersistorMode.name;
	configStore = configStore != null ? configStore : BuildSupertypeConfig(appDirectory);
	let amorphicOptions = AmorphicContext.amorphicOptions;

	if (typeof logger === 'function') {
		const message = 'sendToLog is deprecated, please pass in a valid bunyan logger instead of sendToLog function';
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

	// Initialize applications
	let appList = amorphicOptions.appList;
	let appStartList = amorphicOptions.appStartList;
	let promises = [];

	for (let appKey in appList) {
		if (appStartList.indexOf(appKey) >= 0) {
			promises.push(startApplication(appKey, appDirectory, appList, configStore, null, externalSchemas));
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
