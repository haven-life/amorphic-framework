import {Supertype, supertypeClass, property} from '../../../dist';
import {Customer} from './Customer';
import {Account} from './Account';

@supertypeClass
export class Address extends Supertype {

    constructor (customer, city?, state?, lines?) {
        super();
        this.city = city;
        this.state = state;
        this.lines = lines || [];
        this.customer   = customer;
    }

    @property({type: String})
    lines: Array<String> = [];

    @property()
    city: String = '';

    @property()
    state: string = '';

    @property({getType: () => {return Customer}})
    customer: Customer;

    @property()
    type: string;

    @property({getType: () => {return Account}})
    account: Account;
}

export class AddressA extends Address {

}

export class AddressBType1 extends Address {

}

export class AddressBType2 extends Address {

}
