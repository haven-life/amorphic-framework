'use strict';

import * as unitTestConfig from './unitTestConfig.js'  // TODO: This seems like the wrong way to go about this.
import * as SupertypeDefinition from '@haventech/supertype';
// Passed the main index export.  Will bind the decorators to either Persistor or Semotus
export function bindDecorators (objectTemplate) {

    // TODO: In what situation would objectTemplate be null and why is it acceptable just to use this as a replacement?
    objectTemplate = objectTemplate || this;

    this.Amorphic = objectTemplate;
    this.amorphicStatic = objectTemplate;

    /**
     * Purpose unknown
     *
     * @param {unknown} target unknown
     * @param {unknown} props unknown
     *
     * @returns {unknown} unknown.
     */
    this.supertypeClass = function supertypeClass(target, props) {
        if (objectTemplate.supertypeClass) {
            return objectTemplate.supertypeClass(target, props, objectTemplate);
        }
        else {
            return SupertypeDefinition.supertypeClass(target, props, objectTemplate);
        }
    };

    /**
     * Purpose unknown
     *
     * @returns {unknown} unknown.
     */
    this.Supertype = function Supertype() {
        if (objectTemplate.Supertype) {
            return Reflect.construct( objectTemplate.Supertype, [objectTemplate], this.constructor );
        }
        else {
            return Reflect.construct( SupertypeDefinition.Supertype, [objectTemplate], this.constructor );
        }
    };
    this.Supertype.prototype = SupertypeDefinition.Supertype.prototype;

    /**
     *  Purpose unknown
     *
     * @param {unknown} props unknown
     *
     * @returns {unknown} unknown.
     */
    this.property = function property(props) {
        if (objectTemplate.property) {
            return objectTemplate.property(props, objectTemplate);
        }
        else {
            return SupertypeDefinition.property(props, objectTemplate);
        }
    };

    /**
     * Purpose unknown
     *
     * @param {unknown} defineProperty unknown
     *
     * @returns {unknown} unknown.
     */
    this.remote = function remote(defineProperty) {
        if (objectTemplate.remote) {
            return objectTemplate.remote(defineProperty, objectTemplate);
        }
        else {
            return SupertypeDefinition.remote(defineProperty, objectTemplate);
        }
    };

    /**
     * Purpose unknown
     *
     * @returns {unknown} unknown.
     */
    this.Amorphic.create = function create() {
        objectTemplate.connect = unitTestConfig.startup;

        return objectTemplate;
    };

    this.Amorphic.getInstance = function getInstance() {
        return objectTemplate;
    };
}
