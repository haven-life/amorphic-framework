import * as url from 'url';
import {establishServerSession} from '../session/establishServerSession';
import {StatsdHelper} from '@havenlife/supertype';
import * as Express from 'express';

/**
 * Processes content requests to download resources from the server
 *
 * @param {unknown} req an
 * @param {unknown} res unknown
 * @param {unknown} controllers unknown
 * @param nonObjTemplatelogLevel
 */
export async function processContentRequest(req: Express.Request, res: Express.Response) {
    const processContentRequestTime = process.hrtime();
    const path = url.parse(req.originalUrl, true).query.path;

    // Never goes through new page flow
    const amorphicSession: ContinuedSession = await establishServerSession(req, path, false, false, null);

    if (typeof(amorphicSession.objectTemplate.controller.onContentRequest) === 'function') {
        amorphicSession.objectTemplate.controller.onContentRequest(req, res);
        StatsdHelper.computeTimingAndSend(processContentRequestTime, 'amorphic.webserver.process_content_request.response_time', { result: 'success' });
    }
}