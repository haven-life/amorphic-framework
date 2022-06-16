import {Supertype, supertypeClass, property, Persistable} from '../../dist/index';
import {Transaction} from './Transaction';

@supertypeClass({})
export class Debit extends Transaction {
    constructor (account, type, amount) {
        super(account, type, amount);
    }
}