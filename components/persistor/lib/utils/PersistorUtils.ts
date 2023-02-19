export class PersistorUtils {
    static isRemoteObjectSetToTrue(enableIsRemoteObjectFeature: any, isRemoteObject: any): boolean  {
        if (enableIsRemoteObjectFeature && (enableIsRemoteObjectFeature === true || enableIsRemoteObjectFeature === 'true')) {
            return isRemoteObject && isRemoteObject === true;
        }
        return false;
    }

    static asyncMap(arr: any[], concurrency: number, callback: any) {
        let cnt = arr.length / concurrency;
        let p = Promise.resolve([]);
        let start = 0;

        for (let i = 0; i < cnt; i++) {
            p = p.then((results) => {
                let end = start + concurrency;

                return Promise.all(arr.slice(start, end).map(callback))
                    .then((eRes) => {
                        start = end;
                        results.push.apply(results, eRes);

                        return results;
                    });
            });
        }

        return p;
    }
}