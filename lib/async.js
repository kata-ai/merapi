"use strict";
const {co} = require("bluebird-co");
const utils = require("./utils");
const Promise = require("bluebird");

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