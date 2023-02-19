"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PersistorUtils = void 0;
var PersistorUtils = /** @class */ (function () {
    function PersistorUtils() {
    }
    PersistorUtils.isRemoteObjectSetToTrue = function (enableIsRemoteObjectFeature, isRemoteObject) {
        if (enableIsRemoteObjectFeature && (enableIsRemoteObjectFeature === true || enableIsRemoteObjectFeature === 'true')) {
            return isRemoteObject && isRemoteObject === true;
        }
        return false;
    };
    PersistorUtils.asyncMap = function (arr, concurrency, callback) {
        var cnt = arr.length / concurrency;
        var p = Promise.resolve([]);
        var start = 0;
        for (var i = 0; i < cnt; i++) {
            p = p.then(function (results) {
                var end = start + concurrency;
                return Promise.all(arr.slice(start, end).map(callback))
                    .then(function (eRes) {
                    start = end;
                    results.push.apply(results, eRes);
                    return results;
                });
            });
        }
        return p;
    };
    PersistorUtils.sleep = function (ms) {
        return new Promise(function (resolve) { return setTimeout(resolve, ms); });
    };
    return PersistorUtils;
}());
exports.PersistorUtils = PersistorUtils;
