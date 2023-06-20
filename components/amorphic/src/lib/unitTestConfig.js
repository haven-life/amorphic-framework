'use strict';

import { BuildSupertypeConfig } from '@haventech/supertype';
import * as startApplication from './startApplication.js'

/**
 * Connect to the database
 *
 * @param {unknown} configPath unknown
 * @param {unknown} schemaPath unknown
 *
 * @returns {unknown} unknown.
 */
export function startup(configPath, schemaPath, configStore = null, externalSchemas) {
    if (!configPath) {
        throw new Error('startup(configPath, schemaPath?) called without a config path');
    }

    configStore = configStore != null ? configStore : BuildSupertypeConfig(configPath);
    let config = configStore['root'].get();

    config.nconf = configStore['root']; // Global config
    config.configStore = configStore;
    const schema = startApplication.loadSchema(schemaPath, configPath, externalSchemas);
    
    return startApplication.setUpInjectObjectTemplate('__noapp__', config, schema)
        .then (function a(injectObjectTemplate) {
            return injectObjectTemplate(this);
        }.bind(this))
        .then (function b() {
            this.performInjections();
        }.bind(this));
}
