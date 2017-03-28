"use strict";
const deasync = require("deasync");
const utils = require("./utils");

function sync(promise) {
    if(!utils.isPromise(promise))
        throw new Error("Sync only accept promises.");
    let done = false;
    let error = null;
    let result;
    promise.then(res => {
        done = true;
        result = res;
    }).catch(e => {
        error = e;
    });

    deasync.loopWhile(() => {
        return !done && !error;
    });

    if (error)
        throw error;

    return result;
}

module.exports = sync;