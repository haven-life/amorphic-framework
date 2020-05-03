
import * as url from 'url';
import { processContentRequest } from '../routes/processContentRequest';

/**
 * Purpose unknown
 *
 * @param {unknown} sessions unknown
 * @param {unknown} controllers unknown
 * @param {unknown} req unknown
 * @param {unknown} res unknown
 * @param {unknown} next unknown
 */

export function download(controllers, nonObjTemplatelogLevel) {

    function downloadHandler(req, res, next) {
        let file = url.parse(req.originalUrl, true).query.file;

        if (req.originalUrl.match(/amorphic\/xhr\?path\=/) && file && req.method === 'GET') {
            processContentRequest(req, res, sessions, controllers, nonObjTemplatelogLevel);
        }
        else {
            next();
        }
    }

    return downloadHandler;
}