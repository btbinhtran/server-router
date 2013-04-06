module.exports = function(fns, val, done){
  var i = 0
    , fn;

  function next() {
    fn = fns[i++];

    if (!fn) return done();

    if (2 == fn.length) {
      fn(val, function(err){
        if (err) return done(err);
        next();
      });
    } else {
      // try?
      fn(val);
      next();
    }
  }

  next();
}