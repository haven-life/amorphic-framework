import {Supertype, supertypeClass, property, remote} from '../../index';

@supertypeClass({toClient: false, toServer: true})
class Dummy {};

import {Customer} from "./Customer";
import {Account} from "./Account";
import Promise = require('bluebird');
import {Address} from "./Address";
declare function require(name:string);
var ObjectTemplate  = require('../../index.js');


import { expect } from 'chai';
expect(Dummy['__toClient__']).to.equal(false);
expect(Dummy['__toServer__']).to.equal(true);


@supertypeClass
export class Controller extends Supertype {

    @remote({on: "server"})
    mainFunc  () : Q.Promise<any> {
        return ObjectTemplate.serverAssert();
    };

    giveSamASecondAccount () {
        var address = new Address(this.sam, ['Plantana']);
        var samsNewAccount = new Account(1234, ['Sam Elsamman'], this.sam, address);
        samsNewAccount.addCustomer(this.sam, 'sole');

    }

    @property()
    sam:     Customer;

    @property()
    karen:   Customer;

    @property()
    ashling: Customer;

    @remote({type: Customer})
    decoratedSingle () {}

    @remote({of: Customer})
    decoratedMultiple () {}

    constructor () {
        super()

        // Setup customers and addresses
        var sam = new Customer("Sam", "M", "Elsamman");
        var karen = new Customer("Karen", "M", "Burke");
        var ashling = new Customer("Ashling", "", "Burke");

        // Setup referrers
        sam.referrers = [ashling, karen];
        ashling.referredBy = sam;
        karen.referredBy = sam;

        sam.local1 = "foo";
        sam.local2 = "bar";

        // Setup addresses
        sam.addAddress(["500 East 83d", "Apt 1E"], "New York", "NY", "10028");
        sam.addAddress(["38 Haggerty Hill Rd", ""], "Rhinebeck", "NY", "12572");

        sam.addresses[0].addReturnedMail(new Date());
        sam.addresses[0].addReturnedMail(new Date());
        sam.addresses[1].addReturnedMail(new Date());

        karen.addAddress(["500 East 83d", "Apt 1E"], "New York", "NY", "10028");
        karen.addAddress(["38 Haggerty Hill Rd", ""], "Rhinebeck", "NY", "12572");

        karen.addresses[0].addReturnedMail(new Date());

        ashling.addAddress(["End of the Road", ""], "Lexington", "KY", "34421");

        // Setup accounts
        var samsAccount = new Account(1234, ['Sam Elsamman'], sam, sam.addresses[0]);
        var jointAccount = new Account(123, ['Sam Elsamman', 'Karen Burke', 'Ashling Burke'], sam, karen.addresses[0]);
        jointAccount.addCustomer(karen, "joint");
        jointAccount.addCustomer(ashling, "joint");

        samsAccount.credit(100);                        // Sam has 100
        samsAccount.debit(50)                           // Sam has 50
        jointAccount.credit(200);                       // Joint has 200
        jointAccount.transferTo(100, samsAccount);      // Joint has 100, Sam has 150
        jointAccount.transferFrom(50, samsAccount);     // Joint has 150, Sam has 100
        jointAccount.debit(25);                         // Joint has 125

        this.sam = sam;
        this.karen = karen;
        this.ashling = ashling;
    }
    preServerCall (changeCount, objectsChanged) {
        for(var templateName in objectsChanged)
            this.preServerCallObjects[templateName] = true;
    }
    postServerCall () {
        if (this.postServerCallThrowException)
            throw "postServerCallThrowException"
        if (this.postServerCallThrowRetryException)
            throw "Retry"
    }
    validateServerCall () {
        return this.canValidateServerCall;
    }

    preServerCallObjects: Object = {};
    preServerCalls: Number = 0;
    postServerCalls: Number = 0;
    preServerCallThrowException: Boolean = false;
    postServerCallThrowException: Boolean = false;
    postServerCallThrowRetryException: Boolean = false;
    serverCallThrowException: Boolean = false;
    canValidateServerCall: Boolean = true;
};

expect(Controller.prototype.decoratedSingle['__returns__']).to.equal(Customer);
expect(Controller.prototype.decoratedSingle['__returnsarray__']).to.equal(undefined);
expect(Controller.prototype.decoratedMultiple['__returns__']).to.equal(Customer);
expect(Controller.prototype.decoratedMultiple['__returnsarray__']).to.equal(true);
