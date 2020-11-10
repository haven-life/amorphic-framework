// Identifies changes for change tracking purposes

import {ChangeTracking, ObjectChanges, PropertyChanges} from '../../types';

export namespace IdentifyChanges {

    // Entrance from Mappers
    export function generateChanges(obj, action: string, changeTracking: ChangeTracking, notifyChanges) {

        if (notifyChanges && isChangeTrackingEnabled(obj)) {
            const templateName = obj.__template__.__name__;
            let objChanges: ObjectChanges = {
                table: obj.__template__.__table__,
                primaryKey: obj._id,
                action: action,
                properties: []
            };

            changeTracking = changeTracking || {};
            changeTracking[templateName] = changeTracking[templateName] || [];

            if (action === 'update' || action === 'delete') {
                const props = obj.__template__.getProperties();
                for (var prop in props) {
                    if (!isArrayOrPersistorShadowProp(props, prop)) {
                        generatePropertyChanges(props, objChanges, prop, obj);
                    }
                }
            }

            // Pushing changes into changeTracking for postSave
            changeTracking[templateName].push(objChanges);
        }
    }

    function isChangeTrackingEnabled(obj) {
        return !!(obj.__template__ && obj.__template__.__schema__ && obj.__template__.__schema__.enableChangeTracking);
    }

    // This is a confusing function, however, I've decoded it.
    // Prop[propName] here, is the property definition of a property within a class, and not the actual instance itself
    // For example props[propName] for homeAddress field could be {toClient: true} or {getType: () => Array }, etc.
    // However, we also have persistor shadow properties to hold metadata (fancy word for junk) about the original property.
    // So homeAddressPersistor will have the isFetched, id fields as well.
    // We don't want to then generate property changes for any of these shadow props, or even for the Array refs,
    // which we handle at a later time (I suppose)
    function isArrayOrPersistorShadowProp(props, propName) {
        const propertyDefinition = props[propName];
        const isArrayOrObjectTemplate = propertyDefinition.type === Array && propertyDefinition.of.isObjectTemplate;
        // @TODO: This may be buggy as propName.match(/Persistor$/) used to be prop.match(/Persistor$/), but prop is not in this scope
        const isPersistorObject = propName.match(/Persistor$/) && typeof props[propName.replace(/Persistor$/, '')] === 'object';
        return isArrayOrObjectTemplate || isPersistorObject;
    }

    function generatePropertyChanges(props, objChanges, prop, obj) {
        // When the property type is not an object template, need to compare the values.
        // for date and object types, need to compare the stringified values.
        let newValue;
        let changedProperties: PropertyChanges = {};
        const oldKey = `_ct_org_${prop}`;
        const oldValue = obj[oldKey];
        const propertyDefinition = props[prop];

        if (!propertyDefinition.type.isObjectTemplate) {
            newValue = obj[prop];
            if (oldValue !== newValue || (dateOrObject(propertyDefinition.type) && !isStringifiesEqual(oldValue, newValue))) {
                changedProperties = {
                    name: prop,
                    originalValue: oldValue,
                    newValue: newValue,
                    columnName: prop
                };
            }
        } else {
            newValue = obj[`${prop}Persistor`];
            if (newValue && oldValue !== newValue.id) {
                changedProperties = {
                    name: prop,
                    originalValue: oldValue, // @TODO: why is this oldValue and not oldValue.id?
                    newValue: newValue.id, // @TODO: Why is this newValue and not newValue.id?
                    columnName: getColumnName(prop, obj)
                };
            }
        }

        if (!(Object.entries(changedProperties).length === 0 && changedProperties.constructor === Object)) {
            objChanges.properties.push(changedProperties);
        }
    }

    function dateOrObject(type) {
        return type === Date || type === Object;
    }

    function isStringifiesEqual(oldValue, newValue) {
        return JSON.stringify(oldValue) === JSON.stringify(newValue)
    }


    function getColumnName(prop, obj): string {
        let schema = obj.__template__.__schema__;
        if (!schema || !schema.parents || !schema.parents[prop] || !schema.parents[prop].id) {
            throw new Error(`${obj.__template__.__name__}.${prop} is missing a parents schema entry`);
        }
        return schema.parents[prop].id;
    }
}