"use strict";
const co = require("co");
const utils = require("./utils");

function async(fn) {
    if (utils.isGeneratorFunction(fn))
        return co.wrap(fn);
    return function() {
        return new Promise(function(resolve) {
            return resolve(fn.apply(null, arguments));
        });
    };
}

async.run = function run(fn) {
    return utils.isGeneratorFunction(fn) ? co(fn) : fn();
};

module.exports = async;