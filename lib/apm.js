"use strict";

function Start(config) {
    if (config.apm !== undefined) {
        require("elastic-apm-node").start({
            serviceName: config.name,
            serverUrl: config.apm.server,
            active: true,
            asyncHooks: true,
            logLevel: "debug",
            captureSpanStackTraces: true,
            captureExceptions: true,
        });
    }
}

module.exports = Start;
