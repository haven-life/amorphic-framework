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
    amorphicClassName: any;
    __shadowParent__: any;
    props?: any;
    __parent__: any;
    __name__: any;
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
    __template__: any;
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

function pruneExisting(obj, props) {
    var newProps = {};

    for (var prop in props) {
        if (typeof(obj[prop]) === 'undefined') {
            newProps[prop] = props[prop];
        }
    }

    return newProps;
}

/**
 * the og ObjectTemplate, what everything picks off of
 */
export class ObjectTemplate {

    static lazyTemplateLoad: any;
    static isLocalRuleSet: any;
    static nextId: any; // for stashObject
    static __exceptions__: any;

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

                template.inject = function inject(injector) {
                    objectTemplate.inject(this, injector);
                };

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

    static getTemplateByName(name) {
        return this.getClasses()[name];
    }

    /**
 * Purpose unknown
 *
 * @param {unknown} template unknown
 * @param {unknown} name unknown
 * @param {unknown} props unknown
 */
    static setTemplateProperties(template, name, props) {
        this.__templatesToInject__[name] = template;
        this.__dictionary__[name] = template;
        template.__name__ = name;
        template.__injections__ = [];
        template.__objectTemplate__ = this;
        template.__children__ = [];
        template.__toClient__ = props.__toClient__;
        template.__toServer__ = props.__toServer__;
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
        * Create an object template that is instantiated with the new operator.
        * properties is
        *
        * @param {unknown} name the name of the template or an object with
        *        name - the name of the class
        *        toClient - whether the object is to be shipped to the client (with semotus)
        *        toServer - whether the object is to be shipped to the server (with semotus)
        *        isLocal - equivalent to setting toClient && toServer to false
        * @param {unknown} properties an object whose properties represent data and function
        * properties of the object.  The data properties may use the defineProperty
        * format for properties or may be properties assigned a Number, String or Date.
        *
        * @returns {*} the object template
        */

    static create(name: string | CreateTypeForName, properties) {
        /** this block only executes on createtypeforname */
        if (name && !(typeof (name) === 'string') && name.name) {
            var props = name;
            name = props.name;
        }
        else {
            props = {};
        }

        if (typeof (name) !== 'string' || name.match(/[^A-Za-z0-9_]/)) {
            throw new Error('incorrect template name');
        }

        if (typeof (properties) !== 'object') {
            throw new Error('missing template property definitions');
        }

        const createProps = this.getTemplateProperties(props);

        if (typeof (this.templateInterceptor) === 'function') {
            this.templateInterceptor('create', name, properties);
        }

        let template;

        if (properties) {
            template = this._createTemplate(null, Object, properties, createProps, name);
        }
        else {
            template = this._createTemplate(null, Object, name, createProps, name);
        }

        this.setTemplateProperties(template, name, createProps);
        template.__createProps__ = props;

        return template;
    }


    /**
     * Extend and existing (parent template)
     *
     * @param {unknown} parentTemplate unknown
     * @param {unknown} name the name of the template or an object with
     *        name - the name of the class
     *        toClient - whether the object is to be shipped to the client (with semotus)
     *        toServer - whether the object is to be shipped to the server (with semotus)
     *        isLocal - equivalent to setting toClient && toServer to false
     * @param {unknown} properties are the same as for create
     *
     * @returns {*} the object template
     */
    static extend(parentTemplate, name: string | CreateTypeForName, properties) {
        let props;
        let createProps;

        if (!parentTemplate.__objectTemplate__) {
            throw new Error('incorrect parent template');
        }

        if (typeof (name) !== 'undefined' && typeof (name) !== 'string' && name.name) {
            props = name;
            name = props.name;
        }
        else {
            props = parentTemplate.__createProps__;
        }

        if (typeof (name) !== 'string' || name.match(/[^A-Za-z0-9_]/)) {
            throw new Error('incorrect template name');
        }

        if (typeof (properties) !== 'object') {
            throw new Error('missing template property definitions');
        }

        const existingTemplate = this.__dictionary__[name];

        if (existingTemplate) {
            if (existingTemplate.__parent__ != parentTemplate) {
                if (existingTemplate.__parent__.__name__ != parentTemplate.__name__) {
                    // eslint-disable-next-line no-console
                    console.log(`WARN: Attempt to extend ${parentTemplate.__name__} as ${name} but ${name} was already extended from ${existingTemplate.__parent__.__name__}`);
                }
            }
            else {
                this.mixin(existingTemplate, properties);

                return existingTemplate;
            }
        }

        if (props) {
            createProps = this.getTemplateProperties(props);
        }

        if (typeof (this.templateInterceptor) === 'function') {
            this.templateInterceptor('extend', name, properties);
        }

        let template;

        if (properties) {
            template = this._createTemplate(null, parentTemplate, properties, parentTemplate, name);
        }
        else {
            template = this._createTemplate(null, parentTemplate, name, parentTemplate, name);
        }

        if (createProps) {
            this.setTemplateProperties(template, name, createProps);
        }
        else {
            this.setTemplateProperties(template, name, parentTemplate);
        }
        template.__createProps__ = props;

        // Maintain graph of parent and child templates
        template.__parent__ = parentTemplate;
        parentTemplate.__children__.push(template);

        return template;
    }

    static mixin(template, properties) {
        if (typeof (this.templateInterceptor) === 'function') {
            this.templateInterceptor('create', template.__name__, properties);
        }

        return this._createTemplate(template, null, properties, template, template.__name__);
    }

    /**
    * Purpose unknown
    *
    * @param {unknown} template unknown
    * @param {unknown} properties unknown
    */
    static staticMixin(template, properties) {
        for (const prop in properties) {
            template[prop] = properties[prop];
        }
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

    /**
     * Create the template if it needs to be created
     * @param [unknown} template to be created
     */
    static createIfNeeded(template?, thisObj?) {
        if (template.__createParameters__) {
            const createParameters = template.__createParameters__;
            for (var ix = 0; ix < createParameters.length; ++ix) {
                const params = createParameters[ix];
                template.__createParameters__ = undefined;
                this._createTemplate(params[0], params[1], params[2], params[3], params[4], true);
            }
            if (template._injectProperties) {
                template._injectProperties();
            }
            if (thisObj) {
                //var copy = new template();
                const prototypes = [template.prototype];
                let parent = template.__parent__;
                while (parent) {
                    prototypes.push(parent.prototype);
                    parent = parent.__parent__;
                }
                for (var ix = prototypes.length - 1; ix >= 0; --ix) {
                    const props = Object.getOwnPropertyNames(prototypes[ix]);
                    props.forEach((val, ix) => {
                        Object.defineProperty(thisObj, props[ix], Object.getOwnPropertyDescriptor(prototypes[ix], props[ix]));
                    });
                }
                thisObj.__proto__ = template.prototype;
            }
        }
    }

    static getClasses() {
        if (this.__templates__) {
            for (let ix = 0; ix < this.__templates__.length; ++ix) {
                var template = this.__templates__[ix];
                this.__dictionary__[constructorName(template)] = template;
                this.__templatesToInject__[constructorName(template)] = template;
                processDeferredTypes(template);
            }
            this.__templates__ = undefined;
            for (const templateName1 in this.__dictionary__) {
                var template = this.__dictionary__[templateName1];
                const parentTemplateName = constructorName(Object.getPrototypeOf(template.prototype).constructor);
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
            if (this.__exceptions__) {
                throw new Error(this.__exceptions__.map(createMessageLine).join('\n'));
            }
        }
        function createMessageLine(exception) {
            return exception.func(exception.class(), exception.prop);
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

        function constructorName(constructor) {
            const namedFunction = constructor.toString().match(/function ([^(]*)/);
            return namedFunction ? namedFunction[1] : null;
        }

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

            obj.__id__ = 'local-' + template.__name__ + '-' + ++ObjectTemplate.nextId;
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
     * @returns {*} a new function to be assigned to the object prototype
     *
     * @private
     */
    static _setupFunction(_propertyName, propertyValue) {
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
        return this.fromPOJO(obj, obj.__template__, null, null, undefined, null, null, creator);
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
                    if (templateName == defineProperty.subClasses[ix].__name__) {
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
        if (template.__name__ == templateName) {
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
     *
     * General function to create templates used by create, extend and mixin
     *
     * @param {unknown} mixinTemplate - template used for a mixin
     * @param {unknown} parentTemplate - template used for an extend
     * @param {unknown} propertiesOrTemplate - properties to be added/mxied in
     * @param {unknown} createProperties unknown
     * @param {unknown} templateName - the name of the template as it will be stored retrieved from dictionary
     *
     * @returns {Function}
     *
     * @private
     */
    private static _createTemplate(mixinTemplate?, parentTemplate?, propertiesOrTemplate?, createProperties?, templateName?, createTemplateNow?) {
        // We will return a constructor that can be used in a new function
        // that will call an init() function found in properties, define properties using Object.defineProperties
        // and make copies of those that are really objects
        var functionProperties:any = {};    // Will be populated with init function from properties
        var objectProperties = {};    // List of properties to be processed by hand
        var defineProperties = {};    // List of properties to be sent to Object.defineProperties()
        var objectTemplate = this;
        var templatePrototype;

        function F() { }     // Used in case of extend

        if (!this.lazyTemplateLoad) {
            createTemplateNow = true;
        }
        // Setup variables depending on the type of call (create, extend, mixin)
        if (createTemplateNow) {
            if (mixinTemplate) {        // Mixin
                this.createIfNeeded(mixinTemplate);
                if (propertiesOrTemplate.isObjectTemplate) {
                    this.createIfNeeded(propertiesOrTemplate);
                    for (var prop in propertiesOrTemplate.defineProperties) {
                        mixinTemplate.defineProperties[prop] = propertiesOrTemplate.defineProperties[prop];
                    }

                    for (var propp in propertiesOrTemplate.objectProperties) {
                        mixinTemplate.objectProperties[propp] = propertiesOrTemplate.objectProperties[propp];
                    }

                    for (var propo in propertiesOrTemplate.functionProperties) {
                        if (propo == 'init') {
                            mixinTemplate.functionProperties.init = mixinTemplate.functionProperties.init || [];

                            for (var ix = 0; ix < propertiesOrTemplate.functionProperties.init.length; ++ix) {
                                mixinTemplate.functionProperties.init.push(propertiesOrTemplate.functionProperties.init[ix]);
                            }
                        }
                        else {
                            mixinTemplate.functionProperties[propo] = propertiesOrTemplate.functionProperties[propo];
                        }
                    }

                    for (var propn in propertiesOrTemplate.prototype) {
                        var propDesc = <Getter>Object.getOwnPropertyDescriptor(propertiesOrTemplate.prototype, propn);

                        if (propDesc) {
                            Object.defineProperty(mixinTemplate.prototype, propn, propDesc);

                            if (propDesc.get) {
                                (<Getter>Object.getOwnPropertyDescriptor(mixinTemplate.prototype, propn)).get.sourceTemplate = propDesc.get.sourceTemplate;
                            }
                        }
                        else {
                            mixinTemplate.prototype[propn] = propertiesOrTemplate.prototype[propn];
                        }
                    }

                    mixinTemplate.props = {};

                    var props = ObjectTemplate._getDefineProperties(mixinTemplate, undefined, true);

                    for (var propm in props) {
                        mixinTemplate.props[propm] = props[propm];
                    }

                    return mixinTemplate;
                }
                else {
                    defineProperties = mixinTemplate.defineProperties;
                    objectProperties = mixinTemplate.objectProperties;
                    functionProperties = mixinTemplate.functionProperties;
                    templatePrototype = mixinTemplate.prototype;
                    parentTemplate = mixinTemplate.parentTemplate;
                }
            }
            else {        // Extend
                this.createIfNeeded(parentTemplate);
                F.prototype = parentTemplate.prototype;
                templatePrototype = new F();
            }
        }
        /**
         * Constructor that will be returned will only ever be created once
         */
        var template: ConstructorType = this.__dictionary__[templateName] ||
            bindParams(templateName, objectTemplate, functionProperties,
                defineProperties, parentTemplate, propertiesOrTemplate,
                createProperties, objectProperties, templatePrototype,
                createTemplateNow, mixinTemplate)


        template.isObjectTemplate = true;

        template.extend = (p1, p2) => objectTemplate.extend.call(objectTemplate, template, p1, p2);
        template.mixin = (p1, p2) => objectTemplate.mixin.call(objectTemplate, template, p1, p2);
        template.staticMixin = (p1, p2) => objectTemplate.staticMixin.call(objectTemplate, template, p1, p2);

        template.fromPOJO = (pojo) => {
            objectTemplate.createIfNeeded(template);
            return objectTemplate.fromPOJO(pojo, template);
        };

        template.fromJSON = (str, idPrefix) => {
            objectTemplate.createIfNeeded(template);
            return objectTemplate.fromJSON(str, template, idPrefix);
        };

        template.getProperties = (includeVirtual) => {
            objectTemplate.createIfNeeded(template);
            return ObjectTemplate._getDefineProperties(template, undefined, includeVirtual);
        };

        if (!createTemplateNow) {
            template.__createParameters__ = template.__createParameters__ || [];
            template.__createParameters__.push([mixinTemplate, parentTemplate, propertiesOrTemplate, createProperties, templateName]);
            return template;
        }

        template.prototype = templatePrototype;

        var createProperty = createPropertyFunc.bind(null, functionProperties, templatePrototype, objectTemplate, templateName, objectProperties, defineProperties, parentTemplate);


        // Walk through properties and construct the defineProperties hash of properties, the list of
        // objectProperties that have to be reinstantiated and attach functions to the prototype
        for (var propertyName in propertiesOrTemplate) {
            createProperty(propertyName, null, propertiesOrTemplate, createProperties);
        }

        template.defineProperties = defineProperties;
        template.objectProperties = objectProperties;

        template.functionProperties = functionProperties;
        template.parentTemplate = parentTemplate;


        template.createProperty = createProperty;

        template.props = {};

        var propst = ObjectTemplate._getDefineProperties(template, undefined, true);

        for (var propd in propst) {
            template.props[propd] = propst[propd];
        }

        return template;
    };


    /**
     * A function to clone the Type System
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


function createPropertyFunc(functionProperties, templatePrototype, objectTemplate, templateName, objectProperties, defineProperties, parentTemplate,
    propertyName, propertyValue, properties, createProperties) {
    if (!properties) {
        properties = {};
        properties[propertyName] = propertyValue;
    }

    // Record the initialization function
    if (propertyName == 'init' && typeof (properties[propertyName]) === 'function') {
        functionProperties.init = [properties[propertyName]];
    } else {
        var defineProperty = null; // defineProperty to be added to defineProperties

        // Determine the property value which may be a defineProperties structure or just an initial value
        var descriptor:any = {};

        if (properties) {
            descriptor = Object.getOwnPropertyDescriptor(properties, propertyName);
        }

        var type = 'null';

        if (descriptor.get || descriptor.set) {
            type = 'getset';
        } else if (properties[propertyName] !== null) {
            type = typeof (properties[propertyName]);
        }

        switch (type) {
            // Figure out whether this is a defineProperty structure (has a constructor of object)
            case 'object': // Or array
                // Handle remote function calls
                if (properties[propertyName].body && typeof (properties[propertyName].body) === 'function') {
                    templatePrototype[propertyName] = objectTemplate._setupFunction(propertyName, properties[propertyName].body, properties[propertyName].on, properties[propertyName].validate);

                    if (properties[propertyName].type) {
                        templatePrototype[propertyName].__returns__ = properties[propertyName].type;
                    }

                    if (properties[propertyName].of) {
                        templatePrototype[propertyName].__returns__ = properties[propertyName].of;
                        templatePrototype[propertyName].__returnsarray__ = true;
                    }

                    templatePrototype[propertyName].__on__ = properties[propertyName].on;
                    templatePrototype[propertyName].__validate__ = properties[propertyName].validate;
                    templatePrototype[propertyName].__body__ = properties[propertyName].body;
                    break;
                } else if (properties[propertyName].type) {
                    defineProperty = properties[propertyName];
                    properties[propertyName].writable = true; // We are using setters

                    if (typeof (properties[propertyName].enumerable) === 'undefined') {
                        properties[propertyName].enumerable = true;
                    }
                    break;
                } else if (properties[propertyName] instanceof Array) {
                    defineProperty = {
                        type: Object,
                        value: properties[propertyName],
                        enumerable: true,
                        writable: true,
                        isLocal: true
                    };
                    break;
                } else { // Other crap
                    defineProperty = {
                        type: Object,
                        value: properties[propertyName],
                        enumerable: true,
                        writable: true
                    };
                    break;
                }

            case 'string':
                defineProperty = {
                    type: String,
                    value: properties[propertyName],
                    enumerable: true,
                    writable: true,
                    isLocal: true
                };
                break;

            case 'boolean':
                defineProperty = {
                    type: Boolean,
                    value: properties[propertyName],
                    enumerable: true,
                    writable: true,
                    isLocal: true
                };
                break;

            case 'number':
                defineProperty = {
                    type: Number,
                    value: properties[propertyName],
                    enumerable: true,
                    writable: true,
                    isLocal: true
                };
                break;

            case 'function':
                templatePrototype[propertyName] = objectTemplate._setupFunction(propertyName, properties[propertyName]);
                templatePrototype[propertyName].sourceTemplate = templateName;
                break;

            case 'getset': // getters and setters
                descriptor.templateSource = templateName;
                Object.defineProperty(templatePrototype, propertyName, descriptor);
                (<Getter>Object.getOwnPropertyDescriptor(templatePrototype, propertyName)).get.sourceTemplate = templateName;
                break;
        }

        // If a defineProperty to be added
        if (defineProperty) {
            if (typeof descriptor.toClient !== 'undefined') {
                defineProperty.toClient = descriptor.toClient;
            }
            if (typeof descriptor.toServer !== 'undefined') {
                defineProperty.toServer = descriptor.toServer;
            }

            objectTemplate._setupProperty(propertyName, defineProperty, objectProperties, defineProperties, parentTemplate, createProperties);
            defineProperty.sourceTemplate = templateName;
        }
    }
};

function bindParams(templateName, objectTemplate, functionProperties,
    defineProperties, parentTemplate, propertiesOrTemplate,
    createProperties, objectProperties, templatePrototype,
    createTemplateNow, mixinTemplate) {

    function template() {
        objectTemplate.createIfNeeded(template, this);
        let templateRef: ConstructorType = <ConstructorType><Function>template;

        objectTemplate.__templateUsage__[templateRef.__name__] = true;
        var parent = templateRef.__parent__;
        while (parent) {
            objectTemplate.__templateUsage__[parent.__name__] = true;
            var parent = parent.__parent__;
        }

        this.__template__ = templateRef;

        if (objectTemplate.__transient__) {
            this.__transient__ = true;
        }

        var prunedObjectProperties = pruneExisting(this, templateRef.objectProperties);
        var prunedDefineProperties = pruneExisting(this, templateRef.defineProperties);

        try {
            // Create properties either with EMCA 5 defineProperties or by hand
            if (Object.defineProperties) {
                Object.defineProperties(this, prunedDefineProperties); // This method will be added pre-EMCA 5
            }
        } catch (e) {
            console.log(e); // eslint-disable-line no-console
        }

        this.fromRemote = this.fromRemote || objectTemplate._stashObject(this, templateRef);

        this.copyProperties = function copyProperties(obj) {
            for (var prop in obj) {
                this[prop] = obj[prop];
            }
        };

        // Initialize properties from the defineProperties value property
        for (var propertyName in prunedObjectProperties) {
            var defineProperty = prunedObjectProperties[propertyName];

            if (typeof (defineProperty.init) !== 'undefined') {
                if (defineProperty.byValue) {
                    this[propertyName] = ObjectTemplate.clone(defineProperty.init, defineProperty.of || defineProperty.type || null);
                } else {
                    this[propertyName] = (defineProperty.init);
                }
            }
        }


        // Template level injections
        for (var ix = 0; ix < templateRef.__injections__.length; ++ix) {
            templateRef.__injections__[ix].call(this, this);
        }

        // Global injections
        for (var j = 0; j < objectTemplate.__injections__.length; ++j) {
            objectTemplate.__injections__[j].call(this, this);
        }

        this.__prop__ = function g(prop) {
            return ObjectTemplate._getDefineProperty(prop, this.__template__);
        };

        this.__values__ = function f(prop) {
            var defineProperty = this.__prop__(prop) || this.__prop__('_' + prop);

            if (typeof (defineProperty.values) === 'function') {
                return defineProperty.values.call(this);
            }

            return defineProperty.values;
        };

        this.__descriptions__ = function e(prop) {
            var defineProperty = this.__prop__(prop) || this.__prop__('_' + prop);

            if (typeof (defineProperty.descriptions) === 'function') {
                return defineProperty.descriptions.call(this);
            }

            return defineProperty.descriptions;
        };

        // If we don't have an init function or are a remote creation call parent constructor otherwise call init
        //  function who will be responsible for calling parent constructor to allow for parameter passing.
        if (this.fromRemote || !templateRef.functionProperties.init || objectTemplate.noInit) {
            if (parentTemplate && parentTemplate.isObjectTemplate) {
                parentTemplate.call(this);
            }
        } else {
            if (templateRef.functionProperties.init) {
                for (var i = 0; i < templateRef.functionProperties.init.length; ++i) {
                    templateRef.functionProperties.init[i].apply(this, arguments);
                }
            }
        }

        this.__template__ = templateRef;

        this.toJSONString = function toJSONString(cb) {
            return ObjectTemplate.toJSONString(this, cb);
        };

        /* Clone and object calling a callback for each referenced object.
         The call back is passed (obj, prop, template)
         obj - the parent object (except the highest level)
         prop - the name of the property
         template - the template of the object to be created
         the function returns:
         - falsy - clone object as usual with a new id
         - object reference - the callback created the object (presumably to be able to pass init parameters)
         - [object] - a one element array of the object means don't copy the properties or traverse
         */
        this.createCopy = function createCopy(creator) {
            return ObjectTemplate.createCopy(this, creator);
        };

    };


    let returnVal = <Function>template;

    return returnVal as ConstructorType;
}
