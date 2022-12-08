export class PersistorUtils {

    static isRemoteObjectSetToTrue(overrideIsRemoteObjectProperties: boolean, isRemoteObject: any): boolean  {
        const shouldOverrideByConfig = overrideIsRemoteObjectProperties && isRemoteObject === false 
                && overrideIsRemoteObjectProperties === true;
        return shouldOverrideByConfig || (isRemoteObject && isRemoteObject === true);
    }
}