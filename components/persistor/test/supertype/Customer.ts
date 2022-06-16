import {Supertype, supertypeClass, property, Persistable} from '../../dist/index';
import {Role} from './Role';
import {Address} from './Address';

@supertypeClass({})
export class Customer extends Persistable(Supertype) {

    constructor (first, middle, last) {
        super();
        this.firstName = first;
        this.lastName = last;
        this.middleName = middle;
        this.setDirty();
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

    @property({type: Array, getType: () => Role})
    roles:  Array<Role> = [];

    @property({getType: () => Customer})
    referredBy: Customer;

    @property({type: String})
    type: string = 'primary';

    @property({type: Array, fetch: true, getType: () => Customer})
    referrers:  Array<Customer>;

    @property({type: Array, fetch: true, getType: () => Customer})
    secondaryReferrers:  Array<Customer> = [];

    @property({type: Boolean})
    booleanProp: boolean;

    addAddress (type, lines, city, state, zip) {
        var address = new Address(this);
        address.lines = lines;
        address.city = city;
        address.state = state;
        address.postalCode = zip;
        address.customer = this;
        this[type == 'primary' ? 'primaryAddresses' : 'secondaryAddresses'].push(address);
    }

    @property({type: Array, of: Address, fetch: true})
    primaryAddresses: Array<Address> = [];

    @property({type: Array, of: Address, fetch: true})
    secondaryAddresses:  Array<Address> = []
}