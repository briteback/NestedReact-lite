var Nested = require( 'nestedtypes' ),
    pureRender = require( './purerender-mixin' ),
    propTypes  = require( './propTypes' ),
    tools = Nested.tools;

module.exports = function processSpec( spec, a_baseProto ){
    var baseProto = a_baseProto || {};
    spec.mixins || ( spec.mixins = [] );

    processContext( spec, baseProto );
    processAutobind( spec, baseProto );
    processState( spec, baseProto );
    processProps( spec, baseProto );
    processListenToProps( spec, baseProto );

    spec.mixins.push( EventsMixin );

    return spec;
}

/***
 * Throttled asynchronous version of forceUpdate.
 */
var _queue = null;

function asyncUpdate(){
    // For some weird reason async update doesn't work. Input's state is being messed up.
    // Just call forceUpdate for now.
    this.forceUpdate();
}

var EventsMixin = Object.assign( {
    componentWillUnmount : function(){
        this.off();
        this.stopListening();
        
        // Prevent asynchronous rendering if queued.
        this._queuedForUpdate = false;

        // TODO: Enable it in future.
        //if( this.state ) this.state.dispose(); // Not sure if it will work ok with current code base.
    },

    asyncUpdate : asyncUpdate
}, Nested.Events );

/***
 * Autobinding
 */
function processAutobind( spec, baseProto ){
    if( spec.autobind ){
        spec._autobind = spec.autobind.split( /\s+/ ).concat( baseProto._autobind || [] );
        spec.mixins.push( AutoBindMixin );
        delete spec.autobind;
    }
}

var AutoBindMixin = {
    componentWillMount : function(){
        var autobind = this._autobind;
        
        for( var i = 0; i < autobind.length; i++ ){
            var name = autobind[ i ];
            this[ name ] = this[ name ].bind( this );
        }
    }
}

function processContext( spec, baseProto ){
    // process context specs...
    var context = getTypeSpecs( spec, 'context' );
    if( context ){
        spec._context = tools.defaults( context, baseProto._context || {} );
        spec.contextTypes = propTypes.parseProps( context ).propTypes;
        delete spec.context;
    }

    var childContext = getTypeSpecs( spec, 'childContext' );
    if( childContext ){
        spec._childContext = tools.defaults( childContext, baseProto._childContext || {} );
        spec.childContextTypes = propTypes.parseProps( childContext ).propTypes;
        delete spec.childContext;
    }
}

/*****************
 * State
 */
function processState( spec, baseProto ){
    // process state spec...
    var attributes = getTypeSpecs( spec, 'state' ) || getTypeSpecs( spec, 'attributes' )
    if( attributes || spec.Model || baseProto.Model ){
        var BaseModel = baseProto.Model || spec.Model || Nested.Model;
        spec.Model    = attributes ? BaseModel.extend( { defaults : attributes } ) : BaseModel;
        spec.mixins.push( ModelStateMixin );
        delete spec.state;
        delete spec.attributes;
    }
}

var ModelStateMixin = {
    model         : null,

    _onChildrenChange : function(){},

    componentWillMount : function(){
        var state = this.state = this.model = this.props._keepState || new this.Model();
        state._owner = this;
    },

    componentDidMount : function(){
        this._onChildrenChange = this.asyncUpdate;
    },

    // reference global store to fix model's store locator
    getStore : function(){
        return this.model._defaultStore;
    },

    componentWillUnmount : function(){
        this.model._owner = null;
    }
};

function processProps( spec, baseProto ){
    // process props spec...
    var props = getTypeSpecs( spec, 'props' );

    if( props ){
        spec._props = tools.defaults( props, baseProto._props || {} );
        var parsedProps = propTypes.parseProps( props );

        spec.propTypes = parsedProps.propTypes;

        if( parsedProps.defaults ){
            spec.getDefaultProps = function(){
                return parsedProps.defaults;
            }
        }

        delete spec.props;
    }

    // compile pure render mixin
    if( spec.propTypes && ( spec.pureRender || baseProto.pureRender ) ){
        spec.mixins.push( pureRender( spec.propTypes ) );
    }
}

function processListenToProps( spec, baseProto ){
    // process listenToProps spec
    var listenToProps = spec.listenToProps;
    if( listenToProps ){
        if( typeof listenToProps === 'string' ){
            spec._listenToPropsArray = listenToProps.split( /\s+/ ).concat( baseProto._listenToPropsArray || [] );
            spec.mixins.unshift( ListenToPropsArrayMixin );
        }
        else{
            spec._listenToPropsHash = tools.defaults( listenToProps, baseProto._listenToPropsHash || {} );
            spec.mixins.unshift( ListenToPropsMixin );
        }

        delete spec.listenToProps; 
    }
}

var ListenToPropsMixin = {
    componentDidMount  : regHashPropsListeners,
    componentDidUpdate : regHashPropsListeners
};

function regHashPropsListeners( a_prevProps ){
    var prevProps = a_prevProps || {},
        updateOn  = this._listenToPropsHash;

    for( var prop in updateOn ){
        registerPropsListener( this, prevProps, prop, updateOn[ prop ] );
    }
}

var ListenToPropsArrayMixin = {
    componentDidMount  : regArrayPropListeners,
    componentDidUpdate : regArrayPropListeners
};

function regArrayPropListeners( a_prevProps ){
    var prevProps = a_prevProps || {},
        updateOn  = this._listenToPropsArray;

    for( var i = 0; i < updateOn.length; i++ ){
        registerPropsListener( this, prevProps, updateOn[ i ] )
    }
}

function registerPropsListener( component, prevProps, name, events ){
    var prevEmitter = prevProps[ name ],
        emitter     = component.props[ name ];

    if( prevEmitter !== emitter ){
        prevEmitter && component.stopListening( prevEmitter );

        if( emitter ){
            if( typeof events === 'object' ){
                component.listenTo( emitter, events );
            }
            else{
                component.listenTo( emitter, events || emitter._changeEventName, asyncUpdate );
            }
        }
    }
}

function getTypeSpecs( spec, name ){
    var attributes = null;

    // Scan through local mixin, and gather specs. Refactor it later, it's not good. At all.
    for( var i = spec.mixins.length - 1; i >= 0; i-- ){
        var mixin      = spec.mixins[ i ],
            mixinAttrs = mixin[ name ];

        if( mixinAttrs ){
            attributes || ( attributes = {} );
            Object.assign( attributes, mixinAttrs );
        }
    }

    // Merge it with local data.
    var specAttrs = spec[ name ];
    if( specAttrs ){
        if( attributes ){
            Object.assign( attributes, specAttrs );
        }
        else{
            attributes = specAttrs;
        }
    }

    return attributes;
}