var router = require('..')
  , route = require('tower-route')
  , Context = require('tower-context')
  , container = require('tower-container')
  , request = require('superagent')
  , agent = request.agent()
  , http = require('http')
  , net = require('net')
  , assert = require('assert');

var express = require('express')
  , app = express()
  , server = require('http').createServer(app)
  , io = require('engine.io').attach(server);

app.use(express.cookieParser());
app.use(express.session({ secret: 'secret' }));
app.use(router);

server.on('connection', function(socket){
  socket.on('message', function(data){
    console.log('m')
    socket.send('pong');
  });
  socket.on('close', function () { });
});

server.listen(4000);

// https://github.com/visionmedia/superagent/blob/master/test/node/agency.js
describe('router', function(){
  before(router.clear);

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
  it('should get socket connection', function(done){
    var client = net.createConnection(4000);

    client.on('connect', function(){
      client.setEncoding('ascii');
      client.write([
          'GET / HTTP/1.1'
        , 'Upgrade: IRC/6.9'
        , '', ''
      ].join('\r\n'));

      // test that socket is still open by writing after the timeout period
      setTimeout(function(){
        client.write('foo');
      }, 200);

      client.on('end', done);
    });
  })
});
