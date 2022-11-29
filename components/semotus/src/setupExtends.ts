// These two mixins and extender functions are needed because in the browser we only include supertype and semotus
// and since classes use these in their extends hierarchy they must be defined.

const __extends =
    (this && (this as any).__extends) ||
    (function () {
        const extendStatics =
            Object.setPrototypeOf ||
            ({__proto__: []} instanceof Array &&
                function (d, b) {
                    d.__proto__ = b;
                }) ||
            function (d, b) {
                for (var p in b) {
                    if (b.hasOwnProperty(p)) {
                        d[p] = b[p];
                    }
                }
            };
        return function (d, b) {
            extendStatics(d, b);

            function __() {
                this.constructor = d;
            }

            d.prototype = b === null ? Object.create(b) : ((__.prototype = b.prototype), new __());
        };
    })();

export function Persistable(Base) {
    return (function (_super) {
        __extends(class_1, _super);

        function class_1() {
            return (_super !== null && _super.apply(this, arguments)) || this;
        }

        return class_1;
    })(Base)
}

export function Remoteable(Base) {
    return (function (_super) {
        __extends(class_1, _super);

        function class_1() {
            return (_super !== null && _super.apply(this, arguments)) || this;
        }

        return class_1;
    })(Base)
}

export function Bindable(Base) {
    return (function (_super) {
        __extends(class_1, _super);

        function class_1() {
            return (_super !== null && _super.apply(this, arguments)) || this;
        }

        return class_1;
    })(Base)
}


