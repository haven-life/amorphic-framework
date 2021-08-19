
var validator = require('validator');

export class InputValidator {
    static readonly blacklistChars:string = '\\[\\]';
    static readonly whitelistChars:string = '^[a-zA-Z0-9]*$';

    /**
     * Purpose unknown
     *
     * @param {unknown} req unknown
     * @param {unknown} _resp unknown
     * @param {unknown} next unknown
     */
    public static validateUrlParams(req: any, _resp: any, next: any) {
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

    public static validateBodyParams(req: any, _resp: any, next: any) {
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

    private static performValidations(value: string) : any {
        value = validator.blacklist(value, InputValidator.blacklistChars);
        value = validator.escape(value);
        value = validator.whitelist(value, InputValidator.whitelistChars);

        return value;
    }
}