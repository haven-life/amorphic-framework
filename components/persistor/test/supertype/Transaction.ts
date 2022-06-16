import {Supertype, supertypeClass, property, Persistable} from '../../dist/index';
import {Account} from './Account';

@supertypeClass({})
export class Transaction  extends Persistable(Supertype) {
    constructor (account, type, amount) {
        super()
        this.account = account;
        this.type = type;
        this.amount = amount;
        if (account)
            account.transactions.push(this);
    };

    @property({type: Number})
    amount: number;

    @property({type: String})
    type: string;

    @property({getType: () => {return Account}})
    account: Account;
}
