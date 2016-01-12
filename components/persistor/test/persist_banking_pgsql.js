/*
 * Banking example shows PersistObjectTemplate with
 * many-to-many relationships
 *
 */

var expect = require('chai').expect;
var Q = require("q");
var _ = require("underscore");
var ObjectTemplate = require('supertype');
var PersistObjectTemplate = require('../index.js')(ObjectTemplate, null, ObjectTemplate);
var writing = true;
var knex;

PersistObjectTemplate.xdebug = function(txt) {
    console.log(txt);
}

/*
PersistObjectTemplate.debug = function(m, t) {
    if (t.match(/(query)|(io)/))
    {
        console.log(m)
    }
}
*/
var Customer = PersistObjectTemplate.create("Customer", {
	init: function (first, middle, last) {
		this.firstName = first;
		this.lastName = last;
		this.middleName = middle;
        expect(writing).equal(true);
        this.setDirty();
	},
	email:		{type: String, value: "", length: 50, rule: ["text", "email", "required"]},
	firstName:  {type: String, value: "", length: 40, rule: ["name", "required"]},
	middleName: {type: String, value: "", length: 40, rule: "name"},
	lastName:	{type: String, value: "", length: 40, rule: ["name", "required"]},
	local1:      {type: String, persist: false, value: "local1"},
	local2:      {type: String, isLocal: true, value: "local2"},
    nullNumber:  {type: Number, value: null},
    nullDate:    {type: Date, value: null},
    nullString: {type: String, value: null}
});
var Address = PersistObjectTemplate.create("Address", {
	init:       function (customer) {
		this.customer   = customer;
        this.setDirty();
	},
	lines:      {type: Array, of: String, value: [], max: 3},
	city:       {type: String, value: "", length: 20},
	state:      {type: String, value: "", length: 20},
	postalCode: {type: String, value: "", length: 20},
	country:    {type: String, value: "US", length: 3}
});
Customer.mixin({
    referredBy: {type: Customer},
    referrers:  {type: Array, of: Customer, value: [], fetch: true},
	addAddress: function(type, lines, city, state, zip) {
		var address = new Address(this);
		address.lines = lines;
		address.city = city;
		address.state = state;
		address.postalCode = zip;
        address.customer = this;
		this[type == 'primary' ? 'primaryAddresses' : 'secondaryAddresses'].push(address);
	},
	primaryAddresses:  {type: Array, of: Address, value: [], fetch: true},
    secondaryAddresses:  {type: Array, of: Address, value: [], fetch: true}
    });
var ReturnedMail = PersistObjectTemplate.create("ReturnedMail", {
    date: {type: Date},
    address: {type:Address},
    init: function (address, date)
    {
        this.address = address;
        this.date = date;
        this.setDirty();
    }
});
Address.mixin({
    customer:  {type: Customer},
    type: {type: String},
    returnedMail: {type: Array, of: ReturnedMail, value: []},
    addReturnedMail: function (date) {
        this.returnedMail.push(new ReturnedMail(this, date));
    }
});
var Role = PersistObjectTemplate.create("Role", {
	init:       function (customer, account, relationship) {
		this.customer = customer;
		this.account = account;
		if (relationship)
			this.relationship = relationship;
        this.setDirty();
	},
	relationship: {type: String, value: "primary"},
	customer:     {type: Customer}
});

var Account = PersistObjectTemplate.create("Account", {
	init:       function (number, title, customer, address) {
        if (address) {
            this.address = address;
            this.address.account = this;
        }
		this.number = number;
		this.title = title;
		if (customer)
			this.addCustomer(customer);
        this.setDirty();
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
        new Debit(this, 'debit', amount);
    },
    credit: function (amount) {
        new Credit(this, 'credit', amount);
    },
    transferFrom: function (amount, fromAccount) {
        new Xfer(this, 'xfer', amount, fromAccount)
    },
    transferTo: function (amount, toAccount) {
        new Xfer(toAccount, 'xfer', amount, this);
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
var Transaction = PersistObjectTemplate.create("Transaction", {
    init:       function (account, type, amount) {
        this.account = account;
        this.type = type;
        this.amount = amount;
        if (account)
            account.transactions.push(this);
    },
    amount:     {type: Number},
    type:       {type: String},
    account:    {type: Account},
});
var Debit = Transaction.extend("Debit", {
    init:       function (account, type, amount) {
        Transaction.call(this, account, type, amount);
    }
});
var Credit = Transaction.extend("Credit", {
    init:       function (account, type, amount) {
        Transaction.call(this, account, type, amount);
    }
});
var Xfer = Transaction.extend("Xfer", {
    fromAccount: {type: Account, fetch: true},
    init:       function (account, type, amount, fromAccount) {
        this.fromAccount = fromAccount;
        Transaction.call(this, account, type, amount);
        if (fromAccount)
            fromAccount.fromAccountTransactions.push(this);
    }
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


var schema = {
    Customer: {
        documentOf: "pg/customer",
        children: {
            roles: {id: "customer_id"},
            referrers: {id: "referred_id"},
            primaryAddresses: {id: "customer_id", fetch: true, filter: {property: 'type', value: 'primary'}, pruneOrphans: true},
            secondaryAddresses: {id: "customer_id", fetch: true, filter: {property: 'type', value: 'secondary'}, pruneOrphans: true}
        },
        parents: {
            referredBy: {id: "referred_id"}
        }
    },
    Address: {
        documentOf: "pg/address",
        parents: {
            account: {id: 'account_id'},
            customer: {id: 'customer_id'}
        },
        children: {
            returnedMail: {id: 'address_id', fetch: true}
        }
    },
    ReturnedMail: {
        documentOf: "pg/rm",
        parents: {
            address: {id: 'address_id'}
        }
    },
    Account: {
        documentOf: "pg/account",
        children: {
            roles: {id: "account_id"},
            transactions: {id: "account_id", fetch: true},
            fromAccountTransactions: {id: "from_account_id"}
        },
        parents: {
            address: {id: "address_id", fetch: true}
        }
    },
    Role: {
        documentOf: "pg/role",
        parents: {
            customer: {id: 'customer_id'},
            account: {id: 'account_id'}
        }
    },
    Transaction: {
        documentOf: "pg/transaction",
        parents: {
            account: {id: 'account_id', fetch: true},
            fromAccount: {id: 'from_account_id'}
        }
    },
    Xfer: {
        documentOf: "pg/transaction"
    },
    Debit: {
        documentOf: "pg/transaction"
    },
    Credit: {
        documentOf: "pg/transaction"
    }
}

var MongoClient = require('mongodb').MongoClient;
var Q = require('Q');
var db;

function clearCollection(template) {
    var collectionName = template.__collection__.match(/\//) ? template.__collection__ : 'mongo/' + template.__collection__;
    console.log("Clearing " + collectionName);
    if (collectionName.match(/mongo\/(.*)/)) {
        collectionName = RegExp.$1;
        return Q.ninvoke(db, "collection", collectionName).then(function (collection) {
            return Q.ninvoke(collection, "remove", {}, {w:1}).then (function () {
                return Q.ninvoke(collection, "count")
            });
        });
    }
    else if (collectionName.match(/pg\/(.*)/)) {
        collectionName = RegExp.$1;
        return PersistObjectTemplate.dropKnexTable(template)
        .then(function () {
            return PersistObjectTemplate.synchronizeKnexTableFromTemplate(template).then(function(){return 0});
        });
    } else
        throw "Invalid collection name " + collectionName;

}

describe("Banking from pgsql Example", function () {

    it ("opens the database Postgres", function (done) {
        console.log("starting banking");
        return Q()
            .then(function () {
                knex = require('knex')({
                    client: 'pg',
                    connection: {
                        host     : '127.0.0.1',
                        database : 'persistor_banking',
                        user: 'postgres',
                        password: 'postgres'

                    }
                });
                PersistObjectTemplate.setDB(knex, PersistObjectTemplate.DB_Knex, 'pg');
                done();
        }).fail(function(e){done(e)});;
    });

    it ("opens the database Mongo", function (done) {
        console.log("starting banking");
        return Q.ninvoke(MongoClient, "connect", "mongodb://localhost:27017/testpersist").then(function (dbopen) {
            db = dbopen;
            PersistObjectTemplate.setDB(db, PersistObjectTemplate.DB_Mongo, 'mongo');
            PersistObjectTemplate.setSchema(schema);
            PersistObjectTemplate.performInjections(); // Normally done by getTemplates
            done();
        }).fail(function(e){done(e)});;
    });

    it ("clears the bank", function (done) {
        return clearCollection(Role)
            .then(function (count) {
                expect(count).to.equal(0);
                return clearCollection(Account)
            }).then(function (count) {
                expect(count).to.equal(0);
                return clearCollection(Customer)
            }).then(function (count) {
                expect(count).to.equal(0);
                return clearCollection(Account)
            }).then(function (count) {
                expect(count).to.equal(0);
                return clearCollection(Transaction)
            }).then(function (count) {
                expect(count).to.equal(0);
                return clearCollection(ReturnedMail)
            }).then(function (count) {
                expect(count).to.equal(0);
                return clearCollection(Address)
            }).then(function (count) {
                expect(count).to.equal(0);
                done();
            }).fail(function(e){done(e)});
    });
    var sam;
    var karen;
    var ashling;
    var samsAccount;
    var jointAccount;


    it ("can create the data", function () {
        // Setup customers and addresses
        sam = new Customer("Sam", "M", "Elsamman");
        karen = new Customer("Karen", "M", "Burke");
        ashling = new Customer("Ashling", "", "Burke");


        // Setup referrers
        sam.referrers = [ashling, karen];
        ashling.referredBy = sam;
        karen.referredBy = sam;    sam.local1 = "foo";


        sam.local2 = "bar";

        // Setup addresses
        sam.addAddress("primary", ["500 East 83", "Apt 1E"], "New York", "NY", "10028");
        sam.addAddress("secondary", ["38 Haggerty Hill Rd", ""], "Rhinebeck", "NY", "12572");

        sam.secondaryAddresses[0].addReturnedMail(new Date());
        sam.secondaryAddresses[0].addReturnedMail(new Date());

        karen.addAddress("primary", ["500 East 83d", "Apt 1E"], "New York", "NY", "10028");
        karen.addAddress("secondary", ["38 Haggerty Hill Rd", ""], "Rhinebeck", "NY", "12572");

        karen.primaryAddresses[0].addReturnedMail(new Date());

        ashling.addAddress("primary", ["End of the Road", ""], "Lexington", "KY", "34421");

        // Setup accounts
        samsAccount = new Account(1234, ['Sam Elsamman'], sam, sam.primaryAddresses[0]);
        jointAccount = new Account(123, ['Sam Elsamman', 'Karen Burke', 'Ashling Burke'], sam, karen.primaryAddresses[0]);
        jointAccount.addCustomer(karen, "joint");
        jointAccount.addCustomer(ashling, "joint");

        samsAccount.credit(100);                        // Sam has 100
        samsAccount.debit(50)                           // Sam has 50
        jointAccount.credit(200);                       // Joint has 200
        jointAccount.transferTo(100, samsAccount);      // Joint has 100, Sam has 150
        jointAccount.transferFrom(50, samsAccount);     // Joint has 150, Sam has 100
        jointAccount.debit(25);                         // Joint has 125
    });

    it("both accounts have the right balance", function () {
        expect(samsAccount.getBalance()).to.equal(100);
        expect(jointAccount.getBalance()).to.equal(125);
    });

    it("can insert", function (done) {
        console.log("Can Insert");
        PersistObjectTemplate.saveAll().then(function(id) {
            writing = false;
            console.log("Inserted");
            done();
        }).fail(function(e){done(e)});
    });

    it("Accounts have addresses", function (done) {
        Account.getFromPersistWithQuery(null,{address: true}).then (function (accounts) {
            expect(accounts.length).to.equal(2);
            expect(accounts[0].address.__template__.__name__).to.equal('Address');
            done();
        }).fail(function(e) {
            done(e)
        })
    });
    it("Customers have addresses", function (done) {
        Customer.getFromPersistWithQuery(null, {primaryAddresses: true, secondaryAddresses: true}).then (function (customers) {
            expect(customers[0].primaryAddresses.length + customers[0].secondaryAddresses.length +
            customers[1].primaryAddresses.length + customers[1].secondaryAddresses.length +
            customers[2].primaryAddresses.length + customers[2].secondaryAddresses.length).to.equal(5);
            done();
        }).fail(function(e) {
            done(e)
        })
    });
    it("Accounts sloppily replace addresses", function (done) {
        sam.primaryAddresses.splice(0, 1);
        sam.addAddress("primary", ["500 East 83d", "Apt 1E"], "New York", "NY", "10028");
        Q()
            .then(function () {
                return sam.persistSave()
            })
            .then(function () {
                return sam.primaryAddresses[0].persistSave()
            })
            .then(function (){done()})
            .fail(function(e) {
                done(e)
            })
    });
    it("Customers have addresses", function (done) {
        Customer.getFromPersistWithQuery(null, {primaryAddresses: true, secondaryAddresses: true}).then (function (customers) {
            expect(customers[0].primaryAddresses.length + customers[0].secondaryAddresses.length +
                customers[1].primaryAddresses.length + customers[1].secondaryAddresses.length +
                customers[2].primaryAddresses.length + customers[2].secondaryAddresses.length).to.equal(5);
            done();
        }).fail(function(e) {
            done(e)
        })
    });
    it("Transactions have accounts fetched", function (done) {
        Xfer.getFromPersistWithQuery({type: 'xfer'}).then (function (transactions) {
            expect(transactions.length).to.equal(2);
            expect(!!transactions[0].account._id).to.equal(true);
            expect(!!transactions[1].account._id).to.equal(true);
            done();
        }).fail(function(e) {
            done(e)
        })
    });
    it("Can find debits and credits >= 200 with a $in", function (done) {
        //{type: {$in: ['debit', 'credit']}, amount:{'$gte': 200}}
        //{$and: [{$in: ['debit', 'credit']}}, {amount:{'$gte': 200}}}
        Transaction.getFromPersistWithQuery({type: {$in: ['debit', 'credit']}, amount:{'$gte': 200}}).then (function (transactions) {
            expect(transactions.length).to.equal(1);
            expect(transactions[0].amount).to.equal(200);
            done();
        }).fail(function(e) {
            done(e)
        })
    });
    it("Can find debits and credits >= 200 with a $in", function (done) {
        Transaction.getFromPersistWithQuery({type: {$in: ['debit', 'credit']}, amount:{'$in': [200, 100], $gt: 100}}).then (function (transactions) {
            expect(transactions.length).to.equal(1);
            expect(transactions[0].amount).to.equal(200);
            done();
        }).fail(function(e) {
            done(e)
        })
    });

    it("Can find debits and credits with a $or", function (done) {
        Transaction.getFromPersistWithQuery({'$or':[{type: 'debit'}, {type: 'credit'}]}).then (function (transactions) {
            expect(transactions.length).to.equal(4);
            expect(transactions[0].type).to.not.equal('xfer');
            expect(transactions[1].type).to.not.equal('xfer');
            expect(transactions[2].type).to.not.equal('xfer');
            expect(transactions[3].type).to.not.equal('xfer');
            done();
        }).fail(function(e) {
            done(e)
        })
    });

    it("Can find debits and credits with a $in", function (done) {
        Transaction.getFromPersistWithQuery({type: {$in: ['debit', 'credit']}}).then (function (transactions) {
            expect(transactions.length).to.equal(4);
            expect(transactions[0].type).to.not.equal('xfer');
            expect(transactions[1].type).to.not.equal('xfer');
            expect(transactions[2].type).to.not.equal('xfer');
            expect(transactions[3].type).to.not.equal('xfer');
            done();
        }).fail(function(e) {
            done(e)
        })
    });
    it("Can find debits and credits with a regex", function (done) {
        Transaction.getFromPersistWithQuery({type: {$regex: '^.*It$', $options: 'i'}}).then (function (transactions) {
            expect(transactions.length).to.equal(4);
            expect(transactions[0].type).to.not.equal('xfer');
            expect(transactions[1].type).to.not.equal('xfer');
            expect(transactions[2].type).to.not.equal('xfer');
            expect(transactions[3].type).to.not.equal('xfer');
            done();
        }).fail(function(e) {
            done(e)
        })
    });

    it("Can fetch all transactions", function (done) {
        Transaction.getFromPersistWithQuery({}).then (function (transactions) {
            expect(transactions.length).to.equal(6);
            done();
        }).fail(function(e) {
            done(e)
        })
    });
    it("Can fetch transfers", function (done) {
        Transaction.getFromPersistWithQuery({type: 'xfer'},{account: true, fromAccount: true}).then (function (transactions) {
            expect(transactions.length).to.equal(2);
            expect(transactions[0].type).to.equal('xfer');
            expect(transactions[1].type).to.equal('xfer');
            expect(transactions[0].fromAccount.__template__.__name__).to.equal('Account');
            expect(transactions[0].account.__template__.__name__).to.equal('Account');
            done();
        }).fail(function(e) {
            done(e)
        })
    });
    it("Can fetch transfers with $nin", function (done) {
        Transaction.getFromPersistWithQuery({type: {$nin: ['debit', 'credit']}},{account: true, fromAccount: true}).then (function (transactions) {
            expect(transactions.length).to.equal(2);
            expect(transactions[0].type).to.equal('xfer');
            expect(transactions[1].type).to.equal('xfer');
            expect(transactions[0].fromAccount.__template__.__name__).to.equal('Account');
            expect(transactions[0].account.__template__.__name__).to.equal('Account');
            done();
        }).fail(function(e) {
            done(e)
        })
    });    it("can fetch a pojo", function () {
        return PersistObjectTemplate.getPOJOFromQuery(Customer, {firstName: "Sam"}).then(function (pojo) {
            expect(pojo[0].firstName).to.equal("Sam");
        });
    });
    it ("can go native parent join", function (done) {
        Transaction
            .getKnex()
            .select(["transaction.amount", "account.number"])
            .from(Transaction.getTableName("transaction"))
            .rightOuterJoin(Account.getTableName("account"),
                Transaction.getParentKey('fromAccount', 'transaction'),
                Account.getPrimaryKey('account'))
            .then(processResults)

        function processResults(res) {
            console.log(JSON.stringify(res))
            expect(res[0].amount + res[1].amount).to.equal(150);
            done();
        }
    });
    it ("can go native child join", function (done) {
        Transaction
            .getKnex()
            .select(["transaction.amount", "account.number"])
            .from(Account.getTableName("account"))
            .rightOuterJoin(Transaction.getTableName("transaction"),
                Account.getChildKey('fromAccountTransactions', 'transaction'),
                Account.getPrimaryKey('account'))
            .then(processResults)

        function processResults(res) {
            console.log(JSON.stringify(res))
            expect(res[0].amount + res[1].amount).to.equal(150);
            done();
        }
    });
    it ("can go native with apply parent", function (done) {
        Transaction
            .getKnex()
            .select(["transaction.amount", "account.number"])
            .from(Transaction.getTableName("transaction"))
            .rightOuterJoin.apply(Transaction.getKnex(), Account.knexParentJoin(Transaction, "account", "transaction", "fromAccount"))
            .then(processResults)

        function processResults(res) {
            console.log(JSON.stringify(res))
            expect(res[0].amount + res[1].amount).to.equal(150);
            done();
        }
    });
    it ("can go native with apply child", function (done) {
        Transaction
            .getKnex()
            .select(["transaction.amount", "account.number"])
            .from(Transaction.getTableName("transaction"))
            .rightOuterJoin.apply(Account.getKnex(), Transaction.knexChildJoin(Account, "transaction", "account", "fromAccountTransactions"))
            .then(processResults)

        function processResults(res) {
            console.log(JSON.stringify(res))
            expect(res[0].amount + res[1].amount).to.equal(150);
            done();
        }
    });


    it("sam looks good", function (done) {
        Customer.getFromPersistWithId(sam._id, {roles: true}).then (function (customer) {
            expect(customer.nullNumber).to.equal(null);
            expect(customer.nullString).to.equal(null);
            expect(customer.nullDate).to.equal(null);
            expect(customer.firstName).to.equal("Sam");
            expect(customer.local1).to.equal("local1");
            expect(customer.local2).to.equal("local2");
            expect(customer.roles[1].relationship).to.equal("primary");
            expect(customer.roles[1].customer).to.equal(customer);
            expect(customer.roles[1].accountPersistor.isFetched).to.equal(false);

            return customer.roles[1].fetch({account: {fetch: {roles: {fetch: {customer: {fetch: {roles: true}}}}}}}).then( function ()
            {
                expect(customer.roles[1].account.number).to.equal(123);
                expect(customer.roles[1].account.roles.length).to.equal(3);
                expect(customer.primaryAddresses[0].lines[0]).to.equal("500 East 83d");
                expect(customer.secondaryAddresses[0].lines[0]).to.equal("38 Haggerty Hill Rd");
                expect(customer.secondaryAddresses[0].customer).to.equal(customer);

                expect(customer.secondaryAddresses[0].returnedMail.length).to.equal(2);

                var sam = customer;
                var r1 = customer.referrers[0];
                var r2 = customer.referrers[1];
                var karen = r1.firstName == "Karen" ? r1 : r2;
                var ashling = r1.firstName == "Karen" ? r2 : r1;
                expect(karen.firstName).to.equal("Karen");
                expect(ashling.firstName).to.equal("Ashling");
                done();
            });
        }).fail(function(e){
            done(e)
        });
    });
    it("has a correct joint account balance for sam", function (done) {
        Account.getFromPersistWithId(samsAccount._id, {roles: true}).then (function (account) {
            expect(account.getBalance()).to.equal(samsAccount.getBalance());
            done();
        }).fail(function(e){
            done(e)
        });
    });

    it("has a correct joint account balance for the joint account", function (done) {
        Account.getFromPersistWithId(jointAccount._id, {roles: true}).then (function (account) {
            expect(account.getBalance()).to.equal(jointAccount.getBalance());
            done();
        }).fail(function(e) {
            done(e)
        })
    });

    it("Can fetch all transactions", function (done) {
        Transaction.getFromPersistWithQuery({}).then (function (transactions) {
            expect(transactions.length).to.equal(6);
            done();
        }).fail(function(e) {
            done(e)
        })
    });

    it("Can update addresses", function (done) {
        Customer.getFromPersistWithId(sam._id).then (function (customer) {
            expect(customer.secondaryAddresses[0].city).to.equal("Rhinebeck");
            customer.secondaryAddresses[0].city="Red Hook";
            return customer.secondaryAddresses[0].persistSave();
        }).then(function () {
            return Customer.getFromPersistWithId(sam._id);
        }).then(function(customer) {
            expect(customer.secondaryAddresses[0].city).to.equal("Red Hook");
            done();
        }).fail(function(e) {
            done(e)
        });
    });

    it("Can get update conflicts", function (done) {
        var customer;
        var isStale = false;
        return Customer.getFromPersistWithId(sam._id).then (function (c) {
            customer = c;
            expect(customer.secondaryAddresses[0].city).to.equal("Red Hook");
            return knex('address').where({'_id': customer.secondaryAddresses[0]._id}).update({'__version__': 999});
        }).then(function () {
            return customer.secondaryAddresses[0].isStale()
        }).then(function(stale) {
            isStale = stale
            customer.secondaryAddresses[0].city="Red Hook";
            return customer.secondaryAddresses[0].persistSave();
        }).then(function () {
            return Customer.getFromPersistWithId(sam._id);
        }).then(function(customer) {
            expect("This should not have worked").to.equal(null);
        }).fail(function(e) {
            expect(e.message).to.equal("Update Conflict");
            expect(isStale).to.equal(true);
            done()
        });
    });

    it("Can transact", function (done) {
        var customer;
        var preSave = false;
        this.dirtyCount = 0;
        return Customer.getFromPersistWithId(sam._id).then (function (c) {
            customer = c;
            expect(customer.secondaryAddresses[0].city).to.equal("Red Hook");
            customer.secondaryAddresses[0].city="Rhinebeck";
            customer.primaryAddresses[0].city="The Big Apple";
            var txn = PersistObjectTemplate.begin();
            customer.secondaryAddresses[0].setDirty(txn);
            customer.primaryAddresses[0].setDirty(txn);

            txn.preSave=function () {preSave = true}
            txn.postSave=function (txn) {
                this.dirtyCount = _.toArray(txn.savedObjects).length
            }.bind(this);
            return PersistObjectTemplate.end(txn);
        }).then(function () {
            return Customer.getFromPersistWithId(sam._id);
        }).then(function(customer) {
            expect(customer.secondaryAddresses[0].city).to.equal("Rhinebeck");
            expect(customer.primaryAddresses[0].city).to.equal("The Big Apple");
            expect(preSave).to.equal(true);
            expect(this.dirtyCount).to.equal(2);
            done();
        }).fail(function(e) {
            done(e)
        });
    });
    it("Can get update conflicts on txn end and rollback", function (done) {
        var customer;
        var txn;
        return Customer.getFromPersistWithId(sam._id).then (function (c) {
            customer = c;
            expect(customer.secondaryAddresses[0].city).to.equal("Rhinebeck");
            customer.secondaryAddresses[0].city="Red Hook";
            customer.primaryAddresses[0].city="New York";
            txn = PersistObjectTemplate.begin();
            customer.secondaryAddresses[0].setDirty(txn);
            customer.primaryAddresses[0].setDirty(txn);
            return knex('address').where({'_id': customer.secondaryAddresses[0]._id}).update({'__version__': 999});
        }).then(function () {
            return PersistObjectTemplate.end(txn);
        }).catch(function (e) {
            expect(e.message).to.equal("Update Conflict");
            return Customer.getFromPersistWithId(sam._id);
        }).then(function(customer) {
            expect(customer.secondaryAddresses[0].city).to.equal("Rhinebeck");
            expect(customer.primaryAddresses[0].city).to.equal("The Big Apple");
            done();
        }).fail(function(e) {
            done(e)
        });
    });

    it("Can get update conflicts on txn end and rollback", function (done) { // Try again with a conflict on 2nd
        var customer;
        var txn;
        return Customer.getFromPersistWithId(sam._id).then (function (c) {
            customer = c;
            expect(customer.secondaryAddresses[0].city).to.equal("Rhinebeck");
            customer.secondaryAddresses[0].city="Red Hook";
            customer.primaryAddresses[0].city="New York";
            txn = PersistObjectTemplate.begin();
            customer.secondaryAddresses[0].setDirty(txn);
            customer.primaryAddresses[0].setDirty(txn);
            return knex('address').where({'_id': customer.primaryAddresses[0]._id}).update({'__version__': 999});
        }).then(function () {
            return PersistObjectTemplate.end(txn);
        }).catch(function (e) {
            expect(e.message).to.equal("Update Conflict");
            return Customer.getFromPersistWithId(sam._id);
        }).then(function(customer) {
            expect(customer.secondaryAddresses[0].city).to.equal("Rhinebeck");
            expect(customer.primaryAddresses[0].city).to.equal("The Big Apple");
            done();
        }).fail(function(e) {
            done(e)
        });
    });


    it("can delete", function (done) {
        Customer.getFromPersistWithQuery({},{roles: {fetch: {account: true}}}).then (function (customers) {
            function deleteStuff(txn) {
                var promises = [];
                customers.forEach(function(customer) {
                    customer.roles.forEach(function (role){
                        var account = role.account;
                        account.roles.forEach(function(role) {
                            promises.push(role.persistDelete(txn));
                            promises.push(role.account.persistDelete(txn));
                        })
                    });
                    promises.push(customer.persistDelete());
                });
                return Q.allSettled(promises);
            }
            var txn = PersistObjectTemplate.begin();
            txn.preSave= deleteStuff;
            return PersistObjectTemplate.end(txn).then (function () {
                return Customer.countFromPersistWithQuery()
            }).then (function (count) {
                expect(count).to.equal(0);
                return Account.countFromPersistWithQuery()
            }).then(function (count) {
                expect(count).to.equal(0);
                return Role.countFromPersistWithQuery()
            }).then(function (count) {
                expect(count).to.equal(0);
                done();
            });
        }).fail(function(e){done(e)});
    });

    it("closes the database", function (done) {
        db.close(function () {
            console.log("ending banking");
            done()
        });
    });

});
