/*
 * Banking example shows PersistObjectTemplate with
 * many-to-many relationships
 *
 */

var expect = require('chai').expect;
var Q = require("q");
var _ = require("underscore");

var ClientObjectTemplate = require('../index.js')._createObject();
ClientObjectTemplate.role = "client";
ClientObjectTemplate._useGettersSetters = false;

var ServerObjectTemplate = require('../index.js')._createObject();
ServerObjectTemplate.role = "server";
ServerObjectTemplate._useGettersSetters = true;
ServerObjectTemplate.maxCallTime = 60 * 1000;


function sendToServer(message) {
    ServerObjectTemplate.processMessage(message);
}

function sendToClient(message) {
    ClientObjectTemplate.processMessage(message);
}

var clientSessionId = ClientObjectTemplate.createSession('client', sendToServer);
var serverSessionId = ServerObjectTemplate.createSession('server', sendToClient);

ClientObjectTemplate.enableSendMessage(true, sendToServer);
ServerObjectTemplate.enableSendMessage(true, sendToClient);

var ClientController = createTemplates(ClientObjectTemplate);
var ServerController = createTemplates(ServerObjectTemplate);

var clientController = new ClientController();
ClientObjectTemplate.controller = clientController;

var serverController = ServerObjectTemplate._createEmptyObject(ServerController, clientController.__id__);
ServerObjectTemplate.syncSession();
ServerObjectTemplate.controller = serverController;
ServerObjectTemplate.__changeTracking__ = true;
ServerObjectTemplate.reqSession = {loggingID: "test", semotus: {}};
ServerObjectTemplate.logLevel = 1;
ServerObjectTemplate.logger.setLevel('info;activity:dataLogging');

var serverAssert;

function createTemplates(objectTemplate) {

    var Customer = objectTemplate.create("Customer", {
        init: function (first, middle, last) {
            this.firstName = first;
            this.lastName = last;
            this.middleName = middle;
        },
        email:		{type: String, value: "", length: 50, rule: ["text", "email", "required"]},
        firstName:  {type: String, value: "", length: 40, rule: ["name", "required"]},
        middleName: {type: String, value: "", length: 40, rule: "name"},
        lastName:	{type: String, value: "", length: 40, rule: ["name", "required"]},
        local1:      {type: String, persist: false, value: "local1"},
        local2:      {type: String, isLocal: true, value: "local2"}
    });
    var Address = objectTemplate.create("Address", {
        init:       function (customer) {
            this.customer   = customer;
        },
        lines:      {type: Array, of: String, value: [], max: 3},
        city:       {type: String, value: "", length: 20},
        state:      {type: String, value: "", length: 20},
        postalCode: {type: String, value: "", length: 20},
        country:    {type: String, value: "US", length: 3}
    });
    Customer.mixin({
        referredBy: {type: Customer, fetch: true},
        referrers:  {type: Array, of: Customer, value: [], fetch: true},
        addAddress: function(lines, city, state, zip) {
            var address = new Address(this);
            address.lines = lines;
            address.city = city;
            address.state = state;
            address.postalCode = zip;
            address.customer = this;
            this.addresses.push(address);
        },
        addresses:  {type: Array, of: Address, value: [], fetch: true}
    });
    var ReturnedMail = objectTemplate.create("ReturnedMail", {
        date: {type: Date},
        address: {type:Address},
        init: function (address, date)
        {
            this.address = address;
            this.date = date;
        }
    });
    Address.mixin({
        customer:  {type: Customer},
        returnedMail: {type: Array, of: ReturnedMail, value: []},
        addReturnedMail: function (date) {
            this.returnedMail.push(new ReturnedMail(this, date));
        }
    });
    var Role = objectTemplate.create("Role", {
        init:       function (customer, account, relationship) {
            this.customer = customer;
            this.account = account;
            if (relationship)
                this.relationship = relationship;
        },
        relationship: {type: String, value: "primary"},
        customer:     {type: Customer}
    });
    
    var Account = objectTemplate.create("Account", {
        init:       function (number, title, customer, address) {
            if (address) {
                this.address = address;
                this.address.account = this;
            }
            this.number = number;
            this.title = title;
            if (customer)
                this.addCustomer(customer);
        },
        addCustomer: function(customer, relationship) {
            var role = new Role(customer, this, relationship);
            this.roles.push(role);
            customer.roles.push(role);
        },
        number:     {type: Number},
        title:      {type: Array, of: String, max: 4},
        roles:      {type: Array, of: Role, value: [], fetch: true},
        address:    {type: Address},
        debit: function (amount) {
            new Transaction(this, 'debit', amount);
        },
        credit: function (amount) {
            new Transaction(this, 'credit', amount);
        },
        transferFrom: function (amount, fromAccount) {
            new Transaction(this, 'xfer', amount, fromAccount)
        },
        transferTo: function (amount, toAccount) {
            new Transaction(toAccount, 'xfer', amount, this);
        },
        getBalance: function () {
            var balance = 0;
            var thisAccount = this;
            function processTransactions  (transactions) {
                for (var ix = 0; ix < transactions.length; ++ix)
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
            processTransactions(this.transactions);
            processTransactions(this.fromAccountTransactions);
            return balance;
        }
    });
    Address.mixin({
        account:  {type: Account}
    });
    var Transaction = objectTemplate.create("Transaction", {
        init:       function (account, type, amount, fromAccount) {
            this.account = account;
            this.fromAccount = fromAccount;
            this.type = type;
            this.amount = amount;
            if (account)
                account.transactions.push(this);
            if (fromAccount)
                fromAccount.fromAccountTransactions.push(this);
        },
        amount:     {type: Number},
        type:       {type: String},
        account:    {type: Account, fetch: true},
        fromAccount: {type: Account, fetch: true}
    });
    
    Customer.mixin({
        roles:      {type: Array, of: Role, value: []}
    });
    
    Role.mixin({
        account: {type: Account}
    });
    
    Account.mixin({
        transactions: {type: Array, of: Transaction, value: [], fetch: true},
        fromAccountTransactions: {type: Array, of: Transaction, value: [], fetch: true}
    });

    var Controller = objectTemplate.create("Controller", {
        mainFunc: {on: "server", body: function () {
            serverAssert();
        }},
        sam:     {type: Customer},
        karen:   {type: Customer},
        ashling: {type: Customer},
        init: function () {

            // Setup customers and addresses
            var sam = new Customer("Sam", "M", "Elsamman");
            var karen = new Customer("Karen", "M", "Burke");
            var ashling = new Customer("Ashling", "", "Burke");

            // Setup referrers
            sam.referrers = [ashling, karen];
            ashling.referredBy = sam;
            karen.referredBy = sam;    sam.local1 = "foo";

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
        },
        preServerCall: function (changeCount, objectsChanged) {
            for(var templateName in objectsChanged)
                this.preServerCallObjects[templateName] = true;
        },
        postServerCall: function () {
            if (this.postServerCallThrowException)
                throw "postServerCallThrowException"
            if (this.postServerCallThrowRetryException)
                throw "Retry"
        },
        validateServerCall: function () {
            return this.canValidateServerCall;
        },
        preServerCallObjects: {isLocal: true, type: Object, value: {}},
        preServerCalls: {isLocal: true, type: Number, value: 0},
        postServerCalls: {isLocal: true, type: Number, value: 0},
        preServerCallThrowException: {isLocal: true, type: Boolean, value: false},
        postServerCallThrowException: {isLocal: true, type: Boolean, value: false},
        postServerCallThrowRetryException: {isLocal: true, type: Boolean, value: false},
        serverCallThrowException: {isLocal: true, type: Boolean, value: false},
        canValidateServerCall: {isLocal: true, type: Boolean, value: true}
    });

    return Controller;
}

var Q = require('Q');

function client() {

}

function server() {
}


describe("Banking Example", function () {


    it("pass object graph to server and return", function (done) {
       serverAssert = function () {
            expect(serverController.sam.roles[0].account.getBalance()).to.equal(100);
            expect(serverController.sam.roles[1].account.getBalance()).to.equal(125);
            expect(serverController.preServerCallObjects['Controller']).to.equal(true);
       }
       clientController.mainFunc().then(function () {
           done();
       }).fail(function(e) {
           done(e)
       });
    });
    it("change results on server", function (done) {
        serverAssert = function () {
            expect(serverController.sam.roles[0].account.transactions[0].__changed__).to.equal(true);
            serverController.sam.roles[0].account.transactions[0].__changed__ = false;
            serverController.sam.roles[0].account.transactions[0].amount = 200;
            expect(serverController.sam.roles[0].account.transactions[0].__changed__).to.equal(true);
        }
        clientController.mainFunc().then(function () {
            expect(serverController.sam.roles[0].account.getBalance()).to.equal(200);
            done();
        }).fail(function(e) {
            done(e)
        });
    });
    it("throw an execption", function (done) {
        serverAssert = function () {
            throw "get stuffed";
        }
        return clientController.mainFunc()
            .then(function () {
                expect("Should not be here").to.equal(false);
            }, function (e) {
                expect(e.message).to.equal("get stuffed");
                done()
            }).fail(function(e) {
                done(e)
            });
    });
    it("can get a synchronization error", function (done) {
        serverAssert = function () {
            throw "get stuffed";
        }
        return clientController.mainFunc()
            .then(function () {
                expect("Should not be here").to.equal(false);
            }, function (e) {
                expect(e.message).to.equal("get stuffed");
                done()
            }).fail(function(e) {
                done(e)
            });
    });
    it("can get a synchronization error from overlapping calls", function (done) {
        this.timeout(7000);
        serverAssert = function () {
            return Q.delay(1000);
        }
        clientController.mainFunc()
            .then(function () {
                expect("Should not be here").to.equal(false);
            });
        clientController.mainFunc()
            .then(function () {
                expect("Should not be here").to.equal(false);
            }, function (e) {
                console.log(e);
                Q.delay(1000).then(function () {done()});
            }).fail(function(e) {
                done(e)
            });
    });
    it("change tracking to work with arrays", function (done) {
        serverAssert = function () {
            expect(serverController.sam.roles[0].account.__changed__).to.equal(false);
            serverController.__template__.__objectTemplate__.MarkChangedArrayReferences();
            expect(serverController.sam.roles[0].account.__changed__).to.equal(true);
            serverController.sam.roles[0].account.__changed__ = false;
            serverController.sam.roles[0].account.debit(50);
            expect(serverController.sam.roles[0].account.__changed__).to.equal(false);
            serverController.__template__.__objectTemplate__.MarkChangedArrayReferences();
            expect(serverController.sam.roles[0].account.__changed__).to.equal(true);
        }
        var balance = serverController.sam.roles[0].account.getBalance();
        serverController.sam.roles[0].account.__changed__ = false;
        clientController.sam.roles[0].account.debit(50);
        clientController.mainFunc().then(function () {
             expect(serverController.sam.roles[0].account.getBalance()).to.equal(balance - 100);
             done();
        }).fail(function(e) {
            done(e)
        });
    });


});
