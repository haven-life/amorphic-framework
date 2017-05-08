import {Supertype, supertypeClass, property, Persistable} from '../../index';
import {Account} from './Account';

@supertypeClass
export class Transaction  extends Persistable(Supertype) {
    constructor (account, type, amount) {
        super()
        this.account = account;
        this.type = type;
        this.amount = amount;
        if (account)
            account.transactions.push(this);
    };

    @property()
    amount: number;

    @property()
    type: string;

    @property({getType: () => {return Account}})
    account: Account;
}
@supertypeClass
export class Debit extends Transaction {
    constructor (account, type, amount) {
        super(account, type, amount);
    }
}
@supertypeClass
export class Credit extends Transaction {
    constructor (account, type, amount) {
        super(account, type, amount);
    }
}
@supertypeClass
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
