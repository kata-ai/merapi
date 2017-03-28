"use strict";
const utils = require("../lib/utils");
const assert = require("assert");

/*global Promise*/
/*eslint-env mocha*/

describe("Util Test", function() {
    
    it("#isGeneratorFunction()", function(done) {
        
        function* gen() {
            let i = 0;
            while(i < 1000) yield i++;
        }
        
        assert(utils.isGeneratorFunction(gen), true);
        
        done();
    });
    
    it("#isGenerator()", function(done) {
        
        function* gen() {
            let i = 0;
            while(i < 1000) yield i++;
        }
        
        assert(utils.isGeneratorFunction(gen()), true);
        
        done();
    });
    
    it("#isPromise()", function(done) {
        
        let promise = new Promise(function(resolve) {
            resolve();
        });
        
        assert(utils.isPromise(promise), true);
        
        done();
    });
    
    it("#getAllPropertyNames()", function(done) {
        
        class A {
            
            a() {
                
            }
            
        }
        
        class B extends A {
            b() {
                
            }
        }
        
        let b = new B();
        let keys = Object.keys(b);
        let props = utils.getAllPropertyNames(b);
        
        assert.equal(keys.indexOf("a"), -1);
        assert.equal(keys.indexOf("b"), -1);
        assert.notEqual(props.indexOf("a"), -1);
        assert.notEqual(props.indexOf("b"), -1);
        
        done();
    });
    
    it("#dependencyNames()", function(done) {
        
        class Deps {
            test() {
                
            }
            constructor(a, b) {
                a;
                b;
            }
            xxx() {
                
            }
        }
        
        function deps(b,c) {
            b;
            c;
        }
        
        assert.deepEqual(utils.dependencyNames(deps), ["b", "c"]);
        assert.deepEqual(utils.dependencyNames(Deps), ["a", "b"]);
        
        done();
    });
    
    it("#instantiate()", function(done) {
        
        class Class {
            
            constructor(a, b) {
                this.a = a;
                this.b = b;
            }
            
        }
        
        let obj = utils.instantiate(Class, ["a", "b"]);
        
        assert.notEqual(obj, null);
        assert.equal(obj.a, "a");
        assert.equal(obj.b, "b");
        
        done();
    });
    
    it("#compile()", function(done) {
        
        let template = utils.compile("Hello {you}! My name is {me}.");
        
        assert.equal(typeof template, "function");
        assert.equal(template({you:"Bill", me:"Steve"}), "Hello Bill! My name is Steve.");
        assert.equal(template({you:"Bill"}), "Hello Bill! My name is .");
        
        done();
    });
    
});