var util     = require("util");
var Channel = require("./channel");
var Events  = require("./events");
var crypto  = require("crypto");
var Config = require('./config');
var Authorization = require("./authorization");
var Message = require('./message');

Client = module.exports = require("./klass").create();

Client.include({
  init: function(conn){
    this.connection = conn;
    this.session_id = this.connection.session_id;
  },

  setMeta: function(value){
    this.meta = value;
  },

  event: function(data){
    Events.custom(this, data);
  },

  subscribe: function(message){
    var channelName = message.getChannel();
    util.log("Client subscribing to: " + channelName);

    if (Config.secure_mode && (!Authorization.validateSignature(this, message))){
      util.log("Client subscription authorization failed for: " + channelName);
      this.write(new Message({channel: "auth:" + channelName, data: {success: false, message: "Authorization failed"}}));
      return false;
    }

    var channel = Channel.find(channelName)
    channel.subscribe(this);
  },

  unsubscribe: function(name){
    util.log("Client unsubscribing from: " + name);

    var channel = Channel.find(name);
    channel.unsubscribe(this);
  },

  write: function(message){
    if (message.except) {
      var except = Array.makeArray(message.except);
      if (except.include(this.session_id))
        return false;
    }

    this.connection.write(message);
  },

  disconnect: function(){
    // Unsubscribe from all channels
    Channel.unsubscribe(this);
  }
});