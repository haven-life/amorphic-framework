import { Supertype, supertypeClass, property, Persistable } from '../../dist/esm/index.js';
import { Role } from './Role.mjs';
import { Address } from './Address.mjs';

@supertypeClass
export class Customer extends Persistable(Supertype) {

    constructor (first, middle, last) {
        super();
        this.firstName = first;
        this.lastName = last;
        this.middleName = middle;
        this.setDirty();
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
    nullNumber: number | null = null;

    @property()
    nullDate: Date | null = null;

    @property()
    nullString: string | null = null;

    @property({getType: () => Role})
    roles:  Array<Role> = [];

    @property({getType: () => Customer})
    referredBy: Customer;

    @property()
    type: string = 'primary';

    @property({fetch: true, getType: () => Customer})
    referrers:  Array<Customer>;

    @property({fetch: true, getType: () => Customer})
    secondaryReferrers:  Array<Customer> = [];

    @property()
    booleanProp: any;

    addAddress (type, lines, city, state, zip) {
        var address = new Address(this);
        address.lines = lines;
        address.city = city;
        address.state = state;
        address.postalCode = zip;
        address.customer = this;
        this[type == 'primary' ? 'primaryAddresses' : 'secondaryAddresses'].push(address);
    }

    @property({type: Address, fetch: true})
    primaryAddresses: Array<Address> = [];

    @property({type: Address, fetch: true})
    secondaryAddresses:  Array<Address> = []
}