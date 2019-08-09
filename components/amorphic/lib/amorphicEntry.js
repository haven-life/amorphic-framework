'use strict';

let amorphicContext = require('./AmorphicContext');
let logMessage = require('./utils/logger').logMessage;
let establishServerSession = require('./session/establishServerSession').establishServerSession;
let displayPerformance = require('./utils/displayPerformance').displayPerformance;
let Bluebird = require('bluebird');
let statsdUtils = require('@havenlife/supertype').StatsdHelper;

/*
    Set up amorphic for the first time
 */
function amorphicEntry(sessions, controllers, nonObjTemplatelogLevel, req, resp, next) {
    let amorphicEntryTime = process.hrtime();
    let amorphicOptions;
    let applicationSource;
    let applicationSourceMap;

    // If we're not initalizing
    if (!req.originalUrl.match(/amorphic\/init/)) {
        next();
    }

    amorphicOptions = amorphicContext.amorphicOptions;
    applicationSource = amorphicContext.applicationSource;
    applicationSourceMap = amorphicContext.applicationSourceMap;

    logMessage('Requesting ' + req.originalUrl);

    req.amorphicTracking.loggingContext.session = req.session.id;

    req.amorphicTracking.loggingContext.ipaddress = (String(req.headers['x-forwarded-for'] ||
            req.connection.remoteAddress)).split(',')[0].replace(/(.*)[:](.*)/, '$2') || 'unknown';

    let time = process.hrtime();
    let appName;

    if (req.originalUrl.match(/([A-Za-z0-9_-]*)\.cached.js.map/)) {
        appName = RegExp.$1;

        req.amorphicTracking.loggingContext.app = appName;
        resp.setHeader('Content-Type', 'application/javascript');
        resp.setHeader('Cache-Control', 'public, max-age=31556926');
        resp.end(applicationSourceMap[appName]);

        req.amorphicTracking.addServerTask({name: 'Request Source Map'}, time);
        displayPerformance(req);
    }
    else if (req.originalUrl.match(/([A-Za-z0-9_-]*)\.cached.js/)) {
        appName = RegExp.$1;

        req.amorphicTracking.loggingContext.app = appName;
        resp.setHeader('Content-Type', 'application/javascript');
        resp.setHeader('Cache-Control', 'public, max-age=31556926');

        if (amorphicOptions.sourceMode === 'prod') {
            if (req.originalUrl.match(/(\?ver=[0-9]+)/)) {
                resp.setHeader('X-SourceMap', '/amorphic/init/' + appName + '.cached.js.map?ver=' + RegExp.$1);
            }
            else {
                resp.setHeader('X-SourceMap', '/amorphic/init/' + appName + '.cached.js.map?ver=');
            }
        }

        resp.end(applicationSource[appName]);

        req.amorphicTracking.addServerTask({name: 'Request Compressed Sources'}, time);
        displayPerformance(req);

        statsdUtils.computeTimingAndSend(
            amorphicEntryTime,
            'amorphic.session.amorphic_entry.response_time');
    }
    else if (req.originalUrl.match(/([A-Za-z0-9_-]*)\.js/)) {
        // This is where you come to when you hit the page the first time, like insurify's okta post.'
        let url = req.originalUrl;
        appName = RegExp.$1;

        req.amorphicTracking.loggingContext.app = appName;
        logMessage('Establishing ' + appName);

        establishServerSession(req, appName, 'initial', false, null, sessions, controllers, nonObjTemplatelogLevel)
            .then(function a(session) {
                let time = process.hrtime();
                
                if (req.method === 'POST' && session.objectTemplate.controller.processPost) {
                    
                    Bluebird.resolve(session.objectTemplate.controller.processPost(req.originalUrl, req.body, req))
                        .then(function b (controllerResp) {
                            session.save(appName, req.session, req);

                            resp.writeHead(controllerResp.status, controllerResp.headers
                                || {'Content-Type': 'text/plain'});

                            resp.end(controllerResp.body || '');
                        });

                    req.amorphicTracking.addServerTask({name: 'Application Post'}, time);
                    displayPerformance(req);
                }
                else {
                    resp.setHeader('Content-Type', 'application/javascript');
                    resp.setHeader('Cache-Control', 'public, max-age=0');

                    let response = "amorphic.setApplication('" + appName + "');" +
                    'amorphic.setSchema(' + JSON.stringify(session.getPersistorProps()) + ');' +
                    'amorphic.setConfig(' + JSON.stringify(JSON.parse(session.getServerConfigString())) + ');' +
                    'amorphic.setInitialMessage(' + session.getServerConnectString() + ');';

                    if (amorphicOptions.sourceMode === 'webpack') {
                        resp.end(response);

                        statsdUtils.computeTimingAndSend(
                            amorphicEntryTime,
                            'amorphic.session.amorphic_entry.response_time');
                    }
                    else if (amorphicOptions.sourceMode !== 'debug') {
                        resp.end("document.write(\"<script src='" + url.replace(/\.js/, '.cached.js') +
                            "'></script>\");\n" + response);

                        statsdUtils.computeTimingAndSend(
                            amorphicEntryTime,
                            'amorphic.session.amorphic_entry.response_time');
                    }
                    else {
                        resp.end(applicationSource[appName] + response);

                        statsdUtils.computeTimingAndSend(
                            amorphicEntryTime,
                            'amorphic.session.amorphic_entry.response_time');
                    }

                    req.amorphicTracking.addServerTask({name: 'Application Initialization'}, time);
                    displayPerformance(req);
                }
            });
    }
}

module.exports = {
    amorphicEntry: amorphicEntry
};
