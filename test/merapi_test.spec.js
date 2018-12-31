"use strict";
const asyn = require("../async");
const merapi = require("../index");
const assert = require("assert");
const Component = require("../component");
const sleep = require("sleep-promise");

process.env.NODE_ENV = process.NODE_ENV || "test";

/* eslint-env mocha */

describe("Merapi Test", function() {


    describe("Config", function() {

        let container = null;

        beforeEach(asyn(function*() {
            process.env.TOKEN="123";
            container = merapi({
                delimiters: {
                    left: "${",
                    right: "}"
                },
                config: {
                    "package.name": "merapi-test",
                    "myConfig": "${resolved.a}",
                    "myEnvConfig": "${resolved.b}",
                    "myStrEnvConfig": "${resolved.c}",
                    "myCrlfStrEnvConfig": "${resolved.d}",
                    "myToken": "${$TOKEN}" // for system env variables, $ is appended
                },

                envConfig: {
                    test: {
                        "resolved.a": 1,
                        "resolved.b": 2,
                        "resolved.c": "test",
                        "resolved.d": "test\r",
                    }
                },

                extConfig: {
                    more: true
                }
            });

            yield container.initialize();
        }));

        it("can resolve config from envConfig", function() {
            assert.notEqual(container, null);

            let myConfig = container.config.get("myConfig");
            let pkg = container.config.get("package");
            assert.equal(myConfig, 1);
            assert.equal(pkg.name, "merapi-test");
        });

        it("can resolve config from system env variables", () => {
            assert.notEqual(container, null);

            const myToken = container.config.get("myToken");
            assert.equal(myToken, 123);
        });

        it("can resolve environment config", function() {
            let myEnvConfig = container.config.get("myEnvConfig");
            let myStrEnvConfig = container.config.get("myStrEnvConfig");
            let myCrlfStrEnvConfig = container.config.get("myCrlfStrEnvConfig");
            assert.equal(myEnvConfig, 2);
            assert.equal(myStrEnvConfig, "test");
            assert.equal(myCrlfStrEnvConfig, "test");
        });

        it("can resolve extended config", function() {
            assert.equal(container.config.get("more"), true);
        });

        it("can resolve environment variables", function() {
            let ENV = container.config.get("ENV");
            let env = container.config.get("env");

            assert.equal(env, process.env.NODE_ENV);
            assert.equal(ENV.NODE_ENV, process.env.NODE_ENV);
            assert.equal(ENV.PATH, process.env.PATH);
        });

        it("can throw error if config value is not set on env variable", asyn(function*() {
            container = merapi({
                delimiters: {
                    left: "${",
                    right: "}"
                },
                config: {
                    "package.name": "${SOME_NAME}"
                }
            });

            try {
                yield container.initialize();
            } catch(e) {
                assert.equal(e.message, "Configuration error, some env variables are not set");
            }
        }));

        it("should produce warning if some configurations are empty string", asyn(function*() {
            process.env.SOME_NAME="";
            container = merapi({
                delimiters: {
                    left: "${",
                    right: "}"
                },
                config: {
                    "package.name": "${$SOME_NAME}"
                }
            });
            let a = 0;
            container.logger = {
                warn: () => {
                    a = 1; // warn is called
                }
            };

            yield container.initialize();
            assert.equal(a, 1);
        }));

        it("should produce warning and throw error if some are empty string and some are undefined", asyn(function*() {
            process.env.SOME_NAME="";
            container = merapi({
                delimiters: {
                    left: "${",
                    right: "}"
                },
                config: {
                    "package.name": "${$SOME_NAME}"
                }
            });
            let a = 0;
            container.logger = {
                warn: () => {
                    a = 1; // warn is called
                }
            };

            try {
                yield container.initialize();
            } catch(e) {
                assert.equal(a, 1);
                assert.equal(e.message, "Configuration error, some env variables are not set");
            }
        }));

        it("can use custom delimiters", asyn(function*() {
            container = merapi({
                delimiters: {
                    left: "[",
                    right: "]"
                },
                config: {
                    "nameEnv": "[SOME_NAME]"
                },
                envConfig: {
                    test: {
                        SOME_NAME: "mamazo"
                    }
                }
            });
            yield container.initialize();

            let name = container.config.get("nameEnv");
            assert.equal(name, "mamazo");
        }));

        it("can use default delimiters (left:`{`, right: `}`) if no custom delimiters specified", asyn(function*() {
            container = merapi({
                config: {
                    "nameEnv": "{SOME_NAME}"
                },
                envConfig: {
                    test: {
                        SOME_NAME: "mamazo"
                    }
                }
            });
            yield container.initialize();

            let name = container.config.get("nameEnv");
            assert.equal(name, "mamazo");
        }));
    });

    describe("Components", function() {

        let container = null;
        let obj = {};

        beforeEach(asyn(function*() {

            container = merapi({
                basepath: __dirname,
                config: {
                    "components": {
                        "comTest": "ComTest",
                        "comAutoLoad": {"type":"component", path:"ComAutoload", load:true},
                        "comClassTest": {"type":"component", "path":"ComClassTest"},
                        "comAlias": {"type":"alias", "ref":"comTest"}
                    },
                    "main": "comClassTest"
                }
            });

            container.register("obj", obj, true);
            container.alias("alias", "obj");

            yield container.initialize();
        }));

        it("can resolve object", asyn(function*() {
            const o = yield container.resolve("obj");
            assert.equal(o, obj);
        }));

        it("can resolve alias", asyn(function*() {
            const o = yield container.resolve("obj");
            const a = yield container.resolve("alias");
            assert.equal(o, obj);
            assert.equal(o, a);
        }));

        it("can resolve alias from config", asyn(function*() {
            const o = yield container.resolve("comAlias");
            const a = yield container.resolve("comTest");
            assert.equal(o, a);
        }));

        it("can auto load component", asyn(function*() {
            const config = yield container.resolve("config");
            assert.equal(config.default("autoloaded", false), false);
            yield container.start();
            assert.equal(config.default("autoloaded", false), true);
        }));

        it("can resolve component loader", asyn(function*() {
            const comTest = yield container.resolve("comTest");
            assert.notEqual(comTest, null);
        }));

        it("can resolve component class", asyn(function*() {
            const comClassTest = yield container.resolve("comClassTest");
            assert.notEqual(comClassTest, null);
            assert.notEqual(comClassTest.comTest, null);
        }));

        it("should throw error if component type is not defined", asyn(function*() {
            const con = merapi({
                basepath: __dirname,
                config: {
                    components: {
                        invalid: {type:"invalid"}
                    }
                }
            });

            let error = null;
            try {
                yield con.initialize();
            } catch(e) {
                error = e;
            }

            assert.notEqual(error, null);
            assert.equal(error.message, "Cannot register component of unknown type: invalid");
        }));

        it("should throw error if component is not found", asyn(function*() {
            const con = merapi({
                basepath: __dirname,
                config: {
                    components: {
                        invalid: "InvalidComponent"
                    }
                }
            });

            let error = null;
            try {
                yield con.initialize();
            } catch(e) {
                error = e;
            }

            assert.notEqual(error, null);
            assert.equal(error.code, "MODULE_NOT_FOUND");
        }));

        it("should throw error if component definition is invalid", asyn(function*() {
            const con = merapi({
                basepath: __dirname,
                config: {
                    components: {
                        invalid: false
                    }
                }
            });

            let error = null;
            try {
                yield con.initialize();
            } catch(e) {
                error = e;
            }

            assert.notEqual(error, null);
            assert.equal(error.message, "Invalid component definition for invalid");
        }));

        it("should warn if main is not defined", asyn(function*() {
            const con = merapi({
                basepath: __dirname,
                config: {
                    components: {
                    }
                }
            });

            const logger = yield con.resolve("logger");
            let warningMessage = null;
            logger.warn = (msg) => {
                warningMessage = msg;
            };
            con.register("logger", logger, true);

            yield con.start();

            assert.notEqual(warningMessage, null);
            assert.equal(warningMessage, "No main defined");
        }));
    });

    describe("Starter", function() {

        it("can start a main module from component loader", asyn(function*() {

            let container = merapi({
                basepath: __dirname,
                config: {
                }
            });

            let testVal = 0;

            container.register("mainCom", function() {
                return {
                    start() {
                        testVal = 1;
                    }
                };
            });

            let config = yield container.resolve("config");

            config.set("main", "mainCom");

            assert.equal(testVal, 0);
            yield container.initialize();
            assert.equal(testVal, 0);
            yield container.start();
            assert.equal(testVal, 1);
        }));

        it("can start a main module from component class", asyn(function*() {
            let testVal = 0;
            let container = merapi({
                basepath: __dirname,
                config: {
                    main: "mainCom"
                }
            });

            container.register("mainCom", class MainComponent extends Component {
                *start() {
                    yield sleep(1);
                    testVal = 1;
                }
            });


            assert.equal(testVal, 0);
            yield container.initialize();
            assert.equal(testVal, 0);
            yield container.start();
            assert.equal(testVal, 1);
        }));
    });
});