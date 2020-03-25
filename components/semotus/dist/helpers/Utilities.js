"use strict";
// Q Replacement Helpers
Object.defineProperty(exports, "__esModule", { value: true });
function delay(ms) {
    return new Promise(function (_) { return setTimeout(_, ms); });
}
exports.delay = delay;
function defer() {
    var result = {};
    result.promise = new Promise(function (resolve, reject) {
        result.resolve = resolve;
        result.reject = reject;
    });
    return result;
}
exports.defer = defer;
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
function getError(err) {
    if (err instanceof Error) {
        return { code: 'internal_error', text: 'An internal error occurred' };
    }
    else {
        if (typeof err === 'string') {
            return { message: err };
        }
        else {
            return err;
        }
    }
}
exports.getError = getError;
function logTime(callContext) {
    return new Date().getTime() -
        callContext.startTime.getTime();
}
exports.logTime = logTime;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiVXRpbGl0aWVzLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vc3JjL2hlbHBlcnMvVXRpbGl0aWVzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7QUFBQSx3QkFBd0I7O0FBSXhCLFNBQWdCLEtBQUssQ0FBQyxFQUFVO0lBQzVCLE9BQU8sSUFBSSxPQUFPLENBQUMsVUFBQSxDQUFDLElBQUksT0FBQSxVQUFVLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxFQUFqQixDQUFpQixDQUFDLENBQUM7QUFDL0MsQ0FBQztBQUZELHNCQUVDO0FBRUQsU0FBZ0IsS0FBSztJQUNqQixJQUFNLE1BQU0sR0FBbUQsRUFBRSxDQUFDO0lBQ2xFLE1BQU0sQ0FBQyxPQUFPLEdBQUcsSUFBSSxPQUFPLENBQUMsVUFBVSxPQUFPLEVBQUUsTUFBTTtRQUNsRCxNQUFNLENBQUMsT0FBTyxHQUFHLE9BQU8sQ0FBQztRQUN6QixNQUFNLENBQUMsTUFBTSxHQUFHLE1BQU0sQ0FBQztJQUMzQixDQUFDLENBQUMsQ0FBQztJQUNILE9BQU8sTUFBTSxDQUFDO0FBQ2xCLENBQUM7QUFQRCxzQkFPQztBQUdEOzs7Ozs7Ozs7R0FTRztBQUNILFNBQWdCLFFBQVEsQ0FBQyxHQUFHO0lBQ3hCLElBQUksR0FBRyxZQUFZLEtBQUssRUFBRTtRQUN0QixPQUFPLEVBQUMsSUFBSSxFQUFFLGdCQUFnQixFQUFFLElBQUksRUFBRSw0QkFBNEIsRUFBQyxDQUFDO0tBQ3ZFO1NBQU07UUFDSCxJQUFJLE9BQU8sR0FBRyxLQUFLLFFBQVEsRUFBRTtZQUN6QixPQUFPLEVBQUMsT0FBTyxFQUFFLEdBQUcsRUFBQyxDQUFDO1NBQ3pCO2FBQU07WUFDSCxPQUFPLEdBQUcsQ0FBQztTQUNkO0tBQ0o7QUFDTCxDQUFDO0FBVkQsNEJBVUM7QUFFRCxTQUFnQixPQUFPLENBQUMsV0FBd0I7SUFDNUMsT0FBTyxJQUFJLElBQUksRUFBRSxDQUFDLE9BQU8sRUFBRTtRQUN2QixXQUFXLENBQUMsU0FBUyxDQUFDLE9BQU8sRUFBRSxDQUFDO0FBQ3hDLENBQUM7QUFIRCwwQkFHQyIsInNvdXJjZXNDb250ZW50IjpbIi8vIFEgUmVwbGFjZW1lbnQgSGVscGVyc1xuXG5pbXBvcnQge0NhbGxDb250ZXh0fSBmcm9tICcuL1R5cGVzJztcblxuZXhwb3J0IGZ1bmN0aW9uIGRlbGF5KG1zOiBudW1iZXIpIHtcbiAgICByZXR1cm4gbmV3IFByb21pc2UoXyA9PiBzZXRUaW1lb3V0KF8sIG1zKSk7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBkZWZlcigpIHtcbiAgICBjb25zdCByZXN1bHQ6IHsgcHJvbWlzZT86IGFueSwgcmVzb2x2ZT86IGFueSwgcmVqZWN0PzogYW55IH0gPSB7fTtcbiAgICByZXN1bHQucHJvbWlzZSA9IG5ldyBQcm9taXNlKGZ1bmN0aW9uIChyZXNvbHZlLCByZWplY3QpIHtcbiAgICAgICAgcmVzdWx0LnJlc29sdmUgPSByZXNvbHZlO1xuICAgICAgICByZXN1bHQucmVqZWN0ID0gcmVqZWN0O1xuICAgIH0pO1xuICAgIHJldHVybiByZXN1bHQ7XG59XG5cblxuLyoqXG4gKiBIZWxwZXIgZnVuY3Rpb24gdG9cbiAqXG4gKiBEaXN0aW5ndWlzaCBiZXR3ZWVuIGFuIGFjdHVhbCBlcnJvciAod2lsbCB0aHJvdyBhbiBFcnJvciBvYmplY3QpIGFuZCBhIHN0cmluZyB0aGF0IHRoZSBhcHBsaWNhdGlvbiBtYXlcbiAqIHRocm93IHdoaWNoIGlzIHRvIGdldCBwaXBlZCBiYWNrIHRvIHRoZSBjYWxsZXIuICBGb3IgYW4gYWN0dWFsIGVycm9yIHdlIHdhbnQgdG8gbG9nIHRoZSBzdGFjayB0cmFjZVxuICpcbiAqIEBwYXJhbSBlcnIgdW5rbm93blxuICpcbiAqIEByZXR1cm5zIHsqfSB1bmtub3duXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBnZXRFcnJvcihlcnIpIHtcbiAgICBpZiAoZXJyIGluc3RhbmNlb2YgRXJyb3IpIHtcbiAgICAgICAgcmV0dXJuIHtjb2RlOiAnaW50ZXJuYWxfZXJyb3InLCB0ZXh0OiAnQW4gaW50ZXJuYWwgZXJyb3Igb2NjdXJyZWQnfTtcbiAgICB9IGVsc2Uge1xuICAgICAgICBpZiAodHlwZW9mIGVyciA9PT0gJ3N0cmluZycpIHtcbiAgICAgICAgICAgIHJldHVybiB7bWVzc2FnZTogZXJyfTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHJldHVybiBlcnI7XG4gICAgICAgIH1cbiAgICB9XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBsb2dUaW1lKGNhbGxDb250ZXh0OiBDYWxsQ29udGV4dCkge1xuICAgIHJldHVybiBuZXcgRGF0ZSgpLmdldFRpbWUoKSAtXG4gICAgICAgIGNhbGxDb250ZXh0LnN0YXJ0VGltZS5nZXRUaW1lKCk7XG59Il19