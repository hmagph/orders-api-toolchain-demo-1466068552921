/*globals cloudantService:true discovery:true*/
/*eslint-env node */
var express = require('express');
var bodyParser = require('body-parser');
var cfenv = require("cfenv");
var path = require('path');
var cors = require('cors');
var ServiceDiscovery = require('bluemix-service-discovery');

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
var sdcreds = appEnv.getService("myMicroservicesDiscovery").credentials;
discovery = new ServiceDiscovery({
  name: 'ServiceDiscovery',
  auth_token: sdcreds.auth_token,
  url: sdcreds.url,
  version: 1
});
discovery.register(
  {
    service_name: appEnv.name,
    ttl: 5, // ttl of 5s
    endpoint: {
      type: 'http',
      value: appEnv.url
    },
    metadata: {}
  },
  function(err, response, body) {
  if (!err && response.statusCode === 201) {
    var id = body.id;
    console.log('Registered', body);
    setInterval(function() {
      discovery.renew(id, function(err, response) {
        if (!err && response.statusCode === 200) {
          console.log('HEARTBEAT OK');
        } else {
          console.log('HEARTBEAT ERROR');
        }
      });
    }, 1000); // renew every 1s
  }
});

