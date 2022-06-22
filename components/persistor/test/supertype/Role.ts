import {Supertype, supertypeClass, property, Persistable} from '../../dist/index';
import {Customer} from './Customer';
import {Account} from './Account';

@supertypeClass
export class Role extends Persistable(Supertype) {

    constructor (customer, account, relationship) {
        super();
        this.customer = customer;
        this.account = account;
        if (relationship)
            this.relationship = relationship;
        this.setDirty();
    };

    @property()
    relationship: string = 'primary';

    @property({getType: () => {return Customer}})
    customer: Customer;

    @property({getType: () => {return Account}})
    account: Account;
}
