import {Supertype, supertypeClass, property} from '../../dist/index';
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

    @property({type: String})
    email: string = '';

    @property({type: String})
    firstName: string = '';

    @property({type: String})
    middleName: string = '';

    @property({type: String})
    lastName: string = '';

    @property({type: String})
    local1: string = 'local1';

    @property({type: String})
    local2: string = 'local2';

    @property({type: Number})
    nullNumber: number = null;

    @property({type: Date})
    nullDate: Date = null;

    @property({type: String})
    nullString: string = null;

    @property({type: Array, getType: () => {return Role}})
    roles:  Array<Role> = [];

    @property({type: Customer})
    referredBy: Customer;

    @property({type: String})
    type: string = 'primary';

    @property({type: Array, fetch: true, of: Customer})
    referrers:  Array<Customer>;

    @property({type: Array, fetch: true, of: Customer})
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

    @property({type: Array, of: Address, fetch: true})
    addresses: Array<Address> = [];

}