var router = require('..')
  , route = require('tower-route')
  , Context = require('tower-context')
  , container = require('tower-container')
  , request = require('superagent')
  , assert = require('assert');

describe('router', function(){
  before(router.clear);

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

  it('should GET JSON', function(done){
    route('/', 'index')
      .action('request', function(context){
        context.called = true;
        context.render('adsf')
      })

    var context = new Context('/', container);

    router(context, function(){
      assert(context.called);
      done();
    });
  });
});
