import {Supertype, supertypeClass, property, Persistable} from '../../dist/index';
import {Customer} from './Customer';
import {Account} from './Account';
import {ReturnedMail} from './ReturnedMail';
import "reflect-metadata";

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

    @property({getType: () => {return Customer}})
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
