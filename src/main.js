import React from 'react';
import { define as defImport } from 'nestedtypes';
import { Node, Element } from './propTypes';
import './createClass';

/*var React    = require( 'react' ),
    ReactDOM = require( 'react-dom' ),
    Nested   = require( 'nestedtypes' ),
    $        = Nested.$;
*/
// extend React namespace
//var NestedReact = module.exports = Object.create( React );
const NestedReact = Object.create( React );;

// listenToProps, listenToState, model, attributes, Model
//NestedReact.createClass = require( './createClass' );
//NestedReact.createClass = createClass;
NestedReact.define = defImport;


// export hook to override base View class used...
//NestedReact.useView = function( View ){
//    Nested._BaseView = ComponentView.use( View );
//};

//NestedReact.useView( Nested.View );

// React component for attaching views
//NestedReact.subview = require( './view-element' );

//var propTypes  = require( './propTypes' );
NestedReact.Node = Node.value( null );
NestedReact.Element = Element.value( null );

// Extend react components to have backbone-style jquery accessors
//var Component     = React.createClass( { render : function(){} } ),
//    BaseComponent = Object.getPrototypeOf( Component.prototype );

//Object.defineProperties( BaseComponent, {
//    el  : { get : function(){ return ReactDOM.findDOMNode( this ); } },
//    $el : { get : function(){ return $( this.el ); } },
//    $   : { value : function( sel ){ return this.$el.find( sel ); } }
//} );

//NestedReact.Link = require( './nested-link' );
export const define = defImport;
export default NestedReact;
