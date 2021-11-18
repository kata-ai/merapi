"use strict";

const lo = require("lodash");
const utils = require("./utils");

function trimify(str) {
    if (typeof str === "string" || str instanceof String) {
        return str.trim();
    }
    return str;
}

/**
 * Config creator
 * 
 * @param {Object} data
 *      Config data
 */
class Config {

    constructor(data, {left = "{", right = "}", lazy = false, recursive=true} = {}) {
        this.lazy = lazy;
        this.delimiters = {left, right};
        this.recursive = recursive;
        this.data = {};
        if (lazy)
            this.data = data;
        else
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
        let parts = path.split(".").map(o => /^([0-9]|[1-9][0-9]+)$/.test(o) ? parseInt(o) : o);
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
        data = trimify(data);
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
                if (/^([0-9]|[1-9][0-9]+)$/.test(o)) return parseInt(o);
                return o;
            });
            let current = parts.pop();
            let parent = parts.join(".");
            let parentData = this.get(parent, true);
            if (!lo.isObject(parentData)) {
                if (typeof current == "number" && current === 0)
                    parentData = this.set(parent, [], true);
                else
                    parentData = this.set(parent, {}, true);
            }
            if (utils.isArray(parentData) && typeof current === "number" && current !== 0 && parentData[current-1] === undefined) {
                parentData = this.set(parent, Object.assign({},parentData), true);
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
                if (/^[A-Za-z_$0-9\.\(\)\,]+$/.test(i) && ((lo.isArray(data[i]) && data[i].length > 0) || (lo.isObject(data[i]) && !lo.isArray(data[i])))) {
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
                return this.recursive ? this.resolve(key) : this.get(key);
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
                params[tpl.keys[i]] = this.recursive ? this.resolve(key) : this.get(key);
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
    resolve(path, recursive = true) {
        if (arguments.length) {
            let val = this.get(path);
            if (typeof val == "string") {
                return this.resolveValue(val, path);
            } else if (typeof val == "object" && recursive) {
                let subset = this.create({subset:val}, {lazy:false});
                let flat = subset._flatten();
                for (let n in flat) {
                    let p = n.split(".");
                    p.shift();
                    subset.set(n, this.resolve(path+"."+p.join(".")), true);
                }
                let res = subset.get("subset");
                return res;
            } else {
                return val;
            }
        }
        let flat = this.flatten();
        let ret = {};
        for (let n in flat) {
            ret[n] = this.set(n, this.resolve(n, false));
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
    path(path, opts) {
        return this.create(this.get(path), opts);
    }
    
    /**
     * Extend config with data
     * @param {Object} data
     * @returns {Config}
     */
    extend(data) {
        let cfg = Config.create(data, this.delimiters);
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
    static create(data, opts) {
        function config(path, value) {
            if (arguments.length >= 2)
                return config.set(path, value);
            if (typeof path == "string")
                return config.get(path);
            if (typeof path == "object")
                return config.set(path);
            config.logger.error("Invalid input");
        }
        let cfg = new Config(data, opts);
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
    create(data, opts) {
        return Config.create(data, Object.assign({lazy:this.lazy, recursive:this.recursive}, this.delimiters, opts));
    }
}
module.exports = Config;
