"use strict";
const assert = require("assert");
const envValidator = require("../lib/env_validator");

/* eslint-env mocha */

describe("Name of the group", () => {
    let config;
    process.env.GEIST_URI = "https://example.com";
    process.env.GEIST_TOKEN = "asasaklns12io1u31oi2u3";

    beforeEach(() => {
        config = {
            geist: {
                type: "proxy",
                uri: "${$GEIST_URI}",
                version: "v1",
                secret: "${$GEIST_TOKEN}"
            }
        };
    });

    it("should be able to validate okay, environment from JSON config file", () => {
        const result = envValidator.validateEnvironment(config);
        assert.equal(result, true);
    });

    it("should be able to throw error if needed config value is not set on environment variables", () => {
        config.diaenne = {
            type: "proxy",
            uri: "${$DIAENNE_URI}",
            version: "v1"
        };
        try {
            envValidator.validateEnvironment(config);
        } catch (e) {
            assert.equal(e.message, "Error on Environment, 'DIAENNE_URI' is needed, but the value is undefined");
        }
    });

    it("should be able to throw error if needed config value is null / undefined", () => {
        config.diaenne = {
            type: null,
            uri: "${$DIAENNE_URI}",
            version: "v1"
        };
        try {
            envValidator.validateEnvironment(config);
        } catch (e) {
            assert.equal(e.message, "Error on Config, 'diaenne.type' is needed, but the value is null");
        }
    });
});
