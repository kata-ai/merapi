"use strict";
const async = require("../async");
const Component = require("../lib/component");
const Injector = require("../lib/injector");
const utils = require("../lib/utils");
const assert = require("assert");
const sleep = require("then-sleep");

/*eslint-env mocha*/

describe("Injector Test", function() {
    let di = new Injector();
    class ComClassTest extends Component {
        constructor(comTest) {
            super();
            this.comTest = comTest;
        }
        
        *testAsync() {
        }
        
        initialize() {
            return async.run(function*() {
                
            });
        }
    }
    
    beforeEach(function() {
        di = new Injector();
    });
    
    describe("Instantiation", function () {
        it("can be successfully instantiated", function() {
            assert.notEqual(di, null);
        });
    });
    
    describe("Registration", function() {
        it("can register inline loader", function () {
            let loader = function (comTest2) {
                comTest2;
            };
            di.register("comTest1", loader);
            
            assert.notEqual(di.components["comTest1"], null);
            assert.equal(di.components.comTest1.loader, loader);
            assert.deepEqual(di.components.comTest1.deps, ["comTest2"]);
        });
        
        it("can register object", function () {
            let object = {
                a: 1
            };
            
            let string = "test";
            di.register("objectTest", object, true);
            di.register("stringTest", string, true);
            
            assert.notEqual(di.components.objectTest, null);
            assert.notEqual(di.components.stringTest, null);
            assert.equal(di.components.objectTest.object, object);
            assert.equal(di.components.stringTest.object, string);
        });
        
        it("can register inline loader", function () {
            let loader = function (comTest2) {
                comTest2;
                return {
                    com: comTest2
                };
            };
            di.register("comTest1", loader);
            
            assert.notEqual(di.components.comTest1, null);
            assert.equal(di.components.comTest1.loader, loader);
            assert.deepEqual(di.components.comTest1.deps, ["comTest2"]);
        });
        
        it("can register inline factory", function () {
            let fac = function ($meta) {
                return {meta:$meta};
            };
            di.register("facTest", {factory:fac});
            
            assert.notEqual(di.components.facTest, null);
            assert.equal(di.components.facTest.factory, fac);
            assert.deepEqual(di.components.facTest.deps, ["$meta"]);
        });
        
        it("can register class", function () {
            di.register("comClassTest", ComClassTest);
            
            assert.notEqual(di.components.comClassTest, null);
            assert.equal(di.components.comClassTest.loader, ComClassTest);
            assert.deepEqual(di.components.comClassTest.deps, ["comTest"]);
        });
    });
    
    describe("Resolution", function () {
        it("should resolve object component", async(function*() {
            let object = {a: 1};
            di.register("objectTest", object, true);
            let res = yield di.resolve("objectTest");
            
            assert.deepEqual(object, res);
        }));
        
        it("should resolve loader component", async(function*() {
            let object = {a: 1};
            
            di.register("comTest", function() {
                return {obj:object};
            });
            
            let com1 = yield di.resolve("comTest");
            let com2 = yield di.resolve("comTest");
            
            assert.equal(com1.obj, object);
            assert.equal(com2.obj, object);
            assert.equal(com1, com2);
        }));
        
        it("should resolve factory component", async(function*() {
            let count = 0;
            di.register("facTest", {factory:function() {
                return {count:++count};
            }});
            
            let com1 = yield di.resolve("facTest");
            let com2 = yield di.resolve("facTest");
            
            assert.equal(com1.count, 1);
            assert.equal(com2.count, 2);
        }));
        
        it("should resolve es6 component", async(function*() {
            di.register("comClassTest", ComClassTest);
            
            di.register("comTest", function() {
                return {a:1};
            });
            
            let com = yield di.resolve("comTest");
            let comClass = yield di.resolve("comClassTest");
            assert.equal(comClass.comTest, com);
            assert.notEqual(utils.isGeneratorFunction(comClass.testAsync), true);
            assert.equal(utils.isPromise(comClass.testAsync()), true);
        }));
        
        it("should detect circular dependency", async(function*() {
            di.register("com1", function(com2){
                return {com:com2};
            });
            
            di.register("com2", function(com3){
                return {com:com3};
            });
            
            di.register("com3", function(com1) {
                return {com:com1};
            });
            
            let err = null;
            
            try { yield di.resolve("com1"); } catch(e) {err = e;}
            
            assert.notEqual(err, null);
            assert.notEqual(err.toString().indexOf("Circular dependency detected"), -1);
            
        }));

        it("should not get race condition", async(function*() {
            class ComX extends Component {
                constructor() {
                    super();
                    this.x = 1;
                }
                *initialize() {
                    yield sleep(100);
                    this.x = 2;
                }
            }
            function ComY(comX) {
                return {x:comX.x};
            }
            di.register("comX", ComX);
            di.register("comY", ComY);

            di.resolve("comX");
            let comY = yield di.resolve("comY");
            assert.equal(comY.x, 2);
        }));
        
        it("should register & resolve alias", async(function*() {
            "use strict";

            di.register("com1", function(){
                return {com:1};
            });
            
            di.alias("com2", "com1");
            
            let com1 = yield di.resolve("com1");
            let com2 = yield di.resolve("com2");
            assert.equal(com1, com2);
        }));

        
        it("should resolve method", async(function*() {
            "use strict";

            di.register("com1", function(){
                let hello = "hello";
                return {
                    com:1, 
                    hello: function(){return hello + this.com;}
                };
            });
            
            let hello = yield di.resolveMethod("com1.hello");
            assert.equal(hello(), "hello1");
        }));
    });
    
    
    describe("Execute", function () {
        it("should execute loader function", async(function*() {
            di.register("com1", function(){
                return {com:1};
            });
            
            di.register("com2", function(com1){
                return {com:com1};
            });
            
            let res = yield di.execute(function(com1, com2) {
                return [com1, com2];
            });
            
            assert.notEqual(res, null);
            assert.notEqual(res[0], null);
            assert.notEqual(res[1], null);
            assert.equal(res[0].com, 1);
            assert.equal(res[1].com.com, 1);
        }));
        
        it("should execute component class", async(function*() {
            "use strict";
            
            let Component = require("../component");
            di.register("com1", function(){
                return {com:1};
            });
            
            di.register("com2", function(com1){
                return {com:com1};
            });
            
            let res = yield di.execute(class Exec extends Component {
                constructor(com1, com2) {
                    super();
                    this.com1 = com1;
                    this.com2 = com2;
                }
            });
            
            assert.notEqual(res, null);
            assert.notEqual(res.com1, null);
            assert.notEqual(res.com2, null);
            assert.equal(res.com1.com, 1);
            assert.equal(res.com2.com.com, 1);
        }));
    });
});