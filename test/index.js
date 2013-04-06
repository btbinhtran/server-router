var router = require('..')
  , route = require('tower-route')
  , Context = require('tower-context')
  , container = require('tower-container')
  , request = require('superagent')
  , agent = request.agent()
  , assert = require('assert');

var express = require('express')
  , app = express();

app.use(express.cookieParser());
app.use(express.session({ secret: 'secret' }));
app.use(router);

app.listen(4000);

// https://github.com/visionmedia/superagent/blob/master/test/node/agency.js
describe('router', function(){
  before(router.clear);

  it('should GET JSON', function(done){
    var calls = 0;

    route('/', 'index')
      .action('request', function(context){
        calls++;
      });

    agent
      .get('http://localhost:4000')
      .end(function(res){
        assert(1 === calls);
        done();
      })
  });
});
