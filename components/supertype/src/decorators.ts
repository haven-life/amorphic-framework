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
    function decorator(target) {
        objectTemplate = objectTemplate || ObjectTemplate;

        target.prototype.__template__ = target;
        target.prototype.amorphicClass = target;
        target.prototype.amorphicGetClassName = function () { return target.__name__ };
        target.isObjectTemplate = true;
        target.__injections__ = [];
        target.__objectTemplate__ = objectTemplate;
        var createProps = objectTemplate.getTemplateProperties(props || {});
        target.__toClient__ = createProps.__toClient__;
        target.__toServer__ = createProps.__toServer__;
        target.__shadowChildren__ = [];

        // Push an array of template references (we can't get at their names now).  Later we will
        // use this to construct __dictionary__
        objectTemplate.__templates__ = objectTemplate.__templates__ || [];
        objectTemplate.__templates__.push(target);


        // We can never reference template functions at compile time which is when this decorator is executed
        // Therefore we have to setup getters for properties that need access to the template functions so
        // that we can ensure they are fully resolved before accessing them
        Object.defineProperty(target, 'defineProperties', { get: defineProperties });
        Object.defineProperty(target, 'amorphicProperties', { get: defineProperties });
        Object.defineProperty(target, '__name__', { get: getName });
        Object.defineProperty(target, 'amorphicClassName', { get: getName });
        Object.defineProperty(target, 'parentTemplate', { get: getParent });
        Object.defineProperty(target, '__parent__', { get: getParent });
        Object.defineProperty(target, '__children__', { get: getChildren });
        Object.defineProperty(target, 'amorphicParentClass', { get: getParent });
        Object.defineProperty(target, 'amorphicChildClasses', { get: getChildren });
        Object.defineProperty(target, 'amorphicStatic', { get: function () { return objectTemplate } });

        target.fromPOJO = function fromPOJO(pojo) {
            return objectTemplate.fromPOJO(pojo, target);
        };

        target.fromJSON = // Legacy
            target.amorphicFromJSON = function fromJSON(str, idPrefix) {
                return objectTemplate.fromJSON(str, target, idPrefix);
            };

        target.getProperties = // Legacy
            target.amorphicGetProperties = function getProperties(includeVirtual) {
                return objectTemplate._getDefineProperties(target, undefined, includeVirtual);
            };

        target.createProperty = // Legacy
            target.amorphicCreateProperty = function (propertyName, defineProperty) {
                if (defineProperty.body) {
                    target.prototype[propertyName] = objectTemplate._setupFunction(propertyName, defineProperty.body,
                        defineProperty.on, defineProperty.validate);
                }
                else {
                    target.prototype.__amorphicprops__[propertyName] = defineProperty;
                    if (typeof defineProperty.value in ['string', 'number'] || defineProperty.value == null) {
                        Object.defineProperty(target.prototype, propertyName,
                            { enumerable: true, writable: true, value: defineProperty.value });
                    }
                    else {
                        Object.defineProperty(target.prototype, propertyName, {
                            enumerable: true,
                            get: function () {
                                if (!this['__' + propertyName]) {
                                    this['__' + propertyName] =
                                        ObjectTemplate.clone(defineProperty.value, defineProperty.of ||
                                            defineProperty.type || null);
                                }
                                return this['__' + propertyName];
                            },
                            set: function (value) {
                                this['__' + propertyName] = value;
                            }
                        });
                    }
                }
            };

        if (target.prototype.__exceptions__) {
            objectTemplate.__exceptions__ = objectTemplate.__exceptions__ || [];
            for (var exceptionKey in target.prototype.__exceptions__) {
                objectTemplate.__exceptions__.push({
                    func: target.prototype.__exceptions__[exceptionKey],
                    class: getName,
                    prop: exceptionKey
                });
            }
        }

        function defineProperties() {
            return target.prototype.__amorphicprops__;
        }
        function getName() {
            return target.toString().match(/function ([^(]*)/)[1];
        }
        function getDictionary() {
            objectTemplate.getClasses();
        }
        function getParent() {
            getDictionary();
            return target.__shadowParent__;
        }
        function getChildren() {
            getDictionary();
            return target.__shadowChildren__;
        }
    }
}


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