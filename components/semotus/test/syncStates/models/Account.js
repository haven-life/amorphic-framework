"use strict";
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
var dist_1 = require("../../../dist");
var Role_1 = require("./Role");
var Address_1 = require("./Address");
var Transaction_1 = require("./Transaction");
var Account = /** @class */ (function (_super) {
    __extends(Account, _super);
    function Account(number, title, customer, address) {
        var _this = _super.call(this) || this;
        _this.transactions = [];
        _this.fromAccountTransactions = [];
        _this.roles = [];
        if (address) {
            _this.address = address;
            _this.address.account = _this;
        }
        _this.number = number;
        _this.title = title;
        if (customer)
            _this.addCustomer(customer);
        return _this;
    }
    ;
    Account.prototype.equals = function (other) {
        return this.number === other.number && this.title === other.title;
    };
    Account.prototype.addCustomer = function (customer, relationship) {
        var role = new Role_1.Role(customer, this, relationship);
        this.roles.push(role);
        customer.roles.push(role);
    };
    ;
    Account.prototype.debit = function (amount) {
        new Transaction_1.Debit(this, 'debit', amount);
    };
    ;
    Account.prototype.credit = function (amount) {
        new Transaction_1.Credit(this, 'credit', amount);
    };
    ;
    Account.prototype.transferFrom = function (amount, fromAccount) {
        new Transaction_1.Xfer(this, 'xfer', amount, fromAccount);
    };
    ;
    Account.prototype.transferTo = function (amount, toAccount) {
        new Transaction_1.Xfer(toAccount, 'xfer', amount, this);
    };
    ;
    Account.prototype.getBalance = function () {
        var balance = 0;
        var thisAccount = this;
        function processTransactions(transactions) {
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
    ;
    __decorate([
        dist_1.property({ type: Transaction_1.Transaction, fetch: true }),
        __metadata("design:type", Array)
    ], Account.prototype, "transactions", void 0);
    __decorate([
        dist_1.property({ type: Transaction_1.Transaction, fetch: true }),
        __metadata("design:type", Array)
    ], Account.prototype, "fromAccountTransactions", void 0);
    __decorate([
        dist_1.property(),
        __metadata("design:type", Number)
    ], Account.prototype, "number", void 0);
    __decorate([
        dist_1.property({ type: String }),
        __metadata("design:type", Array)
    ], Account.prototype, "title", void 0);
    __decorate([
        dist_1.property({
            getType: function () {
                return Role_1.Role;
            }
        }),
        __metadata("design:type", Array)
    ], Account.prototype, "roles", void 0);
    __decorate([
        dist_1.property({
            getType: function () {
                return Address_1.Address;
            }
        }),
        __metadata("design:type", Address_1.Address)
    ], Account.prototype, "address", void 0);
    Account = __decorate([
        dist_1.supertypeClass,
        __metadata("design:paramtypes", [Object, Object, Object, Object])
    ], Account);
    return Account;
}(dist_1.Supertype));
exports.Account = Account;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiQWNjb3VudC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIkFjY291bnQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQUEsc0NBQWtFO0FBQ2xFLCtCQUE0QjtBQUM1QixxQ0FBa0M7QUFDbEMsNkNBQStEO0FBRy9EO0lBQTZCLDJCQUFTO0lBdUJsQyxpQkFBWSxNQUFNLEVBQUUsS0FBSyxFQUFFLFFBQVEsRUFBRSxPQUFPO1FBQTVDLFlBQ0ksaUJBQU8sU0FTVjtRQTlCRCxrQkFBWSxHQUF1QixFQUFFLENBQUM7UUFFdEMsNkJBQXVCLEdBQXVCLEVBQUUsQ0FBQztRQVVqRCxXQUFLLEdBQWdCLEVBQUUsQ0FBQztRQVVwQixJQUFJLE9BQU8sRUFBRTtZQUNULEtBQUksQ0FBQyxPQUFPLEdBQUcsT0FBTyxDQUFDO1lBQ3ZCLEtBQUksQ0FBQyxPQUFPLENBQUMsT0FBTyxHQUFHLEtBQUksQ0FBQztTQUMvQjtRQUNELEtBQUksQ0FBQyxNQUFNLEdBQUcsTUFBTSxDQUFDO1FBQ3JCLEtBQUksQ0FBQyxLQUFLLEdBQUcsS0FBSyxDQUFDO1FBQ25CLElBQUksUUFBUTtZQUNSLEtBQUksQ0FBQyxXQUFXLENBQUMsUUFBUSxDQUFDLENBQUM7O0lBQ25DLENBQUM7SUFBQSxDQUFDO0lBRUYsd0JBQU0sR0FBTixVQUFPLEtBQWM7UUFDakIsT0FBTyxJQUFJLENBQUMsTUFBTSxLQUFLLEtBQUssQ0FBQyxNQUFNLElBQUksSUFBSSxDQUFDLEtBQUssS0FBSyxLQUFLLENBQUMsS0FBSyxDQUFDO0lBQ3RFLENBQUM7SUFFRCw2QkFBVyxHQUFYLFVBQVksUUFBUSxFQUFFLFlBQWE7UUFDL0IsSUFBSSxJQUFJLEdBQUcsSUFBSSxXQUFJLENBQUMsUUFBUSxFQUFFLElBQUksRUFBRSxZQUFZLENBQUMsQ0FBQztRQUNsRCxJQUFJLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUN0QixRQUFRLENB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dCI6WyJpbXBvcnQge3Byb3BlcnR5LCBTdXBlcnR5cGUsIHN1cGVydHlwZUNsYXNzfSBmcm9tICcuLi8uLi8uLi9kaXN0JztcbmltcG9ydCB7Um9sZX0gZnJvbSAnLi9Sb2xlJztcbmltcG9ydCB7QWRkcmVzc30gZnJvbSAnLi9BZGRyZXNzJztcbmltcG9ydCB7Q3JlZGl0LCBEZWJpdCwgVHJhbnNhY3Rpb24sIFhmZXJ9IGZyb20gJy4vVHJhbnNhY3Rpb24nO1xuXG5Ac3VwZXJ0eXBlQ2xhc3NcbmV4cG9ydCBjbGFzcyBBY2NvdW50IGV4dGVuZHMgU3VwZXJ0eXBlIHtcblxuICAgIEBwcm9wZXJ0eSh7dHlwZTogVHJhbnNhY3Rpb24sIGZldGNoOiB0cnVlfSlcbiAgICB0cmFuc2FjdGlvbnM6IEFycmF5PFRyYW5zYWN0aW9uPiA9IFtdO1xuICAgIEBwcm9wZXJ0eSh7dHlwZTogVHJhbnNhY3Rpb24sIGZldGNoOiB0cnVlfSlcbiAgICBmcm9tQWNjb3VudFRyYW5zYWN0aW9uczogQXJyYXk8VHJhbnNhY3Rpb24+ID0gW107XG4gICAgQHByb3BlcnR5KClcbiAgICBudW1iZXI6IG51bWJlcjtcbiAgICBAcHJvcGVydHkoe3R5cGU6IFN0cmluZ30pXG4gICAgdGl0bGU6IEFycmF5PHN0cmluZz47XG4gICAgQHByb3BlcnR5KHtcbiAgICAgICAgZ2V0VHlwZTogKCkgPT4ge1xuICAgICAgICAgICAgcmV0dXJuIFJvbGVcbiAgICAgICAgfVxuICAgIH0pXG4gICAgcm9sZXM6IEFycmF5PFJvbGU+ID0gW107XG4gICAgQHByb3BlcnR5KHtcbiAgICAgICAgZ2V0VHlwZTogKCkgPT4ge1xuICAgICAgICAgICAgcmV0dXJuIEFkZHJlc3NcbiAgICAgICAgfVxuICAgIH0pXG4gICAgYWRkcmVzczogQWRkcmVzcztcblxuICAgIGNvbnN0cnVjdG9yKG51bWJlciwgdGl0bGUsIGN1c3RvbWVyLCBhZGRyZXNzKSB7XG4gICAgICAgIHN1cGVyKCk7XG4gICAgICAgIGlmIChhZGRyZXNzKSB7XG4gICAgICAgICAgICB0aGlzLmFkZHJlc3MgPSBhZGRyZXNzO1xuICAgICAgICAgICAgdGhpcy5hZGRyZXNzLmFjY291bnQgPSB0aGlzO1xuICAgICAgICB9XG4gICAgICAgIHRoaXMubnVtYmVyID0gbnVtYmVyO1xuICAgICAgICB0aGlzLnRpdGxlID0gdGl0bGU7XG4gICAgICAgIGlmIChjdXN0b21lcilcbiAgICAgICAgICAgIHRoaXMuYWRkQ3VzdG9tZXIoY3VzdG9tZXIpO1xuICAgIH07XG5cbiAgICBlcXVhbHMob3RoZXI6IEFjY291bnQpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMubnVtYmVyID09PSBvdGhlci5udW1iZXIgJiYgdGhpcy50aXRsZSA9PT0gb3RoZXIudGl0bGU7XG4gICAgfVxuXG4gICAgYWRkQ3VzdG9tZXIoY3VzdG9tZXIsIHJlbGF0aW9uc2hpcD8pIHtcbiAgICAgICAgdmFyIHJvbGUgPSBuZXcgUm9sZShjdXN0b21lciwgdGhpcywgcmVsYXRpb25zaGlwKTtcbiAgICAgICAgdGhpcy5yb2xlcy5wdXNoKHJvbGUpO1xuICAgICAgICBjdXN0b21lci5yb2xlcy5wdXNoKHJvbGUpO1xuICAgIH07XG5cbiAgICBkZWJpdChhbW91bnQpIHtcbiAgICAgICAgbmV3IERlYml0KHRoaXMsICdkZWJpdCcsIGFtb3VudCk7XG4gICAgfTtcblxuICAgIGNyZWRpdChhbW91bnQpIHtcbiAgICAgICAgbmV3IENyZWRpdCh0aGlzLCAnY3JlZGl0JywgYW1vdW50KTtcbiAgICB9O1xuXG4gICAgdHJhbnNmZXJGcm9tKGFtb3VudCwgZnJvbUFjY291bnQpIHtcbiAgICAgICAgbmV3IFhmZXIodGhpcywgJ3hmZXInLCBhbW91bnQsIGZyb21BY2NvdW50KVxuICAgIH07XG5cbiAgICB0cmFuc2ZlclRvKGFtb3VudCwgdG9BY2NvdW50KSB7XG4gICAgICAgIG5ldyBYZmVyKHRvQWNjb3VudCwgJ3hmZXInLCBhbW91bnQsIHRoaXMpO1xuICAgIH07XG5cbiAgICBnZXRCYWxhbmNlKCkge1xuICAgICAgICB2YXIgYmFsYW5jZSA9IDA7XG4gICAgICAgIHZhciB0aGlzQWNjb3VudCA9IHRoaXM7XG5cbiAgICAgICAgZnVuY3Rpb24gcHJvY2Vzc1RyYW5zYWN0aW9ucyh0cmFuc2FjdGlvbnMpIHtcbiAgICAgICAgICAgIGZvciAodmFyIGl4ID0gMDsgaXggPCB0cmFuc2FjdGlvbnMubGVuZ3RoOyArK2l4KSB7XG4gICAgICAgICAgICAgICAgc3dpdGNoICh0cmFuc2FjdGlvbnNbaXhdLnR5cGUpIHtcbiAgICAgICAgICAgICAgICAgICAgY2FzZSAnZGViaXQnOlxuICAgICAgICAgICAgICAgICAgICAgICAgYmFsYW5jZSAtPSB0cmFuc2FjdGlvbnNbaXhdLmFtb3VudDtcbiAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgICAgICBjYXNlICdjcmVkaXQnOlxuICAgICAgICAgICAgICAgICAgICAgICAgYmFsYW5jZSArPSB0cmFuc2FjdGlvbnNbaXhdLmFtb3VudDtcbiAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgICAgICBjYXNlICd4ZmVyJzpcbiAgICAgICAgICAgICAgICAgICAgICAgIGJhbGFuY2UgKz0gdHJhbnNhY3Rpb25zW2l4XS5hbW91bnQgKiAodHJhbnNhY3Rpb25zW2l4XS5mcm9tQWNjb3VudCA9PSB0aGlzQWNjb3VudCA/IC0xIDogMSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgcHJvY2Vzc1RyYW5zYWN0aW9ucyh0aGlzLnRyYW5zYWN0aW9ucyk7XG4gICAgICAgIHByb2Nlc3NUcmFuc2FjdGlvbnModGhpcy5mcm9tQWNjb3VudFRyYW5zYWN0aW9ucyk7XG4gICAgICAgIHJldHVybiBiYWxhbmNlO1xuICAgIH07XG59XG4iXX0=