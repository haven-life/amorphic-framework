import {Mappers} from './Mappers';
import {LoggerHelpers} from '../../LoggerHelpers';
import {RollbackS3} from './RollbackS3';
import {ChangeTracking, DeleteQueries, Objects, PersistorTransaction} from '../../types';
import _ = require("underscore");

// Main Transaction executor
export namespace Transaction {


    // Wrapper for transaction function

    export async function transaction(persistorDef, notifyChanges, txn: PersistorTransaction, knexTxn, logger): Promise<void | Error> {
        const {dirtyObjects, touchObjects, savedObjects, deletedObjects, deleteQueries} = txn;
        let changeTracking = {};

        txn.knex = knexTxn;
        try {
            await preSave(txn, logger);
            await saves(dirtyObjects, changeTracking, notifyChanges, txn, logger);
            await deletes(deletedObjects, changeTracking, notifyChanges, txn, logger);
            await deletesQueries(persistorDef, deleteQueries, txn, logger);
            await touches(touchObjects, savedObjects, txn, logger);
            await postSave(txn, changeTracking, logger);
            await commit(persistorDef, txn, knexTxn);
        } catch (err) {
            return await rollback(persistorDef, logger, txn, knexTxn, err);
        }
    }

    // Processor Handlers

    async function preSave(txn: PersistorTransaction, logger) {
        if (txn.preSave) {
            return txn.preSave(txn, logger);
        } else {
            return true;
        }
    }

    async function saves(dirtyObjects: Objects, changeTracking: ChangeTracking, notifyChanges, txn: PersistorTransaction, logger) {

        // Walk through the dirty objects
        const dirtyObjectsArray = _.toArray(dirtyObjects); //@TODO: replace with Object.values
        await Promise.all(dirtyObjectsArray.map((obj) =>
            Mappers.saveMapper(obj, dirtyObjects, changeTracking, notifyChanges, txn, logger)));

        const refreshedDirtyArray = _.toArray(dirtyObjects);
        if (refreshedDirtyArray.length > 0) {
            return saves(dirtyObjects, changeTracking, notifyChanges, txn, logger);
        }
    }

    async function deletes(deletedObjects: Objects, changeTracking: ChangeTracking, notifyChanges, txn: PersistorTransaction, logger) {
        const deletedObjectsArray = _.toArray(deletedObjects);
        await Promise.all(deletedObjectsArray.map((obj) =>
            Mappers.deleteMapper(obj, deletedObjects, changeTracking, notifyChanges, txn, logger)));

        const refreshedDeletedArray = _.toArray(deletedObjects);
        if (refreshedDeletedArray.length > 0) {
            return deletes(deletedObjects, changeTracking, notifyChanges, txn, logger);
        }
    }

    async function deletesQueries(persistorDef, deleteQueries: Objects, txn: PersistorTransaction, logger) {
        const deleteQueriesArray: DeleteQueries = _.toArray(deleteQueries); // @TODO: Is this needed? This is already an array

        await Promise.all(deleteQueriesArray.map((obj) =>
            Mappers.deleteQueryMapper(persistorDef, obj, deleteQueries, txn, logger)));

        const refreshedDeleteQueriesArray = _.toArray(deleteQueries);
        if (refreshedDeleteQueriesArray.length > 0) {
            return deletesQueries(persistorDef, deleteQueries, txn, logger);
        }
    }

    // Walk through the touched objects
    async function touches(touchObjects: Objects, savedObjects: Objects, txn: PersistorTransaction, logger?) {
        const touchObjectsArray = _.toArray(touchObjects);

        return Promise.all(touchObjectsArray.map(async (obj: any) => {
            if (obj.__template__ && obj.__template__.__schema__ && !savedObjects[obj.__id]) {
                return obj.persistTouch(txn, logger);
            }
        }));
    }

    async function postSave(txn: PersistorTransaction, changeTracking: ChangeTracking, logger) {
        if (txn.postSave) {
            return txn.postSave(txn, logger, changeTracking);
        }
    }

    // And we are done with everything. Commit or throw an update conflict if seen
    async function commit(persistorDef, txn: PersistorTransaction, knexTxn) {

        // Reset global state, @TODO: remove this global state
        persistorDef.dirtyObjects = {};
        persistorDef.savedObjects = {};

        // Set through persistSaveKnex -> SaveKnexPojo -> checkUpdateResults
        if (txn.updateConflict) {
            throw 'Update Conflict';
        }

        // commit knex transaction
        return knexTxn.commit();
    }

    // rollback if there's an error while processing any stage of this
    // including just generating the SQL queries / checking the versions
    // or even at the commit step

    // @returns innerError
    async function rollback(persistorDef, logger, txn: PersistorTransaction, knexTxn, err: Error): Promise<Error> {
        const deadlock = err.toString().match(/deadlock detected$/i);
        txn.innerError = err;
        let innerError;

        if (deadlock) {
            innerError = new Error('Update Conflict');
        } else {
            innerError = err;
        }

        // @TODO: What if knex rollback fails? But S3 Works out?
        if (txn.remoteObjects && txn.remoteObjects.size > 0) {
            await RollbackS3.rollbackS3(persistorDef, logger, txn);
        }

        await knexTxn.rollback(innerError);
        const newLogObject = {
            component: 'persistor',
            module: 'api',
            activity: 'end'
        };

        let fromDeadlock = '';
        if (deadlock) {
            fromDeadlock = ' from deadlock';
        }

        LoggerHelpers.debug(persistorDef, logger, newLogObject, `Transaction rolled back ${innerError.message}${fromDeadlock}`);

        return innerError;
    }
}