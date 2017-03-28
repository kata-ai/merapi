"use strict";

const async = require("./lib/async");
const sync = require("./lib/sync");
const path = require("path");
const snake = require("to-snake-case");

const AsyncEmitter = require("./lib/async_emitter");
const Config = require("./lib/config");
const Injector = require("./lib/injector");
const Component = require("./lib/component");
const utils = require("./lib/utils");

function merapi(options) {
    return new Container(options);
}

class Container extends Component.mixin(AsyncEmitter) {

    constructor(options) {
        super();

        this.logger = console;

        this.types = {};
        this.plugins = {};
        this._loadOnStartList = [];
        this._isInitialized = false;

        this.registerComponentType("component", this.resolveComponentDescriptor.bind(this));
        this.registerComponentType("alias", this.resolveAliasDescriptor.bind(this));

        this.options = options;
        this.basepath = options.basepath;

        for (let i in options) {
            if (/^on[A-Z].*/.test(i)) {
                let eventName = i.substring(2);
                eventName = eventName.charAt(0).toLowerCase() + eventName.substring(1);
                this.on(eventName, options[i].bind(this));
            }
        }

        this.emitSync("beforeConstruct", this);

        this.emitSync("beforeConfigCreate", this);
        this.config = Config.create(this.options.config, this.options.delimiters || { left: "{", right: "}" });

        this.config.env = process.env.NODE_ENV || "development";
        this.config.set("env", this.config.env);
        Object.keys(process.env).forEach(key => {
            this.config.set("ENV." + key, process.env[key]);
            this.config.set("$" + key, process.env[key]);
        });

        if (this.options.envConfig && this.options.envConfig[this.config.env])
            this.config.extend(this.options.envConfig[this.config.env]);

        if (this.options.extConfig)
            this.config.extend(this.options.extConfig);

        this.emit("afterConfigCreate", this);

        this.emitSync("beforeInjectorCreate", this);
        this.injector = new Injector();
        this.injector.on("beforeRegister", this.emit.bind(this, "beforeComponentRegister"));
        this.injector.on("afterRegister", this.emit.bind(this, "afterComponentRegister"));
        this.injector.on("beforeResolve", this.emit.bind(this, "beforeComponentResolve"));
        this.injector.on("afterResolve", this.emit.bind(this, "afterComponentResolve"));
        this.injector.on("instantiate", this.emit.bind(this, "componentInstantiate"));
        this.injector.register("basepath", this.basepath, true);
        this.injector.register("config", this.config, true);
        this.injector.register("injector", this.injector, true);
        this.injector.register("container", this, true);
        this.injector.register("logger", require("./lib/logger"));
        this.emitSync("afterInjectorCreate", this);

        this.emitSync("beforeConfigResolve", this);
        this.config.resolve();
        this.emitSync("afterConfigResolve", this);

        this.emitSync("beforePluginInit", this);
        this.initPlugins(this.options.plugins);
        this.initPlugins(this.config.default("plugins", {}));
        this.emitSync("afterPluginInit", this);

        process.setMaxListeners(0);
        process.on("exit", this.emit.bind(this, "exit"));
        process.on("SIGTERM", this.emit.bind(this, "exit"));
        this.on("exit", this.stop.bind(this));
        this.on("uncaughtException", this.handleUncaughtException.bind(this));
        process.on("uncaughtException", this.emit.bind(this, "uncaughtException"));
        process.on("unhandledRejection", this.emit.bind(this, "uncaughtException"));

        this.emitSync("afterConstruct", this);
    }

    handleUncaughtException(e) {
        this.logger.error(e);
    }

    alias(aliasName, oriName) {
        return this.injector.alias(aliasName, oriName);
    }

    register(name, type, options) {
        if (typeof options == "boolean")
            return this.injector.register(name, type, options);
        if (typeof type == "function")
            return this.injector.register(name, type);

        return this.injector.register(name, this.loadComponent(name, type, options));
    }

    registerComponentType(type, resolver) {
        this.types[type] = resolver;
    }

    loadComponent(name, type, options) {
        let resolver = this.types[type];
        if (!resolver)
            throw new Error("Cannot register component of unknown type: " + type);
        return resolver(name, options);
    }

    resolve() {
        return this.injector.resolve.apply(this.injector, arguments);
    }

    resolveComponentDescriptor(com, opt) {
        let paths = this.config.default("merapi.injector.paths", "./components");
        if (typeof paths == "string")
            paths = [paths];
        let error = null;
        for (let i = 0; i < paths.length; i++) {
            let split = opt.path.split("/");
            let name = split.pop();
            let folder = split.join("/");
            let p = path.resolve(this.basepath, paths[i], folder, snake(name));
            try {
                return require(p);
            } catch (e) {
                error = e;
            }
        }
        if (error)
            throw error;
    }

    resolveAliasDescriptor(com, opt) {
        return { ref: opt.ref };
    }

    initialize() {
        if (this._isInitialized) return;
        this.emitSync("beforeInit", this);
        this.emitSync("beforeComponentsRegister", this);
        this._isInitialized = true;

        for (let i in this.plugins) {
            let plugin = this.plugins[i];
            if (typeof plugin.initialize == "function") {
                if (utils.isGeneratorFunction(plugin.initialize))
                    plugin.initialize = async(plugin.initialize);
                let ret = plugin.initialize(this);
                if (utils.isPromise(ret))
                    sync(ret);
            }
        }

        let componentDefinition = this.config.default("components", {});
        for (let name in componentDefinition) {
            let opt = componentDefinition[name];
            if (typeof opt == "string") {
                opt = {
                    path: opt,
                    type: "component"
                };
            } else if (typeof opt != "object") {
                throw new Error("Invalid component definition for " + name);
            }
            this.register(name, opt.type, opt);
            if (opt.load)
                this._loadOnStartList.push(name);
        }
        this.emitSync("afterComponentsRegister", this);

        this.emitSync("init", this);

        this.config.logger = sync(this.injector.resolve("logger", { $meta: { caller: "config" } }));
        this.injector.logger = sync(this.injector.resolve("logger", { $meta: { caller: "injector" } }));
        this.logger = sync(this.injector.resolve("logger", { $meta: { caller: "container" } }));

        this.emitSync("afterInit", this);
    }

    start() {
        this.emitSync("beforeStart", this);
        let main = this.config("main");

        this.initialize();
        if (!main) {
            this.logger.warn("No main defined");
            return;
        }

        for (let i = 0; i < this._loadOnStartList.length; i++)
            sync(this.injector.resolve(this._loadOnStartList[i]));

        this.emitSync("start", this);
        if (main) {
            let com = this.get(main);
            let argv = [].concat(process.argv);
            if (com) {
                if (com.start) {
                    let res;
                    if (utils.isGeneratorFunction(com.start))
                        res = async(com.start).apply(com, [argv]);
                    else
                        res = com.start(argv);
                    if (utils.isPromise(res))
                        sync(res);
                } else {
                    this.logger.warn("Main component doesn't have start function");
                }
            } else {
                this.logger.warn(`Main component ${main} not found`);
            }
        }

        this.emitSync("afterStart", this);
    }

    get(name) {
        let main = this.config("main");
        this.initialize();
        if (!name)
            return sync(this.resolve(main));
        else
            return sync(this.resolve(name));
    }

    stop() {
        this.emitSync("beforeStop", this);
        this.emitSync("stop", this);
        this.emitSync("afterStop", this);
    }

    initPlugins(desc) {
        if (utils.isArray(desc)) {
            desc.forEach(plugin => this.initPlugin(plugin, {}));
        } else if (typeof desc === "object") {
            Object.keys(desc).forEach(plugin => {
                if (desc[plugin]) {
                    let options = typeof desc[plugin] === "object" ? desc[plugin] : {};
                    this.initPlugin(plugin, options);
                }
            });
        }
    }

    initPlugin(name, options) {
        let plugin;
        let split = name.split("@");
        if (split.length > 1) {
            let org = split[1];
            let name = split[0];
            plugin = require(`@${org}/merapi-plugin-${name}`)(this, options);
        } else {
            plugin = require(`merapi-plugin-${name}`)(this, options);
        }
        if (plugin.dependencies)
            plugin.dependencies.forEach(dep => {
                if (!this.plugins[dep])
                    this.initPlugin(dep);
            });
        this.registerPlugin(name, plugin);
    }

    registerPlugin(name, plugin) {
        if (this.plugins[name])
            return;
        this.plugins[name] = plugin;

        for (let i in plugin) {
            if (/^type[A-Z]\w*/.test(i)) {
                let typeName = i.substring(4);
                typeName = typeName.charAt(0).toLowerCase() + typeName.substring(1);
                this.registerComponentType(typeName, plugin[i].bind(plugin));
            }
            if (/^on[A-Z]\w*/.test(i)) {
                if (utils.isGeneratorFunction(plugin[i]))
                    plugin[i] = async(plugin[i]);
                let eventName = i.substring(2);
                eventName = eventName.charAt(0).toLowerCase() + eventName.substring(1);
                this.on(eventName, plugin[i].bind(plugin));
            }
            if (!/Generator$/.test(i) && utils.isGeneratorFunction(plugin[i])) {
                plugin[i] = async(plugin[i]);
            }
        }
    }
}

merapi.Container = Container;
merapi.Component = Component;
merapi.AsyncEmitter = AsyncEmitter;
merapi.Injector = Injector;
merapi.Config = Config;
merapi.utils = utils;
merapi.async = async;
merapi.sync = sync;
merapi.default = merapi;


Object.defineProperty(merapi, "__esModule", { value: true });
module.exports = merapi;