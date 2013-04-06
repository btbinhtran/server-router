var router = require('..')
  , route = require('tower-route')
  , Context = require('tower-context')
  , container = require('tower-container')
  , request = require('superagent')
  , agent = request.agent()
  , http = require('http')
  , net = require('net')
  , eio = require('engine.io-client')
  , assert = require('assert');

var express = require('express')
  , app = express()
  , server = require('http').createServer(app)
  , io = require('engine.io').attach(server);

app.use(express.cookieParser());
app.use(express.session({ secret: 'secret' }));
app.use(router);

var sockjs = require('sockjs');
var noop = function(){};
var echo = sockjs.createServer({ log: noop });
var SockJS = require('sockjs-client');

echo.on('connection', function(conn){
  var routes = route.routes;
  conn.on('data', function(message){
    var parts = message.split(',');

    if (parts.length > 1) {
      var key = parts.shift()
        , val = parts.shift();

      message = parts.join(',');

      // XXX: this is hardcoded right now
      conn[key] = val;

      router.dispatch(new Context({
          connection: conn
        , path: val
        , event: 'connect'
      }));
    } else {
      conn.write(message);
    }
  });
  conn.on('close', function(){
    if (conn.route) {
      router.dispatch(new Context({
          connection: conn
        , path: conn.route
        , event: 'disconnect'
      }));
    }
  });
});

echo.installHandlers(server, { prefix:'/echo' });

server.listen(4000);

// https://github.com/visionmedia/superagent/blob/master/test/node/agency.js
describe('router', function(){
  beforeEach(router.clear);

  it('should GET JSON', function(done){
    var calls = 0;

    route('/', 'index')
      .on('request', function(context){
        var res = context.res;

        // simulate async
        process.nextTick(function(){
          res.json({ hello: 'world' });
          calls++;
        });
      });

    agent
      .get('http://localhost:4000')
      .end(function(res){
        assert('{"hello":"world"}' == JSON.stringify(res.body));
        assert(1 === calls);
        done();
      });
  });

  // https://github.com/LearnBoost/engine.io/blob/master/test/engine.io.js
  // http://faye.jcoglan.com/browser.html
  // https://github.com/sockjs/sockjs-node/blob/master/examples/echo/server.js
  // https://github.com/sockjs/sockjs-client-node
  // http://en.wikipedia.org/wiki/WebSocket#WebSocket_protocol_handshake
  // http://einaros.github.io/ws/
  // http://www.laktek.com/2010/05/04/implementing-web-socket-servers-with-node-js/
  // https://github.com/sockjs/sockjs-node/issues/43
  // https://github.com/nodejitsu/node-http-proxy#proxying-websockets
  // https://github.com/sockjs/sockjs-node/issues/67
  it('should get socket connection', function(done){
    var calls = [];

    // this is what happens server side
    route('/')
      .on('connect', function(context){
        calls.push('route.connect');
        context.connection.write('route == /');
      })
      .on('disconnect', function(context){
        calls.push('route.disconnect');

        assert('connection' === calls[0]);
        assert('route.connect' === calls[1]);
        assert('data' === calls[2]);
        assert('close' === calls[3]);
        assert('route.disconnect' === calls[4]);

        done();
      });

    // this is what happens client side
    var sock = SockJS.create('http://localhost:4000/echo');

    sock.on('connection', function(){
      // this gets called after the server .on('connection') gets called.
      calls.push('connection');
    });

    sock.on('data', function(data){
      calls.push('data');
      assert('route == /' === data);
      sock.close();
    });

    sock.on('close', function(){
      calls.push('close');
    });

    // or maybe `connect,/`, so you can do `disconnect,/`
    // on focusin/out. This way the client-side could
    // connect/disconnect to routes on the fly.
    // or `+/`, and `-/`, and just `/` for single request.
    // or `POST /` and other similar to HTTP methods.
    sock.write('route,/');
  })
});
