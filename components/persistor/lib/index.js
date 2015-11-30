/* Copyright 2012-2015 Sam Elsamman
 Permission is hereby granted, free of charge, to any person obtaining
 a copy of this software and associated documentation files (the
 "Software"), to deal in the Software without restriction, including
 without limitation the rights to use, copy, modify, merge, publish,
 distribute, sublicense, and/or sell copies of the Software, and to
 permit persons to whom the Software is furnished to do so, subject to
 the following conditions:

 The above copyright notice and this permission notice shall be
 included in all copies or substantial portions of the Software.

 THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
 EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
 MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
 NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE
 LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION
 OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION
 WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */

/**
 *
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
var promiseNumber = 1;

module.exports = function (ObjectTemplate, RemoteObjectTemplate, baseClassForPersist)
{
    var PersistObjectTemplate = baseClassForPersist._createObject();

    PersistObjectTemplate.__id__ = nextId++;
    PersistObjectTemplate._superClass = baseClassForPersist;
    PersistObjectTemplate.DB_Knex = 'knex';
    PersistObjectTemplate.DB_Mongo = 'mongo';
    PersistObjectTemplate.dirtyObjects = {};
    PersistObjectTemplate.savedObjects = {};

    PersistObjectTemplate.debug = function (message, type) {
    }

    require("./api.js")(PersistObjectTemplate, baseClassForPersist);
    require("./schema.js")(PersistObjectTemplate);
    require("./util.js")(PersistObjectTemplate);
    require("./mongo/query.js")(PersistObjectTemplate);
    require("./mongo/update.js")(PersistObjectTemplate);
    require("./mongo/db.js")(PersistObjectTemplate);
    require("./knex/query.js")(PersistObjectTemplate);
    require("./knex/update.js")(PersistObjectTemplate);
    require("./knex/db.js")(PersistObjectTemplate);

    return  PersistObjectTemplate;
}