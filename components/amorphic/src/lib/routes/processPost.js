'use strict';

import url from 'url';
import { establishServerSession } from '../session/establishServerSession.js';
import * as Logger from '../utils/logger.js';
let logMessage = Logger.logMessage;
import { StatsdHelper as statsdUtils } from '@haventech/supertype';

/**
 * Process a post request by establishing a session and calling the controllers processPost method
 * which can return a response to be sent back
 *
 * @param {unknown} req unknown
 * @param {unknown} res unknown
 * @param {unknown} sessions unknown
 * @param {unknown} controllers unknown
 */

export function processPost(req, res, sessions, controllers, nonObjTemplatelogLevel) {
	const moduleName = `amorphic/lib/routes/processPost`;
	const functionName = processPost.name;
	let processPostStartTime = process.hrtime();

	let session = req.session;
	let path = url.parse(req.originalUrl, true).query.path;

	establishServerSession(req, path, false, false, null, sessions, controllers, nonObjTemplatelogLevel, res)
		.then(function ff(semotus) {
			let ourObjectTemplate = semotus.objectTemplate;
			let remoteSessionId = req.session.id;

			if (typeof ourObjectTemplate.controller.processPost === 'function') {
				Promise.resolve()
					.then(function executeProcessPost() {
						return ourObjectTemplate.controller.processPost(null, req.body, req, res)
					})
					.then(function saveSessionAndEndResponse(controllerResp) {
						ourObjectTemplate.setSession(remoteSessionId);
						semotus.save(path, session, req);
						res.writeHead(
							controllerResp.status,
							controllerResp.headers || { 'Content-Type': 'text/plain' }
						);
						res.end(controllerResp.body);

						statsdUtils.computeTimingAndSend(
							processPostStartTime,
							'amorphic.webserver.process_post.response_time',
							{ result: 'success' }
						);
					})
					.catch(function hh(e) {
						ourObjectTemplate.logger.error(
							{
								module: moduleName,
								function: functionName,
								category: 'milestone',
								message: 'Error encountered while establishing server session.',
								error: e
							}
						);

						res.writeHead(500, { 'Content-Type': 'text/plain' });
						res.end('Internal Error');

						statsdUtils.computeTimingAndSend(
							processPostStartTime,
							'amorphic.webserver.process_post.response_time',
							{ result: 'failure' }
						);
					});
			} else {
				throw 'Not Accepting Posts';
			}
		})
		.catch(function ii(error) {
			logMessage(0, {
				module: moduleName,
				function: functionName,
				category: 'request',
				message: 'Error establishing session for processPost',
				error: error,
				data: {
					id: req.session.id,

				}
			});
			res.writeHead(500, { 'Content-Type': 'text/plain' });
			res.end('Internal Error');

			statsdUtils.computeTimingAndSend(processPostStartTime, 'amorphic.webserver.process_post.response_time', {
				result: 'failure'
			});
		});
}
