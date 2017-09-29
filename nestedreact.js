import React$1 from 'react';
import { Events, Mixable, Model, define, tools } from 'nestedtypes';
import PropTypes from 'prop-types';

/*var Nested = require( 'nestedtypes' ),
    React  = require( 'react' );*/

function parseProps(props) {
    var propTypes = {},
        defaults,
        modelProto = Model.defaults(props).prototype;

    modelProto.forEachAttr(modelProto._attributes, function (spec, name) {
        // Skip auto-generated `id` attribute.
        if (name !== 'id') {
            // Translate props type to the propTypes guard.
            propTypes[name] = translateType(spec.type, spec.options.isRequired);

            // If default value is explicitly provided...
            if (spec.value !== void 0) {
                //...append it to getDefaultProps function.
                defaults || (defaults = {});
                defaults[name] = spec.convert(spec.value);
            }
        }
    });

    return {
        propTypes: propTypes,
        defaults: defaults
    };
}

function Node() {}
function Element() {}

function translateType(Type, isRequired) {
    var T = _translateType(Type);
    return isRequired ? T.isRequired : T;
}

function _translateType(Type) {
    switch (Type) {
        case Number:
        case Integer:
            return PropTypes.number;
        case String:
            return PropTypes.string;
        case Boolean:
            return PropTypes.bool;
        case Array:
            return PropTypes.array;
        case Function:
            return PropTypes.func;
        case Object:
            return PropTypes.object;
        case Node:
            return PropTypes.node;
        case Element:
            return PropTypes.element;
        case void 0:
        case null:
            return PropTypes.any;
        default:
            return PropTypes.instanceOf(Type);
    }
}

/*exports.Node = Node;
exports.Element = Element;
exports.parseProps = parseProps;
*/

//module.exports = function( propTypes ){
var pureRender = function (propTypes) {
    var ctor = ['var v;this._s=s&&s._changeToken'],
        isChanged = ['var v;return(s&&s._changeToken!==t._s)'];

    for (var name in propTypes) {
        var propExpr = '((v=p.' + name + ')&&v._changeToken)||v';

        ctor.push('this.' + name + '=' + propExpr);
        isChanged.push('t.' + name + '!==(' + propExpr + ')');
    }

    var ChangeTokens = new Function('p', 's', ctor.join(';')),
        isChanged = new Function('t', 'p', 's', isChanged.join('||'));

    ChangeTokens.prototype = null;

    return {
        _changeTokens: null,

        shouldComponentUpdate(nextProps) {
            return isChanged(this._changeTokens, nextProps, this.state);
        },

        componentDidMount() {
            this._changeTokens = new ChangeTokens(this.props, this.state);
        },
        componentDidUpdate() {
            this._changeTokens = new ChangeTokens(this.props, this.state);
        }
    };
};

function processSpec(spec, a_baseProto) {
    var baseProto = a_baseProto || {};
    spec.mixins || (spec.mixins = []);

    //processStore( spec, baseProto );
    processState(spec, baseProto);
    processContext(spec, baseProto);
    processProps(spec, baseProto);
    processListenToProps(spec, baseProto);
    processAutobind(spec, baseProto);

    spec.mixins.push(EventsMixin);

    return spec;
}

/***
 * Throttled asynchronous version of forceUpdate.
 */
var _queue = null;

function asyncUpdate() {
    if (!_queue) {
        requestAnimationFrame(_processAsyncUpdate);
        _queue = [];
    }

    if (!this._queuedForUpdate) {
        _queue.push(this);
        this._queuedForUpdate = true;
    }
}

function _processAsyncUpdate() {
    var queue = _queue;
    _queue = null;

    for (var i = 0; i < queue.length; i++) {
        var component = queue[i];
        if (component._queuedForUpdate) {
            component._queuedForUpdate = false;
            component.forceUpdate();
        }
    }
}

function returnFalse() {
    return false;
}

/**
 * Mixin which is attached to all components.
 */
var EventsMixin = Object.assign({
    componentWillUnmount() {
        // Prevent memory leaks when working with events.
        this.off();
        this.stopListening();

        // Prevent asynchronous rendering if queued.
        this._queuedForUpdate = false;

        // Mark component as disposed.
        this._disposed = true;
    },

    asyncUpdate,

    /**
     * Performs transactional update for both props and state.
     * Suppress updates during the transaction, and force update aftewards.
     * Wrapping the sequence of changes in a transactions guarantees that
     * React component will be updated _after_ all the changes to the
     * both props and local state are applied.
     *
     * @param fun - takes
     */
    transaction(fun) {
        var shouldComponentUpdate = this.shouldComponentUpdate,
            isRoot = shouldComponentUpdate !== returnFalse;

        if (isRoot) {
            this.shouldComponentUpdate = returnFalse;
        }

        fun(this.props, this.state);

        if (isRoot) {
            this.shouldComponentUpdate = shouldComponentUpdate;
            this.asyncUpdate();
        }
    }
}, Events);

/***
 * Autobinding
 */
function processAutobind(spec, baseProto) {
    if (spec.autobind) {
        spec._autobind = spec.autobind.split(/\s+/).concat(baseProto._autobind || []);
        spec.mixins.push(AutoBindMixin);
        delete spec.autobind;
    }
}

var AutoBindMixin = {
    componentWillMount() {
        var autobind = this._autobind;

        for (var i = 0; i < autobind.length; i++) {
            var name = autobind[i];
            this[name] = this[name].bind(this);
        }
    }
};

function processContext(spec, baseProto) {
    // process context specs...
    var context = getTypeSpecs(spec, 'context');
    if (context) {
        spec._context = tools.defaults(context, baseProto._context || {});
        spec.contextTypes = parseProps(context).propTypes;
        delete spec.context;
    }

    var childContext = getTypeSpecs(spec, 'childContext');
    if (childContext) {
        spec._childContext = tools.defaults(childContext, baseProto._childContext || {});
        spec.childContextTypes = parseProps(childContext).propTypes;
        delete spec.childContext;
    }
}

// Store spec.

/*function processStore( spec, baseProto ){
    var store = getTypeSpecs( spec, 'store' );
    if( store ){
        delete spec.store;

        if( store instanceof Store ){
            // Direct reference to an existing store. Put it to the prototype.
            spec.store = store;
            spec.mixins.push( ExternalStoreMixin );
        }
        else {
            spec.Store = store;
            spec.mixins.push( InternalStoreMixin );
            spec.mixins.push( UpdateOnNestedChangesMixin );
        }

        spec.mixins.push( ExposeStoreMixin );
    }
}*/

var UpdateOnNestedChangesMixin = {
    _onChildrenChange() {},

    componentDidMount() {
        this._onChildrenChange = this.asyncUpdate;
    }
};

/**
 * Attached whenever the store declaration of any form is present in the component.
 */
/*var ExposeStoreMixin = {
    childContext : {
        _nestedStore : Store
    },

    getChildContext : function(){
        return { _nestedStore : this.store };
    },

    getStore : function(){
        return this.store;
    }
};*/

/**
 * External store must just track the changes and trigger render.
 * TBD: don't use it yet.
 */
/*var ExternalStoreMixin = {
    componentDidMount : function(){
        // Start UI updates on state changes.
        this.listenTo( this.store, 'change', this.asyncUpdate );
    }
};

var InternalStoreMixin = {
    componentWillMount : function(){
        var store = this.store = new this.Store();
        store._owner = this;
        store._ownerKey = 'store';
    },

    // Will be called by the store when the lookup will fail.
    get : function( key ){
        // Ask upper store.
        var store = ModelStateMixin.getStore.call( this, key );
        return store && store.get( key );
    },

    componentWillUnmount : function(){
        this.store._ownerKey = this.store._owner = void 0;
        this.store.dispose();
        this.store = null;
    }
};*/

/*****************
 * State
 */
function processState(spec, baseProto) {
    // process state spec...
    var attributes = getTypeSpecs(spec, 'state') || getTypeSpecs(spec, 'attributes');
    if (attributes || spec.Model || baseProto.Model) {
        var BaseModel = baseProto.Model || spec.Model || Model;
        spec.Model = attributes ? typeof attributes === 'function' ? attributes : BaseModel.extend({ defaults: attributes }) : BaseModel;

        spec.mixins.push(ModelStateMixin);
        spec.mixins.push(UpdateOnNestedChangesMixin);

        delete spec.state;
        delete spec.attributes;
    }
}

var ModelStateMixin = {
    model: null,

    componentWillMount() {
        var state = this.state = this.model = this.props._keepState || new this.Model();
        state._owner = this;
        state._ownerKey = 'state';
    },

    /*context : {
        _nestedStore : Store
    },*/

    // reference global store to fix model's store locator
    /*getStore : function(){
        // Attempt to get the store from the context first. Then - fallback to the state's default store.
        // TBD: Need to figure out a good way of managing local stores.
        var context, state;
         return  ( ( context = this.context ) && context._nestedStore ) ||
                ( ( state = this.state ) && state._defaultStore );
    },*/

    componentWillUnmount() {
        // Release the state model.
        this._preventDispose /* hack for component-view to preserve the state */ || this.model.dispose();
    }
};

function processProps(spec, baseProto) {
    // process props spec...
    var props = getTypeSpecs(spec, 'props');

    if (props) {
        spec._props = tools.defaults(props, baseProto._props || {});
        var parsedProps = parseProps(props);

        spec.propTypes = parsedProps.propTypes;

        if (parsedProps.defaults) {
            spec.getDefaultProps = function () {
                return parsedProps.defaults;
            };
        }

        delete spec.props;
    }

    // compile pure render mixin
    if (spec.propTypes && (spec.pureRender || baseProto.pureRender)) {
        spec.mixins.push(pureRender(spec.propTypes));
    }
}

function processListenToProps(spec, baseProto) {
    // process listenToProps spec
    var listenToProps = spec.listenToProps;
    if (listenToProps) {
        if (typeof listenToProps === 'string') {
            spec._listenToPropsArray = listenToProps.split(/\s+/).concat(baseProto._listenToPropsArray || []);
            spec.mixins.unshift(ListenToPropsArrayMixin);
        } else {
            spec._listenToPropsHash = tools.defaults(listenToProps, baseProto._listenToPropsHash || {});
            spec.mixins.unshift(ListenToPropsMixin);
        }

        delete spec.listenToProps;
    }
}

var ListenToPropsMixin = {
    componentDidMount: regHashPropsListeners,
    componentDidUpdate: regHashPropsListeners
};

function regHashPropsListeners(a_prevProps) {
    var prevProps = a_prevProps || {},
        updateOn = this._listenToPropsHash;

    for (var prop in updateOn) {
        registerPropsListener(this, prevProps, prop, updateOn[prop]);
    }
}

var ListenToPropsArrayMixin = {
    componentDidMount: regArrayPropListeners,
    componentDidUpdate: regArrayPropListeners
};

function regArrayPropListeners(a_prevProps) {
    var prevProps = a_prevProps || {},
        updateOn = this._listenToPropsArray;

    for (var i = 0; i < updateOn.length; i++) {
        registerPropsListener(this, prevProps, updateOn[i]);
    }
}

function registerPropsListener(component, prevProps, name, events) {
    var prevEmitter = prevProps[name],
        emitter = component.props[name];

    if (prevEmitter !== emitter) {
        prevEmitter && component.stopListening(prevEmitter);

        if (emitter) {
            if (typeof events === 'object') {
                component.listenTo(emitter, events);
            } else {
                component.listenTo(emitter, events || emitter._changeEventName, asyncUpdate);
            }
        }
    }
}

function getTypeSpecs(spec, name) {
    var attributes = null;

    // Scan through local mixin, and gather specs. Refactor it later, it's not good. At all.
    for (var i = spec.mixins.length - 1; i >= 0; i--) {
        var mixin = spec.mixins[i],
            mixinAttrs = mixin[name];

        if (mixinAttrs) {
            attributes || (attributes = {});
            Object.assign(attributes, mixinAttrs);
        }
    }

    // Merge it with local data.
    var specAttrs = spec[name];
    if (specAttrs) {
        if (attributes) {
            Object.assign(attributes, specAttrs);
        } else {
            attributes = specAttrs;
        }
    }

    return attributes;
}

const reactMixinRules = {
    componentWillMount: 'reverse',
    componentDidMount: 'reverse',
    componentWillReceiveProps: 'reverse',
    shouldComponentUpdate: 'some',
    componentWillUpdate: 'reverse',
    componentDidUpdate: 'reverse',
    componentWillUnmount: 'sequence',
    state: 'merge',
    store: 'merge',
    props: 'merge',
    context: 'merge',
    childContext: 'merge',
    getChildContext: 'mergeSequence'
};

/*export default function createClass( a_spec ){
    var spec = processSpec( a_spec ),
        mixins = spec.mixins || [];

    delete spec.mixins;

    // We have the reversed sequence for the majority of the lifecycle hooks.
    // So, mixins lifecycle methods works first. It's important.
    // To make it consistent with class mixins implementation, we override React mixins.
    for( var i = 0; i < mixins.length; i++ ){
        mergeProps( spec, mixins[ i ], reactMixinRules );
    }

    var Component = React.createClass( spec );

    // attach lazily evaluated backbone View class
    //defineBackboneProxy( Component );

    return Component;
}*/

Mixable.mixTo(React$1.Component);

React$1.Component.define = function (protoProps, staticProps) {
    var BaseClass = tools.getBaseClass(this),
        staticsDefinition = tools.getChangedStatics(this, 'state', 'Model', 'props', 'autobind', 'context', 'childContext', 'listenToProps', 'pureRender'),
        combinedDefinition = tools.assign(staticsDefinition, protoProps || {});

    var definition = processSpec(combinedDefinition, this.prototype);

    //defineBackboneProxy( this );

    if (definition.getDefaultProps) this.defaultProps = definition.getDefaultProps();
    if (definition.propTypes) this.propTypes = definition.propTypes;
    if (definition.contextTypes) this.contextTypes = definition.contextTypes;
    if (definition.childContextTypes) this.childContextTypes = definition.childContextTypes;

    var protoDefinition = tools.omit(definition, 'getDefaultProps', 'propTypes', 'contextTypes', 'childContextTypes');
    Mixable.define.call(this, protoDefinition, staticProps);

    return this;
};

React$1.Component.mixinRules(reactMixinRules);

/*function defineBackboneProxy( Component ){
    Object.defineProperty( Component, 'View', {
        get : function(){
            return this._View || ( this._View = Nested._BaseView.extend( { reactClass : Component } ) );
        }
    } );
}*/

/*var React    = require( 'react' ),
    ReactDOM = require( 'react-dom' ),
    Nested   = require( 'nestedtypes' ),
    $        = Nested.$;
*/
// extend React namespace
//var NestedReact = module.exports = Object.create( React );
const NestedReact = Object.create(React$1);

// listenToProps, listenToState, model, attributes, Model
//NestedReact.createClass = require( './createClass' );
//NestedReact.createClass = createClass;
NestedReact.define = define;

// export hook to override base View class used...
//NestedReact.useView = function( View ){
//    Nested._BaseView = ComponentView.use( View );
//};

//NestedReact.useView( Nested.View );

// React component for attaching views
//NestedReact.subview = require( './view-element' );

//var propTypes  = require( './propTypes' );
NestedReact.Node = Node.value(null);
NestedReact.Element = Element.value(null);

// Extend react components to have backbone-style jquery accessors
//var Component     = React.createClass( { render : function(){} } ),
//    BaseComponent = Object.getPrototypeOf( Component.prototype );

//Object.defineProperties( BaseComponent, {
//    el  : { get : function(){ return ReactDOM.findDOMNode( this ); } },
//    $el : { get : function(){ return $( this.el ); } },
//    $   : { value : function( sel ){ return this.$el.find( sel ); } }
//} );

//NestedReact.Link = require( './nested-link' );
const define$1 = define;

export { define$1 as define };export default NestedReact;
