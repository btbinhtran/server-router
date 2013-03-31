var router = require('..')
  , route = require('tower-route')
  , Context = require('tower-context')
  , container = require('tower-container')
  , assert = require('assert');

describe('router', function(){
  it('should GET /', function(done){
    route('/', 'index')
      .use(function(context, next){
        context.called = true;
        next();
      })

    var context = new Context('/', container);

    router(context, function(){
      assert(context.called);
      done();
    });
  });
});
