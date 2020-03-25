"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * @TODO: This should be consolidated with Supertype's version when we finish converting to typescript
 */
// Context Switch Chain:
// 1st pass: Semotus (sClass) -> Supertype (sClass) -> Semotus (return Ret)
// 2nd pass: Semotus (sClass) -> Semotus (decorator) -> Supertype (eval ret) -> Semotus (return)
function supertypeClass(objectTemplate, SupertypeModule, target) {
    var ret;
    var ObjectTemplate = SupertypeModule.default;
    var syncStates = undefined;
    // Decorator workerbee
    var decorator = function decorator(target) {
        // second time we must call the function returned the first time because it has the
        // properties as a closure
        if (ret) {
            ret = ret(target, objectTemplate);
        }
        else {
            ret = SupertypeModule.supertypeClass(target, objectTemplate);
        }
        // Mainly for persistor properties to make sure they get transported
        target.createProperty = function (propertyName, defineProperty) {
            if (defineProperty.body) {
                target.prototype[propertyName] = objectTemplate._setupFunction(propertyName, defineProperty.body, defineProperty.on, defineProperty.validate);
            }
            else {
                target.prototype.__amorphicprops__[propertyName] = defineProperty;
                var value_1 = defineProperty.value;
                // The getter actually initializes the property
                defineProperty.get = function () {
                    var nameSpacedProperty = "__" + propertyName;
                    if (!this[nameSpacedProperty]) {
                        var cloneTemplate = defineProperty.of || defineProperty.type || null;
                        this[nameSpacedProperty] = ObjectTemplate.clone(value_1, cloneTemplate);
                    }
                    return this[nameSpacedProperty];
                };
                var defineProperties = {};
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
    }
    else if (target && target.syncStates && target.syncStates instanceof Array) {
        syncStates = target.syncStates;
    }
    // Called first time with parameters (prop definition) rather than target (template)
    // call supertypes supertypeClass function which will return a function that must be
    // called on the 2nd pass when we have a target. This function's closure will also have a ref to the original properties
    ret = SupertypeModule.supertypeClass(target, objectTemplate);
    return decorator; // decorator will be called 2nd time with ret as a closure
}
exports.supertypeClass = supertypeClass;
function Supertype(template, objectTemplate, Supertype) {
    return Supertype.call(template, objectTemplate);
}
exports.Supertype = Supertype;
function property(objectTemplate, SupertypeModule, props, toClientRuleSet, toServerRuleSet) {
    props = props || {};
    props.toClient = applyRuleSet(props.toClient, toClientRuleSet);
    props.toServer = applyRuleSet(props.toServer, toServerRuleSet);
    var baseDecorator = SupertypeModule.property(props, objectTemplate);
    return function (target, targetKey) {
        baseDecorator(target, targetKey);
        var defineProperties = {};
        props.enumerable = true;
        props.writable = true;
        objectTemplate._setupProperty(targetKey, props, undefined, defineProperties);
        Object.defineProperties(target, defineProperties);
    };
}
exports.property = property;
function remote(objectTemplate, defineProperty) {
    defineProperty = defineProperty || {};
    /*
        if we haven't supplied a configuration object into the decorator,
         default the role of this function to a server API function
     */
    if (!defineProperty.on) {
        defineProperty.on = 'server';
    }
    // function that we call to validate any changes for remote calls
    var remoteValidator = defineProperty.serverValidation;
    return function (target, propertyName, descriptor) {
        descriptor.value = objectTemplate._setupFunction(propertyName, descriptor.value, defineProperty.on, defineProperty.validate, remoteValidator, defineProperty.target);
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
}
exports.remote = remote;
;
function applyRuleSet(prop, ruleSet) {
    if (prop instanceof Array && ruleSet instanceof Array && ruleSet.length > 0) {
        return prop.some(function (r) {
            return ruleSet.indexOf(r) >= 0;
        });
    }
    else {
        return prop;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGVjb3JhdG9ycy5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uL3NyYy9kZWNvcmF0b3JzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7QUFBQTs7Ozs7Ozs7O0dBU0c7O0FBR0g7O0dBRUc7QUFFSCx3QkFBd0I7QUFDeEIsMkVBQTJFO0FBQzNFLGdHQUFnRztBQUNoRyxTQUFnQixjQUFjLENBQUMsY0FBYyxFQUFFLGVBQWUsRUFBRSxNQUFNO0lBQ2xFLElBQUksR0FBRyxDQUFDO0lBQ1IsSUFBSSxjQUFjLEdBQUcsZUFBZSxDQUFDLE9BQU8sQ0FBQztJQUM3QyxJQUFJLFVBQVUsR0FBeUIsU0FBUyxDQUFDO0lBRWpELHNCQUFzQjtJQUN0QixJQUFNLFNBQVMsR0FBRyxTQUFTLFNBQVMsQ0FBQyxNQUFNO1FBQ3ZDLG1GQUFtRjtRQUNuRiwwQkFBMEI7UUFDMUIsSUFBSSxHQUFHLEVBQUU7WUFDTCxHQUFHLEdBQUcsR0FBRyxDQUFDLE1BQU0sRUFBRSxjQUFjLENBQUMsQ0FBQTtTQUNwQzthQUFNO1lBQ0gsR0FBRyxHQUFHLGVBQWUsQ0FBQyxjQUFjLENBQUMsTUFBTSxFQUFFLGNBQWMsQ0FBQyxDQUFDO1NBQ2hFO1FBRUQsb0VBQW9FO1FBQ3BFLE1BQU0sQ0FBQyxjQUFjLEdBQUcsVUFBVSxZQUFZLEVBQUUsY0FBYztZQUMxRCxJQUFJLGNBQWMsQ0FBQyxJQUFJLEVBQUU7Z0JBQ3JCLE1BQU0sQ0FBQyxTQUFTLENBQUMsWUFBWSxDQUFDLEdBQUcsY0FBYyxDQUFDLGNBQWMsQ0FDMUQsWUFBWSxFQUNaLGNBQWMsQ0FBQyxJQUFJLEVBQ25CLGNBQWMsQ0FBQyxFQUFFLEVBQ2pCLGNBQWMsQ0FBQyxRQUFRLENBQzFCLENBQUM7YUFDTDtpQkFBTTtnQkFDSCxNQUFNLENBQUMsU0FBUyxDQUFDLGlCQUFpQixDQUFDLFlBQVksQ0FBQyxHQUFHLGNBQWMsQ0FBQztnQkFDbEUsSUFBTSxPQUFLLEdBQUcsY0FBYyxDQUFDLEtBQUssQ0FBQztnQkFFbkMs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SSxDQUFDLFVBQVUsQ0FBQztZQUN4QixPQUFPLE9BQU8sQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDO1FBQ25DLENBQUMsQ0FBQyxDQUFDO0tBQ047U0FBTTtRQUNILE9BQU8sSUFBSSxDQUFDO0tBQ2Y7QUFDTCxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBBdHRhY2hlcyBzeW5jU3RhdGVzIHByb3BzIHRvIHRoZSB0ZW1wbGF0ZVxuICogSWYgYSBjbGFzcyBpcyBkZWNvcmF0ZWQgbGlrZSBAc3VwZXJ0eXBlQ2xhc3Moe3N5bmNTdGF0ZXM6IFsnaW50ZXJuYWwnLCAnaG9tZSddfSksIGFueSBpbnN0YW5jZXMgb2YgdGhhdCBjbGFzc1xuICogaW5jbHVkaW5nIHRob3NlIHRoYXQgZXhpc3QgYXQgdGhlIGJlZ2lubmluZyBvZiB0aGUgYXBwbGljYXRpb24sIHNob3VsZCBvbmx5IGJlIHNlbnQgb3ZlciB3aGVuIHRoZSBjb250cm9sbGVyIHN0YXRlIG9uXG4gKiB0aGUgc2VydmVyIGluZGljYXRlcyB0aGF0IHRoZSBjb3JyZWN0IHN5bmNTdGF0ZSAoaWYgYW5kIG9ubHkgaWYgY29udHJvbGxlci5zeW5jU3RhdGUgPSAnaG9tZScgb3IgJ2ludGVybmFsJywgdGhlbiBhblxuICogb2JqZWN0IG9mIHRoaXMgY2xhc3Mgd2lsbCBiZSBzZW50LCBvdGhlcndpc2Ugc2Vtb3R1cyB3aWxsIHJlZnJhaW4gZnJvbSBzZW5kaW5nIGl0IG92ZXIpLiBUaGUgY2F2ZWF0LCBob3dldmVyLCBpcyBpZlxuICogc2Vtb3R1cycgY29udHJvbGxlcidzIHN5bmNTdGF0ZSBpcyBkZWZpbmVkIGFzICcqJyB0aGVuIHdlIHdpbGwgYnkgZGVmYXVsdCBzZW5kIGFsbCB0ZW1wbGF0ZXMgdW5sZXNzIHNwZWNpZmllZCBvdGhlci1cbiAqIHdpc2UgKHRoZSBzYW1lIGFzIHRyZWF0aW5nIHN5bmNTdGF0ZTogWycqJ10pXG4gKlxuICovXG5cblxuLyoqXG4gKiBAVE9ETzogVGhpcyBzaG91bGQgYmUgY29uc29saWRhdGVkIHdpdGggU3VwZXJ0eXBlJ3MgdmVyc2lvbiB3aGVuIHdlIGZpbmlzaCBjb252ZXJ0aW5nIHRvIHR5cGVzY3JpcHRcbiAqL1xuXG4vLyBDb250ZXh0IFN3aXRjaCBDaGFpbjpcbi8vIDFzdCBwYXNzOiBTZW1vdHVzIChzQ2xhc3MpIC0+IFN1cGVydHlwZSAoc0NsYXNzKSAtPiBTZW1vdHVzIChyZXR1cm4gUmV0KVxuLy8gMm5kIHBhc3M6IFNlbW90dXMgKHNDbGFzcykgLT4gU2Vtb3R1cyAoZGVjb3JhdG9yKSAtPiBTdXBlcnR5cGUgKGV2YWwgcmV0KSAtPiBTZW1vdHVzIChyZXR1cm4pXG5leHBvcnQgZnVuY3Rpb24gc3VwZXJ0eXBlQ2xhc3Mob2JqZWN0VGVtcGxhdGUsIFN1cGVydHlwZU1vZHVsZSwgdGFyZ2V0KTogYW55IHtcbiAgICBsZXQgcmV0O1xuICAgIGxldCBPYmplY3RUZW1wbGF0ZSA9IFN1cGVydHlwZU1vZHVsZS5kZWZhdWx0O1xuICAgIGxldCBzeW5jU3RhdGVzOiBTdHJpbmdbXSB8IHVuZGVmaW5lZCA9IHVuZGVmaW5lZDtcblxuICAgIC8vIERlY29yYXRvciB3b3JrZXJiZWVcbiAgICBjb25zdCBkZWNvcmF0b3IgPSBmdW5jdGlvbiBkZWNvcmF0b3IodGFyZ2V0KSB7XG4gICAgICAgIC8vIHNlY29uZCB0aW1lIHdlIG11c3QgY2FsbCB0aGUgZnVuY3Rpb24gcmV0dXJuZWQgdGhlIGZpcnN0IHRpbWUgYmVjYXVzZSBpdCBoYXMgdGhlXG4gICAgICAgIC8vIHByb3BlcnRpZXMgYXMgYSBjbG9zdXJlXG4gICAgICAgIGlmIChyZXQpIHtcbiAgICAgICAgICAgIHJldCA9IHJldCh0YXJnZXQsIG9iamVjdFRlbXBsYXRlKVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgcmV0ID0gU3VwZXJ0eXBlTW9kdWxlLnN1cGVydHlwZUNsYXNzKHRhcmdldCwgb2JqZWN0VGVtcGxhdGUpO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gTWFpbmx5IGZvciBwZXJzaXN0b3IgcHJvcGVydGllcyB0byBtYWtlIHN1cmUgdGhleSBnZXQgdHJhbnNwb3J0ZWRcbiAgICAgICAgdGFyZ2V0LmNyZWF0ZVByb3BlcnR5ID0gZnVuY3Rpb24gKHByb3BlcnR5TmFtZSwgZGVmaW5lUHJvcGVydHkpIHtcbiAgICAgICAgICAgIGlmIChkZWZpbmVQcm9wZXJ0eS5ib2R5KSB7XG4gICAgICAgICAgICAgICAgdGFyZ2V0LnByb3RvdHlwZVtwcm9wZXJ0eU5hbWVdID0gb2JqZWN0VGVtcGxhdGUuX3NldHVwRnVuY3Rpb24oXG4gICAgICAgICAgICAgICAgICAgIHByb3BlcnR5TmFtZSxcbiAgICAgICAgICAgICAgICAgICAgZGVmaW5lUHJvcGVydHkuYm9keSxcbiAgICAgICAgICAgICAgICAgICAgZGVmaW5lUHJvcGVydHkub24sXG4gICAgICAgICAgICAgICAgICAgIGRlZmluZVByb3BlcnR5LnZhbGlkYXRlXG4gICAgICAgICAgICAgICAgKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgdGFyZ2V0LnByb3RvdHlwZS5fX2Ftb3JwaGljcHJvcHNfX1twcm9wZXJ0eU5hbWVdID0gZGVmaW5lUHJvcGVydHk7XG4gICAgICAgICAgICAgICAgY29uc3QgdmFsdWUgPSBkZWZpbmVQcm9wZXJ0eS52YWx1ZTtcblxuICAgICAgICAgICAgICAgIC8vIFRoZSBnZXR0ZXIgYWN0dWFsbHkgaW5pdGlhbGl6ZXMgdGhlIHByb3BlcnR5XG4gICAgICAgICAgICAgICAgZGVmaW5lUHJvcGVydHkuZ2V0ID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgICAgICBsZXQgbmFtZVNwYWNlZFByb3BlcnR5ID0gYF9fJHtwcm9wZXJ0eU5hbWV9YDtcblxuICAgICAgICAgICAgICAgICAgICBpZiAoIXRoaXNbbmFtZVNwYWNlZFByb3BlcnR5XSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgbGV0IGNsb25lVGVtcGxhdGUgPSBkZWZpbmVQcm9wZXJ0eS5vZiB8fCBkZWZpbmVQcm9wZXJ0eS50eXBlIHx8IG51bGw7XG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzW25hbWVTcGFjZWRQcm9wZXJ0eV0gPSBPYmplY3RUZW1wbGF0ZS5jbG9uZSh2YWx1ZSwgY2xvbmVUZW1wbGF0ZSk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHRoaXNbbmFtZVNwYWNlZFByb3BlcnR5XTtcbiAgICAgICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICAgICAgY29uc3QgZGVmaW5lUHJvcGVydGllcyA9IHt9O1xuICAgICAgICAgICAgICAgIG9iamVjdFRlbXBsYXRlLl9zZXR1cFByb3BlcnR5KHByb3BlcnR5TmFtZSwgZGVmaW5lUHJvcGVydHksIHVuZGVmaW5lZCwgZGVmaW5lUHJvcGVydGllcyk7XG4gICAgICAgICAgICAgICAgT2JqZWN0LmRlZmluZVByb3BlcnRpZXModGFyZ2V0LnByb3RvdHlwZSwgZGVmaW5lUHJvcGVydGllcyk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH07XG5cbiAgICAgICAgLy8gQXNzaWduaW5nIHN5bmMgc3RhdGVzIGZyb20gcHJvcCBkZWZpbml0aW9uIG9udG8gdGhlIHRlbXBsYXRlXG4gICAgICAgIGlmIChzeW5jU3RhdGVzKSB7XG4gICAgICAgICAgICB0YXJnZXQuc3luY1N0YXRlcyA9IHN5bmNTdGF0ZXM7XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gcmV0O1xuICAgIH07XG5cbiAgICAvLyBDYWxsaW5nIHRoZSBkZWNvcmF0b3IgcHJvY2Vzc29yIHdpdGggdGhlIGFjdHVhbCBUZW1wbGF0ZSAoMm5kIHRpbWUpXG4gICAgaWYgKHRhcmdldC5wcm90b3R5cGUpIHtcbiAgICAgICAgcmV0dXJuIGRlY29yYXRvcih0YXJnZXQpO1xuICAgIH0gZWxzZSBpZiAodGFyZ2V0ICYmIHRhcmdldC5zeW5jU3RhdGVzICYmIHRhcmdldC5zeW5jU3RhdGVzIGluc3RhbmNlb2YgQXJyYXkpIHtcbiAgICAgICAgc3luY1N0YXRlcyA9IHRhcmdldC5zeW5jU3RhdGVzO1xuICAgIH1cblxuICAgIC8vIENhbGxlZCBmaXJzdCB0aW1lIHdpdGggcGFyYW1ldGVycyAocHJvcCBkZWZpbml0aW9uKSByYXRoZXIgdGhhbiB0YXJnZXQgKHRlbXBsYXRlKVxuICAgIC8vIGNhbGwgc3VwZXJ0eXBlcyBzdXBlcnR5cGVDbGFzcyBmdW5jdGlvbiB3aGljaCB3aWxsIHJldHVybiBhIGZ1bmN0aW9uIHRoYXQgbXVzdCBiZVxuICAgIC8vIGNhbGxlZCBvbiB0aGUgMm5kIHBhc3Mgd2hlbiB3ZSBoYXZlIGEgdGFyZ2V0LiBUaGlzIGZ1bmN0aW9uJ3MgY2xvc3VyZSB3aWxsIGFsc28gaGF2ZSBhIHJlZiB0byB0aGUgb3JpZ2luYWwgcHJvcGVydGllc1xuICAgIHJldCA9IFN1cGVydHlwZU1vZHVsZS5zdXBlcnR5cGVDbGFzcyh0YXJnZXQsIG9iamVjdFRlbXBsYXRlKTtcbiAgICByZXR1cm4gZGVjb3JhdG9yOyAvLyBkZWNvcmF0b3Igd2lsbCBiZSBjYWxsZWQgMm5kIHRpbWUgd2l0aCByZXQgYXMgYSBjbG9zdXJlXG59XG5cbmV4cG9ydCBmdW5jdGlvbiBTdXBlcnR5cGUodGVtcGxhdGUsIG9iamVjdFRlbXBsYXRlLCBTdXBlcnR5cGUpIHtcbiAgICByZXR1cm4gU3VwZXJ0eXBlLmNhbGwodGVtcGxhdGUsIG9iamVjdFRlbXBsYXRlKTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHByb3BlcnR5KG9iamVjdFRlbXBsYXRlLCBTdXBlcnR5cGVNb2R1bGUsIHByb3BzLCB0b0NsaWVudFJ1bGVTZXQsIHRvU2VydmVyUnVsZVNldCkge1xuICAgIHByb3BzID0gcHJvcHMgfHwge307XG4gICAgcHJvcHMudG9DbGllbnQgPSBhcHBseVJ1bGVTZXQocHJvcHMudG9DbGllbnQsIHRvQ2xpZW50UnVsZVNldCk7XG4gICAgcHJvcHMudG9TZXJ2ZXIgPSBhcHBseVJ1bGVTZXQocHJvcHMudG9TZXJ2ZXIsIHRvU2VydmVyUnVsZVNldCk7XG4gICAgY29uc3QgYmFzZURlY29yYXRvciA9IFN1cGVydHlwZU1vZHVsZS5wcm9wZXJ0eShwcm9wcywgb2JqZWN0VGVtcGxhdGUpO1xuICAgIHJldHVybiBmdW5jdGlvbiAodGFyZ2V0LCB0YXJnZXRLZXkpIHtcbiAgICAgICAgYmFzZURlY29yYXRvcih0YXJnZXQsIHRhcmdldEtleSk7XG4gICAgICAgIGNvbnN0IGRlZmluZVByb3BlcnRpZXMgPSB7fTtcbiAgICAgICAgcHJvcHMuZW51bWVyYWJsZSA9IHRydWU7XG4gICAgICAgIHByb3BzLndyaXRhYmxlID0gdHJ1ZTtcbiAgICAgICAgb2JqZWN0VGVtcGxhdGUuX3NldHVwUHJvcGVydHkodGFyZ2V0S2V5LCBwcm9wcywgdW5kZWZpbmVkLCBkZWZpbmVQcm9wZXJ0aWVzKTtcbiAgICAgICAgT2JqZWN0LmRlZmluZVByb3BlcnRpZXModGFyZ2V0LCBkZWZpbmVQcm9wZXJ0aWVzKTtcbiAgICB9O1xufVxuXG5cbmV4cG9ydCBmdW5jdGlvbiByZW1vdGUob2JqZWN0VGVtcGxhdGUsIGRlZmluZVByb3BlcnR5KSB7XG4gICAgZGVmaW5lUHJvcGVydHkgPSBkZWZpbmVQcm9wZXJ0eSB8fCB7fTtcblxuICAgIC8qXG4gICAgICAgIGlmIHdlIGhhdmVuJ3Qgc3VwcGxpZWQgYSBjb25maWd1cmF0aW9uIG9iamVjdCBpbnRvIHRoZSBkZWNvcmF0b3IsXG4gICAgICAgICBkZWZhdWx0IHRoZSByb2xlIG9mIHRoaXMgZnVuY3Rpb24gdG8gYSBzZXJ2ZXIgQVBJIGZ1bmN0aW9uXG4gICAgICovXG4gICAgaWYgKCFkZWZpbmVQcm9wZXJ0eS5vbikge1xuICAgICAgICBkZWZpbmVQcm9wZXJ0eS5vbiA9ICdzZXJ2ZXInO1xuICAgIH1cblxuICAgIC8vIGZ1bmN0aW9uIHRoYXQgd2UgY2FsbCB0byB2YWxpZGF0ZSBhbnkgY2hhbmdlcyBmb3IgcmVtb3RlIGNhbGxzXG4gICAgbGV0IHJlbW90ZVZhbGlkYXRvciA9IGRlZmluZVByb3BlcnR5LnNlcnZlclZhbGlkYXRpb247XG5cbiAgICByZXR1cm4gZnVuY3Rpb24gKHRhcmdldCwgcHJvcGVydHlOYW1lLCBkZXNjcmlwdG9yKSB7XG4gICAgICAgIGRlc2NyaXB0b3IudmFsdWUgPSBvYmplY3RUZW1wbGF0ZS5fc2V0dXBGdW5jdGlvbihcbiAgICAgICAgICAgIHByb3BlcnR5TmFtZSxcbiAgICAgICAgICAgIGRlc2NyaXB0b3IudmFsdWUsXG4gICAgICAgICAgICBkZWZpbmVQcm9wZXJ0eS5vbixcbiAgICAgICAgICAgIGRlZmluZVByb3BlcnR5LnZhbGlkYXRlLFxuICAgICAgICAgICAgcmVtb3RlVmFsaWRhdG9yLFxuICAgICAgICAgICAgZGVmaW5lUHJvcGVydHkudGFyZ2V0XG4gICAgICAgICk7XG5cbiAgICAgICAgLypcbiAgICAgICAgICAgIHRoaXMgZnVuY3Rpb24gYmVlbiBtYXJrZWQgYXMgYSBzZXJ2ZXIgQVBJIGVpdGhlciBleHBsaWNpdGx5IG9yIGJ5IGRlZmF1bHQuXG4gICAgICAgICAgICBzZXQgdGhlIGFwcHJvcHJpYXRlIG1ldGFkYXRhLlxuICAgICAgICAgKi9cbiAgICAgICAgaWYgKGRlZmluZVByb3BlcnR5Lm9uID09PSAnc2VydmVyJykge1xuICAgICAgICAgICAgZGVzY3JpcHRvci52YWx1ZS5fX29uX18gPSAnc2VydmVyJztcbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChkZWZpbmVQcm9wZXJ0eS50eXBlKSB7XG4gICAgICAgICAgICBkZXNjcmlwdG9yLnZhbHVlLl9fcmV0dXJuc19fID0gZGVmaW5lUHJvcGVydHkudHlwZTtcbiAgICAgICAgfVxuICAgICAgICBpZiAoZGVmaW5lUHJvcGVydHkub2YpIHtcbiAgICAgICAgICAgIGRlc2NyaXB0b3IudmFsdWUuX19yZXR1cm5zX18gPSBkZWZpbmVQcm9wZXJ0eS5vZjtcbiAgICAgICAgICAgIGRlc2NyaXB0b3IudmFsdWUuX19yZXR1cm5zYXJyYXlfXyA9IHRydWU7XG4gICAgICAgIH1cbiAgICB9O1xufTtcblxuXG5mdW5jdGlvbiBhcHBseVJ1bGVTZXQocHJvcCwgcnVsZVNldCkge1xuICAgIGlmIChwcm9wIGluc3RhbmNlb2YgQXJyYXkgJiYgcnVsZVNldCBpbnN0YW5jZW9mIEFycmF5ICYmIHJ1bGVTZXQubGVuZ3RoID4gMCkge1xuICAgICAgICByZXR1cm4gcHJvcC5zb21lKGZ1bmN0aW9uIChyKSB7XG4gICAgICAgICAgICByZXR1cm4gcnVsZVNldC5pbmRleE9mKHIpID49IDA7XG4gICAgICAgIH0pO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIHJldHVybiBwcm9wO1xuICAgIH1cbn0iXX0=