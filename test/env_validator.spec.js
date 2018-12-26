"use strict";
const assert = require("assert");
const envValidator = require("../lib/env_validator");

/* eslint-env mocha */

describe("Env validator", () => {
    let config;
    process.env.GEIST_URI = "https://example.com";
    process.env.GEIST_TOKEN = "asasaklns12io1u31oi2u3";
    const delimiters = {
        left: "${$",
        right: "}"
    };

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

    it("should return empty array if env needed is set already", () => {
        const result = envValidator.validateEnvironment(process.env, config, delimiters);
        assert.deepStrictEqual(result, []);
    });

    it("should be able to return needed-to-be-set environment variables", () => {
        config.geist.lala = "${$LALA}";
        config.diaenne = {
            type: "proxy",
            uri: "${$DIAENNE_URI}",
            version: "${$VERSION}"
        };
        config.auth = "${$SECRET}";

        const result = envValidator.validateEnvironment(process.env, config, delimiters);
        assert.deepStrictEqual(result, ["LALA", "DIAENNE_URI", "VERSION", "SECRET"]);
    });

    it("should throw error if one of the variable contains null", () => {
        config.diaenne = {
            type: null,
            uri: "${$DIAENNE_URI}",
            version: "${$VERSION}"
        };
        try {
            envValidator.validateEnvironment(process.env, config, delimiters);
            assert.fail("Should throw error on Config");
        } catch(e) {
            assert.equal(e.message, "Error on Config, 'diaenne.type' is needed, but the value is null");
        }
    });

    it("should throw error if no environment variables is not installed in this system", () => {
        try {
            envValidator.validateEnvironment(null, config, delimiters);
            assert.fail("Should throw error on Config");
        } catch(e) {
            assert.equal(e.message, "No environment variable installed in this system");
        }
    });
});

describe("", () => {

});
