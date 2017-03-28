"use strict";

const async = require("./async");
const utils = require("./utils");
const sync = require("./sync");

class AsyncEmitter {

    on(event, fn, once) {
        if (!this._counter)
            this._counter = 0;
        if (!this._events)
            this._events = {};
        let id = ++this._counter;
        if (!this._events[event])
            this._events[event] = [];
        if (utils.isGeneratorFunction(fn))
            fn = async(fn);
        this._events[event].push({ fn, once, id });
        return id;
    }

    once(event, fn) {
        return this.on(event, fn, true);
    }

    removeListener(event, id) {
        if (!this._events) return;
        if (this._events[event]) {
            this._events[event] = this._events[event].filter(item => item.id !== id);
        }
    }

    *emit(event, ...args) {
        if (!this._events) return;
        let events = this._events[event];
        if (!events) return;
        let newEvents = [];
        for (let i = 0; i < events.length; i++) {
            let ret = events[i].fn.apply(null, args);
            if (utils.isPromise(ret))
                yield ret;
            if (!events[i].once)
                newEvents.push(events[i]);
        }
        this._events[event] = newEvents;
    }

    emitSync(event, ...args) {
        sync(this.emit(event, ...args));
    }

}

AsyncEmitter.prototype.emit = async(AsyncEmitter.prototype.emit);
module.exports = AsyncEmitter;