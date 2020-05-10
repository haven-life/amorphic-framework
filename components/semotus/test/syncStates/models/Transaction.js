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
var Account_1 = require("./Account");
var Transaction = /** @class */ (function (_super) {
    __extends(Transaction, _super);
    function Transaction(account, type, amount) {
        var _this = _super.call(this) || this;
        _this.account = account;
        _this.type = type;
        _this.amount = amount;
        if (account)
            account.transactions.push(_this);
        return _this;
    }
    ;
    __decorate([
        dist_1.property(),
        __metadata("design:type", Number)
    ], Transaction.prototype, "amount", void 0);
    __decorate([
        dist_1.property(),
        __metadata("design:type", String)
    ], Transaction.prototype, "type", void 0);
    __decorate([
        dist_1.property({
            getType: function () {
                return Account_1.Account;
            }
        }),
        __metadata("design:type", Account_1.Account)
    ], Transaction.prototype, "account", void 0);
    Transaction = __decorate([
        dist_1.supertypeClass,
        __metadata("design:paramtypes", [Object, Object, Object])
    ], Transaction);
    return Transaction;
}(dist_1.Supertype));
exports.Transaction = Transaction;
var Debit = /** @class */ (function (_super) {
    __extends(Debit, _super);
    function Debit(account, type, amount) {
        return _super.call(this, account, type, amount) || this;
    }
    Debit = __decorate([
        dist_1.supertypeClass,
        __metadata("design:paramtypes", [Object, Object, Object])
    ], Debit);
    return Debit;
}(Transaction));
exports.Debit = Debit;
var Credit = /** @class */ (function (_super) {
    __extends(Credit, _super);
    function Credit(account, type, amount) {
        return _super.call(this, account, type, amount) || this;
    }
    Credit = __decorate([
        dist_1.supertypeClass,
        __metadata("design:paramtypes", [Object, Object, Object])
    ], Credit);
    return Credit;
}(Transaction));
exports.Credit = Credit;
var Xfer = /** @class */ (function (_super) {
    __extends(Xfer, _super);
    function Xfer(account, type, amount, fromAccount) {
        var _this = _super.call(this, account, type, amount) || this;
        _this.fromAccount = fromAccount;
        if (fromAccount)
            fromAccount.fromAccountTransactions.push(_this);
        return _this;
    }
    __decorate([
        dist_1.property({
            fetch: true, getType: function () {
                return Account_1.Account;
            }
        }),
        __metadata("design:type", Account_1.Account)
    ], Xfer.prototype, "fromAccount", void 0);
    Xfer = __decorate([
        dist_1.supertypeClass,
        __metadata("design:paramtypes", [Object, Object, Object, Object])
    ], Xfer);
    return Xfer;
}(Transaction));
exports.Xfer = Xfer;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiVHJhbnNhY3Rpb24uanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJUcmFuc2FjdGlvbi50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFBQSxzQ0FBa0U7QUFDbEUscUNBQWtDO0FBR2xDO0lBQWlDLCtCQUFTO0lBWXRDLHFCQUFZLE9BQU8sRUFBRSxJQUFJLEVBQUUsTUFBTTtRQUFqQyxZQUNJLGlCQUFPLFNBTVY7UUFMRyxLQUFJLENBQUMsT0FBTyxHQUFHLE9BQU8sQ0FBQztRQUN2QixLQUFJLENBQUMsSUFBSSxHQUFHLElBQUksQ0FBQztRQUNqQixLQUFJLENBQUMsTUFBTSxHQUFHLE1BQU0sQ0FBQztRQUNyQixJQUFJLE9BQU87WUFDUCxPQUFPLENBQUMsWUFBWSxDQUFDLElBQUksQ0FBQyxLQUFJLENBQUMsQ0FBQzs7SUFDeEMsQ0FBQztJQUFBLENBQUM7SUFqQkY7UUFEQyxlQUFRLEVBQUU7OytDQUNJO0lBRWY7UUFEQyxlQUFRLEVBQUU7OzZDQUNFO0lBTWI7UUFMQyxlQUFRLENBQUM7WUFDTixPQUFPLEVBQUU7Z0JBQ0wsT0FBTyxpQkFBTyxDQUFBO1lBQ2xCLENBQUM7U0FDSixDQUFDO2tDQUNPLGlCQUFPO2dEQUFDO0lBVlIsV0FBVztRQUR2QixxQkFBYzs7T0FDRixXQUFXLENBb0J2QjtJQUFELGtCQUFDO0NBQUEsQUFwQkQsQ0FBaUMsZ0JBQVMsR0FvQnpDO0FBcEJZLGtDQUFXO0FBdUJ4QjtJQUEyQix5QkFBVztJQUNsQyxlQUFZLE9BQU8sRUFBRSxJQUFJLEVBQUUsTUFBTTtlQUM3QixrQkFBTSxPQUFPLEVBQUUsSUFBSSxFQUFFLE1BQU0sQ0FBQztJQUNoQyxDQUFDO0lBSFEsS0FBSztRQURqQixxQkFBYzs7T0FDRixLQUFLLENBSWpCO0lBQUQsWUFBQztDQUFBLEFBSkQsQ0FBMkIsV0FBVyxHQUlyQztBQUpZLHNCQUFLO0FBT2xCO0lBQTRCLDBCQUFXO0lBQ25DLGdCQUFZLE9BQU8sRUFBRSxJQUFJLEVBQUUsTUFBTTtlQUM3QixrQkFBTSxPQUFPLEVBQUUsSUFBSSxFQUFFLE1BQU0sQ0FBQztJQUNoQyxDQUFDO0lBSFEsTUFBTTtRQURsQixxQkFBYzs7T0FDRixNQUFNLENBSWxCO0lBQUQsYUFBQztDQUFBLEFBSkQsQ0FBNEIsV0FBVyxHQUl0QztBQUpZLHdCQUFNO0FBT25CO0lBQTBCLHdCQUFXO0lBU2pDLGNBQVksT0FBTyxFQUFFLElBQUksRUFBRSxNQUFNLEVBQUUsV0FBVztRQUE5QyxZQUNJLGtCQUFNLE9BQU8sRUFBRSxJQUFJLEVBQUUsTUFBTSxDQUFDLFNBSS9CO1FBSEcsS0FBSSxDQUFDLFdBQVcsR0FBRyxXQUFXLENBQUM7UUFDL0IsSUFBSSxXQUFXO1lBQ1gsV0FBVyxDQUFDLHVCQUF1QixDQUFDLElBQUksQ0FBQyxLQUFJLENBQUMsQ0FBQzs7SUFDdkQsQ0FBQztJQVBEO1FBTEMsZUFBUSxDQUFDO1lBQ04sS0FBSyxFQUFFLElBQUksRUFBRSxPQUFPLEVBQUU7Z0JBQ2xCLE9BQU8saUJBQU8sQ0FBQTtZQUNsQixDQUFDO1NBQ0osQ0FBQztrQ0FDVyxpQkFBTzs2Q0FBQztJQVBaLElBQUk7UUFEaEIscUJBQWM7O09BQ0YsSUFBSSxDQWVoQjtJQUFELFdBQUM7Q0FBQSxBQWZELENBQTBCLFdBQVcsR0FlcEM7QUFmWSxvQkFBSSIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7cHJvcGVydHksIFN1cGVydHlwZSwgc3VwZXJ0eXBlQ2xhc3N9IGZyb20gJy4uLy4uLy4uL2Rpc3QnO1xuaW1wb3J0IHtBY2NvdW50fSBmcm9tICcuL0FjY291bnQnO1xuXG5Ac3VwZXJ0eXBlQ2xhc3NcbmV4cG9ydCBjbGFzcyBUcmFuc2FjdGlvbiBleHRlbmRzIFN1cGVydHlwZSB7XG4gICAgQHByb3BlcnR5KClcbiAgICBhbW91bnQ6IG51bWJlcjtcbiAgICBAcHJvcGVydHkoKVxuICAgIHR5cGU6IHN0cmluZztcbiAgICBAcHJvcGVydHkoe1xuICAgICAgICBnZXRUeXBlOiAoKSA9PiB7XG4gICAgICAgICAgICByZXR1cm4gQWNjb3VudFxuICAgICAgICB9XG4gICAgfSlcbiAgICBhY2NvdW50OiBBY2NvdW50O1xuXG4gICAgY29uc3RydWN0b3IoYWNjb3VudCwgdHlwZSwgYW1vdW50KSB7XG4gICAgICAgIHN1cGVyKClcbiAgICAgICAgdGhpcy5hY2NvdW50ID0gYWNjb3VudDtcbiAgICAgICAgdGhpcy50eXBlID0gdHlwZTtcbiAgICAgICAgdGhpcy5hbW91bnQgPSBhbW91bnQ7XG4gICAgICAgIGlmIChhY2NvdW50KVxuICAgICAgICAgICAgYWNjb3VudC50cmFuc2FjdGlvbnMucHVzaCh0aGlzKTtcbiAgICB9O1xufVxuXG5Ac3VwZXJ0eXBlQ2xhc3NcbmV4cG9ydCBjbGFzcyBEZWJpdCBleHRlbmRzIFRyYW5zYWN0aW9uIHtcbiAgICBjb25zdHJ1Y3RvcihhY2NvdW50LCB0eXBlLCBhbW91bnQpIHtcbiAgICAgICAgc3VwZXIoYWNjb3VudCwgdHlwZSwgYW1vdW50KTtcbiAgICB9XG59XG5cbkBzdXBlcnR5cGVDbGFzc1xuZXhwb3J0IGNsYXNzIENyZWRpdCBleHRlbmRzIFRyYW5zYWN0aW9uIHtcbiAgICBjb25zdHJ1Y3RvcihhY2NvdW50LCB0eXBlLCBhbW91bnQpIHtcbiAgICAgICAgc3VwZXIoYWNjb3VudCwgdHlwZSwgYW1vdW50KTtcbiAgICB9XG59XG5cbkBzdXBlcnR5cGVDbGFzc1xuZXhwb3J0IGNsYXNzIFhmZXIgZXh0ZW5kcyBUcmFuc2FjdGlvbiB7XG5cbiAgICBAcHJvcGVydHkoe1xuICAgICAgICBmZXRjaDogdHJ1ZSwgZ2V0VHlwZTogKCkgPT4ge1xuICAgICAgICAgICAgcmV0dXJuIEFjY291bnRcbiAgICAgICAgfVxuICAgIH0pXG4gICAgZnJvbUFjY291bnQ6IEFjY291bnQ7XG5cbiAgICBjb25zdHJ1Y3RvcihhY2NvdW50LCB0eXBlLCBhbW91bnQsIGZyb21BY2NvdW50KSB7XG4gICAgICAgIHN1cGVyKGFjY291bnQsIHR5cGUsIGFtb3VudCk7XG4gICAgICAgIHRoaXMuZnJvbUFjY291bnQgPSBmcm9tQWNjb3VudDtcbiAgICAgICAgaWYgKGZyb21BY2NvdW50KVxuICAgICAgICAgICAgZnJvbUFjY291bnQuZnJvbUFjY291bnRUcmFuc2FjdGlvbnMucHVzaCh0aGlzKTtcbiAgICB9XG59XG4iXX0=