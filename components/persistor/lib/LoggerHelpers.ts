export namespace LoggerHelpers {
    function getLogger(persistor, logger) {
        return logger || persistor.logger;
    }

    export function debug(persistor, logger, logObj, message) {
        getLogger(persistor, logger).debug(logObj, message);
    }

    export function error(persistor, logger, logObj, message) {
        getLogger(persistor, logger).error(logObj, message);
    }

    export function info(persistor, logger, logObj, message) {
        getLogger(persistor, logger).info(logObj, message);
    }
}