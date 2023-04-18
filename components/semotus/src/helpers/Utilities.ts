// Q Replacement Helpers

import {CallContext} from './Types';

export function delay(ms: number) {
    return new Promise(_ => setTimeout(_, ms));
}

export function defer() {
    const result: { promise?: any, resolve?: any, reject?: any } = {};
    result.promise = new Promise(function (resolve, reject) {
        result.resolve = resolve;
        result.reject = reject;
    });
    return result;
}


/**
 * Helper function to
 *
 * Distinguish between an actual error (will throw an Error object) and a string that the application may
 * throw which is to get piped back to the caller.  For an actual error we want to log the stack trace
 *
 * @param err unknown
 *
 * @returns {*} unknown
 */
export function getError(err) {
    if (err instanceof Error) {
        return {code: 'internal_error', text: 'An internal error occurred'};
    } else {
        if (typeof err === 'string') {
            return {message: err};
        } else {
            return err;
        }
    }
}

export function logTime(callContext: CallContext) {
    return new Date().getTime() -
        callContext.startTime.getTime();
}