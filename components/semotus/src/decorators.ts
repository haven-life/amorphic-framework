/**
 * Attaches syncStates props to the template
 * If a class is decorated like @supertypeClass({syncStates: ['internal', 'home']}), any instances of that class
 * including those that exist at the beginning of the application, should only be sent over when the controller state on
 * the server indicates that the correct syncState (if and only if controller.syncState = 'home' or 'internal', then an
 * object of this class will be sent, otherwise semotus will refrain from sending it over). The caveat, however, is if
 * semotus' controller's syncState is defined as '*' then we will by default send all templates unless specified other-
 * wise (the same as treating syncState: ['*'])
 *
 */


/**
 * @TODO: This should be consolidated with Supertype's version when we finish converting to typescript
 */

// Context Switch Chain:
// 1st pass: Semotus (sClass) -> Supertype (sClass) -> Semotus (return Ret)
// 2nd pass: Semotus (sClass) -> Semotus (decorator) -> Supertype (eval ret) -> Semotus (return)
export function supertypeClass(objectTemplate, SupertypeModule, target): any {
    let ret;
    let ObjectTemplate = SupertypeModule.default;
    let syncStates: String[] | undefined = undefined;

    // Decorator workerbee
    const decorator = function decorator(target) {
        // second time we must call the function returned the first time because it has the
        // properties as a closure
        if (ret) {
            ret = ret(target, objectTemplate)
        } else {
            ret = SupertypeModule.supertypeClass(target, objectTemplate);
        }

        // Mainly for persistor properties to make sure they get transported
        target.createProperty = function (propertyName, defineProperty) {
            if (defineProperty.body) {
                target.prototype[propertyName] = objectTemplate._setupFunction(
                    propertyName,
                    defineProperty.body,
                    defineProperty.on,
                    defineProperty.validate
                );
            } else {
                target.prototype.__amorphicprops__[propertyName] = defineProperty;
                const value = defineProperty.value;

                // The getter actually initializes the property
                defineProperty.get = function () {
                    let nameSpacedProperty = `__${propertyName}`;

                    if (!this[nameSpacedProperty]) {
                        let cloneTemplate = defineProperty.of || defineProperty.type || null;
                        this[nameSpacedProperty] = ObjectTemplate.clone(value, cloneTemplate);
                    }
                    return this[nameSpacedProperty];
                };

                const defineProperties = {};
                objectTemplate._setupProperty(propertyName, defineProperty, undefined, defineProperties);
                Object.defineProperties(target.prototype, defineProperties);
            }
        };

        // Assigning sync states from prop definition onto the template
        if (syncStates) {
            target.syncStates = syncStates;
        }

        return ret;
    };

    // Calling the decorator processor with the actual Template (2nd time)
    if (target.prototype) {
        return decorator(target);
    } else if (target && target.syncStates && target.syncStates instanceof Array) {
        syncStates = target.syncStates;
    }

    // Called first time with parameters (prop definition) rather than target (template)
    // call supertypes supertypeClass function which will return a function that must be
    // called on the 2nd pass when we have a target. This function's closure will also have a ref to the original properties
    ret = SupertypeModule.supertypeClass(target, objectTemplate);
    return decorator; // decorator will be called 2nd time with ret as a closure
}

export function Supertype(template, objectTemplate, Supertype) {
    return Supertype.call(template, objectTemplate);
}

export function property(objectTemplate, SupertypeModule, props, toClientRuleSet, toServerRuleSet) {
    props = props || {};
    props.toClient = applyRuleSet(props.toClient, toClientRuleSet);
    props.toServer = applyRuleSet(props.toServer, toServerRuleSet);
    const baseDecorator = SupertypeModule.property(props, objectTemplate);
    return function (target, targetKey) {
        baseDecorator(target, targetKey);
        const defineProperties = {};
        props.enumerable = true;
        props.writable = true;
        objectTemplate._setupProperty(targetKey, props, undefined, defineProperties);
        Object.defineProperties(target, defineProperties);
    };
}


export function remote(objectTemplate, defineProperty) {
    defineProperty = defineProperty || {};

    /*
        if we haven't supplied a configuration object into the decorator,
         default the role of this function to a server API function
     */
    if (!defineProperty.on) {
        defineProperty.on = 'server';
    }

    // function that we call to validate any changes for remote calls
    let remoteValidator = defineProperty.serverValidation;

    return function (target, propertyName, descriptor) {
        descriptor.value = objectTemplate._setupFunction(
            propertyName,
            descriptor.value,
            defineProperty.on,
            defineProperty.validate,
            remoteValidator,
            defineProperty.target
        );

        /*
            this function been marked as a server API either explicitly or by default.
            set the appropriate metadata.
         */
        if (defineProperty.on === 'server') {
            descriptor.value.__on__ = 'server';
        }

        if (defineProperty.type) {
            descriptor.value.__returns__ = defineProperty.type;
        }
        if (defineProperty.of) {
            descriptor.value.__returns__ = defineProperty.of;
            descriptor.value.__returnsarray__ = true;
        }
    };
};


function applyRuleSet(prop, ruleSet) {
    if (prop instanceof Array && ruleSet instanceof Array && ruleSet.length > 0) {
        return prop.some(function (r) {
            return ruleSet.indexOf(r) >= 0;
        });
    } else {
        return prop;
    }
}