var towerServerRouter = 'undefined' == typeof window
  ? require('..')
  : require('tower-server-router'); // how to do this better?

var assert = require('assert');

describe(towerServerRouter, function() {
  it('should test', function() {
    assert.equal(1 + 1, 2);
  });
});
