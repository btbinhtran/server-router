
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

// http://stackoverflow.com/questions/1975416/trying-to-understand-the-vary-http-header
Context.prototype.render = function(){
  var req = this.req
    , res = this.res
    , next = req.next
    , formats = this.route.formats
    , format = req.accepts(this.route.accepts);

  res.set('Vary', 'Accept');

  if (format) {
    // res.set('Content-Type', normalizeType(key));
    formats[format](req, this, next);
  } else if (formats['*']) {
    formats['*'](this);
  } else {
    var err = new Error('Not Acceptable');
    err.status = 406;
    err.types = normalizeTypes(keys);
    next(err);
  }

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

Context.prototype.error = function(code, message){
  // XXX: maybe there is a default handler?
  this.res.send(code, message);
  this.emit(code, message);
}

Context.prototype.send = function(code, message){
  if (this.tcp) {
    //this.connection.write([this.event, this.path, string].join(','));
  } else {
    this.res.send.apply(this.res, arguments);
  }
}

// redirect
// cookie
// clearCookie
// location
// download
// sendfile
// jsonp
// links
// status

// maybe do this?
Context.prototype.__defineGetter__('ip', function(){
  return this.req.ip;
});
