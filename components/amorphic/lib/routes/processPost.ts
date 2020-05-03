import * as url from 'url';
import {establishServerSession} from '../session/establishServerSession';
import * as Logger from '../utils/logger';
let logMessage = Logger.logMessage;
import * as Bluebird from 'bluebird';
import {StatsdHelper} from '@havenlife/supertype';
import {ContinuedSession} from '../types/AmorphicTypes'
import {Request, Response} from 'express';


/**
 * Process a post request by establishing a session and calling the controllers processPost method
 * which can return a response to be sent back
 *
 * @param {unknown} req unknown
 * @param {unknown} res unknown
 */

export async function processPost(req: Request, res: Response) {
	let processPostStartTime = process.hrtime();

	let session = req.session;
	let path = url.parse(req.originalUrl, true).query.path;

	try {
		const serverSession: ContinuedSession = await establishServerSession(req, path, false, false, null);
		let ourObjectTemplate = serverSession.objectTemplate;
		let remoteSessionId = req.session.id;
		if (typeof ourObjectTemplate.controller.processPost === 'function')  {
			try {
				const controllerResp = await ourObjectTemplate.controller.processPost(null, req.body, req);
				ourObjectTemplate.setSession(remoteSessionId);
				serverSession.save(path, session, req);
				res.writeHead(
					controllerResp.status,
					controllerResp.headers || { 'Content-Type': 'text/plain' }
				);
				res.end(controllerResp.body);

				StatsdHelper.computeTimingAndSend(
					processPostStartTime,
					'amorphic.webserver.process_post.response_time',
					{ result: 'success' }
				);
			}
			catch (e) {
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

				StatsdHelper.computeTimingAndSend(
					processPostStartTime,
					'amorphic.webserver.process_post.response_time',
					{ result: 'failure' }
				);
			}
		} else {
			throw new Error('Not Accepting Posts');
		}
	} catch (error) {
		logMessage('Error establishing session for processPost '+ req.session.id + '\n' + error.message + '\n' + error.stack);
		res.writeHead(500, { 'Content-Type': 'text/plain' });
		res.end('Internal Error');

		StatsdHelper.computeTimingAndSend(processPostStartTime, 'amorphic.webserver.process_post.response_time', {
			result: 'failure'
		});
	}
}