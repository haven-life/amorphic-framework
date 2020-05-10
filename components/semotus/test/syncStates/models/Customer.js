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
var Customer = /** @class */ (function (_super) {
    __extends(Customer, _super);
    function Customer(first, middle, last) {
        var _this = _super.call(this) || this;
        _this.firstName = '';
        _this.middleName = '';
        _this.lastName = '';
        _this.roles = [];
        _this.type = 'primary';
        _this.secondaryReferrers = [];
        _this.addresses = [];
        _this.firstName = first;
        _this.lastName = last;
        _this.middleName = middle;
        return _this;
    }
    Customer_1 = Customer;
    Customer.prototype.equals = function (other) {
        var equalNames = this.firstName === other.firstName && this.middleName === other.middleName && this.lastName === other.lastName;
        var equalRoles = !(this.roles.map(function (role, index) {
            return role.equals(other.roles[index]);
        }).includes(false));
        var equalAddresses = !(this.addresses.map(function (address, index) {
            return address.equals(other.addresses[index]);
        }).includes(false));
        return equalNames && equalRoles && equalAddresses;
    };
    Customer.prototype.addAddress = function (lines, city, state, zip) {
        var address = new Address_1.Address(this);
        this.setupAddress(address, lines, city, state, zip);
    };
    Customer.prototype.setupAddress = function (address, lines, city, state, zip) {
        address.lines = lines;
        address.city = city;
        address.state = state;
        address.customer = this;
        this.addresses.push(address);
    };
    var Customer_1;
    __decorate([
        dist_1.property(),
        __metadata("design:type", String)
    ], Customer.prototype, "firstName", void 0);
    __decorate([
        dist_1.property(),
        __metadata("design:type", String)
    ], Customer.prototype, "middleName", void 0);
    __decorate([
        dist_1.property(),
        __metadata("design:type", String)
    ], Customer.prototype, "lastName", void 0);
    __decorate([
        dist_1.property({
            getType: function () {
                return Role_1.Role;
            }
        }),
        __metadata("design:type", Array)
    ], Customer.prototype, "roles", void 0);
    __decorate([
        dist_1.property(),
        __metadata("design:type", Customer)
    ], Customer.prototype, "referredBy", void 0);
    __decorate([
        dist_1.property(),
        __metadata("design:type", String)
    ], Customer.prototype, "type", void 0);
    __decorate([
        dist_1.property({ fetch: true, type: Customer_1 }),
        __metadata("design:type", Array)
    ], Customer.prototype, "referrers", void 0);
    __decorate([
        dist_1.property({ fetch: true, type: Customer_1 }),
        __metadata("design:type", Array)
    ], Customer.prototype, "secondaryReferrers", void 0);
    __decorate([
        dist_1.property({ type: Address_1.Address, fetch: true }),
        __metadata("design:type", Array)
    ], Customer.prototype, "addresses", void 0);
    Customer = Customer_1 = __decorate([
        dist_1.supertypeClass,
        __metadata("design:paramtypes", [Object, Object, Object])
    ], Customer);
    return Customer;
}(dist_1.Supertype));
exports.Customer = Customer;
var CustomerA = /** @class */ (function (_super) {
    __extends(CustomerA, _super);
    function CustomerA() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    CustomerA.prototype.addAddress = function (lines, city, state, zip) {
        var address = new Address_1.AddressA(this);
        this.setupAddress(address, lines, city, state, zip);
    };
    CustomerA = __decorate([
        dist_1.supertypeClass({ toClient: ['A', 'Both'] })
    ], CustomerA);
    return CustomerA;
}(Customer));
exports.CustomerA = CustomerA;
var CustomerB = /** @class */ (function (_super) {
    __extends(CustomerB, _super);
    function CustomerB() {
        var _this = _super !== null && _super.apply(this, arguments) || this;
        _this.counter = 0;
        return _this;
    }
    CustomerB.prototype.addAddress = function (lines, city, state, zip) {
        var address;
        if (this.counter < 2) {
            address = new Address_1.AddressBFirstStage(this);
            this.counter++;
        }
        else {
            address = new Address_1.AddressBSecondStage(this);
        }
        this.setupAddress(address, lines, city, state, zip);
    };
    CustomerB = __decorate([
        dist_1.supertypeClass({ toClient: ['B', 'Both'] })
    ], CustomerB);
    return CustomerB;
}(Customer));
exports.CustomerB = CustomerB;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiQ3VzdG9tZXIuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJDdXN0b21lci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFBQSxzQ0FBa0U7QUFDbEUsK0JBQTRCO0FBQzVCLHFDQUFxRjtBQUdyRjtJQUE4Qiw0QkFBUztJQXlCbkMsa0JBQVksS0FBSyxFQUFFLE1BQU0sRUFBRSxJQUFJO1FBQS9CLFlBQ0ksaUJBQU8sU0FJVjtRQTNCRCxlQUFTLEdBQVcsRUFBRSxDQUFDO1FBRXZCLGdCQUFVLEdBQVcsRUFBRSxDQUFDO1FBRXhCLGNBQVEsR0FBVyxFQUFFLENBQUM7UUFNdEIsV0FBSyxHQUFnQixFQUFFLENBQUM7UUFJeEIsVUFBSSxHQUFXLFNBQVMsQ0FBQztRQUl6Qix3QkFBa0IsR0FBb0IsRUFBRSxDQUFDO1FBRXpDLGVBQVMsR0FBbUIsRUFBRSxDQUFDO1FBSTNCLEtBQUksQ0FBQyxTQUFTLEdBQUcsS0FBSyxDQUFDO1FBQ3ZCLEtBQUksQ0FBQyxRQUFRLEdBQUcsSUFBSSxDQUFDO1FBQ3JCLEtBQUksQ0FBQyxVQUFVLEdBQUcsTUFBTSxDQUFDOztJQUM3QixDQUFDO2lCQTlCUSxRQUFRO0lBZ0NqQix5QkFBTSxHQUFOLFVBQU8sS0FBZTtRQUNsQixJQUFNLFVBQVUsR0FBRyxJQUFJLENBQUMsU0FBUyxLQUFLLEtBQUssQ0FBQyxTQUFTLElBQUksSUFBSSxDQUFDLFVBQVUsS0FBSyxLQUFLLENBQUMsVUFBVSxJQUFJLElBQUksQ0FBQyxRQUFRLEtBQUssS0FBSyxDQUFDLFFBQVEsQ0FBQztRQUNsSSxJQUFNLFVBQVUsR0FBRyxDQUFDLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsVUFBQyxJQUFJLEVBQUUsS0FBSztZQUM1QyxPQUFPLElBQUksQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFBO1FBQzFDLENBQUMsQ0FBQyxDQUFD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Q0FBQzs7SUFZeEIsQ0FBQztJQVZHLDhCQUFVLEdBQVYsVUFBVyxLQUFLLEVBQUUsSUFBSSxFQUFFLEtBQUssRUFBRSxHQUFHO1FBQzlCLElBQUksT0FBTyxDQUFDO1FBQ1osSUFBSSxJQUFJLENBQUMsT0FBTyxHQUFHLENBQUMsRUFBRTtZQUNsQixPQUFPLEdBQUcsSUFBSSw0QkFBa0IsQ0FBQyxJQUFJLENBQUMsQ0FBQztZQUN2QyxJQUFJLENBQUMsT0FBTyxFQUFFLENBQUM7U0FDbEI7YUFBTTtZQUNILE9BQU8sR0FBRyxJQUFJLDZCQUFtQixDQUFDLElBQUksQ0FBQyxDQUFDO1NBQzNDO1FBQ0QsSUFBSSxDQUFDLFlBQVksQ0FBQyxPQUFPLEVBQUUsS0FBSyxFQUFFLElBQUksRUFBRSxLQUFLLEVBQUUsR0FBRyxDQUFDLENBQUM7SUFDeEQsQ0FBQztJQWJRLFNBQVM7UUFEckIscUJBQWMsQ0FBQyxFQUFDLFFBQVEsRUFBRSxDQUFDLEdBQUcsRUFBRSxNQUFNLENBQUMsRUFBQyxDQUFDO09BQzdCLFNBQVMsQ0FjckI7SUFBRCxnQkFBQztDQUFBLEFBZEQsQ0FBK0IsUUFBUSxHQWN0QztBQWRZLDhCQUFTIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHtwcm9wZXJ0eSwgU3VwZXJ0eXBlLCBzdXBlcnR5cGVDbGFzc30gZnJvbSAnLi4vLi4vLi4vZGlzdCc7XG5pbXBvcnQge1JvbGV9IGZyb20gJy4vUm9sZSc7XG5pbXBvcnQge0FkZHJlc3MsIEFkZHJlc3NBLCBBZGRyZXNzQkZpcnN0U3RhZ2UsIEFkZHJlc3NCU2Vjb25kU3RhZ2V9IGZyb20gJy4vQWRkcmVzcyc7XG5cbkBzdXBlcnR5cGVDbGFzc1xuZXhwb3J0IGNsYXNzIEN1c3RvbWVyIGV4dGVuZHMgU3VwZXJ0eXBlIHtcblxuICAgIEBwcm9wZXJ0eSgpXG4gICAgZmlyc3ROYW1lOiBzdHJpbmcgPSAnJztcbiAgICBAcHJvcGVydHkoKVxuICAgIG1pZGRsZU5hbWU6IHN0cmluZyA9ICcnO1xuICAgIEBwcm9wZXJ0eSgpXG4gICAgbGFzdE5hbWU6IHN0cmluZyA9ICcnO1xuICAgIEBwcm9wZXJ0eSh7XG4gICAgICAgIGdldFR5cGU6ICgpID0+IHtcbiAgICAgICAgICAgIHJldHVybiBSb2xlXG4gICAgICAgIH1cbiAgICB9KVxuICAgIHJvbGVzOiBBcnJheTxSb2xlPiA9IFtdO1xuICAgIEBwcm9wZXJ0eSgpXG4gICAgcmVmZXJyZWRCeTogQ3VzdG9tZXI7XG4gICAgQHByb3BlcnR5KClcbiAgICB0eXBlOiBzdHJpbmcgPSAncHJpbWFyeSc7XG4gICAgQHByb3BlcnR5KHtmZXRjaDogdHJ1ZSwgdHlwZTogQ3VzdG9tZXJ9KVxuICAgIHJlZmVycmVyczogQXJyYXk8Q3VzdG9tZXI+O1xuICAgIEBwcm9wZXJ0eSh7ZmV0Y2g6IHRydWUsIHR5cGU6IEN1c3RvbWVyfSlcbiAgICBzZWNvbmRhcnlSZWZlcnJlcnM6IEFycmF5PEN1c3RvbWVyPiA9IFtdO1xuICAgIEBwcm9wZXJ0eSh7dHlwZTogQWRkcmVzcywgZmV0Y2g6IHRydWV9KVxuICAgIGFkZHJlc3NlczogQXJyYXk8QWRkcmVzcz4gPSBbXTtcblxuICAgIGNvbnN0cnVjdG9yKGZpcnN0LCBtaWRkbGUsIGxhc3QpIHtcbiAgICAgICAgc3VwZXIoKTtcbiAgICAgICAgdGhpcy5maXJzdE5hbWUgPSBmaXJzdDtcbiAgICAgICAgdGhpcy5sYXN0TmFtZSA9IGxhc3Q7XG4gICAgICAgIHRoaXMubWlkZGxlTmFtZSA9IG1pZGRsZTtcbiAgICB9XG5cbiAgICBlcXVhbHMob3RoZXI6IEN1c3RvbWVyKSB7XG4gICAgICAgIGNvbnN0IGVxdWFsTmFtZXMgPSB0aGlzLmZpcnN0TmFtZSA9PT0gb3RoZXIuZmlyc3ROYW1lICYmIHRoaXMubWlkZGxlTmFtZSA9PT0gb3RoZXIubWlkZGxlTmFtZSAmJiB0aGlzLmxhc3ROYW1lID09PSBvdGhlci5sYXN0TmFtZTtcbiAgICAgICAgY29uc3QgZXF1YWxSb2xlcyA9ICEodGhpcy5yb2xlcy5tYXAoKHJvbGUsIGluZGV4KSA9PiB7XG4gICAgICAgICAgICByZXR1cm4gcm9sZS5lcXVhbHMob3RoZXIucm9sZXNbaW5kZXhdKVxuICAgICAgICB9KS5pbmNsdWRlcyhmYWxzZSkpO1xuICAgICAgICBjb25zdCBlcXVhbEFkZHJlc3NlcyA9ICEodGhpcy5hZGRyZXNzZXMubWFwKChhZGRyZXNzLCBpbmRleCkgPT4ge1xuICAgICAgICAgICAgcmV0dXJuIGFkZHJlc3MuZXF1YWxzKG90aGVyLmFkZHJlc3Nlc1tpbmRleF0pXG4gICAgICAgIH0pLmluY2x1ZGVzKGZhbHNlKSk7XG5cbiAgICAgICAgcmV0dXJuIGVxdWFsTmFtZXMgJiYgZXF1YWxSb2xlcyAmJiBlcXVhbEFkZHJlc3NlcztcbiAgICB9XG5cbiAgICBhZGRBZGRyZXNzKGxpbmVzLCBjaXR5LCBzdGF0ZSwgemlwKSB7XG4gICAgICAgIGNvbnN0IGFkZHJlc3MgPSBuZXcgQWRkcmVzcyh0aGlzKTtcbiAgICAgICAgdGhpcy5zZXR1cEFkZHJlc3MoYWRkcmVzcywgbGluZXMsIGNpdHksIHN0YXRlLCB6aXApO1xuICAgIH1cblxuICAgIHNldHVwQWRkcmVzcyhhZGRyZXNzLCBsaW5lcywgY2l0eSwgc3RhdGUsIHppcCkge1xuICAgICAgICBhZGRyZXNzLmxpbmVzID0gbGluZXM7XG4gICAgICAgIGFkZHJlc3MuY2l0eSA9IGNpdHk7XG4gICAgICAgIGFkZHJlc3Muc3RhdGUgPSBzdGF0ZTtcbiAgICAgICAgYWRkcmVzcy5jdXN0b21lciA9IHRoaXM7XG4gICAgICAgIHRoaXMuYWRkcmVzc2VzLnB1c2goYWRkcmVzcyk7XG4gICAgfVxufVxuXG5Ac3VwZXJ0eXBlQ2xhc3Moe3RvQ2xpZW50OiBbJ0EnLCAnQm90aCddfSlcbmV4cG9ydCBjbGFzcyBDdXN0b21lckEgZXh0ZW5kcyBDdXN0b21lciB7XG4gICAgYWRkQWRkcmVzcyhsaW5lcywgY2l0eSwgc3RhdGUsIHppcCkge1xuICAgICAgICBjb25zdCBhZGRyZXNzID0gbmV3IEFkZHJlc3NBKHRoaXMpO1xuICAgICAgICB0aGlzLnNldHVwQWRkcmVzcyhhZGRyZXNzLCBsaW5lcywgY2l0eSwgc3RhdGUsIHppcCk7XG4gICAgfVxufVxuXG5Ac3VwZXJ0eXBlQ2xhc3Moe3RvQ2xpZW50OiBbJ0InLCAnQm90aCddfSlcbmV4cG9ydCBjbGFzcyBDdXN0b21lckIgZXh0ZW5kcyBDdXN0b21lciB7XG5cbiAgICBjb3VudGVyOiBudW1iZXIgPSAwO1xuXG4gICAgYWRkQWRkcmVzcyhsaW5lcywgY2l0eSwgc3RhdGUsIHppcCkge1xuICAgICAgICBsZXQgYWRkcmVzcztcbiAgICAgICAgaWYgKHRoaXMuY291bnRlciA8IDIpIHtcbiAgICAgICAgICAgIGFkZHJlc3MgPSBuZXcgQWRkcmVzc0JGaXJzdFN0YWdlKHRoaXMpO1xuICAgICAgICAgICAgdGhpcy5jb3VudGVyKys7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBhZGRyZXNzID0gbmV3IEFkZHJlc3NCU2Vjb25kU3RhZ2UodGhpcyk7XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy5zZXR1cEFkZHJlc3MoYWRkcmVzcywgbGluZXMsIGNpdHksIHN0YXRlLCB6aXApO1xuICAgIH1cbn0iXX0=