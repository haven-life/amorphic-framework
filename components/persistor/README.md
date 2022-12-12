# Persistor

## Description

Persistor is a subclass of [SuperType](https://github.com/haven-life/supertype) that serializes to and reconstitutes from mongoDB or PostgreSQL.

## Installation

It is automatically installed with [Amorphic](https://github.com/haven-life/amorphic)

## Example

First create some object templates (many-to-many example):

    var ObjectTemplate = require('@haventech/supertype').default;
    var PersistObjectTemplate = require('persistor')(ObjectTemplate, null, ObjectTemplate);

    var Customer = PersistObjectTemplate.create("customer:Customer", {
        email:		{type: String},
        firstName:  {type: String},
        middleName: {type: String},
        lastName:	{type: String}
    });
    
    var Account = PersistObjectTemplate.create("account:Account", {
        init:       function (number, title, customer) {
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
        title:      {type: Array, of: String, max: 4}
    });

    var Role = PersistObjectTemplate.create("role:Role", {
        init:       function (customer, account, relationship) {
            this.customer = customer;
            this.account = account;
            if (relationship)
                this.relationship = relationship;
        },
        relationship: {type: String, value: "primary"},
        customer:     {type: Customer}
    });

    Customer.mixin({
        roles:      {type: Array, of: Role, value: [], fetch: true}
    });
    
    Account.mixin({
        roles:      {type: Array, of: Role, value: [], fetch: true}
    });
  
Next you need a schema but this schema only defines the foreign key relationships
   
    var collections = {
        customer: {
            children: {
                roles: {template: Role, id:"customer_id"}
            }
        },
        account: {
            children: {
                roles: {id:"account_id"}
            }
        },
        role: {
            parents: {
                customer: {id: 'customer_id'},
                account: {id: 'account_id'}
            }
        },
    };

In the schema, the high level properties, customer, account and role are the names of the documents and must match the
names of the documents in the template definition which is always <document-name>:<template-name>

    var Role = PersistObjectTemplate.create("role:Role", {

Then open your database and set the schema

    return Q.ninvoke(MongoClient, "connect", "mongodb://localhost:27017/testpersist").then(function (db) {
        PersistObjectTemplate.setDB(db);
        PersistObjectTemplate.setSchema(collections);
        return Q(db);
    }).then ....;

Create some objects

    var sam = new Customer("Sam", "M", "Elsamman");
    var karen = new Customer("Karen", "", "Burke");
    var account = new Account(123, ['Sam Elsamman', 'Karen Burke'], sam);
    account.addCustomer(karen, "joint");

Persist the top level and any connected dirty objects will automatically persist as well, managing all foreign
keys needed to maintain the relationships.

    sam.persistSave().then(function() {
        // id inserted after saving
        return Q(sam._id);
    }).then ....

And retrieve stuff back by id, cascading down to fetch the roles as well.

    Customer.getFromPersistWithId(customer_id, {roles: true}).then (function (customer) {
        // Customer object complete with collection of role objects fetched and instantiated
    });
        
Or fetch with a query

    Customer.getFromPersistWithQuery({lastName: "Elsamman"}, {roles: true}).then (function (customer) {
        // Customer object complete with collection of role objects fetched and instantiated
    });

The account object connected to the fetched role is also automatically when a role is fetched because the template specified
{fetch: true}.  Had it not been specified you would manually fetch the related account object like this

    Customer.getFromPersistWithId(customer_id, {roles: true}).then (function (customer) {
        customer.role[0].fetch({account: true}).then(function() {
            // Now you can reference customer.role[0].account
        });
    });

## Debugging the container

    1. Remove local node_modules folder and delete package-lock file and run the following commnd to launch the container in debug mode.
        npm run test:docker:debug

        If you are using Visual Studio Code, you can use the following setting to attach to the debugging container.
            {
                "type": "node",
                "request": "attach",
                "name": "persistor_debug",
                "port": 5858,
                "localRoot": "${workspaceFolder}",
                "remoteRoot": "/app"
            }

## Debugging in the local environment.

        2. Make sure to install the mongodb and postgres locally and set the environment variables from the test.local.env file.
            If you are using Visual Studio Code, you can use the following setting to debug.
                 {
                    "type": "node",
                    "request": "launch",
                    "name": "Mocha Tests",
                    "program": "${workspaceFolder}/node_modules/mocha/bin/_mocha",
                    "args": [
                        "-u",
                        "tdd",
                        "--timeout",
                        "999999",
                        "--colors",
                        "${workspaceFolder}/test"
                    ],
                    "envFile": "${workspaceFolder}/test.local.env",
                    "internalConsoleOptions": "openOnSessionStart"
                }
        
## Important features:
### Version 10.0.0
With this version we are introducing a config `enableIsRemoteObjectFeature` as a required flag, to enable `isRemoteObject` property to take effect. This is to allow modules to set their `isRemoteObject` flag to true and client apps can safely upgrade to these modules without the requirement to also start using remoteStorage. When clients are ready to take advantage of `isRemoteObject` property, they can simply set the `enableIsRemoteObjectFeature` config to true in their respective config file(s). <br>
**CAUTION:** This is an all or nothing flag. Once `enableIsRemoteObjectFeature` is set to true: 
1. The `isRemoteObject` behavior defined on individual record properties will be enabled across your app (including the ones on your modules). 
2. All properties where `isRemoteObject` is set to `true`, would need to be migrated to a remoteStorage, as going forward their retreival and storage would happen from remoteStorage. 
3. If a client is already using isRemoteObject to send docs to remoteStorage, they must set `enableIsRemoteObjectFeature` this flag to true in their config. <br><br>

**Behavior:**
<br> Only the first scenario will result in storage to s3.
1. if `isRemoteObject` is `true` and `enableIsRemoteObjectFeature` is `true` -> persistor will store in remote s3 bucket.
2. if `isRemoteObject` is `false` and `enableIsRemoteObjectFeature` is `false` -> persistor will store in db.
3. if `isRemoteObject` is `false` and `enableIsRemoteObjectFeature` is `true` -> persistor will store in db.
4. if `isRemoteObject` is `true` and `enableIsRemoteObjectFeature` is `false` -> persistor will store in db.
5. if `isRemoteObject` is `undefined` or not set on record property and `enableIsRemoteObjectFeature` is `true` -> persistor will store in db.
6. if `isRemoteObject` is `undefined` or not set on record property and `enableIsRemoteObjectFeature` is `false` -> persistor will store in db.
7. if `isRemoteObject` is `false` and `enableIsRemoteObjectFeature` is `undefined` or not set on client -> persistor will store in db.
8. if `isRemoteObject` is `true` and `enableIsRemoteObjectFeature` is `undefined` or not set on client -> persistor will store in db.
9. if `isRemoteObject` is `undefined` or not set on record property and `enableIsRemoteObjectFeature` is `undefined` or not set on client -> persistor will store in db.

## License

Persistor is licensed under the MIT license
