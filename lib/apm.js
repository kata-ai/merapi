"use strict";

function Start(config) {
    config.resolve();
    if (config.data.apm && typeof config.data.apm === "object") {
        require("elastic-apm-node").start({
            serviceName: config.data.name,
            serverUrl: config.data.apm.server,
            active: true,
            asyncHooks: true,
            logLevel: 'info',
            captureSpanStackTraces: true,
            captureExceptions: true,
        });
    }
}

module.exports = Start;
