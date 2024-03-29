import { Supertype, supertypeClass, property, Persistable } from '../../dist/esm/index.js';
import { Customer } from './Customer.mjs';
import { Account } from './Account.mjs';
import { ReturnedMail } from './ReturnedMail.mjs';
import 'reflect-metadata';

@supertypeClass
export class Address extends Persistable(Supertype) {

    constructor (customer) {
        super();
        this.customer   = customer;
        this.setDirty();
    }

    @property({type: String})
    lines: Array<String> = [];

    @property()
    city: String = '';

    @property()
    state: string = '';

    @property()
    postalCode:  string = '';

    @property()
    country: string = 'US';

    @property({getType: () => Customer})
    customer: Customer;

    @property()
    type: string;

    @property({getType: () => ReturnedMail})
    returnedMail: Array<ReturnedMail> = [];

    @property({getType: () => Account})
    account: Account;

    addReturnedMail (date) {
        this.returnedMail.push(new ReturnedMail(this, date));
    }
}