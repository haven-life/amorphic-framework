import {Supertype, supertypeClass, property} from '../../dist/index';
import {Role} from './Role';
import {Address} from './Address';

@supertypeClass
export class Customer extends Supertype {

    public addAddress (lines, city, state, zip) {
        var address = new Address(this);
        address.lines = lines;
        address.city = city;
        address.state = state;
        address.postalCode = zip;
        address.customer = this;
        this.addresses.push(address);
    }

    public someMethod() {
        console.log('came here')
    }

    constructor (first, middle, last) {
        super();
        this.firstName = first;
        this.lastName = last;
        this.middleName = middle;
    }

    @property()
    email: string = '';

    @property()
    firstName: string = '';

    @property()
    middleName: string = '';

    @property()
    lastName: string = '';

    @property()
    local1: string = 'local1';

    @property()
    local2: string = 'local2';

    @property()
    nullNumber: number = null;

    @property()
    nullDate: Date = null;

    @property()
    nullString: string = null;

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

    @property({type: Address, fetch: true})
    addresses: Array<Address> = [];

}