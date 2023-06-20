'use strict';

import AmorphicContext from '../AmorphicContext.js';
import persistor from '@haventech/persistor';
import semotus from '@haventech/semotus';
import { getTemplates } from '../getTemplates.js';
import { getServerConfigString } from '../utils/getServerConfigString.js';
import { StatsdHelper as statsdUtils } from '@haventech/supertype';

/**
 * Purpose unknown
 *
 * @param {Object} req - Express request object.
 * @param {String} controllerPath - The path to the main controller js file.
 * @param {Function} initObjectTemplate - Function that injects properties and functions onto each object template.
 * @param {String} path - The app name.
 * @param {unknown} appVersion unknown
 * @param {unknown} sessionExpiration unknown
 * @param {Object} res - Express response object
 *
 * @returns {unknown} unknown
 */
export async function establishInitialServerSession(req, controllerPath, initObjectTemplate, path, appVersion, sessionExpiration, res) {

    let establishInitialServerSessionTime = process.hrtime();

    let amorphicOptions = AmorphicContext.amorphicOptions;
    let applicationConfig = AmorphicContext.applicationConfig;
    let applicationPersistorProps = AmorphicContext.applicationPersistorProps;
    let config = applicationConfig[path];

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
        await getTemplates(persistableSemotableTemplate, config.appPath, [prop + '.js'], config, path);
    }

    req.amorphicTracking.addServerTask({name: 'Creating Session without Controller'}, process.hrtime());

    return Promise.resolve()
        .then(function returnRetInitial() {
            statsdUtils.computeTimingAndSend(establishInitialServerSessionTime,
                'amorphic.session.establish_initial_server_session.response_time');
            return {
                appVersion: appVersion,
                getMessage: function gotMessage() {
                    return {
                        ver: appVersion,
                        startingSequence: 0,
                        sessionExpiration: sessionExpiration
                    };
                    },

                getServerConnectString: function gotServerConnectString() {
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
