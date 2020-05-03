
import * as url from 'url';
import { processContentRequest } from './routes/processContentRequest';
import { processPost } from './routes/processPost';
import { processLoggingMessage } from './routes/processLoggingMessage';
import { processMessage } from './routes/processMessage';
import { processFile } from './routes/processFile';
import {nonObjTemplatelogLevel} from './types/Constants';
import {getDownloads} from './utils/generateDownloadsDir';
import {NextFunction, Request, Response} from 'express';

/**
 * @TODO: This file is just a middleman for express between AmorphicServer and the ACTUAL routes, clean this up (e.g. delete this file)
 */

/**
 * Download a file from amorphic to send back to the client
 *
 * @param req
 * @param res
 * @param next
 */

export function download(req: Request, res: Response, next: NextFunction) {
    let file = url.parse(req.originalUrl, true).query.file;

    if (req.originalUrl.match(/amorphic\/xhr\?path\=/) && file && req.method === 'GET') {
        processContentRequest(req, res);
    }
    else {
        next();
    }
}

/**
 * Posts to amorphic server using processPost
 *
 * @param req
 * @param res
 * @param next
 */
export function post(req: Request, res: Response, next: NextFunction) {

    if (req.originalUrl.match(/amorphic\/xhr\?path\=/) && url.parse(req.originalUrl, true).query.form && req.method === 'POST') {
        processPost(req, res);
    }
    else {
        next();
    }

}


/**
 * Base router for amorphic routes
 *
 * @param req
 * @param res
 * @param next
 */

export function base(req: Request, res: Response, next: NextFunction) {

    if (req.originalUrl.match(/amorphic\/xhr\?path\=/)) {
        if (req.body.type === 'logging') {
            processLoggingMessage(req, res);
        }
        else {
            processMessage(req, res);
        }
    }
    else {
        next();
    }
}


/**
 * Upload router for amorphic
 *
 * @param req
 * @param res
 * @param next
 */
export function upload(req: Request, res: Response, next: NextFunction) {

    const downloads = getDownloads();

    if (req.originalUrl.match(/amorphic\/xhr\?path\=/) && url.parse(req.originalUrl, true).query.file && req.method === 'POST') {
        processFile(req, res, next, downloads);
    }
    else {
        next();
    }
}