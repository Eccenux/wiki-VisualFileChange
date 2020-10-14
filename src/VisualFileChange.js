$( function () {
	var link = mw.util.addPortletLink( 'p-tb', '#', window.vFC_PortletText || 'Perform batch task', 't-AjaxQuickDeleteOnDemand' );
	if(link) {
		link.addEventListener( 'click', function ( e ) {
			e.preventDefault();
			mw.loader.load( 'ext.gadget.VisualFileChange.core' );
		} );
	}
} );