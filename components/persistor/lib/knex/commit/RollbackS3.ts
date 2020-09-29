import {RemoteDocService} from '../../remote-doc/RemoteDocService';
import {LoggerHelpers} from '../../LoggerHelpers';
import {PersistorTransaction} from '../../types';

// Rollback S3 Changes
export namespace RollbackS3 {

    // Persistor Def is typeof Persistor
    export async function rollbackS3(persistorDef, logger, txn: PersistorTransaction) {
        LoggerHelpers.info(persistorDef, logger, {
            component: 'persistor',
            module: 'api',
            activity: 'end'
        }, `Rolling back transaction of remote keys`);
        const remoteDocService = RemoteDocService.new(persistorDef.environment);
        const toDeletePromiseArr = [];

        // create our `delete functions` to be run later.
        // also put them in one place => toDeletePromiseArr.

        for (const key of txn.remoteObjects) { // @TODO: how does this work right now? If doesn't work on sets
            toDeletePromiseArr.push(rollbackS3Key(persistorDef, logger, key, remoteDocService));
        }

        // fire off our delete requests in parallel
        await Promise.all(toDeletePromiseArr);
    }

    async function rollbackS3Key(persistorDef, logger, key, remoteDocService: RemoteDocService) {
        try {
            await remoteDocService.deleteDocument(key, persistorDef.bucketName);
        } catch (e) {
            const newLogObj = {component: 'persistor', module: 'api', activity: 'end', error: e};
            LoggerHelpers.error(persistorDef, logger, newLogObj, `Unable to rollback remote document with key: ${key} and bucket: ${persistorDef.bucketName}`);
        }
    }
}