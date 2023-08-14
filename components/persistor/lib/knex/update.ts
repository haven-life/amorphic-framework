import { RemoteDocService, UploadDocumentResponse } from '../remote-doc/RemoteDocService';
import { PersistorTransaction } from '../types/PersistorTransaction';
import { PersistorUtils } from '../utils/PersistorUtils';

module.exports = function (PersistObjectTemplate) {
    const moduleName = `persistor/lib/knex/update`;
    var Promise = require('bluebird');
    var _ = require('underscore');

    /**
     * Save the object to persistent storage
     *
     * A copy of the object is made which has only the persistent properties
     * and all objects references for objects not stored in the the document
     * replaced by foreign keys.  Arrays of objects not stored in the document
     * are adjusted such that their foreign keys point back to this object.
     * Any related objects stored in other documents are also saved.
     *
     * @param {object} obj  Only required parameter - the object to be saved
     * @param {object} txn transaction object -- can be used only in the end trasaction callback.
     * @param {object} logger object template logger
     * @returns {*}
     */
    PersistObjectTemplate.persistSaveKnex = async function(obj, txn: PersistorTransaction, logger): Promise<any> {
        const functionName = 'persistSaveKnex';
        (logger || this.logger).debug({
            module: moduleName,
            function: functionName,
            category: 'milestone',
            data: {
                template: obj.__template__.__name__, 
                id: obj.__id__, 
                _id: obj._id
            }
        });
        this.checkObject(obj);

        let remoteDocService = null;

        var template = obj.__template__;
        var schema = template.__schema__;
        var templateName = template.__name__;
        var isDocumentUpdate = obj.__version__ ? true : false;
        var props = template.getProperties();
        var promises = [];
        var dataSaved = {};
        let remoteUpdateFns: Array<() => Promise<UploadDocumentResponse>> = [];

        obj._id = obj._id || this.createPrimaryKey(obj);
        var pojo = {_template: obj.__template__.__name__, _id: obj._id};

        /**
         *  Walk through all the properties and copy them to POJO with special treatment for
         *  references to templated objects where we have to maintain foreign key relationships
         */

        for (var prop in props)
        {

            var defineProperty = props[prop];
            var value = obj[prop];

            // Deal with properties we don't plan to save
            if (!this._persistProperty(defineProperty) || !defineProperty.enumerable || typeof(value) == 'undefined' || value == null) {

                // Make sure we don't wipe out foreign keys of non-cascaded object references
                if (defineProperty.type != Array &&
                    defineProperty.type && defineProperty.type.isObjectTemplate &&
                    obj[prop + 'Persistor'] && !obj[prop + 'Persistor'].isFetched && obj[prop + 'Persistor'].id &&
                    !(!schema || !schema.parents || !schema.parents[prop] || !schema.parents[prop].id)) {

                    pojo[schema.parents[prop].id] = obj[prop + 'Persistor'].id;
                    continue;
                }

                if (!this._persistProperty(defineProperty) || !defineProperty.enumerable || typeof(value) == 'undefined')
                    continue;
            }

            // Handle Arrays
            if (defineProperty.type == Array && defineProperty.of.isObjectTemplate)
            {
                // Arrays of Pojos just get saved
                if (!defineProperty.of.__table__) {
                    pojo[prop] = value;

                    // Templated arrays we need to make sure their foreign keys are up-to-date
                } else if (value instanceof Array) {
                    if (!schema.children[prop])
                        throw new Error('Missing children entry for ' + prop + ' in ' + templateName);
                    var childForeignKey = schema.children[prop].id;
                    if (schema.children[prop].filter && (!schema.children[prop].filter.value || !schema.children[prop].filter.property))
                        throw new Error('Incorrect filter properties on ' + prop + ' in ' + templateName);
                    var foreignFilterKey = schema.children[prop].filter ? schema.children[prop].filter.property : null;
                    var foreignFilterValue = schema.children[prop].filter ? schema.children[prop].filter.value : null;
                    value.forEach(function (referencedObj, ix) {

                        if (!referencedObj) {
                            (logger || this.logger).debug({
                                module: moduleName,
                                function: functionName,
                                category: 'milestone',
                                message: obj.__id__ + '.' + prop + '[' + ix + '] is null'
                            });
                            return;
                        }

                        if (!defineProperty.of.__schema__.parents)
                            throw new Error('Missing parent entry in ' + defineProperty.of.__name__ + ' for ' + templateName);

                        // Go through each of the parents in the schema to find the one matching this reference
                        _.each(defineProperty.of.__schema__.parents, function(parentSchemaEntry, parentProp) {

                            if (parentSchemaEntry.id == childForeignKey) {

                                // If anything is missing in the child such as the persistor property not having been
                                // setup or the filter property not being setup, fill in and set it dirty
                                if (!referencedObj[parentProp + 'Persistor'] || !referencedObj[parentProp + 'Persistor'].id ||
                                    referencedObj[parentProp + 'Persistor'].id != obj._id ||
                                    (foreignFilterKey ? referencedObj[foreignFilterKey] != foreignFilterValue : false))
                                {
                                    // Take care of filter property
                                    if (foreignFilterKey)
                                        referencedObj[foreignFilterKey] = foreignFilterValue;

                                    // Force parent pointer
                                    if (referencedObj[parentProp] != obj)
                                        referencedObj[parentProp] = obj;

                                    referencedObj.setDirty(txn);
                                }
                            }
                        })
                        if (!referencedObj._id)
                            referencedObj._id = this.createPrimaryKey(referencedObj);
                    }.bind(this));
                    if (schema.children[prop].pruneOrphans && obj[prop + 'Persistor'].isFetched)
                        promises.push(this.knexPruneOrphans(obj, prop, txn, foreignFilterKey, foreignFilterValue, logger));
                }
                updatePersistorProp(obj, prop + 'Persistor', {isFetching: false, isFetched: true});

                // One-to-One
            } else if (defineProperty.type && defineProperty.type.isObjectTemplate)
            {
                // Make sure schema is in order
                if (!schema || !schema.parents || !schema.parents[prop] || !schema.parents[prop].id)
                    throw   new Error(obj.__template__.__name__ + '.' + prop + ' is missing a parents schema entry');

                var foreignKey = (schema.parents && schema.parents[prop]) ? schema.parents[prop].id : prop;
                let isChanged = value && (!value._id || !value.__version__);
                if (value && !value._id) {
                    value._id = this.createPrimaryKey(value);
                }
                if (isChanged) {
                    value.setDirty(txn);
                }

                pojo[foreignKey] =  value ? value._id : null
                updatePersistorProp(obj, prop + 'Persistor', {isFetching: false, id: value ? value._id : null, isFetched: true})

                dataSaved[foreignKey] = pojo[foreignKey] || 'null';

            } else if (PersistorUtils.isRemoteObjectSetToTrue(this.config && this.config.enableIsRemoteObjectFeature, defineProperty.isRemoteObject)) {
                const uniqueIdentifier = obj._id;

                // contents of the object itself
                const remoteObject: string = obj[prop];

                // MIME type of the object e.g. for a pdf, 'application/pdf'
                // @see https://developer.mozilla.org/en-US/docs/Web/HTTP/Basics_of_HTTP/MIME_types
                const mimeType: string = obj[`${prop}_RemoteMIMEType`];

                if (remoteObject && defineProperty.remoteKeyBase) {
                    remoteDocService = RemoteDocService.new(this.environment, this.remoteDocHostURL);
                    // the contents of the object we want to save in the remote store
                    const documentBody = remoteObject;

                    // unique identifier to find the object we're saving in the remote store
                    const objectKey = `${defineProperty.remoteKeyBase}-${uniqueIdentifier}`;

                    const bucket = this.bucketName;

                    try {
                        (logger || this.logger).debug({
                            module: moduleName,
                            function: functionName,
                            category: 'milestone',
                            message: 'we are uploading the document with params',
                            data: {
                                template: obj.__template__.__name__,
                                documentBody: documentBody,
                                objectKey: objectKey,
                                bucket: bucket,
                                mimeType: mimeType
                            }
                        });
                        // push function to upload the document to remote store
                        remoteUpdateFns.push(() => remoteDocService.uploadDocument(documentBody, objectKey, bucket, mimeType));

                        // only place a reference to the remote object in the database itself - not the actual
                        // contents of the property.
                        pojo[prop] = objectKey;

                        defineProperty.__remoteObjectKey__ = objectKey;

                        log(defineProperty, pojo, prop);
                    } catch (e) {
                        (logger || this.logger).error({
                            module: moduleName,
                            function: functionName,
                            category: 'milestone',
                            message: 'there was a problem uploading the document',
                            error: e,
                            data: {
                                template: obj.__template__.__name__,
                            }
                        });

                        throw e;
                    }
                } else if (remoteObject && !defineProperty.remoteKeyBase) {
                    throw new Error('RemoteObject missing unique identifier key for storage in decorator');
                }
            } else if (defineProperty.type == Array || defineProperty.type == Object) {
                pojo[prop] = (obj[prop] === null || obj[prop] === undefined)  ? null : JSON.stringify(obj[prop]);
                log(defineProperty, pojo, prop);
            } else if (defineProperty.type == Date) {
                pojo[prop] = obj[prop] ? obj[prop] : null;
                log(defineProperty, pojo, prop);
            } else if (defineProperty.type == Boolean) {
                pojo[prop] = obj[prop] == null ? null : (obj[prop] ? true : false);
                log(defineProperty, pojo, prop);
            }  else {
                pojo[prop] = obj[prop];
                log(defineProperty, pojo, prop);
            }
        }
        (logger || this.logger).debug({
            module: moduleName,
            function: functionName,
            category: 'milestone',
            data: {
                activity: 'dataLogging',
                template: obj.__template__.__name__, 
                _id: pojo._id, 
                values: dataSaved
            }
        });

        // changing the order of execution. In the past, for cases without transaction, we saved db first followed by remote doc, if any.
        // In case of connection errors to remote doc server, the db would get saved but the remote docs wouldnt causing a disconnect.
        // Now, we are changing the order of execution to save remote doc first followed by db. This way on db failures, we can delete the docs. 
        // In case of connection issues
        let remoteObjects: Map<any, any> = new Map();
        try {
            // first save documents, if any
            const remoteDocs = remoteUpdateFns.map(
                 (remoteUpdateFn) => remoteUpdateFn()
            );
            if (remoteDocs && remoteDocs.length > 0) {
                const updateData: Array<UploadDocumentResponse> = await Promise.all(remoteDocs);
                setRemoteObjects(updateData, remoteObjects);
            }
            // next, save db records
            promises.push(this.saveKnexPojo(obj, pojo, isDocumentUpdate ? obj._id : null, txn, logger));
            await Promise.all(promises);
        }
        catch(error) {
            // if transaction is used then simply throw as it would be handled appropriately by rollback logic.
            if (txn) {
                throw error;
            }

            //otherwise delete docs, log docs that could not be deleted and then throw;
            let toDeletePromiseArr = [];

            remoteObjects.forEach((versionId: string, key: string) => {
                toDeletePromiseArr.push(
                    remoteDocService.deleteDocument(key, this.bucketName, versionId)
                    .catch(error => {
                        (logger || this.logger).error({
                            module: moduleName,
                            function: functionName,
                            category: 'milestone',
                            message: 'unable to rollback remote document with key:' + key + ' and bucket: ' + this.bucketName,
                            error: {
                                message: error && error.message,
                                stack: error && error.stack,
                                isHumanRelated: false,
                                name: error&& error.name
                            }
                        });
                    })
                );
            });
            await Promise.all(toDeletePromiseArr);
            throw error;
        }
        
        return obj;

        function setRemoteObjects(updateData: Array<UploadDocumentResponse>, remoteObjects: Map<any, any>) {
            
            if (txn && !txn.remoteObjects) {
                txn.remoteObjects = remoteObjects;
            }

            remoteObjects = (txn && txn.remoteObjects) || remoteObjects; 
            for (const update of updateData) {
                remoteObjects.set(update.key, update.versionId);
            }
            
        }

        function log(defineProperty, pojo, prop) {
            if (defineProperty.logChanges)
                dataSaved[prop]  = pojo[prop];
        }
        function copyProps(obj) {
            var newObj = {};
            for (var prop in obj)
                newObj[prop] = obj[prop];
            return newObj;
        }
        function updatePersistorProp(obj, prop, values) {
            if (!obj[prop])
                obj[prop] = {};
            var modified = false;
            _.map(values, function(value, key) {
                if (obj[prop][key] != value) {
                    obj[prop][key] = value;
                    modified = true;
                }
            });
            if (modified)
                obj[prop] = copyProps(obj[prop]);
        }
    }
}