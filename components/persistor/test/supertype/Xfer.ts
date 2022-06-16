import {Supertype, supertypeClass, property, Persistable} from '../../dist/index';
import {Account} from './Account';
import {Transaction} from './Transaction';

@supertypeClass({})
export class Xfer extends Transaction {
    @property({fetch: true, getType: () => {return Account}})
    fromAccount: Account;

    constructor (account, type, amount, fromAccount) {
        super(account, type, amount);
        this.fromAccount = fromAccount;
        if (fromAccount)
            fromAccount.fromAccountTransactions.push(this);
    }
}