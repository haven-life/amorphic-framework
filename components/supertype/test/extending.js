var expect = require('chai').expect;
var Q = require("q");
var ObjectTemplate = require('../index.js');



describe("Extended Templates", function () {
	it ("has extended values", function () {
		var BaseTemplate1 = ObjectTemplate.create("BaseTemplate",
			{
				boolTrue:   {type: Boolean, value: true},
				boolFalse:  {type: Boolean, value: false},
				num:        {type: Number, value: 100},
				str:        {type: String, value: 'Base'},
				obj:        {type: Object, value: {type: 'Base'}},
				date:       {type: Date, value: new Date(100)}
			});

		var BaseTemplate3 = ObjectTemplate.create("BaseTemplate",
			{
				boolTrue:   {type: Boolean},
				boolFalse:  {type: Boolean},
				num:        {type: Number},
				str:        {type: String},
				obj:        {type: Object},
				date:       {type: Date},
				init: function () {
					BaseTemplate1.call(this);
					this.boolTrue = true;
					this.boolFalse = false;
					this.num = 100;
					this.str = 'Base';
					this.obj = {type: 'Base'};
					this.date = new Date(100);
				},
			});

		var ExtendedTemplate1 = BaseTemplate1.extend("ExtendedTemplate1",
			{
				boolTrue:   {type: Boolean, value: false},
				boolFalse:  {type: Boolean, value: true},
				num:        {type: Number, value: 200},
				str:        {type: String, value: 'Extended'},
				obj:        {type: Object, value: {type: 'Extended'}},
				date:       {type: Date, value: new Date(200)},
				init: function () {
					BaseTemplate1.call(this);
				},
			});

		var ExtendedTemplate2 = BaseTemplate1.extend("ExtendedTemplate2",
			{
				boolTrue:   {type: Boolean, value: false},
				boolFalse:  {type: Boolean, value: true},
				num:        {type: Number, value: 200},
				str:        {type: String, value: 'Extended'},
				obj:        {type: Object, value: {type: 'Extended'}},
				date:       {type: Date, value: new Date(200)},
				init: function () {
					BaseTemplate1.call(this);
					this.boolTrue = true;
					this.boolFalse = false;
					this.num = 100;
					this.str = 'Base';
					this.obj = {type: 'Base'};
					this.date = new Date(100);
				},
			});

		var ExtendedTemplate3 = BaseTemplate1.extend("ExtendedTemplate1",
			{
				boolTrue:   {type: Boolean, value: false},
				boolFalse:  {type: Boolean, value: true},
				num:        {type: Number, value: 200},
				str:        {type: String, value: 'Extended'},
				obj:        {type: Object, value: {type: 'Extended'}},
				date:       {type: Date, value: new Date(200)},
				init: function () {
					BaseTemplate1.call(this);
					this.boolTrue = false;
					this.boolFalse = true;
					this.num = 200;
					this.str = 'Extended';
					this.obj = {type: 'Extended'};
					this.date = new Date(200);
				},
			});

		expect((new ExtendedTemplate1()).boolTrue).to.equal(false);
		expect((new ExtendedTemplate1()).boolFalse).to.equal(true);
		expect((new ExtendedTemplate1()).num).to.equal(200);
		expect((new ExtendedTemplate1()).str).to.equal('Extended');
		expect((new ExtendedTemplate1()).obj.type).to.equal('Extended');
		expect((new ExtendedTemplate1()).date.getTime()).to.equal(200);

		expect((new ExtendedTemplate2()).boolTrue).to.equal(true);
		expect((new ExtendedTemplate2()).boolFalse).to.equal(false);
		expect((new ExtendedTemplate2()).num).to.equal(100);
		expect((new ExtendedTemplate2()).str).to.equal('Base');
		expect((new ExtendedTemplate2()).obj.type).to.equal('Base');
		expect((new ExtendedTemplate2()).date.getTime()).to.equal(100);

		expect((new ExtendedTemplate3()).boolTrue).to.equal(false);
		expect((new ExtendedTemplate3()).boolFalse).to.equal(true);
		expect((new ExtendedTemplate3()).num).to.equal(200);
		expect((new ExtendedTemplate3()).str).to.equal('Extended');
		expect((new ExtendedTemplate3()).obj.type).to.equal('Extended');
		expect((new ExtendedTemplate3()).date.getTime()).to.equal(200);
	});
});







