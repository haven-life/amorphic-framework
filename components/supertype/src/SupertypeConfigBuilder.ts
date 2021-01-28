import * as nconf from 'nconf';
import {Provider} from 'nconf';


function createNewNConfProvider(): Provider {
    return new nconf.Provider().argv().env({separator: '__'});
}

export interface AppConfigs {[appName: string]: Provider}

/**
 * Deprecating loadFile for just 'file'
 */
export class SupertypeConfigBuilder {

    nconfProvider: Provider;
    constructor() {
        this.nconfProvider = createNewNConfProvider();
    }

    build(rootDir: string): AppConfigs {
        if (!rootDir) {
            throw new Error(`Valid root path expected. rootDir[${rootDir}]`);
        }
        else {
            const configStore: AppConfigs = {};
            let envName = this.nconfProvider.get('APP_ENV');

            if (envName) {
                envName = envName.toLowerCase();
            }

            if (envName) {
                loadConfigFile(this.nconfProvider, 'root_env', rootDir, `config_${envName}.json`);
            }
            loadConfigFile(this.nconfProvider, 'root_secure', rootDir, `config_secure.json`);
            loadConfigFile(this.nconfProvider, 'root', rootDir, `config.json`);


            configStore['root'] = this.nconfProvider;

            const appList = this.nconfProvider.get('applications') || {};

            for (let appKey in appList) {
                configStore[appKey] = buildAppSpecificConfigStore(appList[appKey], rootDir, envName);
            }

            return configStore;
        }
    }
}

function buildAppSpecificConfigStore(app: string, rootDir: string, envName?: string): Provider {
    const appPath = `${rootDir}/${app}`; // Location of the App relative to root
    const appCommonPath = `${rootDir}/apps/common`; // Location of the common folder relative to root

    const appCfgApi = createNewNConfProvider();

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

    return appCfgApi;
}


function loadConfigFile(config: nconf.Provider, name: string, appPath: string, fileName: string) {
    try {
        config.file(name, `${appPath}/${fileName}`);
    }
    catch (err) {
        console.debug(`Error loading ${appPath}/${fileName} to config`);
    }
}