/*globals cloudantService:true discovery:true*/
/*eslint-env node */
var express = require('express');
var bodyParser = require('body-parser');
var cfenv = require("cfenv");
var path = require('path');
var cors = require('cors');
var request = require('request');

//Setup Cloudant Service.
var appEnv = cfenv.getAppEnv();
cloudantService = appEnv.getService("myMicroservicesCloudant");

//Setup middleware.
var app = express();
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'www')));

//REST HTTP Methods
var orders = require('./routes/orders');
app.get('/rest/orders', orders.list);
app.get('/rest/orders/:id', orders.find);
app.post('/rest/orders', orders.create);

app.listen(appEnv.port, appEnv.bind);
console.log('App started on ' + appEnv.bind + ':' + appEnv.port);

//Register in service discovery with heatbeat
var disco = appEnv.getService("myMicroservicesDiscovery").credentials;
request({
    url: disco.url + '/api/v1/instances',
    method: 'POST',
    headers: {
  	  'Authorization': 'Bearer ' + disco.auth_token 
    },
    json: {
      'service_name': appEnv.name,
      //'tags': [],
      'ttl' : 5, // ttl of 5s
      'endpoint': {
      	'type': 'http',
      	'value': appEnv.url
      }    	
    }
  }, function(error, response, body){
    if(error) {
      console.log(error);
    } else if (response.statusCode == 201) { 
      console.log('REGISTERED: ' + response.statusCode, body);
      setInterval(function() {
        request({
	      url: disco.url + '/api/v1/instances/' + body.id + '/heartbeat',
	      method: 'PUT',
	      headers: {
	  	    'Authorization': 'Bearer ' + disco.auth_token 
	      },
	      json: {}
        }, function(error2, response2, body2){
          if (error2) {
	        console.error("HEARTBEAT: ERROR", error2);
	      } else {
	        console.log("HEARTBEAT: " + response2.statusCode, body2);
	      }
        });
      }, 1000); // heartbeat every 1s
    } else {
      console.log("NOT REGISTERED: " + response.statusCode, body);
    }
  }
);

