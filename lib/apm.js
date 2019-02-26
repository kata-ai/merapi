"use strict"

function Start(config){
    var a = require('elastic-apm-node').start({
        // Override service name from package.json
        // Allowed characters: a-z, A-Z, 0-9, -, _, and space
        //serviceName: config.name,
        serviceName: "test-apm-from-merapi",
        
        // Use if APM Server requires a token
        secretToken: '',
      
        // Set custom APM Server URL (default: http://localhost:8200)
        serverUrl: 'http://35.187.250.255:8200'
       // serverUrl: config.apm.url
      })
}

module.exports = Start