import {property, Supertype, supertypeClass} from '../../../dist';
import {Role} from './Role';
import {Address} from './Address';

@supertypeClass
export class Customer extends Supertype {

    @property()
    firstName: string = '';
    @property()
    middleName: string = '';
    @property()
    lastName: string = '';
    @property({
        getType: () => {
            return Role
        }
    })
    roles: Array<Role> = [];
    @property()
    referredBy: Customer;
    @property()
    type: string = 'primary';
    @property({fetch: true, type: Customer})
    referrers: Array<Customer>;
    @property({fetch: true, type: Customer})
    secondaryReferrers: Array<Customer> = [];
    @property({type: Address, fetch: true})
    addresses: Array<Address> = [];

    constructor(first, middle, last) {
        super();
        this.firstName = first;
        this.lastName = last;
        this.middleName = middle;
    }

    addAddress(lines, city, state, zip) {
        var address = new Address(this);
        address.lines = lines;
        address.city = city;
        address.state = state;
        address.customer = this;
        this.addresses.push(address);
    }
}

@supertypeClass({toClient: ['A', 'Both']})
export class CustomerA extends Customer {

}

@supertypeClass({toClient: ['B', 'Both']})
export class CustomerB extends Customer {

}