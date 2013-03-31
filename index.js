
/**
 * Module dependencies.
 */

var route = require('tower-route');

route.on('define', function(i){
  callbacks.push(function(context, next){
    i.handle(context, next);
  });
});

var callbacks = [];

module.exports = router;

function router(context, fn) {
  var i = -1;

  function next() {
    i++;

    if (!callbacks[i])
      return fn();

    callbacks[i](context, next);
  }

  next();
}