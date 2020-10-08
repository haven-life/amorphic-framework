'use strict';

let url = require('url');
let processContentRequest = require('../routes/processContentRequest').processContentRequest;

/**
 * Purpose unknown
 *
 * @param {unknown} sessions unknown
 * @param {unknown} controllers unknown
 * @param {unknown} req unknown
 * @param {unknown} res unknown
 * @param {unknown} next unknown
 */

function downloadRouter(sessions, controllers, nonObjTemplatelogLevel, req, res, next) {
    let file = url.parse(req.originalUrl, true).query.file;

    if (req.originalUrl.match(/amorphic\/xhr\?path\=/) && file && req.method === 'GET') {
        processContentRequest(req, res, sessions, controllers, nonObjTemplatelogLevel);
    }
    else {
        next();
    }
}


module.exports = {
    downloadRouter: downloadRouter
};
