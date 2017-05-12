( function( $, mw ) {
	var portlettext = window.vFC_PortletText || 'Perform batch task',
		portlet = mw.util.addPortletLink( 'p-tb', '#', portlettext, 't-AjaxQuickDeleteOnDemand' );
	$( portlet ).click( function ( e ) {
		e.preventDefault();
		// importScript is part of wikibits.js; may get deprecated in the future
		importScript("MediaWiki:VisualFileChange.js");
	} );
}( jQuery, mediaWiki ) );