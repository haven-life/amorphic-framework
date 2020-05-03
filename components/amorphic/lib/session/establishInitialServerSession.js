'use strict';

let AmorphicContext = require('../AmorphicContext');
let persistor = require('@havenlife/persistor');
let semotus = require('@havenlife/semotus');
let getTemplates = require('../getTemplates').getTemplates;
let getServerConfigString = require('../utils/getServerConfigString').getServerConfigString;
let Bluebird = require('bluebird');
let statsdUtils = require('@havenlife/supertype').StatsdHelper;

/**
 * Initiates a server session if
 *  * We are coming in from amorphicEntry, aka initial page
 *  * We do not already have a session with semotus initialized in semotus
 *  * We have marked createControllerFor, and set it to not equal 'yes'
 *
 *  This will initiate an amorphic session without a controller, so the client can initiate it first
 *  @TODO: Deprecate this pathway. Have all controllers initialized on the server
 *
 * @param {Object} req - Express request object.
 * @param {String} path - The app name.
 *
 * @returns {unknown} unknown
 */
function establishInitialServerSession(req, path) {
    let config = AmorphicContext.getAppConfigByPath(path);

    let establishInitialServerSessionTime = process.hrtime();
    let amorphicOptions = AmorphicContext.amorphicOptions;
    let applicationPersistorProps = AmorphicContext.applicationPersistorProps;

    let {sessionExpiration,
        appVersion,
        initObjectTemplate } = config; // initObjectTemplate - Function that injects properties and functions onto each object template.

    let controllerPath = AmorphicContext.getControllerPath(path); // The path to the main controller js file.

    let match = controllerPath.match(/(.*?)([0-9A-Za-z_]*)\.js$/);
    let prop = match[2];

    // Create a new unique object template utility
    let persistableSemotableTemplate = persistor(null, null, semotus);
    persistableSemotableTemplate.lazyTemplateLoad = config.appConfig.lazyTemplateLoad;

    // Inject into it any db or persist attributes needed for application
    initObjectTemplate(persistableSemotableTemplate);

    // Get the controller and all of it's dependent requires which will populate a
    // key value pairs where the key is the require prefix and and the value is the
    // key value pairs of each exported template

    // Get the templates to be packaged up in the message if not pre-staged
    if (amorphicOptions.sourceMode === 'debug') {
        getTemplates(persistableSemotableTemplate, config.appPath, [prop + '.js'], config, path);
    }

    req.amorphicTracking.addServerTask({name: 'Creating Session without Controller'}, process.hrtime());

    return Bluebird.try(function h() {

        statsdUtils.computeTimingAndSend(establishInitialServerSessionTime, 'amorphic.session.establish_initial_server_session.response_time');

        return {
            appVersion: appVersion,

            getMessage: function gotMessage() {
                return {
                    ver: appVersion,
                    startingSequence: 0,
                    sessionExpiration: sessionExpiration
                };
            },

            getServerConnectString: function i() {
                return JSON.stringify({
                    url: '/amorphic/xhr?path=' + path,
                    message: this.getMessage()
                });
            },

            getServerConfigString: function j() {
                return getServerConfigString(config);
            },

            getPersistorProps: function () {
                return applicationPersistorProps[path] ||
                    (persistableSemotableTemplate.getPersistorProps ? persistableSemotableTemplate.getPersistorProps() : {});
            }
        };
    });
}


module.exports = {
    establishInitialServerSession: establishInitialServerSession
};
