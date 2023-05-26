/* Copyright 2012-2013 Sam Elsamman
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
 'use strict';

// Node Modules
import { SupertypeConfig } from '@haventech/supertype';
SupertypeConfig.useAmorphic = true;
import Semotus from '@haventech/semotus';
import { Persistor, Persistable } from '@haventech/persistor';
import { getTemplates } from './lib/getTemplates.js';
import { listen } from './lib/listen.js';
import { startPersistorMode } from './lib/startPersistorMode.js';
import * as typescript from './lib/typescript.js';
import { resolveVersions } from './lib/resolve/resolveVersions.js';

// TODO: This should be a default set in Semotus
Semotus.maxCallTime = 60 * 1000; // Max time for call interlock

// TODO: Figure out what this does
// Typescript standard extends helper
let __extends;

if (this && this.__extends) {
    __extends = this.__extends;
}
else {
    __extends = (function z() {
        let extendStatics;

        if (Object.setPrototypeOf) {
            extendStatics = Object.setPrototypeOf;
        }
        else {
            if ({ __proto__: [] } instanceof Array) {
                extendStatics = function w(d, b) {
                    d.__proto__ = b;
                };
            }
            else {
                extendStatics = function y(d, b) {
                    for (let p in b) {
                        if (b.hasOwnProperty(p)) {
                            d[p] = b[p];
                        }
                    }
                };
            }
        }

        return function x(d, b) {
            extendStatics(d, b);

            function __() {
                this.constructor = d;
            }

            if (b === null) {
                d.prototype = Object.create(b);
            }
            else {
                __.prototype = b.prototype;
                d.prototype = new __();
            }
        };
    })();
}

/**
 * Mixin class implementation
 *
 * @param {unknown} Base unknown
 *
 * @constructor
 *
 * @returns {unknown} unknown.
 */
function Remoteable (Base) {
    return (function n(_super) {
        __extends(classOne, _super);

        function classOne() {
            return _super !== null && Reflect.apply(_super, this, arguments) || this;
        }

        return classOne;
    }(Base));
}
function Bindable (Base) {
    return (function n(_super) {
        __extends(classOne, _super);

        function classOne() {
            return _super !== null && Reflect.apply(_super, this, arguments) || this;
        }

        return classOne;
    }(Base));
}

let toExport = {
    getTemplates: getTemplates,
    listen: listen,
    resolveVersions: resolveVersions,
    startPersistorMode: startPersistorMode,
    Remoteable: Remoteable,
    Bindable: Bindable,
    Persistable: Persistable,
    Persistor: Persistor,
    // Additional decorators added here by the subsequent bindDecorators call
};

// bindDecorators will need to be called before importing templates to bind to the correct
// subtype of ObjectTemplate (either semotus or persistor).  By default we bind to persistor in case
// someone has mocha tests that use the object model.
let bindDecorators = typescript.bindDecorators.bind(toExport);
bindDecorators(Persistor); // For tests

Object.defineProperty(toExport.Remoteable.prototype, 'amorphic', {get: function s() {
    return this.__objectTemplate__;
}});

const { Amorphic, amorphicStatic, supertypeClass, Supertype, property, remote } = toExport;
export { toExport as default, 
    getTemplates, 
    listen, 
    resolveVersions, 
    startPersistorMode, 
    Remoteable, 
    Bindable, 
    Persistable, 
    Persistor, 
    amorphicStatic,
    Amorphic,
    supertypeClass,
    Supertype,
    property,
    remote
};
 