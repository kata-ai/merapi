"use strict";

const lo = require("lodash");
const utils = require("./utils");

/**
 * Config creator
 * 
 * @param {Object} data
 *      Config data
 */
class Config {

    constructor(data, {left = "{", right = "}"} = {}) {
        this.delimiters = {left, right};
        this.data = {};
        this.set(data);
        this.logger = console;
    }

    /**
     * Get configuration entry
     * @param {String} path
     *      configuration path
     * @param {Boolean} ignore (optional)
     *      if set true, won't throw a warning
     *      if no config found at path
     * @return {Any}
     *      config entry, undefined if nothing
     *      found
     */
    get(path, ignore) {

        if (!path) return this.data;
        let val, data = this.data;
        path = path.replace(/^\[/g, "").replace(/\[/g, ".").replace(/\]/g, "");
        let parts = path.split(".").map(o => /^\d+$/.test(o) ? parseInt(o) : o);
        for (let i = 0; i < parts.length; i++) {
            val = data && data[parts[i]];
            if (val === undefined) {
                if (this.parent && this.parent.has(path)) {
                    return this.parent.get(path);
                } else {
                    if (!ignore && this.env == "development")
                        throw new Error("Cannot find config: " + path);
                    return undefined;
                }
            }
            data = val;
        }

        return data;
    }
        /**
         * Set config by path
         * @param {String} path
         *      config path
         * @param {Any} data
         *      config data
         * @param {Boolean} ignore
         */
    set(path, data, ignore) {
        if (arguments.length == 1) {
            for (let i in path) {
                this.set(i, path[i]);
            }
            return path;
        }
        path = path.replace(/^\[/g, "").replace(/\[/g, ".").replace(/\]/g, "");
        if (lo.isObject(data) && !ignore) {
            for (let name in data) {
                this.set(path + "." + name, data[name]);
            }
            return data;
        } else {
            let parts = path.split(".").map(function(o) {
                if (/^\d+$/.test(o)) return parseInt(o);
                return o;
            });
            let current = parts.pop();
            let parent = parts.join(".");
            let parentData = this.get(parent, true);
            if (!lo.isObject(parentData)) {
                if (typeof current == "number")
                    parentData = this.set(parent, [], true);
                else
                    parentData = this.set(parent, {}, true);
            }
            parentData[current] = data;
            return data;
        }
    }

    /**
     * Check if config path exist
     * 
     * @param {String} path
     *      config path
     * @returns {Boolean}
     *      True if path exists
     */
    has(path) {
        return this.get(path, true) !== undefined;
    }
    
    /**
     * Get or use default value
     * @param {String} path
     * @param {Any} def
     * @returns {Any}
     */
    default(path, def) {
        return this.has(path) ? this.get(path) : def;
    }
    
    /**
     * Internal flatten function
     * @param {Object} data
     * @returns {Object}
     */
    _flatten(data) {
        if (!data) data = this.data;
        var obj, res = {};
        if (lo.isArray(data) || lo.isObject(data)) {
            Object.keys(data).forEach(i => {
                if (/^[A-Za-z_\$0-9\.]+$/.test(i) && ((lo.isArray(data[i]) && data[i].length > 0) || (lo.isObject(data[i]) && !lo.isArray(data[i])))) {
                    obj = this._flatten(data[i]);
                    for (var path in obj) {
                        res[i+"."+path] = obj[path];
                    }
                } else {
                    res[i+""] = data[i];
                }
            });
        }
        
        return res;
    }

    /**
     * Flatten config
     * @param {Object} data
     * @returns {Object}
     */
    flatten(data) {
        let res = this._flatten(data);
        let np, ret = {};

        for (let p in res) {
            np = p.replace(/\.(\d+)/g, "[$1]").replace(/\](\d+)\./g, "][$1]").replace(/^(\d+)/, "[$1]");
            ret[np] = this.get(np);
        }

        return ret;
    }

    resolveValue(val, path = "") {
        let tpl = utils.compile(val, this.delimiters);
        let params = {};
        if (tpl.keys.length == 1) {
            let key = val.substring(this.delimiters.left.length, val.length - this.delimiters.right.length);
            if (tpl.keys[0] == key) {
                return this.resolve(key);
            }

        }
        if (tpl.keys.length) {
            for (let i = 0; i < tpl.keys.length; i++) {
                let key = tpl.keys[i];
                let pathArray = path.split(".");
                if (pathArray.length) {
                    pathArray.pop();
                    key = key.replace(/^\$\./, pathArray.join(".") + ".");
                }
                params[tpl.keys[i]] = this.resolve(key);
            }
            return tpl(params);
        }

        return tpl(params);
    }

    /**
     * Resolve config dependency
     * @param {String} path
     * @returns {Object}
     *      value
     */
    resolve(path) {
        if (arguments.length) {
            let val = this.get(path);
            if (typeof val == "string") {
                return this.resolveValue(val, path);
            } else {
                return val;
            }
        }
        let flat = this.flatten();
        let ret = {};
        for (let n in flat) {
            ret[n] = this.set(n, this.resolve(n));
        }
        return ret;
    }
    
    /**
     * Create subconfig by path
     * 
     * @method path
     * @param {String} path
     *      config path
     * @return {Config}
     *      subconfig
     */
    path(path) {
        return this.create(this.get(path));
    }
    
    /**
     * Extend config with data
     * @param {Object} data
     * @returns {Config}
     */
    extend(data) {
        let cfg = Config.create(data);
        let flat = cfg.flatten();
        for (let i in flat) {
            this.set(i, flat[i]);
        }
        return this;
    }
    
    /**
     * Create new config
     * @param {Object} data
     * @returns {Config}
     *      new config
     */
    static create(data, {left = "{", right = "}"} = {}) {
        function config(path, value) {
            if (arguments.length >= 2)
                return config.set(path, value);
            if (typeof path == "string")
                return config.get(path);
            if (typeof path == "object")
                return config.set(path);
            config.logger.error("Invalid input");
        }
        let cfg = new Config(data, {left, right});
        Object.getOwnPropertyNames(Config.prototype).forEach(name => config[name] = Config.prototype[name]);
        lo.extend(config, cfg);

        return config;
    }
    
    /**
     * Create new config
     * @param {Object} data
     * @returns {Config}
     *      new config
     */
    create(data, delimiters) {
        return Config.create(data, delimiters || this.delimiters);
    }
}
module.exports = Config;
