
/**
 * Module dependencies.
 */

var route = require('tower-route');
var series = require('part-async-series');

/**
 * Expose `router`.
 */

var exports = module.exports = router;

/**
 * Expose `route`.
 */

exports.route = route;

/**
 * Expose `Context`.
 */

exports.Context = Context;

/**
 * Expose `callbacks`.
 */

exports.callbacks = [];

/**
 * Routing middleware.
 *
 * @chainable
 * @param {Request} req A request object.
 * @param {Response} res A response object.
 * @param {Function} fn The function called on dispatch.
 * @return {Function} exports The main `router` function.
 * @api public
 */

function router(req, res, fn) {
  exports.dispatch(new Context({
    path: req.path,
    req: req,
    res: res,
    event: 'request'
  }), fn);
};

/**
 * Dispatch the given `context`.
 *
 * @chainable
 * @param {Object} context A context object.
 * @param {Function} fn Function called after route handlers are dispatched.
 * @return {Function} exports The main `router` function.
 * @api private
 */

exports.dispatch = function(context, fn){
  if ('string' === typeof context)
    context = new Context({ path: context });

  series(exports.callbacks, context, function(err){
    if (err && fn) fn(err);
  });

  return exports;
};

/**
 * Clear routes and callbacks.
 *
 * @return {Function} exports The main `router` function.
 * @api public
 */

exports.clear = function(){
  exports.callbacks.length = 0;
  route.routes.length = 0;
  return exports;
};

/**
 * Listen to port.
 * 
 * @param {Integer} port A port number.
 * @param {Function} fn Function called on start.
 * @api public
 */

exports.start = function(port, fn){

};

/**
 * Stop listening to port.
 *
 * @param {Function} fn Function called on stop.
 * @api public
 */

exports.stop = function(fn){

};

/**
 * Class representing a server context.
 * XXX: Maybe this becomes `tower-server-context`.
 *
 * @class
 *
 * @param {Object} options Context options.
 * @api public
 */

function Context(options) {
  options || (options = {});

  for (var key in options) this[key] = options[key];

  var path = options.path;
  var i = path.indexOf('?');
  this.canonicalPath = path;
  this.path = path || '/';
  this.state = {};
  this.state.path = path;
  this.querystring = ~i ? path.slice(i + 1) : '';
  this.pathname = ~i ? path.slice(0, i) : path;
  this.params = [];
}

/**
 * Render a specific format.
 *
 * @chainable
 * @return {Context}
 * @api public
 */

Context.prototype.render = function(){
  var req = this.req;
  var res = this.res;
  var next = req.next;
  var formats = this.route.formats;
  var format = req.accepts(this.route.accepts);

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
};

/**
 * Write to a connection or response.
 *
 * @param {String} string The string to write.
 * @api public
 */

Context.prototype.write = function(string){
  if (this.tcp) {
    this.connection.write([this.event, this.path, string].join(','));
  } else {
    this.res.write(string);
  }
};

/**
 * Indicate server context response error.
 *
 * Example
 *
 *    context.error(404);
 *    context.emit(404);
 *
 * @param {Integer} code Response code.
 * @param {String} message Response message.
 * @api public
 */

Context.prototype.error = function(code, message){
  // XXX: maybe there is a default handler?
  this.res.send(code, message);
  this.emit(code, message);
};

/**
 * Send a server context response.
 *
 * @param {Integer} code Response code.
 * @param {String} message Response message.
 * @api public
 */

Context.prototype.send = function(code, message){
  if (this.tcp) {
    //this.connection.write([this.event, this.path, string].join(','));
  } else {
    this.res.send.apply(this.res, arguments);
  }
};

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

/**
 * When a route is created, add it to the router.
 */

route.on('define', function(_route){
  exports.callbacks.push(function(context, next){
    return _route.handle(context, next);
  });
});