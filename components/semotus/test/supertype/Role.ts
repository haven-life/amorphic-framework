import {supertypeClass, Supertype, property} from '../../dist/index';
import {Customer} from './Customer';
import {Account} from './Account';
//import { Supertype } from '@haventech/supertype';

@supertypeClass
export class Role extends Supertype {

    constructor (customer, account, relationship) {
        super();
        this.customer = customer;
        this.account = account;
        if (relationship)
            this.relationship = relationship;
    };

    @property()
    relationship: string = 'primary';

    @property({getType: () => {return Customer}})
    customer: Customer;

    @property({getType: () => {return Account}})
    account: Account;
}
