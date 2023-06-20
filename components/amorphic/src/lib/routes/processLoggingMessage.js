'use strict';

import AmorphicContext from '../AmorphicContext.js';
import * as Logger from '../utils/logger.js';
let getLoggingContext = Logger.getLoggingContext;
let setupLogger = Logger.setupLogger;
import url from 'url';
import persistor from '@haventech/persistor';
import semotus from '@haventech/semotus';

const validLoggingLevel = new Set(['error', 'warn', 'info', 'debug', 'trace', 'fatal']);

/**
 * Purpose unknown
 *
 * @param {unknown} req unknown
 * @param {unknown} res unknown
 */
export function processLoggingMessage(req, res) {
	let applicationConfig = AmorphicContext.applicationConfig;
	let path = url.parse(req.originalUrl, true).query.path;
	let session = req.session;
	let message = req.body;

	if(!validLoggingLevel.has(message.loggingLevel)) {
		res.writeHead(400, {'Content-Type': 'text/plain'});
		res.end(`Error: Unsupported loggingLevel ${message.loggingLevel}`);

		return;
	}

	let persistableSemotableTemplate = persistor(null, null, semotus);

	if (!session.semotus) {
		session.semotus = { controllers: {}, loggingContext: {} };
	}

	if (!session.semotus.loggingContext[path]) {
		session.semotus.loggingContext[path] = getLoggingContext(path, null);
	}

	// TODO why can't appConfig be taken out here?
	setupLogger(persistableSemotableTemplate.logger, path, session.semotus.loggingContext[path], applicationConfig);

	persistableSemotableTemplate.logger.setContextProps(message.loggingContext);

	persistableSemotableTemplate.logger.setContextProps({
		session: req.session.id,
		ipaddress:
			String(req.headers['x-forwarded-for'] || req.connection.remoteAddress)
				.split(',')[0]
				.replace(/(.*)[:](.*)/, '$2') || 'unknown'
	});

	message.loggingData.from = 'browser';
	persistableSemotableTemplate.logger[message.loggingLevel](message.loggingData);
	res.writeHead(200, { 'Content-Type': 'text/plain' });
	res.end('');
}
