import { property, remote, Supertype, supertypeClass } from '../../../dist/cjs';
import { CallContext, ChangeString, ControllerSyncState } from '../../../dist/cjs/helpers/Types';
import { Customer, CustomerA, CustomerB } from './Customer';
import { Account } from './Account';
import { Address, AddressBSecondStage } from './Address';

let delay = require('../../../dist/cjs/helpers/Utilities.js').delay;

@supertypeClass
export class Controller extends Supertype {
	@property()
	sam: CustomerA; // Customer A
	@property()
	karen: CustomerB; // Customer B
	@property()
	ashling: Customer;

	syncState: ControllerSyncState;
	remoteChanges: ChangeString;
	allChanges: any;

	constructor() {
		super();
	}

	mockServerInit() {
		// this.syncState = {scope: undefined, state: undefined};
		// Setup customers and addresses
		var sam = new CustomerA('Sam', 'M', 'Elsamman');
		var karen = new CustomerB('Karen', 'M', 'Burke');
		var ashling = new Customer('Ashling', '', 'Burke');

		// Setup referrers
		sam.referrers = [ashling, karen];
		ashling.referredBy = sam;
		karen.referredBy = sam;


		// Setup addresses
		sam.addAddress(['500 East 83d', 'Apt 1E'], 'New York', 'NY', '10028');
		sam.addAddress(['38 Haggerty Hill Rd', ''], 'Rhinebeck', 'NY', '12572');

		karen.addAddress(['500 East 83d', 'Apt 1E'], 'New York', 'NY', '10028'); // first stage
		karen.addAddress(['38 Haggerty Hill Rd'], 'Rhinebeck', 'NY', '12572'); // first stage
		karen.addAddress(['SomeRandom Address here'], 'Town', 'HI', '00000'); // Second Stage
		karen.addAddress(['Another random Address'], 'Second', 'Hola', '88888'); // Second Stage

		ashling.addAddress(['End of the Road', ''], 'Lexington', 'KY', '34421');

		// Setup accounts
		var samsAccount = new Account(1234, ['Sam Elsamman'], sam, sam.addresses[0]);
		var jointAccount = new Account(123, ['Sam Elsamman', 'Karen Burke', 'Ashling Burke'], sam, karen.addresses[0]);
		jointAccount.addCustomer(karen, 'joint');
		jointAccount.addCustomer(ashling, 'joint');

		samsAccount.credit(100); // Sam has 100
		samsAccount.debit(50); // Sam has 50
		jointAccount.credit(200); // Joint has 200
		jointAccount.transferTo(100, samsAccount); // Joint has 100, Sam has 150
		jointAccount.transferFrom(50, samsAccount); // Joint has 150, Sam has 100
		jointAccount.debit(25); // Joint has 125

		this.sam = sam;
		this.karen = karen;
		this.ashling = ashling;
	}

	@remote({on: 'server'})
	async setState(role, scope, state?): Promise<any> {
		this.setStateNoReset(role, scope, state);
		this.ashling = this.sam = this.karen = null;
	}

	@remote({on: 'server'})
	async setStateNoReset(role, scope, state?): Promise<any> {
		console.log(`Role is: ${role}`);
		console.log(`Setting syncState. Original value is ${JSON.stringify(this.syncState)}`);
		this.syncState = {scope, state};
		console.log('Controller sync state successfully set');
	}

	@remote({
		on: 'server'
	})
	async mainFunc(...args): Promise<any> {
		return;
	}

	@remote({
		on: 'server'
	})
	async alternateRemoteFunction(...args): Promise<any> {
		this.sam = new CustomerA('yo', 'its', 'me');
		this.sam.addAddress(['500 East 83d', 'Apt 1E'], 'New York', 'NY', '10028');

		this.karen.middleName = 'dont change';
		this.karen.addresses[3].type = 'something';
		this.karen.addresses[0].type = 'nothing';

		// This reassignment to the same property is the only way this object will be loaded into the session again
		this.karen.addresses.push(new AddressBSecondStage(['Test', 'Apt 1E'], 'New York', 'NY', '10028'));
		this.karen.roles = this.karen.roles;
		return;
	}

	async postServerCall(hasChanges: boolean, callContext: CallContext, changeString: ChangeString): Promise<any> {
		this.remoteChanges = changeString;
	}

	inspectMessage(messageCopy) {
		this.allChanges = messageCopy.changes;
	}

	giveSamASecondAccount() {
		var address = new Address(this.sam, ['Plantana']);
		var samsNewAccount = new Account(1234, ['Sam Elsamman'], this.sam, address);
		samsNewAccount.addCustomer(this.sam, 'sole');
	}

	@remote()
	async reset() {
		this.sam = null;
		this.karen = null;
		this.ashling = null;
	}
}