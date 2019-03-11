// Internal modules
let AmorphicContext = require('./AmorphicContext');
let Logger = require('./utils/logger');
let logMessage = Logger.logMessage;
let uploadRouter = require('./routers/uploadRouter').uploadRouter;
let initializePerformance = require('./utils/initializePerformance').initializePerformance;
let amorphicEntry = require('./amorphicEntry').amorphicEntry;
let postRouter = require('./routers/postRouter').postRouter;
let downloadRouter = require('./routers/downloadRouter').downloadRouter;
let router = require('./routers/router').router;
let generateDownloadsDir = require('./utils/generateDownloadsDir').generateDownloadsDir;
let setupCustomRoutes = require('./setupCustomRoutes').setupCustomRoutes;
let setupCustomMiddlewares = require('./setupCustomMiddlewares').setupCustomMiddlewares;

let nonObjTemplatelogLevel = 1;


import * as expressSession from 'express-session';
import * as cookieParser from 'cookie-parser';
import * as express from 'express';
import * as fs from 'fs';
import * as compression from 'compression';
import * as http from 'http';
import * as https from 'https';

type Options = {
    amorphicOptions: any;
    preSessionInject: any;
    postSessionInject: any;
    appList: any;
    appStartList: any;
    appDirectory: any;
    sessionConfig: any;
}

type ServerOptions = https.ServerOptions & {version?: number; securePort?: number; isSecure?: Boolean};
//@TODO: Experiment with app.engine so we can have customizable SSR
export class AmorphicServer {
    app: express.Express;

    routers: { path: string; router: express.Router }[] = [];

    /**
    *
    * @param preSessionInject - callback before server starts up
    * @param postSessionInject - callback after server starts up
    * @param appList - List of strings that are all the apps
    * @param appStartList - List of strings that have the app names for start
    * @param appDirectory - Location of the apps folder
    * @param sessionConfig - Object containing the session config
    */
    static createServer(preSessionInject, postSessionInject, appList, appStartList, appDirectory, sessionConfig) {
        const server = new AmorphicServer(express());
        const amorphicOptions = AmorphicContext.amorphicOptions;
        const mainApp = amorphicOptions.mainApp;
        const appConfig = AmorphicContext.applicationConfig[mainApp];

        const amorphicRouterOptions: Options = {
            amorphicOptions,
            preSessionInject,
            postSessionInject,
            appList,
            appStartList,
            appDirectory,
            sessionConfig
        };

        if (appConfig.appConfig.isDaemon) {
            server.setupUserEndpoints(appDirectory, appList[mainApp]);
        }
        else {
            server.setupAmorphicRouter(amorphicRouterOptions);
        }

        server.app.locals.name = mainApp;

        const serverOptions: ServerOptions = appConfig.appConfig && appConfig.appConfig.serverOptions;

        server.app.locals.version = serverOptions && serverOptions.version;

        // Default port for described
        const port = AmorphicContext.amorphicOptions.port;
        const securePort = serverOptions && serverOptions.securePort;
        const isSecure = serverOptions && serverOptions.isSecure;

        // Secure App (https)
        if (isSecure) {
            const serverOptions = appConfig.appConfig.serverOptions;

            let httpServer;
            // Use a securePort            
            if (securePort) {
                const serverOptions = appConfig.appConfig.serverOptions;
                httpServer = https.createServer(serverOptions, server.app).listen(securePort);
                AmorphicContext.appContext.secureServer = httpServer;
            }

            // Use the default port
            else {
                httpServer = https.createServer(serverOptions, server.app).listen();
                AmorphicContext.appContext.secureServer = httpServer;
            }
        }

        // @TODO: convert to http2 with node-spdy
        // Unsecure App (http)
        AmorphicContext.appContext.server = http.createServer(server.app).listen(port);

        AmorphicContext.appContext.expressApp = server.app;
    }

    /**
    * @TODO: make this a proper class
    *
    * @param {express.Express} app Express server
    **/
    constructor(app: express.Express) {
        this.app = app;
    }

    /**
    * @static
    * @param {string} appDirectory is the directory wher the app is located 
    * @param {AmorphicServer} server
    * @returns {express.Express}
    * @memberof AmorphicServer
    */
    setupStatics(appDirectory: string): express.Express {
        //   TODO: Do we actually need these checks?
        let rootSuperType, rootSemotus, rootBindster;

        if (fs.existsSync(`${appDirectory}/node_modules/supertype`)) {
            rootSuperType = appDirectory;
        }
        else {
            rootSuperType = __dirname;
        }

        if (fs.existsSync(`${appDirectory}/node_modules/semotus`)) {
            rootSemotus = appDirectory;
        }
        else {
            rootSemotus = __dirname
        }

        if (fs.existsSync(`${appDirectory}/node_modules/amorphic-bindster`)) {
            rootBindster = appDirectory;
        }
        else {
            rootBindster = __dirname;
        }

        this.app.use('/modules/', express.static(`${appDirectory}/node_modules`))
            .use('/bindster/', express.static(`${rootBindster}/node_modules/amorphic-bindster`))
            .use('/amorphic/', express.static(`${appDirectory}/node_modules/amorphic`))
            .use('/common/', express.static(`${appDirectory}/apps/common`))
            .use('/supertype/', express.static(`${rootSuperType}/node_modules/supertype`))
            .use('/semotus/', express.static(`${rootSemotus}/node_modules/semotus`));

        return this.app;
    }

    setupAmorphicRouter(options: Options) {
        let { amorphicOptions,
            preSessionInject,
            postSessionInject,
            appList,
            appStartList,
            appDirectory,
            sessionConfig } = options;
        const mainApp = amorphicOptions.mainApp;
        let appConfig = AmorphicContext.applicationConfig[mainApp];
        let reqBodySizeLimit = appConfig.reqBodySizeLimit || '50mb';
        let controllers = {};
        let sessions = {};

        const downloads = generateDownloadsDir();

        /*
         * @TODO: make compression only process on amorphic specific routes
         */
        if (amorphicOptions.compressXHR) {
            this.app.use(compression());
        }

        /*
        * @TODO: Stop exposing this.app through presessionInject and postSessionInject
        *   Only pass in router instead of app
        */
        if (preSessionInject) {
            preSessionInject.call(null, this.app);
        }

        let appPaths: string[] = [];

        /*
         * @TODO: seperate out /appName/ routes to their own expressRouter objects
         * Candidate for future deprecation because we only run app at a time
         */
        for (let appName in appList) {
            if (appStartList.includes(appName)) {

                let appPath = `${appDirectory}/${appList[appName]}/public`;
                appPaths.push(appPath);

                this.app.use(`/${appName}/`, express.static(appPath, { index: 'index.html' }));

                if (appName === mainApp) {
                    this.app.use('/', express.static(appPath, { index: 'index.html' }));
                }

                logMessage(`${appName} connected to ${appPath}`);
            }
        }

        /*
        *  Setting up the general statics
        */
        this.setupStatics(appDirectory);

        /*
         *  Setting up the different middlewares for amorphic
         */
        const cookieMiddleware = cookieParser();
        const expressSesh = expressSession(sessionConfig);
        const bodyLimitMiddleWare = express.json({
            limit: reqBodySizeLimit
        });

        const urlEncodedMiddleWare = express.urlencoded({
            extended: true
        });

        const amorphicRouter: express.Router = express.Router();

        amorphicRouter.use(initializePerformance);
        amorphicRouter.use(cookieMiddleware)
            .use(expressSesh)
            .use(uploadRouter.bind(null, downloads))
            .use(downloadRouter.bind(null, sessions, controllers, nonObjTemplatelogLevel))
            .use(bodyLimitMiddleWare)
            .use(urlEncodedMiddleWare)
            .use(postRouter.bind(null, sessions, controllers, nonObjTemplatelogLevel))
            .use(amorphicEntry.bind(null, sessions, controllers, nonObjTemplatelogLevel));

        if (postSessionInject) {
            postSessionInject.call(null, amorphicRouter);
        }


        amorphicRouter.use(router.bind(null, sessions, nonObjTemplatelogLevel, controllers));
        const amorphicPath = '/amorphic';

        this.app.use(`${amorphicPath}`, amorphicRouter);
        this.routers.push({ path: amorphicPath, router: amorphicRouter });
    }

    setupUserEndpoints(appDirectory, mainApp) {

        let router = setupCustomMiddlewares(appDirectory, mainApp, express.Router());
        router = setupCustomRoutes(appDirectory, mainApp, router);

        let apiPath = '/api';
        if (router) {
            this.app.use(apiPath, router);
            this.routers.push({ path: apiPath, router: router });
        }

        /**
        *   
        * Keep in mind when registering the middlewares be careful!
        * @TODO: when implementing middlewares register error handling from middlewares on APP not ROUTER 
        * https://github.com/expressjs/express/issues/2679
        */
    }

}