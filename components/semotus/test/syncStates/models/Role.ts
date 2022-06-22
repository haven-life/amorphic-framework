import {property, Supertype, supertypeClass} from '../../../dist';
import {Customer} from './Customer';
import {Account} from './Account';

@supertypeClass
export class Role extends Supertype {

    @property({type: String})
    relationship: string = 'primary';
    @property({
        getType: () => {
            return Customer
        }
    })
    customer: Customer;
    @property({
        getType: () => {
            return Account
        }
    })
    account: Account;

    constructor(customer, account, relationship) {
        super();
        this.customer = customer;
        this.account = account;
        if (relationship)
            this.relationship = relationship;
    };

    equals(other: Role) {
        return this.relationship === other.relationship;
    }
}
