var http     = require("http");
var https    = require("https");
var util      = require("util");
var path     = require("path");
var fs       = require("fs");
var io       = require("socket.io");
var nstatic  = require("node-static");
var Connection = require("./connection");
var redis = require('./redis');

var credentials;
var keysPath = __dirname + "/keys";
if (path.existsSync(keysPath + "/privatekey.pem") && path.existsSync(keysPath + "/certificate.pem")) {
  var privateKey = fs.readFileSync(keysPath + "/privatekey.pem", "utf8");
  var certificate = fs.readFileSync(keysPath + "/certificate.pem", "utf8");
  credentials = {key: privateKey, cert: certificate};
}

Server = module.exports = require("./klass").create();

var fileServer = new nstatic.Server(path.normalize(__dirname + "../../../public"));

Server.include({
  init: function(){
    var connectionListener = function(request, response){
      request.addListener("end", function() {

        fileServer.serve(request, response, function (err, res) {
          if (err) { // An error as occured
            util.error("> Error serving " + request.url + " - " + err.message);
            response.writeHead(err.status || 500, err.headers);
            response.end();
          } else { // The file was served successfully
            util.log("Serving " + request.url + " - " + res.message);
          }
        });

      }).resume();
    }

    if (credentials) {
      this.httpServer = https.createServer(credentials, connectionListener);
    } else {
      this.httpServer = http.createServer(connectionListener);
    }

    this.io = io.listen(this.httpServer);
    var RedisStore = require('socket.io/lib/stores/redis')
      , pub    = redis.createClient()
      , sub    = redis.createClient()
      , client = redis.createClient();
    this.io.set('store', new RedisStore({
                                         redisPub : pub
                                         , redisSub : sub
                                         , redisClient : client
                                     }));
    // this.io.set("origins", "*:*");
    this.io.sockets.on("connection", function(stream){ Connection.inst(stream) });
  },

  listen: function(port){
    port = parseInt(port || process.env.PORT || 8080);
    this.httpServer.listen(port);
  }
});
