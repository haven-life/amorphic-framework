'use strict';

let amorphicOptions = {
    conflictMode: 'soft',       // Whether to abort changes based on the "old value" matching. Either 'soft', 'hard'
    compressSession: false,     // Whether to compress data going to REDIS
    compressXHR: true,          // Whether to compress XHR responses
    sourceMode: 'debug'         // Whether to minify templates.  Values: 'debug', 'prod' (minify)
};

const ctx = {
    amorphicOptions: amorphicOptions,
    appContext: {},
    applicationConfig: {},
    applicationPersistorProps: {},
    applicationSource: {},
    applicationSourceMap: {},
    applicationTSController: {},
    reset: reset
}

export function reset() {
    ctx.appContext = {};
    ctx.applicationConfig = {};
    ctx.applicationPersistorProps = {};
    ctx.applicationSource = {};
    ctx.applicationSourceMap = {};
    ctx.applicationTSController = {};
}

export default ctx;
