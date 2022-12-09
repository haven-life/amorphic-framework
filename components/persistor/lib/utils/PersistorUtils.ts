export class PersistorUtils {

    static isRemoteObjectSetToTrue(overrideConfig: any, isRemoteObject: any): boolean  {
        if (isRemoteObject === undefined || isRemoteObject === null) {
            return;
        }
        const shouldOverrideByConfig = overrideConfig && isRemoteObject === false 
                && (overrideConfig === true || overrideConfig === 'true');
        return shouldOverrideByConfig || (isRemoteObject && isRemoteObject === true);
    }
}