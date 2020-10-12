export { Supertype } from './Supertype';
import { ObjectTemplate } from './ObjectTemplate';


import 'reflect-metadata';

/**
    * 
    * @param {*} objectProps- optional property for passing params into supertypeclass, if no params, is undefined,
    *                      first param of this function defaults to objectTemplate instead
    * @param {*} objectTemplate 
    * 
    * @TODO: fix return types
    * https://github.com/haven-life/supertype/issues/6
    */
export function supertypeClass(objectProps?, objectTemplate?): any {

    // When used as @supertypeClass({bla bla bla}), the decorator is first called as it is
    // is being passed into the decorator processor and so it needs to return a function
    // so that it will be called again when the decorators are actually processed.  Kinda spliffy.

    // Called by decorator processor
    if (objectProps.prototype) { // if objectProps is the class (second pass if passed with {toClient style params} or first pass when @supertypeClass no paren and args)
        return decorator(objectProps);
    }

    // Called first time with parameter
    var props = objectProps;
    return decorator;

    // Decorator Workerbee

    /**
     * Target here is the class definition
     * @param target
     */
    function decorator(target) {
        objectTemplate = objectTemplate || ObjectTemplate;
        var createProps = objectTemplate.getTemplateProperties(props || {}, objectTemplate);

        target.prototype.__template__ = target;
        target.isObjectTemplate = true;
        target.__injections__ = [];
        target.__objectTemplate__ = objectTemplate;
        target.__toClient__ = createProps.__toClient__;
        target.__toServer__ = createProps.__toServer__;
        target.__shadowChildren__ = [];
        target.__injections__ = [];


        // Push an array of template references (we can't get at their names now).  Later we will
        // use this to construct __dictionary__
        objectTemplate.__templates__ = objectTemplate.__templates__ || [];
        objectTemplate.__templates__.push(target);
    }
}


/**
 * Target here is the object
 * @param props
 */
export function property(props?): any {
    return function (target, targetKey) {
        props = props || {};
        props.enumerable = true;
        target.__amorphicprops__ = target.hasOwnProperty('__amorphicprops__') ? target.__amorphicprops__ : {};
        var reflectionType = Reflect.getMetadata('design:type', target, targetKey);
        var declaredType = props.type;
        var type = reflectionType !== Array ? declaredType || reflectionType : declaredType;
    // Type mismatches
        if (declaredType && reflectionType && reflectionType !== Array) {
            target.__exceptions__ = target.__exceptions__ || {};
            target.__exceptions__[targetKey] = function (className, prop) {
                return className + '.' + prop + ' - decorator type does not match actual type';
            };
    // Deferred type
        }
        else if (typeof props.getType === 'function') {
            target.__deferredType__ = target.hasOwnProperty('__deferredType__') ? target.__deferredType__ : {};
            target.__deferredType__[targetKey] = props.getType;
            delete props.getType;
        }
        else if (!type) {
            target.__exceptions__ = target.__exceptions__ || {};
            target.__exceptions__[targetKey] = function (className, prop) {
                return className + '.' + prop +
                ' - type is undefined. Circular reference? Try @property({getType: () => {return ' +
                prop[0].toUpperCase() + prop.substr(1) + '}})';

            };
        }
        if (reflectionType === Array) {
            props.type = Array;
            props.of = type;
        }
        else {
            props.type = type;
        }
        target.__amorphicprops__[targetKey] = props;
    };
};

export function remote(defineProperty) {
    return function (target, propertyName, descriptor) {
    }
}