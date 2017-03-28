"use strict";

const esprima = require("esprima");

/**
 * Instantiate a class with arguments
 * @param {Class} Class
 * @param {Array} arguments
 * @returns {Object}
 * @private
 */
exports.instantiate = function instantiate(Class, args) {
    return new (Function.prototype.bind.apply(Class, [null].concat(args)))();
};

/**
 * Check if `obj` is a promise.
 *
 * @param {Object} obj
 * @returns {Boolean}
 * @private
 */
exports.isPromise = function isPromise(obj) {
    return obj && "function" == typeof obj.then;
};

/**
 * Check if `obj` is a iterator.
 *
 * @param {Mixed} obj
 * @return {Boolean}
 * @api private
 */

exports.isIterator = function isIterator(obj) {
    return obj && "function" == typeof obj.next && "function" == typeof obj.throw;
};

/**
 * Check if `obj` is a generator function.
 *
 * @param {Mixed} obj
 * @returns {Boolean}
 * @private
 */
exports.isGeneratorFunction = function isGeneratorFunction(obj) {
    let constructor = obj && obj.constructor;
    if (!constructor) return false;
    if ("GeneratorFunction" === constructor.name || "GeneratorFunction" === constructor.displayName) return true;
    return exports.isIterator(constructor.prototype);
};

exports.getAllPropertyNames = function getAllPropertyNames(obj) {
    let props = {};
    do {
        Object.getOwnPropertyNames(obj).forEach(function(name) {props[name] = true;});
    } while ((obj = Object.getPrototypeOf(obj)));

    return Object.keys(props);
};

/**
 * Get dependency names from loader function
 * 
 * @method dependencyNames
 * @param {Function} fn
 *      Loader function
 * @return {Array<String>}
 *      Array of names of the dependency
 */
exports.dependencyNames = function dependencyNames(fn) {
    let ast = esprima.parse("("+fn.toString()+")");
    
    let expression = ast.body[0].expression;
    
    if (expression.type == "FunctionExpression") {
        return expression.params.map(function(param) {
            return param.name;
        });
    }
    
    if (expression.type == "ClassExpression") {
        let constructor = expression.body.body.find(function(item) {
            return item.kind == "constructor";
        });
        
        if (constructor) {
            return constructor.value.params.map(function(param) {
                return param.name;
            });
        }
    }
    
    return [];
};


function escape(str) {
    return str.split("").map(s => "\\"+s).join("");
}


/**
 * Taken and modified from string-template
 * Copyright (c) Matt Esch
 */
exports.compile = function compile(string, { left = "{", right = "}" } = {}) {
    let nargs = new RegExp(escape(left)+"[$0-9_a-zA-Z\\.\\[\\]]+"+escape(right), "g");
    let replacements = string.match(nargs) || [];
    let interleave = string.split(nargs);
    let replace = [];

    for (let i = 0; i < interleave.length; i++) {
        let current = interleave[i];
        let replacement = replacements[i];
        let escapeChar = current.charAt(current.length - 1);

        if (replacement) {
            replacement = replacement.substring(left.length, replacement.length - right.length);
        }

        if (escapeChar === "\\") {
            replace.push(current.substring(0, current.length-1) + left + replacement + right);
        } else {
            replace.push(current);
            if (replacement) {
                replace.push({
                    name: replacement
                });
            }
        }
    }

    let prev = [""];

    for (let j = 0; j < replace.length; j++) {
        let curr = replace[j]

        if (String(curr) === curr) {
            let top = prev[prev.length - 1];

            if (String(top) === top) {
                prev[prev.length - 1] = top + curr;
            } else {
                prev.push(curr);
            }
        } else {
            prev.push(curr);
        }
    }

    replace = prev;

    function template() {
        let args;

        if (arguments.length === 1 && typeof arguments[0] === "object") {
            args = arguments[0];
        } else {
            args = arguments;
        }

        if (!args || !("hasOwnProperty" in args)) {
            args = {};
        }

        let result = [];

        for (let i = 0; i < replace.length; i++) {
            if (i % 2 === 0) {
                result.push(replace[i]);
            } else {
                let argName = replace[i].name;
                let arg = args.hasOwnProperty(argName) ? args[argName] : null;
                if (arg !== null || arg !== undefined) {
                    result.push(arg);
                }
            }
        }

        return result.join("");
    }

    template.keys = [];
    for (let i = 0; i < replace.length; i++) {
        if (i % 2 != 0) {
            template.keys.push(replace[i].name);
        }
    }

    return template;
};

exports.isArray = function isArray(obj) {
    return Object.prototype.toString.call( obj ) === "[object Array]";
};

exports.extend = require("util")._extend;