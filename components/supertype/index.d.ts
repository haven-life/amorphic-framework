type Constructable = new (...args: any[]) => {};

export class Supertype {

    constructor ()

    // Class members (static)
    static amorphicCreateProperty(prop: String, defineProperty: Object)
    static amorphicGetProperties(includeVirtualProperties?: boolean)
    static amorphicProperties: any;
    static amorphicChildClasses: Array<Constructable>;
    static amorphicParentClass: Constructable;
    static amorphicFromJSON(json: string)

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
    __descriptions__ ()
    __values__ ()
    static fromJSON (json: string)
}
export function property(props?: Object);
export function supertypeClass(target?: Function);
