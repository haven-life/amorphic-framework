import {DeleteQuery, PersistorTransaction} from '../../types/PersistorTransaction';
import {IdentifyChanges} from './IdentifyChanges';
import {ChangeTracking, Objects} from '../../types';
// Mappers
export namespace Mappers {

    export async function saveMapper(obj, dirtyObjects: Objects, changeTracking: ChangeTracking, notifyChanges, txn: PersistorTransaction, logger?) {
        delete dirtyObjects[obj.__id__];  // Once scheduled for update remove it.

        if (hasSchema(obj)) { // replace callSave;
            await obj.persistSave(txn, logger);
        }

        let action: string = '';
        if (obj.__version__ === 1) { // insert
            action = 'insert';
        } else {
            action = 'update';
        }
        return IdentifyChanges.generateChanges(obj, action, changeTracking, notifyChanges);
    }


    export async function deleteMapper(obj, deletedObjects: Objects, changeTracking: ChangeTracking, notifyChanges, txn: PersistorTransaction, logger?) {
        delete deletedObjects[obj.__id__];

        if (hasSchema(obj)) {
            await obj.persistDelete(txn, logger); // replace callDelete
        }

        return IdentifyChanges.generateChanges(obj, 'delete', changeTracking, notifyChanges);
    }

    // Persistor Def is typeof Persistor
    export async function deleteQueryMapper(persistorDef, obj: DeleteQuery, deleteQueries: Objects, txn: PersistorTransaction, logger?) {
        delete deleteQueries[obj.__name__];  // Once scheduled for update remove it.

        if (hasSchema(obj)) {
            await persistorDef.deleteFromKnexQuery(obj.__template__, obj.queryOrChains, txn, logger);
        }
    }

    function hasSchema(obj): boolean {
        return !!(obj.__template__ && obj.__template__.__schema__);
    }
}