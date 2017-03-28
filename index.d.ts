// Type definitions for merapi
// Project: merapi
// Definitions by: Ahmad Rizqi Meydiarso

declare module "@yesboss/merapi" {

    export default function merapi (options : IContainerOptions) : Container;

    export interface IContainerEventHandlers {
        onBeforePluginInit? : (c : Container) => Promise<void> | void;
        onAfterPluginInit? : (c : Container) => Promise<void> | void;
        onBeforeConfigResolve? : (c : Container) => Promise<void> | void;
        onAfterConfigResolve? : (c : Container) => Promise<void> | void;
        onBeforeComponentRegister? : (name : string, com: any, isObj: boolean) => Promise<void> | void;
        onAfterComponentRegister? : (name : string, desc : {deps:string[], object: any, loader: IClosure<any> | IClass<any>, factory: IClosure<any> | IClass<any>}) => Promise<void> | void;
        onBeforeComponentResolve? : (name : string, deps : IHash<any>, prev : string[]) => Promise<void> | void;
        onAfterComponentResolve? : (name : string, component : any) => Promise<void> | void;
        onComponentInstantiate? : (name : string, component : any) => Promise<void> | void;
        onUncaughtException? : (e : Error) => Promise<void> | void;
    }

    export interface IContainerOptions extends IContainerEventHandlers {
        basepath : string;
        config : Json;
        extConfig? : Json;
        envConfig? : IHash<Json>;
        delimiters? : {left:string, right:string};
    }

    export interface IClass<T> {
        prototype : T;
        new() : T;
    }

    export interface IClass<T> {
        new (...args : any[]) : T;
    }

    export interface IEventHandler {
        (...args : any[]) : void;
    }

    export interface IAsyncEventHandler {
        (...args : any[])  : Promise<void>;
    }

    export interface IComponent {
        initialize() : Promise<void>;
    }

    export interface IClosure<T> {
        (...deps : any []) : T;
    }

    export type Json = null|string|number|boolean|JsonObject|JsonArray;

    export interface JsonObject {
        [x: string]: Json;
    }

    export interface JsonArray extends Array<Json> { }

    export interface IComponentResolver<T> {
        (type : string, options : Json) : T;
    }

    export interface IComponentDescriptor<T> {
        deps?: string[],
        object?: Component,
        factory?: IClosure<T> | IClass<T>,
        loader?: IClosure<T> | IClass<T>
    }

    export interface IHash<T> {
        [i : string] : T;
    }

    export interface IPluginDescriptor {
        [i : string] : Function;
    }

    /**
     * Simple Injectable Component
     */
    export class Component implements IComponent {
        /**
         * Called when component is initialized.
         * Will convert generator functions to promises
         */
        initialize() : Promise<void>;
        /**
         * Create a component
         */
        constructor ();

        static mixin<T>(klass : {new(): T}) : IClass<Component & T>;
    }

    export interface IAsyncEmitter<T> {
        on(event : T, fn : IEventHandler | IAsyncEventHandler, once? : boolean) : number;
        once(event : T, fn : IEventHandler | IAsyncEventHandler) : number;
        removeListener(event : T, id : number) : void;
        emit(event : T, ...args : any[]) : Promise<void>;
    }

    /**
     * Component with asynchronous event emitter
     */
    export class AsyncEmitter<T> implements IAsyncEmitter<T> {
        /**
         * Attach an event handler
         */
        on(event : T, fn : IEventHandler | IAsyncEventHandler, once? : boolean) : number;
        /**
         * Attach an event handler for one trigger
         * only
         */
        once(event : T, fn : IEventHandler | IAsyncEventHandler) : number;
        /**
         * Remove listener by specific id
         */
        removeListener(event : T, id : number) : void;
        /**
         * Emit an event with provided arguments
         * asynchronously
         */
        emit(event : T, ...args : any[]) : Promise<void>;
        /**
         * Create an AsyncEmitter
         */
        constructor();
    }
    
    export interface IContainer {
        alias(aliasName : string, originName : string) : void;
        register<T>(name : string, type : string | IClosure<T> | T, options : boolean | Json) : Promise<void>;
        registerComponentType<T>(type : string, resolver : IComponentResolver<T>) : void;
        resolve<T>(name : string, deps : IHash<any>, prev : string[]) : Promise<T> | null;
        start() : Promise<void>;
        stop() : Promise<void>;
        get<T>(name : string) : Promise<T>;
        initPlugins(desc : string[] | IHash<Json>) : void;
        initPlugin(name : string, options : Json) : void;
        registerPlugin(name : string, plugin : IPluginDescriptor) : void;
        initialize() : Promise<void>;
    }

    export class Container extends AsyncEmitter<string> implements IContainer {
        /**
         * Link component to other name
         */
        alias(aliasName : string, originName : string) : void;
        /**
         * Register a component
         */
        register<T>(name : string, type : string | IClosure<T> | T, options? : boolean | Json) : void;
        /**
         * Register a component type
         */
        registerComponentType<T>(type : string, resolver : IComponentResolver<T>) : void;
        /**
         * Resolve a component
         */
        resolve<T>(name : string, deps : IHash<any>, prev : string[]) : Promise<T> | null;
        /**
         * Start container
         */
        start() : void;
        /**
         * Stop container
         */
        stop() : void;
        /**
         * Get component synchronously
         */
        get<T>(name : string) : T;
        /**
         * Initialize plugins from node_modules
         */
        initPlugins(desc : string[] | IHash<Json>) : void;
        /**
         * Initialize plugin from node_modules
         */
        initPlugin(name : string, options : Json) : void;
        /**
         * Register plugin manually
         */
        registerPlugin(name : string, plugin : IPluginDescriptor) : void;
        initialize() : void;
        /**
         * 
         */
        constructor (options : IContainerOptions);
    }

    export interface IConfigReader {
        <T>(path : string, ignore? : boolean) : T;
        get() : IHash<Json>;
        get<T>(path : string, ignore? : boolean) : T;
        has(path : string) : boolean;
        default<T>(path : string, value : T) : T;
        flatten(data : Json) : IHash<any>;
        path(s : string) : IConfigReader;
        resolve<T>(path : string) : T;
    }

    export interface IConfig extends IConfigReader {
        (path : string | IHash<Json>, value? : any, ignore? : boolean) : void;
        set(path : string | IHash<Json>, value? : any, ignore? : boolean) : void;
        resolve() : void;
        path(s : string) : IConfig;
        extend(data : Json) : IConfig;
        create(data : Json, delimiters? : {left:string, right:string}) : IConfig;
    }

    export class Config {
        get() : IHash<Json>;
        get<T>(path : string, ignore? : boolean) : T;
        set(path : string | IHash<Json>, value? : any, ignore? : boolean) : void;
        has(path : string) : boolean;
        default<T>(path : string, value : T) : T;
        flatten(data : Json) : IHash<any>;
        resolve<T>(path? : string) : T;
        path(s : string) : IConfig;
        extend(data : Json) : IConfig;
        create(data : Json, delimiters? : {left:string, right:string}) : IConfig;
        static create(data : Json, delimiters? : {left:string, right:string}) : IConfig;
        constructor(data : Json, delimiters? : {left:string, right:string});
    }

    export interface ILogger extends Console {

    }

    export interface IInjector {
        getComponentNames() : string[];
        getComponentDescriptor<T>(name : string) : IComponentDescriptor<T>;
        alias(aliasName : string, originalName : string) : void;
        register<T>(name : string, type? : string | IClosure<T> | T | IComponentDescriptor<T>, options? : boolean | Json) : void;
        resolve<T>(name : string, deps? : IHash<any>, prev? : string[]) : Promise<T|null>;
        resolveMethod(str : string) : Function | null;
        execute(fn : Function) : any;
        dependencies(names : string[], deps? : IHash<any>, prev? : string[]) : Component[];
        create(options : IHash<any>) : Injector;
    }

    export class Injector extends Component implements IInjector {
        getComponentNames() : string[];
        getComponentDescriptor<T>(name : string) : IComponentDescriptor<T>;
        alias(aliasName : string, originalName : string) : void;
        register<T>(name : string, type? : string | IClosure<T> | T | IComponentDescriptor<T>, options? : boolean | Json) : void;
        resolve<T>(name : string, deps? : IHash<any>, prev? : string[]) : Promise<T|null>;
        resolveMethod(str : string) : Function | null;
        execute(fn : Function) : any;
        dependencies(names : string[], deps? : IHash<any>, prev? : string[]) : Component[];
        create(options : IHash<any>) : Injector;
        constructor(options : IHash<any>);
    }

    export module utils {
        function instantiate<T>(Class : {new(): T}, args : any[]) : T;
        function isPromise(obj : any) : obj is Promise<any>;
        function isIterator(obj : any) : obj is Iterator<any>;
        function isGeneratorFunction(obj : any) : obj is GeneratorFunction;
        function isArray(obj : any) : obj is Array<any>;
        function getAllPropertyNames(obj : Object) : string[];
        function dependencyNames(fn : Function) : string[];
        function compile(str: string) : (dict : IHash<any>) => string;
        function extend<X, Y>(target: X, origin : Y) : X & Y;
        function extend<X, Y, Z>(target: X, a : Y, b : Z) : X & Y & Z;
    }

    export function async<T>(fn : Function) : (...args: any[]) => Promise<T>;

}