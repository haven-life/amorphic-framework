import { property, Supertype, supertypeClass } from '../../../dist/cjs';
import { Role } from './Role';
import { Address, AddressA, AddressBFirstStage, AddressBSecondStage } from './Address';
import { Account } from './Account';

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

    equals(other: Customer) {
        const equalNames = this.firstName === other.firstName && this.middleName === other.middleName && this.lastName === other.lastName;
        const equalRoles = !(this.roles.map((role, index) => {
            return role.equals(other.roles[index])
        }).includes(false));
        const equalAddresses = !(this.addresses.map((address, index) => {
            return address.equals(other.addresses[index])
        }).includes(false));

        return equalNames && equalRoles && equalAddresses;
    }

    addAddress(lines, city, state, zip) {
        const address = new Address(this);
        this.setupAddress(address, lines, city, state, zip);
    }

    setupAddress(address, lines, city, state, zip) {
        address.lines = lines;
        address.city = city;
        address.state = state;
        address.customer = this;
        address.account = new Account(); // dummy account for test purposes
        this.addresses.push(address);
    }
}

@supertypeClass({toClient: ['A', 'Both']})
export class CustomerA extends Customer {
    addAddress(lines, city, state, zip) {
        const address = new AddressA(this);
        this.setupAddress(address, lines, city, state, zip);
    }
}

@supertypeClass({toClient: ['B', 'Both']})
export class CustomerB extends Customer {

    counter: number = 0;

    addAddress(lines, city, state, zip) {
        let address;
        if (this.counter < 2) {
            address = new AddressBFirstStage(this);
            this.counter++;
        } else {
            address = new AddressBSecondStage(this);
        }
        this.setupAddress(address, lines, city, state, zip);
    }
}