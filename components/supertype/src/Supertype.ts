import {ObjectTemplate} from './ObjectTemplate';
import * as serializer from './serializer';

function constructorName(constructor) {
    var namedFunction = constructor.toString().match(/function ([^(]*)/);
    return namedFunction ? namedFunction[1] : null;
}

export type Constructable = new (...args: any[]) => {};


/**
 * This is the base class for typescript classes. 
 * It will inject members into the object from both the template and objectTemplate
 * @param {ObjectTemplate} - other layers can pass in their own object template (this is the object not ObjectTemplate)
 * @returns {Object} the object itself
 */

export class Supertype {
    __template__: any;
    amorphic : typeof ObjectTemplate;

    static amorphicCreateProperty(prop: String, defineProperty: Object) {
        // Implemented in the decorator @supertypeClass
    }

    static amorphicGetProperties(includeVirtualProperties?: boolean):any {
        // Implemented in the decorator @supertypeClass
    }
    static amorphicFromJSON(json: string) {
        // Implemented in the decorator @supertypeClass
    }
    static createProperty(prop: String, defineProperty: Object) {
        // Implemented in the decorator @supertypeClass
    }
    static getProperties() {
        // Implemented in the decorator @supertypeClass
    }
    amorphicGetClassName () : string {
        // Implemented in the decorator @supertypeClass
        return '';
    }
    static fromJSON (json: string, idPrefix?: string) {
        // Implemented in the decorator @supertypeClass
    
    }

    static inject (injector: any) {
        // Implemented in Line 128, of ObjectTemplate.ts (static performInjections)
    }

    static amorphicProperties: any;
    static amorphicChildClasses: Array<Constructable>;
    static amorphicParentClass: Constructable;
    static amorphicClassName : string;
    static amorphicStatic : typeof ObjectTemplate;

    // Object members
    __id__: String;
    amorphicLeaveEmpty: boolean;

    // Deprecated legacy naming
    static __children__: Array<Constructable>;
    static __parent__: Constructable;
    amorphicClass : any

    constructor(objectTemplate = ObjectTemplate) {
        var template = this.__template__;
        if (!template) {
            throw new Error(constructorName(Object.getPrototypeOf(this).constructor) + ' missing @supertypeClass');
        }

        // Tell constructor not to execute as this is an empty object
        this.amorphicLeaveEmpty = objectTemplate._stashObject(this, template);

        // Template level injections that the application may use
        var targetTemplate = template;
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

        //@TODO: fill the properties of 'this' in? do I need this after deleting the callerContext approach
        // https://github.com/haven-life/supertype/issues/7
        return this;
    }
    amorphicToJSON(cb?){
        return serializer.toJSONString(this, cb);
    } 

    amorphicGetPropertyDefinition(prop) {
        return ObjectTemplate._getDefineProperty(prop, this.__template__);
    }
    amorphicGetPropertyValues(prop) {
        var defineProperty = this.__prop__(prop) || this.__prop__('_' + prop);
    
        if (typeof(defineProperty.values) === 'function') {
            return defineProperty.values.call(this);
        }
        return defineProperty.values;
    }
    amorphicGetPropertyDescriptions(prop) {
        var defineProperty = this.__prop__(prop) || this.__prop__('_' + prop);
    
        if (typeof(defineProperty.descriptions) === 'function') {
            return defineProperty.descriptions.call(this);
        }
    
        return defineProperty.descriptions;
    }

    createCopy(creator) {
        var obj = this;
        return ObjectTemplate.fromPOJO(obj, obj.__template__, null, null, undefined, null, null, creator);
    }

    inject(injector) {
        ObjectTemplate.inject(this, injector);
    }

    copyProperties(obj) {
        for (var prop in obj) {
            this[prop] = obj[prop];
        }
    }
    __prop__(prop) {
        return this.amorphicGetPropertyDefinition(prop);
    }
    __values__(prop) {
        return this.amorphicGetPropertyValues(prop);
    }
    __descriptions__(prop){
        return this.amorphicGetPropertyDescriptions(prop);
    }
    toJSONString(cb?) {
        return this.amorphicToJSON(cb)
    }
}