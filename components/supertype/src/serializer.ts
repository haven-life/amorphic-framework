/**
 * ObjectTemplate.toJSONString;
 */
/**
 * Convert an object to JSON, stripping any recursive object references so they can be
 * reconstituted later
 *
 * @param {unknown} obj unknown
 * @param {unknown} cb unknown
 *
 * @returns {unknown}
 */
export function toJSONString(obj, cb?) {
    var idMap = [];

    try {
        return JSON.stringify(obj, function a(key, value) {
            if (key === '__objectTemplate__' || key === 'amorphic') {
                return null;
            }
            if (value && value.__template__ && value.__id__) {
                if (idMap[value.__id__]) {
                    value = { __id__: value.__id__.toString() };
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
}

function propXfer(prop, pojo, obj) {
    if (pojo[prop]) {
        obj[prop] = pojo[prop];
    }
}

/**
 * ObjectTemplate.fromPOJO
 */
export function fromPOJO(pojo, template, defineProperty?, idMap?, idQualifier?, parent?, prop?, creator?) {
    function getId(id) {
        if (typeof (idQualifier) !== 'undefined') {
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

        if (typeof (obj) === 'undefined') {
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
        else if (type && typeof (pojo[pojoProp]) !== 'undefined') {
            if (type == Array && defineProp.of && defineProp.of.isObjectTemplate) { // Array of templated objects
                var arrayDirections = null;

                if (creator) {
                    arrayDirections = creator(obj, propb, defineProp.of, idMap[pojo.__id__.toString()], pojo.__transient__);
                }

                if (typeof (arrayDirections) !== 'undefined') {
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

    if (!creator) {
        propXfer('__changed__', pojo, obj);
        propXfer('__version__', pojo, obj);
    }

    propXfer('__toServer__', pojo, obj);
    propXfer('__toClient__', pojo, obj);

    return obj;
};


/**
 * ObjectTemplate.fromJSON
 */
export function fromJSON(str, template, idQualifier) {
    return this.fromPOJO(JSON.parse(str), template, null, null, idQualifier);
};
