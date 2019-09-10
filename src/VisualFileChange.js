$( function () {
	mw.util.addPortletLink( 'p-tb', '#', window.vFC_PortletText || 'Perform batch task', 't-AjaxQuickDeleteOnDemand' )
		.addEventListener( 'click', function ( e ) {
			e.preventDefault();
			mw.loader.load( 'ext.gadget.VisualFileChange.core' );
		} );
} );