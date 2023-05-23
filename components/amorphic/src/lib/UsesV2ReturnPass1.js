'use strict';

// TODO: Can we delete this?
// An object for creating request to extend classes to be done at then of V2 pass1
export default function UsesV2ReturnPass1(base, prop) {
    this.baseName = base;
    this.prop = prop;
}

UsesV2ReturnPass1.prototype.mixin = function mixin() {};
