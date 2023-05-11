import { expect } from 'chai';
import ObjectTemplate from '../dist/esm/index.js';

var Base = ObjectTemplate.create("Base", {
    myVar: {type: String, value:  'Base'},
    init: function () {
        expect (this.myVar).to.equal('Child');
        this.setup();
    }
});

var Child = Base.extend("Child", {
    myVar: {type: String, value: 'Child'},
    myArray: {type: Array, value: []},
    setup: function () {
        expect(this.myArray.length).to.equal(0);
    }
});

it('child properties not accessible to parent during constructor', function() {
    var child = new Child();
});
