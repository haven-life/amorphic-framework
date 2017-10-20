module.exports = function (PersistObjectTemplate) {

    var Promise = require('bluebird');
    var _ = require('underscore');
    var schemaValidator = require('tv4');

    PersistObjectTemplate.ObjectID = require('mongodb-bluebird').mongodb.ObjectID;

    PersistObjectTemplate.createTransientObject = function (cb) {
        var currentState = this.__transient__;
        this.__transient__ = true;
        var obj = null;
        if (typeof(cb) === 'function') {
            obj = cb();
        }
        this.__transient__ = currentState || false;
        return obj;
    };

    PersistObjectTemplate.saved = function (obj, txn) {
        delete obj['__dirty__'];
        delete obj['__changed__'];
        var savedObjects = txn ? txn.savedObjects : this.savedObjects;
        if (savedObjects)
            savedObjects[obj.__id__] = obj;
    };

    /**
     * Walk one-to-one links to arrive at the top level document
     * @param {Supertype} obj - subdocument object to start at
     * @returns {Supertype}
     */
    PersistObjectTemplate.getTopObject = function(obj) {
        var idMap = {};
        function traverse(obj) {
            idMap[obj.__id__] = obj;
            if (obj.__template__.__schema__.documentOf)
                return obj;
            var props = obj.__template__.getProperties();
            for (var prop in props) {
                var type = props[prop].type;
                var value = obj[prop];
                if (type && value && value.__id__ && !idMap[value.__id__]) {
                    var traversedObj = traverse(value);
                    if (traversedObj)
                        return traversedObj;
                }
            }
            return false;
        }
        return traverse(obj);
    };

    /**
     * Walk through all objects in a document from the top
     * @param {Supertype} obj - subdocument object to start at
     * @param {function} callback - to add any custom behavior
     * @returns {Supertype}
     */
    PersistObjectTemplate.enumerateDocumentObjects = function(obj, callback) {

        var idMap = {};
        return traverse(obj);

        function traverse(obj) {
            if (!obj)
                return;
            callback.call(null, obj);
            var props = obj.__template__.getProperties();
            _.map(props, function (defineProperty, prop) {
                if (defineProperty.type == Array && defineProperty.of && defineProperty.of.isObjectTemplate)
                    if (!idMap[obj.__id__ + '-' + prop]) {
                        idMap[obj.__id__ + '-' + prop] = true;
                        _.map(obj[prop], function (value) {
                            traverse(value, obj, prop);
                        })
                    }

                if (defineProperty.type && defineProperty.type.isObjectTemplate) {
                    if (obj[prop]) {
                        if (!idMap[obj.__id__ + '-' + prop]) {
                            idMap[obj.__id__ + '-' + prop] = true;
                            traverse(obj[prop], obj, prop);
                        }
                    }
                }
            });
        }
    };

    PersistObjectTemplate.getTemplateByCollection = function (collection) {
        for (var prop in this._schema)
            if (this._schema[prop].documentOf == collection)
                return this.getTemplateByName(prop);
        throw new Error('Cannot find template for ' + collection);
    };

    PersistObjectTemplate.checkObject = function (obj) {
        if (!obj.__template__)
            throw new Error('Attempt to save an non-templated Object');
        if (!obj.__template__.__schema__)
            throw  new Error('Schema entry missing for ' + obj.__template__.__name__);
    };

    PersistObjectTemplate.createPrimaryKey = function (obj) {
        var key = (new PersistObjectTemplate.ObjectID).toString();
        if (PersistObjectTemplate.objectMap && !obj.__transient__)
            PersistObjectTemplate.objectMap[key] = obj.__id__;
        return key;
    };

    PersistObjectTemplate.getObjectId = function (_template, pojo, prefix) {
        if (PersistObjectTemplate.objectMap && PersistObjectTemplate.objectMap[pojo[prefix + '_id'].toString()])
            return PersistObjectTemplate.objectMap[pojo[prefix + '_id'].toString()];
        else
            return 'persist' + '-' + pojo[prefix + '_template'].replace(/.*:/, '') + '-' + pojo[prefix + '_id'].toString()
    };

    PersistObjectTemplate._persistProperty = function(defineProperty) {
        if (defineProperty.persist == false || defineProperty.isLocal == true)
            return false;
        else
            return true;
    };

    /* Mongo implementation of open */
    PersistObjectTemplate.getDB = function(alias)
    {
        if (!this._db)
            throw  new Error('You must do PersistObjectTempate.setDB()');
        if (!this._db[alias || '__default__'])
            throw  new Error('DB Alias ' + alias + ' not set with corresponding PersistObjectTempate.setDB(db, type, alias)');

        return this._db[alias || '__default__'];
    };

    PersistObjectTemplate.dealias = function (collection) {
        return collection.replace(/\:.*/, '').replace(/.*\//, '')
    };

    PersistObjectTemplate.getDBAlias = function (collection) {
        if (!collection)
            return '__default__';
        return collection.match(/(.*)\//) ? RegExp.$1 : '__default__'
    };

    PersistObjectTemplate.getDBID = function (masterId)
    {
        if (!masterId)
            return new this.ObjectID();
        else
            return masterId.toString() + ':' + new this.ObjectID().toString();

    };

    PersistObjectTemplate.resolveRecursivePromises = function(promises, returnValue) {
        var promisesToResolve = promises.length;
        return Promise.all(promises).then(function() {
            promises.splice(0, promisesToResolve);
            return promises.length > 0 ? PersistObjectTemplate.resolveRecursivePromises(promises, returnValue)
                : Promise.resolve(returnValue);
        });
    }

    PersistObjectTemplate.getCurrentOrDefaultTransaction = function getCurrentOrDefault(current) {
        var txn;
        if (current !== null) {
            txn = current || PersistObjectTemplate.__defaultTransaction__;
        }
        return txn;
    }

    PersistObjectTemplate._validateParams = function validateParams(options, schema, template) {
        if (!options) {
            return;
        }
        var schemas = {
            'persistSchema': {
                'type': 'object',
                'additionalProperties': false,
                'properties': {
                    'transaction': {
                        type: ['null', 'object']
                    },
                    'cascade': {
                        type: 'boolean'
                    },
                    'logger': {
                        type: ['null', 'object']
                    }
                }
            },
            'fetchSchema': {
                'type': 'object',
                'additionalProperties': false,
                'properties': {
                    'fetch': {
                        type: ['null', 'object']
                    },
                    'start': {
                        type: 'number'
                    },
                    'limit': {
                        type: 'number'
                    },
                    'order': {
                        type: ['null', 'object']
                    },
                    'transient': {
                        type: 'boolean'
                    },
                    'session': {
                        type: ['null', 'object']
                    },
                    'logger': {
                        type: ['null', 'object']
                    },
                    'enableChangeTracking' : {
                        type: 'boolean'
                    }
                }
            },
            'commitSchema': {
                'type': 'object',
                'additionalProperties': false,
                'properties': {
                    'transaction': {
                        type: ['null', 'object']
                    },
                    'logger': {
                        type: ['null', 'object']
                    },
                    'notifyChanges': {
                        type: 'boolean'
                    }
                }
            },
            'fetchSpec': {}
        };
        var valid = schemaValidator.validate(options, schemas[schema]);
        if (!valid) {
            throw new Error('Parameter validation failed, ' + (schemaValidator.error.dataPath !== '' ? 'Field: '
                    + schemaValidator.error.dataPath + ', ' : '')
                + 'Validation error: ' + schemaValidator.error.message);
        }

        if (schema === 'fetchSchema' && !!options.fetch) {
            validateFetchSpec(template);
        }

        function validateFetchSpec(template) {
            var validSpecs = PersistObjectTemplate._validFetchSpecs || {};
            //if the fetch spec currently used for the same template is already used, no need to valid again..
            if (!validSpecs[template.__name__] || !validSpecs[template.__name__][JSON.stringify(options.fetch).replace(/\"|\{|\}/g, '')]) {
                fetchPropChecks(options.fetch, template, template.__name__);
                validSpecs[template.__name__] = validSpecs[template.__name__] || {};
                validSpecs[template.__name__][JSON.stringify(options.fetch).replace(/\"|\{|\}/g, '')] = {};
                PersistObjectTemplate._validFetchSpecs = validSpecs;
            }

            function fetchPropChecks(fetch, template, name) {
                Object.keys(fetch).map(function(key) {
                    var keyTemplate = isFetchKeyInDefineProperties(key, template);
                    if (keyTemplate) {
                        if (!fetch[key].fetch) return;
                        fetchPropChecks(fetch[key].fetch, keyTemplate, keyTemplate.__name__)
                    }
                    else {
                        throw new Error('key used ' + key + ' is not a valid fetch key for the template ' + name);
                    }
                });
            }

            function getKeyTemplate(template) {
                if (template.type && template.type.isObjectTemplate) {
                    return template.type;
                }
                else if (template.of && template.type === Array && template.of.isObjectTemplate) {
                    return template.of;
                }
            }

            function isFetchKeyInDefineProperties(key, template) {
                var templateProperties = template.getProperties();
                if (key in templateProperties) {
                    return getKeyTemplate(templateProperties[key]);
                }
                else {
                    return template.__children__.reduce(function(keyTemplate, child) {
                        return keyTemplate || isFetchKeyInDefineProperties(key, child)
                    }, null);
                }

                return null;
            }
        }

    }
};