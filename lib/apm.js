"use strict";

function Start(config) {
    if (config.apm !== undefined) {
        require("elastic-apm-node").start({
            serviceName: config.name,
            serverUrl: config.apm.server
        });
    }
}

module.exports = Start;
