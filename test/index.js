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
  conn.routes = {};
  conn.headers = {};
  conn.on('data', function(message){
    var parts = message.split(',');

    if (parts.length > 1) {
      var key = parts.shift()
        //, val = parts.shift();

      var val = parts.join(',');

      // XXX: this is hardcoded right now
      switch (key) {
        case 'route':
        case 'CONNECT':
          conn.routes[val] = true;

          router.dispatch(new Context({
              connection: conn
            , path: val
            , event: 'connect'
            , headers: conn.headers
          })); 

          break;
        case 'GET':
        case 'POST':
        case 'PUT':
        case 'DELETE':
        case 'HEAD':
        case 'OPTIONS':
        case 'PATCH':
          router.dispatch(new Context({
              connection: conn
            , path: val
            , event: 'request'
            , method: key
            , headers: conn.headers
          }));

          break;
        case 'DATA':

          break;
        case 'header':
          parts = val.split(/ *: */);
          key = parts.shift();
          val = parts.join(':');
          conn.headers[key] = val;

          break;
        case 'DISCONNECT':
          delete conn.routes[val];

          router.dispatch(new Context({
              connection: conn
            , path: val
            , event: 'disconnect'
            , headers: conn.headers
          }));

          break;
      }
    } else {
      //conn.write(message);
    }
  });
  conn.on('close', function(){
    for (var key in conn.routes) {
      router.dispatch(new Context({
          connection: conn
        , path: key
        , event: 'disconnect'
        , headers: conn.headers
      }));
    }
    delete conn.headers;
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
        // simulate async
        process.nextTick(function(){
          context.render();
        });
      })
      .format('json', function(context){
        context.res.json({ hello: 'world' });
        calls++;
      });

    agent
      .get('http://localhost:4000')
      .set('Accept', 'application/json')
      .end(function(res){
        assert('{"hello":"world"}' == JSON.stringify(res.body));
        assert(1 === calls);
        done();
      });
  });

  it('should render different formats', function(done){
    route('/')
      .on('request', function(context){
        context.render();
      })
      .format('json', function(context){
        context.res.json({ hello: 'world' });
      })
      .format('html', function(context){
        context.res.send('<h1>Hello World</h1>');
      })
      .format('csv', function(context){
        context.res.send('hello,world');
      })
      .format('pdf', function(context){
        // application/pdf
      })
      // application/vnd.ms-excel
      // http://stackoverflow.com/questions/393647/response-content-type-as-csv
      // http://stackoverflow.com/questions/312230/proper-mime-media-type-for-pdf-files

    var responses = 0;

    agent
      .get('http://localhost:4000')
      .set('Accept', 'application/json')
      .end(function(res){
        responses++;
        assert('{"hello":"world"}' == JSON.stringify(res.body));
      });

    agent
      .get('http://localhost:4000')
      .set('Accept', 'text/html')
      .end(function(res){
        responses++;
        assert('<h1>Hello World</h1>' == res.text);
        assert(2 === responses);
      });

    agent
      .get('http://localhost:4000')
      .set('Accept', 'text/csv')
      .end(function(res){
        responses++;
        assert('hello,world' == res.text);
        assert(3 === responses);
        done();
      });
  });

  it('should handle errors', function(done){
    route('/')
      .on('request', function(context){
        throw new Error('An Error!');
      })
      .on(500, function(context){
        assert('An Error!' === context.error.message);
        context.res.send(500, 'Oops');
      });

    agent
      .get('http://localhost:4000')
      .end(function(res){
        assert(500 === res.status);
        assert('Oops' === res.text);
        done();
      });
  });

  //it('should render view', function(done){
  //  route('/')
  //    .on('request', function(context){
  //      context.res.render('hello-world.handlebars');
  //    });
  //
  //  agent
  //    .get('http://localhost:4000')
  //    .end(function(res){
  //      done();
  //    });
  //});

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
        assert('application/json' === context.headers['Accept']);
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
    sock.write('header,Accept:application/json')
    sock.write('route,/');
  });
  
  // http://stackoverflow.com/questions/2558606/stream-data-with-node-js
  // http://cjihrig.com/blog/creating-your-own-node-js-websocket-echo-server/
  it('should connect to multiple routes', function(done){
    var calls = [];

    route('/users')
      .on('connect', function(context){
        calls.push('users.connect');
      })
      .on('request', function(context){
        calls.push('users.request.' + context.method);
        // context.pipe(graph.where()...)
      })
      .on('disconnect', function(context){
        calls.push('users.disconnect');
      })
      .on('data', function(data){
        // maybe this is where sockets stream raw data.
      })
      // maybe this instead of disconnect, or `close`.
      //.on('end');

    route('/posts')
      .on('connect', function(context){
        calls.push('posts.connect');
      })
      .on('disconnect', function(context){
        calls.push('posts.disconnect');

        assert('users.connect' === calls[0]);
        assert('posts.connect' === calls[1]);
        assert('users.request.GET' === calls[2]);
        assert('users.disconnect' === calls[3]);
        assert('posts.disconnect' === calls[4]);

        done();
      });

    // this is what happens client side
    var sock = SockJS.create('http://localhost:4000/echo');
    // this is what the RESTAdapter would do (returning a stream object)
    sock.write('CONNECT,/users');
    sock.write('CONNECT,/posts');
    sock.write('GET,/users?since=2013');
    sock.write('DISCONNECT,/users');
    sock.write('DISCONNECT,/posts');
    //sock.write('EVENT,someEvent,/users');
    sock.write('DATA,/users,random data');
  });
});
