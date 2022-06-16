import {Supertype, supertypeClass, property, Persistable} from '../../dist/index';
import {Customer} from './Customer';

@supertypeClass({})
export class ExtendedCustomer extends Customer {
    constructor (first, middle, last) {
        super(first, middle, last);
        this.setDirty();
    }

    @property({type: String})
    extendedProp: string = '';

    @property({type: Array, fetch: true, getType: () => Customer})
    extendedReferrers: Array<Customer>;
}