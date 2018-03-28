"use strict";
const async = require("./async");
const isClass = require("is-class");
const utils = require("./utils");
const Component = require("./component");
const AsyncEmitter = require("./async_emitter");


class Injector extends Component.mixin(AsyncEmitter) {
    /**
     * Dependency Injection
     * @constructor
     * 
     * @param {string} basepath
     * @param {string[]} paths
     */
    constructor(options) {
        super();
        options = options || {};
        this.parent = options.parent || null;
        this.components = {};
        this._resolveLock = {};
        this.logger = options.logger || (this.parent && this.parent.logger) || console;
    }

    /**
     * Get component names
     * @returns {string}
     *      component names
     */
    getComponentNames() {
        return Object.keys(this.components);
    }

    /**
     * Get the descriptor of a component.
     * @param {String} name
     *      name of the component to be registered
     */
    getComponentDescriptor(name) {
        return this.components[name] ? Object.assign({}, this.components[name]) : null;
    }

    alias(aliasName, originalName) {
        let desc = this.getComponentDescriptor(originalName);
        if (!desc)
            throw new Error(`Cannot resolve alias ${aliasName}: component ${originalName} not found`); 
        this.components[aliasName] = {ref:originalName};
    }

    /**
     * Register component to the dependency injection
     * container.
     * @param {String} name
     *      name of the component to be registered
     * @param {Object} component
     *      the component loader to be registered
     * @param {Boolean} isObj
     *      set to true, if component is not a loader
     */
    register(name, component, isObj) {
        this.emit("beforeRegister", name, component, isObj);
        if (component && component.__esModule && component.default)
            component = component.default;
        if (isObj) {
            this.components[name] = {
                deps: [],
                object: component
            };
        } else if (typeof component == "function") {
            this.components[name] = {
                deps: utils.dependencyNames(component),
                loader: component
            };
        } else if (typeof component == "object") {
            if (typeof component.loader == "function" || typeof component.factory == "function") {
                component = utils.extend({}, component);
                this.components[name] = component;
                component.deps = (component.deps && component.deps.length) ?
                    component.deps : utils.dependencyNames(component.loader || component.factory);
            } else if(component.ref && this.components[component.ref]) {
                this.components[name] = {ref: component.ref};
            }
        }

        if (!this.components[name]) {
            throw new Error("Cannot register component '" + name + "'");
        }

        if (utils.isGeneratorFunction(this.components[name].loader))
            this.components[name].loader = async(this.components[name].loader);
        if (utils.isGeneratorFunction(this.components[name].factory))
            this.components[name].factory = async(this.components[name].factory);

        this.emit("afterRegister", name, this.components[name]);
    }

    *resolve(name, extra, prev) {
        prev = prev ? Array.prototype.slice.call(prev) : [];
        if (prev.indexOf(name) > -1) {
            prev.push(name);
            throw new Error("Circular dependency detected for " + name + ": " + prev.join("->"));
        }
        prev.push(name);
        
        if (this._resolveLock[name])
            yield this._resolveLock[name];
        this._resolveLock[name] = this._resolve(name, extra, prev)
            .then((result) => {
                delete this._resolveLock[name];
                return result;
            })
            .catch((err) => {
                delete this._resolveLock[name];
                return Promise.reject(err);
            });
        return yield this._resolveLock[name];
    }

    /**
     * Resolve a component by name
     * 
     * @param {String} name
     *      Component name to be resolved
     * @param {Object} extra
     *      Optional extra dependencies to be injected
     * @return {Object}
     *      Component object
     */
    *_resolve(name, extra, prev) {
        let com = this.components[name];
        yield this.emit("beforeResolve", name, extra, prev);
        if (!com) {
            if (this.parent) {
                return yield this.parent.resolve(name, extra);
            } else {
                let errMsg = "Cannot resolve " + name + ": component not registered.";
                if (prev && prev.length)
                    errMsg += "\nrequired by: " + prev.join("->");
                throw new Error(errMsg);
            }
        }

        if (com.ref)
            return yield this.resolve(com.ref, extra, prev);

        extra = extra ? utils.extend({}, extra) : {};
        let meta = {
            name: name
        };

        if (extra.$meta)
            meta.caller = extra.$meta.name;
        extra.$meta = meta;

        if (!com.object) {
            let deps;
            try {
                deps = yield this.dependencies(com.deps, extra, prev);
            } catch(e) {
                throw e;
            }
            if (com.factory) {
                let res;
                if (isClass(com.factory)) {
                    res = utils.instantiate(com.factory, deps);
                    if (typeof res._initialize == "function")
                        yield res._initialize(this, extra, prev);
                } else {
                    res = com.factory.apply({}, deps);
                }
                if (utils.isPromise(res))
                    return yield res;
                else
                    return res;
            }
            if (com.loader) {
                if (isClass(com.loader)) {
                    com.object = utils.instantiate(com.loader, deps);
                    if (typeof com.object._initialize == "function")
                        yield com.object._initialize(this, extra, prev);
                } else {
                    com.object = com.loader.apply({}, deps);
                }
                if (utils.isPromise(com.object))
                    com.object = yield com.object;
            }

            if (com.object)
                yield this.emit("instantiate", name, com.object);
        }
        if (!com.object) {
            throw new Error(`Cannot resolve component ${name}`);
        }
        yield this.emit("afterResolve", name, com.object);
        return com.object;
    }

    *resolveMethod(str) {
        let splitted = str.split(".");
        let com = yield this.resolve(splitted[0]);
        if (com && com[splitted[1]] && typeof com[splitted[1]] === "function")
            return com[splitted[1]].bind(com);
        throw new Error(`Cannot find function '${splitted[1]}' of component '${splitted[0]}'`);
    }

    reflect(name) {
        let com = this.components[name];
        if (com.ref)
            return this.reflect(com.ref);
        let Constructor = com.loader || com.factory;
        if (!Constructor || !Constructor.reflect) return null;
        return Constructor.reflect();
    }

    /**
     * Execute a function using dependency injection
     * 
     * @method execute
     * @async
     * @param {Function} fn
     *      function to be executed
     * @return {Object}
     *      return object of the function
     */
    *execute(fn) {
        let depNames = utils.dependencyNames(fn);
        let deps = [];
        for (let i = 0; i < depNames.length; i++) {
            let dep = yield this.resolve(depNames[i]);
            if (!dep) return null;
            deps.push(dep);
        }

        if (fn.prototype instanceof Component) {
            let res = utils.instantiate(fn, deps);
            yield res._initialize(this);
            return res;
        } else {
            return fn.apply({}, deps);
        }
    }

    /**
     * Get the dependencies of a component
     * 
     * @method dependencies
     * @async
     * @param {String} name
     *      Component name
     * @param {Object} extra
     *      Optional extra dependencies to be injected
     * @return {Array<Component>}
     *      Array of dependency components
     */
    *dependencies(names, extra, prev) {
        let dep, deps = [];
        for (let i = 0; i < names.length; i++) {
            if (names[i] in extra) {
                dep = extra[names[i]];
            } else {
                dep = yield this.resolve(names[i], extra, prev);
            }
            deps.push(dep);
        }
        return deps;
    }

    create(options) {
        return new Injector(options);
    }
}

module.exports = Injector;
