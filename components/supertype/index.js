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

function ObjectTemplate() {
}

ObjectTemplate.performInjections = function ()
{
    if (this.__templatesToInject__) {
        var objectTemplate = this;
        for (var templateName in this.__templatesToInject__) {
            var template = this.__templatesToInject__[templateName];
            template.inject = function (injector) {
                objectTemplate.inject(this, injector);
            }
            this._injectIntoTemplate(template);
        }
    }
}
ObjectTemplate.init = function () {
    this.__injections__ = [];
    this.__dictionary__ = {};
    this.__anonymousId__ = 1;
    this.__templatesToInject__ = {};
}
ObjectTemplate.getTemplateByName = function (name) {
    return this.__dictionary__[name];
}
ObjectTemplate.setTemplateProperties = function(template, name, props)
{
    this.__templatesToInject__[name] = template;
    this.__dictionary__[name] = template;
    template.__name__ = name;
    template.__injections__ = [];
    template.__objectTemplate__ = this;
    template.__children__ = [];
    props = props || {};
    if (props.isLocal) {
        props.toServer = false;
        props.toClient = false;
    }
    template.__toClient__ = props.toClient == false ?  false : true;
    template.__toServer__ = props.toServer == false ?  false : true;
};

/**
 * Create and object template that is instantiated with the new operator.
 * properties is
 * @param name the name of the template or an object with
 *        name - the name of the class
 *        toClient - whether the object is to be shipped to the client (with semotus)
 *        toServer - whether the object is to be shipped to the server (with semotus)
 *        isLocal - equivalent to setting toClient && toServer to false
 * @param properties an object whose properties represent data and function
 * properties of the object.  The data properties may use the defineProperty
 * format for properties or may be properties assigned a Number, String or Date.
 * @return {*} the object template
 */
ObjectTemplate.create = function (name, properties) {
    if (typeof(name) != 'undefined' && name.name) {
        var props = name;
        name = props.name;
    }
    if (typeof(name) != 'string' || name.match(/[^A-Za-z0-9_]/))
        throw new Error("incorrect template name");
    if (typeof(properties) != 'object')
        throw new Error("missing template property definitions");
    var template = this._createTemplate(null, Object, properties ? properties : name);
    this.setTemplateProperties(template, name, props);
    return template;
};

/**
 * Extend and existing (parent template)
 *
 * @param parentTemplate
 * @param the name of the template
 * @param properties are the same as for create
 * @return {*} the object template
 */
ObjectTemplate.extend = function (parentTemplate, name, properties)
{
    if (!parentTemplate.__objectTemplate__)
        throw new Error("incorrect parent template");
    if (typeof(name) != 'string' || name.match(/[^A-Za-z0-9_]/))
        throw new Error("incorrect template name");
    if (typeof(properties) != 'object')
        throw new Error("missing template property definitions");
    var template = this._createTemplate(null, parentTemplate, properties ? properties : name);
    this.setTemplateProperties(template, name);

    // Maintain graph of parent and child templates
    template.__parent__ = parentTemplate;
    parentTemplate.__children__.push(template);
    return template;
};

/**
 *  Mix in addition properties into a template
 *
 * @param template to mix into
 * @param properties are the same as for create
 * @return {*} the template with the new properties mixed in
 */
ObjectTemplate.mixin = function (template, properties)
{
    return this._createTemplate(template, null, properties);
};

/**
 * Add a function that will fire on object creation
 *
 * @param injector
 */
ObjectTemplate.inject = function (template, injector) {
    template.__injections__.push(injector);
}
ObjectTemplate.globalInject = function (injector) {
    this.__injections__.push(injector);
}

/**
 * General function to create templates used by create, extend and mixin
 *
 * @param template - template used for a mixin
 * @param parentTemplate - template used for an extend
 * @param properties - properties to be added/mxied in
 * @return {Function}
 * @private
 */
ObjectTemplate._createTemplate = function (template, parentTemplate, properties)
{
    // We will return a constructor that can be used in a new function
    // that will call an init() function found in properties, define properties using Object.defineProperties
    // and make copies of those that are really objects
    var functionProperties = {};	// Will be populated with init function from properties
    var objectProperties = {};	// List of properties to be processed by hand
    var defineProperties = {};	// List of properties to be sent to Object.defineProperties()
    var objectTemplate = this;
    var templatePrototype;

    // Setup variables depending on the type of call (create, extend, mixin)
    if (template) { // mixin
        defineProperties = template.defineProperties;
        objectProperties = template.objectProperties;
        functionProperties = template.functionProperties;
        templatePrototype = template.prototype;
        parentTemplate = template.parentTemplate;
    } else {		// extend
        function F() {}
        F.prototype = parentTemplate.prototype;
        templatePrototype = new F();
    }

    /**
     * Constructor that will be returned
     */
    var template = function() {

        this.__template__ = template;
        if (objectTemplate.__transient__) {
            this.__transient__ = true;
        }
        var prunedObjectProperties = pruneExisting(this, objectProperties);
        var prunedDefineProperties = pruneExisting(this, defineProperties);

        try {
            // Create properties either with EMCA 5 defineProperties or by hand
            if (Object.defineProperties)
                Object.defineProperties(this, prunedDefineProperties);	// This method will be added pre-EMCA 5
        } catch (e) {
            console.log(e);
        }
        this.fromRemote = this.fromRemote || objectTemplate._stashObject(this, template);

        this.copyProperties = function (obj) {
            for (var prop in obj)
                this[prop] = obj[prop];
        }


        // Initialize properties from the defineProperties value property
        for (var propertyName in prunedObjectProperties) {
            var defineProperty = prunedObjectProperties[propertyName];
            if (typeof(defineProperty.init) != 'undefined')
                if (defineProperty.byValue)
                    this[propertyName] = ObjectTemplate.clone(defineProperty.init, defineProperty.of || defineProperty.type || null);
                else
                    this[propertyName] = (defineProperty.init);
        }

        // type system level injection
        objectTemplate._injectIntoObject(this);

        // Template level injections
        for (var ix = 0; ix < template.__injections__.length; ++ix)
            template.__injections__[ix].call(this, this);

        // Global injections
        for (var ix = 0; ix < objectTemplate.__injections__.length; ++ix)
            objectTemplate.__injections__[ix].call(this, this);

        // If we don't have an init function or are a remote creation call parent constructor otherwise call init
        // function who will be responsible for calling parent constructor to allow for parameter passing.
        if (this.fromRemote || !functionProperties.init || objectTemplate.noInit) {
            if (parentTemplate && parentTemplate.isObjectTemplate)
                parentTemplate.call(this);
        } else {
            if (functionProperties.init)
                functionProperties.init.apply(this, arguments);
        }

        this.__template__ = template;
        this.__prop__ = function(prop) {
            return ObjectTemplate._getDefineProperty(prop, this.__template__);
        }
        this.toJSONString = function(cb) {
            return ObjectTemplate.toJSONString(this, cb);
        }
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
        this.createCopy = function(creator) {
            return ObjectTemplate.createCopy(this, creator);
        };

        function pruneExisting(obj, props) {
            var newProps = {};
            for (var prop in props)
                if (typeof(obj[prop]) == 'undefined')
                    newProps[prop] = props[prop];
            return newProps;
        }
    };

    template.prototype = templatePrototype;


    var createProperty = function (propertyName, propertyValue, properties) {
        if (!properties) {
            properties = {};
            properties[propertyName] = propertyValue;
        }

        // record the initialization function
        if (propertyName == 'init' && typeof(properties[propertyName]) == 'function') {
            functionProperties.init = properties[propertyName];
        } else
        {
            var defineProperty = null;	// defineProperty to be added to defineProperties

            // Determine the property value which may be a defineProperties structure or just an initial value
            var descriptor = properties ? Object.getOwnPropertyDescriptor(properties, propertyName) : {};
            var type = descriptor.get || descriptor.set ? 'getset' : ((properties[propertyName] == null) ? 'null' : typeof(properties[propertyName]));
            switch (type) {

                // Figure out whether this is a defineProperty structure (has a constructor of object)
                case 'object': // or array
                    // Handle remote function calls
                    if (properties[propertyName].body && typeof(properties[propertyName].body) == "function") {
                        templatePrototype[propertyName] =
                            objectTemplate._setupFunction(propertyName, properties[propertyName].body, properties[propertyName].on, properties[propertyName].validate);
                        if (properties[propertyName].type)
                            templatePrototype[propertyName].__returns__ = properties[propertyName].type;
                        if (properties[propertyName].of) {
                            templatePrototype[propertyName].__returns__ = properties[propertyName].of;
                            templatePrototype[propertyName].__returnsarray__ = true;
                        }
                        break;
                        //var origin = properties[propertyName].constructor.toString().replace(/^function */m,'').replace(/\(.*/m,'');
                        //if (origin.match(/^Object/)) { // A defineProperty type definition
                    } else if (properties[propertyName].type) {
                        defineProperty = properties[propertyName];
                        properties[propertyName].writable = true;  // We are using setters
                        if (typeof(properties[propertyName].enumerable) == 'undefined')
                            properties[propertyName].enumerable = true;
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
                    break;

                case 'getset': // getters and setters
                    Object.defineProperty(templatePrototype, propertyName, descriptor);
                    break;
            }

            // If a defineProperty to be added
            if (defineProperty)
                objectTemplate._setupProperty(propertyName, defineProperty, objectProperties, defineProperties, parentTemplate);
        }
    }

    // Walk through properties and construct the defineProperties hash of properties, the list of
    // objectProperties that have to be reinstantiated and attach functions to the prototype
    for (var propertyName in properties) {
        createProperty(propertyName, null, properties);
    };

    template.defineProperties = defineProperties;
    template.objectProperties = objectProperties;
    template.getProperties = function() {
        return ObjectTemplate._getDefineProperties(template);
    }

    template.functionProperties = functionProperties;
    template.parentTemplate = parentTemplate;

    template.extend = function (p1, p2) {
        return objectTemplate.extend.call(objectTemplate, this, p1, p2);
    };
    template.mixin = function (p1, p2) {
        return objectTemplate.mixin.call(objectTemplate, this, p1, p2);
    };
    template.fromPOJO = function(pojo) {
        return objectTemplate.fromPOJO(pojo, template);
    };
    template.fromJSON = function(str, idPrefix) {
        return objectTemplate.fromJSON(str, template, idPrefix);
    };

    template.isObjectTemplate = true;
    template.createProperty = createProperty;

    return template;
}
/**
 * Overridden by other Type Systems to cache or globally identify objects
 * Also assigns a unique internal Id so that complex structures with
 * recursive objects can be serialized
 *
 * @param obj - the object to be passed during creation time
 * @private
 */
ObjectTemplate._stashObject = function(obj, template)
{
    if (!obj.__id__) {
        if (!ObjectTemplate.nextId)
            ObjectTemplate.nextId = 1;
        obj.__id__ = "local-" + template.__name__ + "-" + ++ObjectTemplate.nextId;
        //obj.__id__ = ++ObjectTemplate.nextId;
    }
    return false;
};
/**
 * Overridden by other Type Systems to inject other elements
 *
 * @param obj - the object to be passed during creation time
 * @private
 */
ObjectTemplate._injectIntoObject = function(obj) {
};
/**
 * Overridden by other Type Systems to inject other elements
 *
 * @param obj - the object to be passed during creation time
 * @private
 */
ObjectTemplate._injectIntoTemplate = function(template){
};
/**
 * Overridden by other Type Systems to be able to create remote functions or
 * otherwise intercept function calls
 *
 * @param propertyName is the name of the function
 * @param propertyValue is the function itself
 * @return {*} a new function to be assigned to the object prototype
 * @private
 */
ObjectTemplate._setupFunction = function(propertyName, propertyValue) {
    return propertyValue;
};

/**
 * Used by template setup to create an property descriptor for use by the constructor
 *
 * @param propertyName is the name of the property
 * @param defineProperty is the property descriptor passed to the template
 * @param objectProperties is all properties that will be processed manually.  A new property is
 *                         added to this if the property needs to be initialized by value
 * @param defineProperties is all properties that will be passed to Object.defineProperties
 *                         A new property will be added to this object
 * @private
 */
ObjectTemplate._setupProperty = function(propertyName, defineProperty, objectProperties, defineProperties) {
    //determine whether value needs to be re-initialized in constructor
    var value   = defineProperty.value;
    var byValue = value && typeof(value) != 'number' && typeof(value) != 'string';
    if (byValue || !Object.defineProperties) {
        objectProperties[propertyName] = {
            init:	 defineProperty.value,
            type:	 defineProperty.type,
            of:		 defineProperty.of,
            byValue: byValue
        };
        delete defineProperty.value;
    }
    // When a super class based on objectTemplate don't transport properties
    defineProperty.toServer = false;
    defineProperty.toClient = false;
    defineProperties[propertyName] = defineProperty;
};

/**
 *
 * Clone an object created from an ObjectTemplate
 * Used only within supertype (see copyObject for general copy)
 *
 * @param obj is the source object
 * @param template is the template used to create the object
 * @return {*} a copy of the object
 */
// Function to clone simple objects using ObjectTemplate as a guide
ObjectTemplate.clone = function (obj, template)
{
    if (obj instanceof Date)
        return new Date(obj.getTime());
    else if (obj instanceof Array) {
        var copy = [];
        for (var ix = 0; ix < obj.length; ++ix)
            copy[ix] = this.clone(obj[ix], template);
        return copy;
    } else if (template && obj instanceof template) {
        var copy = new template();
        for (var prop in obj) {
            if (prop != '__id__' && !(obj[prop] instanceof Function)) {
                var defineProperty = this._getDefineProperty(prop, template) || {};
                if (obj.hasOwnProperty(prop))
                    copy[prop] = this.clone(obj[prop], defineProperty.of || defineProperty.type || null);
            }
        }
        return copy;
    } else if (obj instanceof Object) {
        var copy =  {};
        for (var prop in obj) {
            if (obj.hasOwnProperty(prop))
                copy[prop] = this.clone(obj[prop]);
        }
        return copy;
    } else
        return obj;
};
ObjectTemplate.createCopy = function (obj, creator) {
    return this.fromPOJO(obj, obj.__template__, null, null, undefined, null, null, creator);
};
ObjectTemplate.fromJSON = function (str, template, idQualifier)
{
    return this.fromPOJO(JSON.parse(str), template, null, null, idQualifier);
}
ObjectTemplate.fromPOJO = function (pojo, template, defineProperty, idMap, idQualifier, parent, prop, creator)
{
    function getId(id) {
        return typeof(idQualifier) != 'undefined' ? id + '-' + idQualifier : id
    };

    // For recording back refs
    if (!idMap)
        idMap = {};

    if (!pojo.__id__)
        return;

    if (creator) {
        var obj = creator(parent, prop, template, idMap[pojo.__id__.toString()], pojo.__transient__);
        //console.log ("creator returned " + obj + " on " + template.__name__ + "." + prop);
        if (obj instanceof Array) {
            obj = obj[0];
            idMap[obj.__id__.toString()] = obj;
            return obj;
        }
        if (!obj) {
            this.noInit = true;
            obj = new template();
            this.noInit = false;
        }
    } else
        var obj = this._createEmptyObject(template, getId(pojo.__id__.toString()), defineProperty, pojo.__transient__);
    idMap[getId(pojo.__id__.toString())] = obj;

    // Go through all the properties and transfer them to newly created object
    var props = obj.__template__.getProperties();
    for (var prop in props) {
        var value = pojo[prop];
        var defineProperty = props[prop];
        var type = defineProperty.type;
        if (type && pojo[prop] == null)
            obj[prop] = null;
        else if (type && typeof(pojo[prop]) != 'undefined')
            if (type == Array && defineProperty.of && defineProperty.of.isObjectTemplate) // Array of templated objects
            {
                obj[prop] = [];
                for (var ix = 0; ix < pojo[prop].length; ++ix)
                    obj[prop][ix] = pojo[prop][ix] ?
                        (pojo[prop][ix].__id__ && idMap[getId(pojo[prop][ix].__id__.toString())] ?
                            idMap[getId(pojo[prop][ix].__id__.toString())] :
                            this.fromPOJO(pojo[prop][ix], defineProperty.of, defineProperty, idMap, idQualifier, obj, prop, creator))
                        : null;
            }
            else if (type.isObjectTemplate) // Templated objects

                obj[prop] =	(pojo[prop].__id__ && idMap[getId(pojo[prop].__id__.toString())] ?
                    idMap[getId(pojo[prop].__id__.toString())] :
                    this.fromPOJO(pojo[prop], type,  defineProperty, idMap, idQualifier, obj, prop, creator));

            else if (type == Date)
                obj[prop] = pojo[prop] ? new Date(pojo[prop]) : null;
            else
                obj[prop] = pojo[prop];
    }
    if (!creator && pojo._id) // For the benefit of persistObjectTemplate
        obj._id = getId(pojo._id);

    function propXfer(prop) {
        if (pojo[prop])
            obj[prop] = pojo[prop];
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
 * Convers and object to JSON, stripping any recursive object references so they can be
 * reconstituted later
 *
 * @param obj
 */
ObjectTemplate.toJSONString = function (obj, cb) {
    var idMap = [];
    try {
        return JSON.stringify(obj, function (key, value) {
            if (value && value.__template__ && value.__id__)
                if (idMap[value.__id__])
                    value = {__id__: value.__id__.toString()}
                else
                    idMap[value.__id__.toString()] = value;
            return cb ? cb(key, value) : value;
        });
    } catch (e) {
        throw e;
    }
}
/**
 * Find the right subclass to instantiate by either looking at the
 * declared list in the subClasses define property or walking through
 * the subclasses of the declared template
 *
 * @param template
 * @param objId
 * @param defineProperty
 * @returns {*}
 * @private
 */
ObjectTemplate._resolveSubClass = function (template, objId, defineProperty)
{
    var templateName = objId.match(/-([A-Za-z0-9_:]*)-/) ? RegExp.$1 : "";
    // Resolve template subclass for polymorphic instantiation
    if (defineProperty && defineProperty.subClasses && objId != "anonymous)") {
        if (templateName)
            for (var ix = 0; ix < defineProperty.subClasses.length; ++ix)
                if (templateName == defineProperty.subClasses[ix].__name__)
                    template = defineProperty.subClasses[ix];
    } else {
        var subClass = this._findSubClass(template, templateName);
        if (subClass)
            template = subClass;
    }
    return template;
}
/**
 * Walk recursively through extensions of template via __children__
 * looking for a name match
 *
 * @param template
 * @param templateName
 * @returns {*}
 * @private
 */
ObjectTemplate._findSubClass = function (template, templateName) {
    if (template.__name__ == templateName)
        return template;
    for (var ix = 0; ix < template.__children__.length; ++ix) {
        var subClass = this._findSubClass(template.__children__[ix], templateName);
        if (subClass)
            return subClass;
    }
    return null;
}
/**
 * Return the highest level template
 *
 * @param template
 * @returns {*}
 * @private
 */
ObjectTemplate._getBaseClass = function(template) {
    while(template.__parent__)
        template = template.__parent__
    return template;
}
/**
 * An overridable function used to create an object from a template and optionally
 * manage the caching of that object (used by derivative type systems).  It
 * preserves the original id of an object
 *
 * @param type of object
 * @param objId and id (if present)
 * @return {*}
 * @private
 */
ObjectTemplate._createEmptyObject = function(template, objId, defineProperty)
{
    template = this._resolveSubClass(template, objId, defineProperty);

    var oldStashObject = this._stashObject;
    if (objId)
        this._stashObject = function(){return true};
    var newValue = new template();
    this._stashObject = oldStashObject;
    if (objId)
        newValue.__id__ = objId;
    return newValue;
};

/**
 * Looks up a property in the defineProperties saved with the template cascading
 * up the prototype chain to find it
 *
 * @param prop is the property being sought
 * @param template is the template used to create the object containing the property
 * @return {*} the "defineProperty" structure for the property
 * @private
 */
ObjectTemplate._getDefineProperty = function(prop, template)
{
    return	template && (template != Object) && template.defineProperties && template.defineProperties[prop] ?
        template.defineProperties[prop] :
        template && template.parentTemplate ?
            this._getDefineProperty(prop, template.parentTemplate) :
            null;
};
/**
 * returns a hash of all properties including those inherited
 *
 * @param template is the template used to create the object containing the property
 * @return {*} an associative array of each "defineProperty" structure for the property
 * @private
 */
ObjectTemplate._getDefineProperties = function(template, returnValue)
{
    if (!returnValue)
        returnValue = {};

    if (template.defineProperties)
        for (var prop in template.defineProperties)
            returnValue[prop] = template.defineProperties[prop]
    if (template.parentTemplate)
        this._getDefineProperties(template.parentTemplate, returnValue);

    return returnValue;
};
/**
 * A function to clone the Type System
 * @return {F}
 * @private
 */
ObjectTemplate._createObject = function () {

    function F() {}
    F.prototype = this;
    var newF =  new F();
    newF.init();
    return newF;
};

ObjectTemplate.init();

if (typeof(module) != 'undefined')
    module.exports = ObjectTemplate;