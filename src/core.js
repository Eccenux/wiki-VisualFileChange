// It helps performing mass-changes on the uploads of a paricular user.
// It was composed by [[User:Rillke]] in 2011; Thanks DieBuche for advice; some code stolen from commons:MediaWiki:AjaxQuickDelete.js
// <nowiki>
// TODO if version 1.18 ready, add possibility to revert all images
//   http://svn.wikimedia.org/viewvc/mediawiki/trunk/phase3/includes/api/ApiFileRevert.php?view=log
//   action=filerevert&filename=File:MassDeleteOTRS.png&comment=TestingBryanTongMinhRevert&archivename=20110429234711!Wiki.png&token=+\\
// TODO AJAX userlist-dropdown / verification
// Depends on MediaWiki:VisualFileChange.js/exec.js, /ui.js, /cfg.js
/***************************************************
	Event-System:
	Event: 'vFC' with parameters
		vFC = visualFileChange
	Parameter1: What?
	Parameter2: This object.
	Parameter3: optional, depends on context

	Example for listening to the events:
	$(document).bind('vFC', function(e, p1, p2, p3) {
		console.log('VisualFileChange> ' + p1);
	});
***************************************************/
/*global jQuery:false, mediaWiki:false, Geo:false */
/*jshint curly:false, forin:false, maxerr:200, laxbreak:true, laxcomma:true, bitwise:false, smarttabs:true */
(function ($, mw) {
'use strict';
if (window.VisualFileChange) return;

$(document).ready(function () {

window.VisualFileChange = 1;

/**
 * Create a progress-box object.
 * @constructor
 *
 * @example
 *      new ProgressBox( 150, this );
 *
 * @param width {Number} The initial width of the panal.
 * @param o {Object} Parent object storing i18n-information in .i18n.task = {} and icon URIs like .mdThisTaskIcon
 */
function ProgressBox(width, o) {
	/*jshint validthis:true*/
	this.w = (width || 250);
	this.t = {};
	this.ct = 0;
	this.usingObj = o;
	
	var _this = this;
	this.$cont = $('<div>', { 
		style: 'display:none; overflow:hidden; left:0px; width:' + this.w + 'px; height:100%; z-index: 1000; top:0pt; position:fixed; font:15px sans-serif; background-color: #cde; background-image: -moz-linear-gradient(top, #cde, #eee 100px, #eee); background-image: -ms-linear-gradient(top, #cde, #eee 100px, #eee); background-image: -o-linear-gradient(top, #cde, #eee 100px, #eee); background-image: -webkit-linear-gradient(top, #cde, #eee 100px, #eee); background-image: -webkit-gradient(linear, left top, left bottom, from(#cde), to(#eee), color-stop(100px, #eee));' 
	}).dblclick(function() { _this.$cmd.focus(); });
	this.$cmd = $('<input>', {
		'id': 'mdCMD',
		'type': 'text',
		'maxlength': '2',
		'style': 'position:absolute; top:-100px;'
	}).keydown(function(e) {
		var tVal = ($(this).val() || '');
		if (13 === (e.keyCode - 0)) {
			switch (tVal) {
				case 'd':
					window.VisualFileChangeDebug = true;
					_this.setError('Debug mode enabled.');
					break;
				case 'e':
					window.VisualFileChangeDebug = false;
					_this.setError('Debug mode disabled.');
					break;
				default:
					_this.setError('Unknown command. d-Debug mode; e-Disable debug mode.');
			}
			$(this).val('');
		}
		if (tVal.length > 1) { 
			$(this).val($(tVal.substr(tVal.length - 1)));
		}
	});
	this.$x = $('<a>', {
		'href': '#',
		'class': 'ui-dialog-titlebar-close ui-corner-all',
		'role': 'button',
		'style': 'position:absolute;',
		'title': 'close this panel'
	}).append($('<span>', { 
		'class': 'ui-icon ui-icon-closethick', 
		'text': 'close' 
	})).click( function() {
		_this.$cont.hide(400, function() {
			if (o.dlg) {
				o.dlg.dialog( 'option', 'width', $(window).width() );
				o.dlg.dialog( 'option', 'position', 'center' );
			}
		});
		return false; // Prevent default and stop propagation
	});
	this.$capt = $('<div>', {
		style: 'font:small-caps 1.5em sans-serif; text-align:center; padding:10px; margin-top:10px;',
		text: 'VisualFileChange.js'
	});
	this.$cfg = $('<a>', { href: '#', text: ' advanced configuration', style: 'visibility:hidden;', 'class': 'vFCConfigRequired' })
		.prepend(o.mdCreatejIcon('ui-icon-gear'));
	this.$profile = $('<a>', { href: '#', text: ' profiles', style: 'visibility:hidden;', 'class': 'vFCConfigRequired ui-state-disabled' })
		.prepend(o.mdCreatejIcon('ui-icon-person'));
	this.$subheading = $('<span>', {
		style: 'font:small-caps 0.8em sans-serif;',
		text: 'Batch Surgery Script v.' + o.mdScriptRevision
	}).append($('<br>'), 'Report bugs and ideas to <a href="' + o.mdErrorsReportPath + '" target="_blank">Rillke</a>.', $('<br>'), $('<br>'), this.$cfg, $('<br>'), this.$profile);
	this.$tasklist = $('<div>', {
		style: 'margin-top: 50px; padding: 10px;',
		text: 'Tasks:'
	});
	this.$aHelpHead = $('<div>');
	this.$aHelpCont = $('<div>', { style: ('font-size:0.8em; word-wrap:break-word; overflow:auto; max-height:' + Math.min($(window).height() / 3, 500) + 'px;') });
	this.$aHelpCont2 = $('<div>', { style: 'font-weight:bold; word-wrap:break-word;' });
	this.$aHelp = $('<div>', {
		style: 'margin-top: 50px; padding: 10px;',
		text: 'Notes:'
	}).append(this.$aHelpHead, this.$aHelpCont, this.$aHelpCont2);
	this.$error = $('<div>');
	this.$errorCont = $('<div>', {
		style: 'margin-top: 50px; padding: 10px; display:none',
		'class': 'error',
		text: 'Error:'
	}).append(this.$error);
	this.$credits = $('<div>', { id: 'mdCredits', style: 'position: absolute; bottom: 0px; font: small-caps 0.7em sans-serif; margin: 4px; color: #BBB;' })
		.html('Icons by Everaldo Coelho -LGPL- and <br/>the jQuery UI team -GPL-<br/>Thanks to all supporters, especially Saibo and LX for testing.');
		
	this.$cont.append(this.$cmd, this.$x, this.$capt, this.$subheading, this.$tasklist, this.$aHelp, this.$errorCont, this.$credits);
	$('body').append(this.$cont);
	mw.util.addCSS('.md-doing { padding-left:16px; background:url(\'' + o.mdThisTaskIcon + '\') no-repeat left; font-weight:bold; } '
		+ '.md-done { padding-left:16px; background:url(\'' + o.mdDoneTaskIcon + '\') no-repeat left; } '
		+ '.md-failed { padding-left:16px; background:url(\'' + o.mdFailedTaskIcon + '\') no-repeat left; } '
		+ '.md-attention { padding-left:16px; background:url(\'' + o.mdAttentionTaskIcon + '\') no-repeat left; } '
	);
}
ProgressBox.prototype.show = function () {
	this.$cont.show();
};
ProgressBox.prototype.hide = function () {
	this.$cont.hide();
};
ProgressBox.prototype.remove = function () {
	this.$cont.remove();
};
ProgressBox.prototype.addTask = function (task) {
	var n = $('<div>', { text: this.usingObj.i18n.task[task], 'class': 'md-notdone' });
	this.t[task] = n;
	this.$tasklist.append( n );
};
ProgressBox.prototype.setCurrentTaskState = function (state) {
	if (this.ct) this.ct.removeClass('md-notdone md-doing md-done md-attention').addClass(state);
};
ProgressBox.prototype.setCurrentTaskDone = function () {
	if (this.ct && this.ct.hasClass('md-doing')) this.ct.removeClass('md-doing').addClass('md-done');
};
ProgressBox.prototype.setTaskState = function (taskname, state) {
	this.t[taskname].removeClass('md-notdone md-doing md-done md-attention').addClass(state);
	this.ct = this.t[taskname];
};
ProgressBox.prototype.setHelp = function (help) {
	this.$aHelpHead.text(help);
};
ProgressBox.prototype.setHelp2 = function (help, html) {
	if (html) {
		this.$aHelpCont.html(help);
	} else {
		this.$aHelpCont.text(help);
	}
};
ProgressBox.prototype.setHelp3 = function (help) {
	this.$aHelpCont2.text(help);
};
ProgressBox.prototype.setError = function (err) {
	this.$error.text(err);
	this.$errorCont.show();
};
ProgressBox.prototype.setZIndex = function (zIndex) {
	this.$cont.css('z-index', zIndex);
};
ProgressBox.prototype.isHidden = function () {
	return ('none' === this.$cont.css('display'));
};

var isSysop = ($.inArray('sysop', mw.config.get('wgUserGroups')) !== -1);

// Adding Style-definitions
mw.util.addCSS(' .md-inline-icon { display:inline-block; position:relative; top:2px; }\n'
	+ ' .md-collapsible { padding:3px; padding-top:0px; padding-left:0px; margin-top:2px; display:inline-block; }\n'
);

/**
 * Create a new VisualFileChange-Object-literal.
 *
 * @context {window}
 */
var VisualFileChange = window.VisualFileChange = {


	/** REVISION CONTROL **/ //(x.major.minor.bug)
	mdScriptRevision: '0.9.3.0',
	

	/**
	** Set up the VisualFileChange object and add the toolbox link.  Called via $(document).ready() during page loading.
	**/
	mdInstall: function () {
		var o = this;


		// Initialize the settings
		if (!window.vFCSettings) window.vFCSettings = {};
		
		$.each(this.mdDefaults, function(i, el) {
			o.mdSettings[el.v] = (el.old ? window[el.old] : '') || el['default'];
		});
		// Merge the user's settings
		$.extend(this.mdSettings, window.vFCSettings);


		var $tAjaxQuickDeleteOnDemand = $("#t-AjaxQuickDeleteOnDemand");
		if ( 1 === $tAjaxQuickDeleteOnDemand.length ) {
			// User is using the load on demand feature. 
			// Replace the link
			$tAjaxQuickDeleteOnDemand.remove();
			mw.util.addPortletLink('p-tb', 'javascript:VisualFileChange.mdStartMd();', this.i18n.mdButtonLabel, 't-AjaxQuickDeletx2');
			
			// Immedately start Md
			this.mdStartMd();
		} else {
			if ( "MediaWiki:VisualFileChange.js" === mw.util.getParamValue('withJS') ) {
				// Load immediately and add no link
				this.mdStartMd();
 
			} else if (mw.config.get('wgNamespaceNumber') !== 14) {
				// Set up toolbox link
				mw.util.addPortletLink('p-tb', 'javascript:VisualFileChange.mdStartMd();', this.i18n.mdButtonLabel, 't-AjaxQuickDeletx2');
			}
		}
		$(document).triggerHandler('vFC', ['installed', this]);
		
		// Load the UI components
		this.loadModule('ui.js');
	},
	
	/**
	*    @description 
	*        A little ResourceLoader :-)
	*
	*    @param m {String} Module to be loaded
	*    @param cb {Function} Function to be executed when loaded
	**/
	loadModule: function(m, cb) {
		var alias = '', o = this;
		var executeCB = function () {
			if ('function' === typeof cb) cb.apply(o, []);
			if ('string' === typeof cb) o[cb].apply(o, []);
		};
		switch (m) {
			case 'exec.js': 
				alias = 'editComponents';
				break;
			case 'ui.js': 
				alias = 'displayComponents';
				break;
			case 'cfg.js':
				alias = 'configManager';
				break;
			case 'diff':
				if (!mw.libs.schnark_diff) {
					mw.loader.load('//de.wikipedia.org/w/index.php?title=Benutzer:Schnark/js/diff.js/core.js&action=raw&ctype=text/javascript');
					if (cb) $(document).bind('loadWikiScript.vFCListener', function(e, what) {
						if ('Benutzer:Schnark/js/diff.js/core.js' === what) {
							$(document).unbind('loadWikiScript.vFCListener');
							mw.libs.schnark_diff.css.ins = 'text-decoration: none; font-weight: bold; font-size:1.2em; color: #050; background-color: #B0C0F0;';
							mw.libs.schnark_diff.css.del = 'text-decoration: none; font-weight: bold; font-size:1.2em; color: #500; background-color: #FFD89D; outline:1px dotted gray;';
							mw.util.addCSS( mw.libs.schnark_diff.getCSS() );
							executeCB();
						}
					});
				} else {
					executeCB();
				}
				return;
		}
		if (this[alias]) {
			executeCB();
			return;
		} else {
			if (cb) $(document).bind('scriptLoaded.vFCListener' + alias, function(evt, script, add) {
				if (script) { if ('VisualFileChange' === script && add) {
					if (alias === add) {
						$(document).unbind('scriptLoaded.vFCListener' + alias);
						executeCB();
					}
				}}
			});
			mw.loader.load(mw.config.get( 'wgServer' ) + mw.config.get( 'wgScript' ) + '?title=' + mw.util.wikiUrlencode('MediaWiki:VisualFileChange.js/' + m) + '&action=raw&ctype=text/javascript&dummy=' + this.mdScriptRevision);
		}
	},
	
	mdCancel: function () {
		var _this = VisualFileChange;
		_this.pb.remove();
		_this.mdDlgThumbDlgClose();
	},
	
	mdCreatejIcon: function (iconClass) {
		return $('<span>', { 'class': 'ui-icon ' + iconClass + ' md-inline-icon', text: ' ' });
	},
 
	mdStartMd: function () {
		var wgPageName = mw.config.get('wgPageName'),
			pb;
		
		$(document).triggerHandler('vFC', ['starting procedure', this]);

		pb = this.pb = new ProgressBox(undefined, this);
		pb.addTask('start');
		pb.addTask('target');
		pb.addTask('list');
		pb.addTask('datails');
		pb.setTaskState( 'start', 'md-doing' );
		pb.show();
		
		this.oldDocTitle = document.title;
		this.apiEditFirstTestCountDown = this.mdSettings.firstTest-1;
		this.context = "MD"; // The error handler should know what we are performing
		this.mdBusy = false; // indicate that any dialog can be closed
		this.tasks = []; // reset task list in case an earlier error left it non-empty
		this.pageName = wgPageName;
		this.mdTarget = '';
		this.mdListUploadsPending = 0;
 
		switch (mw.config.get('wgNamespaceNumber')) {
			case 6: // File
				this.addTask('findOriginalUploader');
				break;
			case 3: // User_talk
			case 2: // User
				this.mdTarget = mw.config.get('wgPageName').match(/.*?\:(.*?)(\/.*)*$/)[1];
				break;
			case -1: // Special pages
				try {
					switch (mw.config.get('wgCanonicalSpecialPageName')) {
						case 'Contributions':
						case 'DeletedContributions':
						case 'Block':
						case 'CentralAuth':
							// Extract target from addressline
							if ( /Special\:(?:DeletedContributions|Contributions|Block|CentralAuth)\//.test(location.href) ) {
								this.mdTarget = decodeURI(location.href.match(/Special\:(?:DeletedContributions|Contributions|Block|CentralAuth)\/(.*?)$/)[1]);
							} else if ( -1 !== location.href.indexOf(mw.config.get('wgScript')) ) {
								this.mdTarget = mw.util.getParamValue('target');
							}
							break;
						case 'Userrights':
						case 'Listfiles':
						case 'Log':
							// Extract target from addressline
							if (mw.util.getParamValue('user')) {
								this.mdTarget = mw.util.getParamValue('user');
							}
							if (mw.util.getParamValue('page')) { 
								if (/User:+./.test(mw.util.getParamValue('page'))) {
									this.mdTarget = mw.util.getParamValue('page').replace("User:", "");
								}
							}
							if ( /Special\:(?:Log|ListFiles|UserRights)\//.test( location.href )) {
								this.mdTarget = decodeURI(location.href.match(/Special\:(?:Log|ListFiles|UserRights)\/(.*?)$/)[1]);
							}
							break;
					}
				} catch (ex) { }
				break;
			case 14: // categories
				this.mdTarget = mw.config.get('wgPageName');
				break;
		}
		// Prettify the title (nomalizing)
		this.mdTarget = this.mdTarget.replace(/_/g, ' ');
		
		$(document).triggerHandler('vFC', ['prepared', this]);
		
		// Load the Execute/ Edit components
		this.loadModule('exec.js');
		
		if (mw.user && mw.user.tokens && mw.user.tokens.get) this.edittoken = mw.user.tokens.get('editToken');
		this.edittoken = (this.edittoken || window['wikilove-edittoken']);
		
		this.addTask('mdContinue');
		this.nextTask();
	},
 
	findOriginalUploader: function () {
		var query = {
			action: 'query',
			prop: 'imageinfo|revisions|info',
			rvprop: 'content',
			intoken: 'edit',
			iiprop: 'user|comment',
			iilimit: 50,
			titles: this.pageName
		};
		
		$(document).triggerHandler('vFC', ['seeking uploader', this]);
		
		this.doAPICall(query, 'findOriginalUploaderCB');
	},
 
	findOriginalUploaderCB: function (result) {
		var pages = result.query.pages,
			info, content, i;
		for (var id in pages) { // there should be only one, but we don't know its ID
			if (pages.hasOwnProperty(id)) {
				this.edittoken = pages[id].edittoken; // The edittoken only changes on session loss
				info = pages[id].imageinfo;
				content = pages[id].revisions[0]['*'];
				i =info.length - 1;
				// Now exclude bots which only reupload a new version:
				if (-1 === this.excludedBots.indexOf(info[i].user)) {
					this.mdTarget = info[i].user;
				}
			}
		}
		this.nextTask();
	},
 
	mdContinue: function () {
		$(document).triggerHandler('vFC', ['peparing to ask for target', this]);
		this.pb.setCurrentTaskDone();
		this.pb.setTaskState( 'target', 'md-doing' );
		this.pb.setHelp(this.i18n.mdPerformOnWhichTarget);
		
		/*  Shedule next tasks  */
		this.addTask('mdCreateList');
		this.addTask('mdGenIGallery');
		this.addTask('mdQueryFileDone');
 
		/*  Setting up variables needed later  */
		var pefilledUser = '';
		this.iUploads = {};   // i-initial file list
		this.iiUploads = 0;   // Number of initially uploaded files in the list
		this.oUploads = {};   // o-overwrite file list
		this.ioUploads = 0;   // Number of overwriten files in the list
		this.metaKeys = [];   // Contains all keys(names) of metadata available; building while processing quried files
		this.gbs = {};        // File --> Gallery Box
		this.mdLestart = '';  // important for continuing the query
		this.mdLedir = 'older';      // in which direction to enumerate logevents: older/newer
		this.mdCmdir = 'asc';        // in which direction to sort: asc/desc
		this.mdCmsort = 'sortkey';   // property to sort by: sortkey/timestamp
		this.mdCmstart = 0;          // extrawurst für catmembers by date - sorting
		this.mdNoMoreFiles = false;  // set to true, when API response did not contain a new Lestart
		this.mdFirstRun = true;      // determining whether it is the first query-cycle
		this.mdNumberOfExecs = 0;    // Is Execute called already?
		this.apiRequestQueue = [];   // Reset. In case of restart it would contain non-executed requests otherwise
		this.lastContinues = { vals: [], setVals: '' };     // contains the last 2 continue-keys
 
		if (this.mdTarget) {
			pefilledUser = this.mdTarget;
		}
		if ( !pefilledUser ) { 
			pefilledUser = mw.user.name(); 
		}
		$(document).triggerHandler('vFC', ['asking for target', this]);
		this.promptForTarget(pefilledUser, 1, this);
	},
	
	createToggler: function (text, $content) {
		return $('<div>').append(
			$('<a>', { text: text, href: '#', 'class':'md-collapsible ui-state-default' }).prepend(
				this.mdCreatejIcon('ui-icon-carat-1-e')
			).toggle(
			function(e){
				//e.preventDefault();
				var $el = $(this);
				$el.next().slideToggle('fast');
				$el.find('span.ui-icon').removeClass('ui-icon-carat-1-e').addClass('ui-icon-carat-1-s');
			}, 
			function(e) {
				var $el = $(this);
				$el.next().slideToggle('fast');
				$el.find('span.ui-icon').removeClass('ui-icon-carat-1-s').addClass('ui-icon-carat-1-e');
			}).hover(
			function() {
				$(this).addClass('ui-state-hover');
			},
			function() {
				$(this).removeClass('ui-state-hover');
			}),
			$content.addClass('ui-widget-content').hide()
		);
	},
	
	createNotifyArea: function(textNode, icon, state) {
		return $('<div>', { 'class': 'ui-widget' }).append(
			$('<div>', { 'class': state + ' ui-corner-all', style: 'margin-top:20px; padding:0.7em;' }).append($('<p>').append(
				this.mdCreatejIcon(icon).css('margin-right', '.3em'), textNode
			))
		);
	},

	/**
	** Pseudo-Modal JS windows.
	** Needs to be converted into a class
	**/
	promptForTarget: function (prefill, minlen, o) {
		var dlgButtons = {},
			confirmed = false,
			dlgWidth = 0,
			$submitButton, $cancelButton, $targetInput, $targetSelect, $gMoreOptionsToggler, $gMoreOptions, $gStartAt, $gStartAtL, $gSortBy, $gSortByL, $gNotifyText, $gNotifyArea,
			mwDateRx = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/;
			
		var getMwDate = function(dateX) {
			if ('string' !== typeof dateX) return dateX;
			if ('' === dateX) return '';
			if (mwDateRx.test(dateX)) return dateX;
			var m1 = dateX.match(/(\d{4}).(\d{2}).(\d{2})\D*(\d{2}:\d{2}:\d{2})?/);
			if (m1) return (m1[1] + '-' + m1[2] + '-' + m1[3] + 'T' + (m1[4] ? m1[4] : '12:00:00') + 'Z');
			m1 = dateX.match(/(\d{2}).(\d{2}).(\d{4})\D*(\d{2}:\d{2}:\d{2})?/);
			if (m1) return (m1[3] + '-' + m1[2] + '-' + m1[1] + 'T' + (m1[4] ? m1[4] : '12:00:00') + 'Z');
			else return '';
		};
		
		dlgButtons[o.i18n.proceedButtonLabel] = function () {
			if (confirmed) return;
			confirmed = true;
			// Reading input
			o.mdTarget = o.cleanReason($targetSelect.val() + ':' + $targetInput.val());
			o.lastContinues.setVals = ['mdLestart'];
			o.$AjaxMdContainer.text(o.i18n.mdPleaseWait);
			if (mwDateRx.test($gStartAt.val())) o.mdLestart = $gStartAt.val();
			switch ($gSortBy.val()) {
				case 'of': // oldest first
					o.mdLedir = 'newer';
					o.mdCmdir = 'asc';
					o.mdCmsort = 'timestamp';
					o.mdCmstart = o.mdLestart;
					o.lastContinues.setVals.push('mdCmstart');
					break;
				case 'nf': // newest first
					o.mdLedir = 'older';
					o.mdCmdir = 'desc';
					o.mdCmsort = 'timestamp';
					o.mdCmstart = o.mdLestart;
					o.lastContinues.setVals.push('mdCmstart');
					break;
				case 'ca': // cat asc
					o.mdCmdir = 'asc';
					o.mdCmsort = 'sortkey';
					break;
				case 'cd': // cat desc
					o.mdCmdir = 'desc';
					o.mdCmsort = 'sortkey';
					break;
				case 'default':
					o.mdLedir = 'older';
					o.mdCmdir = 'asc';
					o.mdCmsort = 'sortkey';
					break;
			}
			o.loadModule('ui.js', 'nextTask');
		};
		dlgButtons[o.i18n.cancelButtonLabel] = function () {
			$(this).dialog('close');
		};

		// Are there Contaminated Sites? Remove them now.
		o.mdDlgThumbDlgClose();
		
		// Change the title of the browser tab/window
		document.title = "VisualFileChange: Welcome, " + (mw.user.name() || Geo.IP || "anonymous") + "!";

		// Hide overlapping page (avoids scrolling)
		$('body').css('overflow', 'hidden');

		dlgWidth = Math.min(600, $(window).width() - 250);
		
		o.$AjaxMdContainer = $('<div>', { id: 'AjaxMdContainer', style: 'min-height:80px;' });

		o.dlg = $('<div>').append(o.$AjaxMdContainer).dialog({
			modal: true,
			closeOnEscape: true,
			position: [($(window).width() - dlgWidth - 250) / 2 + 250, ($(window).height() - 200) / 2 ],
			title: o.i18n.mdPerformOnWhichTarget,
			height: 'auto',
			width: dlgWidth,
			buttons: dlgButtons,
			close: o.mdCancel,
			open: function() {
				var $buttons = $(this).parent().find('.ui-dialog-buttonpane button');
				$submitButton = $buttons.eq(0).button({ icons: { primary: 'ui-icon-check' } });
				$cancelButton = $buttons.eq(1).button({ icons: { primary: 'ui-icon-close' } });
			}
		});
		o.pb.setZIndex($('.ui-widget-overlay').css('z-index')-0+1);
		
		var nsCat = mw.config.get('wgFormattedNamespaces')[14],
			nsUser = mw.config.get('wgFormattedNamespaces')[2],
			rxCat = new RegExp('^' + nsCat + ':', 'i'),
			rxUser = new RegExp('^' + nsUser + ':', 'i'),
			lastXHR = 0,
			pLastCB = 0,
			delayXHR = 500;
		
		$targetSelect = $('<select>', { size: 1, id: 'mdTargetSelect' }).append(
			$('<option>', { text: nsCat }),
			$('<option>', { text: nsUser, selected: 'selected' })
		).change(function() {
			var $catSpecifics = $gSortBy.find('option[value^="c"]');
			if ($(this).val() === nsCat) {
				$catSpecifics.removeAttr('disabled');
			} else {
				$catSpecifics.attr('disabled', 'disabled');
			}
			$(document).triggerHandler('vFC_Startup_target', [ $targetSelect.val() + ':' + $targetInput.val() ]);
		});
		var didXHR = function(result, pCallback) {
			var searchTerms = [];
			if (!result) {
				if ('function' === typeof pCallback) pCallback(searchTerms);
				return;
			}
			result = result.query.allusers || result.query.allcategories;
			$.each(result, function(id, it) {
				searchTerms.push( { 'value': (it.name || it['*']) } );
			});
			if ('function' === typeof pCallback) pCallback(searchTerms);
			pLastCB = 0;
		};
		var doXHR = function(request, pCallback) {
			var query = {
				action: 'query'
				,format: 'json'
			};
			var queryU = {
				list: 'allusers'
				,auprefix: request.term.replace(rxUser, '')
			};
			var queryC = {
				list: 'allcategories'
				,acprefix: request.term.replace(rxCat, '')
			};
			$.extend( query, (nsUser === $targetSelect.val()) ? queryU : queryC );
			lastXHR = $.getJSON( mw.util.wikiScript('api'), query, function(r) { didXHR(r, pCallback); });
		};
		
		o.$targetInput = $targetInput = $('<input>', { type: 'text', id: 'mdTargetInput', style: 'width: 80%;', 'value': prefill }).autocomplete({
			minLength: 1,
			delay: delayXHR,
			source: function ( request, callback ) { 
				if (pLastCB) pLastCB([]);
				pLastCB = callback;
				if (lastXHR) lastXHR.abort();
				delayXHR += 100;
				doXHR(request, callback);
			}
		});
		
		// Start date
		$.datepicker.setDefaults( $.datepicker.regional[ mw.config.get('wgUserLanguage') ] );
		$gStartAt = o.$gStartAt = $('<input>', {
				id: 'gStartAt'
				,type: 'text'
				,title: o.i18n.optStartAt
				,value: o.mdLestart
				,placeholder: 'YYYY-MM-DD'
			} )
			.datepicker( {
				changeYear: true
				,'dateFormat': 'yy-mm-ddT12:00:00Z'
				,showWeek: true
				,firstDay: 1
			} )
			.blur( function( e ) {
				$(this).val( getMwDate($(this).val()) );
			} )
			.keyup( function( e ) {
				if ( e.keyCode === 13 ) {
					$(this).val( getMwDate($(this).val()) );
					$submitButton.click();
				}
			} )
			.tipsy({
				trigger: 'focus'
				,gravity: 's'
				,html: true
				,title: function() {
					return o.i18n.optStartAtHowTo;
				} })
			.placeholder();
		$gStartAtL = $('<label>', {
				'for': 'gStartAt'
				,title: o.i18n.optStartAt
				,html: " &nbsp;Start&nbsp;at&nbsp;"
			} );
			
		$gSortBy = $('<select>', {
				id: 'gSortBy'
			} )
			.append( $('<option>', { 'value': 'default' }).text('default')
				,$('<option>', { 'value': 'of' }).text('from old to new (category: added-date)')
				,$('<option>', { 'value': 'nf' }).text('from new to old (category: added-date)')
				,$('<option>', { 'value': 'ca' }).text('asc, alphabetical')
				,$('<option>', { 'value': 'cd' }).text('desc, alphabetical')
			);
		$gSortByL = $('<label>', {
				'for': 'gSortBy'
				,title: 'Sorting'
				,text: 'Sorting'
			} );

		$gMoreOptions = $('<div>').append(
			$gStartAtL
			,$gStartAt
			,' '
			,$gSortByL
			,$gSortBy
		).hide();
		$gMoreOptionsToggler = o.createToggler(o.i18n.optMore, $gMoreOptions);
		$gNotifyText = o.$gNotifyText = $('<span>', { id: 'gNotifyText' });
		$gNotifyArea = o.$gNotifyArea = o.createNotifyArea($gNotifyText, 'ui-icon-info', 'ui-state-highlight');
		
		o.$AjaxMdContainer.append(
			$('<label>', { 'for': 'mdTargetInput', text: o.i18n.mdTargetInput })
			,$('<br>')
			,$targetSelect
			,' '
			,$targetInput
			,$('<br>')
			,$gMoreOptionsToggler
			,$gNotifyArea.hide()
		);
		$targetSelect.change();
		$targetInput.bind('input keyup change', function(e) {
			var thisVal = $(this).val();
			if (rxCat.test(thisVal)) {
				$(this).val(thisVal = thisVal.replace(rxCat, ''));
				$targetSelect.val(nsCat);
				$targetSelect.change();
			} else if (rxUser.test(thisVal)) {
				$(this).val(thisVal = thisVal.replace(rxUser, ''));
				$targetSelect.val(nsUser);
				$targetSelect.change();
			}
			if (thisVal.length < minlen) {
				$submitButton.button('option', 'disabled', true);
			} else {
				$submitButton.button('option', 'disabled', false);
			}
			$(document).triggerHandler('vFC_Startup_target', [ $targetSelect.val() + ':' + thisVal ]);
			if (e && e.keyCode && 13 === (e.keyCode - 0)) $submitButton.click();
		}).keyup().focus();
		
		// Load the configuration module
		this.loadModule('cfg.js', 'mdConfigInstall');
		// The following modules are not crucial for execution because there are fallbacks
		if (!$.fx.off) mw.loader.load(['jquery.effects.highlight']);
	},

	cleanReason: function (uncleanReason) {
		// trim whitespace
		uncleanReason = uncleanReason.replace(/^\s*(.+)\s*$/, '$1');
		// remove signature
		uncleanReason = uncleanReason.replace(/(.+)(--)?~{3,5}$/, '$1');
		return uncleanReason;
	},
	
	/**  
	**  Method to securely close (you may call it "nuke") the dialog, even if there were errors; called on button cancel and by several methods
	**/
	mdDlgThumbDlgClose: function () {
		var o = VisualFileChange;
		$(document).triggerHandler('vFC', ['closing dialog', o, o.dlg]);
		
		if ( o.mdBusy ) {     // Call myself later if script is busy
			setTimeout(o.mdDlgThumbDlgClose(), 10);
			return true;
		}
		
		// Re-desplay the page's content
		$('body').css('overflow', 'visible');
		// and restore title
		document.title = this.oldDocTitle;
		
		if ('object' === typeof(o.dlg)) {
			o.dlg.dialog("destroy");
			o.dlg.remove();
			document.body.style.cursor = 'auto';
			o.context = 'MD-postDlg';
			try {
				delete o.dlg;
			}
			catch (ex) {
				o.dlg = 0;
			}
			try {
				o.mdCuteSelectDlg.dialog("destroy");
				o.mdCuteSelectDlg.remove();
			} catch (ex) {}
		} else if ( 'AjaxMdContainer' === $(this).children('div').eq(0).attr('id') ) {
			this.dialog("destroy");
			this.parent.remove();
			document.body.style.cursor = 'auto';
			o.context = 'MD-postDlg';
		}
	},
	
	mdCloseAndContinue: function() {
		this.mdDlgThumbDlgClose();
		this.nextTask();
	},
	
	mdEditCountDialog: function(reason) {
		var o = this;
		var dlgButtons = {};
		
		dlgButtons[o.i18n.proceedButtonLabel] = function() {
			o.$apiEditCountDlg.dialog('close');
			o.apiEditCount = 0;
			o.apiEditFirstTestCountDown--;
			var i = Math.min(o.mdSettings.maxSimultaneousReq - o.apiRunningRequests, o.apiRequestQueue.length);
			for (;i>0;i--) {
				o.doAPICall.apply(o, o.apiRequestQueue.shift());
			}
		};
		dlgButtons[o.i18n.abortButtonLabel] = function() {
			o.$apiEditCountDlg.dialog('close');
		};
		
		o.$apiEditCountDlg = $('<div>', { text: reason }).append($('<br>'), $('<a>', { 
			style: 'height:5em; font-size:2em; line-height:1.8em', 
			href: mw.util.wikiGetlink('Special:MyContributions'),
			target: 'contribswindow',
			text: 'My Contributions'
		}).click(function(e) {
			e.preventDefault();
			window.open($(this).attr('href'), 'contribswindow', 'resizable=yes,scrollbars=yes');
		}));
		o.$apiEditCountDlg.dialog({
			title: 'Would you like to proceed?',
			buttons: dlgButtons,
			show: { effect: 'highlight', duration: 1800 },
			close: function() {
				o.$apiEditCountDlg.remove();
				o.$apiEditCountDlg = 0;
			},
			open: function() {
				var $dlg = $(this).parent();
				var $buttons = $dlg.find('.ui-dialog-buttonpane button');
				$buttons.eq(0).button({ icons: { primary: 'ui-icon-circle-check' } }).focus();
				$buttons.eq(1).button({ icons: { primary: 'ui-icon-circle-close' } });
				$('.ui-dialog-titlebar-close', $dlg).hide();
			}
		});
	},
	
	/**
	 ** Called when "invalid token" errors occur
	 ** Don't use the monster below to avoid confusion
	 **/
	refreshEditToken: function(callback) {
		var o = this;
		var gotResult = function(result) {
			if (!result || !result.query) {
				callback(false);
				return;
			}
			var token;
			$.each( result.query.pages, function( i, page ) {
				if ( page.edittoken ) {
					token = page.edittoken;
					return false;
				}
			} );
			if (token) {
				o.edittoken = token;
				callback(true);
			} else {
				callback(false);
			}
		};
		var xhr = $.getJSON(mw.util.wikiScript('api'), {
			format: 'json',
			action: 'query',
			prop: 'info',
			intoken: 'edit',
			titles: 'DummyPageForEditToken'
		}, gotResult);
		xhr.fail(function() {
			callback(false);
		});
	},
	
	/**
	 ** Find out whether a page was edited within the last 10 contibs
	 ** Don't use the monster below to avoid confusion
	 **/
	editedPageLast: function(title, comment, callback) {
		var foundIt = false;
		var o = this;
		var gotResult = function(result) {
			if (!result || !result.query) {
				callback(-1, title);
				return;
			}
			$.each(result.query.usercontribs, function(i, contrib) {
				if (contrib.comment === comment && contrib.title === title) {
					callback(1, title);
					foundIt = true;
					return false;
				}
			});
			if (!foundIt) callback(0, title);
		};
		var xhr = $.getJSON(mw.util.wikiScript('api'), {
			format: 'json',
			action: 'query',
			list: 'usercontribs',
			ucuser: mw.user.name() || Geo.IP,
			ucprop: 'title|comment',
			uclimit: parseInt(o.mdSettings.maxSimultaneousReq)+10
		}, gotResult);
		xhr.fail(function() {
			callback(-1, title);
		});
	},

	/**
	 ** Does a MediaWiki API request and passes the result to the supplied callback (method name).
	 ** Uses POST requests for everything for simplicity.
	 **/
	apiRequestQueue: [],
	apiRunningRequests: 0,
	apiEditCount: 0,
	apiEditFirstTestCountDown: 0,
	$apiEditCountDlg: 0,
	doAPICall: function (params, callback, errCallBack, isRetry) {
		var o = this;
		if (!isRetry) isRetry = 0;
		
		if (o.mdSettings.maxSimultaneousReq > 0 && (o.apiRunningRequests >= o.mdSettings.maxSimultaneousReq)) {
			o.apiRequestQueue.push([ params, callback, errCallBack, isRetry ]);
			return;
		}

		if (params.action && 'edit' === params.action) {
			if (o.mdSettings.testEdits > 0 && o.apiEditCount >= o.mdSettings.testEdits) {
				o.apiRequestQueue.push([ params, callback, errCallBack, isRetry ]);
				if (!o.$apiEditCountDlg) o.mdEditCountDialog('One batch of edits is done as specified in the advanced settings. Would you like to proceed?');
				return;
			}
			if (0 === o.apiEditFirstTestCountDown) {
				o.apiRequestQueue.push([ params, callback, errCallBack, isRetry ]);
				if (!o.$apiEditCountDlg) o.mdEditCountDialog('Would you like to do edit number ' + o.mdSettings.firstTest + '?');
				return;
			}
			o.apiEditFirstTestCountDown--;
			o.apiEditCount++;
			params.token = o.edittoken;
		}
		
		o.apiRunningRequests++;
		isRetry++;
		
		var always = function() {
			o.apiRunningRequests--;
			var i = Math.min(o.mdSettings.maxSimultaneousReq - o.apiRunningRequests, o.apiRequestQueue.length);
			for (;i>0;i--) {
				o.doAPICall.apply(o, o.apiRequestQueue.shift());
			}
		};

		params.format = 'json';
		$.ajax({
			url: mw.util.wikiScript('api'),
			cache: false,
			dataType: 'json',
			data: params,
			type: 'POST',
			success: function (result, status, x) {
				// Call always first; jQuery complete-evt is called after that
				always();

				var doErrCB = function(text) {
					if ($.isFunction(o[errCallBack])) {
						o.mdWasAPIError = true;
						return o[errCallBack](result, params, result.error ? (result.error.code + ': ' + result.error.info) : ("Spamblacklist: " + result.edit.spamblacklist));
					} else {
						return o.fail(text);
					}
				};
				
				if (!result) return o.fail("Receive empty API response:\n" + x.responseText);

				// In case we get the mysterious 231 unknown error, just try again
				if (result.error && result.error.info.indexOf('231') !== -1 && isRetry < 20) return setTimeout(function () {
					o.doAPICall(params, callback, errCallBack, isRetry);
				}, isRetry*500);
				// In case we get edit conflicts
				if (result.error && 'editconflict' === result.error.code && (params.prependtext || params.appendtext) && isRetry < 20) return setTimeout(function () {
					o.doAPICall(params, callback, errCallBack, isRetry);
				}, isRetry*500);
				// If the edit-conflict is about the full text, we have to re-obtain the text and perform the opteration again
				// ....
				// If the edit-token is expired or corrupt
				if (result.error && 'badtoken' === result.error.code && isRetry < 20) {
					return o.refreshEditToken(function(gotNewToken) {
						if (gotNewToken) {
							o.doAPICall(params, callback, errCallBack, isRetry);
						} else {
							return doErrCB("API request failed (" + result.error.code + "): " + result.error.info);
						}
					});
				}
				if (result.error) {
					return doErrCB("API request failed (" + result.error.code + "): " + result.error.info);
				}
				if (result.edit && result.edit.spamblacklist) {
					return doErrCB("The edit failed because " + result.edit.spamblacklist + " is on the Spam Blacklist");
				}
				o.mdSecureCall(callback, result, params);
			},
			error: function (x, status, error) {
				// Call always first; jQuery complete-evt is called after that
				always();
				
				var doErrCB = function() {
					if ($.isFunction(o[errCallBack])) {
						o.mdWasAPIError = true;
						return o[errCallBack]('', params, 'Server status: ' + x.status + ' - Error:' + error);
					} else {
						return o.fail("Server returned code " + x.status + " -" + status + "- Error code is " + error);
					}
				};
				
				// Catch nasty server errors and retry; 50x are timeouts and similar, 200 is a JSON parser error so the server sent something terribly wrong
				if (x && x.status && ((x.status > 499 && x.status < 600) || 200 === x.status) && isRetry < 20) {
					if (params.action && 'edit' === params.action) {
						o.editedPageLast(params.title, params.summary, function(edited) {
							switch (edited) {
								case  1: o.mdSecureCall(callback, {}, params);
									return;
								case  0: setTimeout(function () {
										o.doAPICall(params, callback, errCallBack, isRetry);
									}, isRetry*500);
									return;
								case -1: // Error! 
									doErrCB();
									return;
							}
						});
					} else {
						setTimeout(function () {
							o.doAPICall(params, callback, errCallBack, isRetry);
						}, isRetry*500);
					}
					return;
				}
				doErrCB();
			}
		});
	},
 
	/**
	** Does a HTTP request and passes the result to the supplied callback (method name).
	** Highly flexible
	**/
	doHTTPRequest: function (params, callback, requestType, requestURL) {
		var o = this;
		$.ajax({
			url: (requestURL || (mw.config.get('wgServer') + mw.config.get('wgScript'))),
			cache: false,
			dataType: 'html',
			data: params,
			type: requestType,
			success: function (result, status, x) {
				if (!result) return o.fail("Received empty response:\n" + x.responseText);
				if (x.status > 299) return o.fail("Status over 299 - fail\n" + x.responseText);
				
				o.mdSecureCall(callback, result);
			},
			error: function (x, status, error) {
				return o.fail("API request returned code " + x.status + " " + status + "Error code is " + error);
			}
		});
	},
 
	/**
	** crude error handler.
	**
	**/
	fail: function (err) {
		err = err.toString();
		document.body.style.cursor = 'auto';
		if ('undefined' !== typeof(console)) console.log('Error: ' + err);
		var msg = this.i18n.taskFailure[this.currentTask] || ('-- NO TASK DESCR. FOR ' + this.currentTask + ' PLEASE ADD IT --');
 
		var reportPage = '';
		this.mdBusy = false; // Prevents that our mdDlgThumbDlgClose will be refused
		
		this.pb.setCurrentTaskState('md-failed');
 
		if ( 'MD' === this.context || 'MD-RevertImage' === this.context || 'MD-postDlg' === this.context ) {
			reportPage = this.mdErrReportPath;

			this.context = 'MD-Error';
		}
		if (this.pb) this.pb.setError(msg + ' ##### ' + err);
	},
	
	/**
	** Method to catch errors and report where they occurred
	**/
	mdSecureCall: function(stFunction) {
		var o = this;
		try {
			this.currentTask = arguments[0];
			return o[stFunction].apply(this, Array.prototype.slice.call(arguments, 1)); // arguments is not of type array so we can't just write arguments.slice
		} catch (ex) {
			//console.log('failure at ' & stFunction)
			o.fail(ex);
		}
	},
	
	/**
	** Simple task queue.  addTask() adds a new task to the queue, nextTask() executes
	** the next scheduled task.  Tasks are specified as method names to call.
	**/
	tasks: [],
	// list of pending tasks
	currentTask: '',
	// current task, for error reporting
	oldTask: '',
	// task called before
	addTask: function( task ) {
		this.tasks.push(task);
	},
	nextTask: function() {
		var task = this.currentTask = this.tasks.shift();
		return ($.isArray(task) ? this.mdSecureCall.apply(this, task) : this.mdSecureCall(task)); // Ja da guckste ...
	},
	lastTask: function() {
		var task = this.currentTask = this.tasks[this.tasks.length - 1];
		this.tasks = [];
		return ($.isArray(task) ? this.mdSecureCall.apply(this, task) : this.mdSecureCall(task));
	},
	
	/**                                                    **
	*************** SETTINGS / CONFIGURATION ****************
	**                                                    **/
	mdOpt: {	//		0	1						2					3						4		5		6		7												8																									9											10
	// key,		minLenReq,	acceptReason, 			prefill, 			confirmation, addTalkNote, replace, otrsrepl,	tag,											+summary																							talk_tag									talk_summary
		'c_replace':[false,	false,					'',					'',						false,	true,	false,	"",												'Doing %replacementcount% replacements.', 															'',											''],
		'prepend':  [false,	'mdInsertGeneric',		'',					'',						false,	false,	false,	"",												'Inserting "%pattern%"', 																			'',											''],
		'prepNf':   [false,	'mdInsertAll',			'',					'',						true,	false,	false,	"",												'Inserting "%pattern%"', 																			'==[[:%FILE%]]==\n',						'There are questions or comments about [[%FILE%]].'],
		'append':   [false,	'mdInsertGeneric',		'',					'',						false,	false,	false,	"",												'Inserting "%pattern%"', 																			'',											''],
		'cv':		[true,	'mdInsertDeleteReasen',	'',					'mdDelteConfirmation',	true,	false,	false,	"{{copyvio|1=%REASON%}}\n",						'%cv% %REASON%', 																					'{{subst:copyvionote|1=%FILE%}}',			'Notification of possible copyright violations.'],
		'cv-dw':	[true,	'mdInsertDeleteReasen',	'',					'mdDelteConfirmation',	true,	false,	false,	"{{Derivative|1=%REASON%}}\n",					'%cv% it is a [[COM:DW|derivative work]] of a work protected by copyright.', 						'{{subst:Derivativenote|1=%FILE%}}',		'Notification of possible copyright violations. (Derivative)'],
		'cv-fu':	[false,	false,					'',					'',						true,	false,	false,	"{{Fair use}}\n",								'%cv% [[COM:FU|fair use]] media are not allowed on Commons.', 										'{{subst:No fair use|1=%FILE%}}',			'Please do not upload media with fair-use claims on commons.'],
		'cv-logo':	[false,	false,					'',					'',						true,	false,	false,	"{{Logo}}\n",									'%cv% this logo exeeds the threshold of creativety and therefore is subject to copyright.', 		'{{subst:copyvionote|1=%FILE%}}',			'Notification of possible copyright violations. (Logo)'],
		'cv-ndw':	[false,	false,					'',					'',						true,	false,	false,	"{{Nonderivative}}\n",							'%cv% no derivatives are allowed, which is [[COM:L|incompatible with commons]].', 					'{{subst:copyvionote|1=%FILE%}}',			'Notification of possible copyright violations. (NoDerivative)'],
		'del':		[true,	'mdInsertDeleteReasen',	'',					'mdDelteConfirmation',	true,	false,	false,	"{{delete|reason=%REASON%|subpage=%SUBPAGE%|%D%}}\n", '[[COM:DR|Nominating for deletion]].', 														'{{subst:idw|2=%REQUESTPAGE%|3=plural}}\nAffected:\n* [[:%FILE%]]\n', 'Warning: Some of your [[%FULLREQUESTPAGE%|uploads have been nominated for deletion]].'],
		'np':		[false,	false,					'',					'',						true,	false,	false,	"{{subst:npd}}\n",								'Missing [[COM:PERMISSION|permission]].', 															'{{subst:image permission|1=%FILE%}}',		'Please send a permission for [[%FILE%]] and some other files to [[COM:OTRS|OTRS]].'],
		'ns':		[false,	false,					'',					'',						true,	false,	false,	"{{subst:nsd}}\n",								'File has no [[COM:Source|source]].', 																'{{subst:image source|1=%FILE%}}',			'[[%FILE%]] (and maybe some other ones) does not have [[COM:Source|a source]].'],
		'ns-dw':	[false,	false,					'',					'',						true,	false,	false,	"{{subst:Dw-nsd}}\n",							'File is a [[COM:DW|derivative work]] and sources or permission of the original works are not given.', '{{subst:dw image source|1=%FILE%}}', 	'[[%FILE%]] (and some other files) are a [[COM:DW|derivative works]] and don\'t have sources.' ],
		'otrs':		[false,	'mdInsertOther',		'mdOTRSprefill',	'mdInsertConfirmation',	false,	false,	true,	"",												'Addding an [[COM:OTRS|OTRS]] tag to the permission section of this file. Removing problem tags.', 	'',											''],
		'other':	[false,	'mdInsertOther',		'mdOTRSprefill',	'mdInsertConfirmation',	false,	false,	true,	"",												'Addding an [[COM:OTRS|OTRS]] or license-review tag to the permission section of this file.', 		'',											'']
	},
	mdCommands: {
		'c_replace':{ tasks: ['mdRefreshCache', 'mdInsertPermission'] },
		'prepend':	{ tasks: ['mdPrependText', 'mdPrependTemplate'] },
		'prepNf':	{ tasks: ['mdPrependText', 'mdPrependTemplate', 'mdNotifyUploaders'] },
		'append':	{ tasks: ['mdAppendText', 'mdAppendTemplate'] },
		'cv':		{ cleanReason: true, tasks: ['mdPrependTemplate', 'mdNotifyUploaders', 'mdRvGenOGallery'] },
		'cv-dw':	{ cleanReason: true, tasks: ['mdPrependTemplate', 'mdNotifyUploaders', 'mdRvGenOGallery'] },
		'cv-fu':	{ cleanReason: true, tasks: ['mdPrependTemplate', 'mdNotifyUploaders', 'mdRvGenOGallery'] },
		'cv-logo':	{ tasks: ['mdPrependTemplate', 'mdNotifyUploaders', 'mdRvGenOGallery'] },
		'cv-ndw':	{ tasks: ['mdPrependTemplate', 'mdNotifyUploaders', 'mdRvGenOGallery'] },
		'del':		{ cleanReason: true, tasks: ['mdCreateRequestSubpage', 'mdPrependTemplate', 'mdNotifyUploaders', 'mdListRequestSubpage', 'mdRvGenOGallery'] },
		'np':		{ tasks: ['mdPrependTemplate', 'mdNotifyUploaders', 'mdRvGenOGallery'] },
		'ns':		{ tasks: ['mdPrependTemplate', 'mdNotifyUploaders', 'mdRvGenOGallery'] },
		'ns-dw':	{ tasks: ['mdPrependTemplate', 'mdNotifyUploaders', 'mdRvGenOGallery'] },
		'otrs':		{ tasks: ['mdRefreshCache', 'mdInsertPermission'] },
		'other':	{ tasks: ['mdRefreshCache', 'mdInsertPermission'] }
	},
	mdOptText: {
		'cv': 'Marking as possible [[COM:Copyvio|copyright violation]] because '
	},
	
	mdGetWatchlistSelect: function() {
		var $sel = $('<select size="1"></select>')
			.append($('<option>', { text: 'watch', value: 'watch' }))
			.append($('<option>', { text: 'do not change watchstatus', value: 'nochange' }))
			.append($('<option>', { text: 'as specified in your preferences', value: 'preferences' }));
		return $sel;
	},
	
	mdDefaults: [
		{
			'v': 'userNote', 
			'old': 'AjaxMassDeleteUserNote',
			'd': 'Additional note to leave on the user\'s talk page', 
			'default': 'Yours sincerely',
			'controls': '#mdTalkNote'
		}, {
			'v': 'firstTest', 
			'd': 'Ask for confirmation before doing edit number', 
			'default': 0,
			'min': 0, 
			'max': 50
		}, {
			'v': 'testEdits', 
			'd': 'Ask for confirmation after each … edits', 
			'default': 0,
			'min': 0, 
			'max': 500
		}, {
			'v': 'defaultAction',
			'd': 'Default action to perform',
			'default': 'del',
			'select': function() {
				if ($(this.controls).length) {
					return $(this.controls).clone();
				} else {
					var $sel = $('<select size="1"></select>');
					$.each(VisualFileChange.i18n.mdOptions, function(i, el) {
						$sel.append($('<option>', { text: el, value: i }));
					});
					return $sel;
				}
			},
			'controls': '#AjaxMdType'
		}, {
			'v': 'watchlistUserTalk',
			'd': 'Watch edited user talk pages',
			'default': 'preferences',
			'select': 'mdGetWatchlistSelect'
		}, {
			'v': 'watchlistFiles',
			'd': 'Watch edited file pages (Exception: File pages are never watched if "custom replace" is used)',
			'default': 'preferences',
			'select': 'mdGetWatchlistSelect'
		}, { 
			'v': 'loadBatchSize', 
			'old': 'AjaxMassDeleteInterval',
			'd': 'Amount of files to be loaded when clicking on more or when scrolling down', 
			'default': 30,
			'min': 1, 
			'max': (isSysop ? 1000 : 100)
		}, {
			'v': 'maxSimultaneousReq', 
			'd': 'Maximum number of requests to send to the API simultaneously', 
			'default': (isSysop ? 10 : (mw.user.anonymous() ? 1 : 5)),
			'min': 1, 
			'max': (isSysop ? 100 : (mw.user.anonymous() ? 2 : 50))
		}
	],
	
	// Will be filled while initializing
	mdSettings: {},
 
	mdTagRemoval: [
		[/\{\{[Oo]TRS[ _][Pp]ending[^\}\n]*\}\}/g],
		[/\{\{[Oo]TRS[ _][Rr]eceived\|.*\}\}/g],
		[/\{\{[Nn]o[ _]license[^\}\n]*\}\}/g],
		[/\{\{[Nn]o[ _]permission[^\}\n]*\}\}/g],
		[/\{\{[Nn]o[ _]OTRS[ _]permission[^\}\n]*\}\}/g],
		[/\{\{[Nn]o[ _]source[ _]since\|.*\}\}/g],
		[/\{\{[Dd]w[ _]no[ _]source[ _]since\|.*\}\}/g],
		[/\{\{[Ss]peedydelete.*\}\}/g],
		[/\{\{[Cc]opyvio.*\}\}/g],
		[/\{\{[Ll]ogo[\|.*]?\}\}/g],
		[/\{\{[Cc]over\}\}/g],
		[/\{\{[Dd]erivative[\|.*]?\}\}/g],
		[/\{\{[Ss]creenshot.*\}\}/g],
		[/\{\{[Nn]oncommercial.*\}\}/g],
		[/\{\{[Nn]onderivative.*\}\}/g]
	],
 
	mdTagRecognization: [
		// RegExp for the tag								note to add to the thumb-page
		[/Deletion requests.*/,								'd'], 
		[/Incomplete deletion requests.*/,					'd(incomplete)'],
		[/Media missing permission.*/,						'!p'],
		[/Media without a license.*/,						'!l'],
		[/Media without a source.*/,						'!s'],
		[/Other speedy deletions.*/,						'speedyd'],
		[/Copyright violations.*/,							'copyvio'],
		[/OTRS pending.*/,									'on',  'ddf'],
		[/Items with OTRS permission confirmed.*/,			'opm', 'bcf'],
		[/OTRS received.*/,									'or',  'cdf'],
		[/[Aa]dmin[\- ]reviewed [licenses|Flickr images]/,	'lrd', '8fa'],
		[/Flickr images needing human review/,				'frR', 'af8'],
		[/License review needed/,							'lrR', 'af8']
	],
 
	mdLicenseRecognization: [
		// RegExp for the tag			note to add to the thumb-page
		[/Category:CC[\- _]BY-SA.*/i,	'CC-By-SA'],
		[/Category:CC[\- _]BY.*/i,		'CC-By'],
		[/Category:CC[\- _]Zero.*/i,		'CC0'],
		[/Category:GFDL.*/i,			'GFDL'],
		[/Category:PD[\- _]Old.*/i,		'PD-old'],
		[/Category:PD[\- _]self.*/i,		'PD-self'],
		[/Category:PD[\- _]author.*/i, 	'PD-author'],
		[/Category:PD.*/i, 				'PDx'],
		[/Category:FAL/i, 				'LibreA'],
		[/Category:Images requiring attribution/i, 				'Attrib'],
		[/Category:Copyrighted free use.*/i, 					'CFreeUse'],
		[/Category:Mozilla Public License/i, 					'MPL'],
		[/Category:GPL/i, 										'GPL'],
		[/Category:Free screenshot.*/i, 						'free-Screenshot'],
		[/Category:Self[\- _]published[ß\- _]work/i, 				'<b>self</b>'],  // rm the next tags from being shown
		[/Valid SVG/, ''], [/Translation possible/, ''], [/License[\- _]migration redundant/, ''], [/Retouched pictures/, ''], [/Extracted images/, ''], [/Images with annotations/, ''], [/Media needing category/, ''], [/requiring review/, ''], [/[Flickr|License] review needed/, ''], [/[Aa]dmin[\- ]reviewed/, ''], [/UploadWizard/, ''], [/OTRS[\- _]received/, ''], [/Items[\- _]with[\- _]OTRS[\- _]permission/, ''], [/OTRS[\- _]pending/, ''], [/Media with locations/, ''], [/Media missing/, ''], [/Media without a/, ''], [/Deletion requests/, '']
	],
 
	mdOTRSprefill: '{{PermissionOTRS|id=%ID|~~'+'~~}} {{subst:OR|id=%ID|reason=processing, nonfree, email}}',
	mdOTRSTicketPrefill: '{{PermissionOTRS|ticket=%URL|~~'+'~~}} {{subst:OR|ticket=%URL|reason=processing, nonfree, email}}',
	mdSimplePermissionPattern: /(\|\s*Permission\s*\=)/i,
	mdPermissionPattern: /^((?:.|\n)+?)(\|\s*Permission\s*\=)((?:.|\n)+?)?((?:\n\s*\}\}|\n\s*\|)(?:.|\n)*)$/i,
	mdNextParamPattern: /^(?:\n\s*\}\}|\n\s*\|)/i,
	mdURLPattern: /(https:\/\/\S*)/,
	mdRegExpPattern: /^\/(.+)\/([oigmx]{0,5})$/,
	mdSelfPath: 'MediaWiki:VisualFileChange.js',
	mdErrReportPath: 'User_talk:Rillke/AjaxMassDelete.js',
	mdUserPrefix: mw.config.get('wgFormattedNamespaces')[2] + ':',
	mdUserTalkPrefix: mw.config.get('wgFormattedNamespaces')[3] + ':',
	mdContribPrefix: mw.config.get('wgFormattedNamespaces')[-1] + ':Contributions/',
	mdRequestPagePrefix: 'Commons:Deletion requests/',
	mdReLoader: '<p align="center"><img src="//upload.wikimedia.org/wikipedia/commons/c/ce/RE_Ajax-Loader.gif"/></p>',
	mdSuccessIcon: '//upload.wikimedia.org/wikipedia/commons/thumb/a/ac/Crystal_Project_success.png/120px-Crystal_Project_success.png',
	mdDoingIcon: '//upload.wikimedia.org/wikipedia/commons/thumb/a/ae/Quick_restart.png/120px-Quick_restart.png',
	mdNoChangeIcon: '//upload.wikimedia.org/wikipedia/commons/thumb/7/76/Crystal_Project_tick_yellow.png/120px-Crystal_Project_tick_yellow.png',
	mdFailIcon: '//upload.wikimedia.org/wikipedia/commons/thumb/c/c8/Crystal_Project_cancel.png/120px-Crystal_Project_cancel.png',
	mdThisTaskIcon: '//upload.wikimedia.org/wikipedia/commons/thumb/4/41/Crystal_Clear_action_loopnone.png/16px-Crystal_Clear_action_loopnone.png',
	mdDoneTaskIcon: '//upload.wikimedia.org/wikipedia/commons/thumb/a/ac/Crystal_Project_success.png/16px-Crystal_Project_success.png',
	mdFailedTaskIcon: '//upload.wikimedia.org/wikipedia/commons/thumb/c/c8/Crystal_Project_cancel.png/16px-Crystal_Project_cancel.png',
	mdInfoIcon: '//upload.wikimedia.org/wikipedia/commons/0/09/Crystal_Clear_action_info.png',
	mdAttentionTaskIcon: '//upload.wikimedia.org/wikipedia/commons/thumb/a/af/Crystal_Clear_app_error-info.png/16px-Crystal_Clear_app_error-info.png',
	mdErrorsReportPath: mw.util.wikiGetlink('User talk:Rillke'),
	mdHelpNode: '<a href="' + mw.util.wikiGetlink('Help:VisualFileChange.js') + '" target="_blank"><img title="Help and known issues. Icon by Markus Hohenwarter and Michael Borcherds, cc-by-sa-3.0" alt="?" src="//upload.wikimedia.org/wikipedia/commons/4/45/GeoGebra_icon_help.png"></a> ',
	excludedBots: 'FlickreviewR, Rotatebot, Cropbot, Picasa Review Bot, File Upload Bot (Magnus Manske), Flickr upload bot, Upload Bot (Rich Smith), Reedy RotateBot',
 
	// Translatable strings
	i18n: {
		mdButtonLabel: "Perform batch task",
		mdPerformOnWhichTarget:  "What user or category is this action about?",
		mdTargetInput: "User or category:",
		mdDisselectAll: " (De-)select&nbsp;all&nbsp;loaded:&nbsp;",
		mdInsertDeleteReasen: "Select the files to delete and fill in the reason, please",
		mdInsertDeleteHeading: "Insert the heading for the mass deletion request, please",
		mdInsertOther: "Please insert the OTRS (or other) text to add to the permission section",
		mdInsertEditSummary: "An auto-edit summary for the file-pages will be created. Additionally add",
		mdReplacePermissionText: "Clean permission-section?",
		mdCustomReplaceText: "Please insert the text that should be inserted instead",
		mdInsertGeneric: "Please insert the text to be added to each selected file.",
		mdInsertAll: "Insert the text to be added to each selected file. Do not forget to add the text for the user.",
		mdInsertTalkNote: "Please enter a note to add to the user\'s talk-page",
		mdInsertReplaceMatch: "What text should become replaced on the selected files?",
		mdDelteConfirmation: "Your provided reason to delete is",
		mdInsertConfirmation: "Your provided tag to insert in the permission section is",
		mdSpecifyReason: "Please specify a reason with at least 6 letters.",
		mdSelectedCount: "You selected %C% files to tag.",
		mdMore: "more",
		mdNoResult: "Script cannot find any file / initial upload in / by %TARGET%.",
		mdExecutingTaskEnumerateFiles: "Enumerating files for the requested task.",
		mdExecutingTask: "Executing your requested task.",
		mdCuteSelectLabel: "Cute Select Files",
		mdDelContribsButtonLabel: "Cached deleted uploads",
		mdRevertButtonLabel: "Revert images",
		proceedButtonLabel: "Proceed",
		submitButtonLabel: "Execute",
		cancelButtonLabel: "Cancel",
		abortButtonLabel: "Abort",
		mdPleaseWait: "Please wait.",
		
		optStartAt: "Start listing from a specific date",
		optStartAtHowTo: 'Format:  YYYY-MM-DD<br/> or, optionally<br/>YYYY-MM-DD&nbsp;hh:mm:ss<br/>or use the picker',
		optMore: "More options",
		
		mdConfig: {
			getScriptErr: "Error getting your userscripts!",
			okButton: 'Ok (Remember until next reload)',
			cancelButton: 'Cancel',
			permaSaveButton: 'Save permanently',
			defaultsButton: 'Fill-in defaults'
		},
		
		mdCuteSelect: {
			'and': "AND",
			'intro': "The selection of matching and loaded files will be changed. If you want to apply changes, click on the button in the bottom. To close this dialog, click on the cross in the top right corner. Specify what to (de-)select, empty fields are considered fulfilling the condition:",
			'select': "Select (/Deselect)",
			'inCat': "In Category",
			'title': "Title matches",
			'wikitext': "Wikitext matches",
			'matches': "matches",
			'size': "Size",
			'date': "<abbr title=\"Only one date is required. But the first date (start date) must be before the second date (end date).\">Date</abbr> (time is optional)",
			'between': "between",
			'before': "If only one date specified, match all before that date.",
			'after': "If only one date specified, match all after that date.",
			'titleplaceholder': "(Reg)(?:ular )?(Exp)(?:ression)?",
			'wikitextplaceholder': "Wikitext matches RegExp",
			'dateplaceholder': "YYYY-MM-DD hh:mm:ss",
			'button': "Apply"
		},
		
		mdPotentialProblems: {
			'titleNf': 'No files selected',
			'textNf': 'It seems to me that you did not select any file to tag. Proceed?',
			'titleRE': 'Regular expression?',
			'textRE': 'The pattern to replace seems to be a Regular Expression but is not flagged as it (checkbox).',
			'titleInvalidRE': 'Invalid Regular Expression',
			'textInvalidRE': 'The regular expression is invalid. Maybe "//" are missing. Required syntax: /regexp/flags where flags can be i,g,m.',
			'back': 'Oops forgot this.',
			'proceed': 'Proceed anyway.'
		},

		mdOptions: {
			'cv': "Copyvio",
			'cv-dw': "Copyvio derivative",
			'cv-fu': "Copyvio fair-use",
			'cv-logo': "Copyvio sophisticated logo",
			'cv-ndw': "Copyvio derivative prohib",
			'del': "Nominate for deletion",
			'np': "No permission",
			'ns': "No source",
			'ns-dw': "No source -Derivative",
			'other': "OTRS- add",
			'otrs': "OTRS- remove tags",
			'c_replace': "custom replace",
			'prepend': "prepend any text",
			'append': "append any text",
			'prepNf': "prepend text, notify uploaders"
		},
		
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
			mdRvGenOGallery: 'Overwritten files can\'t be reverted due to software changes. But hopefully fixed soon.'
		},
 
		taskFailure: {
			mdStartMd: "An error occurred while starting the request an determining the contributor. Nothing has been modified.",
			findOriginalUploader: "An error occurred while trying to get the initial uploader of this image.",
			findOriginalUploaderCB: "An error occurred after trying to obtain the initial uploader of this image.",
			mdContinue: "An error occurred while starting the request and prefilling the contributor.",
			mdCreateList: "While trying to prepare to invoke the list-query, an error occurred.",
			mdFindUploads: "An error occurred while querying the upload-list.",
			mdFindUploadsCB: "An error occurred after querying the upload-list.",
			mdFindCatMembers: "Error trying to list the cat-members.",
			mdFindCatMembersCB: "There is something wrong with the file-list (cat)",
			mdGenIGallery: "An error occurred setting up the selection dialog.",
			mdSendNextQueries: "An error occurred preparing to query file-information.",
			mdCreateGalleryBox: "While creating the HTML for a gallerybox, an error occurred.",
			mdCreateDelUploadItem: "Creating an entry in the deleted-upload-list failed.",
			mdExtractTags: "An error occurred while extracting tags from the page's content.",
			mdQueriedFile: "An error occurred after gathering file information and inserting them into the dialog.",
			mdExtractLicense: "An error occurred while extracting license from categories.",
			mdQueryFileDone: "An error occurred after gathering all file-information.",
			mdQueryMore: "Attempting to continue querying script encountered an error.",
			mdExecute: "An error occurred while fetching your input.",
			mdExecuteContinue: "An error occurred while preparing the request.",
			mdRefreshCache: "An error occurred while updating the cached wikitext.",
			mdInsertPermission: "An error occurred while preparing the insertion of the permission.",
			mdInsertOTRS: "An error occurred while preparing the page-content of the permission.",
			mdCreateRequestSubpage: "An error occurred creating the deletion-request subpage.",
			mdListRequestSubpage: "There was an error while listing the request-subpage.",
			mdPrependText: 'There was an error prepending free-text to files.',
			mdAppendText: 'There was an error appending free-text to files.',
			mdTemplateAdded: "An error occurred after a template has been added to a description page.",
			mdNotifyUploaders: "An error occurred while notifying uploaders.",
			mdRvGenOGallery: "An error occurred setting up the selection-revert dialog.",
			mdRvQueriedFile: "An error occurred after gathering revert-file information and inserting them into the dialog.",
			mdRvCreateImgRevisionMatrix: "An error occurred trying to obtain image revisions.",
			mdRvEvalSelction: "An error occurred processing selected files.",
			mdRevertImage: "There was an error before or while posting the revert-request.",
			mdReverted: "An error occurred after posting the revert-request.",
			mdExecuteReady: 'And error occurred after all sheduled tasks are done.'
		}
	}
};


/**                                                    **
******************* PLUGINS / LOAD **********************
**                                                    **/

/*if (wgUserLanguage != 'en') importScript('MediaWiki:VisualFileChange.js/' + wgUserLanguage);*/
mediaWiki.loader.using([
'jquery.ui.dialog',
'jquery.ui.datepicker',
'jquery.ui.autocomplete',
'jquery.tipsy',
'jquery.placeholder',
'mediawiki.user',
'mediawiki.util'
], function () {
	this.context = "QD";
	$(document).unbind('vFC.debuglistener');
	$(document).bind('vFC.debuglistener', function(e, p1, p2, p3) {
		if (window.VisualFileChangeDebug && console && console.log) console.log('VisualFileChange> ' + p1 + (('Settings' === p1) ? ('> ' + p3) : '' ));
	});
	VisualFileChange.mdInstall();
});

// / <reference path="jquery-1.4.2.min.js"/>
/*
@author Dan Gidman
released under GNU General Public License v3
http://www.gnu.org/licenses/gpl.html
version 1
September 2, 2010
*/
(function ($) {
    $.fn.visible = function () {
        // / <summary>Filter that checks if the item(s) is visible within the page. Returns set of visible elements</summary>
        // / <returns type="jQuery" />
        // sanity check aborts when no elements visible
        return this.filter(":visible").filter(function () {
            var add = true, 
                elem = this, 
                p = $(this).parents().filter(function () {
                    return (this.scrollHeight > this.offsetHeight || this.scrollWidth > this.offsetWidth);
                }); // select only scrollable parents
            // loop through the parent elements checking that each 
            // scrollable element is visible in parent.
            for (var i = 0; i < p.length; ++i) {
                var vp = $(p[i]), v = { 
                    t: vp.scrollTop(),
                    b: vp.scrollTop() + vp.height(),
                    l: vp.scrollLeft(),
                    r: vp.scrollLeft() + vp.width()
                }, el = $(elem), e = {
                    t: elem.offsetTop,
                    b: elem.offsetTop + el.height(),
                    l: elem.offsetLeft,
                    r: elem.offsetLeft + el.width()
                };
                elem = p[i];
                if (!(add = add && ( v.t < e.b && v.b > e.t && v.l < e.r && v.r > e.l ))) break;
            }
            return add;
        });
    };
    $.extend($.expr[':'], { "in-view": function(a, i, m) { return $(a).visible().length > 0; } });
})(jQuery); 
 
}) }(jQuery, mediaWiki));
// </nowiki>