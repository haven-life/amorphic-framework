import { property, Supertype, supertypeClass } from '../../../dist/cjs';
import { Role } from './Role';
import { Address } from './Address';
import { Credit, Debit, Transaction, Xfer } from './Transaction';
import * as _ from 'underscore';

@supertypeClass
export class Account extends Supertype {

    @property({type: Transaction, fetch: true})
    transactions: Array<Transaction> = [];

    @property({type: Transaction, fetch: true})
    fromAccountTransactions: Array<Transaction> = [];

    @property()
    number: number;

    @property({type: String})
    title: Array<string>;

    @property({
        getType: () => {
            return Role
        }
    })

    roles: Array<Role> = [];
    @property({
        getType: () => {
            return Address
        }
    })
    address: Address;

    constructor(number = 0, title = ['Dummy'], customer?, address?) {
        super();
        if (address) {
            this.address = address;
            this.address.account = this;
        }
        this.number = number;
        this.title = title;
        if (customer)
            this.addCustomer(customer);
    };

    equals(other: Account) {
        return this.number === other.number && _.isEqual(this.title, other.title);
    }

    addCustomer(customer, relationship?) {
        var role = new Role(customer, this, relationship);
        this.roles.push(role);
        customer.roles.push(role);
    };

    debit(amount) {
        new Debit(this, 'debit', amount);
    };

    credit(amount) {
        new Credit(this, 'credit', amount);
    };

    transferFrom(amount, fromAccount) {
        new Xfer(this, 'xfer', amount, fromAccount)
    };

    transferTo(amount, toAccount) {
        new Xfer(toAccount, 'xfer', amount, this);
    };

    getBalance() {
        var balance = 0;
        var thisAccount = this;

        function processTransactions(transactions) {
            for (var ix = 0; ix < transactions.length; ++ix) {
                switch (transactions[ix].type) {
                    case 'debit':
                        balance -= transactions[ix].amount;
                        break;
                    case 'credit':
                        balance += transactions[ix].amount;
                        break;
                    case 'xfer':
                        balance += transactions[ix].amount * (transactions[ix].fromAccount == thisAccount ? -1 : 1);
                }
            }
        }

        processTransactions(this.transactions);
        processTransactions(this.fromAccountTransactions);
        return balance;
    };
}
