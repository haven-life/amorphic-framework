import {ConstructorType, ObjectTemplate} from './ObjectTemplate';
import * as serializer from './serializer';

export interface AmorphicPropertyDescriptor extends PropertyDescriptor {
    body?: any;
    of?: any;
    type?: any;
    validate?: any;
    on?: any;
    values?: any;
    descriptions?: any;
    isLocal?: boolean; // May not actually be necessary.
    toClient?: any; // May not actually be necessary.
    toServer?: any; // May not actually be necessary
}

export type AmorphicPropertyDescriptorSet = {[key: string]: AmorphicPropertyDescriptor};


/**
 * This is the base class for typescript classes. 
 * It will inject members into the object from both the template and objectTemplate
 * @param {ObjectTemplate} - other layers can pass in their own object template (this is the object not ObjectTemplate)
 * @returns {Object} the object itself
 */

export class Supertype {
    amorphic : typeof ObjectTemplate;
    static __shadowParent__: typeof Supertype;
    static __shadowChildren__: typeof Supertype[]; // Initialized in Decorators.ts @supertypeClass
    static __injections__: any[]; // Initialized in Decorators.ts @supertypeClass

    /**
     * Get the parent class of this class.
     */
    private static getParent(): typeof Supertype {
        ObjectTemplate.getClasses();
        return this.__shadowParent__;
    }

    /**
     * Get the children classes of this class
     */
    private static getChildren(): (typeof Supertype)[] {
        ObjectTemplate.getClasses();
        return this.__shadowChildren__;
    }

    static __toClient__: boolean;
    static __toServer__: boolean;


    __amorphicprops__: {[key: string]: AmorphicPropertyDescriptor} = {};

    /**
     * Gets the properties that are or would tracked by Amorphic on objects of this Class
     * Ex. The Animal class defines a property called name decorated with an @property. You can find that by doing
     *
     * Animal.defineProperties.name <-- this gives you the propertyDescriptor
     */
    static get defineProperties(): AmorphicPropertyDescriptorSet {
        return this.prototype.__amorphicprops__;
    }

    /**
     * See defineProperties
      */
    static get amorphicProperties(): AmorphicPropertyDescriptorSet {
        return this.prototype.__amorphicprops__;
    }

    /**
     * See getParent
     */
    static get parentTemplate(): typeof Supertype {
        return this.getParent();
    }

    /**
     * See getParent
     * @private
     */
    static get __parent__(): typeof Supertype {
        return this.getParent();
    }

    /**
     * See getParent
     */
    static get amorphicParentClass(): typeof Supertype {
        return this.getParent();
    }

    /**
     * See getChildren
     * @private
     */
    static get __children__(): Array<typeof Supertype> {
        return this.getChildren();
    }

    /**
     * See getChildren
     */
    static get amorphicChildClasses(): Array<typeof Supertype> {
        return this.getChildren();
    }

    /**
     * Creates an instance of this Object from the pojo provided. Can be nested
     * @param pojo
     */
    static fromPOJO<T extends Supertype>(pojo: string): T {
        return ObjectTemplate.fromPOJO(pojo, this);
    }


    /**
     * Amorphic property creation hook, used for the other pieces of Amorphic including Persistor and Semotus
     *
     * Creates shadow properties for tracking
     * @param propertyName
     * @param defineProperty
     */
    static amorphicCreateProperty(propertyName: string, defineProperty: AmorphicPropertyDescriptor) {
        if (defineProperty.body) {
            this.prototype[propertyName] = ObjectTemplate._setupFunction(propertyName, defineProperty.body, defineProperty.on, defineProperty.validate);
        }
        else {
            this.prototype.__amorphicprops__[propertyName] = defineProperty;
            // Create shadow values to determine what has been changed
            if (typeof defineProperty.value in ['string', 'number'] || defineProperty.value == null) {
                Object.defineProperty(this.prototype, propertyName, { enumerable: true, writable: true, value: defineProperty.value });
            }
            else {
                // Create shadow values so eventually we can use this to determine what has been changed
                const propertyIndex = `__${propertyName}`;
                Object.defineProperty(this.prototype, propertyName, {
                    enumerable: true,
                    get: function () {
                        if (!this[propertyIndex]) {
                            this[propertyIndex] =  ObjectTemplate.clone(defineProperty.value, defineProperty.of || defineProperty.type || null);
                        }
                        return this[propertyIndex];
                    },
                    set: function (value) {
                        this[propertyIndex] = value;
                    }
                });
            }
        }
    }

    /**
     * Gets a map of properties -> PropertyDescriptors for this given class
     * @param includeVirtualProperties
     */
    static amorphicGetProperties(includeVirtualProperties?: boolean): AmorphicPropertyDescriptorSet {
        return ObjectTemplate._getDefineProperties(this, undefined, includeVirtualProperties);
    }

    /**
     * See fromJSON
     *
     * @param jsonStr
     * @param idPrefix
     */
    static amorphicFromJSON<T extends Supertype>(jsonStr: string, idPrefix?: any): T{
        return this.fromJSON(jsonStr, idPrefix);
    }

    /**
     * See amorphicCreateProperty
     *
     * @param prop
     * @param defineProperty
     */
    static createProperty(prop: string, defineProperty: AmorphicPropertyDescriptor): void {
        return this.amorphicCreateProperty(prop, defineProperty);
    }

    /**
     * See amorphicGetProperties
     *
     * @param includeVirtualProperties
     */
    static getProperties(includeVirtualProperties?: boolean): AmorphicPropertyDescriptorSet {
        return this.amorphicGetProperties(includeVirtualProperties);
    }

    /**
     * Creates an instance of this class from a JSON represented string
     *
     * @param jsonStr
     * @param idPrefix
     */
    static fromJSON<T extends Supertype>(jsonStr: string, idPrefix?: string): T {
        return ObjectTemplate.fromJSON(jsonStr, this, idPrefix);
    }

    /**
     * Injector is a function passed through to be added to the list of injections of this class
     * @param injector
     */
    static inject (injector: any): void {
        ObjectTemplate.inject(this, injector);
    }

    static amorphicStatic = ObjectTemplate;

    // Object members
    __id__: String;
    amorphicLeaveEmpty: boolean;


    constructor(objectTemplate = ObjectTemplate) {

        // Tell constructor not to execute as this is an empty object
        this.amorphicLeaveEmpty = objectTemplate._stashObject(this, this.constructor);

        // Template level injections that the application may use
        var targetTemplate = this.constructor as typeof Supertype;
        while (targetTemplate) {
            for (var ix = 0; ix < targetTemplate.__injections__.length; ++ix) {
                targetTemplate.__injections__[ix].call(this, this);
            }
            targetTemplate = targetTemplate.__parent__;
        }

        // Global injections used by the framework
        for (var j = 0; j < objectTemplate.__injections__.length; ++j) {
            objectTemplate.__injections__[j].call(this, this);
        }

        this.amorphic = objectTemplate;

        return this;
    }

    /**
     * Converts this object into JSON representation
     * @param cb
     */
    amorphicToJSON(cb?): string {
        return serializer.toJSONString(this, cb);
    }

    /**
     * Get PropertyDescriptor metadata for this property on this object
     * @param prop
     */
    amorphicGetPropertyDefinition(prop: string): AmorphicPropertyDescriptor {
        return ObjectTemplate._getDefineProperty(prop, this.constructor);
    }

    /**
     * Get specifically the 'values' value of the PropertyDescriptor metadata for this property
     *
     * If defineProperty.values is a function, it calls it.
     *
     * 'values' is usually set in the @property decorator as a param on the property
     *
     * @param prop
     */
    amorphicGetPropertyValues(prop: string): any {
        var defineProperty = this.__prop__(prop) || this.__prop__('_' + prop);
    
        if (typeof(defineProperty.values) === 'function') {
            return defineProperty.values.call(this);
        }
        return defineProperty.values;
    }

    /**
     * Get specifically the 'descriptions' value of the PropertyDescriptor metadata for this property
     *
     * If defineProperty.descriptions is a function, it calls it.
     *
     * 'descriptions' is usually set in the @property decorator as a param on the property
     *
     * @param prop
     */
    amorphicGetPropertyDescriptions(prop: string): any {
        var defineProperty = this.__prop__(prop) || this.__prop__('_' + prop);
    
        if (typeof(defineProperty.descriptions) === 'function') {
            return defineProperty.descriptions.call(this);
        }
    
        return defineProperty.descriptions;
    }

    /**
     * Create a copy of this object
     *
     * @param creator is a function that can be leveraged to add custom behavior
     */
    createCopy<T extends Supertype>(creator): T {
        const obj = this;
        return ObjectTemplate.fromPOJO(obj, obj.constructor, null, null, undefined, null, null, creator);
    }

    /**
     * Copy properties of that object into this one.
     *
     * @param obj
     */
    copyProperties(obj) {
        for (var prop in obj) {
            this[prop] = obj[prop];
        }
    }

    /**
     *  See amorphicGetPropertyDefinition
     *
     * @param prop
     * @private
     */
    __prop__(prop: string): AmorphicPropertyDescriptor {
        return this.amorphicGetPropertyDefinition(prop);
    }

    /**
     *  See amorphicGetPropertyValues
     * @param prop
     * @private
     */
    __values__(prop: string): any {
        return this.amorphicGetPropertyValues(prop);
    }

    /**
     *  See amorphicGetPropertyDescriptions
     * @param prop
     * @private
     */
    __descriptions__(prop: string): any {
        return this.amorphicGetPropertyDescriptions(prop);
    }

    /**
     *  See amorphicToJSON
     * @param cb
     */
    toJSONString(cb?) {
        return this.amorphicToJSON(cb)
    }
}