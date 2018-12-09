"use strict";
const Config = require("./config");
const isNil = require("lodash/isNil");

exports.validateEnvironment = (configuration) => {
    const config = new Config(null);
    const currentEnv = process.env;
    if (isNil(currentEnv)) throw new Error("No environment variable installed in this system");

    const flattenConfiguration = config._flatten(configuration);
    const regex = /[${}]/g;

    for (const key of Object.keys(flattenConfiguration)) {
        const value = flattenConfiguration[key];
        if (isNil(value)) {
            throw new Error(`Error on Config, '${key}' is needed, but the value is ${value}`);
        }

        if (regex.test(value)) {
            const pureValue = value.replace(regex, "");
            const envValue = currentEnv[pureValue];
            if (!envValue || envValue === "") throw new Error(`Error on Environment, '${pureValue}' is needed, but the value is ${envValue}`);
        }
    }
    return true;
};

