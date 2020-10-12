import * as serializer from './serializer';
import { SupertypeLogger } from './SupertypeLogger';
import { StatsdClientInterface } from './StatsdClientInterface';
export type CreateTypeForName = {
    name?: string;
    toClient?: boolean;
    toServer?: boolean;
    isLocal?: boolean;
}

export type Getter = {
    get: any;
}

/**
 * this is pretty much the class (the template itself)
 * Try to unify this with the Supertype Type (maybe make this a partial, have supertype extend this)
 */
export type ConstructorTypeBase = Function & {
    __shadowParent__: any;
    props?: any;
    __parent__: any;
    __createParameters__: any;
    functionProperties: any;
    isObjectTemplate: any;
    extend: any;
    staticMixin: any;
    mixin: any;
    fromPOJO: any;
    fromJSON: any;
    getProperties: (includeVirtual) => any;
    prototype: any;
    defineProperties: any;
    objectProperties: any;
    parentTemplate: any;
    createProperty: any;
    __injections__: any;
}

export interface ConstructorType extends ConstructorTypeBase {
    new();
}

export type ObjectTemplateClone = typeof ObjectTemplate;


/**
 * Allow the property to be either a boolean a function that returns a boolean or a string
 * matched against a rule set array of string in ObjectTemplate
 *
 * @param  prop unknown
 * @param ruleSet unknown
 *
 * @returns {function(this:ObjectTemplate)}
 */
function processProp(prop, ruleSet) {
    var ret = null;

    if (typeof (prop) === 'function') {
        ret = prop.call(ObjectTemplate);
    }
    else if (typeof (prop) === 'string') {
        ret = false;

        if (ruleSet) {
            ruleSet.map(function i(rule) {
                // this will always execute
                if (!ret) {
                    // double equals or single equals?
                    ret = rule == prop;
                }
            });
        }
    }
    else if (prop instanceof Array) {
        prop.forEach(function h(prop) {
            ret = ret || processProp(prop, ruleSet);
        });
    }
    else {
        ret = prop;
    }

    return ret;
}

/**
 * the og ObjectTemplate, what everything picks off of
 */
export class ObjectTemplate {

    static lazyTemplateLoad: any;
    static isLocalRuleSet: any;
    static nextId: any; // for stashObject

    static __templates__: ConstructorType[];
    static toServerRuleSet: string[];
    static toClientRuleSet: string[];

    static templateInterceptor: any;
    static __dictionary__: { [key: string]: ConstructorType };
    static __anonymousId__: number;
    static __templatesToInject__: {};
    static logger: any;
    logger: SupertypeLogger;
    static __templateUsage__: any;
    static __injections__: Function[];
    static __toClient__: boolean;
    static __statsdClient__: StatsdClientInterface;
    static amorphicStatic = ObjectTemplate;

    /**
     * Gets the statsDClient
     *
     * The statsDClient may be on the amorphic object, but it will always
     * redirect instead to the statsReference on amorphicStatic
     *
     * @static
     * @type {(StatsDClient | undefined)}
     * @memberof ObjectTemplate
     */
    static get statsdClient(): StatsdClientInterface {
        return this.amorphicStatic.__statsdClient__;
    }

    /**
     * Sets the statsDClient reference on amorphicStatic
     *
     * @static
     * @type {(StatsDClient | undefined)}
     * @memberof ObjectTemplate
     */
    static set statsdClient(statsClient: StatsdClientInterface) {
        this.amorphicStatic.__statsdClient__ = statsClient;
    }

    /**
     * Purpose unknown
     */
    static performInjections() {
        this.getClasses();
        if (this.__templatesToInject__) {
            const objectTemplate = this;

            for (const templateName in this.__templatesToInject__) {
                const template = this.__templatesToInject__[templateName];
                this._injectIntoTemplate(template);
            }
        }
    }

    static init() {
        this.__templateUsage__ = {};
        this.__injections__ = [];
        this.__dictionary__ = {};
        this.__anonymousId__ = 1;
        this.__templatesToInject__ = {};
        this.logger = this.logger || this.createLogger(); // Create a default logger
    }

    /**
     * Purpose unknown
     *
     * @param {unknown} props unknown
     *
     * @returns {unknown}
     */
    static getTemplateProperties(props) {
        let templateProperties: { __toClient__?: any; __toServer__?: any } = {};

        if (ObjectTemplate.__toClient__ == false) {
            props.toClient = false;
        }

        if (processProp(props.isLocal, this.isLocalRuleSet)) {
            props.toServer = false;
            props.toClient = false;
        }

        templateProperties.__toClient__ = processProp(props.toClient, this.toClientRuleSet) != false;
        templateProperties.__toServer__ = processProp(props.toServer, this.toServerRuleSet) != false;

        return templateProperties;
    }

    /**
     * Add a function that will fire on object creation
     *
     * @param {unknown} template unknown
     * @param {Function} injector unknown
     */
    static inject(template, injector: Function) {
        template.__injections__.push(injector);
    }

    /**
     * Add a function that will fire on all object creations (apparently)? Just a guess
     *
     * @param {Function} injector - unknown
     */
    static globalInject(injector: Function) {
        this.__injections__.push(injector);
    }

    static getClasses() {
        if (this.__templates__) {
            for (let ix = 0; ix < this.__templates__.length; ++ix) {
                var template = this.__templates__[ix];
                this.__dictionary__[template.name] = template;
                this.__templatesToInject__[template.name] = template;
                processDeferredTypes(template);
            }
            this.__templates__ = undefined;
            for (const templateName1 in this.__dictionary__) {
                var template = this.__dictionary__[templateName1];
                const parentTemplateName = Object.getPrototypeOf(template.prototype).constructor.name;
                template.__shadowParent__ = this.__dictionary__[parentTemplateName];
                if (template.__shadowParent__) {
                    template.__shadowParent__.__shadowChildren__.push(template);
                }
                template.props = {};
                const propst = ObjectTemplate._getDefineProperties(template, undefined, true);
                for (const propd in propst) {
                    template.props[propd] = propst[propd];
                }
            }
        }

        function processDeferredTypes(template) {
            if (template.prototype.__deferredType__) {
                for (const prop in template.prototype.__deferredType__) {
                    const defineProperty = template.defineProperties[prop];
                    if (defineProperty) {
                        const type = template.prototype.__deferredType__[prop]();
                        if (defineProperty.type === Array) {
                            defineProperty.of = type;
                        }
                        else {
                            defineProperty.type = type;
                        }
                    }
                }
            }
        }
        return this.__dictionary__;
    }

    /**
     * Overridden by other Type Systems to cache or globally identify objects
     * Also assigns a unique internal Id so that complex structures with
     * recursive objects can be serialized
     *
     * @param {unknown} obj - the object to be passed during creation time
     * @param {unknown} template - unknown
     *
     * @returns {unknown}
     *
     * @private
     */
    static _stashObject(obj, template) {
        if (!obj.__id__) {
            if (!ObjectTemplate.nextId) {
                ObjectTemplate.nextId = 1;
            }

            obj.__id__ = 'local-' + template.name + '-' + ++ObjectTemplate.nextId;
        }

        return false;
    }


    /**
     * Overridden by other Type Systems to inject other elements
     *
     * @param {_template} _template - the object to be passed during creation time
     *
     * @private
     * */
    static _injectIntoTemplate(_template) { };

    /**
     * Used by template setup to create an property descriptor for use by the constructor
     *
     * @param {unknown} propertyName is the name of the property
     * @param {unknown} defineProperty is the property descriptor passed to the template
     * @param {unknown} objectProperties is all properties that will be processed manually.  A new property is
     *                         added to this if the property needs to be initialized by value
     * @param {unknown} defineProperties is all properties that will be passed to Object.defineProperties
     *                         A new property will be added to this object
     *
     * @private
     */
    static _setupProperty(propertyName, defineProperty, objectProperties, defineProperties) {
        // Determine whether value needs to be re-initialized in constructor
        const value = defineProperty.value;
        const byValue = value && typeof (value) !== 'number' && typeof (value) !== 'string';

        if (byValue || !Object.defineProperties || defineProperty.get || defineProperty.set) {
            objectProperties[propertyName] = {
                init: defineProperty.value,
                type: defineProperty.type,
                of: defineProperty.of,
                byValue
            };

            delete defineProperty.value;
        }

        // When a super class based on objectTemplate don't transport properties
        defineProperty.toServer = false;
        defineProperty.toClient = false;
        defineProperties[propertyName] = defineProperty;

        // Add getters and setters
        if (defineProperty.get || defineProperty.set) {
            const userSetter = defineProperty.set;

            defineProperty.set = (function d() {
                // Use a closure to record the property name which is not passed to the setter
                const prop = propertyName;

                return function c(value) {
                    if (userSetter) {
                        value = userSetter.call(this, value);
                    }

                    if (!defineProperty.isVirtual) {
                        this[`__${prop}`] = value;
                    }
                };
            })();

            const userGetter = defineProperty.get;

            defineProperty.get = (function get() {
                // Use closure to record property name which is not passed to the getter
                const prop = propertyName;

                return function b() {
                    if (userGetter) {
                        if (defineProperty.isVirtual) {
                            return userGetter.call(this, undefined);
                        }

                        return userGetter.call(this, this[`__${prop}`]);
                    }

                    return this[`__${prop}`];
                };
            })();

            if (!defineProperty.isVirtual) {
                defineProperties[`__${propertyName}`] = { enumerable: false, writable: true };
            }

            delete defineProperty.value;
            delete defineProperty.writable;
        }
    }

    /**
     * Clone an object created from an ObjectTemplate
     * Used only within supertype (see copyObject for general copy)
     *
     * @param obj is the source object
     * @param template is the template used to create the object
     *
     * @returns {*} a copy of the object
     */
    // Function to clone simple objects using ObjectTemplate as a guide
    static clone(obj, template?) {
        let copy;

        if (obj instanceof Date) {
            return new Date(obj.getTime());
        }
        else if (obj instanceof Array) {
            copy = [];

            for (let ix = 0; ix < obj.length; ++ix) {
                copy[ix] = this.clone(obj[ix], template);
            }

            return copy;
        }
        else if (template && obj instanceof template) {
            copy = new template();

            for (const prop in obj) {
                if (prop != '__id__' && !(obj[prop] instanceof Function)) {
                    const defineProperty = this._getDefineProperty(prop, template) || {};

                    if (obj.hasOwnProperty(prop)) {
                        copy[prop] = this.clone(obj[prop], defineProperty.of || defineProperty.type || null);
                    }
                }
            }

            return copy;
        }
        else if (obj instanceof Object) {
            copy = {};

            for (const propc in obj) {
                if (obj.hasOwnProperty(propc)) {
                    copy[propc] = this.clone(obj[propc]);
                }
            }

            return copy;
        }
        else {
            return obj;
        }
    }

    /**
     * Overridden by other Type Systems to be able to create remote functions or
     * otherwise intercept function calls
     *
     * @param {unknown} _propertyName is the name of the function
     * @param {unknown} propertyValue is the function itself
     *
     * @param args - for Semotus and Persistor to override
     * @returns {*} a new function to be assigned to the object prototype
     *
     * @private
     */
    static _setupFunction(_propertyName, propertyValue, ...args) {
        return propertyValue;
    };

    /**
 * Purpose unknown
 *
 * @param {unknown} obj unknown
 * @param {unknown} creator unknown
 *
 * @returns {unknown}
 */
    static createCopy(obj, creator) {
        return this.fromPOJO(obj, obj.constructor, null, null, undefined, null, null, creator);
    }

    /**
     * Abstract function for benefit of Semotus
     *
     * @param {unknown} cb unknown
     */
    static withoutChangeTracking(cb) {
        cb();
    }

    /**
     * Purpose unknown
     *
     * @param {unknown} pojo unknown
     * @param {unknown} template unknown
     * @param {unknown} defineProperty unknown
     * @param {unknown} idMap unknown
     * @param {unknown} idQualifier unknown
     * @param {unknown} parent unknown
     * @param {unknown} prop unknown
     * @param {unknown} creator unknown
     *
    * @returns {unknown}
    */
    static fromPOJO = serializer.fromPOJO;

    /**
    * Purpose unknown
    *
    * @param {unknown} str unknown
    * @param {unknown} template unknown
    * @param {unknown} idQualifier unknown
    * objectTemplate.fromJSON(str, template, idQualifier)
    * @returns {unknown}
    */
    static fromJSON = serializer.fromJSON;

    /**
     * Convert an object to JSON, stripping any recursive object references so they can be
     * reconstituted later
     *
     * @param {unknown} obj unknown
     * @param {unknown} cb unknown
     *
     * @returns {unknown}
     */
    static toJSONString = serializer.toJSONString;

         /**
     /**
      * Find the right subclass to instantiate by either looking at the
      * declared list in the subClasses define property or walking through
      * the subclasses of the declared template
      *
      * @param {unknown} template unknown
      * @param {unknown} objId unknown
      * @param {unknown} defineProperty unknown
      * @returns {*}
      * @private
      */
     static _resolveSubClass(template, objId, defineProperty) {
        let templateName = '';

        if (objId.match(/-([A-Za-z0-9_:]*)-/)) {
            templateName = RegExp.$1;
        }

    // Resolve template subclass for polymorphic instantiation
        if (defineProperty && defineProperty.subClasses && objId != 'anonymous)') {
            if (templateName) {
                for (let ix = 0; ix < defineProperty.subClasses.length; ++ix) {
                    if (templateName == defineProperty.subClasses[ix].name) {
                        template = defineProperty.subClasses[ix];
                    }
                }
            }
        }
        else {
            const subClass = this._findSubClass(template, templateName);

            if (subClass) {
                template = subClass;
            }
        }
        return template;
    }

    /**
     * Walk recursively through extensions of template via __children__
     * looking for a name match
     *
     * @param {unknown} template unknown
     * @param {unknown} templateName unknown
     * @returns {*}
     * @private
     */
    static _findSubClass(template, templateName) {
        if (template.name == templateName) {
            return template;
        }

        for (let ix = 0; ix < template.__children__.length; ++ix) {
            const subClass = this._findSubClass(template.__children__[ix], templateName);

            if (subClass) {
                return subClass;
            }
        }

        return null;
    }

    /**
     * Return the highest level template
     *
     * @param {unknown} template unknown
     *
     * @returns {*}
     *
     * @private
     */
    static _getBaseClass(template) {
        while (template.__parent__) {
            template = template.__parent__;
        }

        return template;
    }

         /**
      * An overridable function used to create an object from a template and optionally
      * manage the caching of that object (used by derivative type systems).  It
      * preserves the original id of an object
      *
      * @param {unknown} template of object
      * @param {unknown} objId and id (if present)
      * @param {unknown} defineProperty unknown
      * @returns {*}
      * @private
      */
     static _createEmptyObject(template, objId, defineProperty) {
        template = this._resolveSubClass(template, objId, defineProperty);

        const oldStashObject = this._stashObject;

        if (objId) {
            this._stashObject = function stashObject() {
                return true;
            };
        }

        const newValue = new template();
        this._stashObject = oldStashObject;

        if (objId) {
            newValue.__id__ = objId;
        }

        return newValue;
    }

    /**
     * Looks up a property in the defineProperties saved with the template cascading
     * up the prototype chain to find it
     *
     * @param {unknown} prop is the property being sought
     * @param {unknown} template is the template used to create the object containing the property
     * @returns {*} the "defineProperty" structure for the property
     * @private
     */
    static _getDefineProperty(prop, template) {
        if (template && (template != Object) && template.defineProperties && template.defineProperties[prop]) {
            return template.defineProperties[prop];
        }
        else if (template && template.parentTemplate) {
            return this._getDefineProperty(prop, template.parentTemplate);
        }

        return null;
    }

    /**
     * Returns a hash of all properties including those inherited
     *
     * @param {unknown} template is the template used to create the object containing the property
     * @param {unknown} returnValue unknown
     * @param {unknown} includeVirtual unknown
     * @returns {*} an associative array of each "defineProperty" structure for the property
     * @private
     */
    static _getDefineProperties(template, returnValue, includeVirtual) {
        if (!returnValue) {
            returnValue = {};
        }

        if (template.defineProperties) {
            for (const prop in template.defineProperties) {
                if (includeVirtual || !template.defineProperties[prop].isVirtual) {
                    returnValue[prop] = template.defineProperties[prop];
                }
            }
        }

        if (template.parentTemplate) {
            this._getDefineProperties(template.parentTemplate, returnValue, includeVirtual);
        }

        return returnValue;
    }

    /**
     * A function to clone the Type System
     * Used in persistor
     * @returns {o}
     * @private
     */
    static _createObject(): ObjectTemplateClone {
        const newFoo = Object.create(this);
        newFoo.init();
        return newFoo;
    }

    /**
    * Purpose unknown
    * @param {unknown} originally took a context that it threw away
    * @returns {SupertypeLogger}
    */
    static createLogger(): SupertypeLogger {
        return new SupertypeLogger();
    }

}