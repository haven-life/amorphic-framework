import * as validator from 'validator';
import { Request, Response } from 'express';

export class InputValidator {
    static readonly denyList: string = '\\[\\]';
    static readonly allowList: string = '^[a-zA-Z0-9]*$';

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
                    if (obj[key]) {
                        // TODO what to do with returned value ?
                        //      option 1: compare with original and flag as error?
                        //      option 2: sanitize and continue.
                        InputValidator.performValidations(obj[key].toString());
                    }
                }
            }
        }
    }

    private static performValidations(value: string): string {
        value = validator.blacklist(value, InputValidator.denyList);
        value = validator.escape(value);
        value = validator.whitelist(value, InputValidator.allowList);

        return value;
    }
}