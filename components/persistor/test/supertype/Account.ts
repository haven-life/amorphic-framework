import {Supertype, supertypeClass, property, Persistable} from '../../dist/index';
import {Role} from './Role';
import {Address} from './Address';
import {Transaction, Debit, Credit, Xfer} from './Transaction';

@supertypeClass({toServer: true, toClient: false})
export class Account extends Persistable(Supertype) {

    constructor (number, title, customer, address) {
        super();
        if (address) {
            this.address = address;
            this.address.account = this;
        }
        this.number = number;
        this.title = title;
        if (customer)
            this.addCustomer(customer);
        this.setDirty();
    };

    @property({values: ['B', 'P'], descriptions: {B: 'Business', P: 'Personal'}})
    accountType: String = 'P';

    @property({type: Transaction, fetch: true})
    transactions: Array<Transaction> = [];

    @property({type: Transaction, fetch: true})
    fromAccountTransactions: Array<Transaction> = [];

    @property()
    number: number;

    @property({type: String})
    title: Array<string>;

    @property({getType: () => {return Role}, fetch: true})
    roles: Array<Role> = [];

    @property({getType: () => {return Address}})
    address: Address;

    addCustomer (customer, relationship?) {
        var role = new Role(customer, this, relationship);
        this.roles.push(role);
        customer.roles.push(role);
    };

    debit (amount) {
        new Debit(this, 'debit', amount);
    };

    credit (amount) {
        new Credit(this, 'credit', amount);
    };

    transferFrom (amount, fromAccount) {
        new Xfer(this, 'xfer', amount, fromAccount)
    };

    transferTo (amount, toAccount) {
        new Xfer(toAccount, 'xfer', amount, this);
    };

    getBalance () {
        var balance = 0;
        var thisAccount = this;
        function processTransactions  (transactions) {
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
