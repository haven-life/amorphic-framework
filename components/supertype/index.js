/* Copyright 2011-2012 Sam Elsamman
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
/*
 * ObjectTemplate - n Type System with Benefits
 */
(function (root, factory) {
    if (typeof define === 'function' && define.amd) {
        define([], factory);
    }
    else if (typeof exports === 'object') {
        module.exports = factory();
    }
    else {
        root.ObjectTemplate = factory();
    }
}(this, function () {

    function ObjectTemplate() {
    }

/**
 * Purpose unknown
 */
    ObjectTemplate.performInjections = function performInjections() {
        this.getClasses();
        if (this.__templatesToInject__) {
            var objectTemplate = this;

            for (var templateName in this.__templatesToInject__) {
                var template = this.__templatesToInject__[templateName];

                template.inject = function inject(injector) {
                    objectTemplate.inject(this, injector);
                };

                this._injectIntoTemplate(template);
            }
        }
    };

/**
 * Purpose unknown
 */
    ObjectTemplate.init = function () {
        this.__templateUsage__ = {};
        this.__injections__ = [];
        this.__dictionary__ = {};
        this.__anonymousId__ = 1;
        this.__templatesToInject__ = {};
        this.logger = this.createLogger(); // Create a default logger
    };

/**
 * Purpose unknown
 *
 * @param {unknown} name unknown
 *
 * @returns {unknown}
 */
    ObjectTemplate.getTemplateByName = function getTemplateByName(name) {
        return this.getClasses()[name];
    };

/**
 * Purpose unknown
 *
 * @param {unknown} props unknown
 *
 * @returns {unknown}
 */
    ObjectTemplate.getTemplateProperties = function getTemplateProperties(props) {
        var templateProperties = {};

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

    /**
     * Allow the property to be either a boolean a function that returns a boolean or a string
     * matched against a rule set array of string in ObjectTemplate
     *
     * @param {unknown} prop unknown
     * @param {unknown} ruleSet unknown
     *
     * @returns {function(this:ObjectTemplate)}
     */
        function processProp(prop, ruleSet) {
            var ret = null;

            if (typeof(prop) === 'function') {
                ret = prop.call(ObjectTemplate);
            }
            else if (typeof(prop) === 'string') {
                ret = false;

                if (ruleSet) {
                    ruleSet.map(function i(rule) {
                        if (!ret) {
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
    };

/**
 * Purpose unknown
 *
 * @param {unknown} template unknown
 * @param {unknown} name unknown
 * @param {unknown} props unknown
 */
    ObjectTemplate.setTemplateProperties = function setTemplateProperties(template, name, props) {
        this.__templatesToInject__[name] = template;
        this.__dictionary__[name] = template;
        template.__name__ = name;
        template.__injections__ = [];
        template.__objectTemplate__ = this;
        template.__children__ = [];
        template.__toClient__ = props.__toClient__;
        template.__toServer__ = props.__toServer__;
    };

/**
 * Create and object template that is instantiated with the new operator.
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
    ObjectTemplate.create = function create(name, properties) {
        if (name && name.name) {
            var props = name;
            name = props.name;
        }
        else {
            props = {};
        }

        if (typeof(name) !== 'string' || name.match(/[^A-Za-z0-9_]/)) {
            throw new Error('incorrect template name');
        }

        if (typeof(properties) !== 'object') {
            throw new Error('missing template property definitions');
        }

        var createProps = this.getTemplateProperties(props);

        if (typeof(this.templateInterceptor) === 'function') {
            this.templateInterceptor('create', name, properties);
        }

        var template;

        if (properties) {
            template = this._createTemplate(null, Object, properties, createProps, name);
        }
        else {
            template = this._createTemplate(null, Object, name, createProps, name);
        }

        this.setTemplateProperties(template, name, createProps);
        template.__createProps__ = props;

        return template;
    };

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
    ObjectTemplate.extend = function extend(parentTemplate, name, properties) {
        var props;
        var createProps;

        if (!parentTemplate.__objectTemplate__) {
            throw new Error('incorrect parent template');
        }

        if (typeof(name) !== 'undefined' && name.name) {
            props = name;
            name = props.name;
        }
        else {
            props = parentTemplate.__createProps__;
        }

        if (typeof(name) !== 'string' || name.match(/[^A-Za-z0-9_]/)) {
            throw new Error('incorrect template name');
        }

        if (typeof(properties) !== 'object') {
            throw new Error('missing template property definitions');
        }

        var existingTemplate = this.__dictionary__[name];

        if (existingTemplate) {
            if (existingTemplate.__parent__ != parentTemplate) {
                if (existingTemplate.__parent__.__name__ != parentTemplate.__name__) {
                // eslint-disable-next-line no-console
                    console.log('WARN: Attempt to extend ' + parentTemplate.__name__ + ' as ' + name + ' but ' + name + ' was already extended from ' + existingTemplate.__parent__.__name__);
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

        if (typeof(this.templateInterceptor) === 'function') {
            this.templateInterceptor('extend', name, properties);
        }

        var template;

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
    };

/**
 *  Mix in addition properties into a template
 *
 * @param {unknown} template to mix into
 * @param {unknown} properties are the same as for create
 *
 * @returns {*} the template with the new properties mixed in
 */
    ObjectTemplate.mixin = function mixin(template, properties) {
        if (typeof(this.templateInterceptor) === 'function') {
            this.templateInterceptor('create', template.__name__, properties);
        }

        return this._createTemplate(template, null, properties, template, template.__name__);
    };

/**
 * Purpose unknown
 *
 * @param {unknown} template unknown
 * @param {unknown} properties unknown
 */
    ObjectTemplate.staticMixin = function staticMixin(template, properties) {
        for (var prop in properties) {
            template[prop] = properties[prop];
        }
    };

/**
 * Add a function that will fire on object creation
 *
 * @param {unknown} template unknown
 * @param {unknown} injector unknown
 */
    ObjectTemplate.inject = function inject(template, injector) {
        template.__injections__.push(injector);
    };

/**
 * Purpose unknown
 *
 * @param {unknown} injector - unknown
 */
    ObjectTemplate.globalInject = function globalInject(injector) {
        this.__injections__.push(injector);
    };

/**
 * Create the template if it needs to be created
 * @param [unknown} template to be created
 */
    ObjectTemplate.createIfNeeded = function createTemplate (template, thisObj) {
        if (template.__createParameters__) {
            var createParameters = template.__createParameters__;
            for (var ix = 0; ix < createParameters.length; ++ix) {
                var params = createParameters[ix];
                template.__createParameters__ = undefined;
                this._createTemplate(params[0], params[1], params[2], params[3], params[4], true);
            }
            if (template._injectProperties) {
                template._injectProperties();
            }
            if (thisObj) {
            //var copy = new template();
                var prototypes = [template.prototype];
                var parent = template.__parent__;
                while (parent) {
                    prototypes.push(parent.prototype);
                    parent = parent.__parent__;
                }
                for (var ix = prototypes.length - 1; ix >= 0; --ix) {
                    var props = Object.getOwnPropertyNames(prototypes[ix]);
                    props.forEach(function (val, ix) {
                        Object.defineProperty(thisObj, props[ix], Object.getOwnPropertyDescriptor(prototypes[ix], props[ix]));
                    });
                }
                thisObj.__proto__ = template.prototype;
            }
        }
    };

/**
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
    ObjectTemplate._createTemplate = function createTemplate (mixinTemplate, parentTemplate, propertiesOrTemplate, createProperties, templateName, createTemplateNow) {
    // We will return a constructor that can be used in a new function
    // that will call an init() function found in properties, define properties using Object.defineProperties
    // and make copies of those that are really objects
        var functionProperties = {};    // Will be populated with init function from properties
        var objectProperties = {};    // List of properties to be processed by hand
        var defineProperties = {};    // List of properties to be sent to Object.defineProperties()
        var objectTemplate = this;
        var templatePrototype;

        function F () {}     // Used in case of extend

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
                        var propDesc = Object.getOwnPropertyDescriptor(propertiesOrTemplate.prototype, propn);

                        if (propDesc) {
                            Object.defineProperty(mixinTemplate.prototype, propn, propDesc);

                            if (propDesc.get) {
                                Object.getOwnPropertyDescriptor(mixinTemplate.prototype, propn).get.sourceTemplate = propDesc.get.sourceTemplate;
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
        var template = this.__dictionary__[templateName] || function template() {

            objectTemplate.createIfNeeded(template, this);

            objectTemplate.__templateUsage__[template.__name__] = true;
            var parent = template.__parent__;
            while (parent) {
                objectTemplate.__templateUsage__[parent.__name__] = true;
                var parent = parent.__parent__;
            }

            this.__template__ = template;

            if (objectTemplate.__transient__) {
                this.__transient__ = true;
            }

            var prunedObjectProperties = pruneExisting(this, template.objectProperties);
            var prunedDefineProperties = pruneExisting(this, template.defineProperties);

            try {
            // Create properties either with EMCA 5 defineProperties or by hand
                if (Object.defineProperties) {
                    Object.defineProperties(this, prunedDefineProperties);    // This method will be added pre-EMCA 5
                }
            }
            catch (e) {
            // TODO: find a better way to deal with errors that are thrown
                console.log(e);     // eslint-disable-line no-console
            }

            this.fromRemote = this.fromRemote || objectTemplate._stashObject(this, template);

            this.copyProperties = function copyProperties(obj) {
                for (var prop in obj) {
                    this[prop] = obj[prop];
                }
            };

        // Initialize properties from the defineProperties value property
            for (var propertyName in prunedObjectProperties) {
                var defineProperty = prunedObjectProperties[propertyName];

                if (typeof(defineProperty.init) !== 'undefined') {
                    if (defineProperty.byValue) {
                        this[propertyName] = ObjectTemplate.clone(defineProperty.init, defineProperty.of || defineProperty.type || null);
                    }
                    else {
                        this[propertyName] = (defineProperty.init);
                    }
                }
            }

        // Template level injections
            for (var ix = 0; ix < template.__injections__.length; ++ix) {
                template.__injections__[ix].call(this, this);
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

                if (typeof(defineProperty.values) === 'function') {
                    return defineProperty.values.call(this);
                }

                return defineProperty.values;
            };

            this.__descriptions__ = function e(prop) {
                var defineProperty = this.__prop__(prop) || this.__prop__('_' + prop);

                if (typeof(defineProperty.descriptions) === 'function') {
                    return defineProperty.descriptions.call(this);
                }

                return defineProperty.descriptions;
            };

        // If we don't have an init function or are a remote creation call parent constructor otherwise call init
        //  function who will be responsible for calling parent constructor to allow for parameter passing.
            if (this.fromRemote || !template.functionProperties.init || objectTemplate.noInit) {
                if (parentTemplate && parentTemplate.isObjectTemplate) {
                    parentTemplate.call(this);
                }
            }
            else {
                if (template.functionProperties.init) {
                    for (var i = 0; i < template.functionProperties.init.length; ++i) {
                        template.functionProperties.init[i].apply(this, arguments);
                    }
                }
            }

            this.__template__ = template;

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

            function pruneExisting(obj, props) {
                var newProps = {};

                for (var prop in props) {
                    if (typeof(obj[prop]) === 'undefined') {
                        newProps[prop] = props[prop];
                    }
                }

                return newProps;
            }
        };

        template.isObjectTemplate = true;

        template.extend = function extend(p1, p2) {
            return objectTemplate.extend.call(objectTemplate, this, p1, p2);
        };

        template.mixin = function mixin(p1, p2) {
            return objectTemplate.mixin.call(objectTemplate, this, p1, p2);
        };

        template.staticMixin = function staticMixin(p1, p2) {
            return objectTemplate.staticMixin.call(objectTemplate, this, p1, p2);
        };

        template.fromPOJO = function fromPOJO(pojo) {
            objectTemplate.createIfNeeded(template);
            return objectTemplate.fromPOJO(pojo, template);
        };

        template.fromJSON = function fromJSON(str, idPrefix) {
            objectTemplate.createIfNeeded(template);
            return objectTemplate.fromJSON(str, template, idPrefix);
        };

        template.getProperties = function getProperties(includeVirtual) {
            objectTemplate.createIfNeeded(template);
            return ObjectTemplate._getDefineProperties(template, undefined, includeVirtual);
        };

        if (!createTemplateNow) {
            template.__createParameters__ = template.__createParameters__ || [];
            template.__createParameters__.push([mixinTemplate, parentTemplate, propertiesOrTemplate, createProperties, templateName]);
            return template;
        }

        template.prototype = templatePrototype;

        var createProperty = function createProperty(propertyName, propertyValue, properties, createProperties) {
            if (!properties) {
                properties = {};
                properties[propertyName] = propertyValue;
            }

        // Record the initialization function
            if (propertyName == 'init' && typeof(properties[propertyName]) === 'function') {
                functionProperties.init = [properties[propertyName]];
            }
            else {
                var defineProperty = null;    // defineProperty to be added to defineProperties

            // Determine the property value which may be a defineProperties structure or just an initial value
                var descriptor = {};

                if (properties) {
                    descriptor = Object.getOwnPropertyDescriptor(properties, propertyName);
                }

                var type = 'null';

                if (descriptor.get || descriptor.set) {
                    type = 'getset';
                }
                else if (properties[propertyName] !== null) {
                    type = typeof(properties[propertyName]);
                }

                switch (type) {
                // Figure out whether this is a defineProperty structure (has a constructor of object)
                case 'object': // Or array
                    // Handle remote function calls
                    if (properties[propertyName].body && typeof(properties[propertyName].body) === 'function') {
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
                    }
                    else if (properties[propertyName].type) {
                        defineProperty = properties[propertyName];
                        properties[propertyName].writable = true;  // We are using setters

                        if (typeof(properties[propertyName].enumerable) === 'undefined') {
                            properties[propertyName].enumerable = true;
                        }
                        break;
                    }
                    else if (properties[propertyName] instanceof Array) {
                        defineProperty = {type: Object, value: properties[propertyName], enumerable: true, writable: true, isLocal: true};
                        break;
                    }
                    else { // Other crap
                        defineProperty = {type: Object, value: properties[propertyName], enumerable: true, writable: true};
                        break;
                    }

                case 'string':
                    defineProperty = {type: String, value: properties[propertyName], enumerable: true, writable: true, isLocal: true};
                    break;

                case 'boolean':
                    defineProperty = {type: Boolean, value: properties[propertyName], enumerable: true, writable: true, isLocal: true};
                    break;

                case 'number':
                    defineProperty = {type: Number, value: properties[propertyName], enumerable: true, writable: true, isLocal: true};
                    break;

                case 'function':
                    templatePrototype[propertyName] = objectTemplate._setupFunction(propertyName, properties[propertyName]);
                    templatePrototype[propertyName].sourceTemplate = templateName;
                    break;

                case 'getset': // getters and setters
                    descriptor.templateSource = templateName;
                    Object.defineProperty(templatePrototype, propertyName, descriptor);
                    Object.getOwnPropertyDescriptor(templatePrototype, propertyName).get.sourceTemplate = templateName;
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
    ObjectTemplate._stashObject = function stashObject(obj, template) {
        if (!obj.__id__) {
            if (!ObjectTemplate.nextId) {
                ObjectTemplate.nextId = 1;
            }

            obj.__id__ = 'local-' + template.__name__ + '-' + ++ObjectTemplate.nextId;
        }

        return false;
    };

/**
 * Overridden by other Type Systems to inject other elements
 *
 * @param {unknown} _template - the object to be passed during creation time
 *
 * @private
 */
    ObjectTemplate._injectIntoTemplate = function injectIntoTemplate(_template) {
    };

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
    ObjectTemplate._setupFunction = function setupFunction(_propertyName, propertyValue) {
        return propertyValue;
    };

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
    ObjectTemplate._setupProperty = function setupProperty(propertyName, defineProperty, objectProperties, defineProperties) {
    // Determine whether value needs to be re-initialized in constructor
        var value   = defineProperty.value;
        var byValue = value && typeof(value) !== 'number' && typeof(value) !== 'string';

        if (byValue || !Object.defineProperties || defineProperty.get || defineProperty.set) {
            objectProperties[propertyName] = {
                init:     defineProperty.value,
                type:     defineProperty.type,
                of:         defineProperty.of,
                byValue: byValue
            };

            delete defineProperty.value;
        }

    // When a super class based on objectTemplate don't transport properties
        defineProperty.toServer = false;
        defineProperty.toClient = false;
        defineProperties[propertyName] = defineProperty;

    // Add getters and setters
        if (defineProperty.get || defineProperty.set) {
            var userSetter = defineProperty.set;

            defineProperty.set = (function d() {
            // Use a closure to record the property name which is not passed to the setter
                var prop = propertyName;

                return function c(value) {
                    if (userSetter) {
                        value = userSetter.call(this, value);
                    }

                    if (!defineProperty.isVirtual) {
                        this['__' + prop] = value;
                    }
                };
            })();

            var userGetter = defineProperty.get;

            defineProperty.get = (function get() {
            // Use closure to record property name which is not passed to the getter
                var prop = propertyName;

                return function b() {
                    if (userGetter) {
                        if (defineProperty.isVirtual) {
                            return userGetter.call(this, undefined);
                        }

                        return userGetter.call(this, this['__' + prop]);
                    }

                    return this['__' + prop];
                };
            })();

            if (!defineProperty.isVirtual) {
                defineProperties['__' + propertyName] = {enumerable: false, writable: true};
            }

            delete defineProperty.value;
            delete defineProperty.writable;
        }
    };

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
    ObjectTemplate.clone = function clone(obj, template) {
        var copy;

        if (obj instanceof Date) {
            return new Date(obj.getTime());
        }
        else if (obj instanceof Array) {
            copy = [];

            for (var ix = 0; ix < obj.length; ++ix) {
                copy[ix] = this.clone(obj[ix], template);
            }

            return copy;
        }
        else if (template && obj instanceof template) {
            copy = new template();

            for (var prop in obj) {
                if (prop != '__id__' && !(obj[prop] instanceof Function)) {
                    var defineProperty = this._getDefineProperty(prop, template) || {};

                    if (obj.hasOwnProperty(prop)) {
                        copy[prop] = this.clone(obj[prop], defineProperty.of || defineProperty.type || null);
                    }
                }
            }

            return copy;
        }
        else if (obj instanceof Object) {
            copy =  {};

            for (var propc in obj) {
                if (obj.hasOwnProperty(propc)) {
                    copy[propc] = this.clone(obj[propc]);
                }
            }

            return copy;
        }
        else {
            return obj;
        }
    };

/**
 * Purpose unknown
 *
 * @param {unknown} obj unknown
 * @param {unknown} creator unknown
 *
 * @returns {unknown}
 */
    ObjectTemplate.createCopy = function createCopy(obj, creator) {
        return this.fromPOJO(obj, obj.__template__, null, null, undefined, null, null, creator);
    };

/**
 * Purpose unknown
 *
 * @param {unknown} str unknown
 * @param {unknown} template unknown
 * @param {unknown} idQualifier unknown
 *
 * @returns {unknown}
 */
    ObjectTemplate.fromJSON = function fromJSON(str, template, idQualifier) {
        return this.fromPOJO(JSON.parse(str), template, null, null, idQualifier);
    };

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
    ObjectTemplate.fromPOJO = function fromPOJO(pojo, template, defineProperty, idMap, idQualifier, parent, prop, creator) {
        function getId(id) {
            if (typeof(idQualifier) !== 'undefined') {
                return id + '-' + idQualifier;
            }

            return id;
        }

    // For recording back refs
        if (!idMap) {
            idMap = {};
        }

        if (!pojo.__id__) {
            return;
        }

        var obj;

        if (creator) {
            obj = creator(parent, prop, template, idMap[pojo.__id__.toString()], pojo.__transient__);

            if (obj instanceof Array) {
                obj = obj[0];
                idMap[obj.__id__.toString()] = obj;
                return obj;
            }

            if (typeof(obj) === 'undefined') {
                return null;
            }

            if (!obj) {
                this.noInit = true;
                obj = new template();
                this.noInit = false;
            }
        }
        else {
            obj = this._createEmptyObject(template, getId(pojo.__id__.toString()), defineProperty, pojo.__transient__);
        }

        idMap[getId(pojo.__id__.toString())] = obj;

    // Go through all the properties and transfer them to newly created object
        var props = obj.__template__.getProperties();

        for (var propb in pojo) {
            propb = propb.replace(/^__/, '');
            var defineProp = props[propb];
            if (!defineProp)
                continue;
            var type = defineProp.type;

        // Because semotus can serialize only the shadow properties we try and restore them
            var pojoProp = (type && typeof pojo['__' + propb] !== 'undefined') ? '__' + propb : propb;

            if (type && pojo[pojoProp] == null) {
                obj[propb] = null;
            }
            else if (type && typeof(pojo[pojoProp]) !== 'undefined') {
                if (type == Array && defineProp.of && defineProp.of.isObjectTemplate) { // Array of templated objects
                    var arrayDirections = null;

                    if (creator) {
                        arrayDirections = creator(obj, propb, defineProp.of, idMap[pojo.__id__.toString()], pojo.__transient__);
                    }

                    if (typeof(arrayDirections) !== 'undefined') {
                        obj[propb] = [];

                        for (var ix = 0; ix < pojo[pojoProp].length; ++ix) {
                            var atype = pojo[pojoProp][ix].__template__ || defineProp.of;
                            if (pojo[pojoProp][ix]) {
                                if (pojo[pojoProp][ix].__id__ && idMap[getId(pojo[pojoProp][ix].__id__.toString())]) {
                                    obj[propb][ix] = idMap[getId(pojo[pojoProp][ix].__id__.toString())];
                                }
                                else {
                                    obj[propb][ix] = this.fromPOJO(pojo[pojoProp][ix], atype, defineProp, idMap, idQualifier, obj, propb, creator);
                                }
                            }
                            else {
                                obj[propb][ix] = null;
                            }
                        }
                    }
                    else {
                        obj[propb] = [];
                    }
                }
                else if (type.isObjectTemplate) { // Templated objects
                    var otype = pojo[pojoProp].__template__ || type;
                    if (pojo[pojoProp].__id__ && idMap[getId(pojo[pojoProp].__id__.toString())]) {
                        obj[propb] = idMap[getId(pojo[pojoProp].__id__.toString())];
                    }
                    else {
                        obj[propb] = this.fromPOJO(pojo[pojoProp], otype, defineProp, idMap, idQualifier, obj, propb, creator);
                    }
                }
                else if (type == Date) {
                    if (pojo[pojoProp]) {
                        obj[propb] = new Date(pojo[pojoProp]);
                    }
                    else {
                        obj[propb] = null;
                    }
                }
                else {
                    obj[propb] = pojo[pojoProp];
                }
            }
        }

    // For the benefit of persistObjectTemplate
        if (!creator && pojo._id) {
            obj._id = getId(pojo._id);
        }

        function propXfer(prop) {
            if (pojo[prop]) {
                obj[prop] = pojo[prop];
            }
        }

        if (!creator) {
            propXfer('__changed__');
            propXfer('__version__');
        }

        propXfer('__toServer__');
        propXfer('__toClient__');

        return obj;
    };

/**
 * Abstract function for benefit of Semotus
 *
 * @param {unknown} cb unknown
 */
    ObjectTemplate.withoutChangeTracking = function withoutChangeTracking(cb) {
        cb();
    };

/**
 * Convert an object to JSON, stripping any recursive object references so they can be
 * reconstituted later
 *
 * @param {unknown} obj unknown
 * @param {unknown} cb unknown
 *
 * @returns {unknown}
 */
    ObjectTemplate.toJSONString = function toJSONString(obj, cb) {
        var idMap = [];

        try {
            return JSON.stringify(obj, function a(key, value) {
	            if (key === '__objectTemplate__' || key === 'amorphic') {
		            return null;
	            }
	            if (value && value.__template__ && value.__id__) {
                    if (idMap[value.__id__]) {
                        value = {__id__: value.__id__.toString()};
                    }
                    else {
                        idMap[value.__id__.toString()] = value;
                    }
                }

                if (cb) {
                    return cb(key, value);
                }

                return value;
            });
        }
        catch (e) {
            throw e;
        }
    };

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
    ObjectTemplate._resolveSubClass = function resolveSubClass(template, objId, defineProperty) {
        var templateName = '';

        if (objId.match(/-([A-Za-z0-9_:]*)-/)) {
            templateName = RegExp.$1;
        }

    // Resolve template subclass for polymorphic instantiation
        if (defineProperty && defineProperty.subClasses && objId != 'anonymous)') {
            if (templateName) {
                for (var ix = 0; ix < defineProperty.subClasses.length; ++ix) {
                    if (templateName == defineProperty.subClasses[ix].__name__) {
                        template = defineProperty.subClasses[ix];
                    }
                }
            }
        }
        else {
            var subClass = this._findSubClass(template, templateName);

            if (subClass) {
                template = subClass;
            }
        }
        return template;
    };

/**
 * Walk recursively through extensions of template via __children__
 * looking for a name match
 *
 * @param {unknown} template unknown
 * @param {unknown} templateName unknown
 * @returns {*}
 * @private
 */
    ObjectTemplate._findSubClass = function findSubClass(template, templateName) {
        if (template.__name__ == templateName) {
            return template;
        }

        for (var ix = 0; ix < template.__children__.length; ++ix) {
            var subClass = this._findSubClass(template.__children__[ix], templateName);

            if (subClass) {
                return subClass;
            }
        }

        return null;
    };

/**
 * Return the highest level template
 *
 * @param {unknown} template unknown
 *
 * @returns {*}
 *
 * @private
 */
    ObjectTemplate._getBaseClass = function getBaseClass(template) {
        while (template.__parent__) {
            template = template.__parent__;
        }

        return template;
    };

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
    ObjectTemplate._createEmptyObject = function createEmptyObject(template, objId, defineProperty) {
        template = this._resolveSubClass(template, objId, defineProperty);

        var oldStashObject = this._stashObject;

        if (objId) {
            this._stashObject = function stashObject() {
                return true;
            };
        }

        var newValue = new template();
        this._stashObject = oldStashObject;

        if (objId) {
            newValue.__id__ = objId;
        }

        return newValue;
    };

/**
 * Looks up a property in the defineProperties saved with the template cascading
 * up the prototype chain to find it
 *
 * @param {unknown} prop is the property being sought
 * @param {unknown} template is the template used to create the object containing the property
 * @returns {*} the "defineProperty" structure for the property
 * @private
 */
    ObjectTemplate._getDefineProperty = function getDefineProperty(prop, template)  {
        if (template && (template != Object) && template.defineProperties && template.defineProperties[prop]) {
            return template.defineProperties[prop];
        }
        else if (template && template.parentTemplate) {
            return this._getDefineProperty(prop, template.parentTemplate);
        }

        return null;
    };

/**
 * Returns a hash of all properties including those inherited
 *
 * @param {unknown} template is the template used to create the object containing the property
 * @param {unknown} returnValue unknown
 * @param {unknown} includeVirtual unknown
 * @returns {*} an associative array of each "defineProperty" structure for the property
 * @private
 */
    ObjectTemplate._getDefineProperties = function getDefineProperties(template, returnValue, includeVirtual)  {
        if (!returnValue) {
            returnValue = {};
        }

        if (template.defineProperties) {
            for (var prop in template.defineProperties) {
                if (includeVirtual || !template.defineProperties[prop].isVirtual) {
                    returnValue[prop] = template.defineProperties[prop];
                }
            }
        }

        if (template.parentTemplate) {
            this._getDefineProperties(template.parentTemplate, returnValue, includeVirtual);
        }

        return returnValue;
    };

/**
 * A function to clone the Type System
 * @returns {F}
 * @private
 */
    ObjectTemplate._createObject = function createObject() {
        function F() {}
        F.prototype = this;
        var newF =  new F();
        newF.init();
        return newF;
    };

/**
 * Purpose unknown
 * @param {unknown} context unknown
 * @returns {unknown}
 */
    ObjectTemplate.createLogger = function createLogger(context) {
        var levelToStr = {60: 'fatal', 50: 'error', 40: 'warn', 30: 'info', 20: 'debug', 10: 'trace'};
        var strToLevel = {'fatal':60, 'error':50, 'warn':40, 'info':30, 'debug':20, 'trace':10};

        return createLogger(context);

    // Return a new logger object that has our api and a context
        function createLogger() {
            var logger = {
                context: {},
                granularLevels: {},
                level: 'info',
                log: log,
                fatal: function fatal() {
                    this.log.apply(this, [60].concat(Array.prototype.slice.call(arguments)));
                },
                error: function error() {
                    this.log.apply(this, [50].concat(Array.prototype.slice.call(arguments)));
                },
                warn: function warn() {
                    this.log.apply(this, [40].concat(Array.prototype.slice.call(arguments)));
                },
                info: function info() {
                    this.log.apply(this, [30].concat(Array.prototype.slice.call(arguments)));
                },
                debug: function debug() {
                    this.log.apply(this, [20].concat(Array.prototype.slice.call(arguments)));
                },
                trace: function trace() {
                    this.log.apply(this, [10].concat(Array.prototype.slice.call(arguments)));
                },
                setLevel: setLevel,
                sendToLog: sendToLog,
                formatDateTime: formatDateTime,
                split: split,
                startContext: startContext,
                setContextProps: setContextProps,
                clearContextProps: clearContextProps,
                createChildLogger: createChildLogger,
                prettyPrint: prettyPrint
            };

            return logger;
        }

    // Parse log levels such as warn.activity
        function setLevel(level) {
            var levels = level.split(';');

            for (var ix = 0; ix < levels.length; ++ix) {
                var levela = levels[ix];

                if (levela.match(/:/)) {
                    if (levels[ix].match(/(.*):(.*)/)) {
                        this.granularLevels[RegExp.$1] = this.granularLevels[RegExp.$1] || {};
                        this.granularLevels[RegExp.$1] = RegExp.$2;
                    }
                    else {
                        this.level = levels[ix];
                    }
                }
                else {
                    this.level = levela;
                }
            }
        }

    // Logging is enabled if either the level threshold is met or the granular level matches
        function isEnabled(level, obj) {
            level = strToLevel[level];

            if (level >= strToLevel[this.level]) {
                return true;
            }

            if (this.granularLevels) {
                for (var levelr in this.granularLevels) {
                    if (obj[levelr] && obj[levelr] == this.granularLevels[levelr]) {
                        return true;
                    }
                }
            }
        }

    // Log all arguments assuming the first one is level and the second one might be an object (similar to banyan)
        function log() {
            var msg = '';
            var obj = {time: (new Date()).toISOString(), msg: ''};

            for (var prop in this.context) {
                obj[prop] = this.context[prop];
            }

            for (var ix = 0; ix < arguments.length; ++ix) {
                var arg = arguments[ix];

                if (ix == 0) {
                    obj.level = arg;
                }
                else if (ix == 1 && isObject(arg)) {
                    for (var proper in arg) {
                        obj[proper] = arg[proper];
                    }
                }
                else {
                    msg += arg + ' ';
                }
            }

            if (obj.msg.length) {
                obj.msg += ' ';
            }

            if (msg.length) {
                if (obj.module && obj.activity) {
                    obj.msg += obj.module + '[' + obj.activity + '] - ';
                }

                obj.msg += msg;
            }
            else if (obj.module && obj.activity) {
                obj.msg += obj.module + '[' + obj.activity + ']';
            }

            if (isEnabled.call(this, levelToStr[obj.level], obj)) {
                this.sendToLog(levelToStr[obj.level], obj);
            }

            function isObject(obj) {
                return obj != null && typeof(obj) === 'object' && !(obj instanceof Array) && !(obj instanceof Date) && !(obj instanceof Error);
            }
        }

        function startContext(context) {
            this.context = context;
        }

    // Save the properties in the context and return a new object that has the properties only so they can be cleared
        function setContextProps(context) {
            var reverse = {};

            for (var prop in context) {
                reverse[prop] = true;
                this.context[prop] = context[prop];
            }

            return reverse;
        }

    // Remove any properties recorded by setContext
        function clearContextProps(contextToClear) {
            for (var prop in contextToClear) {
                delete this.context[prop];
            }
        }

    // Create a new logger and copy over it's context
        function createChildLogger(context) {
            var child = {};

            for (var prop in this) {
                child[prop] = this[prop];
            }

            child.context = context || {};

            for (var proper in this.context) {
                child.context[proper] = this.context[proper];
            }

            return child;
        }

        function formatDateTime(date) {
            return  f(2, (date.getMonth() + 1), '/') + f(2, date.getDate(), '/') + f(4, date.getFullYear(), ' ') +
            f(2, date.getHours(), ':') + f(2, date.getMinutes(), ':') + f(2, date.getSeconds(), ':') +
            f(3, date.getMilliseconds()) + ' GMT' + (0 - date.getTimezoneOffset() / 60);

            function f(z, d, s) {
                while (String(d).length < z) {
                    d = '0' + d;
                }

                return d + (s || '');
            }
        }

        function sendToLog(level, json) {
            console.log(this.prettyPrint(level, json));     // eslint-disable-line no-console
        }

        function prettyPrint(level, json) {
            var split = this.split(json, {time: 1, msg: 1, level: 1, name: 1});

            return this.formatDateTime(new Date(json.time)) + ': ' + level.toUpperCase() + ': ' +  o(split[1].name, ': ') + o(split[1].msg, ': ') + xy(split[0]);

            function o (s, d) {
                if (s) {
                    return s + d;
                }

                return '';
            }

            function xy(j) {
                var str = '';
                var sep = '';

                for (var prop in j) {
                    str += sep + prop + '=' + JSON.stringify(j[prop]);
                    sep = ' ';
                }

                if (str.length > 0) {
                    return '(' + str + ')';
                }

                return '';
            }
        }

        function split (json, props) {
            var a = {};
            var b = {};

            for (var prop in json) {
                (props[prop] ? b : a)[prop] = json[prop];
            }

            return [a, b];
        }
    };

    ObjectTemplate.init();

    /**
     * 
     * @param {*} objectProps- optional property for passing params into supertypeclass, if no params, is undefined,
     *                      first param of this function defaults to objectTemplate instead
     * @param {*} objectTemplate 
     */
    ObjectTemplate.supertypeClass = function (objectProps, objectTemplate) {

        // When used as @supertypeClass({bla bla bla}), the decorator is first called as it is
        // is being passed into the decorator processor and so it needs to return a function
        // so that it will be called again when the decorators are actually processed.  Kinda spliffy.

        // Called by decorator processor
        if (objectProps.prototype) {
            return decorator(objectProps);
        }

        // Called first time with parameter
        var props = objectProps;
        return decorator;

        // Decorator Workerbee
        function decorator (target) {
            objectTemplate = objectTemplate || ObjectTemplate;

            target.prototype.__template__ = target;
            target.prototype.amorphicClass = target;
            target.prototype.amorphicGetClassName = function () {return target.__name__};
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
            Object.defineProperty(target, 'defineProperties', {get: defineProperties});
            Object.defineProperty(target, 'amorphicProperties', {get: defineProperties});
            Object.defineProperty(target, '__name__', {get: getName});
            Object.defineProperty(target, 'amorphicClassName', {get: getName});
            Object.defineProperty(target, 'parentTemplate', {get: getParent});
            Object.defineProperty(target, '__parent__', {get: getParent});
            Object.defineProperty(target, '__children__', {get: getChildren});
            Object.defineProperty(target, 'amorphicParentClass', {get: getParent});
            Object.defineProperty(target, 'amorphicChildClasses', {get: getChildren});
            Object.defineProperty(target, 'amorphicStatic', {get: function () {return objectTemplate}});

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
                            {enumerable: true, writable: true, value: defineProperty.value});
                    }
                    else {
                        Object.defineProperty(target.prototype, propertyName, {enumerable: true,
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

            if (target.prototype.__exceptions__)  {
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
            function getName () {
                return target.toString().match(/function ([^(]*)/)[1];
            }
            function getDictionary () {
                objectTemplate.getClasses();
            }
            function getParent () {
                getDictionary();
                return target.__shadowParent__;
            }
            function getChildren () {
                getDictionary();
                return target.__shadowChildren__;
            }

        /*
        TODO: Typescript
        Looking at the supertype constructor these need to be dealt with
        - createProperties used by client.js to add Persistor, Get and Fetch
        - injections
        */
            function constructorName(constructor) {
                var namedFunction = constructor.toString().match(/function ([^(]*)/);
                return namedFunction ? namedFunction[1] : null;
            }
        }
    };

    ObjectTemplate.getClasses = function () {
        if (this.__templates__) {
            for (var ix = 0; ix < this.__templates__.length; ++ix) {
                var template = this.__templates__[ix];
                this.__dictionary__[constructorName(template)] = template;
                this.__templatesToInject__[constructorName(template)] = template;
                processDeferredTypes(template);
            }
            this.__templates__ = undefined;
            for (var templateName1 in this.__dictionary__) {
                var template = this.__dictionary__[templateName1];
                var parentTemplateName = constructorName(Object.getPrototypeOf(template.prototype).constructor);
                template.__shadowParent__ = this.__dictionary__[parentTemplateName];
                if (template.__shadowParent__) {
                    template.__shadowParent__.__shadowChildren__.push(template);
                }
                template.props = {};
                var propst = ObjectTemplate._getDefineProperties(template, undefined, true);
                for (var propd in propst) {
                    template.props[propd] = propst[propd];
                }
            }
            if (this.__exceptions__) {
                throw new Error(this.__exceptions__.map(createMessageLine).join('\n'));
            }
        }
        function createMessageLine (exception) {
            return exception.func(exception.class(), exception.prop);
        }
        function processDeferredTypes(template) {
            if (template.prototype.__deferredType__) {
                for (var prop in template.prototype.__deferredType__) {
                    var defineProperty = template.defineProperties[prop];
                    if (defineProperty) {
                        var type = template.prototype.__deferredType__[prop]();
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
            var namedFunction = constructor.toString().match(/function ([^(]*)/);
            return namedFunction ? namedFunction[1] : null;
        }

    };

/**
 * This is the base class for typescript classes.  It must
 * It will inject members into the object from both the template and objectTemplate
 * @param {ObjectTemplate} - other layers can pass in their own object template (this is the object not ObjectTemplate)
 * @returns {Object} the object itself
 */
    ObjectTemplate.Supertype = function (objectTemplate) {

        objectTemplate = objectTemplate || ObjectTemplate;

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

        return this;

        function constructorName(constructor) {
            var namedFunction = constructor.toString().match(/function ([^(]*)/);
            return namedFunction ? namedFunction[1] : null;
        }

    };

    ObjectTemplate.Supertype.prototype.amorphicToJSON = function (cb) {
        return ObjectTemplate.toJSONString(this, cb);
    };


    ObjectTemplate.Supertype.prototype.amorphicGetPropertyDefinition = function (prop) {
        return ObjectTemplate._getDefineProperty(prop, this.__template__);
    };

    ObjectTemplate.Supertype.prototype.amorphicGetPropertyValues = function f(prop) {
        var defineProperty = this.__prop__(prop) || this.__prop__('_' + prop);

        if (typeof(defineProperty.values) === 'function') {
            return defineProperty.values.call(this);
        }
        return defineProperty.values;
    };

    ObjectTemplate.Supertype.prototype.amorphicGetPropertyDescriptions = function e(prop) {
        var defineProperty = this.__prop__(prop) || this.__prop__('_' + prop);

        if (typeof(defineProperty.descriptions) === 'function') {
            return defineProperty.descriptions.call(this);
        }

        return defineProperty.descriptions;
    };

    ObjectTemplate.Supertype.prototype.__prop__ = ObjectTemplate.Supertype.prototype.amorphicGetPropertyDefinition;
    ObjectTemplate.Supertype.prototype.__values__ = ObjectTemplate.Supertype.prototype.amorphicGetPropertyValues;
    ObjectTemplate.Supertype.prototype.__descriptions__ = ObjectTemplate.Supertype.prototype.amorphicGetPropertyDescriptions;
    ObjectTemplate.Supertype.prototype.toJSONString = ObjectTemplate.Supertype.prototype.amorphicToJSON;
    ObjectTemplate.Supertype.prototype.inject = function inject(injector) {
        ObjectTemplate.inject(this, injector);
    };
	ObjectTemplate.Supertype.prototype.createCopy = function fromPOJO(creator) {
		var obj = this;
		return ObjectTemplate.fromPOJO(obj, obj.__template__, null, null, undefined, null, null, creator);
	};
    ObjectTemplate.Supertype.prototype.copyProperties = function copyProperties(obj) {
        for (var prop in obj) {
            this[prop] = obj[prop];
        }
    };

	ObjectTemplate.property = function (props) {
        require('reflect-metadata');
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

    ObjectTemplate.remote = function (defineProperty) {
        return function (target, propertyName, descriptor) {
        };
    };

    ObjectTemplate.amorphicStatic = ObjectTemplate;

    return ObjectTemplate;

}));
