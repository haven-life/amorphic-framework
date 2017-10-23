import {Supertype, supertypeClass, property, Persistable} from '../../index';
import {Customer} from './Customer';

@supertypeClass
export class ExtendedCustomer extends Customer {
    constructor (first, middle, last) {
        super(first, middle, last);
        this.setDirty();
    }

    @property()
    extendedProp: string = '';



    @property({fetch: true, getType: () => Customer})
    extendedReferrers:  Array<Customer>;
}