( function( $, mw ) {
	$( function() {
		var portlettext = window.vFC_PortletText || 'Perform batch task',
			portlet = mw.util.addPortletLink( 'p-tb', '#', portlettext, 't-AjaxQuickDeleteOnDemand' );
		$( portlet ).click( function ( e ) {
			e.preventDefault();
			mw.loader.load( 'ext.gadget.VisualFileChange.core' );
		} );
	} );
}( jQuery, mediaWiki ) );