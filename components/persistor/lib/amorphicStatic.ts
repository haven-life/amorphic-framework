import { SupertypeLogger } from '@haventech/supertype';

export class amorphicStatic {
    static logger : SupertypeLogger;
    static config : any;
    static beginDefaultTransaction() : any {}
    static beginTransaction(nodefault? : boolean) : any {}
    static endTransaction(persistorTransaction?, logger?) : any {}
    static begin (isdefault?) : any {}
    static end (persistorTransaction?, logger?) : any {};
    static commit (options?) : any {};
    static createTransientObject(callback : any) : any {};
    static __transient__ : any;
    static __dictionary__: any;
    static debugInfo: any;
    static reqSession: any;
    static getClasses(): any {};
    static syncAllTables(): any {};
    static getInstance(): any {};
}