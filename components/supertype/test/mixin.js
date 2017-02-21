var expect = require('chai').expect;
var ObjectTemplate = require('../index.js');

describe('Composing Templates', function () {
    it ('has extended values', function () {

        var BaseTemplate = ObjectTemplate.create('TemplatePartialBase',
            {
                obj:        {type: Object, value: {type: 'Base'}},
                date:       {type: Date, value: new Date(100)},
            });

        BaseTemplate.mixin(
            {
                init: function () {
                    this.mixedIn();
                },
                mixedIn: function () {
                    this.obj = {type: 'Mix'};
                }
            });
        var ExtendedTemplate = BaseTemplate.extend("ExtendedTemplate", {});


        expect((new BaseTemplate()).obj.type).to.equal('Mix');
        expect((new BaseTemplate()).date.getTime()).to.equal(100);
        expect((new ExtendedTemplate()).obj.type).to.equal('Mix');
        expect((new ExtendedTemplate()).date.getTime()).to.equal(100);

    });
});
