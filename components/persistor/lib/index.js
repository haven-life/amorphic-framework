/* Copyright 2012-2015 Sam Elsamman
 Permission is hereby granted, free of charge, to any person obtaining
 a copy of this software and associated documentation files (the
 'Software'), to deal in the Software without restriction, including
 without limitation the rights to use, copy, modify, merge, publish,
 distribute, sublicense, and/or sell copies of the Software, and to
 permit persons to whom the Software is furnished to do so, subject to
 the following conditions:

 The above copyright notice and this permission notice shall be
 included in all copies or substantial portions of the Software.

 THE SOFTWARE IS PROVIDED 'AS IS', WITHOUT WARRANTY OF ANY KIND,
 EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
 MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
 NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE
 LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION
 OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION
 WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */

/**
 * SUMMARY: persistObjectTemplate is basically a factory for creating persistable objects
 * persistObjectTemplate is a sublclass for remoteObjectTemplate which allows objects to be
 * persisted in some data store.  The key functions which can only be executed on the server are:
 *
 * - Save an object to a document / table which will either
 *   - create a new document
 *   - update and existing document
 *
 * - Retrieve an object from persistence given either
 *   - A primary key (object id)
 *   - A search criteria
 *   - A primary key reference driven by a relationship with another object
 *
 * All objects have unique ids dispensed by remoteObjectTemplate and these are the
 * id's that are exposed to the client.  The database unique id's are never
 * transported to or from the client to ensure they are not manipulated.
 *
 * The save operation will synchronize a set of related objects.  It does this by
 * determining whether the related objects are dirty, new or removed and performs
 * all appropriate key management and save operations.
 *
 */

/**
 *
 * @param objectTemplate
 * @param RemoteObjectTemplate
 * @param baseClassForPersist
 */
var nextId = 1;
var objectTemplate;
var supertype = require('supertype');

module.exports = function (_ObjectTemplate, _RemoteObjectTemplate, baseClassForPersist) { //@TODO: Why is ObjectTemplate and RemoteObjectTemplate here?
    var PersistObjectTemplate = baseClassForPersist._createObject();

    PersistObjectTemplate.__id__ = nextId++;
    PersistObjectTemplate._superClass = baseClassForPersist; // @TODO: This is not used
    PersistObjectTemplate.DB_Knex = 'knex'; // @TODO: both of these are going to always be the same thing!!!!
    PersistObjectTemplate.DB_Mongo = 'mongo';
    PersistObjectTemplate.dirtyObjects = {};
    PersistObjectTemplate.savedObjects = {};

    require('./api.js')(PersistObjectTemplate, baseClassForPersist);
    require('./schema.js')(PersistObjectTemplate);
    require('./util.js')(PersistObjectTemplate);
    require('./mongo/query.js')(PersistObjectTemplate);
    require('./mongo/update.js')(PersistObjectTemplate);
    require('./mongo/db.js')(PersistObjectTemplate);
    require('./knex/query.js')(PersistObjectTemplate);
    require('./knex/update.js')(PersistObjectTemplate);
    require('./knex/db.js')(PersistObjectTemplate);

    objectTemplate = PersistObjectTemplate;

    return  PersistObjectTemplate;
}

module.exports.supertypeClass = function (target) {
    if (!objectTemplate) {
        throw new Error('Please create PersisObjectTemplate before importing templates');
    }
    return supertype.supertypeClass(target, objectTemplate)
};
module.exports.Supertype = function () {
    if (!objectTemplate) {
        throw new Error('Please create PersisObjectTemplate before importing templates');
    }
    return supertype.Supertype.call(this, objectTemplate);
};
module.exports.Supertype.prototype = supertype.Supertype.prototype;
module.exports.property = function (props) {
    if (!objectTemplate) {
        throw new Error('Please create PersisObjectTemplate before importing templates');
    }
    return supertype.property(props, objectTemplate);
}

var __extends = (this && this.__extends) || (function () {
    var extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();


module.exports.Persistable = function (Base) {
    return (function (_super) {
        __extends(class_1, _super);
        function class_1() {
            return _super !== null && _super.apply(this, arguments) || this;
        }
        return class_1;
    }(Base));
}

module.exports.Persistor = {
    create: function () {return  module.exports(require('supertype'), null, require('supertype'))}
}

Object.defineProperty(module.exports.Persistable.prototype, 'persistor', {get: function () {
    return this.__objectTemplate__
}});
