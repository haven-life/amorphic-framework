import * as validator from 'validator';
import { Request, Response } from 'express';
import * as AmorphicContext from '../AmorphicContext';
import { SupertypeSession } from '@haventech/supertype';
import * as path from 'path';

const moduleName = `${path.basename(__dirname)}/${path.basename(__filename)}`;

export class InputValidator {
    /**
     * Validate URL parameters
     *
     * @param {unknown} req request
     * @param {unknown} _resp response
     * @param {unknown} next unknown
     */
    public static validateUrlParams(req: Request, _resp: Response, next: () => void) {
        if (req.originalUrl) {
            const baseURL =  req.protocol + '://' + req.headers.host + '/';
            const url = new URL(req.originalUrl, baseURL);

            const params = url.searchParams;
            params.forEach((value, key)=> {
                InputValidator.performValidations(value);
            });
        }
        next();
    }

    public static validateBodyParams(req: Request, _resp: Response, next: () => void) {
        if (req.body) {
            if (req.body instanceof Object) {
                // TODO what to do with returned value ?
                //      option 1: compare with original and flag as error?
                //      option 2: sanitize and continue.
                InputValidator.iterateAndValidate(req.body);
            }
        }
        next();
    }

    private static iterateAndValidate(obj: Object) {
        for(var key in obj) {
            if(obj.hasOwnProperty(key)) {
                if(obj[key] instanceof Object) {
                    InputValidator.iterateAndValidate(obj[key]);
                }
                else {
                    // TODO what to do with returned value ?
                    //      option 1: compare with original and flag as error?
                    //      option 2: sanitize and continue.
                    if (typeof(obj[key]) === 'string') {
                        if (validator.isJSON(obj[key])) {
                            const JSONobj = JSON.parse(obj[key]);
                            InputValidator.iterateAndValidate(JSONobj);
                            obj[key] = JSON.stringify(JSONobj);
                        }
                        else {
                            obj[key] = InputValidator.performValidations(obj[key]);
                        }
                    }
                }
            }
        }
    }

    private static logAndCounterValue(originalValue: string, validatedValue: string, validatorLog: boolean, counterField: string, additionalLogs) {
        const functionName = this.logAndCounterValue.name;
        if (validatedValue !== originalValue) {
            const statsdClient = SupertypeSession.statsdClient;
            if(statsdClient
                && statsdClient.counter
                && typeof statsdClient.counter === 'function') { 
                statsdClient.counter(`amorphic.server.validator.${counterField}.counter`, 1);
            }
            if (validatorLog) {
                SupertypeSession.logger.info({
                    module: moduleName,
                    function: functionName,
                    category: 'milestone',
                    data: {
                        activity: 'performValidations',
                        originalValue: originalValue,
                        validatedValue: validatedValue,
                        additionalLogs: additionalLogs
                    }
                });
            }
            return validatedValue;
        }
        return originalValue;
    }

    private static performValidations(value: string): string {
        function getBoolean(configValue) {
            return configValue && configValue.toString().toLowerCase() === 'true';
        }
        const amorphicOptions = AmorphicContext.amorphicOptions;
        const mainApp = amorphicOptions.mainApp;
        const appConfig = AmorphicContext.applicationConfig[mainApp];
        const denyList = appConfig.appConfig.validatorDenyList;
        const allowList = appConfig.appConfig.validatorAllowList;
        const validatorLog = getBoolean(appConfig.appConfig.validatorLog);
        const validatorEscapeHTML = getBoolean(appConfig.appConfig.validatorEscapeHTML);
    
        if (denyList) {
            value = this.logAndCounterValue(value, validator.blacklist(value, denyList), validatorLog, 'blacklist', { denyList: denyList });
        }
        if (validatorEscapeHTML) {
            value = this.logAndCounterValue(value, validator.escape(value), validatorLog, 'escape', {});
        }
        if (allowList) {
            value = this.logAndCounterValue(value, validator.whitelist(value, allowList), validatorLog, 'whitelist', { allowList: allowList });
        }

        return value;
    }
}