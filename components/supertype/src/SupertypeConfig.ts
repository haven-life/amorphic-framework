import * as nconf from 'nconf';
import {Provider} from 'nconf';


function createNewNConfProvider(): Provider {
    return new nconf.Provider().argv().env({separator: '__'});
}

export interface AppConfigs {[appName: string]: SupertypeConfig};

/**
 * Deprecating loadFile for just 'file'
 */
export class SupertypeConfig {

    internalConfigStore: Provider;
    constructor() {
        this.internalConfigStore = createNewNConfProvider();
    }

    /**
     * Gets a value with a key
     *
     * @param key
     * @returns {*}
     */
    get(key) {
        return this.internalConfigStore.get(key);
    }

    /**
     * Sets a value with a key
     *
     * @param key
     * @param value
     * @returns {*}
     */
    set(key, value) {
        return this.internalConfigStore.set(key, value);
    }

    /**
     * Load a configuration file into store
     *
     * @param fileKey
     * @param file
     */
    loadFile(fileKey, file) {
        this.internalConfigStore.file(fileKey, file);
    };


    static build(rootDir: string): AppConfigs {
        const rootConfig = new SupertypeConfig();
        if (!rootDir) {
            throw new Error(`Valid root path expected. rootDir[${rootDir}]`);
        }
        else {
            const configStore: AppConfigs = {};
            let envName = rootConfig.internalConfigStore.get('APP_ENV');

            if (envName) {
                envName = envName.toLowerCase();
            }

            if (envName) {
                loadConfigFile(rootConfig.internalConfigStore, 'root_env', rootDir, `config_${envName}.json`);
            }
            loadConfigFile(rootConfig.internalConfigStore, 'root_secure', rootDir, `config_secure.json`);
            loadConfigFile(rootConfig.internalConfigStore, 'root', rootDir, `config.json`);


            configStore['root'] = rootConfig;

            const appList = rootConfig.internalConfigStore.get('applications') || {};

            for (let appKey in appList) {
                configStore[appKey] = buildAppSpecificConfigStore(appList[appKey], rootDir, envName);
            }

            return configStore;
        }
    }
}

function buildAppSpecificConfigStore(app: string, rootDir: string, envName?: string): SupertypeConfig {
    const appPath = `${rootDir}/${app}`; // Location of the App relative to root
    const appCommonPath = `${rootDir}/apps/common`; // Location of the common folder relative to root

    const config = new SupertypeConfig();
    const appCfgApi = config.internalConfigStore;

    // Load the new app environment values into the config
    if(envName) {
        loadConfigFile(appCfgApi, 'app_env', appPath, `config_${envName}.json`);
    }
    loadConfigFile(appCfgApi, 'app_secure', appPath, `config_secure.json`);
    loadConfigFile(appCfgApi, 'app', appPath, `config.json`);


    // Load the common folder configs to this config provider
    if(envName) {
        loadConfigFile(appCfgApi, 'common_env', appCommonPath, `config_${envName}.json`);
    }
    loadConfigFile(appCfgApi, 'common_secure', appCommonPath, `config_secure.json`);
    loadConfigFile(appCfgApi, 'common', appCommonPath, `config.json`);

    // Load the root values here too
    if(envName) {
        loadConfigFile(appCfgApi, 'root_env', rootDir, `config_${envName}.json`);
    }

    loadConfigFile(appCfgApi, 'root_secure', rootDir, `config_secure.json`);
    loadConfigFile(appCfgApi, 'root', rootDir, `config.json`);

    return config;
}


function loadConfigFile(config: nconf.Provider, name: string, appPath: string, fileName: string) {
    try {
        config.file(name, `${appPath}/${fileName}`);
    }
    catch (err) {
        console.debug(`Error loading ${appPath}/${fileName} to config`);
    }
}