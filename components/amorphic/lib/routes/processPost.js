'use strict';

let url = require('url');
let establishServerSession = require('../session/establishServerSession').establishServerSession;
let Logger = require('../utils/logger');
let logMessage = Logger.logMessage;
let Bluebird = require('bluebird');
let statsdUtils = require('@havenlife/supertype').StatsdHelper;

/**
 * Process a post request by establishing a session and calling the controllers processPost method
 * which can return a response to be sent back
 *
 * @param {unknown} req unknown
 * @param {unknown} res unknown
 * @param {unknown} sessions unknown
 * @param {unknown} controllers unknown
 */

function processPost(req, res, sessions, controllers, nonObjTemplatelogLevel) {
	let processPostStartTime = process.hrtime();

	let session = req.session;
	let path = url.parse(req.originalUrl, true).query.path;

	establishServerSession(req, path, false, false, null, sessions, controllers, nonObjTemplatelogLevel)
		.then(function ff(semotus) {
			let ourObjectTemplate = semotus.objectTemplate;
			let remoteSessionId = req.session.id;

			if (typeof ourObjectTemplate.controller.processPost === 'function') {
				Bluebird.resolve(ourObjectTemplate.controller.processPost(null, req.body, req))
					.then(function gg(controllerResp) {
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
						ourObjectTemplate.logger.info(
							{
								component: 'amorphic',
								module: 'processPost',
								activity: 'error'
							},
							'Error ' + e.message + e.stack
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
			logMessage('Error establishing session for processPost ', req.session.id, error.message + error.stack);
			res.writeHead(500, { 'Content-Type': 'text/plain' });
			res.end('Internal Error');

			statsdUtils.computeTimingAndSend(processPostStartTime, 'amorphic.webserver.process_post.response_time', {
				result: 'failure'
			});
		});
}

module.exports = {
	processPost: processPost
};
