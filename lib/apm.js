"use strict"

function Start(config){
    if(config.apm !== undefined){
    var a = require('elastic-apm-node').start({
        // Override service name from package.json
        // Allowed characters: a-z, A-Z, 0-9, -, _, and space
        //serviceName: config.name,
        serviceName: config.name,
        
        // Use if APM Server requires a token
        secretToken: '',
      
        // Set custom APM Server URL (default: http://localhost:8200)
        serverUrl: config.apm.server
       // serverUrl: config.apm.url
      })
    }
}

module.exports = Start