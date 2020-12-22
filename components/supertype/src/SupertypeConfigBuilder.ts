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
                this.nconfProvider.file('root_env', `${rootDir}/config_${envName}.json`);
            }

            this.nconfProvider.file('root_secure', `${rootDir}/config_secure.json`);
            this.nconfProvider.file('root', `${rootDir}/config.json`);

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
        appCfgApi.file('app_env', `${appPath}/config_${envName}.json`);
    }
    appCfgApi.file('app_secure', `${appPath}/config_secure.json`);
    appCfgApi.file('app', `${appPath}/config.json`);

    // Load the common folder configs to this config provider
    if(envName) {
        appCfgApi.file('common_env', `${appCommonPath}/config_${envName}.json`);
    }
    appCfgApi.file('common_secure', `${appCommonPath}/config_secure.json`);
    appCfgApi.file('common', `${appCommonPath}/config.json`);

    // Load the root values here too
    if(envName) {
        appCfgApi.file('root_env', `${rootDir}/config_${envName}.json`);
    }
    appCfgApi.file('root_secure', `${rootDir}/config_secure.json`);
    appCfgApi.file('root', `${rootDir}/config.json`);

    return appCfgApi;
}