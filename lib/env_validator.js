"use strict";
const Config = require("./config");
const isNil = require("lodash/isNil");

/**
 *
 *
 */
exports.validateEnvironment = (environment, configuration) => {
    const config = new Config(null);
    if (isNil(environment)) throw new Error("No environment variable installed in this system");

    const flattenConfiguration = config._flatten(configuration);
    const regex = /[${}]/g;

    const invalidValues = [];
    for (const key of Object.keys(flattenConfiguration)) {
        const value = flattenConfiguration[key];
        if (isNil(value)) {
            throw new Error(`Error on Config, '${key}' is needed, but the value is ${value}`);
        }

        if (regex.test(value)) {
            const pureValue = value.replace(regex, ""); // replace `${}` with ""
            const envValue = environment[pureValue];

            if (isNil(envValue) || envValue === "") {
                invalidValues.push(pureValue);
            }
        }
    }
    return invalidValues;
};

