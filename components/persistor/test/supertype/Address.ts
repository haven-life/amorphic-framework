import {Supertype, supertypeClass, property, Persistable} from '../../dist/index';
import {Customer} from './Customer';
import {Account} from './Account';
import {ReturnedMail} from './ReturnedMail';

@supertypeClass({})
export class Address extends Persistable(Supertype) {

    constructor (customer) {
        super();
        this.customer   = customer;
        this.setDirty();
    }

    @property({type: Array, of: String})
    lines: Array<String> = [];

    @property({type: String})
    city: String = '';

    @property({type: String})
    state: string = '';

    @property({type: String})
    postalCode:  string = '';

    @property({type: String})
    country: string = 'US';

    @property({getType: () => Customer})
    customer: Customer;

    @property({type: String})
    type: string;

    @property({type: Array, getType: () => ReturnedMail})
    returnedMail: Array<ReturnedMail> = [];

    @property({getType: () => Account})
    account: Account;

    addReturnedMail (date) {
        this.returnedMail.push(new ReturnedMail(this, date));
    }
}
