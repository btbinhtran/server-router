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
var echo = sockjs.createServer();
var SockJS = require('sockjs-client');

echo.on('connection', function(conn){
  conn.on('data', function(message){
    conn.write(message);
  });
  conn.on('close', function(){
    //console.log('close');
  });
});

echo.installHandlers(server, { prefix:'/echo' });

server.listen(4000);

// https://github.com/visionmedia/superagent/blob/master/test/node/agency.js
describe('router', function(){
  before(router.clear);

  it('should GET JSON', function(done){
    var calls = 0;

    route('/', 'index')
      .on('request', function(context, next){
        var res = context.res;

        // simulate async
        process.nextTick(function(){
          res.json({ hello: 'world' });
          calls++;
          next();
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
  it('should get socket connection', function(done){
    var sock = SockJS.create('http://localhost:4000/echo');
    var calls = [];

    sock.on('connection', function(){
      calls.push('connection');
    });

    sock.on('data', function(data){
      calls.push('data');
      assert('Hello World' === data);
      sock.close();
    });

    sock.on('close', function(){
      calls.push('close');

      assert('connection' === calls[0]);
      assert('data' === calls[1]);
      assert('close' === calls[2]);
      
      done();
    });

    sock.write('Hello World');
  })
});
