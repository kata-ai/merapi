"use strict";
const Config = require("./config");
const isNil = require("lodash/isNil");

/**
 * Make sure environment variables needed in configuration exists.
 *
 * Return environment variables needed to be defined in process.env.
 *
 * @param  {object} environment Environment variables to be validated, intended to be filled with process.env object
 * @param  {object} configuration Configuration used for merapi
 * @param  {object} delimiters Delimiters object, used to parse variables. Examples:
 *                  formatted in {
 *                      left: "${$"
 *                      right: "}"
 *                   }
 *                  for entry ${$SOME_ENV}
 *
 */
exports.validateEnvironment = (environment, configuration, delimiters = { left: "${", right: "}" }) => {
    const config = new Config(null);
    if (isNil(environment)) throw new Error("No environment variable installed in this system");
    if (isNil(configuration)) return []; // no need to check if no configuration

    const flattenConfiguration = config._flatten(configuration);

    const neededValues = [];
    for (const key of Object.keys(flattenConfiguration)) {
        const value = flattenConfiguration[key];
        if (isNil(value)) {
            throw new Error(`Error on Config, '${key}' is needed, but the value is ${value}`);
        }
        if (containDelimiters(value, delimiters)) {
            const envKey = value.substring(delimiters.left.length, value.length - delimiters.right.length);
            const envValue = environment[envKey];

            if (isNil(envValue) || envValue === "") {
                neededValues.push(envKey);
            }
        }
    }
    return neededValues;
};

const containDelimiters = (string, delimiters) => {
    if (isNil(string)) return false;
    return typeof string === "string" &&
            string.includes(delimiters.left) &&
            string.includes(delimiters.right);
};
exports.containDelimiters = containDelimiters;
