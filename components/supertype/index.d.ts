type Constructable = new (...args: any[]) => {};


export class SupertypeLogger {
    context: any;
    granularLevels: any;
    level: any;
    log (level : number, ...data : any[]);
    fatal (...data : any[]) : void;
    error (...data : any[]) : void;
    warn (...data : any[]) : void;
    info (...data : any[]) : void;
    debug (...data : any[]) : void;
    trace (...data : any[]) : void;
    setLevel(number) : void;
    startContext(context : any) : void;
    setContextProps(context : any) : void;
    clearContextProps(context : any) : void;
    createChildLogger(context : any) : SupertypeLogger;
    prettyPrint(level : number, ...data : any[]) : string;

    // for overriding
    sendToLog: Function;
    formatDateTime: Function;
}

export class SupertypeSession {
    logger: SupertypeLogger
    __dictionary__ : any;
    getClasses() : any;
}

export class amorphicStatic extends SupertypeSession {}

export class Supertype {

    constructor ()
    amorphic : SupertypeSession;

    // Class members (static)
    static amorphicCreateProperty(prop: String, defineProperty: Object)
    static amorphicGetProperties(includeVirtualProperties?: boolean)
    static amorphicProperties: any;
    static amorphicChildClasses: Array<Constructable>;
    static amorphicParentClass: Constructable;
    static amorphicFromJSON(json: string)
    static amorphicClassName : string;
    static amorphicStatic : SupertypeSession;

    // Object members
    __id__: String;
    amorphicLeaveEmpty: boolean;
    amorphicToJSON(callback?: Function): string;
    amorphicGetPropertyDefinition(propertyName: string);
    amorphicGetPropertyValues(propertyName: string);
    amorphicGetPropertyDescriptions(propertyName: string);

    // Deprecated legacy naming
    static createProperty(prop: String, defineProperty: Object)
    static getProperties()
    static __children__: Array<Constructable>;
    static __parent__: Constructable;
    toJSONString()
    __props__()
    __descriptions__(prop: string)
    __values__(prop: string)
    __template__ : any
    amorphicClass : any
    amorphicGetClassName () : string
    static fromJSON (json: string, idPrefix?: string)
    static inject(injector: any)
    createCopy(callback : Function);
    copyProperties(obj: any);
}
export function property(props?: Object);
export function supertypeClass(target?: any);
