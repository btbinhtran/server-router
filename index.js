
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
  route.routes.length = 0;
  return router;
}

// XXX: this isn't the api, just hacking
function router(req, res, fn) {
  router.dispatch(new Context({
      path: req.path
    , req: req
    , res: res
    , event: 'request'
  }), fn);
}

router.dispatch = function(context, fn) {
  series(callbacks, context, function(err){
    if (err) fn(err);
  });
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

Context.prototype.write = function(string){
  if (this.tcp) {
    this.connection.write([this.event, this.path, string].join(','));
  } else {
    this.res.write(string);
  }
}

/**
 * Example
 *
 *    context.error(404);
 *    context.emit(404);
 */

Contxt.prototype.error = function(code, message){
  // XXX: maybe there is a default handler?
  this.res.send(code, message);
  this.emit(code, message);
}