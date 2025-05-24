/**
**  Read [[Help:VisualFileChange.js]]!
**  VisualFileChange, formerly AjaxMassDelete was composed by [[User:Rillke]] in 2011
**  Removed previous credit per diff=75592478&oldid=75591275
**  (nothing eligible for copyright in it any more)
**  If you propose changes or make changes to this script you agree to publish them under
**  the licenses this script is licensed under (see following lines)
**
**  TODO if version 1.18 ready, add possibility to revert all images
**  http://svn.wikimedia.org/viewvc/mediawiki/trunk/phase3/includes/api/ApiFileRevert.php?view=log
**    action=filerevert&filename=File:MassDeleteOTRS.png&comment=TestingBryanTongMinhRevert&archivename=20110429234711!Wiki.png&token=+\\
**
**  Depends on MediaWiki:VisualFileChange.js/exec.js, ./ui.js, ./cfg.js
**
**  @description
**     Helps performing mass-changes on the uploads of a particular user or files in one category.
**
**  @author Rillke, 2011
**  @license CC-BY-SA, GFDL; Attribution: User:Rillke.
**   You must add attribution to the UI.
**   Happy reusing!
**/
// <nowiki>
/***************************************************
Event-System:
Event: 'vFC' with parameters
vFC = visualFileChange
Parameter1: What?
Parameter2: This object.
Parameter3: optional, depends on context

Example for listening to the events:
$doc.on('vFC', function(e, p1, p2, p3) {
console.log('VisualFileChange> ' + p1);
});
***************************************************/

// Invoke automated jsHint-validation on save: A feature on WikimediaCommons
// Interested? See [[:commons:MediaWiki:JSValidator.js]].
/* global jQuery:false, mediaWiki:false, Geo:false */
/* eslint one-var:0, vars-on-top:0, indent:0, no-underscore-dangle:0, no-unused-vars:0, valid-jsdoc:0, no-bitwise:0, camelcase:0, curly:0 */
/* jshint curly:false, forin:false, maxerr:200, laxbreak:true, laxcomma:true, bitwise:false, smarttabs:true, multistr:true */

( function ( $, mw ) {
'use strict';
if ( window.VisualFileChange ) return;
$.when( mw.loader.using( 'mediawiki.util' ), $.ready ).then( function () {

var VisualFileChange,
	vfc,
	isSysop = ( $.inArray( 'sysop', mw.config.get( 'wgUserGroups' ) ) !== -1 ),
	isBot = ( $.inArray( 'bot', mw.config.get( 'wgUserGroups' ) ) !== -1 ),
	portletText = 'VFC: Translation…',
	$doc = $( document ),
	$win = $( window );

// Adding Style-definitions
mw.util.addCSS(
	'.md-collapsible {padding:3px;padding-top:0;padding-left:0;margin-top:2px;display:inline-block}\n\
	.md-optioncontainer {padding:3px;margin:5px 0}\n\
	.md-option-space-v {padding:5px 0}\n\
	.md-option-space-v>input,select {margin:0 3px}' );

/**
* Create a new VisualFileChange-Object-literal.
* Crockford calls it "Singleton"
*
* @context {window}
*/
VisualFileChange = vfc = window.VisualFileChange = {

/** REVISION **/ // (x.major.minor.bug)
	scriptRevision: '0.10.0.0',

/**
** Set up the VisualFileChange object and add the toolbox link. Called via $doc.ready() during page loading.
**/
	install: function () {
// Initialize the settings
		if ( !window.vFCSettings )
			window.vFCSettings = {};

		$.each( vfc.mdDefaults, function ( i, el ) {
			vfc.mdSettings[ el.name ] = el.default;
			if ( typeof el.select === 'string' )
				el.select = vfc[ el.select ];

		} );
// Merge the user's settings
		$.extend( vfc.mdSettings, window.vFCSettings );
		$.each( vfc.mdDefaults, function ( i, el ) {
			if ( typeof el.default === 'number' )
				vfc.mdSettings[ el.name ] = Number( vfc.mdSettings[ el.name ] );
		} );

// Get the username
		vfc.username = mw.user.getName() || Geo.IP || 'anonymous';

		var $nestedA,
			autostart = false,
			$portlet = $( '#t-AjaxQuickDeleteOnDemand' );

		if ( $portlet.length === 1 ) {
// User is using the load on demand feature.
// alter the link later but start now
			$nestedA = $portlet.find( 'a' );
			if ( $nestedA.length )
				$portlet = $nestedA;

// Immediately start Md
			autostart = true;
		} else {
			if ( mw.util.getParamValue( 'withModule' ) === 'ext.gadget.VisualFileChange.core' ) {
// Load immediately and add no link
				autostart = true;
			} // else: User wrongly uses VFC with importScript

// Create a new portlet
			$portlet = $( mw.util.addPortletLink( 'p-tb', '#', 'VFC' ) );
		}
		if ( $portlet.length === 1 ) {
			$nestedA = $portlet.find( 'a' );
			if ( $nestedA.length )
				$portlet = $nestedA;
			$portlet.text( vfc.i18n.mdButtonLabel ).attr( {
				href: '#!start_VisualFileChange',
				title: 'Launch VisualFileChange',
				id: 't-AjaxQuickDeletx2'
			} ).click( function ( e ) {
				e.preventDefault();
				$portlet.text( portletText );
				vfc.start();
			} );
			vfc.$portlet = $portlet;
		}
		if ( location.hash === '#!start_VisualFileChange' )
			autostart = true;

		$doc.triggerHandler( 'vFC', [ 'installed', vfc ] );
		if ( autostart )
			$portlet.click();
	},

/**
*  @description
*    A little ResourceLoader :-)
*
*  @param m {String} Module to be loaded
*  @param cb {Function} Function to be executed when loaded
**/
	loadModule: function ( m, cb ) {
		var alias = '';
		var executeCB = function () {
			if ( $.isFunction( cb ) )
				cb.apply( vfc, [] );
			if ( typeof cb === 'string' )
				vfc[ cb ]( vfc, [] );
		};
		switch ( m ) {
			case 'exec':
				alias = 'editComponents';
				break;
			case 'ui':
				alias = 'displayComponents';
				break;
			case 'cfg':
				alias = 'configManager';
				break;
			case 'diff':
				if ( !mw.libs.schnark_diff ) {
					if ( cb ) {
						mw.hook( 'userjs.load-script.diff-core' ).add( function () {
							mw.libs.schnarkDiff.style.set( 'ins', 'text-decoration:underline; font-weight:bold; font-size:1.2em; color:#020; background-color:#ABE; text-shadow:1px 1px 2px #363;-moz-text-decoration-color:#474;' );
							mw.libs.schnarkDiff.style.set( 'del', 'font-weight:bold; font-size:1.2em; color:#200; background-color:#FD9; -moz-text-decoration-color:#744;' );
							mw.util.addCSS( mw.libs.schnarkDiff.getCSS() );
							mw.libs.schnarkDiff.config.set( 'minMovedLength', 20 );
							mw.libs.schnarkDiff.config.set( 'tooShort', 3 );
							executeCB();
						} );
					}
					mw.loader.load( 'https://de.wikipedia.org/w/index.php?title=Benutzer:Schnark/js/diff.js/core.js&action=raw&ctype=text/javascript' );
				} else {
					executeCB();
				}
				return;
			case 'i18n':
				if ( vfc.i18n.mdTranslator )
					return executeCB();
				$.ajax( {
					url: mw.util.wikiScript(),
					dataType: 'script',
					data: {
						title: 'MediaWiki:Gadget-VisualFileChange.js/i18n/' + mw.config.get( 'wgUserLanguage' ).split( '-' )[ 0 ] + '.js',
						action: 'raw',
						ctype: 'text/javascript',
// Allow caching for 28 days
						maxage: 2419200,
						smaxage: 2419200,
						dummy: vfc.scriptRevision
					},
					cache: true,
					success: executeCB,
					error: executeCB
				} );
				return;
		}
		if ( this[ alias ] ) {
			executeCB();
			return;
		} else {
			if ( cb ) {
				$doc.on( 'scriptLoaded.vFCListener' + alias, function ( evt, script, add ) {
					if ( script ) {
						if ( script === 'VisualFileChange' && add ) {
							if ( alias === add ) {
								$doc.off( 'scriptLoaded.vFCListener' + alias );
								executeCB();
							}
						}
					}
				} );
			}
			mw.loader.load( 'ext.gadget.VisualFileChange.' + m );
		}
	},

	cancel: function () {
		vfc.pb.remove();
		vfc.thumbDlgClose();
	},

	start: function () {
		vfc.internalState = 'md'; // What happened?
		vfc.mdBusy = false; // indicate that any dialog can be closed
		vfc.tasks = []; // reset task list in case an earlier error left it non-empty

		vfc.addTask( '_start' );
		vfc.loadModule( 'i18n', 'nextTask' );
	},

	_start: function () {
		var pageName = mw.config.get( 'wgPageName' ),
			doPrettify = true,
			pb;

		$doc.triggerHandler( 'vFC', [ 'starting procedure', vfc ] );
		vfc.$portlet.text( vfc.i18n.mdButtonLabel );

		pb = vfc.pb = new ProgressBox( undefined, vfc );
		pb.addTask( 'start' );
		pb.addTask( 'target' );
		pb.addTask( 'list' );
		pb.addTask( 'datails' );
		pb.setTaskState( 'start', 'md-doing' );
		pb.show();

		vfc.oldDocTitle = document.title;
		vfc.pageName = pageName;
		vfc.startInput = {};
		vfc.queryParams = {
			target: ''
		};
		vfc.mdListUploadsPending = 0;

		switch ( mw.config.get( 'wgNamespaceNumber' ) ) {
			case 6: // File
				vfc.addTask( 'findOriginalUploader' );
				break;
			case 3: // User_talk
			case 2: // User
			case -1: // Special pages
				if ( mw.config.get( 'wgCanonicalSpecialPageName' ) === 'Search' ) {
// FIXME: Find a better way to auto-select search query
					vfc.queryParams.target = 'Special:Search/' + $( 'input[name="search"]' ).val();
					doPrettify = false;
				} else {
					vfc.queryParams.target = mw.libs.commons.guessUser() || '';
				}
				break;
			case 0: // Gallery
			case 14: // Category
				vfc.queryParams.target = pageName;
				break;
		}

		if ( doPrettify ) {
// Prettify the title (normalizing)
			vfc.queryParams.target = vfc.queryParams.target.replace( /_/g, ' ' );
		}

		$doc.triggerHandler( 'vFC', [ 'prepared', vfc ] );

// Load the Execute/ Edit components
		vfc.loadModule( 'exec' );

		vfc.addTask( 'reinit' );
		vfc.nextTask();
	},

	findOriginalUploader: function () {
		var query = {
			action: 'query',
			prop: 'imageinfo|info|revisions',
			rvprop: 'content',
			iiprop: 'user|comment',
			iilimit: 50,
			titles: vfc.pageName
		};

		$doc.triggerHandler( 'vFC', [ 'seeking uploader', vfc ] );

		vfc.queryAPI( query, 'findOriginalUploaderCB', 'failQueriedFile' );
	},

	findOriginalUploaderCB: function ( result ) {
		var pages = result.query.pages,
			info,
			content,
			i;
		for ( var id in pages ) { // there should be only one, but we don't know its ID
			if ( pages.hasOwnProperty( id ) ) {
				content = pages[ id ].revisions[ 0 ][ '*' ];
				info = pages[ id ].imageinfo;
				i = info.length - 1;
				vfc.queryParams.target = info[ i ].user;
			}
		}
		vfc.nextTask();
	},

	reinit: function () {
		$doc.triggerHandler( 'vFC', [ 'preparing to ask for target', this ] );
		this.pb.setCurrentTaskDone();
		this.pb.setTaskState( 'target', 'md-doing' );
		this.pb.setHelp( this.i18n.mdPerformOnWhichTarget );

/* Schedule next tasks */
		this.addTask( 'mdCreateList' );
		this.addTask( 'mdGenIGallery' );
		this.addTask( 'mdLargerGallery' );
		this.addTask( 'mdQueryFileDone' );

/* Setting up variables needed later */
		var pefilledUser = '';
		this.iUploads = {}; // i-initial file list
		this.iiUploads = 0; // Number of initially uploaded files in the list
		this.metaKeys = []; // Contains all keys(names) of metadata available; building while processing queried files
		this.allUploaders = []; // All uploaders
		this.uploadsByUser = {};
		this.gbs = {}; // File --> Gallery Box
		this.gbu = {}; // File --> Global Usage Box
		this.mdNoMoreFiles = false; // set to true, when API response did not contain a new Lestart
		this.mdFirstRun = true; // determining whether it is the first query-cycle
		this.mdNumberOfExecs = 0; // Is Execute called already?
		$.extend( this.api, {
			eFirst: this.mdSettings.firstTest - 1,
			eBatch: 0,
			wasError: false,
			ratelimited: mw.user.isAnon()
		} );
		this.lastContinues = {
			vals: [],
			setVals: ''
		}; // contains the last 2 continue-keys
		this.infoTextToEndDlg = [];

		pefilledUser = this.queryParams.target || this.username;
		$doc.triggerHandler( 'vFC', [ 'asking for target', this ] );
		this.promptForTarget( pefilledUser, 1 );
	},

	$createToggler: function ( text, $content ) {
		var ie = 'ui-icon-carat-1-e',
			is = 'ui-icon-carat-1-s';
		return $( '<div>' ).append(
			$( '<a>', {
				text: text,
				href: '#show_or_hide',
				'class': 'md-collapsible ui-state-default'
			} ).prepend(
				$.createIcon( ie ) ).on( 'click', function ( e ) {
				e.preventDefault();
				var x,
					$el = $( this );

				$el.next().slideToggle( 'fast' );
				$el.find( 'span.ui-icon' ).removeClass( ie ).addClass( is );
				x = is;
				is = ie;
				ie = x;
			} ).on( 'mouseenter', function () {
				$( this ).addClass( 'ui-state-hover' );
			} ).on( 'mouseleave', function () {
				$( this ).removeClass( 'ui-state-hover' );
			} ), // hover
			$content.addClass( 'ui-widget-content' ).hide()
		);
	},

/**
** Pseudo-Modal JS windows.
** Needs to be converted into a class
** URL-params:
**  vfcStartAt: <sortkey or date>, vfcSorting: <of|on|ca|cd>
**/
	promptForTarget: function ( prefill, minlen ) {
		var dlgButtons = {},
			confirmed = false,
			dlgWidth = 0,
			$submitButton,
			$cancelButton,
			$targetInput,
			$targetSelect,
			$gMoreOptionsToggler,
			$gMoreOptions,
			$gStartAt,
			$gStartAtL,
			$gStartWrap,
			$gStartFile,
			$gStartFileL,
			$gSortBy,
			$gSortByL,
			$gSortByWrap,
			$gSortNf,
			$gSortOf,
			$gSortDefault,
			$gSortAsc,
			$gSortDesc,
			$gSortAlphabet,
			$gSortDate,
			$gNotifyText,
			$gNotifyArea,
			$gLoadThumbs,
			$gLoadThumbsL,
			$gLoadWikitext,
			$gLoadWikitextL,
			gStartAtURLVal,
			gSortByURLVal,
			moreOptionsVisible,
			mwDateRx = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/;

		var namespaceIds = mw.config.get( 'wgNamespaceIds' ),
			formattedNamespaces = mw.config.get( 'wgFormattedNamespaces' ),
			nsCat = formattedNamespaces[ 14 ],
			nsUser = formattedNamespaces[ 2 ],
			nsSpecial = formattedNamespaces[ -1 ],
			nsPage = 'Page', // Virtual helper namespace
			spSearch = 'Search',
			nsLocalCat = vfc.i18n.namespace[ '14' ] || nsCat,
			nsLocalUser = vfc.i18n.namespace[ '2' ] || nsUser,
			nsLocalPage = vfc.i18n.namespace.page || nsPage, // Virtual helper namespace
			spLocalSearch = vfc.i18n.specials.search || spSearch,
			rxCat = new RegExp( '^' + nsCat + ':', 'i' ),
			rxUser = new RegExp( '^' + nsUser + ':', 'i' ),
			rxSearch = new RegExp( '^' + nsSpecial + ':' + spSearch + '(/|$)', 'i' ),
			lastXHR = 0,
			pLastCB = 0,
			delayXHR = 500;

		var getMwDate = function ( dateX ) {
			if ( typeof dateX !== 'string' )
				return dateX;
			if ( dateX === '' )
				return '';
			if ( mwDateRx.test( dateX ) )
				return dateX;
			var m1 = dateX.match( /(\d{4}).(\d{2}).(\d{2})\D*(\d{2}:\d{2}:\d{2})?/ );
			if ( m1 )
				return ( m1[ 1 ] + '-' + m1[ 2 ] + '-' + m1[ 3 ] + 'T' + ( m1[ 4 ] ? m1[ 4 ] : '12:00:00' ) + 'Z' );
			m1 = dateX.match( /(\d{2}).(\d{2}).(\d{4})\D*(\d{2}:\d{2}:\d{2})?/ );
			if ( m1 )
				return ( m1[ 3 ] + '-' + m1[ 2 ] + '-' + m1[ 1 ] + 'T' + ( m1[ 4 ] ? m1[ 4 ] : '12:00:00' ) + 'Z' );
			else
				return dateX;
		};

		dlgButtons[ vfc.i18n.proceedButtonLabel ] = function () {
			if ( confirmed )
				return;
			confirmed = true;

// Reading input
			var si = vfc.startInput = {
				mode: $targetSelect.val(),
				modeCat: $targetSelect.val() === nsCat,
				modeUser: $targetSelect.val() === nsUser,
				modePage: $targetSelect.val() === nsPage,
				modeSearch: $targetSelect.val() === spSearch,
				target: null, // populate later
				loadThumbs: $gLoadThumbs[ 0 ].checked,
				loadWikitext: $gLoadWikitext[ 0 ].checked,
				startDate: $gStartAt.val(),
				startFile: $gStartFile.val().replace( /^File:/, '' )
			};
			if ( !mwDateRx.test( si.startDate ) )
				si.startDate = '';

			var lc = vfc.lastContinues,
				qp = vfc.queryParams = {};

			if ( si.modeCat ) {
				si.target = vfc.cleanReason( $targetSelect.val() + ':' + $targetInput.val().replace( /_/g, ' ' ) );
			} else if ( si.modeUser ) {
				qp.lestart = si.startDate;
				si.target = vfc.cleanReason( $targetInput.val().replace( /_/g, ' ' ) );
				vfc.lastContinues.setVals = [ 'lecontinue' ];
			} else if ( si.modePage ) {
				si.target = vfc.cleanReason( $targetInput.val().replace( /_/g, ' ' ) );
				vfc.lastContinues.setVals = [ 'imcontinue' ];
			} else if ( si.modeSearch ) {
				si.target = $targetInput.val();
				vfc.lastContinues.setVals = [ 'sroffset' ];
			}

			qp.target = si.target;

			vfc.$AjaxMdContainer.text( vfc.i18n.mdPleaseWait );

			switch ( $gSortBy.val() ) {
				case 'of': // oldest first
					if ( si.modeCat ) {
						qp.cmdir = 'asc';
						qp.cmsort = 'timestamp';
						qp.cmstart = si.startDate;
						lc.setVals = [ 'cmstart' ];
					} else if ( si.modeUser ) {
						qp.ledir = 'newer';
					}
					break;
				case 'nf': // newest first
					if ( si.modeCat ) {
						qp.cmdir = 'desc';
						qp.cmsort = 'timestamp';
						qp.cmstart = si.startDate;
						lc.setVals = [ 'cmstart' ];
					} else if ( si.modeUser ) {
						qp.ledir = 'older';
					}
					break;
				case 'ca': // cat asc
					if ( si.modeCat ) {
						qp.cmdir = 'asc';
						qp.cmsort = 'sortkey';
						qp.cmstartsortkey = si.startFile;
						lc.setVals = [ 'cmcontinue' ];
					} else if ( si.modePage ) {
						qp.imdir = 'ascending';
					}
					break;
				case 'cd': // cat desc
					if ( si.modeCat ) {
						qp.cmdir = 'desc';
						qp.cmsort = 'sortkey';
						qp.cmstartsortkey = si.startFile;
						lc.setVals = [ 'cmcontinue' ];
					} else if ( si.modePage ) {
						qp.imdir = 'descending';
					}
					break;
				case 'default':
// Default
					if ( si.modeCat ) {
						qp.cmdir = 'asc';
						qp.cmsort = 'sortkey';
						qp.cmstartsortkey = si.startFile;
						lc.setVals = [ 'cmcontinue' ];
					} else if ( si.modeUser ) {
						qp.ledir = 'older';
					} else if ( si.modePage ) {
						qp.imdir = 'ascending';
					}
					break;
			}

			var $dlg = $( this );
			$dlg.dialog( 'option', 'buttons', {} ).dialog( 'widget' ).animate( {
				left: $win.scrollLeft() + 250,
				top: $win.scrollTop(),
				width: $win.width() - 250,
				height: $win.height()
			}, {
				duration: 800,
				complete: function () {
					vfc.$AjaxMdContainer.text( '' ).hide();
					vfc.$AjaxMdContainer.$banner = $( '<div>' ).css( {
						font: 'small-caps 3em sans-serif',
						'text-align': 'center',
						'margin-top': '-1.5em',
						top: '50%',
						position: 'absolute',
						width: '98%'
					} ).text( 'VisualFileChange' ).hide().appendTo( $dlg ).fadeIn();
				}
			} );

			vfc.loadModule( 'ui', 'nextTask' );

// We removed some inputs; maybe a tipsy tooltip was left?
			$( '.tipsy' ).remove();
		};
		dlgButtons[ vfc.i18n.cancelButtonLabel ] = function () {
			$( this ).dialog( 'close' );
		};

// Are there Contaminated Sites? Remove them now.
		vfc.thumbDlgClose();

// Change the title of the browser tab/window
		document.title = vfc.i18n.browsertitle.replace( '%USER%', vfc.username );

// Hide overlapping page (avoids scrolling)
		$( 'body' ).css( 'overflow', 'hidden' );

		dlgWidth = Math.min( 600, $win.width() - 250 );

		vfc.$AjaxMdContainer = $( '<div>', {
			id: 'AjaxMdContainer',
			style: 'min-height:80px;'
		} );

		vfc.dlg = $( '<div>' ).append( vfc.$AjaxMdContainer ).dialog( {
			modal: true,
			closeOnEscape: false,
			position: [ ( $win.width() - dlgWidth - 250 ) / 2 + 250, ( $win.height() - 200 ) / 2 ],
			title: vfc.i18n.mdPerformOnWhichTarget,
			height: 'auto',
			width: dlgWidth,
			buttons: dlgButtons,
			dialogClass: 'vfc-dialog',
			close: vfc.cancel,
			open: function () {
				var $buttons = $( this ).parent().find( '.ui-dialog-buttonpane button' );
				$submitButton = $buttons.eq( 0 ).specialButton( 'proceed' );
				$cancelButton = $buttons.eq( 1 ).specialButton( 'cancel' );
			}
		} );
		vfc.pb.setZIndex( Number( $( '.ui-widget-overlay' ).css( 'z-index' ) ) + 1 );

		var nsNr = mw.config.get( 'wgNamespaceNumber' );

		$targetSelect = $( '<select>' ).attr( {
			size: 1,
			id: 'mdTargetSelect'
		} ).append(
			$( '<option>', {
				text: nsLocalCat,
				selected: nsNr === -14 ? 'selected' : null,
				value: nsCat
			} ),
			$( '<option>', {
				text: nsLocalPage,
				selected: nsNr ? null : 'selected',
				value: nsPage
			} ),
			$( '<option>', {
				text: nsLocalUser,
				selected: [ 0, 14 ].indexOf( nsNr ) === -1 ? 'selected' : null,
				value: nsUser
			} ),
			$( '<option>', {
				text: spLocalSearch,
				value: spSearch
			} ) ).on( 'change', function () {
			switch ( this.value ) {
				case nsPage:
					$gSortAlphabet.prop( 'disabled', false );
					$gSortDate.prop( 'disabled', true );
					if ( $gSortBy.find( 'option:selected' ).is( $gSortDate ) )
						$gSortBy.val( 'default' );
					$targetInput.val( vfc.pageName );
					break;
				case nsCat:
					$gSortAlphabet.add( $gSortDate ).prop( 'disabled', false );
					break;
				case nsUser:
					$gSortDate.prop( 'disabled', false );
					$gSortAlphabet.prop( 'disabled', true );
					if ( $gSortBy.find( 'option:selected' ).is( $gSortAlphabet ) )
						$gSortBy.val( 'default' );
					$targetInput.val( prefill );
					break;
				case spSearch:
					$gSortAlphabet.prop( 'disabled', true );
					$gSortDate.prop( 'disabled', true );
			}
			$gSortBy.change();
			$doc.triggerHandler( 'vFC_Startup_target', [ $targetSelect.val() + ':' + $targetInput.val() ] );
		} );
		var didXHR = function ( result, pCallback ) {
			var searchTerms = [];
			if ( !result ) {
				if ( $.isFunction( pCallback ) )
					pCallback( searchTerms );
				return;
			}
			if ( !result.query ) {
				return;
			}
			result = result.query.allusers || result.query.allcategories || result.query.allpages;
			$.each( result, function ( id, it ) {
				searchTerms.push( {
					value: ( it.name || it[ '*' ] || it.title )
				} );
			} );
			if ( $.isFunction( pCallback ) )
				pCallback( searchTerms );
			pLastCB = 0;
		};
		var doXHR = function ( request, pCallback ) {
			var query = {
				action: 'query',
				format: 'json'
			};
			var queryU = {
				list: 'allusers',
				auprefix: request.term.replace( rxUser, '' )
			};
			var rxNs = request.term.match( /^(\w+):.+/ ),
				nsId;
			if ( rxNs && rxNs[ 1 ] ) {
				nsId = rxNs[ 1 ].replace( / /g, '_' ).toLowerCase();
				nsId = namespaceIds[ nsId ];
				if ( nsId ) {
					rxNs = new RegExp( '^' + mw.util.escapeRegExp( rxNs[ 1 ] ) + '\\:', 'i' );
					request.term = request.term.replace( rxNs, '' );
				} else {
					nsId = undefined;
				}
			}
			var queryP = {
				list: 'allpages',
				apnamespace: nsId,
				apprefix: request.term
			};
			var queryC = {
				list: 'allcategories',
				acprefix: request.term.replace( rxCat, '' )
			};
			switch ( $targetSelect.val() ) {
				case nsUser:
					$.extend( query, queryU );
					break;
				case nsCat:
					$.extend( query, queryC );
					break;
				case nsPage:
					$.extend( query, queryP );
					break;
				case spSearch:
					return;
			}
			lastXHR = $.getJSON( mw.util.wikiScript( 'api' ), query, function ( r ) {
				didXHR( r, pCallback );
			} );
		};
		var onEnter = function ( /* params */ ) {
			$.each( arguments, function ( i, $arg ) {
				$arg.keyup( function ( e ) {
					if ( Number( e.which ) === 13 ) {
						$gStartAt.val( getMwDate( $( this ).val() ) );
						$submitButton.click();
					}
				} );
			} );
		};

		vfc.$targetInput = $targetInput = $( '<input>', {
			type: 'text',
			id: 'mdTargetInput',
			style: 'width: 70%;',
			value: prefill
		} ).autocomplete( {
			minLength: 1,
			delay: delayXHR,
			select: function ( /* event, ui */ ) {
				var ts = this;
				setTimeout( function () {
					$( ts ).triggerHandler( 'change' );
				}, 10 );
			},
			source: function ( request, callback ) {
				if ( pLastCB )
					pLastCB( [] );
				pLastCB = callback;
				if ( lastXHR )
					lastXHR.abort();
				delayXHR += 100;
				doXHR( request, callback );
			}
		} );

// Start date
		gStartAtURLVal = mw.util.getParamValue( 'vfcStartAt' );
		$.datepicker.setDefaults( $.datepicker.regional[ mw.config.get( 'wgUserLanguage' ) ] );
		$gStartWrap = $( '<div>' ).attr( 'class', 'md-option-space-v' );

		$gStartAtL = $( '<label>', {
			'for': 'gStartAt',
			title: vfc.i18n.optStartAt,
			text: vfc.i18n.startAt
		} )
			.appendTo( $gStartWrap );

		$gStartAt = vfc.$gStartAt = $( '<input>', {
			id: 'gStartAt',
			type: 'text',
			title: vfc.i18n.optStartAt,
			value: vfc.queryParams.lecontinue
		} )
			.datepicker( {
				changeYear: true,
				dateFormat: 'yy-mm-ddT12:00:00Z',
				showWeek: true,
				firstDay: 1
			} )
			.blur( function ( /* e */ ) {
				$( this ).val( getMwDate( $( this ).val() ) );
			} )
			.tipsy( {
				trigger: 'focus',
				gravity: 's',
				html: true,
				title: function () {
					return vfc.i18n.optStartAtHowTo;
				}
			} )
			.attr( 'placeholder', 'YYYY-MM-DD' )
			.appendTo( $gStartWrap );
		if ( gStartAtURLVal && mwDateRx.test( gStartAtURLVal ) ) {
			moreOptionsVisible = true;
			setTimeout( function () {
				$gStartAt.val( gStartAtURLVal ).keyup();
			}, 50 );
		}

// Start file
		$gStartFileL = $( '<label>', {
			'for': 'gStartFile',
			title: vfc.i18n.optStartAtFile,
			text: vfc.i18n.startAt
		} )
			.appendTo( $gStartWrap )
			.hide();

		$gStartFile = $( '<input>', {
			id: 'gStartFile',
			type: 'text',
			title: vfc.i18n.optStartAtFile
		} )
			.tipsy( {
				trigger: 'focus',
				gravity: 's',
				html: false,
				title: function () {
					return vfc.i18n.optStartFileHowTo;
				}
			} )
			.attr( 'placeholder', 'Start file (sortkey)' )
			.appendTo( $gStartWrap )
			.hide();
		if ( gStartAtURLVal && !mwDateRx.test( gStartAtURLVal ) ) {
			moreOptionsVisible = true;
			setTimeout( function () {
				$gStartFile.val( gStartAtURLVal ).keyup();
			}, 50 );
		}

// TODO: Convert to array or object?
		$gSortNf = $( '<option>', {
			value: 'nf'
		} ).text( vfc.i18n.optNewToOld );
		$gSortOf = $( '<option>', {
			value: 'of'
		} ).text( vfc.i18n.optOldToNew );
		$gSortDefault = $( '<option>', {
			value: 'default'
		} ).text( vfc.i18n.optDefault );
		$gSortAsc = $( '<option>', {
			value: 'ca'
		} ).text( vfc.i18n.optAsc );
		$gSortDesc = $( '<option>', {
			value: 'cd'
		} ).text( vfc.i18n.optDesc );
		$gSortAlphabet = $gSortAsc.add( $gSortDesc );
		$gSortDate = $gSortNf.add( $gSortOf );

		$gSortByWrap = $( '<div>' ).attr( 'class', 'md-option-space-v' );

		gSortByURLVal = mw.util.getParamValue( 'vfcSorting' );
		$gSortByL = $( '<label>', {
			'for': 'gSortBy',
			title: vfc.i18n.sorting,
			text: vfc.i18n.sorting
		} )
			.appendTo( $gSortByWrap );

		$gSortBy = $( '<select>', {
			id: 'gSortBy'
		} )
			.append( $gSortDefault, $gSortOf, $gSortNf, $gSortAsc, $gSortDesc )
			.appendTo( $gSortByWrap )
			.change( function () {
				var $sel = $gSortBy.find( 'option:selected' ),
					methodDate,
					methodFile;

				if ( $sel.is( $gSortAlphabet ) ||
( $sel.is( $gSortDefault ) && nsCat === $targetSelect.val() ) ) {
					methodDate = 'none';
					methodFile = 'inline-block';
				} else {
					methodFile = 'none';
					methodDate = 'inline-block';
				}
				if ( $.inArray( $targetSelect.val(), [ nsPage, spSearch ] ) >= 0 ) {
					methodFile = 'none';
					methodDate = 'none';
				}
				$gStartAtL.css( 'display', methodDate );
				$gStartAt.css( 'display', methodDate );
				$gStartFileL.css( 'display', methodFile );
				$gStartFile.css( 'display', methodFile );
			} );
		if ( gSortByURLVal && /of|nf|ca|cd/i.test( gSortByURLVal ) ) {
			moreOptionsVisible = true;
			setTimeout( function () {
				$gSortBy.val( gSortByURLVal.toLowerCase() );
				$targetSelect.change();
			}, 50 );
		}

		$gLoadThumbs = $( '<input type="checkbox" ' + ( vfc.mdSettings.loadThumbs ? 'checked="checked" ' : '' ) + 'id="gLoadThumbs">' );
		$gLoadThumbsL = $( '<label>', {
			'for': 'gLoadThumbs',
			text: vfc.i18n.mdLoadThumbs
		} );
		$gLoadWikitext = $( '<input type="checkbox" ' + ( vfc.mdSettings.loadWikitext ? 'checked="checked" ' : '' ) + 'id="gLoadWikitext">' );
		$gLoadWikitextL = $( '<label>', {
			'for': 'gLoadWikitext',
			text: vfc.i18n.mdLoadWikitext
		} );

		$gMoreOptions = $( '<div>' ).append(
			$( '<div>' ).addClass( 'md-optioncontainer' ).append(
				$gStartWrap, $gSortByWrap ), $( '<div>' ).addClass( 'md-optioncontainer' ).append(
				$gLoadThumbs, $gLoadThumbsL, ' ', $gLoadWikitext, $gLoadWikitextL ) ).hide();
		$gMoreOptionsToggler = vfc.$createToggler( vfc.i18n.optMore, $gMoreOptions );
		$gNotifyText = vfc.$gNotifyText = $( '<span>', {
			id: 'gNotifyText'
		} );
		$gNotifyArea = vfc.$gNotifyArea = $.createNotifyArea( $gNotifyText, 'ui-icon-info', 'ui-state-highlight' );

		vfc.$AjaxMdContainer.append(
			$( '<label>', {
				'for': 'mdTargetInput',
				text: vfc.i18n.mdTargetInput
			} ), $( '<br>' ), $targetSelect, ' ', $targetInput, $( '<br>' ), $gMoreOptionsToggler, $gNotifyArea.hide() );
		$targetSelect.change();
		$targetInput.on( 'input keyup change', function ( /* e */ ) {
			var thisVal = $( this ).val();
			if ( rxCat.test( thisVal ) ) {
				$( this ).val( thisVal = thisVal.replace( rxCat, '' ) );
				$targetSelect.val( nsCat );
				$targetSelect.change();
			} else if ( rxUser.test( thisVal ) && ( nsPage !== $targetSelect.val() ) ) {
				$( this ).val( thisVal = thisVal.replace( rxUser, '' ) );
				$targetSelect.val( nsUser );
				$targetSelect.change();
			} else if ( rxSearch.test( thisVal ) ) {
				$( this ).val( thisVal = thisVal.replace( rxSearch, '' ) );
				$targetSelect.val( spSearch );
				$targetSelect.change();
			}
			if ( thisVal.length < minlen )
				$submitButton.button( 'option', 'disabled', true );
			else
				$submitButton.button( 'option', 'disabled', false );

			$doc.triggerHandler( 'vFC_Startup_target', [ $targetSelect.val() + ':' + thisVal ] );
		} ).keyup().focus();
		if ( moreOptionsVisible )
			$gMoreOptionsToggler.find( 'a.md-collapsible:first' ).click();

// Bind enter events to our controls
		onEnter( vfc.$AjaxMdContainer.find( 'select,input' ) );

// Load the configuration module
		vfc.loadModule( 'cfg', 'mdConfigInstall' );
// The following modules are not crucial for execution because there are fallbacks
		if ( !$.fx.off )
			mw.loader.load( [ 'jquery.ui' ] );
	},

	cleanReason: function ( uncleanReason ) {
// trim whitespace
		uncleanReason = uncleanReason.replace( /^\s*(.+)\s*$/, '$1' );
// remove signature
		uncleanReason = uncleanReason.replace( /(?:--|–|—)? ?~{3,5}$/, '' );
		return uncleanReason;
	},

/**
** Method to securely close (you may call it "nuke") the dialogs,
** even if there were errors; called on button cancel and by several methods
**/
	thumbDlgClose: function () {
		$doc.triggerHandler( 'vFC', [ 'closing dialog', vfc, vfc.dlg ] );

		if ( vfc.mdBusy ) { // Call myself later if script is busy
			setTimeout( vfc.thumbDlgClose, 20 );
			return true;
		}

// Re-desplay the page's content
		$( 'body' ).css( 'overflow', 'visible' );
// and restore title
		document.title = this.oldDocTitle;

		if ( typeof vfc.dlg === 'object' ) {
			vfc.dlg.dialog( 'destroy' );
			vfc.dlg.remove();
			document.body.style.cursor = 'auto';
			vfc.internalState = 'done';
			try {
				delete vfc.dlg;
			} catch ( ex ) {
				vfc.dlg = 0;
			}
		} else if ( $( this ).children( 'div' ).eq( 0 ).attr( 'id' ) === 'AjaxMdContainer' ) {
			this.dialog( 'destroy' );
			this.parent.remove();
			document.body.style.cursor = 'auto';
			vfc.internalState = 'done';
		}
		$.each( vfc.$dialogsToClose, function ( i, $el ) {
			try {
				$el.dialog( 'close' );
// $el.dialog('destroy');
				$el.remove();
			} catch ( ex ) {}
		} );
	},

	closeAndContinue: function () {
		vfc.thumbDlgClose();
		vfc.nextTask();
	},

	editCountDialog: function ( reason ) {
		var dlgButtons = {};

		dlgButtons[ vfc.i18n.proceedButtonLabel ] = function () {
			vfc.api.$countDlg.dialog( 'close' );
			vfc.api.eBatch = 0;
			vfc.api.eFirst--;
			var i = Math.min( vfc.mdSettings.maxSimultaneousReq - vfc.api.eRunning, vfc.api.eQueue.length );
			for ( ; i > 0; i-- )
				vfc.editAPI.apply( vfc, vfc.api.eQueue.shift() );

		};
		dlgButtons[ vfc.i18n.abortButtonLabel ] = function () {
			vfc.api.$countDlg.dialog( 'close' );
		};

		vfc.api.$countDlg = $( '<div>', {
			text: reason
		} ).append( $( '<br>' ), $( '<a>', {
			style: 'height:5em; font-size:2em; line-height:1.8em',
			href: mw.util.getUrl( 'Special:MyContributions' ),
			target: 'contribswindow',
			text: 'My Contributions'
		} ).click( function ( e ) {
			e.preventDefault();
			window.open( $( this ).attr( 'href' ), 'contribswindow', 'resizable=yes,scrollbars=yes' );
		} ) );
		vfc.api.$countDlg.dialog( {
			title: 'Would you like to proceed?',
			buttons: dlgButtons,
			show: {
				effect: 'highlight',
				duration: 1800
			},
			close: function () {
				vfc.api.$countDlg.remove();
				vfc.api.$countDlg = 0;
			},
			open: function () {
				var $dlg = $( this ).parent();
				var $buttons = $dlg.find( '.ui-dialog-buttonpane button' );
				$buttons.eq( 0 ).specialButton( 'proceed' ).focus();
				$buttons.eq( 1 ).specialButton( 'cancel' );
				$( '.ui-dialog-titlebar-close', $dlg ).hide();
			}
		} );
	},

/**
** Does a MediaWiki API request and passes the result to the supplied callback (method name).
** Uses POST requests for everything for simplicity.
**/
	api: {
		$countDlg: null,
		ratelimited: false,
		qQueue: [],
		eQueue: [],
		qRunning: 0,
		eRunning: 0,
		eBatch: 0,
		eFirst: 0,
		total: 0,
		done: 0,
		wasError: false
	},
// For queries only.
	queryAPI: function ( params, callback, errCallBack ) {
		var setting = vfc.mdSettings,
			api = vfc.api,
			queue = vfc.api.qQueue;

		if ( setting.maxSimultaneousReq > 0 && ( api.qRunning >= setting.maxSimultaneousReq ) ) {
			queue.push( [ params, callback, errCallBack ] );
			return;
		}
		var _always = function () {
			api.qRunning--;
			var i = Math.min( setting.maxSimultaneousReq - api.qRunning, queue.length );
			for ( ; i > 0; i-- ) {
				var args = queue.shift();
				vfc.queryAPI.apply( vfc, args );
			}
		};
		api.qRunning++;
		mw.libs.commons.api.query( params, {
			method: 'POST',
			cache: false,
			cb: function ( r, q ) {
				_always();
				vfc.secureCall( callback, r, q );
			},
			errCb: function ( err, q, r ) {
				_always();
				if ( errCallBack )
					vfc.secureCall( errCallBack, err, q, r, callback );
				else
					vfc.fail( err );
			}
		} );
	},

// For edits only
	editAPI: function ( params, callback, errCallBack, showProgress ) {
		var setting = vfc.mdSettings,
			api = vfc.api,
			queue = vfc.api.eQueue;

		var _firstDlg = function () {
			if ( !api.$countDlg )
				vfc.editCountDialog( vfc._msg( 'edit-count-one-time', setting.firstTest ) );

		};
		var _batchDlg = function () {
			if ( !api.$countDlg )
				vfc.editCountDialog( api.ratelimited ? vfc.i18n.mdEditCountThrottle : vfc.i18n.mdEditCountBatch );

		};

// Prompting each time
// Enqueue requests that exceed the specified limit and execute them after prompting
// Don't prompt immediately in order to prevent confusion but after the edits were done
		if ( setting.testEdits && ( api.eBatch >= setting.testEdits ) ) {
			queue.push( [ params, callback, errCallBack, showProgress ] );
			if ( !api.eRunning )
				_batchDlg();
			return;
		}
// Edits before prompting one time
		if ( !api.eFirst ) {
			queue.push( [ params, callback, errCallBack, showProgress ] );
// Did the first edit hit the limit? Then display dialog because otherwise the process interrupts.
			if ( !api.eRunning )
				_firstDlg();
			return;
		}
		var _always = function () {
			api.eRunning--;
			api.done++;
			var i = Math.min( setting.maxSimultaneousReq - api.eRunning, queue.length );

			if ( showProgress )
				vfc.pb.showProgress( api.total + queue.length, api.done, 'edits' );

// Now check whether immediately dequeue or whether to prompt for confirmation
// i && api.eRunning < 3 --> Only prompt if there are remaining edits in the queue AND if there are less than 3 running edits
			if ( setting.testEdits && vfc.api.done % setting.testEdits === 0 && i && api.eRunning < 3 ) {
				_batchDlg();
				return;
			}
			if ( !api.eFirst && i && api.eRunning < 3 ) {
				_firstDlg();
				return;
			}
			if ( api.$countDlg )
				return;

			for ( ; i > 0; i-- ) {
				var args = queue.shift();
				vfc.editAPI.apply( vfc, args );
			}
		};

		$.extend( params, {
			cb: function ( r, q ) {
				_always();
				vfc.secureCall( callback, r, q );
			},
			errCb: function ( t, r, q ) {
				_always();
				if ( errCallBack ) {
					vfc.secureCall( errCallBack, r, q, t );
					vfc.api.wasError = true;
				} else {
					vfc.fail( t );
				}
			}
		} );

// Update statistics and counters
		api.eBatch++;
		api.eRunning++;
		api.total++;
		api.eFirst--;
		if ( showProgress )
			vfc.pb.showProgress( api.total + queue.length, api.done, 'edits' );

// Send the request
		mw.libs.commons.api.config.maxSimultaneousReq = setting.maxSimultaneousReq;
		mw.libs.commons.api.editPage( params );
	},

/**
* { error failback handler for thumbs }
*
* @param {string}  err  The error
* @param {json}    q    The query
* @param {json}    r    The result
* @param {Function} callback The callback
*/
	failQueriedFile: function ( err, q, r, callback ) {
		r = r ? r.error : 0;
		if ( r && r.code === 'urlparamnormal' ) { // [[phab:T187016]]
			var rFile = 'File:' + r.info.replace( /.*? ([^\s]+)\.$/, '$1' ).replace( /_/g, ' ' );
// Get defect image and remove it from query
			var regFile = new RegExp( '\\|?' + mw.util.escapeRegExp( rFile ) );
			var q2 = $.extend( {}, q ); // copy query
			this.log( rFile + ' is defect' );
			regFile = q.titles.replace( regFile, '' );
// try again
			if ( regFile && q.titles !== regFile ) {
				q.titles = regFile;
				vfc.queryAPI( q, callback, 'failQueriedFile' );
			}
// Separate affected files
			if ( q2.iiurlheight ) {
				delete q2.iiurlheight;
				delete q2.iiurlwidth;
			} else {
				q2.prop = q2.prop.replace( /\|?imageinfo\|?/, '' );
				delete q2.iiprop;
				delete q2.iilimit;
			}
			//q2.titles = rFile; // catch all affected files
			if (this.failQueriedAgain && this.failQueriedAgain.titles)
				q2.titles = this.failQueriedAgain.titles + '|' + rFile;

			this.failQueriedAgain = q2;
			// If nothing more for normal re-try
			if (q.titles < 5) vfc.queryAPI(this.failQueriedAgain, callback);
			return;
		}
		vfc.fail( err );
	},

/**
* { crude error handler }
*
* @param {string}  err  The error
**/
	fail: function ( err ) {
		err = err.toString();
		document.body.style.cursor = 'auto';
		this.log( 'Error: ' + err );
		var msg = this.i18n.taskFailure[ this.currentTask ] || ( '-- NO TASK DESCR. FOR ' + this.currentTask + ' PLEASE ADD IT --' );

		var reportPage = '';
		this.mdBusy = false; // Prevents that thumbDlgClose will be refused

		this.pb.setCurrentTaskState( 'md-failed' );

		if ( ( {
			md: 1,
			revert: 1,
			done: 1
		} )[ this.internalState ] ) {
			reportPage = this.mdErrReportPath;

			this.internalState = 'err';
		}
		if ( this.pb )
			this.pb.setError( msg + ' ##### ' + err );
	},
	log: function ( toLog ) {
		if ( window.console && $.isFunction( window.console.warn ) )
			window.console.warn( toLog );
		else mw.log.warn( toLog );
	},

/**
** Method to catch errors and report where they occurred
**/
	secureCall: function ( fn ) {
		var o = vfc;
		try {
			o.currentTask = arguments[ 0 ];
			if ( $.isFunction( fn ) )
				return fn.apply( o, Array.prototype.slice.call( arguments, 1 ) ); // arguments is not of type array so we can't just write arguments.slice
			else if ( typeof fn === 'string' )
				return o[ fn ].apply( o, Array.prototype.slice.call( arguments, 1 ) );
			else
				o.fail( 'This is not a function!' );

		} catch ( ex ) {
			o.fail( ex );
		}
	},

	$dialogsToClose: [],

/**
** Simple task queue. addTask() adds a new task to the queue, nextTask() executes
** the next scheduled task. Tasks are specified as method names to call.
**/
	tasks: [],
// list of pending tasks
	currentTask: '',
// current task, for error reporting
	oldTask: '',
// task called before
	addTask: function ( task ) {
		this.tasks.push( task );
	},
	nextTask: function () {
		var task = this.currentTask = this.tasks.shift();
		return ( $.isArray( task ) ? this.secureCall.apply( this, task ) : this.secureCall( task ) ); // Ja da guckste ...
	},
	lastTask: function () {
		var task = this.currentTask = this.tasks[ this.tasks.length - 1 ];
		this.tasks = [];
		return ( $.isArray( task ) ? this.secureCall.apply( this, task ) : this.secureCall( task ) );
	},

/**                          **
*************** SETTINGS / CONFIGURATION ****************
**                          **/
	mdUserTags: {
		c_replace: {},
		prepend: {},
		prepNf: {
			tag: '==[[:%FILE%]]==\n',
			summary: 'There are questions or comments about [[%FILE%]] and maybe other files.'
		},
		append: {},
		cv: {
			tag: '{{subst:copyvionote|1=%FILE%}}',
			summary: 'Notification about multiple possible copyright violations.'
		},
		'cv-dw': {
			tag: '{{subst:Derivativenote|1=%FILE%}}',
			summary: 'Notification about multiple possible copyright violations. (Derivative)'
		},
		'cv-fu': {
			tag: '{{subst:No fair use|1=%FILE%}}',
			summary: 'Please do not upload media with fair-use claims to Commons.'
		},
		'cv-logo': {
			tag: '{{subst:copyvionote|1=%FILE%}}',
			summary: 'Notification about multiple possible copyright violations. (Logo)'
		},
		'cv-ndw': {
			tag: '{{subst:copyvionote|1=%FILE%}}',
			summary: 'Notification about multiple possible copyright violations. (NoDerivative)'
		},
		del: {
			tag: '{{subst:idw|2=%REQUESTPAGE%|3=plural}}\nAffected:\n* [[:%FILE%]]\n',
			summary: 'Some of your [[%FULLREQUESTPAGE%|uploads have been nominated for deletion]].'
		},
		np: {
			tag: '{{subst:image permission|1=%FILE%}}',
			summary: 'Please send permission for [[%FILE%]] (and the listed ones) to [[COM:VRT|VRT]].'
		},
		ns: {
			tag: '{{subst:image source|1=%FILE%}}',
			summary: '[[%FILE%]] (and the listed ones) need [[COM:Source|a source]] added to the file description.'
		},
		'ns-dw': {
			tag: '{{subst:dw image source|1=%FILE%}}',
			summary: '[[%FILE%]] (and the listed ones) are [[COM:DW|derivative works]] and adding sources to the file description is required.'
		},
		nl: {
			tag: '{{subst:image license|1=%FILE%}}',
			summary: '[[%FILE%]] (and the listed ones) do not have valid [[Commons:Copyright tags|copyright tags]].'
		},
		otrs: {},
		other: {},
		aDelete: {},
		aDeleteCV: {
			tag: '{{subst:speedywhat|1=%FILE%}}',
			summary: 'Notification about the deletion of multiple possible copyright violations.'
		}
	},
	mdFileTags: {
		c_replace: {
			summary: 'Doing %replacementcount% replacements.'
		},
		prepend: {
			summary: 'Inserting "%pattern%"'
		},
		prepNf: {
			summary: 'Inserting "%pattern%"'
		},
		append: {
			summary: 'Inserting "%pattern%"'
		},
		cv: {
			tag: '{{copyvio|1=%REASON%}}\n',
			summary: '%cv% %REASON%'
		},
		'cv-dw': {
			tag: '{{copyvio|1=Derivative work of copyrighted material. %REASON%}}\n',
			summary: '%cv% it is a [[COM:DW|derivative work]] of a work protected by copyright.'
		},
		'cv-fu': {
			tag: '{{Fair use}}\n',
			summary: '%cv% [[COM:FU|fair use]] media are not allowed on Commons.'
		},
		'cv-logo': {
			tag: '{{Logo}}\n',
			summary: '%cv% this logo exceeds the [[threshold of originality]] and therefore is subject to copyright.'
		},
		'cv-ndw': {
			tag: '{{Nonderivative}}\n',
			summary: '%cv% no derivatives are allowed, which is [[COM:L|incompatible with Commons]].'
		},
		del: {
			tag: '{{delete|reason=%REASON%|subpage=%SUBPAGE%|%D%}}\n',
			summary: '[[COM:DR|Nominating for deletion]].'
		},
		np: {
			tag: '{{subst:npd}}\n',
			summary: 'Missing [[COM:PERMISSION|permission]].'
		},
		ns: {
			tag: '{{subst:nsd}}\n',
			summary: 'File has no [[COM:Source|source]].'
		},
		'ns-dw': {
			tag: '{{subst:Dw-nsd}}\n',
			summary: 'File is a [[COM:DW|derivative work]] and sources or permission of the original works are not given.'
		},
		nl: {
			tag: '{{subst:nld}}\n',
			summary: 'Missing a valid [[Commons:Copyright tags|copyright tag]] (/[[Commons:Licensing|license]]).'
		},
		otrs: {
			summary: 'Adding an [[COM:VRT|VRT]] tag to the permission section of this file. Removing problem tags.'
		},
		other: {
			summary: 'Adding an [[COM:VRT|VRT]] or license-review tag to the permission section of this file.'
		},
		aDelete: {
			summary: ''
		},
		aDeleteCV: {
			summary: ''
		}
	},
	mdOpt: {
// minLenReq - Minimum length of reason / text to insert; bLimit - Limit of additional summary length
		c_replace: {
			minLenReq: 0,
			bLimit: 150,
			replaceNode: 1
		},
		prepend: {
			minLenReq: 0,
			reasonText: 'mdInsertGeneric',
			bLimit: 110
		},
		prepNf: {
			minLenReq: 0,
			reasonText: 'mdInsertAll',
			bLimit: 110
		},
		append: {
			minLenReq: 0,
			reasonText: 'mdInsertGeneric',
			bLimit: 110
		},
		cv: {
			minLenReq: 11,
			reasonText: 'mdInsertDeleteReasen',
			reasonParse: 'mdDelteConfirmation',
			bLimit: 100
		},
		'cv-dw': {
			minLenReq: 6,
			reasonText: 'mdInsertDeleteReasen',
			reasonParse: 'mdDelteConfirmation',
			bLimit: 45
		},
		'cv-fu': {
			minLenReq: 0,
			bLimit: 60
		},
		'cv-logo': {
			minLenReq: 0,
			bLimit: 40
		},
		'cv-ndw': {
			minLenReq: 0,
			bLimit: 45
		},
		del: {
			minLenReq: 11,
			reasonText: 'mdInsertDeleteReasen',
			reasonParse: 'mdDelteConfirmation',
			bLimit: 140
		},
		np: {
			minLenReq: 0,
			bLimit: 140
		},
		ns: {
			minLenReq: 0,
			bLimit: 140
		},
		'ns-dw': {
			minLenReq: 0,
			bLimit: 80
		},
		nl: {
			minLenReq: 0,
			bLimit: 90
		},
		otrs: {
			minLenReq: 0,
			reasonText: 'mdInsertOther',
			reasonParse: 'mdInsertConfirmation',
			prefill: 'mdOTRSprefill',
			permissionWrapper: 1,
			bLimit: 85
		},
		other: {
			minLenReq: 0,
			reasonText: 'mdInsertOther',
			reasonParse: 'mdInsertConfirmation',
			prefill: 'mdOTRSprefill',
			permissionWrapper: 1,
			bLimit: 90
		},
		aDelete: {
			summaryMinLen: 8,
			reasonParse: 'mdDelteConfirmation',
			confirm: 'deleteConfirm',
			bLimit: 190,
			addSummary: 'mdInsertDeleteSummary'
		},
		aDeleteCV: {
			summaryMinLen: 8,
			reasonParse: 'mdDelteConfirmation',
			confirm: 'deleteConfirm',
			bLimit: 190,
			addSummary: 'mdInsertDeleteSummary'
		}
	},
	mdCommandsExec: {
		c_replace: {
			tasks: [ 'mdRefreshCache', 'mdInsertPermission' ],
			userGroups: [ 'user' ]
		},
		prepend: {
			tasks: [ 'mdPrependText', 'mdPrependTemplate' ],
			userGroups: [ 'user' ]
		},
		prepNf: {
			tasks: [ 'mdPrependText', 'mdPrependTemplate', 'mdNotifyUploaders' ],
			userGroups: [ 'user' ]
		},
		append: {
			tasks: [ 'mdAppendText', 'mdAppendTemplate' ],
			userGroups: [ 'user' ]
		},
		cv: {
			cleanReason: true,
			tasks: [ 'mdPrependTemplate', 'mdNotifyUploaders', 'listMobileUploadSpeedy' ],
			userGroups: [ 'user' ]
		},
		'cv-dw': {
			cleanReason: true,
			tasks: [ 'mdPrependTemplate', 'mdNotifyUploaders', 'listMobileUploadSpeedy' ],
			userGroups: [ 'user' ]
		},
		'cv-fu': {
			cleanReason: true,
			tasks: [ 'mdPrependTemplate', 'mdNotifyUploaders', 'listMobileUploadSpeedy' ],
			userGroups: [ 'user' ]
		},
		'cv-logo': {
			tasks: [ 'mdPrependTemplate', 'mdNotifyUploaders', 'listMobileUploadSpeedy' ],
			userGroups: [ 'user' ]
		},
		'cv-ndw': {
			tasks: [ 'mdPrependTemplate', 'mdNotifyUploaders', 'listMobileUploadSpeedy' ],
			userGroups: [ 'user' ]
		},
		del: {
			cleanReason: true,
			tasks: [ 'mdCreateRequestSubpage', 'mdPrependTemplate', 'mdNotifyUploaders', 'mdListRequestSubpage', 'listMobileUpload' ]
		},
		np: {
			tasks: [ 'mdPrependTemplate', 'mdNotifyUploaders', 'listMobileUploadSpeedy' ],
			userGroups: [ 'user' ]
		},
		ns: {
			tasks: [ 'mdPrependTemplate', 'mdNotifyUploaders', 'listMobileUploadSpeedy' ],
			userGroups: [ 'user' ]
		},
		'ns-dw': {
			tasks: [ 'mdPrependTemplate', 'mdNotifyUploaders', 'listMobileUploadSpeedy' ],
			userGroups: [ 'user' ]
		},
		nl: {
			tasks: [ 'mdPrependTemplate', 'mdNotifyUploaders', 'listMobileUploadSpeedy' ],
			userGroups: [ 'user' ]
		},
		otrs: {
			tasks: [ 'mdRefreshCache', 'mdInsertPermission' ],
			userGroups: [ 'user' ]
		},
		other: {
			tasks: [ 'mdRefreshCache', 'mdInsertPermission' ],
			userGroups: [ 'user' ]
		},
		aDelete: {
			cleanReason: true,
			tasks: [ 'mdDelete' ],
			userGroups: [ 'sysop' ],
			confirm: 'deleteConfirm'
		},
		aDeleteCV: {
			cleanReason: true,
			tasks: [ 'mdDelete', 'mdNotifyUploaders' ],
			userGroups: [ 'sysop' ],
			confirm: 'deleteConfirm'
		}
	},
	mdCommandsPostExec: {
		c_replace: {
			tasks: []
		},
		prepend: {
			tasks: []
		},
		prepNf: {
			tasks: []
		},
		append: {
			tasks: []
		},
		cv: {
			tasks: [ 'mdRvGenOGallery' ]
		},
		'cv-dw': {
			tasks: [ 'mdRvGenOGallery' ]
		},
		'cv-fu': {
			tasks: [ 'mdRvGenOGallery' ]
		},
		'cv-logo': {
			tasks: [ 'mdRvGenOGallery' ]
		},
		'cv-ndw': {
			tasks: [ 'mdRvGenOGallery' ]
		},
		del: {
			tasks: [ 'mdRvGenOGallery' ]
		},
		np: {
			tasks: [ 'mdRvGenOGallery' ]
		},
		ns: {
			tasks: [ 'mdRvGenOGallery' ]
		},
		'ns-dw': {
			tasks: [ 'mdRvGenOGallery' ]
		},
		nl: {
			tasks: [ 'mdRvGenOGallery' ]
		},
		otrs: {
			tasks: []
		},
		other: {
			tasks: []
		},
		aDelete: {
			tasks: [ 'mdRvGenOGallery' ]
		},
		aDeleteCV: {
			tasks: [ 'mdRvGenOGallery' ]
		}
	},
	mdOptText: {
		cv: 'Marking as possible [[COM:Copyvio|copyright violation]] because '
	},

	mdGetWatchlistSelect: {
		watch: 'watch',
		'do not change watchstatus': 'nochange',
		'as specified in your preferences': 'preferences'
	},

	mdDefaults: [ {
		name: 'userNote',
		label: 'Additional note to leave on the user\'s talk page',
		'default': 'Yours sincerely,',
		controls: '#mdTalkNote'
	}, {
		name: 'firstTest',
		label: 'Ask for confirmation before doing edit number … (deletions not affected)',
		'default': 0,
		min: 0,
		max: 50
	}, {
// Ratelimits may restrict this
		name: 'testEdits',
		label: 'Ask for confirmation after each … edits (deletions not affected)',
		'default': ( mw.user.isAnon() ? 7 : 0 ),
		min: 0,
		max: 500
	}, {
		name: 'defaultAction',
		label: 'Default action to perform',
		'default': 'del',
		select: function () {
			if ( $( this.controls ).length ) {
				return $( this.controls ).clone();
			} else {
				var $sel = $( '<select size="1"></select>' );
				$.each( vfc.i18n.mdOptions, function ( i, el ) {
					$sel.append( $( '<option>', {
						text: el,
						value: i
					} ) );
				} );
				return $sel;
			}
		},
		controls: '#AjaxMdType'
	}, {
		name: 'watchlistUserTalk',
		label: 'Watch edited user talk pages',
		'default': 'preferences',
		select: 'mdGetWatchlistSelect'
	}, {
		name: 'watchlistFiles',
		label: 'Watch edited file pages (Exceptions below override this preference)',
		'default': 'preferences',
		select: 'mdGetWatchlistSelect'
	}, {
		name: 'watchlistReplace',
		label: 'Watch files during custom replace',
		'default': 'nochange',
		select: 'mdGetWatchlistSelect'
	}, {
		name: 'watchlistOTRS',
		label: 'Watchlist settings during using VRT options',
		'default': 'nochange',
		select: 'mdGetWatchlistSelect'
	}, {
		name: 'loadBatchSize',
		label: 'Amount of files to be loaded when clicking on more or when scrolling down',
		'default': 30,
		min: 1,
		max: ( ( isSysop || isBot ) ? 1000 : 100 )
	}, {
		name: 'maxSimultaneousReq',
		label: 'Maximum number of requests to send to the API simultaneously (note: may cause extreme edit speeds)',
		'default': ( ( isSysop || isBot ) ? 10 : ( mw.user.isAnon() ? 1 : 5 ) ),
		min: 1,
		max: ( ( isSysop || isBot ) ? 100 : ( mw.user.isAnon() ? 2 : 50 ) )
	}, {
		name: 'summaryChacheLen',
		label: 'Number of reasons to remember (not fully implemented, yet)',
		'default': 5,
		min: 0,
		max: 20
	}, {
		name: 'loadThumbs',
		label: 'Load thumbnails by default (per run setting is in "More options")',
		'default': true
	}, {
		name: 'loadWikitext',
		label: 'Load wikitext of each file by default (per run setting is in "More options")',
		'default': true
	}
	],

// Will be filled while initializing
	mdSettings: {},

	mdTagRemoval: [
		[ /\{\{[Pp]ermission[ _][Pp]ending[^}\n]*\}\}/g ],
		[ /\{\{[Pp]ermission[ _][Rr]eceived\|.*\}\}/g ],
		[ /\{\{[Nn]o[ _]license[^}\n]*\}\}/g ],
		[ /\{\{[Nn]o[ _]permission[^}\n]*\}\}/g ],
		[ /\{\{[Nn]o[ _]VRTS[ _]permission[^}\n]*\}\}/g ],
		[ /\{\{[Nn]o[ _]source[ _]since\|.*\}\}/g ],
		[ /\{\{[Dd]w[ _]no[ _]source[ _]since\|.*\}\}/g ],
		[ /\{\{[Ss]peedydelete.*\}\}/g ],
		[ /\{\{[Cc]opyvio.*\}\}/g ],
		[ /\{\{[Ll]ogo[|.*]?\}\}/g ],
		[ /\{\{[Cc]over\}\}/g ],
		[ /\{\{[Dd]erivative[|.*]?\}\}/g ],
		[ /\{\{[Ss]creenshot.*\}\}/g ],
		[ /\{\{[Nn]oncommercial.*\}\}/g ],
		[ /\{\{[Nn]onderivative.*\}\}/g ]
	],

	mdTagRecognization: [
// RegExp for the tag								note to add to the thumb-page
		[ /Deletion requests.*/, 'd' ],
		[ /Incomplete deletion requests.*/, 'd(incomplete)' ],
		[ /Media missing permission.*/, '!p' ],
		[ /Media without a license.*/, '!l' ],
		[ /Media uploaded without a license.*/, 'uwl' ],
		[ /Media without a source.*/, '!s' ],
		[ /Other speedy deletions.*/, 'speedyd' ],
		[ /Copyright violations.*/, 'copyvio' ],
		[ /Permission pending.*/, 'pn', 'mdtag-ticket-pending' ],
		[ /Items with (?:ticket )?VRTS permission confirmed.*/, 'ppm', 'mdtag-ticket-confirmed' ],
		[ /Permission received.*/, 'pr', 'mdtag-ticket-received' ],
		[ /[Aa]dmin[- ]reviewed [licenses|Flickr images]/, 'lrd', 'mdtag-reviewed' ],
		[ /Flickr images reviewed by/, 'frd', 'mdtag-reviewed' ],
		[ /Flickr images needing human review/, 'frR', 'mdtag-review-pending' ],
		[ /License review needed/, 'lrR', 'mdtag-review-pending' ]
	],

	mdLicenseRecognization: [
// RegExp for the tag			note to add to the thumb-page
		[ /Category:CC[- _]BY-SA.*/i, 'CC-BY-SA' ],
		[ /Category:CC[- _]BY.*/i, 'CC-BY' ],
		[ /Category:CC[- _]Zero.*/i, 'CC0' ],
		[ /Category:GFDL.*/i, 'GFDL' ],
		[ /Category:PD[- _]Old.*/i, 'PD-old' ],
		[ /Category:PD[- _]self.*/i, 'PD-self' ],
		[ /Category:PD[- _]author.*/i, 'PD-author' ],
		[ /Category:PD.*/i, 'PDx' ],
		[ /Category:FAL/i, 'LibreA' ],
		[ /Category:Images requiring attribution/i, 'Attrib' ],
		[ /Category:Copyrighted free use.*/i, 'CFreeUse' ],
		[ /Category:Mozilla Public License/i, 'MPL' ],
		[ /Category:GPL/i, 'GPL' ],
		[ /Category:Free screenshot.*/i, 'free-Screenshot' ],
		[ /Category:Copyright by Wikimedia.*/i, '(c)WMF' ],
		[ /Category:Self[- _]published[ _]work/i, '<b>self</b>' ], // rm the next tags from being shown
		[ /Valid SVG/, '' ], [ /Translation possible/, '' ], [ /License[- _]migration redundant/, '' ], [ /Retouched pictures/, '' ], [ /Extracted images/, '' ], [ /Images with annotations/, '' ], [ /Media needing category/, '' ], [ /requiring review/, '' ], [ /[Flickr|License] review needed/, '' ], [ /[Aa]dmin[- ]reviewed/, '' ], [ /UploadWizard/, '' ], [ /Permission[- _]received/, '' ], [ /Items[- _]with[- _]VRTS[- _]permission/, '' ], [ /Permission[- _]pending/, '' ], [ /Flickr images reviewed by/, '' ], [ /Media with locations/, '' ], [ /Media missing/, '' ], [ /Media without a/, '' ], [ /Deletion requests/, '' ]
	],

	mdOTRSprefill: '{{PermissionTicket|id=%ID|user={{subst:REVISIONUSER}}}} {{subst:OR|id=%ID|reason=processing, nonfree, email}}',
	mdOTRSTicketPrefill: '{{PermissionTicket|ticket=%URL|~~~~}} {{subst:OR|ticket=%URL|reason=processing, nonfree, email}}',
	mdSimplePermissionPattern: /(\|\s*Permission\s*=)/i,
	mdPermissionPattern: /^((?:.|\n)+?)(\|\s*Permission\s*=)((?:.|\n)+?)?((?:\n\s*\}\}|\n\s*\|)(?:.|\n)*)$/i,
	mdNextParamPattern: /^(?:\n\s*\}\}|\n\s*\|)/i,
	mdURLPattern: /(https:\/\/\S*)/,
	mdRegExpPattern: /^\/(.+)\/([oigmx]{0,5})$/,
	mdWikipageRegExp: new RegExp( mw.util.escapeRegExp( mw.config.get( 'wgArticlePath' ).replace( '$1', '' ) ) + '(.+)' ),
	mdSelfPath: 'MediaWiki:Gadget-VisualFileChange.js',
	mdHelpPath: 'COM:VFC',
	mdErrReportPath: 'User_talk:Rillke/AjaxMassDelete.js',
	mdChangeTag: 'VisualFileChange',
	mdUserPrefix: mw.config.get( 'wgFormattedNamespaces' )[ 2 ] + ':',
	mdUserTalkPrefix: mw.config.get( 'wgFormattedNamespaces' )[ 3 ] + ':',
	mdContribPrefix: mw.config.get( 'wgFormattedNamespaces' )[ -1 ] + ':Contributions/',
	mdRequestPagePrefix: 'Commons:Deletion requests/',
	mdReLoader: '<p align="center"><img src="//upload.wikimedia.org/wikipedia/commons/c/ce/RE_Ajax-Loader.gif"/></p>',
	mdErrorsReportPath: mw.util.getUrl( 'MediaWiki talk:Gadget-VisualFileChange.js' ),
	mdHelpNode: '<a href="' + mw.util.getUrl( 'Help:VisualFileChange.js' ) + '" target="_blank"><img title="Help and known issues. Icon by Markus Hohenwarter and Michael Borcherds, cc-by-sa-3.0" alt="?" src="//upload.wikimedia.org/wikipedia/commons/4/45/GeoGebra_icon_help.png"></a> ',
	summaryChageKey: 'vFC_Suggestions',
	icons: {
		nochange: '//upload.wikimedia.org/wikipedia/commons/thumb/7/76/Crystal_Project_tick_yellow.png/16px-Crystal_Project_tick_yellow.png',
		current: '//upload.wikimedia.org/wikipedia/commons/thumb/4/41/Crystal_Clear_action_loopnone.png/16px-Crystal_Clear_action_loopnone.png',
		done: '//upload.wikimedia.org/wikipedia/commons/thumb/a/ac/Crystal_Project_success.png/16px-Crystal_Project_success.png',
		failed: '//upload.wikimedia.org/wikipedia/commons/thumb/c/c8/Crystal_Project_cancel.png/16px-Crystal_Project_cancel.png',
		info: '//upload.wikimedia.org/wikipedia/commons/0/09/Crystal_Clear_action_info.png',
		question: '//upload.wikimedia.org/wikipedia/commons/9/98/Crystal_Clear_app_miscellaneous_2.png',
		attention: '//upload.wikimedia.org/wikipedia/commons/thumb/a/af/Crystal_Clear_app_error-info.png/16px-Crystal_Clear_app_error-info.png'
	},

// Translatable strings
	i18n: {
		mdButtonLabel: 'Perform batch task',
		mdPerformOnWhichTarget: 'What user or category is this action about?',
		mdTargetInput: 'User or category:',
		mdLoadThumbs: 'Load thumbnails',
		mdLoadWikitext: 'Load wikitext',
		action: 'Action',
		mdDisselectAll: ' (De-)select&nbsp;all&nbsp;loaded:&nbsp;',
		mdInvertSelection: 'Invert selection',
		mdInsertDeleteReasen: 'Select the files to delete and fill in the reason, please',
		mdInsertDeleteHeading: 'Insert the heading for the mass deletion request, please',
		mdInsertOther: 'Please insert the VRT (or other) text to add to the permission-section',
		mdInsertEditSummary: 'An auto-edit summary for the file-pages will be created. Additionally add',
		mdInsertDeleteSummary: 'Specify the reason for the deletion',
		mdReplacePermissionText: 'Clean permission-section?',
		mdCustomReplaceText: 'Please insert the text that should be inserted instead',
		mdInsertGeneric: 'Please insert the text to be added to each selected file.',
		mdInsertAll: 'Insert the text to be added to each selected file. Do not forget to add the text for the user.',
		mdInsertTalkNote: 'Please enter a note to add to the user\'s talk-page',
		mdInsertReplaceMatch: 'What text should become replaced on the selected files?',
		mdDelteConfirmation: 'Your provided reason to delete is',
		mdInsertConfirmation: 'Your provided tag to insert in the permission-section is',
		mdProfileCantSave: 'Could not save your current inputs into your browser',
		mdEditCountThrottle: 'Due to rate-limits on Commons, no further edits are possible within 1 minute. Please wait and then, click on continue. Use the time to do something useful like checking your last contributions.',
		mdEditCountBatch: 'One batch of edits is done as specified in the advanced settings. Would you like to proceed?',
		kibibyte: '<abbr title="1 KibiByte= 1024 Bytes">KiB</abbr>',
		hasTalk: 'This file has a talk page',
		mdMore: 'more',
		mdNoResult: 'Script cannot find any file / initial upload in / by %TARGET%.',
		mdExecutingTaskEnumerateFiles: 'Enumerating files for the requested task.',
		mdExecutingTask: 'Executing your requested task.',
		mdCuteSelectLabel: 'Advanced Select Files',
		mdDelContribsButtonLabel: 'Cached deleted uploads',
		mdRevertButtonLabel: 'Revert images',
		proceedButtonLabel: 'Proceed',
		submitButtonLabel: 'Execute',
		cancelButtonLabel: 'Cancel',
		abortButtonLabel: 'Abort',
		mdPleaseWait: 'Please wait.',

		filesIn: 'Files in',
		filesBy: 'Initially uploaded files by',
		filesOn: 'Files on page',
		filesWith: 'Files found with search',

		browsertitle: 'VisualFileChange: Welcome, %USER%!',

		startAt: 'Start at',
		optStartAt: 'Start listing from a specific date',
		optStartAtFile: 'Start listing from a given file name (more precise: sortkey)',
		optStartAtHowTo: 'Format: YYYY-MM-DD<br> or, optionally<br>YYYY-MM-DD&nbsp;hh:mm:ss<br>or use the picker',
		optStartFileHowTo: 'Start sortkey (finding a sortkey: [[Category:Name|>>>sortkey<<<]], equals file name if no sortkey specified). Case sensitive. Usually you want the first letter upper case!',
		optMore: 'More options',
		offerContinue: 'You entered the same target as performed edits on last time and the good news are that VisualFileChange has automatically saved the files that were loaded last so you can continue there.',
		continueNow: 'Continue now!',
		sorting: 'Sorting',
		optNewToOld: 'from new to old (category: added-date)',
		optOldToNew: 'from old to new (category: added-date)',
		optDefault: 'default',
		optAsc: 'asc, alphabetical',
		optDesc: 'desc, alphabetical',

		mdConfirm: {
			deleteConfirmTitle: 'Confirming deletion',
			deleteConfirm: 'Do you really want to DELETE these files using your administrator privileges?',
			deleteConfirmIgnore: 'Yes, delete!',
			deleteConfirmCancel: 'No, back, please, back!'
		},

		cuteSelect: {
			heading: 'Advanced-Selection: Specify the options, please',
			and: 'AND',
			intro: 'The selection of matching and loaded files will be changed. If you want to apply changes, click on the button in the bottom. To close this dialog, click on the cross in the top right corner. Specify what to (de-)select, empty fields are considered fulfilling the condition:',
			select: 'Select (/Deselect)',
			inCat: 'In Category',
			title: 'Title matches',
			wikitext: 'Wikitext matches',
			matches: 'matches',
			size: 'Size',
			kibibyte: 'KibiBytes (1024 Bytes)',
			uploader: 'Uploader is',
			date: '<abbr title="Only one date is required. But the first date (start date) must be before the second date (end date).">Date</abbr> (time is optional)',
			between: 'between',
			before: 'If only one date specified, match all before that date.',
			after: 'If only one date specified, match all after that date.',
			titleplaceholder: '(Reg)(?:ular )?(Exp)(?:ression)?',
			wikitextplaceholder: 'Wikitext matches RegExp',
			dateplaceholder: 'YYYY-MM-DD hh:mm:ss',
			button: 'Apply'
		},

		endDlg: {
			heading: 'What would you like to do next?',
			intro: 'Note: You cannot execute new requests without reloading this page. ',
			saveInProfile: 'But you can save your inputs into a profile.',
			aboutLastExec: 'The inputs of the last executed requests are automatically saved.',
			errorDuringTask: 'We regret the the inconvenience: The Server-API returned an error during executing your requested task. ' +
'Please check your contributions, whether something went wrong.',
			checkContribs: 'Check your contributions',
			checkDeletions: 'Check deletion log',
			goToRequestPage: 'Go to the created request page',
			goUserTalk: 'Look at the user\'s talk-page',
			goUserContribs: '…or the user\'s contribs',
			reload: 'Reload this page',
			title: 'VisualFileChange: Ready!'
		},

		mdPotentialProblems: {
			titleNf: 'No files selected',
			textNf: 'It seems to me that you did not select any file to tag. Proceed?',
			titleRE: 'Regular expression?',
			textRE: 'The pattern to replace seems to be a Regular Expression but is not flagged as it (checkbox).',
			titleInvalidRE: 'Invalid Regular Expression',
			textInvalidRE: 'The regular expression is invalid. Maybe "//" are missing. Required syntax: /regexp/flags where flags can be i,g,m.',
			back: 'Oops forgot this.',
			proceed: 'Proceed anyway.'
		},

		mdOptions: {
			cv: 'Copyvio',
			'cv-dw': 'Copyvio derivative',
			'cv-fu': 'Copyvio fair-use',
			'cv-logo': 'Copyvio sophisticated logo',
			'cv-ndw': 'Copyvio derivative prohib',
			del: 'Nominate for deletion',
			np: 'No permission',
			ns: 'No source',
			'ns-dw': 'No source -Derivative',
			nl: 'No license',
			other: 'VRTS- add',
			otrs: 'VRTS- remove tags',
			c_replace: 'custom replace',
			prepend: 'prepend any text',
			append: 'append any text',
			prepNf: 'prepend text, notify uploaders',
			aDelete: 'Delete! (admin only)',
			aDeleteCV: 'Delete and notify! (admin only)'
		},

		reasonAutoSuggest: {
			aDelete: 'MediaWiki:Deletereason-dropdown',
			aDeleteCV: 'MediaWiki:Deletereason-dropdown'
		},

		cfg: {
			startProfileManager: 'profiles',
			startConfigManager: 'advanced configuration',
			tmpStored: 'Temporarily stored',
			tmpStoredText: 'Configuration will be alive as long as you\'re on this page',
			youCanCloseDialog: 'You can close this dialog now.',
			jsSaved: 'Saved',
			jsSavedText: 'Configuration saved to your JavaScript',
			profileManager: 'Profile manager',
			aboutProfiles: 'Save the current input state into a profile or load a profile. VisualFileChange automatically updates a profile (auto) when you execute a task.',
			jsProfileSaved: 'Saved',
			jsProfileSavedText: 'The selected profile was saved to your user namespace',
			jsProfileRm: 'Removed',
			jsProfileRmText: 'The selected profile was removed from your user namespace',
			jsProfileErrText: 'Error. Profile not saved: ',
			jsProfileWarn: 'Problem',
			jsProfileWarnText: 'Updating profiles threw an issue: ',
			profileSelectLocation: 'Save current inputs into your',
			profileName: 'Use the same name again to override a profile.',
			locationBrowser: 'Browser (may not permanent)',
			locationAccount: 'Commons-account (publicly visible)',
			loadProfile: 'Load',
			loadProfileText: 'Load a profile. Caution: Your current inputs will be lost. Double-click a profile name to load it and return.',
			removeProfile: 'Remove',
			removeProfileText: 'Remove a profile.'
		},

		namespace: {
			page: 'Full page name',
			2: 'User name',
			14: 'Category name'
		},

		specials: {
			search: 'Search query'
		},

		tasks: 'Tasks:',
		task: {
			start: 'Starting and gathering information.',
			target: 'Determining target.',
			list: 'Retrieving file-list from server.',
			datails: 'Retrieving details from server.',
			inputcheck: 'Checking input.',
			mdPrependTemplate: 'Tagging files. (Prepend text)',
			mdAppendTemplate: 'Tagging files. (Append text)',
			mdPrependText: 'Prepending text to files.',
			mdAppendText: 'Appending text to files.',
			mdRefreshCache: 'Refreshing cached file texts.',
			mdInsertPermission: 'Inserting permission or custom replace.',
			mdNotifyUploaders: 'Notifying uploaders.',
			mdCreateRequestSubpage: 'Creating request subpage.',
			mdListRequestSubpage: 'Listing request subpage to the daily list.',
			listMobileUpload: 'tracking mobile uploads',
			listMobileUploadSpeedy: 'tracking mobile uploads',
			mdRvGenOGallery: 'Revert overwritten files?',
			mdDelete: 'Deleting files'
		},

		taskFailure: {
			start: 'An error occurred while starting the request an determining the contributor. Nothing has been modified.',
			findOriginalUploader: 'An error occurred while trying to get the initial uploader of this image.',
			findOriginalUploaderCB: 'An error occurred after trying to obtain the initial uploader of this image.',
			reinit: 'An error occurred while starting the request and prefilling the contributor.',
			mdCreateList: 'While trying to prepare to invoke the list-query, an error occurred.',
			mdFindUploads: 'An error occurred while querying the upload-list.',
			mdFindUploadsCB: 'An error occurred after querying the upload-list.',
			mdFindCatMembers: 'Error trying to list the cat-members.',
			mdFindCatMembersCB: 'There is something wrong with the file-list (cat)',
			mdGenIGallery: 'An error occurred setting up the selection dialog.',
			mdSendNextQueries: 'An error occurred preparing to query file-information.',
			mdCreateGalleryBox: 'While creating the HTML for a gallerybox, an error occurred.',
			mdCreateDelUploadItem: 'Creating an entry in the deleted-upload-list failed.',
			mdExtractTags: 'An error occurred while extracting tags from the page\'s content.',
			mdQueriedFile: 'An error occurred after gathering file information and inserting them into the dialog.',
			mdExtractLicense: 'An error occurred while extracting license from categories.',
			mdQueryFileDone: 'An error occurred after gathering all file-information.',
			mdQueryMore: 'Attempting to continue querying script encountered an error.',
			mdExecute: 'An error occurred while fetching your input.',
			mdExecuteContinue: 'An error occurred while preparing the request.',
			mdRefreshCache: 'An error occurred while updating the cached wikitext.',
			mdInsertPermission: 'An error occurred while preparing the insertion of permission.',
			mdInsertOTRS: 'An error occurred while preparing the page-content of permission.',
			mdCreateRequestSubpage: 'An error occurred creating the deletion-request subpage.',
			mdListRequestSubpage: 'There was an error while listing the request-subpage.',
			listMobileUpload: 'There was an error while listing mobile upload',
			listMobileUploadSpeedy: 'There was an error while listing mobile upload',
			mdPrependText: 'There was an error prepending free-text to files.',
			mdAppendText: 'There was an error appending free-text to files.',
			mdTemplateAdded: 'An error occurred after a template has been added to a description page.',
			mdNotifyUploaders: 'An error occurred while notifying uploaders.',
			mdDelete: 'Error deleting files.',
			mdRvGenOGallery: 'An error occurred setting up the selection-revert dialog.',
			mdRvQueriedFile: 'An error occurred after gathering revert-file information and inserting them into the dialog.',
			mdRvCreateImgRevisionMatrix: 'An error occurred trying to obtain image revisions.',
			mdRvEvalSelction: 'An error occurred processing selected files.',
			mdRevertImage: 'There was an error before or while posting the revert-request.',
			mdReverted: 'An error occurred after posting the revert-request.',
			mdExecuteReady: 'And error occurred after all scheduled tasks are done.'
		}
	},
	_msg: function ( /* params*/ ) {
		var args = Array.prototype.slice.call( arguments, 0 );
		args[ 0 ] = 'vfc-' + args[ 0 ];
		args[ args.length ] = 'VisualFileChange';
		args[ args.length + 1 ] = vfc.version;
		return mw.msg.apply( this, args );
	},
	_msg_parsed: function ( /* params*/ ) {
		var args = Array.prototype.slice.call( arguments, 0 );
		args[ 0 ] = 'vfc-' + args[ 0 ];
		args[ args.length ] = 'VisualFileChange';
		args[ args.length + 1 ] = vfc.version;
		return mw.message.apply( this, args ).parse();
	}
};

/**                                                     **
******************* PLUGINS / LOAD **********************
**                                                     **/
/**
* Create a progress-box object.
* @constructor
*
* @example
*   new ProgressBox( 150, this );
*
* @param width {Number} The initial width of the panel.
* @param o {Object} Parent object storing i18n-information in .i18n.task = {} and icon URIs like this.icons.current
*/
function ProgressBox( width, o ) {
/* jshint validthis:true*/
	this.w = ( width || 250 );
	this.t = {};
	this.ct = 0;
	this.usingObj = o;

	var _this = this;
	this.$cont = $( '<div>', {
		id: 'vfc-progressbox',
		style: 'width:' + this.w + 'px;'
	} ).dblclick( function () {
		_this.$cmd.focus();
	} );
	this.$cmd = $( '<input>', {
		id: 'mdCMD',
		type: 'text',
		maxlength: '2',
		style: 'position:absolute; top:-100px;'
	} ).keydown( function ( e ) {
		var tVal = ( $( this ).val() || '' );
		if ( e.which === 13 ) {
			switch ( tVal ) {
				case 'd':
					window.VisualFileChangeDebug = true;
					_this.mock();
					break;
				case 'e':
					window.VisualFileChangeDebug = false;
					_this.clearMock();
					break;
				default:
					_this.setError( 'Unknown command. d-Debug mode; e-Disable debug mode.' );
			}
			$( this ).val( '' );
		}
		if ( tVal.length > 1 )
			$( this ).val( $( tVal.substr( tVal.length - 1 ) ) );

	} );
	this.$x = $( '<a>', {
		href: '#',
		'class': 'ui-dialog-titlebar-close ui-corner-all',
		role: 'button',
		style: 'position:absolute;',
		title: 'close this panel'
	} ).append( $( '<span>', {
		'class': 'ui-icon ui-icon-closethick',
		text: 'close'
	} ) ).click( function () {
		_this.$cont.hide( 400, function () {
			if ( o.dlg ) {
				o.dlg.dialog( 'option', 'width', $win.width() );
				o.dlg.dialog( 'option', 'position', 'center' );
			}
		} );
		return false; // Prevent default and stop propagation
	} );
	this.$capt = $( '<div>', {
		style: 'font:small-caps 1.5em sans-serif;text-align:center;padding:10px;margin-top:10px;',
		text: 'VisualFileChange.js'
	} );
	this.$cfg = $( '<a>', {
		href: '#advanced_config',
		text: ' ' + vfc.i18n.cfg.startConfigManager,
		style: 'visibility:hidden;',
		'class': 'vFCConfigRequired'
	} )
		.prepend( $.createIcon( 'ui-icon-gear' ) );
	this.$profile = $( '<a>', {
		href: '#profiles',
		text: ' ' + vfc.i18n.cfg.startProfileManager,
		style: 'visibility:hidden;',
		'class': 'vFCConfigRequired ui-state-disabled'
	} )
		.prepend( $.createIcon( 'ui-icon-person' ) );
	this.$subheading = $( '<span>', {
		style: 'font:small-caps 0.8em sans-serif;',
		text: 'Batch Surgery Script v.' + o.scriptRevision
	} ).append( $( '<br>' ), 'Report bugs and ideas <a href="' + o.mdErrorsReportPath + '" target="_blank">here</a>.', $( '<br>' ), 'Edit responsibly', $( '<br>' ), $( '<br>' ), this.$cfg, $( '<br>' ), this.$profile );
	this.$tasklist = $( '<div>', {
		style: 'margin-top: 50px; padding: 10px;',
		text: o.i18n.tasks
	} );
	this.$progressWrap = $( '<div>', {
		css: {
			position: 'relative',
			padding: '10px',
			height: '25px',
			display: 'none'
		}
	} );
	this.$progressBar = $( '<div>', {
		css: {
			width: '100%',
			height: '100%'
		}
	} ).appendTo( this.$progressWrap );
	this.$progressText = $( '<div>', {
		css: {
			width: '100%',
			height: '100%',
			position: 'absolute',
			top: '10px',
			left: '0px',
			'text-align': 'center'
		}
	} ).appendTo( this.$progressWrap );
	this.$aHelpHead = $( '<div>' );
	this.$aHelpCont = $( '<div>', {
		style: ( 'font-size:0.8em; word-wrap:break-word; overflow:auto; max-height:' + Math.min( $win.height() / 3, 500 ) + 'px;' )
	} );
	this.$aHelpCont2 = $( '<div>', {
		style: 'font-weight:bold; word-wrap:break-word;'
	} );
	this.$aHelp = $( '<div>', {
		style: 'margin-top: 50px; padding: 10px;',
		text: 'Notes:'
	} ).append( this.$aHelpHead, this.$aHelpCont, this.$aHelpCont2 );
	this.$error = $( '<div>' );
	this.$errorCont = $( '<div>', {
		style: 'margin-top: 50px; padding: 10px; display:none',
		'class': 'error',
		text: 'Error:'
	} ).append( this.$error );
	this.$credits = $( '<div>', {
		id: 'mdCredits',
		style: 'position:absolute;bottom:0;font:small-caps 0.7em sans-serif;margin:4px;color:#BBB'
	} )
		.html( 'Icons by Everaldo Coelho -LGPL- and <br>the jQuery UI team -GPL-<br>' +
( o.i18n.mdTranslator ?
'Translation provided by ' + o.i18n.mdTranslator :
'Coded by Rillke and others. Thanks to all supporters, especially Saibo and LX for testing.' ) );

	this.$cont.append( this.$cmd, this.$x, this.$capt, this.$subheading, this.$tasklist, this.$progressWrap, this.$aHelp, this.$errorCont, this.$credits );
	$( 'body' ).append( this.$cont );
	mw.util.addCSS( '.md-doing {padding-left:16px;background:url(\'' + o.icons.current + '\') no-repeat left;font-weight:bold} ' +
'.md-done {padding-left:16px;background:url(\'' + o.icons.done + '\') no-repeat left} ' +
'.md-failed {padding-left:16px;background:url(\'' + o.icons.failed + '\') no-repeat left} ' +
'.md-attention {padding-left:16px;background:url(\'' + o.icons.attention + '\') no-repeat left}\n' );
}
ProgressBox.fn = ProgressBox.prototype = {
	constructor: ProgressBox,
	show: function () {
		this.$cont.show();
	},
	hide: function () {
		this.$cont.hide();
	},
	remove: function () {
		this.$cont.remove();
	},
	addTask: function ( task ) {
		var n = $( '<div>', {
			text: this.usingObj.i18n.task[ task ],
			'class': 'md-notdone'
		} );
		this.t[ task ] = n;
		this.$tasklist.append( n );
	},
	setCurrentTaskState: function ( state ) {
		if ( this.ct )
			this.ct.removeClass( 'md-notdone md-doing md-done md-attention' ).addClass( state );
	},
	setCurrentTaskDone: function () {
		if ( this.ct && this.ct.hasClass( 'md-doing' ) )
			this.ct.removeClass( 'md-doing' ).addClass( 'md-done' );
	},
	setTaskState: function ( taskname, state ) {
		this.t[ taskname ].removeClass( 'md-notdone md-doing md-done md-attention' ).addClass( state );
		this.ct = this.t[ taskname ];
	},
	setHelp: function ( help ) {
		this.$aHelpHead.text( help );
	},
	setHelp2: function ( help, text ) {
		if ( text )
			this.$aHelpCont.text( help );
		else
			this.$aHelpCont.html( help );

	},
	setHelp3: function ( help ) {
		this.$aHelpCont2.text( help );
	},
	setError: function ( err ) {
		this.$error.text( err );
		this.$errorCont.show();
	},
	setZIndex: function ( zIndex ) {
		this.$cont.css( 'z-index', zIndex );
	},
	isHidden: function () {
		return ( this.$cont.css( 'display' ) === 'none' );
	},
	showProgress: function ( total, done, type ) {
		var _this = this;
		if ( _this.progressTimeout )
			clearTimeout( _this.progressTimeout );
		_this.progressTimeout = setTimeout( function () {
			mw.loader.using( 'jquery.ui', function () {
				_this.$progressBar.progressbar( {
					value: ( done ) / ( total ) * 100
				} );
				_this.$progressText.text( 'remaining ' + ( total - done ) + ' ' + type );
				if ( total === done )
					_this.$progressWrap.stop().fadeOut();
				else
					_this.$progressWrap.stop().fadeTo( 0, 1 );

			} );
		}, 10 );
	},
	mock: function ( throwErr ) {
		var _this = this;
		_this.debugInfo( 'Waiting for mock' );
		mw.loader.using( 'jquery.mockjax', function () {
			_this.editMock = _this._mock( throwErr, 'edit' );
			_this.deleteMock = _this._mock( throwErr, 'delete' );
			_this.debugInfo( 'Mocking enabled. Open a real JavaScript console for retrieving results.' );
		} );
	},
	_mock: function ( throwErr, action ) {
		var _this = this;
		return $.mockjax( {
			url: mw.util.wikiScript( 'api' ),
			data: {
				action: action
			},
			dataType: 'json',
			contentType: 'text/json',
			response: function ( p ) {
				var query = p.data,
					response = {};

				_this.usingObj.log( action + '> ' + ( query.summary || query.reason ) );
				_this.usingObj.log( query );
				if ( query.requestid )
					response.requestid = query.requestid;

				if ( throwErr ) {
					response.error = {
						info: throwErr.info || 'Mockjax test error',
						code: 'testerr'
					};
				} else {
					response[ action ] = {
						result: 'Success',
						title: query.title
					};
				}
				this.responseText = response;
			}
		} );
	},
	clearMock: function () {
		$.mockjaxClear( this.editMock );
		$.mockjaxClear( this.deleteMock );
		this.debugInfo( 'Mock disabled. Requests are sent to the server.' );
	},
	debugInfo: function ( txt ) {
		this.setError( txt );
	}
};

// Translation II (more sophisticated stuff)
mw.messages.set( {
	'vfc-query-progress': 'Querying detailed information: $1 batch-{{PLURAL:$1|query|queries}} pending. Total {{PLURAL:$2|file|files}}: $2. Current: $3',
	'vfc-selected-count': '$1 {{PLURAL:$1|file|files}} selected to perform the action on.',
	'vfc-enter-reason': 'Please specify a reason with at least $1 {{PLURAL:$1|letter|letters}}.',
	'vfc-edit-count-one-time': 'Would you like to do edit number $1?',
	'vfc-anon-info': '$1 is a powerful tool. To use its full set of features, please create a user account and [[Special:UserLogin|sign-in]].',
	'vfc-anon-info-heading': 'Please sign-in for a full feature-set'
} );

mw.loader.using( [
	'jquery.ui', // deprecated
	'ext.gadget.tipsyDeprecated', // very deprecated
	'mediawiki.user',
	'mediawiki.util',
	'mediawiki.jqueryMsg',
	'ext.gadget.libCommons',
	'ext.gadget.libUtil',
	'ext.gadget.libAPI',
	'ext.gadget.libJQuery',
	'ext.gadget.jquery.in-view'
], function () {
	$doc.off( 'vFC.debuglistener' )
		.on( 'vFC.debuglistener', function ( e, p1 /* , p2, p3 */ ) {
		if ( window.VisualFileChangeDebug )
			vfc.log( 'VisualFileChange> ' + p1 );
	} );
	vfc.install();
} );

} );
}( jQuery, mediaWiki ) );
// </nowiki>