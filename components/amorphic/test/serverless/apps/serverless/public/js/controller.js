module.exports.controller = function(objectTemplate, getTemplate) {
	objectTemplate.debugInfo = 'io;api';

	var Customer = getTemplate('model.js').Customer;
	var Account = getTemplate('model.js').Account;
	var Address = getTemplate('model.js').Address;
	var ReturnedMail = getTemplate('model.js').ReturnedMail;
	var Role = getTemplate('model.js').Role;
	var Transaction = getTemplate('model.js').Transaction;

	var Controller = objectTemplate.create('Controller', {
		mainFunc: {on: 'server', body: function () {
				return serverAssert();
			}},
		emptyFunc: {
			on: 'server',
			body: function () {
				console.log('executed emptyFUNc');
				return true;
			}},
		conflictData: { type: String, value: 'initial' },
		someData: { type: String, value: 'A' },
		sam: { type: Customer, fetch: true },
		karen: { type: Customer, fetch: true },
		ashling: { type: Customer, fetch: true },
		updatedCount: { type: Number, value: 0 },
		serverInit: function() {
			if (!objectTemplate.objectMap) {
				throw new Error('Missing keepOriginalIdForSavedObjects in config.json');
			}
			serverController = this;

			var sam = new Customer('Sam', 'M', 'Elsamman');
			var karen = new Customer('Karen', 'M', 'Burke');
			var ashling = new Customer('Ashling', '', 'Burke');

			// Setup referrers
			sam.referrers = [ashling, karen];
			ashling.referredBy = sam;
			karen.referredBy = sam;
			sam.local1 = 'foo';
			sam.local2 = 'bar';

			// Setup addresses
			sam.addAddress(['500 East 83d', 'Apt 1E'], 'New York', 'NY', '10028');
			sam.addAddress(['38 Haggerty Hill Rd', ''], 'Rhinebeck', 'NY', '12572');

			sam.addresses[0].addReturnedMail(new Date());
			sam.addresses[0].addReturnedMail(new Date());
			sam.addresses[1].addReturnedMail(new Date());

			karen.addAddress(['500 East 83d', 'Apt 1E'], 'New York', 'NY', '10028');
			karen.addAddress(['38 Haggerty Hill Rd', ''], 'Rhinebeck', 'NY', '12572');

			karen.addresses[0].addReturnedMail(new Date());

			ashling.addAddress(['End of the Road', ''], 'Lexington', 'KY', '34421');

			// Setup accounts
			var samsAccount = new Account(1234, ['Sam Elsamman'], sam, sam.addresses[0]);
			var jointAccount = new Account(123, ['Sam Elsamman'], sam, karen.addresses[0]);
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
		},
		clearDB: {on: 'server', body: function () {
				var total = 0;
				return clearCollection(Role)
					.then(function(count) {
						total += count;
						return clearCollection(Account);
					}).then(function (count) {
						total += count;
						return clearCollection(Customer);
					}).then(function (count) {
						total += count;
						return clearCollection(Transaction);
					}).then(function (count) {
						total += count;
						return clearCollection(ReturnedMail);
					}).then(function (count) {
						total += count;
						return clearCollection(Address);
					}).then(function (count) {
						total += count;
						serverAssert(total);
					});
				function clearCollection(template) {
					return objectTemplate.dropKnexTable(template)
						.then(function () {
							return objectTemplate.synchronizeKnexTableFromTemplate(template).then(function() {
								return 0;
							});
						});
				}
			}}
	});

	return { Controller: Controller };

};
