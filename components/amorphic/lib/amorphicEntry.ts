import {ContinuedSessionRet, InitialSessionRet} from './types/AmorphicTypes';
let amorphicContext = require('./AmorphicContext');
let logMessage = require('./utils/logger').logMessage;
let establishServerSession = require('./session/establishServerSession').establishServerSession;
let displayPerformance = require('./utils/displayPerformance').displayPerformance;
import { StatsdHelper } from '@havenlife/supertype';
import {Request, Response, NextFunction} from 'express';


/*
    Set up amorphic for the first time
 */
export async function amorphicEntry(req: Request, res: Response, next: NextFunction) {
    let amorphicEntryTime = process.hrtime();
    let amorphicOptions;
    let applicationSource;
    let applicationSourceMap;
    const session = req.session;

    // If we're not initalizing
    if (!req.originalUrl.match(/amorphic\/init/)) {
        next();
    }

    amorphicOptions = amorphicContext.amorphicOptions;
    applicationSource = amorphicContext.applicationSource;
    applicationSourceMap = amorphicContext.applicationSourceMap;

    logMessage('Requesting ' + req.originalUrl);

    // @ts-ignore
    req.amorphicTracking.loggingContext.session = session.id;

    // Initializing session state here to default values
    Object.assign(session, {sequence: 1, serializationTimeStamp: null, timeout: null, semotus: {}});

    // @ts-ignore
    req.amorphicTracking.loggingContext.ipaddress = (String(req.headers['x-forwarded-for'] || req.connection.remoteAddress)).split(',')[0].replace(/(.*)[:](.*)/, '$2') || 'unknown';

    let time = process.hrtime();
    let appName;

    if (req.originalUrl.match(/([A-Za-z0-9_-]*)\.cached.js.map/)) {
        appName = RegExp.$1;

        // @ts-ignore
        req.amorphicTracking.loggingContext.app = appName;
        res.setHeader('Content-Type', 'application/javascript');
        res.setHeader('Cache-Control', 'public, max-age=31556926');
        res.end(applicationSourceMap[appName]);

        // @ts-ignore
        req.amorphicTracking.addServerTask({name: 'Request Source Map'}, time);
        displayPerformance(req);
    }
    else if (req.originalUrl.match(/([A-Za-z0-9_-]*)\.cached.js/)) {
        appName = RegExp.$1;

        // @ts-ignore
        req.amorphicTracking.loggingContext.app = appName;
        res.setHeader('Content-Type', 'application/javascript');
        res.setHeader('Cache-Control', 'public, max-age=31556926');

        if (amorphicOptions.sourceMode === 'prod') {
            if (req.originalUrl.match(/(\?ver=[0-9]+)/)) {
                res.setHeader('X-SourceMap', '/amorphic/init/' + appName + '.cached.js.map?ver=' + RegExp.$1);
            }
            else {
                res.setHeader('X-SourceMap', '/amorphic/init/' + appName + '.cached.js.map?ver=');
            }
        }

        res.end(applicationSource[appName]);

        // @ts-ignore
        req.amorphicTracking.addServerTask({name: 'Request Compressed Sources'}, time);
        displayPerformance(req);

        StatsdHelper.computeTimingAndSend(amorphicEntryTime, 'amorphic.session.amorphic_entry.response_time');
    }
    else if (req.originalUrl.match(/([A-Za-z0-9_-]*)\.js/)) {
        // This is where you come to when you hit the page the first time
        let url = req.originalUrl;
        appName = RegExp.$1;

        req.amorphicTracking.loggingContext.app = appName;
        logMessage('Establishing ' + appName);

        const retValue: InitialSessionRet | ContinuedSessionRet = await establishServerSession(req, appName, 'initial', false, null);
        let time = process.hrtime();

        if (req.method === 'POST') { // processPost route so continued Server Session

            const amorphicSession: ContinuedSessionRet = retValue as ContinuedSessionRet;
            if (amorphicSession.objectTemplate.controller.processPost) {
                const controllerResp = await amorphicSession.objectTemplate.controller.processPost(req.originalUrl, req.body, req);
                amorphicSession.save(appName, session, req);
                res.writeHead(controllerResp.status, controllerResp.headers || {'Content-Type': 'text/plain'});
                res.end(controllerResp.body || '');

                // @ts-ignore
                req.amorphicTracking.addServerTask({name: 'Application Post'}, time);
                displayPerformance(req);
            }
        } else {
            const amorphicSession: InitialSessionRet = retValue as InitialSessionRet; // Initial Server Session

            res.setHeader('Content-Type', 'application/javascript');
            res.setHeader('Cache-Control', 'public, max-age=0');

            let response = "amorphic.setApplication('" + appName + "');" +
                'amorphic.setSchema(' + JSON.stringify(amorphicSession.getPersistorProps()) + ');' +
                'amorphic.setConfig(' + JSON.stringify(JSON.parse(amorphicSession.getServerConfigString())) + ');' +
                'amorphic.setInitialMessage(' + amorphicSession.getServerConnectString() + ');';

            if (amorphicOptions.sourceMode === 'webpack') {
                res.end(response);
                StatsdHelper.computeTimingAndSend(amorphicEntryTime, 'amorphic.session.amorphic_entry.response_time');
            }
            else if (amorphicOptions.sourceMode !== 'debug') {
                res.end("document.write(\"<script src='" + url.replace(/\.js/, '.cached.js') + "'></script>\");\n" + response);
                StatsdHelper.computeTimingAndSend(amorphicEntryTime, 'amorphic.session.amorphic_entry.response_time');
            }
            else {
                res.end(applicationSource[appName] + response);
                StatsdHelper.computeTimingAndSend(amorphicEntryTime, 'amorphic.session.amorphic_entry.response_time');
            }

            // @ts-ignore
            req.amorphicTracking.addServerTask({name: 'Application Initialization'}, time);
            displayPerformance(req);
        }
    }
}