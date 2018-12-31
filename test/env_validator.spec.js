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

    it("should return object of empty and undefined env variables, if not set", () => {
        process.env.GEIST_EMPTY = "";
        config.geist.lala = "${$LALA}";
        config.geist.empty = "${$GEIST_EMPTY}";
        config.diaenne = {
            type: "proxy",
            uri: "${$DIAENNE_URI}",
            version: "${$VERSION}"
        };
        config.auth = "${$SECRET}";

        const result = {
            undefined: ["LALA", "DIAENNE_URI", "VERSION", "SECRET"],
            empty: ["GEIST_EMPTY"]
        };
        const actualResult = envValidator.validateEnvironment(process.env, config, delimiters);
        assert.deepEqual(result, actualResult);
    });

    it("should return empty list of undefined and empty if env needed is set already", () => {
        const result = envValidator.validateEnvironment(process.env, config, delimiters);
        assert.deepStrictEqual(result, {
            undefined: [],
            empty: []
        });
    });

    it("should throw error if one of the variable contains null", () => {
        config.diaenne = {
            type: null,
            uri: "${$DIAENNE_URI}",
            version: "${$VERSION}"
        };
        try {
            envValidator.validateEnvironment(process.env, config, delimiters);
        } catch(e) {
            assert.equal(e.message, "Error on Config, 'diaenne.type' is needed, but the value is null");
        }
    });

    it("should throw error if no environment variables is not installed in this system", () => {
        try {
            envValidator.validateEnvironment(null, config, delimiters);
        } catch(e) {
            assert.equal(e.message, "No environment variable set in this system");
        }
    });

    it("should throw error if no configuration is set", () => {
        try {
            envValidator.validateEnvironment({}, null, delimiters);
        } catch(e) {
            assert.equal(e.message, "No configuration is set");
        }
    });
});

describe("containDelimiters", () => {
    let delimiters;
    before(() => {
        delimiters = {left: "{", right: "}"};
    });

    it("should return false if string contains NO delimiters", () => {
        const res = envValidator.containDelimiters("LALAJO", delimiters);
        assert.deepStrictEqual(res, false);
    });

    it("should return true if string contains delimiters", () => {
        const res = envValidator.containDelimiters("{LALAJO}", delimiters);
        assert.deepStrictEqual(res, true);
    });

    it("should return false if string is null / undefined", () => {
        let result = envValidator.containDelimiters(null, { left: "{", right: "}" });
        assert.deepStrictEqual(result, false);

        result = envValidator.containDelimiters(undefined, delimiters);
        assert.deepStrictEqual(result, false);
    });

    it("should return false if delimiters is null / undefined", () => {
        let res = envValidator.containDelimiters("{LALAJO}", null);
        assert.deepStrictEqual(res, false);

        res = envValidator.containDelimiters("{LALAJO}", undefined);
        assert.deepStrictEqual(res, false);
    });
});
