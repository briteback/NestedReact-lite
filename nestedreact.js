import React from 'react';
import { Events, Mixable, Model, define, mergeProps, tools } from 'nestedtypes';

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

        shouldComponentUpdate: function shouldComponentUpdate(nextProps) {
            return isChanged(this._changeTokens, nextProps, this.state);
        },

        componentDidMount: function componentDidMount() {
            this._changeTokens = new ChangeTokens(this.props, this.state);
        },
        componentDidUpdate: function componentDidUpdate() {
            this._changeTokens = new ChangeTokens(this.props, this.state);
        }
    };
}

/*var Nested = require( 'nestedtypes' ),
    React  = require( 'react' );*/

function parseProps(props) {
    var propTypes = {},
        defaults,
        modelProto = Model.defaults(props).prototype;

    modelProto.forEachAttr(modelProto._attributes, function (spec, name) {
        if (name !== 'id') {
            propTypes[name] = translateType(spec.type);

            if (spec.value !== void 0) {
                defaults || (defaults = {});
                defaults[name] = spec.value;
            }
        }
    });

    return {
        propTypes: propTypes,
        defaults: defaults
    };
}

var PropTypes = React.PropTypes;

function Node() {}
function Element() {}

function translateType(Type) {
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

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) {
  return typeof obj;
} : function (obj) {
  return obj && typeof Symbol === "function" && obj.constructor === Symbol ? "symbol" : typeof obj;
};















var get = function get(object, property, receiver) {
  if (object === null) object = Function.prototype;
  var desc = Object.getOwnPropertyDescriptor(object, property);

  if (desc === undefined) {
    var parent = Object.getPrototypeOf(object);

    if (parent === null) {
      return undefined;
    } else {
      return get(parent, property, receiver);
    }
  } else if ("value" in desc) {
    return desc.value;
  } else {
    var getter = desc.get;

    if (getter === undefined) {
      return undefined;
    }

    return getter.call(receiver);
  }
};

















var set = function set(object, property, value, receiver) {
  var desc = Object.getOwnPropertyDescriptor(object, property);

  if (desc === undefined) {
    var parent = Object.getPrototypeOf(object);

    if (parent !== null) {
      set(parent, property, value, receiver);
    }
  } else if ("value" in desc && desc.writable) {
    desc.value = value;
  } else {
    var setter = desc.set;

    if (setter !== undefined) {
      setter.call(receiver, value);
    }
  }

  return value;
};

function processSpec(spec, a_baseProto) {
    var baseProto = a_baseProto || {};
    spec.mixins || (spec.mixins = []);

    processContext(spec, baseProto);
    processAutobind(spec, baseProto);
    processState(spec, baseProto);
    processProps(spec, baseProto);
    processListenToProps(spec, baseProto);

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

var EventsMixin = Object.assign({
    componentWillUnmount: function componentWillUnmount() {
        this.off();
        this.stopListening();

        // Prevent asynchronous rendering if queued.
        this._queuedForUpdate = false;

        // TODO: Enable it in future.
        //if( this.state ) this.state.dispose(); // Not sure if it will work ok with current code base.
    },

    asyncUpdate: asyncUpdate
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
    componentWillMount: function componentWillMount() {
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

/*****************
 * State
 */
function processState(spec, baseProto) {
    // process state spec...
    var attributes = getTypeSpecs(spec, 'state') || getTypeSpecs(spec, 'attributes');
    if (attributes || spec.Model || baseProto.Model) {
        var BaseModel = baseProto.Model || spec.Model || Model;
        spec.Model = attributes ? BaseModel.extend({ defaults: attributes }) : BaseModel;
        spec.mixins.push(ModelStateMixin);
        delete spec.state;
        delete spec.attributes;
    }
}

var ModelStateMixin = {
    model: null,

    _onChildrenChange: function _onChildrenChange() {},

    componentWillMount: function componentWillMount() {
        var state = this.state = this.model = this.props._keepState || new this.Model();
        state._owner = this;
        state._ownerKey = 'state';
    },

    componentDidMount: function componentDidMount() {
        // Start UI updates on state changes.
        this._onChildrenChange = this.asyncUpdate;
    },

    // reference global store to fix model's store locator
    getStore: function getStore() {
        // Attempt to get the store from the context first. Then - fallback to the state's default store.
        // TBD: Need to figure out a good way of managing local stores.
        var context = this.context;
        return context && context.store || this.model._defaultStore;
    },

    componentWillUnmount: function componentWillUnmount() {
        // Release the state model.
        this.model._ownerKey = this.model._owner = void 0;
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
            if ((typeof events === 'undefined' ? 'undefined' : _typeof(events)) === 'object') {
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

var reactMixinRules = {
    componentWillMount: 'reverse',
    componentDidMount: 'reverse',
    componentWillReceiveProps: 'reverse',
    shouldComponentUpdate: 'some',
    componentWillUpdate: 'reverse',
    componentDidUpdate: 'reverse',
    componentWillUnmount: 'sequence'
};

function createClass(a_spec) {
    var spec = processSpec(a_spec),
        mixins = spec.mixins || [];

    delete spec.mixins;

    // We have the reversed sequence for the majority of the lifecycle hooks.
    // So, mixins lifecycle methods works first. It's important.
    // To make it consistent with class mixins implementation, we override React mixins.
    for (var i = 0; i < mixins.length; i++) {
        mergeProps(spec, mixins[i], reactMixinRules);
    }

    var Component = React.createClass(spec);

    // attach lazily evaluated backbone View class
    //defineBackboneProxy( Component );

    return Component;
}

Mixable.mixTo(React.Component);

React.Component.define = function (protoProps, staticProps) {
    var BaseClass = tools.getBaseClass(this),
        staticsDefinition = tools.getChangedStatics(this, 'state', 'props', 'autobind', 'context', 'childContext', 'listenToProps', 'pureRender'),
        combinedDefinition = tools.assign(staticsDefinition, protoProps || {});

    var definition = processSpec(combinedDefinition, this.prototype);

    //defineBackboneProxy( this );

    if (definition.getDefaultProps) this.defaultProps = definition.getDefaultProps();
    if (definition.propTypes) this.propTypes = definition.propTypes;
    if (definition.contextTypes) this.contextTypes = definition.contextTypes;
    if (definition.childContextTypes) this.childsContextTypes = definition.childsContextTypes;

    var protoDefinition = tools.omit(definition, 'getDefaultProps', 'propTypes', 'contextTypes', 'childContextTypes');
    Mixable.define.call(this, protoDefinition, staticProps);

    return this;
};

React.Component.mixinRules(reactMixinRules);

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
var NestedReact = Object.create(React);

// listenToProps, listenToState, model, attributes, Model
//NestedReact.createClass = require( './createClass' );
NestedReact.createClass = createClass;
NestedReact.define = define;

//var ComponentView = require( './component-view' );

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

export default NestedReact;
