'use strict';

let url = require('url');
let processPost = require('../routes/processPost').processPost;

/**
 * Purpose unknown
 *
 * @param {unknown} sessions unknown
 * @param {unknown} controllers unknown
 * @param {unknown} req unknown
 * @param {unknown} res unknown
 * @param {unknown} next unknown
 */
function postRouter(sessions, controllers, nonObjTemplatelogLevel, req, res, next) {

    if (req.originalUrl.match(/amorphic\/xhr\?path\=/) && url.parse(req.originalUrl, true).query.form && req.method === 'POST') {
        processPost(req, res, sessions, controllers, nonObjTemplatelogLevel);
    }
    else {
        next();
    }
}

module.exports = {
    postRouter: postRouter
};
