import { SupertypeSession } from '@haventech/supertype';
type Constructable<BC> = new (...args: any[]) => BC;

export class AmorphicSession extends SupertypeSession {
    connectSession : any;
    withoutChangeTracking (callback : Function) {};
    config : any;
    __transient__ : any;
    __changeTracking__: any;
    reqSession: any;
    expireSession(): any {};
}

export { amorphicStatic } from '@haventech/persistor';

export function Remoteable<BC extends Constructable<{}>>(Base: BC) {
    return class extends Base {
        amorphicate (obj : any) {}
        amorphic : AmorphicSession
    };
}