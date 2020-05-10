import {property, Supertype, supertypeClass} from '../../../dist';
import {Customer} from './Customer';
import {Account} from './Account';

@supertypeClass
export class Address extends Supertype {

    @property({type: String})
    lines: Array<String> = [];
    @property()
    city: String = '';
    @property()
    state: string = '';
    @property({
        getType: () => {
            return Customer
        }
    })
    customer: Customer;
    @property()
    type: string;
    @property({
        getType: () => {
            return Account
        }
    })
    account: Account;

    constructor(customer, city?, state?, lines?) {
        super();
        this.city = city;
        this.state = state;
        this.lines = lines || [];
        this.customer = customer;
    }

    equals(other: Address) {
        const checkPrims = this.city === other.city && this.lines === other.lines && this.state === other.state && this.type === other.type;
        let checkAccount = true;
        if (this.account && other.account) {
            checkAccount = this.account.equals(other.account);
        } else if (this.account || other.account) {
            checkAccount = false;
        }
        return checkPrims && checkAccount;
    }
}

@supertypeClass({toClient: ['A', 'Both']})
export class AddressA extends Address {

}

@supertypeClass({toClient: ['B', 'Both'], syncStates: ['first']})
export class AddressBFirstStage extends Address {

}

@supertypeClass({toClient: ['B', 'Both'], syncStates: ['second']})
export class AddressBSecondStage extends Address {

}
