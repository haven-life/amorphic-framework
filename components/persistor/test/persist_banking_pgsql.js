/*
 * Banking example shows PersistObjectTemplate with
 * many-to-many relationships
 *
 */

var expect = require('chai').expect;
var util = require('util');
var Promise = require('bluebird');
var _ = require('underscore');
var ObjectTemplate = require('supertype');
var PersistObjectTemplate = require('../index.js')(ObjectTemplate, null, ObjectTemplate);
var writing = true;


PersistObjectTemplate.debugInfo = 'api;conflict;write;read;data';//'api;io';
PersistObjectTemplate.debugInfo = 'conflict;data';//'api;io';
PersistObjectTemplate.logger.setLevel('debug');

var Customer = PersistObjectTemplate.create('Customer', {
    init: function (first, middle, last) {
        this.firstName = first;
        this.lastName = last;
        this.middleName = middle;
        expect(writing).equal(true);
        this.setDirty();
    },
    email:		{type: String, value: '', length: 50, rule: ['text', 'email', 'required'], logChanges: true},
    firstName:  {type: String, value: '', length: 40, rule: ['name', 'required']},
    middleName: {type: String, value: '', length: 40, rule: 'name'},
    lastName:	{type: String, value: '', length: 40, rule: ['name', 'required'], logChanges: true},
    local1:      {type: String, persist: false, value: 'local1'},
    local2:      {type: String, isLocal: true, value: 'local2'},
    nullNumber:  {type: Number, value: null},
    nullDate:    {type: Date, value: null},
    nullString: {type: String, value: null}
});

var Address = PersistObjectTemplate.create('Address', {
    init:       function (customer) {
        this.customer   = customer;
        this.setDirty();
    },
    lines:      {type: Array, of: String, value: [], max: 3},
    city:       {type: String, value: '', length: 20},
    state:      {type: String, value: '', length: 20},
    postalCode: {type: String, value: '', length: 20, logChanges: true},
    country:    {type: String, value: 'US', length: 3}
});

Customer.mixin({
    referredBy: {type: Customer},
    type: {type: String, value: 'primary'},
    referrers:  {type: Array, of: Customer, value: [], fetch: true},
    secondaryReferrers:  {type: Array, of: Customer, value: [], fetch: true},
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

var ReturnedMail = PersistObjectTemplate.create('ReturnedMail', {
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
var Role = PersistObjectTemplate.create('Role', {
    init:       function (customer, account, relationship) {
        this.customer = customer;
        this.account = account;
        if (relationship)
            this.relationship = relationship;
        this.setDirty();
    },
    relationship: {type: String, value: 'primary', logChanges: true},
    customer:     {type: Customer}
});

var Account = PersistObjectTemplate.create('Account', {
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
    number:     {type: Number, logChanges: true},
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
    }
});


Address.mixin({
    account:  {type: Account}
});
var FirstLevel = PersistObjectTemplate.create('FirstLevel', {
    dummy: {type: String, value: 'dummy'},
    address: {type: Array, of: Address},
    cascadeCheck: {type: CascadeSaveCheck}
});
var CascadeSaveCheck = PersistObjectTemplate.create('CascadeSaveCheck', {
    name: {type: String, value: 'initial value'},
    arrayOfFirstLevel: {type: Array, of: FirstLevel}
});

var Transaction = PersistObjectTemplate.create('Transaction', {
    init:       function (account, type, amount) {
        this.account = account;
        this.type = type;
        this.amount = amount;
        if (account)
            account.transactions.push(this);
    },
    amount:     {type: Number, logChanges: true},
    type:       {type: String, logChanges: true},
    account:    {type: Account}
});
var Debit = Transaction.extend('Debit', {
    init:       function (account, type, amount) {
        Transaction.call(this, account, type, amount);
    }
});
var Credit = Transaction.extend('Credit', {
    init:       function (account, type, amount) {
        Transaction.call(this, account, type, amount);
    }
});
var Xfer = Transaction.extend('Xfer', {
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
        documentOf: 'pg/customer',
        children: {
            roles: {id: 'customer_id'},
            referrers: {id: 'referred_id', filter: {property: 'type', value: 'primary'}},
            secondaryReferrers: {id: 'referred_id', filter: {property: 'type', value: 'secondary'}},
            primaryAddresses: {id: 'customer_id', fetch: true, filter: {property: 'type', value: 'primary'}, pruneOrphans: true},
            secondaryAddresses: {id: 'customer_id', fetch: true, filter: {property: 'type', value: 'secondary'}, pruneOrphans: true}
        },
        parents: {
            referredBy: {id: 'referred_id'}
        }
    },
    Address: {
        documentOf: 'pg/address',
        parents: {
            account: {id: 'account_id'},
            customer: {id: 'customer_id'}
        },
        children: {
            returnedMail: {id: 'address_id', fetch: true}
        }
    },
    ReturnedMail: {
        documentOf: 'pg/rm',
        parents: {
            address: {id: 'address_id'}
        }
    },
    Account: {
        documentOf: 'pg/account',
        children: {
            roles: {id: 'account_id', fetch: false},
            transactions: {id: 'account_id', fetch: false},
            fromAccountTransactions: {id: 'from_account_id', fetch: false}
        },
        parents: {
            address: {id: 'address_id', fetch: true}
        }
    },
    Role: {
        documentOf: 'pg/role',
        parents: {
            customer: {id: 'customer_id', fetch: 'yes'},
            account: {id: 'account_id'}
        }
    },
    Transaction: {
        documentOf: 'pg/transaction',
        parents: {
            account: {id: 'account_id', fetch: true},
            fromAccount: {id: 'from_account_id'}
        }
    },
    Xfer: {
        documentOf: 'pg/transaction'
    },
    Debit: {
        documentOf: 'pg/transaction'
    },
    Credit: {
        documentOf: 'pg/transaction'
    },
    CascadeSaveCheck: {
        documentOf: 'pg/cascadeSaveCheck',
        cascadeSave: true,
        children: {
            arrayOfFirstLevel: {id: 'firstlevel_id'}
        }
    },
    FirstLevel: {
        documentOf: 'pg/FirstLevel',
        parents: {
            cascadeCheck: {id: 'firstlevel_id'},
            address: {id: 'address_id'}
        }
    }
}

function clearCollection(template) {
    var collectionName = template.__collection__.match(/\//) ? template.__collection__ : 'mongo/' + template.__collection__;
    if (collectionName.match(/pg\/(.*)/)) {
        collectionName = RegExp.$1;
        return PersistObjectTemplate.dropKnexTable(template)
            .then(function () {
                return PersistObjectTemplate.synchronizeKnexTableFromTemplate(template).then(function() {return 0});
            });
    } else
        throw 'Invalid collection name ' + collectionName;
}

describe('Banking from pgsql Example', function () {
    var knex;
    it ('opens the database Postgres', function () {
        return Promise.resolve()
            .then(function () {
                knex = require('knex')({
                    client: 'pg',
                    debug: true,
                    connection: {
                        host     : '127.0.0.1',
                        database : 'persistor_banking',
                        user: 'postgres',
                        password: 'postgres'

                    }
                });
                PersistObjectTemplate.setDB(knex, PersistObjectTemplate.DB_Knex,  'pg');
                PersistObjectTemplate.setSchema(schema);
                PersistObjectTemplate.performInjections(); // Normally done by getTemplates
            }).catch(function(e) {throw e;});
    });
    var schemaTable = 'index_schema_history';
    it ('clears the bank', function () {
        return knex.schema.dropTableIfExists(schemaTable)
            .then(function (count) {
                return clearCollection(Role);
            }).then(function (count) {
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
                return clearCollection(CascadeSaveCheck)
            }).then(function (count) {
                expect(count).to.equal(0);
                return clearCollection(FirstLevel)
            }).then(function (count) {
                expect(count).to.equal(0);
            }).catch(function (e) {
                throw e
            });
    });
    var sam;
    var karen;
    var ashling;
    var samsAccount;
    var jointAccount;

    // it ('setDirty with cascadeSave in the schema definition', function () {
    //     var cascadeObj = new CascadeSaveCheck();
    //     cascadeObj.arrayOfFirstLevel = [];
    //     var obj1 = new FirstLevel();
    //     obj1.cascadeCheck = cascadeObj;
    //     var obj2 = new FirstLevel();
    //     obj2.cascadeCheck = cascadeObj;
    //     cascadeObj.arrayOfFirstLevel.push(obj1);
    //     cascadeObj.arrayOfFirstLevel.push(obj2);
    //
    //     var txn = PersistObjectTemplate.begin();
    //     cascadeObj.setDirty(txn, true, true);
    //
    //     return PersistObjectTemplate.end(txn).then(function(txnStatus) {
    //         expect(txnStatus).to.equal(true);
    //     });
    // });

    it ('can create the data', function () {
        // Setup customers and addresses
        sam = new Customer('Sam', 'M', 'Elsamman');
        karen = new Customer('Karen', 'M', 'Burke');
        ashling = new Customer('Ashling', '', 'Burke');


        // Setup referrers
        sam.referrers = [ashling, karen];
        ashling.referredBy = sam;
        karen.referredBy = sam;
        sam.local1 = 'foo';
        sam.local2 = 'bar';

        // Setup addresses
        sam.addAddress('primary', ['500 East 83', 'Apt 1E'], 'New York', 'NY', '10028');
        sam.addAddress('secondary', ['38 Haggerty Hill Rd', ''], 'Rhinebeck', 'NY', '12572');

        sam.secondaryAddresses[0].addReturnedMail(new Date());
        sam.secondaryAddresses[0].addReturnedMail(new Date());

        karen.addAddress('primary', ['500 East 83d', 'Apt 1E'], 'New York', 'NY', '10028');
        karen.addAddress('secondary', ['38 Haggerty Hill Rd', ''], 'Rhinebeck', 'NY', '12572');

        karen.primaryAddresses[0].addReturnedMail(new Date());

        ashling.addAddress('primary', ['End of the Road', ''], 'Lexington', 'KY', '34421');

        // Setup accounts
        samsAccount = new Account(123412341234123, ['Sam Elsamman'], sam, sam.primaryAddresses[0]);
        jointAccount = new Account(.123412341234123, ['Sam Elsamman', 'Karen Burke', 'Ashling Burke'], sam, karen.primaryAddresses[0]);
        jointAccount.addCustomer(karen, 'joint');
        jointAccount.addCustomer(ashling, 'joint');

        samsAccount.credit(100);                        // Sam has 100
        samsAccount.debit(50);                          // Sam has 50
        jointAccount.credit(200);                       // Joint has 200
        jointAccount.transferTo(100, samsAccount);      // Joint has 100, Sam has 150
        jointAccount.transferFrom(50, samsAccount);     // Joint has 150, Sam has 100
        jointAccount.debit(25);                         // Joint has 125
    });

    it('both accounts have the right balance', function () {
        expect(samsAccount.getBalance()).to.equal(100);
        expect(jointAccount.getBalance()).to.equal(125);
    });

    it('check server side fetch property..', function () {
        return samsAccount.addressFetch(0, 1).then(function(address) {
            expect(util.inspect(address)).to.not.equal('');
        })
    });
    it('can insert', function (done) {
        PersistObjectTemplate.begin();
        sam.setDirty();
        ashling.setDirty();
        karen.setDirty();
        PersistObjectTemplate.end().then(function(result) {
            expect(result).to.equal(true);
            done();
        }).catch(function(e) {done(e)});
    });
    it('Accounts have addresses', function (done) {
        Account.getFromPersistWithQuery(null, {address: true, transactions: false, fromAccountTransactions: false}).then (function (accounts) {
            expect(accounts.length).to.equal(2);
            expect(accounts[0].address.__template__.__name__).to.equal('Address');
            expect(accounts[0].number).to.equal(123412341234123);
            expect(accounts[1].number).to.equal(.123412341234123);
            expect(accounts[0].roles[0].customer.firstName).to.equal('Sam');
            done();
        }).catch(function(e) {
            done(e)
        })
    });
    it('Dummy fetchProperty call, object already contains the values', function () {
        Account.getFromPersistWithQuery(null, {address: true}).then (function (accounts) {
            accounts[0].fetchProperty('roles', null, {sort: {_id: 1}});
        }).catch(function(e) {
            throw e;
        })
    });
    it('Dummy fetchProperty call, object already contains the values', function () {
        Account.getFromPersistWithQuery(null, {address: true}).then (function (accounts) {
            accounts[0].fetchProperty('roles', null, {sort: {_id: 0}});
        }).catch(function(e) {
            throw e;
        })
    });
    it('Customers have addresses', function (done) {
        Customer.getFromPersistWithQuery(null, {primaryAddresses: true, secondaryAddresses: true}).then (function (customers) {
            expect(customers[0].primaryAddresses.length + customers[0].secondaryAddresses.length +
            customers[1].primaryAddresses.length + customers[1].secondaryAddresses.length +
            customers[2].primaryAddresses.length + customers[2].secondaryAddresses.length).to.equal(5);
            done();
        }).catch(function(e) {
            done(e)
        })
    });
    it('Accounts sloppily replace addresses', function (done) {
        sam.primaryAddresses.splice(0, 1);
        sam.addAddress('primary', ['500 East 83d', 'Apt 1E'], 'New York', 'NY', '10028');
        Promise.resolve()
            .then(function () {
                return sam.persistSave()
            })
            .then(function () {
                return sam.primaryAddresses[0].persistSave()
            })
            .then(function () {done()})
            .catch(function(e) {
                done(e)
            })
    });
    it('Customers have addresses', function (done) {
        Customer.getFromPersistWithQuery(null, {primaryAddresses: true, secondaryAddresses: true}).then (function (customers) {
            expect(customers[0].primaryAddresses.length + customers[0].secondaryAddresses.length +
                customers[1].primaryAddresses.length + customers[1].secondaryAddresses.length +
                customers[2].primaryAddresses.length + customers[2].secondaryAddresses.length).to.equal(5);
            done();
        }).catch(function(e) {
            done(e)
        })
    });
    it('Transactions have accounts fetched', function (done) {
        Xfer.getFromPersistWithQuery({type: 'xfer'}).then (function (transactions) {
            expect(transactions.length).to.equal(2);
            expect(!!transactions[0].account._id).to.equal(true);
            expect(!!transactions[1].account._id).to.equal(true);
            done();
        }).catch(function(e) {
            done(e)
        })
    });
    it('Can find debits and credits >= 200 with a $in', function (done) {
        //{type: {$in: ['debit', 'credit']}, amount:{'$gte': 200}}
        //{$and: [{$in: ['debit', 'credit']}}, {amount:{'$gte': 200}}}
        Transaction.getFromPersistWithQuery({type: {$in: ['debit', 'credit']}, amount:{'$gte': 200}}).then (function (transactions) {
            expect(transactions.length).to.equal(1);
            expect(transactions[0].amount).to.equal(200);
            done();
        }).catch(function(e) {
            done(e)
        })
    });

    it('Can find debits with $eq', function () {
        Transaction.getFromPersistWithQuery({type: {$eq: ['debit']}}).then (function (transactions) {
            expect(transactions.length).to.equal(0);
        });
    });

    it('get all transactions with with $lt', function () {
        Transaction.getFromPersistWithQuery({amount:{'$lt': 500}}).then (function (transactions) {
            expect(transactions.length).to.equal(6);
        });
    });

    it('get all transactions with with $lte', function () {
        return Transaction.getFromPersistWithQuery({amount:{'$lte': 500}}).then (function (transactions) {
            expect(transactions.length).to.equal(6);
        });
    });
    it('get all transactions with with $ne', function () {
        return Transaction.getFromPersistWithQuery({amount:{'$ne': 100}}).then (function (transactions) {
            expect(transactions.length).to.equal(4);
        });
    });

    it('$exists operator not supported', function () {
        return Transaction.getFromPersistWithQuery({amount:{'$exists': false}})
            .catch(function(e) {
                expect(e).to.equal('Can\'t handle amount:{"$exists":false}');
            })
    });

    it('Can find debits and credits >= 200 with a $in', function (done) {
        Transaction.getFromPersistWithQuery({type: {$in: ['debit', 'credit']}, amount:{'$in': [200, 100], $gt: 100}}).then (function (transactions) {
            expect(transactions.length).to.equal(1);
            expect(transactions[0].amount).to.equal(200);
            done();
        }).catch(function(e) {
            done(e)
        })
    });

    it('Can find debits and credits with a $or', function (done) {
        Transaction.getFromPersistWithQuery({'$or':[{type: 'debit'}, {type: 'credit'}]}).then (function (transactions) {
            expect(transactions.length).to.equal(4);
            expect(transactions[0].type).to.not.equal('xfer');
            expect(transactions[1].type).to.not.equal('xfer');
            expect(transactions[2].type).to.not.equal('xfer');
            expect(transactions[3].type).to.not.equal('xfer');
            done();
        }).catch(function(e) {
            done(e)
        })
    });

    it('Can find debits and credits with a $in', function (done) {
        Transaction.getFromPersistWithQuery({type: {$in: ['debit', 'credit']}}).then (function (transactions) {
            expect(transactions.length).to.equal(4);
            expect(transactions[0].type).to.not.equal('xfer');
            expect(transactions[1].type).to.not.equal('xfer');
            expect(transactions[2].type).to.not.equal('xfer');
            expect(transactions[3].type).to.not.equal('xfer');
            done();
        }).catch(function(e) {
            done(e)
        })
    });
    it('Can find debits and credits with a regex', function (done) {
        Transaction.getFromPersistWithQuery({type: {$regex: '^.*It$', $options: 'i'}}).then (function (transactions) {
            expect(transactions.length).to.equal(4);
            expect(transactions[0].type).to.not.equal('xfer');
            expect(transactions[1].type).to.not.equal('xfer');
            expect(transactions[2].type).to.not.equal('xfer');
            expect(transactions[3].type).to.not.equal('xfer');
            done();
        }).catch(function(e) {
            done(e)
        })
    });
    var transactionIds = [];
    it('Can fetch all transactions', function (done) {
        Transaction.getFromPersistWithQuery({}, null, null, null, null, null, {sort: {_id: 1}}).then (function (transactions) {
            expect(transactions.length).to.equal(6);
            transactions.forEach(function(t) {transactionIds.push(t._id)});
            done();
        }).catch(function(e) {
            done(e)
        })
    });
    it('Can fetch the first transaction', function (done) {
        Transaction.getFromPersistWithQuery({}, null, 0, 1, null, null, {sort: {_id: 1}}).then (function (transactions) {
            expect(transactions.length).to.equal(1);
            expect(transactions[0]._id).to.equal(transactionIds[0]);
            done();
        }).catch(function(e) {
            done(e)
        })
    });
    it('Can fetch the next to last transaction', function (done) {
        Transaction.getFromPersistWithQuery({}, null, 4, 1, null, null, {sort: {_id: 1}}).then (function (transactions) {
            expect(transactions.length).to.equal(1);
            expect(transactions[0]._id).to.equal(transactionIds[4]);
            done();
        }).catch(function(e) {
            done(e)
        })
    });
    it('Can fetch transfers', function (done) {
        Transaction.getFromPersistWithQuery({type: 'xfer'}, {account: true, fromAccount: true}).then (function (transactions) {
            expect(transactions.length).to.equal(2);
            expect(transactions[0].type).to.equal('xfer');
            expect(transactions[1].type).to.equal('xfer');
            expect(transactions[0].fromAccount.__template__.__name__).to.equal('Account');
            expect(transactions[0].account.__template__.__name__).to.equal('Account');
            done();
        }).catch(function(e) {
            done(e)
        })
    });
    it('Can fetch transfers with $nin', function (done) {
        Transaction.getFromPersistWithQuery({type: {$nin: ['debit', 'credit']}}, {account: true, fromAccount: true}).then (function (transactions) {
            expect(transactions.length).to.equal(2);
            expect(transactions[0].type).to.equal('xfer');
            expect(transactions[1].type).to.equal('xfer');
            expect(transactions[0].fromAccount.__template__.__name__).to.equal('Account');
            expect(transactions[0].account.__template__.__name__).to.equal('Account');
            done();
        }).catch(function(e) {
            done(e)
        })
    });
    it('can fetch a pojo', function () {
        return PersistObjectTemplate.getPOJOFromQuery(Customer, {firstName: 'Sam'}).then(function (pojo) {
            expect(pojo[0].firstName).to.equal('Sam');
        });
    });
    it('can fetch a pojo', function () {
        return PersistObjectTemplate.getPOJOFromQuery(Customer, {firstName: 'Sam'}).then(function (pojo) {
            expect(pojo[0].firstName).to.equal('Sam');
        });
    });
    it('fetch using a knex queries in the callback...', function () {
        var func = function(knex) {
            knex.where({firstName: 'Sam'});
        };
        return PersistObjectTemplate.getPOJOFromQuery(Customer, func).then(function (pojo) {
            expect(pojo[0].firstName).to.equal('Sam');
        });
    });
    it('countFromKnexQuery using a knex queries in the callback...', function () {
        var func = function(knex) {
            knex.where({firstName: 'Sam'});
        };
        return PersistObjectTemplate.countFromKnexQuery(Customer, func).then(function (count) {
            expect(count).to.equal(1);
        });
    });
    it('when trying to use where condition on a field that does not exist, getPOJO call should throw an error', function () {
        var func = function(knex) {
            knex.where({fieldNotAvailable: 'Sam'});
        };
        return PersistObjectTemplate.getPOJOFromQuery.call(PersistObjectTemplate, Customer, func).catch(function (e) {
            expect(e.message).to.contain('column "fieldNotAvailable" does not exist');
        });
    });
    it('check persist properties', function () {
        var persistorProps = PersistObjectTemplate.getPersistorProps();
        expect(Object.keys(persistorProps)).to.contains('Customer')
    });

    it ('can go native parent join', function (done) {
        Transaction
            .getKnex()
            .select(['transaction.amount', 'account.number'])
            .from(Transaction.getTableName('transaction'))
            .rightOuterJoin(Account.getTableName('account'),
                Transaction.getParentKey('fromAccount', 'transaction'),
                Account.getPrimaryKey('account'))
            .then(processResults);

        function processResults(res) {
            //console.log(JSON.stringify(res))
            expect(res[0].amount + res[1].amount).to.equal(150);
            done();
        }
    });
    it ('can go native child join', function (done) {
        Transaction
            .getKnex()
            .select(['transaction.amount', 'account.number'])
            .from(Account.getTableName('account'))
            .rightOuterJoin(Transaction.getTableName('transaction'),
                Account.getChildKey('fromAccountTransactions', 'transaction'),
                Account.getPrimaryKey('account'))
            .then(processResults);

        function processResults(res) {
            //console.log(JSON.stringify(res))
            expect(res[0].amount + res[1].amount).to.equal(150);
            done();
        }
    });
    it ('can go native with apply parent', function (done) {
        Transaction
            .getKnex()
            .select(['transaction.amount', 'account.number'])
            .from(Transaction.getTableName('transaction'))
            .rightOuterJoin.apply(Transaction.getKnex(), Account.knexParentJoin(Transaction, 'account', 'transaction', 'fromAccount'))
            .then(processResults);

        function processResults(res) {
            //console.log(JSON.stringify(res))
            expect(res[0].amount + res[1].amount).to.equal(150);
            done();
        }
    });

    it ('getTableName without alias name', function () {
        expect(Transaction.getTableName()).to.equal('transaction');
        expect(Transaction.getParentKey('account')).to.equal('account_id');
        expect(Account.getChildKey('transactions')).to.equal('account_id');
        expect(Transaction.getPrimaryKey()).to.equal('_id');
    });
    it ('can go native with apply child', function (done) {
        Transaction
            .getKnex()
            .select(['transaction.amount', 'account.number'])
            .from(Transaction.getTableName('transaction'))
            .rightOuterJoin.apply(Account.getKnex(), Transaction.knexChildJoin(Account, 'transaction', 'account', 'fromAccountTransactions'))
            .then(processResults)
        function processResults(res) {
            //console.log(JSON.stringify(res))
            expect(res[0].amount + res[1].amount).to.equal(150);
            done();
        }
    });
    it('Can find debits and amount $gt 1000 with $and', function () {
        //@TODO: and condition is not working...
        return Transaction.getFromPersistWithQuery({'$and':[{type: 'debit'}, {amount:{$gt: 100}}]}).then (function (transactions) {
            expect(transactions.length).to.equal(0);
        });
    });
    it('Can find debits and amount $gt 1000 with $and', function () {
        return Transaction.getFromPersistWithQuery({type: {$in: ['debit', 'credit']}}).then (function (transactions) {
            expect(transactions.length).to.equal(4);
        });
    });
    it('Can find debits and amount $gt 1000 with $and', function () {
        //@TODO: and condition is not working...
        return Transaction.getFromPersistWithQuery({type: {$nin: ['debit']}}).then (function (transactions) {
            expect(transactions.length).to.equal(4);
        });
    });
    it('sam looks good on fresh fetch', function (done) {
        Customer.getFromPersistWithId(sam._id, {roles: true}).then (function (customer) {
            expect(customer.nullNumber).to.equal(null);
            expect(customer.nullString).to.equal(null);
            expect(customer.nullDate).to.equal(null);
            expect(customer.firstName).to.equal('Sam');
            expect(customer.local1).to.equal('local1');
            expect(customer.local2).to.equal('local2');
            expect(customer.roles[1].relationship).to.equal('primary');
            expect(customer.roles[1].customer).to.equal(customer);
            expect(customer.roles[1].accountPersistor.isFetched).to.equal(false);
            return customer.roles[1].fetch({account: {fetch: {roles: {fetch: {customer: {fetch: {roles: true}}}}}}}).then(function ()
            {
                expect(customer.roles[1].account.number).to.equal(.123412341234123);
                expect(customer.roles[1].account.roles.length).to.equal(3);
                expect(customer.primaryAddresses[0].lines[0]).to.equal('500 East 83d');
                expect(customer.secondaryAddresses[0].lines[0]).to.equal('38 Haggerty Hill Rd');
                expect(customer.secondaryAddresses[0].customer).to.equal(customer);

                expect(customer.secondaryAddresses[0].returnedMail.length).to.equal(2);

                var r1 = customer.referrers[0];
                var r2 = customer.referrers[1];
                var karen = r1.firstName == 'Karen' ? r1 : r2;
                var ashling = r1.firstName == 'Karen' ? r2 : r1;
                expect(karen.firstName).to.equal('Karen');
                expect(ashling.firstName).to.equal('Ashling');
                done();
            });
        }).catch(function(e) {
            done(e)
        });
    });
    it('sam looks good on refresh', function (done) {
        sam.refresh().then (function () {
            var customer = sam;
            expect(customer.nullNumber).to.equal(null);
            expect(customer.nullString).to.equal(null);
            expect(customer.nullDate).to.equal(null);
            expect(customer.firstName).to.equal('Sam');
            expect(customer.local1).to.equal('foo');
            expect(customer.local2).to.equal('bar');
            expect(customer.roles[1].relationship).to.equal('primary');
            expect(customer.roles[1].customer).to.equal(customer);
            expect(customer.roles[1].accountPersistor.isFetched).to.equal(true); // because it was already fetched

            return customer.roles[1].fetch({account: {fetch: {roles: {fetch: {customer: {fetch: {roles: true}}}}}}}).then(function ()
            {
                expect(customer.roles[1].account.number).to.equal(.123412341234123);
                expect(customer.roles[1].account.roles.length).to.equal(3);
                expect(customer.primaryAddresses[0].lines[0]).to.equal('500 East 83d');
                expect(customer.secondaryAddresses[0].lines[0]).to.equal('38 Haggerty Hill Rd');
                expect(customer.secondaryAddresses[0].customer).to.equal(customer);

                expect(customer.secondaryAddresses[0].returnedMail.length).to.equal(2);

                var r1 = customer.referrers[0];
                var r2 = customer.referrers[1];
                var karen = r1.firstName == 'Karen' ? r1 : r2;
                var ashling = r1.firstName == 'Karen' ? r2 : r1;
                expect(karen.firstName).to.equal('Karen');
                expect(ashling.firstName).to.equal('Ashling');
                done();
            });
        }).catch(function(e) {
            done(e)
        });
    });
    it('has a correct joint account balance for sam', function (done) {
        Account.getFromPersistWithId(samsAccount._id, {roles: true}).then (function (account) {
            expect(account.getBalance()).to.equal(samsAccount.getBalance());
            done();
        }).catch(function(e) {
            done(e)
        });
    });

    it('has a correct joint account balance for the joint account', function (done) {
        Account.getFromPersistWithId(jointAccount._id, {roles: true}).then (function (account) {
            expect(account.getBalance()).to.equal(jointAccount.getBalance());
            done();
        }).catch(function(e) {
            done(e)
        })
    });

    it('Can fetch all transactions', function (done) {
        Transaction.getFromPersistWithQuery({}).then (function (transactions) {
            expect(transactions.length).to.equal(6);
            done();
        }).catch(function(e) {
            done(e)
        })
    });

    it('getFromPersistWithId without id value', function () {
        return Transaction.getFromPersistWithId(null).catch(function(e) {
            expect(e.message).to.contain('The operator "undefined" is not permitted');
        })

    });

    it('getFromPersistWithId without id value', function () {
        return Transaction.getFromPersistWithId(null).catch(function(e) {
            expect(e.message).to.contain('The operator "undefined" is not permitted');
        })

    });

    it('Customers have addresses after update of customer that does not fetch them', function (done) {
        Customer.getFromPersistWithQuery(null, {primaryAddresses: false, secondaryAddresses: false})
        .then (function (customers) {
            return customers[0].persistSave();
        }).then(function() {
            return Customer.getFromPersistWithQuery(null, {primaryAddresses: true, secondaryAddresses: true})
        }).then (function (customers) {
            expect(customers[0].primaryAddresses.length + customers[0].secondaryAddresses.length +
                customers[1].primaryAddresses.length + customers[1].secondaryAddresses.length +
                customers[2].primaryAddresses.length + customers[2].secondaryAddresses.length).to.equal(5);
            done();
        })
        .catch(function(e) {
            done(e)
        })
    });

    it('Can update addresses', function (done) {
        Customer.getFromPersistWithId(sam._id).then (function (customer) {
            expect(customer.secondaryAddresses[0].city).to.equal('Rhinebeck');
            customer.secondaryAddresses[0].city = 'Red Hook';
            return customer.secondaryAddresses[0].persistSave();
        }).then(function () {
            return Customer.getFromPersistWithId(sam._id);
        }).then(function(customer) {
            expect(customer.secondaryAddresses[0].city).to.equal('Red Hook');
            done();
        }).catch(function(e) {
            done(e)
        });
    });

    it('Can get update conflicts', function () {
        var customer;
        var isStale = false;
        return Customer.getFromPersistWithId(sam._id).then (function (sam) {
            customer = sam;
            expect(customer.secondaryAddresses[0].city).to.equal('Red Hook');
            return knex('address').where({'_id': customer.secondaryAddresses[0]._id}).update({'__version__': 999});
        }).then(function () {
            return customer.secondaryAddresses[0].isStale()
        }).then(function(stale) {
            isStale = stale;
            customer.secondaryAddresses[0].city = 'Red Hook';
            return customer.secondaryAddresses[0].persistSave();
        }).catch(function(e) {
            expect(e.message).to.equal('Update Conflict');
            expect(isStale).to.equal(true);
        });
    });

    it('Can transact', function () {
        var customer;
        var preSave = false;
        this.dirtyCount = 0;
        return Customer.getFromPersistWithId(sam._id).then (function (c) {
            customer = c;
            expect(customer.secondaryAddresses[0].city).to.equal('Red Hook');
            customer.secondaryAddresses[0].city = 'Rhinebeck';
            customer.primaryAddresses[0].city = 'The Big Apple';
            var txn = PersistObjectTemplate.begin();


            customer.secondaryAddresses[0].setDirty(txn);
            customer.primaryAddresses[0].setDirty(txn);

            txn.preSave = function () {preSave = true};
            txn.postSave = function (txn) {
                this.dirtyCount = _.toArray(txn.savedObjects).length
            }.bind(this);
            return PersistObjectTemplate.end(txn);
        }).then(function () {
            return Customer.getFromPersistWithId(sam._id);
        }).then(function(customer) {
            expect(customer.secondaryAddresses[0].city).to.equal('Rhinebeck');
            expect(customer.primaryAddresses[0].city).to.equal('The Big Apple');
            expect(preSave).to.equal(true);
            expect(this.dirtyCount).to.equal(2);
        }).catch(function(e) {
            throw e;
        });
    });

    it('Can get update conflicts on txn end and rollback', function () { // Try again with a conflict on 2nd
        var customer;
        var txn;
        return Customer.getFromPersistWithId(sam._id).then (function (c) {
            customer = c;
            expect(customer.secondaryAddresses[0].city).to.equal('Rhinebeck');
            expect(customer.primaryAddresses[0].city).to.equal('The Big Apple');
            customer.secondaryAddresses[0].city = 'Red Hook';
            customer.primaryAddresses[0].city = 'New York';
            txn = PersistObjectTemplate.begin();
            customer.secondaryAddresses[0].setDirty(txn);
            customer.primaryAddresses[0].setDirty(txn);
            return knex('address').where({'_id': customer.primaryAddresses[0]._id}).update({'__version__': 999});
        }).then(function () {
            return PersistObjectTemplate.end(txn);
        }).catch(function (e) {
            expect(e.message).to.equal('Update Conflict');
            return Customer.getFromPersistWithId(sam._id);
        }).then(function(customer) {
            expect(customer.secondaryAddresses[0].city).to.equal('Rhinebeck');
            expect(customer.primaryAddresses[0].city).to.equal('The Big Apple');
        }).catch(function(e) {
            throw e;
        });
    });

    it('Two transactions can happen on the same connection pool', function (done) {

        var txn1 = PersistObjectTemplate.begin(true);
        var txn2 = PersistObjectTemplate.begin(true);
        var txn1Sam, txn2Karen;

        Promise.resolve().then(function () {
            return Customer.getFromPersistWithId(sam._id)
        }).then(function (sam) {
            txn1Sam = sam;
            return Customer.getFromPersistWithId(sam._id)
        }).then(function (sam) {
            expect(sam.firstName).to.equal('Sam');
            return Customer.getFromPersistWithId(karen._id)
        }).then(function (karen) {
            return Customer.getFromPersistWithId(karen._id)
        }).then(function (karen) {
            txn2Karen = karen;

            txn1Sam.firstName = 'txn1Sam';
            txn1Sam.setDirty(txn1);

            txn2Karen.firstName = 'txn2Karen';
            txn2Karen.setDirty(txn2);

            txn1.postSave = function () {
                return Promise.resolve()
                .then(function () {
                    return Customer.getFromPersistWithId(sam._id);
                }).then(function (sam) {
                    expect(sam.firstName).to.equal('Sam');     // Outside world does not see new value of sam
                    return PersistObjectTemplate.end(txn2);     // Update Karen and end transaction txn2
                }).then(function () {
                    return Customer.getFromPersistWithId(sam._id)
                }).then(function (sam) {
                    expect(sam.firstName).to.equal('Sam');     // Outside world still does not see new value of sam
                })
            };
            return PersistObjectTemplate.end(txn1); // Do update of sam but don't commit
        }).then(function () {
            return Customer.getFromPersistWithId(sam._id)
        }).then(function (sam) {
            expect(sam.firstName).to.equal('txn1Sam');
            return Customer.getFromPersistWithId(karen._id)
        }).then(function (karen) {
            expect(karen.firstName).to.equal('txn2Karen');
            done();
        }).catch(function(err) {
            done(err)
        });
    });

    it('Can get a deadlock rollback', function (done) {

        /* Sequence to get a deadlock:
        1 - txn1 - end() procssesing: update sam (acquire exclusive lock)
        2 - txn2 - end() processing: update karen (aquire exclusive lock), update sam (request lock on sam),
        3 - txn1 - postSave processing: update karen (request exclusive lock that can't be granted   */
        var txn1 = PersistObjectTemplate.begin(true);
        var txn2 = PersistObjectTemplate.begin(true);
        var txn1Sam, txn1Karen, txn2Sam, txn2Karen;
        var txn1Error = false;
        var txn2Error = false;

        Promise.resolve()
        .then(function () {
            return Customer.getFromPersistWithId(sam._id)
        }).then(function (sam) {
            txn1Sam = sam;
            return Customer.getFromPersistWithId(sam._id)
        }).then(function (sam) {
            txn2Sam = sam;
            expect(sam.firstName).to.equal('txn1Sam');
            return Customer.getFromPersistWithId(karen._id)
        }).then(function (karen) {
            txn1Karen = karen;
            return Customer.getFromPersistWithId(karen._id)
        }).then(function (karen) {
            txn2Karen = karen;
            txn1Sam.firstName = 'txn1SamDead';
            txn1Sam.setDirty(txn1);
            txn2Karen.firstName = 'txn2KarenDead';
            txn2Karen.setDirty(txn2);
            txn2Sam.firstName = 'txn2SamDead';
            txn2Sam.setDirty(txn2);
            txn1.postSave = function () {
                Promise.delay(100)
                .then(function () {
                    // Update will not return because it is requesting a lock on Karen
                    txn1Karen.persistTouch(txn1) // 3 update karen
                        .catch(function (e) {
                            if (e.message != 'Update Conflict')
                                done(e);
                            txn2Error = true;
                        })
                });
                // Update will not return because it is requesting a lock on Sam
                return PersistObjectTemplate.end(txn2)// 2 - update sam (req lock), update karen (exc lock)
                .catch(function (e) {
                    expect(e.message).to.equal('Update Conflict');
                    txn2Error = true;
                });
            };
            return PersistObjectTemplate.end(txn1); // 1 - update sam (exc lock)
        }).catch(function (e) {
            if (e.message != 'Update Conflict')
                done(e);
            expect(e.message).to.equal('Update Conflict');
            txn1Error = true;
        }).then(function () {
            expect((txn1Error ? 1 : 0) + (txn2Error ? 1 : 0)).to.equal(1);
            expect(!!(txn1.innerError || txn2.innerError).toString().match(/deadlock/)).to.equal(true);
            return Customer.getFromPersistWithId(sam._id);
        }).then(function (sam) {
            expect(sam.firstName).to.equal(txn1Error ? 'txn1Sam' : 'txn1SamDead'); // Failed
            return Customer.getFromPersistWithId(karen._id);
        }).then(function (karen) {
            expect(karen.firstName).to.equal(txn2Error ? 'txn2Karen' : 'txn2KarenDead'); // Survived (Not sure order will always be the same
            done();
        }).catch(function(err) {
            done(err)
        });
    });

    it('Can change things to null', function (done) {
        Customer.getFromPersistWithId(sam._id, {roles: true, referredBy: true}).then (function (customer) {
            customer.firstName = null;
            customer.referredBy = null;
            return customer.persistSave()
        }).then (function () {
            return Customer.getFromPersistWithId(sam._id, {roles: true, referredBy: true})
        }).then (function (customer) {
            expect(customer.firstName).to.equal(null);
            expect(customer.referredBy).to.equal(null);
            done();
        }.bind(this)).catch(function(e) {
            done(e)
        })
    });

    it('cascadeSave with transaction', function () {
        writing = true;
        var txn = PersistObjectTemplate.begin();
        var customerForCascadeSave = new Customer('customerForCascadeSave', 'M', 'Last');
        customerForCascadeSave.cascadeSave(txn);
        return PersistObjectTemplate.end(txn).then (function () {
            return Customer.getFromPersistWithId(customerForCascadeSave._id)
        }).then (function (customer) {
            expect(customer.firstName).to.equal('customerForCascadeSave');
        }.bind(this)).catch(function(e) {
            throw e;
        })
    });

    it('cascadeSave without transaction', function () {
        writing = true;
        var txn = PersistObjectTemplate.begin();
        var customerForCascadeSave = new Customer('customerForCascadeSaveWithoutTransaction', 'M', 'Last');
        customerForCascadeSave.cascadeSave(txn);
        return PersistObjectTemplate.end().then (function () {
            return Customer.getFromPersistWithId(customerForCascadeSave._id)
        }).then (function (customer) {
            expect(customer.firstName).to.equal('customerForCascadeSaveWithoutTransaction');
        }.bind(this)).catch(function(e) {
            throw e;
        })
    });

    it('Can prune orphans', function (done) {
        Customer.getFromPersistWithId(sam._id).then (function (customer) {
            customer.secondaryAddresses = [];
            return customer.persistSave();
        }).then(function () {
            return Customer.getFromPersistWithId(sam._id);
        }).then(function(customer) {
            expect(customer.secondaryAddresses.length).to.equal(0);
            done();
        }).catch(function(e) {
            done(e)
        });
    });


    it('can delete', function (done) {
        Customer.getFromPersistWithQuery({}, {roles: {fetch: {account: true}}}).then (function (customers) {
            function deleteStuff(txn) {
                var promises = [];
                customers.forEach(function(customer) {
                    customer.roles.forEach(function (role) {
                        var account = role.account;
                        account.roles.forEach(function(role) {
                            promises.push(role.persistDelete(txn));
                            promises.push(role.account.persistDelete(txn));
                        })
                    });
                    promises.push(customer.persistDelete());
                });
                return Promise.all(promises);
            }
            var txn = PersistObjectTemplate.begin();
            txn.preSave = deleteStuff;
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
        }).catch(function(e) {done(e)});
    });

    // it('closes the database', function (done) {
    //     persist_banking_pgsql.js.close().then(function () {
    //         console.log('ending banking');
    //         done()
    //     });
    // });

});
