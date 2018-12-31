"use strict";
const Config = require("./config");
const isNil = require("lodash/isNil");
const isEmpty = require("lodash/isEmpty");

/**
 * Make sure environment variables needed in configuration exists.
 *
 * Return environment variables needed to be defined.
 *
 * @param  {object} environment Environment variables to be validated, intended to be filled with process.env object
 * @param  {object} configuration Configuration used for merapi
 * @param  {object} delimiters Delimiters object, used to parse variables. Examples:
 *                  formatted in {
 *                      left: "${"
 *                      right: "}"
 *                   }
 *                  for entry ${$SOME_ENV}
 *
 */
exports.validateEnvironment = (environment, configuration, delimiters = { left: "{", right: "}" }) => {
    if (isNil(environment)) throw new Error("No environment variable set in this system");
    if (isNil(configuration) || isEmpty(environment)) throw new Error("No configuration is set");

    const config = new Config();
    const flattenConfiguration = config._flatten(configuration);
    const neededValues = {
        undefined: [],
        empty: []
    };

    for (const key of Object.keys(flattenConfiguration)) {
        const value = flattenConfiguration[key];
        if (isNil(value)) {
            throw new Error(`Error on Config, '${key}' is needed, but the value is ${value}`);
        }
        if (containDelimiters(value, delimiters)) {
            const envKey = value.substring(delimiters.left.length, value.length - delimiters.right.length);
            const envValue = environment[envKey];
            const sanitisedEnvKey = envKey.replace(/\$/,""); // remove $

            if (isNil(envValue)) {
                neededValues["undefined"].push(sanitisedEnvKey);
            } else if (envValue === "") {
                neededValues["empty"].push(sanitisedEnvKey);
            }
        }
    }
    return neededValues;
};

const containDelimiters = (string, delimiters) => {
    if (isNil(string)) return false;
    if (isNil(delimiters)) return false;
    return typeof string === "string" &&
            string.includes(delimiters.left) &&
            string.includes(delimiters.right);
};
exports.containDelimiters = containDelimiters;
