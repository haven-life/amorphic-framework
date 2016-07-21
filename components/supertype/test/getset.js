var expect = require('chai').expect;
var ObjectTemplate = require('../index.js');

/* Teacher Student Example */

var Please = ObjectTemplate.create("Please",
  {
    prop_please: {type: String, value: 'init'},
    prop_prettyPlease: {type: String, value: 'init'},
    please: {type: String, value: 'init', get: function(v) {return v.match(/please/) ? v : v + ' please'}},
    prettyPlease: {type: String, value: 'init',
      get: function(v) {return v.match(/please/) ? v : v + ' please'},
      set: function(v) {return v.match(/pretty/) ? v : v + ' pretty'}
    }
  });

var ExtendedPlease = Please.extend("ExtendedPlease",
  {
    prop_please: {type: String, value: 'init', get: function(v) {return v.match(/please/) ? v : v + ' please'}},
    prop_prettyPlease: {type: String, value: 'init',
      get: function(v) {return v.match(/please/) ? v : v + ' please'},
      set: function(v) {return v.match(/pretty/) ? v : v + ' pretty'}
    }
  });

describe("Getters and setters", function () {


  it ("work in base classes", function (done) {
    var t1 = new Please();
    expect(t1.please).to.equal("init please");
    expect(t1.prettyPlease).to.equal("init pretty please");
    done();
  });

  it ("work in extended classes", function (done) {
    var t1 = new ExtendedPlease();
    expect(t1.please).to.equal("init please");
    expect(t1.prettyPlease).to.equal("init pretty please");
    expect(t1.prop_please).to.equal("init please");
    expect(t1.prop_prettyPlease).to.equal("init pretty please");
    done();
  });

});







