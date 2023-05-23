'use strict';

import url from 'url';
import { processPost } from '../routes/processPost.js';

/**
 * Purpose unknown
 *
 * @param {unknown} sessions unknown
 * @param {unknown} controllers unknown
 * @param {unknown} req unknown
 * @param {unknown} res unknown
 * @param {unknown} next unknown
 */
export function postRouter(sessions, controllers, nonObjTemplatelogLevel, req, res, next) {

    if (req.originalUrl.match(/amorphic\/xhr\?path\=/) && url.parse(req.originalUrl, true).query.form && req.method === 'POST') {
        processPost(req, res, sessions, controllers, nonObjTemplatelogLevel);
    }
    else {
        next();
    }
}
