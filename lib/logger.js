"use strict";
/* eslint no-console: "off" */
const dateFormat = require("dateformat");
const colors = require("colors/safe");

exports.factory = function($meta, config) {
    const stdLevel = 3;
    let name = config.default("name", "undefined");
    let level = config.default("merapi.logging.level", stdLevel);
    let component = $meta.caller;

    const mapLevel = {
        error: 0,
        warn: 1,
        info: 2,
        verbose: 3,
        debug: 4,
        silly: 5
    };

    let levelInt = typeof level == "string" ? mapLevel[level] || stdLevel : level;

    let label = name + "/" + component;

    return {
        error: function() {
            if (levelInt >= 0)
                console.error.apply(console, [colors.red("[ERROR] " + label), 
                    colors.gray(dateFormat(new Date(), "yyyy-mm-dd HH:MM:ss :"))]
                    .concat(Array.prototype.slice.call(arguments)));
        },

        warn: function() {
            if (levelInt >= 1)
                console.warn.apply(console, [colors.yellow("[WARN] " +label), 
                    colors.gray(dateFormat(new Date(), "yyyy-mm-dd HH:MM:ss :"))]
                    .concat(Array.prototype.slice.call(arguments)));
        },

        info: function() {
            if (levelInt >= 2)
                console.info.apply(console, [colors.cyan("[INFO] " +label), 
                    colors.gray(dateFormat(new Date(), "yyyy-mm-dd HH:MM:ss :"))]
                    .concat(Array.prototype.slice.call(arguments)));
        },

        log: function() {
            if (levelInt >= 3)
                console.log.apply(console, [colors.green("[LOG] " + label), 
                    colors.gray(dateFormat(new Date(), "yyyy-mm-dd HH:MM:ss :"))]
                    .concat(Array.prototype.slice.call(arguments)));
        },

        debug: function() {
            if (levelInt >= 4)
                console.log.apply(console, [colors.gray("[DEBUG] " + label), 
                    colors.gray(dateFormat(new Date(), "yyyy-mm-dd HH:MM:ss :"))]
                    .concat(Array.prototype.slice.call(arguments)));
        },

        trace: (levelInt >= 4) ? console.trace : function() {}

    };
};