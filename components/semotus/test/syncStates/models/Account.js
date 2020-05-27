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
var _ = require("underscore");
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
        return this.number === other.number && _.isEqual(this.title, other.title);
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiQWNjb3VudC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIkFjY291bnQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQUEsc0NBQWtFO0FBQ2xFLCtCQUE0QjtBQUM1QixxQ0FBa0M7QUFDbEMsNkNBQStEO0FBQy9ELDhCQUFnQztBQUdoQztJQUE2QiwyQkFBUztJQXVCbEMsaUJBQVksTUFBTSxFQUFFLEtBQUssRUFBRSxRQUFRLEVBQUUsT0FBTztRQUE1QyxZQUNJLGlCQUFPLFNBU1Y7UUE5QkQsa0JBQVksR0FBdUIsRUFBRSxDQUFDO1FBRXRDLDZCQUF1QixHQUF1QixFQUFFLENBQUM7UUFVakQsV0FBSyxHQUFnQixFQUFFLENBQUM7UUFVcEIsSUFBSSxPQUFPLEVBQUU7WUFDVCxLQUFJLENBQUMsT0FBTyxHQUFHLE9BQU8sQ0FBQztZQUN2QixLQUFJLENBQUMsT0FBTyxDQUFDLE9BQU8sR0FBRyxLQUFJLENBQUM7U0FDL0I7UUFDRCxLQUFJLENBQUMsTUFBTSxHQUFHLE1BQU0sQ0FBQztRQUNyQixLQUFJLENBQUMsS0FBSyxHQUFHLEtBQUssQ0FBQztRQUNuQixJQUFJLFFBQVE7WUFDUixLQUFJLENBQUMsV0FBVyxDQUFDLFFBQVEsQ0FBQyxDQUFDOztJQUNuQyxDQUFDO0lBQUEsQ0FBQztJQUVGLHdCQUFNLEdBQU4sVUFBTyxLQUFjO1FBQ2pCLE9BQU8sSUFBSSxDQUFDLE1BQU0sS0FBSyxLQUFLLENBQUMsTUFBTSxJQUFJLENBQUMsQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLEtBQUssRUFBRSxLQUFLLENBQUMsS0FBSyxDQUFDLENBQUM7SUFDOUUsQ0FBQztJQUVELDZCQUFXLEdBQVgsVUFBWSxRQUFRLEVBQUUsWUFBYTtRQUMvQixJQUFJLElBQUksR0FBRyxJQUFJLFdBQUksQ0FBQyxRQUFRLEVBQUUsSUFBSSxFQUFFLFlBQVksQ0FBQyxDQUFDO1FBQ2xELElBQUksQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDO1FBQ3RCLFFBQVEsQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDO0lBQzlCLENBQUM7SUFBQSxDQUFDO0lBRUYsdUJBQUssR0FBTCxVQUFNLE1BQU07UUFDUixJQUFJLG1CQUFLLENBQUMsSUFBSSxFQUFFLE9BQU8sRUFBRSxNQUFNLENBQUMsQ0FBQztJQUNyQyxDQUFDO0lBQUEsQ0FBQztJQUVGLHdCQUFNLEdBQU4sVUFBTyxNQUFNO1FBQ1QsSUFBSSxvQkFBTSxDQUFDLElBQUksRUFBRSxRQUFRLEVBQUUsTUFBTSxDQUFDLENBQUM7SUFDdkMsQ0FBQztJQUFBLENBQUM7SUFFRiw4QkFBWSxHQUFaLFVBQWEsTUFBTSxFQUFFLFdBQVc7UUFDNUIsSUFBSSxrQkFBSSxDQUFDLElBQUksRUFBRSxNQUFNLEVBQUUsTUFBTSxFQUFFLFdBQVcsQ0FBQyxDQUFBO0lBQy9DLENBQUM7SUFBQSxDQUFDO0lBRUYsNEJBQVUsR0FBVixVQUFXLE1BQU0sRUFBRSxTQUFTO1FBQ3hCLElBQUksa0JBQUksQ0FBQyxTQUFTLEVBQUUsTUFBTSxFQUFFLE1BQU0sRUFBRSxJQUFJLENBQUMsQ0FBQztJQUM5QyxDQUFDO0lBQUEsQ0FBQztJQUVGLDRCQUFVLEdBQVY7UUFDSSxJQUFJLE9BQU8sR0FBRyxDQUFDLENBQUM7UUFDaEIsSUFBSSxXQUFXLEdBQUcsSUFBSSxDQUFDO1FBRXZCLFNBQVMsbUJBQW1CLENBQUMsWUFBWTtZQUNyQyxLQUFLLElBQUksRUFBRSxHQUFHLENBQUMsRUFBRSxFQUFFLEdBQUcsWUFBWSxDQUFDLE1BQU0sRUFBRSxFQUFFLEVBQUUsRUFBRTtnQkFDN0MsUUFBUSxZQUFZLENBQUMsRUFBRSxDQUFDLENBQUMsSUFBSSxFQUFFO29CQUMzQixLQUFLLE9BQU87d0JBQ1IsT0FBTyxJQUFJLFlBQVksQ0FBQyxFQUFFLENBQUMsQ0FBQyxNQUFNLENBQUM7d0JBQ25DLE1BQU07b0JBQ1YsS0FBSyxRQUFRO3dCQUNULE9BQU8sSUFBSSxZQUFZLENBQUMsRUFBRSxDQUFDLENBQUMsTUFBTSxDQUFDO3dCQUNuQyxNQUFNO29CQUNWLEtBQUssTUFBTTt3QkFDUCxPQUFPLElBQUksWUFBWSxDQUFDLEVBQUUsQ0FBQyxDQUFDLE1BQU0sR0FBRyxDQUFDLFlBQVksQ0FBQyxFQUFFLENBQUMsQ0FBQyxXQUFXLElBQUksV0FBVyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7aUJBQ25HO2FBQ0o7UUFDTCxDQUFDO1FBRUQsbUJBQW1CLENBQUMsSUFBSSxDQUFDLFlBQVksQ0FBQyxDQUFDO1FBQ3ZDLG1CQUFtQixDQUFDLElBQUksQ0FBQyx1QkFBdUIsQ0FBQyxDQUFDO1FBQ2xELE9BQU8sT0FBTyxDQUFDO0lBQ25CLENBQUM7SUFBQSxDQUFDO0lBaEZGO1FBREMsZUFBUSxDQUFDLEVBQUMsSUFBSSxFQUFFLHlCQUFXLEVBQUUsS0FBSyxFQUFFLElBQUksRUFBQyxDQUFDO2tDQUM3QixLQUFLO2lEQUFtQjtJQUV0QztRQURDLGVBQVEsQ0FBQyxFQUFDLElBQUksRUFBRSx5QkFBVyxFQUFFLEtBQUssRUFBRSxJQUFJLEVBQUMsQ0FBQztrQ0FDbEIsS0FBSzs0REFBbUI7SUFFakQ7UUFEQyxlQUFRLEVBQUU7OzJDQUNJO0lBRWY7UUFEQyxlQUFRLENBQUMsRUFBQyxJQUFJLEVBQUUsTUFBTSxFQUFDLENBQUM7a0NBQ2xCLEtBQUs7MENBQVM7SUFNckI7UUFMQyxlQUFRLENBQUM7WUFDTixPQUFPLEVBQUU7Z0JBQ0wsT0FBTyxXQUFJLENBQUE7WUFDZixDQUFDO1NBQ0osQ0FBQztrQ0FDSyxLQUFLOzBDQUFZO0lBTXhCO1FBTEMsZUFBUSxDQUFDO1lBQ04sT0FBTyxFQUFFO2dCQUNMLE9BQU8saUJBQU8sQ0FBQTtZQUNsQixDQUFDO1NBQ0osQ0FBQztrQ0FDTyxpQkFBTzs0Q0FBQztJQXJCUixPQUFPO1FBRG5CLHFCQUFjOztPQUNGLE9BQU8sQ0FvRm5CO0lBQUQsY0FBQztDQUFBLEFBcEZELENBQTZCLGdCQUFTLEdBb0ZyQztBQXBGWSwwQkFBTyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7cHJvcGVydHksIFN1cGVydHlwZSwgc3VwZXJ0eXBlQ2xhc3N9IGZyb20gJy4uLy4uLy4uL2Rpc3QnO1xuaW1wb3J0IHtSb2xlfSBmcm9tICcuL1JvbGUnO1xuaW1wb3J0IHtBZGRyZXNzfSBmcm9tICcuL0FkZHJlc3MnO1xuaW1wb3J0IHtDcmVkaXQsIERlYml0LCBUcmFuc2FjdGlvbiwgWGZlcn0gZnJvbSAnLi9UcmFuc2FjdGlvbic7XG5pbXBvcnQgKiBhcyBfIGZyb20gJ3VuZGVyc2NvcmUnO1xuXG5Ac3VwZXJ0eXBlQ2xhc3NcbmV4cG9ydCBjbGFzcyBBY2NvdW50IGV4dGVuZHMgU3VwZXJ0eXBlIHtcblxuICAgIEBwcm9wZXJ0eSh7dHlwZTogVHJhbnNhY3Rpb24sIGZldGNoOiB0cnVlfSlcbiAgICB0cmFuc2FjdGlvbnM6IEFycmF5PFRyYW5zYWN0aW9uPiA9IFtdO1xuICAgIEBwcm9wZXJ0eSh7dHlwZTogVHJhbnNhY3Rpb24sIGZldGNoOiB0cnVlfSlcbiAgICBmcm9tQWNjb3VudFRyYW5zYWN0aW9uczogQXJyYXk8VHJhbnNhY3Rpb24+ID0gW107XG4gICAgQHByb3BlcnR5KClcbiAgICBudW1iZXI6IG51bWJlcjtcbiAgICBAcHJvcGVydHkoe3R5cGU6IFN0cmluZ30pXG4gICAgdGl0bGU6IEFycmF5PHN0cmluZz47XG4gICAgQHByb3BlcnR5KHtcbiAgICAgICAgZ2V0VHlwZTogKCkgPT4ge1xuICAgICAgICAgICAgcmV0dXJuIFJvbGVcbiAgICAgICAgfVxuICAgIH0pXG4gICAgcm9sZXM6IEFycmF5PFJvbGU+ID0gW107XG4gICAgQHByb3BlcnR5KHtcbiAgICAgICAgZ2V0VHlwZTogKCkgPT4ge1xuICAgICAgICAgICAgcmV0dXJuIEFkZHJlc3NcbiAgICAgICAgfVxuICAgIH0pXG4gICAgYWRkcmVzczogQWRkcmVzcztcblxuICAgIGNvbnN0cnVjdG9yKG51bWJlciwgdGl0bGUsIGN1c3RvbWVyLCBhZGRyZXNzKSB7XG4gICAgICAgIHN1cGVyKCk7XG4gICAgICAgIGlmIChhZGRyZXNzKSB7XG4gICAgICAgICAgICB0aGlzLmFkZHJlc3MgPSBhZGRyZXNzO1xuICAgICAgICAgICAgdGhpcy5hZGRyZXNzLmFjY291bnQgPSB0aGlzO1xuICAgICAgICB9XG4gICAgICAgIHRoaXMubnVtYmVyID0gbnVtYmVyO1xuICAgICAgICB0aGlzLnRpdGxlID0gdGl0bGU7XG4gICAgICAgIGlmIChjdXN0b21lcilcbiAgICAgICAgICAgIHRoaXMuYWRkQ3VzdG9tZXIoY3VzdG9tZXIpO1xuICAgIH07XG5cbiAgICBlcXVhbHMob3RoZXI6IEFjY291bnQpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMubnVtYmVyID09PSBvdGhlci5udW1iZXIgJiYgXy5pc0VxdWFsKHRoaXMudGl0bGUsIG90aGVyLnRpdGxlKTtcbiAgICB9XG5cbiAgICBhZGRDdXN0b21lcihjdXN0b21lciwgcmVsYXRpb25zaGlwPykge1xuICAgICAgICB2YXIgcm9sZSA9IG5ldyBSb2xlKGN1c3RvbWVyLCB0aGlzLCByZWxhdGlvbnNoaXApO1xuICAgICAgICB0aGlzLnJvbGVzLnB1c2gocm9sZSk7XG4gICAgICAgIGN1c3RvbWVyLnJvbGVzLnB1c2gocm9sZSk7XG4gICAgfTtcblxuICAgIGRlYml0KGFtb3VudCkge1xuICAgICAgICBuZXcgRGViaXQodGhpcywgJ2RlYml0JywgYW1vdW50KTtcbiAgICB9O1xuXG4gICAgY3JlZGl0KGFtb3VudCkge1xuICAgICAgICBuZXcgQ3JlZGl0KHRoaXMsICdjcmVkaXQnLCBhbW91bnQpO1xuICAgIH07XG5cbiAgICB0cmFuc2ZlckZyb20oYW1vdW50LCBmcm9tQWNjb3VudCkge1xuICAgICAgICBuZXcgWGZlcih0aGlzLCAneGZlcicsIGFtb3VudCwgZnJvbUFjY291bnQpXG4gICAgfTtcblxuICAgIHRyYW5zZmVyVG8oYW1vdW50LCB0b0FjY291bnQpIHtcbiAgICAgICAgbmV3IFhmZXIodG9BY2NvdW50LCAneGZlcicsIGFtb3VudCwgdGhpcyk7XG4gICAgfTtcblxuICAgIGdldEJhbGFuY2UoKSB7XG4gICAgICAgIHZhciBiYWxhbmNlID0gMDtcbiAgICAgICAgdmFyIHRoaXNBY2NvdW50ID0gdGhpcztcblxuICAgICAgICBmdW5jdGlvbiBwcm9jZXNzVHJhbnNhY3Rpb25zKHRyYW5zYWN0aW9ucykge1xuICAgICAgICAgICAgZm9yICh2YXIgaXggPSAwOyBpeCA8IHRyYW5zYWN0aW9ucy5sZW5ndGg7ICsraXgpIHtcbiAgICAgICAgICAgICAgICBzd2l0Y2ggKHRyYW5zYWN0aW9uc1tpeF0udHlwZSkge1xuICAgICAgICAgICAgICAgICAgICBjYXNlICdkZWJpdCc6XG4gICAgICAgICAgICAgICAgICAgICAgICBiYWxhbmNlIC09IHRyYW5zYWN0aW9uc1tpeF0uYW1vdW50O1xuICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgICAgIGNhc2UgJ2NyZWRpdCc6XG4gICAgICAgICAgICAgICAgICAgICAgICBiYWxhbmNlICs9IHRyYW5zYWN0aW9uc1tpeF0uYW1vdW50O1xuICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgICAgIGNhc2UgJ3hmZXInOlxuICAgICAgICAgICAgICAgICAgICAgICAgYmFsYW5jZSArPSB0cmFuc2FjdGlvbnNbaXhdLmFtb3VudCAqICh0cmFuc2FjdGlvbnNbaXhdLmZyb21BY2NvdW50ID09IHRoaXNBY2NvdW50ID8gLTEgOiAxKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICBwcm9jZXNzVHJhbnNhY3Rpb25zKHRoaXMudHJhbnNhY3Rpb25zKTtcbiAgICAgICAgcHJvY2Vzc1RyYW5zYWN0aW9ucyh0aGlzLmZyb21BY2NvdW50VHJhbnNhY3Rpb25zKTtcbiAgICAgICAgcmV0dXJuIGJhbGFuY2U7XG4gICAgfTtcbn1cbiJdfQ==