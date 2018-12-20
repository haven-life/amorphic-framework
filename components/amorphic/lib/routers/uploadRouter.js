'use strict';

let url = require('url');
let processFile = require('../routes/processFile').processFile;

/**
 * Purpose unknown
 *
 * @param {unknown} downloads unknown
 * @param {unknown} req unknown
 * @param {unknown} res unknown
 * @param {unknown} next unknown
 */
function uploadRouter(downloads, req, res, next) {
    if (req.originalUrl.match(/amorphic\/xhr\?path\=/) && url.parse(req.originalUrl, true).query.file && req.method === 'POST') {
        processFile(req, res, next, downloads);
    }
    else {
        next();
    }
}

module.exports = {
    uploadRouter: uploadRouter
};
