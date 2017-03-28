"use strict";

const async = require("../async");
const assert = require("assert");
const Config = require("../lib/config");

/*eslint-env mocha*/

describe("Config Test", function() {
    
    let config = Config.create({
        "init": "data"
    });
    
    before(async(function*() {
        config = Config.create({
            "init": "data",
            "more.init": "more"
        });
    }));
    
    it("successfully initialize", async(function* () {
        assert.notEqual(config, null);
        assert.equal(typeof config, "function");
        assert.equal(typeof config.set, "function");
        assert.equal(typeof config.get, "function");
    }));
    
    it("can get initialized data", async(function* () {
        assert.equal(config("init"), "data");
        assert.equal(config("more").init, "more");
        assert.equal(config("more.init"), "more");
    }));
    
    it("can set data", async(function* () {
        config("more.a", "a");
        config("more.b", "b");
        config("more.c", {x:1});
        assert.equal(config("more").a, "a");
        assert.equal(config("more.b"), "b");
        assert.equal(config("more.c.x"), 1);
    }));
    
    it("can resolve data", async(function* () {
        config("more.a", "{more.b}");
        config("more.b", "{more.c.x}");
        config("more.c", {x:1});
        config("more.escape", "\\{escaped}");
        
        assert.equal(config.resolve("more.a"), 1);
        assert.equal(config.resolve("more.b"), 1);
        assert.equal(config("more.a"), "{more.b}");
        assert.equal(config("more.escape"), "\\{escaped}");
        
        config.resolve();
        
        assert.equal(config("more").a, 1);
        assert.equal(config("more.b"), 1);
        assert.equal(config("more.c.x"), 1);
        assert.equal(config("more.escape"), "{escaped}");
    }));
    
    it("can use alternative delimiter", async(function* () {
        let config = Config.create({}, {left:"${", right:"}"});
        config("more.a", "${more.b}");
        config("more.b", "${more.c.x}");
        config("more.c", {x:1});
        config("more.escape", "\\${escaped}");
        
        assert.equal(config.resolve("more.a"), 1);
        assert.equal(config.resolve("more.b"), 1);
        assert.equal(config("more.a"), "${more.b}");
        assert.equal(config("more.escape"), "\\${escaped}");
        
        config.resolve();
        
        assert.equal(config("more").a, 1);
        assert.equal(config("more.b"), 1);
        assert.equal(config("more.c.x"), 1);
        assert.equal(config("more.escape"), "${escaped}");
    }));
    
    it("can check value exist", async(function* () {
        assert.equal(config.has("init"), true);
        assert.equal(config.has("nothing"), false);
    }));
    
    it("can default to value", async(function* () {
        assert.equal(config.default("init", "init"), "data");
        assert.equal(config.default("a.b", "nothing"), "nothing");
    }));
    
    it("can flatten config", async(function* () {
        config.set("test", {a:1, b:{c:2}});
        let flat = config.flatten();
        assert.equal(flat["test.a"], 1);
        assert.equal(flat["test.b.c"], 2);
    }));
});