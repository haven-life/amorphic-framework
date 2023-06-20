import { Supertype, supertypeClass, property, Persistable } from '../../dist/esm/index.js';
import { Customer } from './Customer.mjs';

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

    static persistorFetchByQuery(query, options?) : any {
        return super.persistorFetchByQuery(query, options);
    }
}