# Sync States

## Intro
Sync states are a powerful new semotus feature. 

In an application using the amorphic and semotus paradigm with a single stateful session, on a remote sync, every object that is changed on the server will be synced back to the client and vice versa. The only method of achieving some sort of logical seperation is by setting toClient and toServer specific properties in the decorator of a template or class definition, with values for either `true`, `false`, or `<application_name>`. These values cannot be set or modified at run time in the application.

There may be a need in your application where the client or consumer has no need / it is unnecessary to marshal and send all changes on server side objects after a certain point. An example may be an online ticketing portal for a concert or a venue. 

This hypothetical example can be broken down into a few states:

    1. The user selects tickets to a concert that they would like to attend (ticket-selection)
    2. The user selects their seat information (seat-selection)
    3. The user provides their email address and billing information (CC, etc.) and submits (order-placement)
    4. The user is brought to a confirmation page with the relevant order number and venue information and dates (confirmation)
    
Let's say that step 4 in this example is the end state of an order, and the customer (given a link sent to their email) will be able to revisit that page at any point in the future for reference. In a conventional amorphic application with a single stateful session, unless we set the toClient property in the `supertypeClass` decorator on the `PaymentInformation` class to `false`, once we've authenticated the customer, the server may try to sync over the `PaymentInformation` object and details. At this stage of the order [`confirmation`], the client has no need for the `PaymentInformation` details anymore as they *have already placed and processed their order*. In other words, `PaymentInformation` is superfluous.

SyncStates enable us to avoid this issue by allowing us to leverage logical states of our application and filtering out objects dynamically based on the current state that we are in.

## What is a sync state?
Sync States are states that you can set within your application to determine objects you want to sync at runtime.

Every semotus / supertype class has an @supertypeClass decorator, and now you can pass in logical business states like so: `@supertypeClass({syncStates: ['confirmation']})`. In this example, the class would have 'confirmation' defined as the only state to trigger on syncState beginning logic.

On your amorphic / semotus controller, you would set the corresponding `syncState` property, which is of type: `{ scope: '*' | '-' | '+', state: undefined | string }`. The `state` here can be any named logical business state, and this is to correspond to the live business state that your application is in.

The `scope` values indicate which mode we are filtering sync states by:
1. '*' indicates we want to synchronize objects of all classes regardless of the `state` associated with them or the `state` of the application. In other words, this is a catch all for default semotus syncing behavior
2. '+' indicates that we want to synchronize objects of any classes that have no `state` associated with their definitions (classes that are agnostic of state) *and* objects whose classes' `state` matches the `state` that our application is in.
3. '-' indicates that we want to synchronize only objects of classes in a specific `state` that matches that of this application at the current time, and discard changes from classes associated with any other `state`. If no `state` is set for this application, then we will sync all objects of default classes (e.g. those with no `state` set) and discard the other objects changes


Some light examples:
controller.syncState = {scope: '+', state: 'confirmation'} // This will sync objects of any classes that either contain the string 'confirmation' or do not have any values in the `syncStates` parameter in the supertypeDecorator
controller.syncState = {scope: '*', state: 'confirmation'} // This will sync objects of any classes regardless of the state set (here being confirmation)
controller.syncState = {scope: '-', state: 'confirmation'} // This will sync only objects of any classes that contain the string 'confirmation' in their `syncStates` parameter and nothing else. 


## Example
For example, we may choose to model our classes in objects like the following

*Controller*
```
   import {property, remote, Supertype, supertypeClass} from '@haventech/amorphic';
   import {Customer} from './Customer';
   
   let delay = require('../../../dist/helpers/Utilities.js').delay;
   
   @supertypeClass
   export class Controller extends Supertype {

   	@property()
   	currentCustomer: Customer; // Customer 
   	syncState: ControllerSyncState; // { scope: '*' | '-' | '+', state: undefined | string }

   	allChanges: any;
   
   	constructor() {
   		super();
   	}

   }
```

*Customer*
```
   import {property, remote, Supertype, supertypeClass} from '@haventech/amorphic';
   import {PaymentInformation} from './PaymentInformation';
   
   let delay = require('../../../dist/helpers/Utilities.js').delay;
   
   @supertypeClass
   export class Customer extends Supertype {

   	@property()
    name: string;

    @property()
    email: string;

    @property()
    paymentInformation: PaymentInformation
   
   	constructor() {
   		super();
   	}

   }
```

*Payment Information*
```
   import {property, remote, Supertype, supertypeClass} from '@haventech/amorphic';
   import {PaymentInformation} from './PaymentInformation';
   
   let delay = require('../../../dist/helpers/Utilities.js').delay;
   
   @supertypeClass
   export class Controller extends Supertype {

   	@property()
    creditCardNumber: number;

    @property()
    locked: boolean;
   
   	constructor() {
   		super();
   	}

   }
```

In this example, we could go about this a couple ways. The one I would choose would be to specifically tag the customer object as having the 'confirmation' stage. When the controller reaches the confirmation stage, we will call a remote function to set the controller's syncState to {scope: '-', state: 'confirmation' }. This will exclude any objects not specifically tagged as 'confirmation' for the stage. There are multiple ways to go about this, though.

**Controller (modified)**
```
   import {property, remote, Supertype, supertypeClass} from '@haventech/amorphic';
   import {Customer} from './Customer';
   
   let delay = require('../../../dist/helpers/Utilities.js').delay;
   
   @supertypeClass
   export class Controller extends Supertype {

   	@property()
   	currentCustomer: Customer; // Customer 
   	syncState: ControllerSyncState; // { scope: '*' | '-' | '+', state: undefined | string }

   	allChanges: any;
   
   	constructor() {
   		super();
   	}

   	@remote({on: 'server'})
   	async setState(role, scope, state?): Promise<any> {
   		this.syncState = { scope: '-', state: 'confirmation'}
   		this.currentCustomer.name = 'yo'; 
   	}

   }
``` 

*Customer (modified)*
```
   import {property, remote, Supertype, supertypeClass} from '@haventech/amorphic';
   import {PaymentInformation} from './PaymentInformation';
   
   let delay = require('../../../dist/helpers/Utilities.js').delay;
   
   @supertypeClass({syncStates: ['confirmation']})
   export class Customer extends Supertype {

   	@property()
    name: string;

    @property()
    email: string;

    @property()
    paymentInformation: PaymentInformation
   
   	constructor() {
   		super();
   	}

   }
```

With this modification, the original syncState (let's say {scope: '*', state: 'any'}) can be changed. Possibly by:
1. Updating it with a state which is read in from the database on `serverInit`, the amorphic lifecycle hook.
2. Updating it in a remote call directly like we have done above with `setState`
 
In any case once the controller's syncState is updated, all changes tracked past that point will be filtered according to the above rules. If on a serverInit (amorphic's session initialization function), we filter when we send back before initial load. If on a remote call, we filter before we send back the results of the remote call.
If you followed approach 1, then you would never have any payment information objects or their child objects on the client session (since it's a new session)
If you followed approach 2, then you would never bring any new changes to the existing payment information objects in your current amorphic session which may have been done on server side, to the client. (further changes to existing payment objects would not be sent to the client either).

Approach 1 is useful for when you want to check your order status post submission.
Approach 2 is useful for blocking further changes in the same session.

## Caveats and kinks:

Since this is a new feature there are a few caveats at the moment. These are bugs / feature improvements for the current implementation.

1. If a root object is not listed as being able to be synchronized at your current stage, it's children will not be synced accordingly as well, *even* if they are marked with the appropriate stage
2. There are some issues with switching between a stage that syncs a subset of objects (object set A) to a stage that syncs a superset of those objects (object set A Union object set B). If some of the superset objects (B objects) were changed on the server in the previous sync state and not already tracked, *those changes will not be synced back to the client, even though they should*. You must trigger a refresh or a reset on the client.
3. Changing the sync state on the controller is difficult to do safely. Whether changing in a remote function or reading the state from the database or some config driven value, it changes the foundation of an amorphic app, and worse, may be misused by a bad actor. If the serverside function to change the sync state fails (and it's not a remote function), then we have to manually roll back the sync state change, this can cause other issues. 
4. In order to get the right change tracking, sync states should always be set first in the application. 

For this reason, until the advanced and super cases are completed, we advise minimal usage of this feature. Stick to 1 or 2 states at most. Issues resulting from syncStates will be *extremely* hard to resolve so any changes involving them should be treated with the utmost care. It may also be prudent to only update syncStates on new sessions and not existing ones (e.g. on serverInit and not remote calls).