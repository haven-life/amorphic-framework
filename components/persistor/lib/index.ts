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
import * as supertype from '@haventech/supertype';
import { default as apiAction } from './api';
import { default as schemaAction } from './schema';
import { default as utilAction } from './util';
import { default as mongoQueryAction } from './mongo/query';
import { default as mongoUpdateAction } from './mongo/update';
import { default as mongoDbAction } from './mongo/db';
import { default as knexQueryAction } from './knex/query';
import { default as knexUpdateAction } from './knex/update';
import { default as knexDbAction } from './knex/db';
import { amorphicStatic } from './amorphicStatic';

var nextId = 1;
var objectTemplate;
let amorphicStaticObj = amorphicStatic;

const create = function (_ObjectTemplate, _RemoteObjectTemplate, baseClassForPersist) { //@TODO: Why is ObjectTemplate and RemoteObjectTemplate here?
    var PersistObjectTemplate = baseClassForPersist._createObject();

    PersistObjectTemplate.__id__ = nextId++;
    PersistObjectTemplate._superClass = baseClassForPersist; // @TODO: This is not used
    PersistObjectTemplate.DB_Knex = 'knex'; // @TODO: both of these are going to always be the same thing!!!!
    PersistObjectTemplate.DB_Mongo = 'mongo';
    PersistObjectTemplate.dirtyObjects = {};
    PersistObjectTemplate.savedObjects = {};

    apiAction(PersistObjectTemplate, baseClassForPersist);
    schemaAction(PersistObjectTemplate);
    utilAction(PersistObjectTemplate);
    mongoQueryAction(PersistObjectTemplate);
    mongoUpdateAction(PersistObjectTemplate);
    mongoDbAction(PersistObjectTemplate);
    knexQueryAction(PersistObjectTemplate);
    knexUpdateAction(PersistObjectTemplate);
    knexDbAction(PersistObjectTemplate);

    objectTemplate = PersistObjectTemplate;
    PersistObjectTemplate.prototype.amorphicStatic = PersistObjectTemplate;
    amorphicStaticObj = PersistObjectTemplate;
    
    return  PersistObjectTemplate;
}

export default create;

export function supertypeClass(target) {
    if (!objectTemplate) {
        throw new Error('Please create PersisObjectTemplate before importing templates');
    }
    return supertype.supertypeClass(target, objectTemplate)
};

export function Supertype() {
    if (!objectTemplate) {
        throw new Error('Please create PersisObjectTemplate before importing templates');
    }
    return Reflect.construct( supertype.Supertype, [objectTemplate], this.constructor );
};
Object.setPrototypeOf(Supertype.prototype, supertype.Supertype.prototype);

export function property(props) {
    if (!objectTemplate) {
        throw new Error('Please create PersisObjectTemplate before importing templates');
    }
    return supertype.property(props, objectTemplate);
}
export { amorphicStaticObj as amorphicStatic };

const __extends = (function (this: any) {
    if (!this || !this.__extends) {
        var extendStatics = Object.setPrototypeOf ||
                ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
                function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
        return function (d, b) {
            extendStatics(d, b);
            function __() { this.constructor = d; }
            d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
        };
    } else {
        return this.__extends;
    }
}).call(this);

export function Persistable(Base) {
    return (function (_super) {
        __extends(class_1, _super);
        function class_1() {
            return _super !== null && Reflect.apply(_super, this, arguments) || this;
        }
        return class_1;
    }(Base));
}

let ObjectTemplate = supertype.default;
export const Persistor = {
    create: function () {
        return create(ObjectTemplate, null, ObjectTemplate);
    }
}

Object.defineProperty(Persistable.prototype, 'persistor', {get: function () {
    return this.__objectTemplate__;
}});

export { Schema } from './types/Schema';