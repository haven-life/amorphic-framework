import {Supertype, supertypeClass, property} from '../../../dist';
import {Role} from './Role';
import {Address} from './Address';

@supertypeClass
export class Customer extends Supertype {

    constructor (first, middle, last) {
        super();
        this.firstName = first;
        this.lastName = last;
        this.middleName = middle;
    }

    @property()
    firstName: string = '';

    @property()
    middleName: string = '';

    @property()
    lastName: string = '';

    @property({getType: () => {return Role}})
    roles:  Array<Role> = [];

    @property()
    referredBy: Customer;

    @property()
    type: string = 'primary';

    @property({fetch: true, type: Customer})
    referrers:  Array<Customer>;

    @property({fetch: true, type: Customer})
    secondaryReferrers:  Array<Customer> = [];

    addAddress (lines, city, state, zip) {
        var address = new Address(this);
        address.lines = lines;
        address.city = city;
        address.state = state;
        address.postalCode = zip;
        address.customer = this;
        this.addresses.push(address);
    }

    @property({type: Address, fetch: true})
    addresses: Array<Address> = [];
}

export class CustomerA extends Customer {

}


export class CustomerB extends Customer {

}