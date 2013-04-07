
/**
 * Module dependencies.
 */

var route = require('tower-route')
  , Context = require('tower-context')
  , routing = require('tower-routing')

/**
 * Expose `router`.
 */

var exports = module.exports = router;

/**
 * Expose `route`.
 */

exports.route = route;

/**
 * Routing middleware.
 */

function router(req, res, fn) {
  routing.dispatch(new Context({
      path: req.path
    , req: req
    , res: res
    , event: 'request'
  }), fn);
}

/**
 * Listen to port.
 */

exports.start = function(port, fn){

}

/**
 * Stop listening to port.
 */

exports.stop = function(fn){

}

/**
 * Clear all routes.
 */

exports.clear = routing.clear;

/**
 * Render a specific format.
 */

Context.prototype.render = function(){
  var req = this.req
    , res = this.res
    , next = req.next
    , formats = this.route.formats
    , format = req.accepts(this.route.accepts);

  // http://stackoverflow.com/questions/1975416/trying-to-understand-the-vary-http-header
  res.set('Vary', 'Accept');

  if (format) {
    // res.set('Content-Type', normalizeType(key));
    formats[format](req, this, next);
  } else if (formats['*']) {
    formats['*'](this);
  } else {
    var err = new Error('Not Acceptable');
    err.status = 406;
    // err.types = normalizeTypes(keys);
    next(err);
  }

  return this;
}

/**
 * Write to a connection or response.
 *
 * @param {String} string
 */

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
