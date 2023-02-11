export class PersistorUtils {

    static isRemoteObjectSetToTrue(enableIsRemoteObjectFeature: any, isRemoteObject: any): boolean  {
        if (enableIsRemoteObjectFeature && (enableIsRemoteObjectFeature === true || enableIsRemoteObjectFeature === 'true')) {
            return isRemoteObject && isRemoteObject === true;
        }
        return false;
    }

    static checkAndExecuteWithContext(asOfDate: Date, callBack: () => any ): boolean  {
        return callBack();
    }
}