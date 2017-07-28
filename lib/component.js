"use strict";
const async = require("./async");
const utils = require("./utils");

class Reflection {

}

class Component {
    
    /**
     * Component base class
     * @constructor
     */
    constructor() {
        utils.getAllPropertyNames(this).forEach( i => {
            if (!/Generator$/.test(i) && utils.isGeneratorFunction(this[i])) {
                this[i] = async(this[i]);
            }
        });
    }
    
    *_initialize(injector, extra, prev) {
        if (this.__deps) {
            for (const i in this.__deps) {
                this[i] = yield injector.resolve(this.__deps[i], extra, prev);
            }
        }
        
        yield this.initialize();
    }
    
    *initialize() {
        
    }

    *destroy() {
        
    }

    static reflect() {
        if (this.__reflection__)
            return this.__reflection__;
        let Parent = Object.getPrototypeOf(this.prototype);
        if (Parent.reflect)
            this.__reflection__ = new Reflection(this.toString(), Parent.reflect());
        else
            this.__reflection__ = new Reflection(this.toString());
        
        return this.__reflection__;
    }

    static mixin(klass) {
        class derived extends this {}
        Object.getOwnPropertyNames(klass.prototype).forEach(name => {
            derived.prototype[name] = klass.prototype[name];
        });
        return derived;
    }
}

module.exports = Component;