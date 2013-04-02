
/**
 * Module dependencies.
 */

var route = require('tower-route')
  , Context = require('tower-context');

route.on('define', function(i){
  callbacks.push(function(context, next){
    i.handle(context, next);
  });
});

var callbacks = [];

module.exports = router;
module.exports.route = route;

// XXX: this isn't the api, just hacking
function router(context, fn) {
  if ('string' == typeof context)
    context = new Context(context);

  var i = -1;

  function next() {
    i++;

    if (!callbacks[i])
      return fn();

    if (2 == callbacks[i].length) {
      callbacks[i](context, function(err){
        if (err) return fn(err);
        next();
      });
    } else {
      callbacks[i](context);
      next();
    }
  }

  next();
}