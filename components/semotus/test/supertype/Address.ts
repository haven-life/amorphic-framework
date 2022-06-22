import {Supertype, supertypeClass, property} from '../../dist/index';
import {Customer} from './Customer';
import {Account} from './Account';
import {ReturnedMail} from './ReturnedMail';

@supertypeClass
export class Address extends Supertype {

    constructor (customer, lines?) {
        super();
        this.lines = lines || [];
        this.customer   = customer;
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

    @property({getType: () => {return Customer}})
    customer: Customer;

    @property({type: String})
    type: string;

    @property({type: Array, of: ReturnedMail})
    returnedMail: Array<ReturnedMail> = [];

    @property({getType: () => {return Account}})
    account: Account;

    addReturnedMail (date) {
        this.returnedMail.push(new ReturnedMail(this, date));
    }
}
