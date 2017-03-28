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
            container = merapi({
                delimiters: {
                    left: "${",
                    right: "}"
                },
                config: {
                    "package.name": "merapi-test",
                    "myConfig": "${resolved.a}",
                    "myEnvConfig": "${resolved.b}",
                    "resolved": {
                        "a": 1
                    }
                },
                
                envConfig: {
                    test: {
                        "resolved.b": 2
                    }
                },
                
                extConfig: {
                    more: true
                }
            });
            
            yield container.initialize();
        }));
        
        it("can resolve config", function() {
            assert.notEqual(container, null);
            
            let myConfig = container.config.get("myConfig");
            let pkg = container.config.get("package");
            assert.equal(myConfig, 1);
            assert.equal(pkg.name, "merapi-test");
        });
        
        it("can resolve environment config", function() {
            let myEnvConfig = container.config.get("myEnvConfig");
            assert.equal(myEnvConfig, 2);
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
        }))
        
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