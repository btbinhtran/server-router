
/**
 * Module dependencies.
 */

var route = require('tower-route')
  , Context = require('tower-context')
  , series = require('./async-series');

// https://github.com/MatthewMueller/aemitter
// https://github.com/visionmedia/batch
route.on('define', function(i){
  callbacks.push(function(context, next){
    i.handle(context, next);
  });
});

var callbacks = [];

module.exports = router;
module.exports.route = route;
module.exports.callbacks = callbacks;
module.exports.clear = function(){
  callbacks.length = 0;
  return router;
}

// XXX: this isn't the api, just hacking
function router(context, fn) {
  if ('string' == typeof context)
    context = new Context(context);

  series(callbacks, context, fn);
}

/**
 * Listen to port.
 */

router.start = function(port, fn){
  
}

/**
 * Stop listening to port.
 */

router.stop = function(fn){
  
}

Context.prototype.init = function(options){
  this.req = options.req;
  this.res = options.res;
}

Context.prototype.render = function(){
  this.res.render.apply(this.res, arguments);
  return this;
}