// It helps performing mass-changes on the uploads of a paricular user.
// It was composed by [[User:Rillke]] in 2011; Thanks DieBuche for advice; some code stolen from commons:MediaWiki:AjaxQuickDelete.js
// <nowiki>
// TODO if version 1.18 ready, add possibility to revert all images
//   http://svn.wikimedia.org/viewvc/mediawiki/trunk/phase3/includes/api/ApiFileRevert.php?view=log
//   action=filerevert&filename=File:MassDeleteOTRS.png&comment=TestingBryanTongMinhRevert&archivename=20110429234711!Wiki.png&token=+\\
// TODO AJAX userlist-dropdown / verification

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
if (!window.VisualFileChange) {

/**
 * Create a progress-box object.
 * @constructor
 *
 * @example
 *      new progressBox( 150, this );
 *
 * @param width {Number} The initial width of the panal.
 * @param o {Object} Parent object storing i18n-information in .i18n.task = {} and icon URIs like .mdThisTaskIcon
 */
function progressBox(width, o) {
	this.w = (width || 250);
	this.t = {};
	this.ct = 0;
	this.usingObj = o;
	
	_this = this;
	this.$cont = $('<div>', { 
		style: 'display:none; overflow:hidden; left:0px; width:' + this.w + 'px; height:100%; z-index: 1000; top:0pt; position:fixed; font:15px sans-serif; background-color: #cde; background-image: -moz-linear-gradient(top, #cde, #eee 100px, #eee); background-image: -ms-linear-gradient(top, #cde, #eee 100px, #eee); background-image: -o-linear-gradient(top, #cde, #eee 100px, #eee); background-image: -webkit-gradient(linear, left top, left bottom, from(#cde), to(#eee), color-stop(100px, #eee));' 
	}).dblclick(function() { _this.$cmd.focus(); });
	this.$cmd = $('<input>', {
		'id': 'mdCMD',
		'type': 'text',
		'maxlength': '2',
		'style': 'position:absolute; top:-10000px;'
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
	this.$subheading = $('<span>', {
		style: 'font:small-caps 0.8em sans-serif;',
		text: 'Batch Surgery Script v.' + o.mdScriptRevision
	}).append($('<br>'), 'Report bugs and ideas to <a href="' + o.mdErrorsReportPath + '" target="_blank">Rillke</a>.');
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
	this.$cont.append(this.$cmd, this.$x, this.$capt, this.$subheading, this.$tasklist, this.$aHelp, this.$errorCont);
	$('body').append(this.$cont);
	appendCSS('.md-doing { padding-left:16px; background:url(\'' + o.mdThisTaskIcon + '\') no-repeat left; font-weight:bold; } '
		+ '.md-done { padding-left:16px; background:url(\'' + o.mdDoneTaskIcon + '\') no-repeat left; } '
		+ '.md-failed { padding-left:16px; background:url(\'' + o.mdFailedTaskIcon + '\') no-repeat left; } '
		+ '.md-attention { padding-left:16px; background:url(\'' + o.mdAttentionTaskIcon + '\') no-repeat left; } '
	);
}
progressBox.prototype.show = function () {
	this.$cont.show();
}
progressBox.prototype.hide = function () {
	this.$cont.hide();
}
progressBox.prototype.remove = function () {
	this.$cont.remove();
}
progressBox.prototype.addTask = function (task) {
	var n = $('<div>', { text: this.usingObj.i18n.task[task], 'class': 'md-notdone' });
	this.t[task] = n;
	this.$tasklist.append( n );
}
progressBox.prototype.setCurrentTaskState = function (state) {
	if (this.ct) this.ct.removeClass('md-notdone md-doing md-done md-attention').addClass(state);
}
progressBox.prototype.setCurrentTaskDone = function () {
	if (this.ct && this.ct.hasClass('md-doing')) this.ct.removeClass('md-doing').addClass('md-done');
}
progressBox.prototype.setTaskState = function (taskname, state) {
	this.t[taskname].removeClass('md-notdone md-doing md-done md-attention').addClass(state);
	this.ct = this.t[taskname];
}
progressBox.prototype.setHelp = function (help) {
	this.$aHelpHead.text(help);
}
progressBox.prototype.setHelp2 = function (help, html) {
	if (html) {
		this.$aHelpCont.html(help);
	} else {
		this.$aHelpCont.text(help);
	}
}
progressBox.prototype.setHelp3 = function (help) {
	this.$aHelpCont2.text(help);
}
progressBox.prototype.setError = function (err) {
	this.$error.text(err);
	this.$errorCont.show();
}
progressBox.prototype.setZIndex = function (zIndex) {
	this.$cont.css('z-index', zIndex);
}
progressBox.prototype.isHidden = function () {
	return ('none' === this.$cont.css('display'))
}

/**
 * Create a new VisualFileChange-literal-Object.
 *
 * @context {window}
 */
window.VisualFileChange = {
	/**
	** Set up the VisualFileChange object and add the toolbox link.  Called via $(document).ready() during page loading.
	**/
	mdInstall: function () {
		// Don't install link if the user opted out
		if (window.AjaxDeleteOptOut) return;

		$tAjaxQuickDeleteOnDemand = $("#t-AjaxQuickDeleteOnDemand")
		if ( 1 == $tAjaxQuickDeleteOnDemand.length ) {
			// User is using the load on demand feature. 
			// Replace the link
			$tAjaxQuickDeleteOnDemand.remove();
			addPortletLink('p-tb', 'javascript:VisualFileChange.mdStartMd();', this.i18n.mdButtonLabel, 't-AjaxQuickDeletx2', null);
			
			// Immedately start Md
			this.mdStartMd();
		} else {
			if ( "MediaWiki:VisualFileChange.js" === mw.util.getParamValue('withJS') ) {
				// Load immediately and add no link
				this.mdStartMd();
 
			} else if (mw.config.get('wgNamespaceNumber') !== 14) {
				// Set up toolbox link
				addPortletLink('p-tb', 'javascript:VisualFileChange.mdStartMd();', this.i18n.mdButtonLabel, 't-AjaxQuickDeletx2', null);
			}
		}
		$(document).triggerHandler('vFC', ['installed', this]);
	},
	
	mdCancel: function () {
		var _this = VisualFileChange;
		_this.pb.remove();
		_this.mdDlgThumbDlgClose();
	},
 
	mdStartMd: function () {
		var wgPageName = mw.config.get('wgPageName'),
			pb;
		
		$(document).triggerHandler('vFC', ['starting procedure', this]);

		pb = this.pb = new progressBox(undefined, this);
		pb.addTask('start');
		pb.addTask('target');
		pb.addTask('list');
		pb.addTask('datails');
		pb.setTaskState( 'start', 'md-doing' );
		pb.show();
		
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
					if ( "Contributions" === mw.config.get('wgCanonicalSpecialPageName') ) {
						// Extract target from addressline
						if ( -1 !== location.href.indexOf("\/Special:Contributions\/") ) {
							this.mdTarget = decodeURI(location.href.match(/Special\:Contributions\/(.*?)$/)[1]);
						} else if ( -1 !== location.href.indexOf(mw.config.get('wgScript')) ) {
							this.mdTarget = mw.util.getParamValue('target');
						}
					}
					if ( "Log" === mw.config.get('wgCanonicalSpecialPageName') ) {
						// Extract target from addressline
						if (mw.util.getParamValue('user')) {
							this.mdTarget = mw.util.getParamValue('user');
						}
						if (mw.util.getParamValue('page')) { 
							if (/User:+./.test(mw.util.getParamValue('page'))) {
								this.mdTarget = mw.util.getParamValue('page').replace("User:", "");
							}
						}
					}
				} catch (ex) { }
				break;
			case 14: // Category - Exception Script is also able to handle cats
				// Don't become confused it's the cat
				this.mdTarget = mw.config.get('wgPageName');
				break;
		}
		
		$(document).triggerHandler('vFC', ['prepared', this]);
		
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
			this.edittoken = pages[id].edittoken; // The edittoken only changes between logins
			info = pages[id].imageinfo;
			content = pages[id].revisions[0]['*'];
			i =info.length - 1;
			// Now exclude bots which only reupload a new version:
			if (-1 === this.excludedBots.indexOf(info[i].user)) {
				this.mdTarget = info[i].user;
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
		this.gbs = {};        // File --> Gallery Box
		this.mdLestart = '';  // important for continuing the query
		this.mdLedir = 'older';      // in which direction to enumerate logevents: older/newer
		this.mdCmdir = 'asc';        // in which direction to sort: asc/desc
		this.mdCmsort = 'sortkey';   // property to sort by: sortkey/timestamp
		this.mdCmstart = 0;          // extrawurst für catmembers by date - sorting
		this.mdNoMoreFiles = false;  // set to true, when API response did not contain a new Lestart
		this.mdFirstRun = true;       // determining whether it is the first query-cycle
 
		if (this.mdTarget) {
			pefilledUser = this.mdTarget;
		}
		if ( !pefilledUser ) { 
			pefilledUser = mw.user.name(); 
		}
		$(document).triggerHandler('vFC', ['asking for target', this]);
		this.promptForTarget(pefilledUser, 1, this);
	},

	/**
	 ** Pseudo-Modal JS windows.
	 ** Needs to be converted into a class
	 **/
	promptForTarget: function (prefill, minlen, o) {
		var dlgButtons = {},
			confirmed = false,
			dlgWidth = 0,
			$submitButton, $targetinput,
			mwDateRx = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/;
			
		var getMwDate = function(dateX) {
			if ('string' !== typeof dateX) return dateX;
			if (mwDateRx.test(dateX)) return dateX;
			var m1 = dateX.match(/(\d{4}).(\d{2}).(\d{2})\D*(\d{2}:\d{2}:\d{2})?/);
			if (m1) return (m1[1] + '-' + m1[2] + '-' + m1[3] + 'T' + (m1[4] ? m1[4] : '12:00:00') + 'Z');
			m1 = dateX.match(/(\d{2}).(\d{2}).(\d{4})\D*(\d{2}:\d{2}:\d{2})?/);
			if (m1) return (m1[3] + '-' + m1[2] + '-' + m1[1] + 'T' + (m1[4] ? m1[4] : '12:00:00') + 'Z');
			else return 'Invalid. Use YYYY-MM-DD';
		};
		
		dlgButtons[o.i18n.nextButtonLabel] = function () {
			if (confirmed) return;
			confirmed = true;
			// Reading input
			o.mdTarget = o.cleanReason($targetinput.val())
			$('#AjaxMdContainer').text(o.i18n.mdPleaseWait);
			if (mwDateRx.test($gStartAt.val())) o.mdLestart = $gStartAt.val();
			switch ($gSortBy.val()) {
				case 'of':
					o.mdLedir = 'newer';
					o.mdCmdir = 'asc';
					o.mdCmsort = 'timestamp';
					o.mdCmstart = o.mdLestart;
					break;
				case 'nf':
					o.mdLedir = 'older';
					o.mdCmdir = 'desc';
					o.mdCmsort = 'timestamp';
					o.mdCmstart = o.mdLestart;
					break;
				case 'ca':
					o.mdCmdir = 'asc';
					o.mdCmsort = 'sortkey';
					break;
				case 'cd':
					o.mdCmdir = 'desc';
					o.mdCmsort = 'sortkey';
					break;
				case 'default':
					o.mdLedir = 'older';
					o.mdCmdir = 'asc';
					o.mdCmsort = 'sortkey';
					break;
			}
			
			o.nextTask();
		};
		dlgButtons[o.i18n.cancelButtonLabel] = function () {
			$(this).dialog('close');
		};

		// Are there Contaminated Sites? Remove them now.
		o.mdDlgThumbDlgClose();

		// Hide overlapping page (avoids scrolling)
		$('body').css('overflow', 'hidden');

		dlgWidth = Math.min(600, $(window).width() - 250);

		o.dlg = $('<div></div>').html('<div id="AjaxMdContainer"></div>').dialog({
			modal: true,
			closeOnEscape: true,
			position: [($(window).width() - dlgWidth - 250) / 2 + 250, ($(window).height() - 200) / 2 ],
			dialogClass: "wikiEditor-toolbar-dialog",
			title: o.i18n.mdPerformOnWhichTarget,
			height: 'auto',
			width: dlgWidth,
			buttons: dlgButtons,
			close: o.mdCancel
		});
		o.pb.setZIndex($('.ui-widget-overlay').css('z-index') + 1);
		
		$submitButton = $('.ui-dialog-buttonpane button:first');
		$targetinput = $('<input>', { type: 'text', id: 'mdTargetInput', style: 'width: 98%;', 'value': prefill });
		
		 // Start date
		$.datepicker.setDefaults( $.datepicker.regional[ mw.config.get('wgUserLanguage') ] );
		var $gStartAt = o.$gStartAt = $('<input>', {
				id: 'gStartAt',
				type: 'text',
				title: o.i18n.optStartAt,
				value: o.mdLestart,
				placeholder: 'YYYY-MM-DD'
			} )
			.datepicker( {
				changeYear: true,
				'dateFormat': 'yy-mm-ddT12:00:00Z',
				showWeek: true,
				firstDay: 1
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
				trigger: 'focus',
				gravity: 's',
				html: true,
				title: function() {
					return o.i18n.optStartAtHowTo;
				} })
			.placeholder();
		var $gStartAtL = $('<label>', {
				'for': 'gStartAt',
				title: o.i18n.optStartAt,
				html: " &nbsp;Start&nbsp;at&nbsp;"
			} );
			
		var $gSortBy = $('<select>', {
				id: 'gSortBy'
			} )
			.append( $('<option>', { 'value': 'default' }).text('default')
				,$('<option>', { 'value': 'of' }).text('from old to new (category: added-date)')
				,$('<option>', { 'value': 'nf' }).text('from new to old (category: added-date)')
				,$('<option>', { 'value': 'ca' }).text('category only: asc')
				,$('<option>', { 'value': 'cd' }).text('category only: desc')
			);
		var $gSortByL = $('<label>', {
				'for': 'gSortBy',
				title: 'Sorting',
				text: 'Sorting'
			} );
		
		$('#AjaxMdContainer').append(
			$('<label>', { 'for': 'mdTargetInput', text: o.i18n.mdTargetInput }),
			$targetinput,
			$('<br>'), $('<br>'),
			$gStartAtL,
			$gStartAt,
			' ',
			$gSortByL,
			$gSortBy
		);
		$targetinput.keyup(function(e) {
			if ($(this).val().length < minlen) {
				$submitButton.addClass('ui-state-disabled');
			} else {
				$submitButton.removeClass('ui-state-disabled');
			}
			if (13 === (e.keyCode - 0)) $submitButton.click();
		}).focus();
	},

	cleanReason: function (uncleanReason) {
		// trim whitespace
		uncleanReason = uncleanReason.replace(/^\s*(.+)\s*$/, '$1');
		// remove signature
		uncleanReason = uncleanReason.replace(/(.+)(--)?~{3,5}$/, '$1');
		// escaping '|'
		//uncleanReason = uncleanReason.replace(/\|/g, '&#124;');
		return uncleanReason;
	},
 
	/**  
	**  Called by nextTask after the fill-in-user-dialog and by mdQueryFileDone (follows later)
	**  Calls the appropriate method (uploads of cats)
	**/
	mdCreateList: function () {
		$(document).triggerHandler('vFC', ['preparing querying the filelist', this]);
		this.pb.setCurrentTaskDone();
		this.pb.setTaskState( 'list', 'md-doing' );
		if (this.mdFirstRun) { // First time only
			this.pb.setHelp(this.i18n.mdPleaseWait);
		}
		
		this.mdTarget = $.trim(this.mdTarget.replace(/^User\:/, '')); // WARNING: INPUT IS UNCHECKED
		this.mdModeCat = /^Category\:/.test(this.mdTarget);
		
		if (this.context !== 'MD') return;
		if (this.mdListUploadsPending > 0) { // If there are queries pendig continue later
			var o = this;
			setTimeout(function () { 
				o.mdCreateList() 
			}, 200); // See me later ...
			return true;
		}
		this.mdListUploadsPending++;
		
		if (this.mdModeCat) this.mdSecureCall("mdFindCatMembers"); else this.mdSecureCall("mdFindUploads");
	},
	
	mdFindUploads: function () {
		var query = {
			action: 'query',
			list: 'logevents',
			leprop: 'title|type|timestamp',
			letype: 'upload',
			leuser: this.mdTarget,
			lelimit: (window.AjaxMassDeleteInterval ? window.AjaxMassDeleteInterval : 30) * 2,
			ledir: this.mdLedir
		};
		if (this.mdLestart) query.lestart = this.mdLestart;
		$(document).triggerHandler('vFC', ['useruploads', this, query]);
		this.doAPICall(query, 'mdFindUploadsCB');
	},
	
	mdFindUploadsCB: function (result) {
		this.mdListUploadsPending--;
		$(document).triggerHandler('vFC', ['got useruploads', this, result]);
		this.pb.setCurrentTaskDone();
		
		var allFileChanges = result.query.logevents;
		for (var id in allFileChanges) { // loop through all filechanges (array)
			if ('upload' === allFileChanges[id].action) { // This file was initially uploaded by the user.
				this.iUploads[allFileChanges[id].title] = { uploader: [] };
				this.iUploads[allFileChanges[id].title].iId = this.iiUploads;
				this.iUploads[allFileChanges[id].title].time = allFileChanges[id].timestamp;
				this.iiUploads++;
			} else if ('overwrite' === allFileChanges[id].action) {
				this.oUploads[allFileChanges[id].title] = {};
				this.oUploads[allFileChanges[id].title].iId = this.ioUploads;
				this.oUploads[allFileChanges[id].title].time = allFileChanges[id].timestamp;
				this.ioUploads++;
			}
		}
		if (!result['query-continue']) { 
			this.mdNoMoreFiles = true;
		}
		if (this.mdFirstRun) {			// Call nextTask the first time only
			if (!this.mdNoMoreFiles) this.mdLestart = result['query-continue'].logevents.lestart;
			this.mdFirstRun = false;
			this.nextTask();
		} else {
			if (!this.mdNoMoreFiles) this.mdLestart = result['query-continue'].logevents.lestart;
		}
	},
	
	mdFindCatMembers: function () {
		var query = {
			action: 'query',
			list: 'categorymembers',
			cmtitle: this.mdTarget,
			cmtype: 'file',
			cmprop: 'title|type|timestamp',
			cmlimit: (window.AjaxMassDeleteInterval ? window.AjaxMassDeleteInterval : 30) * 2,
			cmcontinue: this.mdLestart,
			cmdir: this.mdCmdir,
			cmsort: this.mdCmsort
		};
		if (this.mdCmstart) query.cmstart = this.mdCmstart;
		$(document).triggerHandler('vFC', ['catmembers', this, query]);
		
		this.doAPICall(query, 'mdFindCatMembersCB');
	},
	
	mdFindCatMembersCB: function (result) {
		this.mdListUploadsPending--;
		$(document).triggerHandler('vFC', ['got catmembers', this, result]);
		this.pb.setCurrentTaskDone();
		
		var allFileChanges = result.query.categorymembers;
		for (var id in allFileChanges) { // loop through all category-members (object)
			this.iUploads[allFileChanges[id].title] = { uploader: [] };
			this.iUploads[allFileChanges[id].title].iId = this.iiUploads;
			this.iUploads[allFileChanges[id].title].time = allFileChanges[id].timestamp;
			this.iiUploads++;
		}
		if (!result['query-continue']) { 
			this.mdNoMoreFiles = true;
		}
		if (!this.mdNoMoreFiles) {
			this.mdLestart = result['query-continue'].categorymembers.cmcontinue || result['query-continue'].categorymembers.cmstart;
			if (result['query-continue'].categorymembers.cmstart) this.mdCmstart = result['query-continue'].categorymembers.cmstart;
		}
		if (this.mdFirstRun) {			// Call nextTask the first time only
			this.mdFirstRun = false;
			this.nextTask();
		}
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
	
	mdParseReason: function(r, cb, obj) {
		var _this = this;
		
		_this.parsertimeout = _this.parsertimeout || 0;
		if (_this.parserjqXHR) _this.parserjqXHR.abort();
		
		var gotJSON = function(d) {
			try {
				cb.apply(obj, [d.parse.text['*'], true]);
			} catch (ex) {}
		};
		
		var maybeParse = function() {
			var query = {
				format: 'json',
				action: 'parse',
				uselang: mw.config.get('wgUserLanguage'),
				redirects: true,
				prop: 'text',
				pst: true,
				text: r
			};
			_this.parserjqXHR = $.getJSON(mw.util.wikiScript('api'), query, function(text) { 
				gotJSON(text);
			});
		};
		clearTimeout(_this.parsertimeout);
		_this.parsertimeout = setTimeout(function() { 
			maybeParse();
		}, 1000);
	},
 
	/**  
	**  Mammoth method to set up and manage the UserInterface (UI)
	**/
	mdGenIGallery: function() {
		$(document).triggerHandler('vFC', ['preparing initial uploads dialog', this]);
	
		this.mdUploadCt = 0;              // Number of pending API queries
		this.mdActualResultCount = 0;     // Doesn't include reverts and deleted media
		this.mdPendingBatchQueries = 0;   // Number of batches currently on query; should be max. 1
		this.mdNumberOfExecs = 0;         // Is Execute called already?
		if (mw.user && mw.user.tokens && mw.user.tokens.get) this.edittoken = mw.user.tokens.get('editToken');
		this.edittoken = (this.edittoken || window['wikilove-edittoken']);

		var o = this;

		/*  The UI  */
		this.mdMinLenRequired = true;     // Is a reason required?

		appendCSS( '.rgallery { background-color:#FFF !important; } '
			+ '.md-collapse-closed { padding-left: 18px; background: url(//bits.wikimedia.org/w/extensions/Vector/modules/images/closed-ltr.png) no-repeat center left } '
			+ '.md-collapse-open { padding-left: 18px; background: url(//bits.wikimedia.org/w/extensions/Vector/modules/images/open.png) no-repeat center left } '
			+ '.md-deleted-uploads { width:99%; display:none; background:#FCC url(//upload.wikimedia.org/wikipedia/commons/d/d6/User-trash.png) no-repeat scroll center; } '
		);

		var dlgButtons = {};
		dlgButtons[this.i18n.submitButtonLabel] = function() {
			if ($('input[name="mdCheckDelete"]:checked').length === 0) {
				var dlg2Btns = {};
				var dlgWidth = Math.min(600, $(window).width() - 250);
				dlg2Btns[o.i18n.mdNoFilesSelected.back] = function() {
					$(this).dialog("close");
				}
				dlg2Btns[o.i18n.mdNoFilesSelected.proceed] = function() {
					$(this).dialog("close");
					o.mdSecureCall("mdExecute");
				}
				$('<div>').append($('<img>', { src: o.mdInfoIcon, height: 128, width: 128, style: 'float:left;' }), $('<div>', { style: 'margin-top: 30px' }).text(o.i18n.mdNoFilesSelected.text))
					.dialog({
						title: o.i18n.mdNoFilesSelected.title,
						buttons: dlg2Btns,
						modal: true,
						position: [($(window).width() - dlgWidth - 250) / 2 + 250, ($(window).height() - 200) / 2 ],
						close: function() {
							$(this).dialog("destroy");
							$(this).remove();
						}
					});
			} else {
				o.mdSecureCall("mdExecute");
			}
		};
		dlgButtons[this.i18n.cancelButtonLabel] = function() {
			$(this).dialog("close");
		};

		var getSelect = function() {
			var sel = '<select size="1" id="AjaxMdType">';
			for (var id in o.mdOpt) {
				sel += '<option value="' + id + '">' + o.i18n.mdOptions[id] + '</option>';
			}
			sel += '</select>';
			return sel;
		};

		this.dlg.dialog({
			modal: false,
			title: this.mdHelpNode +
				' Action:&nbsp;' +
				getSelect() +
				this.i18n.mdDisselectAll + '<input type="checkbox" id="AjaxMdIa" value="1"/> &nbsp;',
			width: $(window).width() - 250,
			height: $(window).height(),
			buttons: dlgButtons,
			resizeStop: function(event, ui) { $('.ui-dialog > .ui-dialog-content').eq(0).scroll(); } // Fire scroll evt on resize for (continue query if btn gets visible)
		});
		this.dlg.dialog( 'option', 'position', 'right' );
		this.dlg.dialog( 'option', 'modal', 'false' );
		$(window).resize(function() {
			o.dlg.dialog('option', 'width', $(window).width() - (o.pb.isHidden() ? 0 : 250));
		});

		$('#AjaxMdContainer').text('');

		if (!this.dlg) return 0;
		
		$('<a>', { href: '#', text: this.i18n.mdCuteSelectLabel }).click(function(e) {
			e.preventDefault();
			o.mdCuteSelectDlg.dialog("open");
		}).appendTo( $('#AjaxMdIa').parent() );

		$('#AjaxMdContainer').append(
			(this.mdModeCat ? 'Files in -' : 'Initally uploaded files by -')
			+ '<a href="' + mw.config.get('wgServer') + (this.mdModeCat ? mw.config.get('wgArticlePath').replace("$1", this.mdTarget) : (mw.config.get('wgArticlePath').replace("$1", o.mdUserTalkPrefix) + this.mdTarget)) + '" target="_blank">' + this.mdTarget +'</a>-. '
			+ '<label id="mdTaskForUser" for="mdDeleteReason">' + this.i18n.mdInsertDeleteReasen + '</label>: <textarea id="mdDeleteReason" style="width: 99%; height: 40px;"></textarea>'
			+ '<br/><label for="mdEditSummary">' + this.i18n.mdInsertEditSummary + '</label>: <input type="text" id="mdEditSummary" style="width: 70%;" maxlength="100"/>'
			+ '<span id="mdReplacePermissionWrapper"><input type="checkbox" id="mdReplacePermission"/><label for="mdReplacePermission"> ' + this.i18n.mdReplacePermissionText + '</label></span>')
			.append('<table width="100%"><tr id="mdRequestPageTitle"><td><label for="mdDeleteHeading">' + this.i18n.mdInsertDeleteHeading + ': </label></td>'
				+ '<td width="70%"><input type="text" id="mdDeleteHeading" style="width: 99%;" value="'
				+ (this.mdModeCat ? 'Files in [[:' + this.mdTarget + ']] ' : ('Files uploaded by [[' + this.mdUserPrefix + this.mdTarget + '|' + this.mdTarget + ']] '
				+ '([[' + this.mdUserTalkPrefix + this.mdTarget + '|talk]] &#x00B7; [[' + this.mdContribPrefix + this.mdTarget + '|contribs]])')) + '"/></td></tr>'
				+ '<tr id="mdTalkNoteNode"><td><label for="mdTalkNote">' + this.i18n.mdInsertTalkNote + ': </label></td>'
				+ '<td width="70%"><input type="text" id="mdTalkNote" style="width: 99%;" value="'
				+	(window.AjaxMassDeleteUserNote ? window.AjaxMassDeleteUserNote : 'Yours sincerely') + '"/></td></tr>'
				+ '<tr id="mdReplaceTextNode"><td><label for="mdRRegEx">RegExp?</label><input type="checkbox" id="mdRRegEx"/><br/>'
				+ '<label for="mdReplaceText">' + this.i18n.mdCustomReplaceText + ': </label></td>'
				+ '<td width="70%"><textarea rows="3" cols="50" id="mdReplaceText"></textarea></td></tr></table>')
			.append($('<a>', { text: this.i18n.mdDelContribsButtonLabel, href: '#', 'class': 'md-collapse-closed' })
				.click(function(e){
					e.preventDefault();
					$(this).next().slideToggle();
					if ($(this).hasClass('md-collapse-closed')) {
						$(this).addClass('md-collapse-open');
						$(this).removeClass('md-collapse-closed');
					} else {
						$(this).addClass('md-collapse-closed');
						$(this).removeClass('md-collapse-open');
					}
				})
			)
			.append($('<ul>', { 
				id: 'AjaxDeletedUploads', 
				'class': 'md-deleted-uploads'
			}))
			.append('<div id="AjaxMdNotReady">Please wait while enumerating uploads ...</div><ul id="AjaxMdUlContainer" class="gallery rgallery"></ul>');
 
		var $submitButton = $('.ui-dialog-buttonpane button:first'),
			$mdDeleteReason = $('#mdDeleteReason');

		$mdDeleteReason.keyup( function (event) {
			if ( ($(this).val().length < 6 ) && o.mdMinLenRequired ) {
				$submitButton.addClass('ui-state-disabled');
				o.pb.setHelp2(o.i18n.mdSpecifyReason);
			} else {
				$submitButton.removeClass('ui-state-disabled');
				o.pb.setHelp2($(this).val());
				o.mdParseReason($(this).val(), o.pb.setHelp2, o.pb);
			}
		});
		// Binding enter-key event. -0 ensures number
		$('#mdDeleteHeading').keyup( function (event) { if (13 === (event.keyCode - 0) && ($mdDeleteReason.val().length > 5 || !o.mdMinLenRequired)) $submitButton.click(); });
		$('#mdTalkNote').keyup( function (event) { if (13 === (event.keyCode - 0) && ($mdDeleteReason.val().length > 5 || !o.mdMinLenRequired)) $submitButton.click(); });
		$('#mdEditSummary').keyup( function (event) { if (13 === (event.keyCode - 0) && ($mdDeleteReason.val().length > 5 || !o.mdMinLenRequired)) $submitButton.click(); });
		
		var timoutID = 0;
		var updateSelectedCount = function () {
			o.pb.setHelp3(o.i18n.mdSelectedCount.replace('%C%', $('input[name="mdCheckDelete"]:checked').length));
		}
		updateSelectedCount();
		$('#AjaxMdIa').change( function (event) {
			var tmpChecked = this.checked;
			$('input[name="mdCheckDelete"]').each(function(index) {
				this.checked = tmpChecked;
			});
			clearTimeout(timoutID);
			timoutID = setTimeout(updateSelectedCount, 200);
		});
		$('input[name="mdCheckDelete"]').die( 'change' );
		$('input[name="mdCheckDelete"]').live( 'change', function (e) {
			clearTimeout(timoutID);
			timoutID = setTimeout(updateSelectedCount, 200);
		});
		
		this.$AjaxDeletedUploads = $('#AjaxDeletedUploads'); // For later usage to speed up gallery-box creating
		this.$AjaxMdUlContainer = $('#AjaxMdUlContainer');
		this.$AjaxMdNotReady = $('#AjaxMdNotReady');
		//
		// Event handler for the selection box (task to perform)
		//
		var $AjaxMdType = $('#AjaxMdType');
		$AjaxMdType.change( function (event) {
			var optConfig = o.mdOpt[$(this).val()];
			if (!optConfig) return;
			if ('del' == $(this).val()) { 
				$('#mdRequestPageTitle').show(); 
			} else { 
				$('#mdRequestPageTitle').hide(); 
			}

			// minLenReq
			if (optConfig[0]) {
				o.mdMinLenRequired = true;
				$mdDeleteReason.keyup();
			} else {
				o.mdMinLenRequired = false;
				$mdDeleteReason.keyup();
			}
			// acceptReason
			if (optConfig[1]) {
				$('#mdTaskForUser').text(o.i18n[optConfig[1]]);
				$('#mdTaskForUser').show();
				$mdDeleteReason.show();
			} else {
				$('#mdTaskForUser').hide();
				$mdDeleteReason.hide();
			}
			// prefill
			if (optConfig[2]) {
				if (!$mdDeleteReason.val()) $mdDeleteReason.val(o[optConfig[2]]);
				// For some reason RegExp.$1 will not work in the following line
				if ( /(\d{16})/g.test($mdDeleteReason.val()) ) $mdDeleteReason.val( o[optConfig[2]].replace(/\%ID/g, /(\d{16})/g.exec($mdDeleteReason.val())[0]) ); 
				if ( o.mdURLPattern.test($mdDeleteReason.val()) ) $mdDeleteReason.val( o.mdOTRSTicketPrefill.replace(/\%URL/g, $mdDeleteReason.val()) );
			}
			// confirmation
			if (optConfig[3]) {
				o.pb.setHelp(o.i18n[optConfig[3]]);
			} else {
				o.pb.setHelp2('');
				o.pb.setHelp('');
			}
			// talk note
			if (optConfig[4]) {
				$('#mdTalkNoteNode').show();
			} else {
				$('#mdTalkNoteNode').hide();
			}
			// replace node
			if (optConfig[5]) {
				$('#mdReplaceTextNode').show();
			} else {
				$('#mdReplaceTextNode').hide();
			}
			// OTRS replace node
			if (optConfig[6]) {
				$('#mdReplacePermissionWrapper').show();
			} else {
				$('#mdReplacePermissionWrapper').hide();
			}
		});
		$AjaxMdType.val(this.mdOptDefault);
		$AjaxMdType.change();
		$AjaxMdType.bind('click mousedown mouseup', function(e) { e.stopPropagation() });
		$('#AjaxMdIa').bind('click mousedown mouseup', function(e) { e.stopPropagation() });
		$mdDeleteReason.keyup();
 
 
 
		// cute-selection dialog
		var dlgSelectButtons = {};
		dlgSelectButtons[this.i18n.mdCuteSelect.button] = function () { 
			var curUpld = '';
			var $curThmb = '';
			var newVal = $('#chkAjaxMdSelect')[0].checked;
			var v_txtAjaxMdSelectCat = $.trim($('#txtAjaxMdSelectCat').val().replace(/^Category\:/, ""));
			var v_txtAjaxMdSelectTitle = $.trim($('#txtAjaxMdSelectTitle').val().replace(/^File\:/, ""));
			if ( '' != v_txtAjaxMdSelectTitle ) v_txtAjaxMdSelectTitle = new RegExp(v_txtAjaxMdSelectTitle, '');
			var v_txtAjaxMdSelectSize = $('#txtAjaxMdSelectSize').val();
			var vl_selAjaxMdSelectSize = ( $('#selAjaxMdSelectSize').val() == 'l' );
			var v_txtAjaxMdSelectDate0 = $('#txtAjaxMdSelectDate0').val();
			var dateFromString = function(st) {
				try {
					/(\d{4})-(\d\d?)-(\d\d?)(?: (\d\d?):(\d\d?):(\d\d?))?/.exec(st);
					return RegExp.$4 ? (new Date(RegExp.$1, (RegExp.$2 - 1), RegExp.$3, RegExp.$4, RegExp.$5, RegExp.$6)) : (new Date(RegExp.$1, (RegExp.$2 - 1), RegExp.$3));
				} catch (ex) {
					return 0;
				}
			}
			if ( '' != v_txtAjaxMdSelectDate0 ) {
				v_txtAjaxMdSelectDate0 = dateFromString(v_txtAjaxMdSelectDate0);
				if (!v_txtAjaxMdSelectDate0) { alert('Invalid start-date'); return; }
			}
			var v_txtAjaxMdSelectDate1 = $('#txtAjaxMdSelectDate1').val();
			if ( '' != v_txtAjaxMdSelectDate1 ) {
				v_txtAjaxMdSelectDate1 = dateFromString(v_txtAjaxMdSelectDate1);
				if (!v_txtAjaxMdSelectDate1) { alert('Invalid end-date'); return; }
			}
 
			for (var upload in o.iUploads) {
				try {
					var isMatch = {};
					curUpld = o.iUploads[upload];
					// yyyy    mm     dd
					/(\d{4})-(\d\d)-(\d\d)T(?:(\d\d):(\d\d):(\d\d))Z/.exec(curUpld.time);
					curUpldDate = new Date(RegExp.$1, (RegExp.$2 - 1), RegExp.$3, RegExp.$4, RegExp.$5, RegExp.$6);
					$curThmb = $('input[value="' + upload.replace('"', '\\"') + '"]');
 
					if ( '' != v_txtAjaxMdSelectCat ) {
						for (var ct in curUpld.categories) {
							if (curUpld.categories[ct].title.replace("Category:", "") == v_txtAjaxMdSelectCat) { 
								isMatch.cat = true;
							}
						}
					} else {isMatch.cat = true;}
 
					if ( 'object' == typeof(v_txtAjaxMdSelectTitle) ) {
						if ( v_txtAjaxMdSelectTitle.test(upload.replace("File:", "")) ) {
							isMatch.title = true;
						}
					} else {isMatch.title = true;}
 
					if ( '' != v_txtAjaxMdSelectSize ) {
						if ( (vl_selAjaxMdSelectSize && (curUpld.size < v_txtAjaxMdSelectSize)) || (!vl_selAjaxMdSelectSize && (curUpld.size > v_txtAjaxMdSelectSize)) ) isMatch.size = true;
					} else {isMatch.size = true;}
 
					if ( 'object' == typeof(v_txtAjaxMdSelectDate0) ) { // between -> start date -> must be in the past
						if (curUpldDate >= v_txtAjaxMdSelectDate0) isMatch.date0 = true;
					} else {isMatch.date0 = true;} 
 
					if ( 'object' == typeof(v_txtAjaxMdSelectDate1) ) { // and -> end date -> must be in the future
						if (curUpldDate <= v_txtAjaxMdSelectDate1) isMatch.date1 = true;
					} else {isMatch.date1 = true;}
 
					if ( isMatch.cat && isMatch.title && isMatch.size && isMatch.date0 && isMatch.date1 && (1 == $curThmb.length) ) $curThmb[0].checked = newVal;
				} catch (ex) { if ('undefined' !== typeof(console)) console.log('Error: ' + err); }
			}
			updateSelectedCount();
		};
 
		appendCSS('.numbersOnly { text-align:right; }');
 
		var $AjaxMdCuteSelect = $('<div>', { id: 'AjaxMdCuteSelect' } )
		$AjaxMdCuteSelect
			.append(this.i18n.mdCuteSelect.intro)
			.append($('<table>').append(
				$('<tr>').append(
					$('<td>').append($('<label>', { 'for': 'chkAjaxMdSelect', text: this.i18n.mdCuteSelect.select })),
					$('<td>').append($('<input>', { type: 'checkbox', id: 'chkAjaxMdSelect', 'value': 1, 'checked': '' }))),
				$('<tr>').append(
					$('<td>').append($('<label>', { 'for': 'txtAjaxMdSelectCat', text: this.i18n.mdCuteSelect.inCat })),
					$('<td>').append($('<input>', { type: 'text', id: 'txtAjaxMdSelectCat', 'size': 50 }), this.i18n.mdCuteSelect.and)),
				$('<tr>').append(
					$('<td>').append($('<label>', { 'for': 'txtAjaxMdSelectTitle', html: this.i18n.mdCuteSelect.title + ' <abbr title="Regular Expression. Example: Tower.+ will select Towers or TowersInSpain but not Tower">(RegExpr)</abbr>' })),
					$('<td>').append($('<input>', { type: 'text', id: 'txtAjaxMdSelectTitle', 'size': 50, placeholder: this.i18n.mdCuteSelect.titleplaceholder }), this.i18n.mdCuteSelect.and)),
				$('<tr>').append(
					$('<td>').append( this.i18n.mdCuteSelect.size + ' <select size="1" id="selAjaxMdSelectSize"><option value="l">&lt</option><option value="g">&gt</option></select>' ),						
					$('<td>').append($('<input>', { type: 'text', 'class': 'numbersOnly', id: 'txtAjaxMdSelectSize', 'size': 15 }),
						$('<label>', { 'for': 'txtAjaxMdSelectSize', text: 'KibiBytes (1024 Bytes)' }))),
				$('<tr>').append(
					$('<td>').append(this.i18n.mdCuteSelect.date),
					$('<td>').append(
						$('<label>', { 'for': 'txtAjaxMdSelectDate0', text: this.i18n.mdCuteSelect.between }),
						$('<input>', { type: 'text', id: 'txtAjaxMdSelectDate0', 'size': 50, 'class': 'dateOnly', 'size': 19, maxlength: 19, placeholder: this.i18n.mdCuteSelect.dateplaceholder })
							.datepicker( {
								changeYear: true,
								changeMonth: true,
								'dateFormat': 'yy-mm-dd 12:00:00',
								showWeek: true,
								firstDay: 1
							} )
							.tipsy({
								trigger: 'focus',
								gravity: 's',
								html: true,
								title: function() {
									return o.i18n.optStartAtHowTo;
							} }),
						$('<label>', { 'for': 'txtAjaxMdSelectDate1', text: this.i18n.mdCuteSelect.and }),
						$('<input>', { type: 'text', id: 'txtAjaxMdSelectDate1', 'size': 50, 'class': 'dateOnly', 'size': 19, maxlength: 19, placeholder: this.i18n.mdCuteSelect.dateplaceholder })
							.datepicker( {
								changeYear: true,
								changeMonth: true,
								'dateFormat': 'yy-mm-dd 12:00:00',
								showWeek: true,
								firstDay: 1
							} )
							.tipsy({
								trigger: 'focus',
								gravity: 's',
								html: true,
								title: function() {
									return o.i18n.optStartAtHowTo;
							} })
					))
			)
			);
		
		var pbWidth = (this.pb.isHidden() ? 0 : 250)
		var dlgWidth = Math.min(600, $(window).width() - pbWidth);
		this.mdCuteSelectDlg = $('<div></div>').append($AjaxMdCuteSelect).dialog({
			modal: true,
			closeOnEscape: true,
			position: [($(window).width() - dlgWidth - pbWidth) / 2 + pbWidth, ($(window).height() - 250) / 2 ],
			title: 'Cute-Selection: Specify the options, please',
			height: 'auto',
			width: dlgWidth,
			buttons: dlgSelectButtons,
			show: 'slide',
			hide: 'fade',
			autoOpen: false
		});
		$('.numbersOnly').keyup(function () { 
			this.value = this.value.replace(/[^0-9]/g,'');
		});
		$('.dateOnly').keyup(function () { 
			this.value = this.value.replace(/[^0-9\-: ]/g,'');
		});
		// End of cute-selection dialog
 
 
 
 
		var $queryMore = $('<div>', {
			id: "mdQueryMore",
			align: "center"
		});
		$queryMore.append('<button id="mdQueryMoreBtn" class="ui-button ui-widget ui-state-default ui-corner-all ui-button-text-only ui-state-disabled" type="button" role="button" aria-disabled="false"><span class="ui-button-text">' + this.i18n.mdMore + '&gt;&gt;</span></button>');
		$('#AjaxMdContainer').append($queryMore).append('<div style="height:100px">&nbsp;</div>');
		$('#mdQueryMoreBtn').click( function (event) { o.mdQueryMore(); });
		/* End of UI */
		
		$(document).triggerHandler('vFC', ['initial uploads dialog', this, this.dlg]);
 
		this.iCurrentIId = -1;     // Last queried file to continue obtaining detail-info
		this.mdSecureCall("mdSendNextQueries");
	},
 
	/**  
	**  Send the next batch of queries. Called by mdGenIGallery (mammoth method above) and mdQueryMore (Query on demand)
	**/
	mdSendNextQueries: function () {
		$(document).triggerHandler('vFC', ['querying detail-info', this]);
		this.pb.setTaskState( 'datails', 'md-doing' );
		
		if (0 === this.mdPendingBatchQueries)  {
			this.mdPendingBatchQueries++;
			var collectedFiles = [];
			var collectedCount = 0;
			var _this = this;
			
			var sendReq = function (files) {
				if (0 === files.length) return;
				var query = {
					action: 'query',
					prop: 'imageinfo|info|revisions|categories',
					rvprop: 'timestamp|content',
					intoken: ('undefined' == typeof(_this.edittoken)) ? 'edit' : '',
					iiprop: 'url|size',
					iiurlwidth: 120,
					iiurlheight: 120,
					titles: files.join('|'),
					clprop: 'hidden',
					cllimit: 500
				};
				if (_this.mdModeCat) {
					query.iiprop += '|user|sha1';
					query.iilimit = 500;
				}
				
				$(document).triggerHandler('vFC', ['detail-info', _this, query]);
				
				_this.mdUploadCt++;
				_this.doAPICall(query, 'mdQueriedFile'); // Dont use task queue because this is a loop
			};

			for (var upload in this.iUploads) {
				if ((this.iCurrentIId + 1) > this.iUploads[upload].iId) continue;
				collectedFiles.push(upload);
				collectedCount++;
				if (collectedCount > 9) {  // only 10 at once
					collectedCount = 0;
					sendReq(collectedFiles);
					collectedFiles = [];
				}
				this.iCurrentIId = this.iUploads[upload].iId;
				if ((window.AjaxMassDeleteInterval ? window.AjaxMassDeleteInterval : 30) == this.mdUploadCt) {
					break;
				}
			}
			sendReq(collectedFiles);
		}
		
		if (0 === this.mdUploadCt) this.nextTask();
		$('#mdQueryMoreBtn').addClass('ui-state-disabled');
	},
	
	/** Helper function: Creating a gallery box **/
	mdCreateGalleryBox: function (img, txt, height) {
		$ih = $('<div>', { style: 'margin:15px auto;', name: 'mdImageHere' } );
		$th = $('<div>', { 'class': 'gallerytext', name: 'mdTextHere' });
		var $galleryBox = $('<li>', { style: 'width: 155px', 'class': 'gallerybox' }).append($('<div>', { style: 'width: 155px' }).append($('<div>', { style: 'width: 150px;', 'class': 'thumb'}).css('height', height).append($ih)).append($th));

		for (var id in img) {
			$ih.append(img[id]);
		}
		for (var id in txt) {
			$th.append(txt[id]);
		}
		return $galleryBox;
	},
	
	/** Helper function: Creating a link to the log of a deleted item **/
	mdCreateDelUploadItem: function (img) {
		return $('<li>').append($('<a>', { href: mw.config.get('wgServer') + mw.config.get('wgScript') + '?title=Special:Log&page=' + img, target: '_blank' }).append(mw.html.escape(img)))
			.append($('<a>', { href: mw.config.get('wgServer') + mw.config.get('wgArticlePath').replace("$1", 'Special:Undelete/' + img), target: '_blank' }).append(" (undel)"));
	},
	
	/**  Helper function: Extracs categories from the list of those.  **/
	mdExtractTags: function (mdCats) {
		var mdTags = '';
		if ('object' != typeof(mdCats)) return mdTags;
		mdTags += '<i>';
 
		// First the licenses (hidden):
		catloop: // Using a label for this loop
		for (var ct in mdCats) {
			if ( "string" == typeof (mdCats[ct].hidden) ) {
				var thiscat = mdCats[ct].title;
				for (var id in this.mdLicenseRecognization) {
					if ( this.mdLicenseRecognization[id][0].test(thiscat) ) {
						if ('' != this.mdLicenseRecognization[id][1]) mdTags += '<abbr title="' + thiscat.replace('Category:', '') + '">' + this.mdLicenseRecognization[id][1] + '</abbr> ';
						continue catloop;
					}
				}
				// This will be only executed if there was no match
				mdTags += '<abbr title="' + thiscat.replace('Category:', '') + '">U</abbr> '
			}
		}
		mdTags += '</i> <span style="background-color:#FC9;">';
 
		// Then, deletion tags:
		catloop2: // Using another label for this loop
		for (var ct in mdCats) {
			var thiscat = mdCats[ct].title;
			for (var id in this.mdTagRecognization) {
				thistag = this.mdTagRecognization[id];
				if ( thistag[0].test(thiscat) ) {
					if ('' != thistag[1]) mdTags += (thistag[2] ? '<span style="background-color:#' + thistag[2] + ';">' : '') + '<abbr title="' + thiscat.replace('Category:', '') + '">' + this.mdTagRecognization[id][1] + '</abbr>' + (thistag[2] ? '</span>' : '');
					continue catloop2;
				}
			}
		}
		mdTags+= '</span>';
 
		return mdTags;
	},
 
	/**  
	**  API-Call-back method to eval the queried file and add a thumb
	**/
	mdQueriedFile: function (result) {
		this.mdUploadCt--;
		
		$(document).triggerHandler('vFC', ['got detail-info', this, result]);
		
		if ('MD-Error' == this.context || 'MD-postDlg' == this.context) return; // don't try to add something if there was an error.
		var pages = result.query.pages;
		for (var id in pages) {
			var pg = pages[id],
				dirtyTitle = pg.title,
				cleanTitle = mw.html.escape(dirtyTitle),
				uItem = this.iUploads[dirtyTitle],
				i, ii,
				seenHash = {};
			
			this.$AjaxMdNotReady.contents().eq(0).replaceWith('Querying detailed information: ' + (this.mdUploadCt) + 
			' uploads left on this batch of queries. ' + (this.iiUploads) + ' cached uploads current image: ' + dirtyTitle); 

			if ('undefined' == typeof(pg.imageinfo)) { try { 
				this.$AjaxDeletedUploads.append(this.mdSecureCall("mdCreateDelUploadItem", dirtyTitle));
				} catch (e) {} continue; 
			} // The file has been deleted

			/*  Adding a thumbnail to the dialog  */
			this.mdBusy = true;
			this.mdActualResultCount++;
			
			if (this.mdModeCat) {
				iiloop:
				for (i = pg.imageinfo.length - 1; i >= 0; i--) {
					ii = pg.imageinfo[i];
					if (ii.sha1) {
						if (seenHash[ii.sha1]) {
							// do nothing
						} else {
							seenHash[ii.sha1] = true;
							// Admins can hide usernames. Make sure not pushing undefined.
							if (ii.user) uItem.uploader.push(ii.user);
						}
					}
				}
			}
			
			var $galleryBox = this.mdCreateGalleryBox(
				[ $('<a>', { href: pg.imageinfo[0].descriptionurl, target: '_blank', 'class': 'image' })
					.append( $('<img>', { src: pg.imageinfo[0].thumburl, width: pg.imageinfo[0].thumbwidth, height: pg.imageinfo[0].thumbheight, alt: dirtyTitle }) ) ],
				[ ('<i>' + uItem.iId + ': </i>'),
				$('<input>', { type: 'checkbox', name: 'mdCheckDelete', value: dirtyTitle } ),
				(this.mdSecureCall("mdExtractTags", pg.categories) + '<br/>'),
				(cleanTitle  + '<br/>'),
				(uItem.time.replace(/[T|Z]/g, " ") +  '<br/>'),
				((pg.imageinfo[0].size >> 10) + '&nbsp;<abbr title="1 KibiByte= 1024 Bytes">KiB</abbr>') ],
				150
			);
			this.gbs[dirtyTitle] = $galleryBox;
			this.mdBusy = false;
 
			if ( pg.edittoken ) { // prevent assigning an empty edit token
				this.edittoken = pg.edittoken; 
			} 
			uItem.content = pg.revisions[0]['*']; // save the content for OTRS usage
			uItem.categories = pg.categories;     // save cats for selector
			uItem.size = pg.imageinfo[0].size / 1024; // for selector
		}
		if (0 === this.mdUploadCt) this.nextTask();
	},
 
	/**  
	**  Called when a batch of files has been queried  
	**/
	mdQueryFileDone: function () {
		// Append all queried files to the screen-container
		for (var id in this.iUploads) {
			var uItem = this.iUploads[id];
			if (!uItem.gbInUse) {
				uItem.gbInUse = true;
				var $galleryBox = this.gbs[id];
				if ($galleryBox) {
					this.$AjaxMdUlContainer.append($galleryBox);
				}
			}
		}

		this.mdBusy = false;
		this.mdPendingBatchQueries--;
		$('#AjaxMdNotReady').hide();
		this.pb.setCurrentTaskDone();
		
		var o = this;
		$(document).triggerHandler('vFC', ['detail-info processed', o]);
 
		if ( (o.iiUploads > (o.iCurrentIId + 1))  || !o.mdNoMoreFiles) {
			var $mdQueryMore = $('#mdQueryMoreBtn');
			$mdQueryMore.removeClass('ui-state-disabled');
			$('.ui-dialog > .ui-dialog-content').bind("scroll", function() {
				if ( $mdQueryMore.visible().length > 0 ) {
					o.mdSecureCall("mdQueryMore");
				}
			});
		}
		if (!o.mdNoMoreFiles) { // silently run the next upload-list-query in background
			o.mdSecureCall("mdCreateList");
		}
 
		document.body.style.cursor = 'auto';
		if (0 == o.mdActualResultCount) { // If there are no thumbs on the dialog, continue
			if ('MD-RevertImage' != o.context) { // Don't shedule further tasks if called from revert part
				if ("MD" == o.context) alert(o.i18n.mdNoResult.replace("%TARGET%", o.mdTarget));
				o.mdDlgThumbDlgClose(); // remove the dialog
				if (!o.mdModeCat) o.addTask('mdRvGenOGallery');
				o.addTask('mdExecuteReady');
			}
			o.nextTask();
		}
	},
 
	/**  
	**  Called when by scroll-event when the button more becomes visible (mdQueryFileDone binds the evt) or onClick on the button
	**/
	mdQueryMore: function () {
		if (0 == this.mdPendingBatchQueries) {
			this.mdUploadCt = 0;
			this.addTask('mdQueryFileDone');
			this.mdSecureCall("mdSendNextQueries");
		}
	},
 
	/**  
	**  Reads user's input to the thumbnail-dialog; Called when user clicked next
	**/
	mdExecute: function () {
		var o = this;
		o.mdTaskToPerform = $('#AjaxMdType').val();
		var cmdConfig = o.mdCommands[o.mdTaskToPerform];
		
		if (0 !== o.mdNumberOfExecs || 0 !== o.mdListUploadsPending) return; // refuse futher exec request
		if (0 !== o.mdPendingBatchQueries) { // call me later
			setTimeout(function () { 
				o.mdExecute() 
			}, 1000);
			return;
		}
		o.mdNumberOfExecs++;

		$(document).triggerHandler('vFC', ['processing user\'s input', o]);
		o.pb.addTask('inputcheck');
		o.pb.setTaskState('inputcheck', 'md-doing');
		o.pb.setHelp(this.i18n.mdPleaseWait);
		o.pb.setHelp2('');
		o.pb.setHelp3('');

		var filesToTag = 0;
 
		$('input[name="mdCheckDelete"]').each(function(index) {
			if (this.checked) {
				o.iUploads[this.value].iId = -2; // Indicate the action will be performed on this file
				filesToTag++;
				var $gb = o.gbs[this.value];
				if ($gb) {
					$gb.find('img').attr({
						'src': o.mdDoingIcon, 
						'width': 120, 
						'height': 120
					}).css('height', 120).css('width', 120);
				}
			}
		});
 
		if (0 === filesToTag) {
			if ( ('other' != $('#AjaxMdType').val() ) && ('otrs' != $('#AjaxMdType').val()) && (0 < o.ioUploads) ) {
				o.addTask('mdRvGenOGallery');
			}
			o.addTask('mdExecuteReady');
			o.dlg.dialog('close');
			o.nextTask();
			return;
		} else {
			o.mdInsertedTag = true;
		}
 
		o.mdDeleteHeading = o.cleanReason($('#mdDeleteHeading').val());
 
		if ($('#mdDeleteReason').val()) {
			o.reason = cmdConfig.cleanReason ? o.cleanReason($('#mdDeleteReason').val()) : $('#mdDeleteReason').val();
		} else {
			o.reason = '';
		}
		o.mdReplaceText = $('#mdReplaceText').val();
		o.mdMatchRegExp = $('#mdRRegEx')[0].checked;
		o.mdReplacePermission = $('#mdReplacePermission')[0].checked;
		o.mdTalkNote = $('#mdTalkNote').val();
		o.mdAddEditSummary = $('#mdEditSummary').val();
 
		o.addTask('mdExecuteContinue');
		o.nextTask();
	},
	
	formatDate: function (fmt, date) {
		var pad0 = function (s) {
				s = "" + s;
				return (s.length > 1 ? s : "0" + s);
			}; // zero-pad to two digits
		if (!date) date = this.startDate;
		fmt = fmt.replace(/YYYY/g, date.getUTCFullYear());
		fmt = fmt.replace(/MM/g, pad0(date.getUTCMonth() + 1));
		fmt = fmt.replace(/DD/g, pad0(date.getUTCDate()));
		fmt = fmt.replace(/MON/g, mw.config.get('wgMonthNames')[date.getUTCMonth()+1]);
		fmt = fmt.replace(/DAY/g, date.getUTCDate());
		return fmt;
	},

	/**  
	**  Preparing to perform our edits
	**/
	mdExecuteContinue: function () {
		$(document).triggerHandler('vFC', ['generating page messages and summaries', this]);
		this.startDate = new Date();
 
		// set up some page names we'll need later
		var mdRequestPage = (this.mdModeCat ? 'Files in ' : 'Files uploaded by ') + this.mdTarget;
		this.requestPage =  this.mdRequestPagePrefix + mdRequestPage;
		this.dailyLogPage = this.mdRequestPagePrefix + this.formatDate("YYYY/MM/DD");
 
		var uploadCt = 0;

		var optConfig = this.mdOpt[this.mdTaskToPerform];
		var cmdConfig = this.mdCommands[this.mdTaskToPerform];
		this.tag = optConfig[7].replace('%REASON%', this.reason).replace('%SUBPAGE%', mdRequestPage).replace('%D%', this.formatDate('year=YYYY|month=MON|day=DAY'));
		
		this.img_summary = (this.mdAddEditSummary ? (this.mdAddEditSummary + ' - ') : '') + optConfig[8].replace('%pattern%', this.reason).replace('%replace%', this.mdReplaceText) + ' Using [[' + this.mdSelfPath + '|VisualFileChange.js]].';
		var r = this.img_summary.match(/\%(.{1,9})\%/);
		if (r && r[1]) this.img_summary = this.img_summary.replace('%' + r[1] + '%', this.mdOptText[r[1]]);
		
		this.uploaders = {};
		// Reverse-mapping: files-uploader --- > uploader-files
		for (var upload in this.iUploads) {
			var uItem = this.iUploads[upload];
			if ( -2 === uItem.iId )  {
				if (this.mdModeCat) {
					// Remember: u is just an index of an array
					for (var u in uItem.uploader) {
						var ul = uItem.uploader[u];
						if (!this.uploaders[ul]) {
							this.uploaders[ul] = { uploads: {} };
						}
						this.uploaders[ul].uploads[upload] = true;
					}
				} else {
					if (!this.uploaders[this.mdTarget]) {
						this.uploaders[this.mdTarget] = { uploads: {} };
					}
					this.uploaders[this.mdTarget].uploads[upload] = true;
				}
			}
		}
		
		for (var uploader in this.uploaders) {
			var uploaderItem = this.uploaders[uploader];
			uploadCt = 0;
			
			uploaderItem.talk_tag = optConfig[9].replace('%REQUESTPAGE%', mdRequestPage);
			uploaderItem.talk_summary = optConfig[10].replace('%FULLREQUESTPAGE%', this.requestPage);
			if (/\%FILE\%/.test(uploaderItem.talk_tag)) {
				for (var userUpload in uploaderItem.uploads) {
					if ( 0 === uploadCt ) {
						uploaderItem.talk_tag = uploaderItem.talk_tag.replace('%FILE%', userUpload);
						uploaderItem.talk_summary = uploaderItem.talk_summary.replace('%FILE%', userUpload);
					} else if ( 1 === uploadCt ) {
						uploaderItem.talk_tag += '\nAnd also: \n* [[:' + userUpload + ']] '; 
					} else {
						uploaderItem.talk_tag += '\n* [[:' + userUpload + ']] '; 
					}
					uploadCt++;
				}
			}
			if (optConfig[4]) {
				if ( this.mdTalkNote ) uploaderItem.talk_tag += '\n\n' + this.mdTalkNote;
			}
		}
		
		// Prepare for createRequestSubpage
		this.requestPageContents = this.reason;
		for (var upload in this.iUploads) {
			if ( -2 == this.iUploads[upload].iId )  { this.requestPageContents += '\n* [[:' + upload + ']]'; }
		}
				
		// Task sheduling
		for (var id in cmdConfig.tasks) {
			var task = cmdConfig.tasks[id];
			if ('mdRvGenOGallery' === task && 0 === this.ioUploads) continue;
			this.addTask(task);
			if (task in this.i18n.task) this.pb.addTask(task);
		}
		this.addTask('mdExecuteReady');
		this.nextTask();
	},
	
	mdPrependText: function () {
		this.pb.setCurrentTaskDone();
		this.pb.setTaskState('mdPrependText', 'md-doing');
		this.tag = this.reason;
		this.nextTask();
	},
	
	mdAppendText: function () {
		this.pb.setCurrentTaskDone();
		this.pb.setTaskState('mdAppendText', 'md-doing');
		this.tag = this.reason;
		this.nextTask();
	},
 
	mdPrependTemplate: function () {
		this.pb.setCurrentTaskDone();
		this.pb.setTaskState('mdPrependTemplate', 'md-doing');
		this.mdSecureCall('mdAddTemplate', 'prependtext');
	},
	
	mdAppendTemplate: function () {
		this.pb.setCurrentTaskDone();
		this.pb.setTaskState('mdAppendTemplate', 'md-doing');
		this.mdSecureCall('mdAddTemplate', 'appendtext');
	},
	
	mdAddTemplate: function (edittype) {
		$(document).triggerHandler('vFC', ['adding templates to filepages', this]);
		this.mdUploadCt = 0;
 
		for (var upload in this.iUploads) {
			if (-2 != this.iUploads[upload].iId) continue;
 
			var page = [];
			page.title = upload;
			page.text = this.tag;
			page.editType = edittype;
			if (window.AjaxDeleteWatchFile) page.watchlist = 'watch';
 
			this.mdUploadCt++;
			this.mdSavePage(page, this.img_summary, 'mdTemplateAdded', 'mdTemplateAdded');
		}
		if (0 === this.mdUploadCt) this.nextTask();
	},
 
	mdInsertPermission: function () {
		$(document).triggerHandler('vFC', ['inserting permission OR custom replace', this]);
		this.pb.setCurrentTaskDone();
		this.pb.setTaskState('mdInsertPermission', 'md-doing');
		this.mdUploadCt = 0;
 
		for (var upload in this.iUploads) {
			if (-2 !== this.iUploads[upload].iId) continue;
 
			var page = {};
			page.title = upload;
			page.text = this.iUploads[upload].content;
			page.watchlist = 'nochange';
 
			if ('otrs' === this.mdTaskToPerform) { // drop out other permission templates
				var iCt = 0;
				mdTagLoop:
				for (var id in this.mdTagRemoval) {
					iCt++;
					if (1 === iCt) continue mdTagLoop; // Skip first pattern
					page.text = page.text.replace(this.mdTagRemoval[id][0], '');
				}
			}
			if ('c_replace' !== this.mdTaskToPerform) {
				page.text = this.mdSecureCall( "mdInsertOTRS", page.text, this.reason );
			} else {
				if ('' === this.reason) continue;
				var m, tmpRegEx = this.reason;
				if (this.mdMatchRegExp) {
					m = tmpRegEx.match(/\/(.+)\/(.*)/);
					if (m && m[0] && m[1]) tmpRegEx = new RegExp(m[1], m[2]);
				}
				page.text = page.text.replace(tmpRegEx, this.mdReplaceText);
			}
 
			page.text = page.text.replace('== Summary ==', '== {{int:summary}} ==')
				.replace('== Licensing ==', '== {{int:license-header}} ==').replace('== License ==', '== {{int:license-header}} ==').replace('== Lizenz ==', '== {{int:license-header}} ==');
 
			page.editType = 'text';
			if (window.AjaxDeleteWatchFile && ('c_replace' !== this.mdTaskToPerform)) {
				page.watchlist = 'watch';
			}
 
			if (this.iUploads[upload].content !== page.text) {
				this.mdUploadCt++;
				this.mdSavePage(page, this.img_summary, 'mdTemplateAdded', 'mdTemplateAdded');
			}
		}
		if (0 === this.mdUploadCt) this.nextTask();
	},
 
	mdInsertOTRS: function (sitetext, insert) {
		if (this.mdPermissionPattern.test(sitetext)) {
			if (this.mdReplacePermission) {
				this.mdPermissionPattern.exec(sitetext);
				var pos = sitetext.search(this.mdPermissionPattern);
				var posstring = sitetext.substr(pos);
				sitetext = sitetext.substr(0, pos) + RegExp.$1 + insert + posstring.substr(Math.min( posstring.indexOf('\n|'), posstring.indexOf('\n}}') ));
			} else {
				// Do we need this for Safari?
				this.mdPermissionPattern.exec(sitetext);
				sitetext = sitetext.replace(this.mdPermissionPattern, '$1' + insert);
			}
		} else { // if no description template is available, prepend
			sitetext = insert + '\n' + sitetext;
		}
		return sitetext;
	},
 
	mdCreateRequestSubpage: function () {
		$(document).triggerHandler('vFC', ['creating request subpage', this]);
		this.pb.setCurrentTaskDone();
		this.pb.setTaskState('mdCreateRequestSubpage', 'md-doing');
		
		var page = [];
		page.title = this.requestPage;
		page.text = "\n\n=== " + this.mdDeleteHeading + " ===\n\n" + this.requestPageContents + "\n~~" + "~~\n";
		page.watchlist = 'watch';
		page.editType = 'appendtext';
		
		$(document).triggerHandler('vFC', ['request subpage', this, page]);
		this.mdSavePage(page, 'Starting mass deletion request using [[' + this.mdSelfPath + '|VisualFileChange.js]]', 'mdCreateRequestSubpageCB', 'mdCreateRequestSubpageCB');
	},
	
	mdCreateRequestSubpageCB: function (result, query, err) {
		if (err) {
			this.pb.setCurrentTaskState('md-notdone');
			this.pb.setError(err);
		} else {
			this.pb.setCurrentTaskDone();
		}
		this.nextTask();
	},
	
	/**
	 ** Transclude the nomination page onto today's DR log page, creating it if necessary.
	 ** The log page will never be watchlisted (unless the user is already watching it).
	 **/
	mdListRequestSubpage: function () {
		$(document).triggerHandler('vFC', ['creating request subpage', this]);
		this.pb.setCurrentTaskDone();
		this.pb.setTaskState('mdListRequestSubpage', 'md-doing');
		var page = [];
		page.title = this.dailyLogPage;

		page.text = "\n{{" + this.requestPage + "}}\n";
		page.watchlist = 'nochange';
		page.editType = 'appendtext';

		this.mdSavePage(page, "Listing [[" + this.requestPage + "]]", 'mdListRequestSubpageCB', 'mdListRequestSubpageCB');
	},
	
	mdListRequestSubpageCB: function (result, query, err) {
		if (err) {
			this.pb.setCurrentTaskState('md-notdone');
			this.pb.setError(err);
		} else {
			this.pb.setCurrentTaskDone();
		}
		this.nextTask();
	},
	
	mdTemplateAdded: function (result, query, err) {
		this.mdUploadCt--;
		var pgTitle = (result.requestid || query.title);
		var $gb = this.gbs[pgTitle];
		if ($gb) {
			$gb.find('img').attr('src', (err ? this.mdFailIcon : this.mdSuccessIcon));
			if (err) $gb.find('.gallerytext').prepend($('<span>', { 'class': 'error' }).text(err), '<br/>');
		}
		if (result.error) {
			this.pb.setCurrentTaskState('md-attention');
		}
		if (0 === this.mdUploadCt) this.nextTask();
	},
	
	mdNotifyUploaders: function () {
		$(document).triggerHandler('vFC', ['notifying uploaders', this, this.uploaders]);
		this.pb.setCurrentTaskDone();
		this.pb.setTaskState('mdNotifyUploaders', 'md-doing');
		
		this.uploadersToNotify = 0;
		for (var user in this.uploaders) {
			if (-1 !== this.excludedBots.indexOf(user)) continue;
			var page = [];
			page.title = this.mdUserTalkPrefix + user;
			page.text = "\n" + this.uploaders[user].talk_tag + " ~~" + "~~\n";
			page.editType = 'appendtext';
			page.redirect = true;
			if (window.AjaxDeleteWatchUserTalk) page.watchlist = 'watch';
			this.mdSavePage(page, this.uploaders[user].talk_summary, 'mdUploaderNotified');

			this.uploadersToNotify++;
		}
		if (this.uploadersToNotify === 0) this.nextTask();
	},

	mdUploaderNotified: function (result, query, err) {
		this.uploadersToNotify--;
		if (this.uploadersToNotify === 0) this.nextTask();
	},
	
	/**
	** Submit an edited page.
	**/
	mdSavePage: function (page, summary, callback, errCallBack) {
		var edit = {
			action: 'edit',
			summary: summary,
			watchlist: (page.watchlist || 'preferences'),
			title: page.title,
			requestid: page.title
		};
		if (page.redirect) edit.redirect = '';
		edit[page.editType] = page.text;
		// Token last!
		edit.token = this.edittoken;
		
		
		// emulation possible
		if (window.VisualFileChangeDebug) {
			console.log('VisualFileChange> savepage:');
			console.log(summary);
			console.log(page);
			
			var _this = this;
			setTimeout(function() {
				_this[callback]({ requestid: page.title });
			}, 8000);
		} else {
			this.doAPICall(edit, callback, errCallBack);
		}
	},
 
	/**
	** II. REVERT PART
	**
	**/
	mdRvGenOGallery: function () {
		this.pb.setCurrentTaskDone();
		this.pb.setTaskState('mdRvGenOGallery', 'md-doing');

		///////////////////////////////////////////
		//   SKIP THIS - TEMPORARY NOT WORKING   //
		///////////////////////////////////////////
		this.nextTask();
		return;
		///////////////////////////////////////////

		this.context = "MD-RevertImage";
		this.mdUploadCt = 0;
		if ( this.progressDialog ) this.progressDialog.remove();
		this.mdActualResultCount = 0;
		
		var o = this;
		
		var dlgButtons = {};
		dlgButtons[this.i18n.mdRevertButtonLabel] = function () { 
			o.mdSecureCall("mdRvEvalSelction");
		};
		dlgButtons[this.i18n.cancelButtonLabel] = function () {
			$(this).dialog("close");
			if ( o.mdInsertedTag ) {
				o.addTask('mdExecuteReady');
				o.nextTask();
			}
		};
		this.mdDlgThumbDlgClose();
		this.dlg = $('<div></div>').html('<div id="AjaxMdContainer"></div>').dialog({
			modal: true,
			closeOnEscape: true,
			position: 'center',
			dialogClass: "wikiEditor-toolbar-dialog",
			title: this.mdHelpNode + 
				'Batch Surgery Script in Beta-Mode.' + 
				' Report bugs and ideas to <a href="' + this.mdErrorsReportPath + '" target="_blank">Rillke</a>.' + 
				' Action: Revert overwritten images' + 
				' (Dis-)select&nbsp;all:&nbsp;<input type="checkbox" id="AjaxMdIa" value="1"/>',
			height: $(window).height() * 0.97,
			width: $(window).width() * 0.99,
			buttons: dlgButtons,
			close: this.mdCancel
		});
		if (this.dlg) {
			$('#AjaxMdIa').change( function (event) {
				var tmpChecked = this.checked;
				$('input[name="mdCheckDelete"]').each(function(index) {
					this.checked = tmpChecked;
				});
			});
			$('#AjaxMdContainer').append('<div id="AjaxMdNotReady">Please wait while enumerating overwritten files ...</div><ul id="AjaxMdUlContainer" class="gallery rgallery"></ul>');
			for (var upload in this.oUploads) {
				var query = {
					action: 'view',
					title: upload
				};
				$('#AjaxMdNotReady').contents().eq(0).replaceWith("Obtaining information from index.php for " + upload);
				this.doHTTPRequest(query, 'mdRvQueriedFile', 'GET');
				this.mdUploadCt++;
			}
		}
		if (0 === this.mdUploadCt) this.nextTask();
	},
 
	mdRvQueriedFile: function (result) {
		this.mdUploadCt--;
		if ('MD-Error' == this.context || 'MD-postDlg' == this.context) {
			this.mdRvAllFilesQueried();
			return;
		}
		var parsedDOM = $(result);
		var pageTitle = $('#firstHeading', parsedDOM).contents().eq(0).text();
		if (pageTitle && -1 != pageTitle.indexOf('File:')) {
			$('#AjaxMdNotReady').contents().eq(0).replaceWith('Querying detailed information and obtaining edittoken. Pending ' + (this.mdUploadCt) + 
			' of ' + (this.ioUploads) + ' total uploads current image: ' + pageTitle); 
			var rvMatrix = this.mdSecureCall("mdRvCreateImgRevisionMatrix", parsedDOM);
			var preVandalRv = 0;
			if (0 == rvMatrix.length || 'object' != typeof(rvMatrix[0]) || rvMatrix[0].user != this.mdTarget) { 
				this.mdRvAllFilesQueried();
				return;
			}
			for (var rv in rvMatrix) {
				if (rvMatrix[rv].user != this.mdTarget) { // Find the first revision of another user
					preVandalRv = rvMatrix[rv];
					break;
				}
			}
			if ('object' == typeof(preVandalRv)) {
				if ('object' != typeof(this.oUploads[pageTitle])) { // Is this upload in the list?
					var pageTitleR = $('#contentSub > a', parsedDOM).eq(0).attr('title'); // Redirect
					if ('' == pageTitleR || 'object' != typeof(this.oUploads[pageTitleR])) {
						this.mdRvAllFilesQueried();
						return;
					}
					else {
						this.oUploads[pageTitleR].iId = 'redir';
						this.oUploads[pageTitle] = {};
						this.oUploads[pageTitle].iId = 'redir';
					}
				}
				this.oUploads[pageTitle].editToken = preVandalRv.editToken;
				this.oUploads[pageTitle].oldImage = preVandalRv.oldImage;
				this.oUploads[pageTitle].preVandalUser = preVandalRv.user;
				this.mdBusy = true;
 
				var imgDescrPageLink = mw.config.get('wgServer') + mw.config.get('wgArticlePath').replace("$1", pageTitle.replace(/ /g, '_'));
 
				$galleryBox = this.mdCreateGalleryBox(
					[ $('<a>', { href: imgDescrPageLink, target: '_blank', 'class': 'image' })
						.append( $('<img>', { style: 'vertical-align:top', src: rvMatrix[0].img, width: (0 != rvMatrix[0].imgWidth ? rvMatrix[0].imgWidth : ''), height: (0 != rvMatrix[0].imgHeight ? rvMatrix[0].imgHeight : ''), alt: pageTitle })), 
					('<p style="vertical-align:middle">revert to ' + preVandalRv.user + '</p>'), 
					$('<a>', { href: preVandalRv.href, target: '_blank', 'class': 'image' })
						.append( $('<img>', { style: 'vertical-align:bottom', src: preVandalRv.img, width: (0 != preVandalRv.imgWidth ? preVandalRv.imgWidth : ''), height: (0 != preVandalRv.imgHeight ? preVandalRv.imgHeight : ''), alt: pageTitle }) ) ],
					[ ('<i>' + this.oUploads[pageTitle].iId + ': </i>'),
					$('<input>', { type: 'checkbox', name: 'mdCheckDelete', value: pageTitle } ),
					('<a' + imgDescrPageLink + '>' + pageTitle.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;') + '</a>') ],
					310
				);
				$('#AjaxMdUlContainer').append($galleryBox);
 
				this.mdBusy = false;
				this.mdActualResultCount++;
			}
		}
		this.mdSecureCall("mdRvAllFilesQueried");
	},
 
	mdRvAllFilesQueried: function () {
		if (0 === this.mdUploadCt) {
			this.mdBusy = false;
			this.context = "MD-RevertImage";
			$('#AjaxMdNotReady').hide();
			document.body.style.cursor = 'auto';
			if (0 == this.mdActualResultCount) {
				this.mdQueryFileDone();
			}
		}
	},
 
	mdRvCreateImgRevisionMatrix: function (parsedDOM) {
		var revArray = [];
		var cols = 6; // 6 is the number of columns; change this if number of col changes
		var iCell = -2;
		$('table.filehistory  > tbody > tr > td', parsedDOM).each(function(index, val) {
			try { // silently fail - result will be checked
				iCell++;
				if ('object' != typeof(revArray[Math.floor(iCell/cols)]) && Math.floor(iCell/cols) >= 0) revArray[Math.floor(iCell/cols)] = {}
				if ( $(val).children('a').length ) {
					var aNode = $(val).children('a').eq(0);
					if ( -1 != $(aNode).attr('href').indexOf("wpEditToken=") ) {
						var hrefContent = $(aNode).attr('href'); // with (revArray[Math.floor(iCell/cols)]) { - why it doesn't work?
						revArray[Math.floor(iCell/cols)].editToken = hrefContent.match(/wpEditToken=[a-fA-F0-9]{32}\%2B\%5C/)[0].replace('wpEditToken=', '').replace('\%2B\%5C', '\+\\');
						revArray[Math.floor(iCell/cols)].oldImage = hrefContent.match(/oldimage=\d+\%21/)[0].replace('oldimage=', '').replace('\%21', '');
						return true;
					}
					if ( -1 != $(aNode).attr('class').indexOf("mw-userlink") ) {
						revArray[Math.floor(iCell/cols)].user = $(aNode).contents().eq(0).text();
						return true; // skip the other tests, like continue in a loop
					}
					if ( -1 != $(aNode).attr('href').indexOf("//upload.wikimedia.org/wikipedia/")) {
						var hrefContent = $(aNode).attr('href');
						var imgNode = $(aNode).children('img').eq(0);
						if ( $(aNode).children('img').length ) {
							revArray[Math.floor(iCell/cols)].href = hrefContent;
							revArray[Math.floor(iCell/cols)].img = $(imgNode).attr('src');
							revArray[Math.floor(iCell/cols)].imgWidth = $(imgNode).attr('width');
							revArray[Math.floor(iCell/cols)].imgHeight = $(imgNode).attr('height');
						}
						return true;
					}
				}
			} catch (ex) {}
		});
		return revArray;
	},
 
	mdRvEvalSelction: function () {
		var o = this;
		
		this.mdUploadCt = 0;
		$('#AjaxMdContainer').hide();
		$('#AjaxMdContainer').parent().append('<div id="mdWaitContainer">' + this.i18n.mdExecutingTaskEnumerateFiles + this.mdReLoader + '</div>');
 
		$('input[name="mdCheckDelete"]').each(function(index) {
			if (this.checked) {
				o.mdUploadCt++;
				o.mdSecureCall("mdRevertImage", this.value);
			}
		});
		if (0 == this.mdUploadCt) {
			this.mdDlgThumbDlgClose();
			this.nextTask();
		}
	},
 
	mdRevertImage: function (title) {
		var pageTitle = title.replace(/ /g, '_');
		var data = {
			wpEditToken: this.oUploads[title].editToken,
			wpComment: 'Reverting this image to previous revision of ' + this.oUploads[title].preVandalUser + ' using [[' + this.mdSelfPath + '|VisualFileChange.js]]'
		};
 
		$('#mdWaitContainer').replaceWith('<div id="mdWaitContainer">Posting the revert request for ' + title + ' via index.php ' + this.mdReLoader + '</div>');
		this.doHTTPRequest(data, 'mdReverted', 'POST', mw.config.get('wgServer') + mw.config.get('wgScript') + '?title=' + pageTitle + '&action=revert&oldimage=' 
			+ this.oUploads[title].oldImage + '!' + pageTitle.replace('File:', '') );
	},
 
	mdReverted: function (result) {
		this.mdUploadCt--;
		if (!$('#mw-returnto', $(result)).children().length) { // Error!
		}
		if (0 == this.mdUploadCt) {
			this.mdDlgThumbDlgClose();
			this.nextTask();
		}
	},
 
	mdExecuteReady: function () {
		this.context = "QD";
		this.pb.setCurrentTaskDone();

		if (this.mdWasAPIError) {
			alert('We regret the the inconvenience: The Server-API reported an error during the execution of this process. Please check your contributions, whether something went wrong.');
		}
		
		if ( this.mdInsertedTag ) {
			if ('del' === this.mdTaskToPerform) {
				// navigating to the new created deletion request
				var encTitle = this.requestPage;
				encTitle = encodeURIComponent(encTitle.replace(/ /g, '_')).replace(/%2F/ig, '/').replace(/%3A/ig, ':');
				this.mdGoToSite(mw.config.get('wgServer') + mw.config.get('wgArticlePath').replace("$1", encTitle));
			}
			else if (-1 === mw.config.get('wgNamespaceNumber') && ( 'c_replace' !== this.mdTaskToPerform && 'OTRS' !== this.mdTaskToPerform && 'other' !== this.mdTaskToPerform )) {
				// navigating to the user-discussion-page
				var encTitle = this.mdUserTalkPrefix + this.mdTarget;
				encTitle = encodeURIComponent(encTitle.replace(/ /g, '_')).replace(/%2F/ig, '/').replace(/%3A/ig, ':');
				this.mdGoToSite(mw.config.get('wgServer') + mw.config.get('wgArticlePath').replace("$1", encTitle));
			} else {
				this.mdGoToSite(location.href);
			}
		}
	},

	mdGoToSite: function (target) {
		if (!window.VisualFileChangeDebug && !this.mdWasAPIError) {
			setTimeout(function() {
				location.href = target;
			}, 5000);
		}
	},

   /**
    ** Does a MediaWiki API request and passes the result to the supplied callback (method name).
    ** Uses POST requests for everything for simplicity.
    **/
   doAPICall: function (params, callback, errCallBack) {
      var o = this;
 
      params.format = 'json';
      $.ajax({
         url: mw.util.wikiScript('api'),
         cache: false,
         dataType: 'json',
         data: params,
         type: 'POST',
         success: function (result, status, x) {
            if (!result) return o.fail("Receive empty API response:\n" + x.responseText);
 
            // In case we get the mysterious 231 unknown error, just try again
            if (result.error && result.error.info.indexOf('231') != -1) return setTimeout(function () {
               o.doAPICall(params, callback);
            }, 500);
            if (result.error) {
				if (errCallBack && $.isFunction(o[errCallBack])) {
					this.mdWasAPIError = true;
					o[errCallBack](result, params, result.error.code + ': ' + result.error.info);
				} else {
					return o.fail("API request failed (" + result.error.code + "): " + result.error.info);
				}
            }
            if (result.edit && result.edit.spamblacklist) {
                 return o.fail("The edit failed because " + result.edit.spamblacklist + " is on the Spam Blacklist");
            }
            try {
               o[callback](result);
            } catch (e) {
               return o.fail(e);
            }
         },
         error: function (x, status, error) {
			if (errCallBack && $.isFunction(o[errCallBack])) {
				this.mdWasAPIError = true;
				o[errCallBack]('', params, 'Server status: ' + x.status + ' - Error:' + error);
			} else {
				return o.fail("Server returned code " + x.status + " " + status + "Error code is " + error);
			}
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
		if ('undefined' != typeof(console)) console.log('Error: ' + err);
		var msg = this.i18n.taskFailure[this.currentTask] || ('-- NO TASK DESCR. FOR ' + this.currentTask + ' PLEASE ADD IT --');
 
		var reportPage = '';
		this.mdBusy = false; // Prevents that our mdDlgThumbDlgClose will be refused
		
		this.pb.setCurrentTaskState('md-failed');
 
		if ( 'MD' === this.context || 'MD-RevertImage' === this.context || 'MD-postDlg' === this.context ) {
			reportPage = this.mdErrReportPath;
			fix = '';

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
			this.currentTask = o.mdSecureCall.arguments[0];
			return o[stFunction].apply(this, Array.prototype.slice.call(o.mdSecureCall.arguments, 1)); // arguments is not of type array so we can't just write arguments.slice
		} catch (ex) {
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
	mdOpt: { // 		0	1						2					3						4		5		6		7												8																									9											10
		// key, minLenReq, acceptReason, 			prefill, 			confirmation, addTalkNote, replace, otrsrepl,	tag,											+summary																							talk_tag									talk_summary
		'c_replace':[false,	'mdInsertPattern',		'',					'',						false,	true,	false,	"",												'Replacing "%pattern%" with "%replace%"', 															'',											''],
		'prepend':  [false,	'mdInsertGeneric',		'',					'',						false,	false,	false,	"",												'Inserting "%pattern%"', 																			'',											''],
		'append':   [false,	'mdInsertGeneric',		'',					'',						false,	false,	false,	"",												'Inserting "%pattern%"', 																			'',											''],
		'cv':		[true,	'mdInsertDeleteReasen',	'',					'mdDelteConfirmation',	true,	false,	false,	"{\{copyvio|1=%REASON%}}\n",					'%cv% %REASON%', 																					'{\{subst:copyvionote|1=%FILE%}}',			'Notification of possible copyright violations.'],
		'cv-dw':	[true,	'mdInsertDeleteReasen',	'',					'mdDelteConfirmation',	true,	false,	false,	"{\{Derivative|1=%REASON%}}\n",					'%cv% it is a [[COM:DW|derivative work]] of a work protected by copyright.', 						'{\{subst:Derivativenote|1=%FILE%}}',		'Notification of possible copyright violations. (Derivative)'],
		'cv-fu':	[true,	'mdInsertDeleteReasen',	'',					'mdDelteConfirmation',	true,	false,	false,	"{\{Fair use}}\n",								'%cv% [[COM:FU|fair use]] media are not allowed on Commons.', 										'{\{subst:No fair use|1=%FILE%}}',			'Please do not upload media with fair-use claims on commons.'],
		'cv-logo':	[false,	false,					'',					'',						true,	false,	false,	"{\{Logo}}\n",									'%cv% this logo exeeds the threshold of creativety and therefore is subject to copyright.', 		'{\{subst:copyvionote|1=%FILE%}}',			'Notification of possible copyright violations. (Logo)'],
		'cv-ndw':	[false,	false,					'',					'',						true,	false,	false,	"{\{Nonderivative}}\n",							'%cv% no derivatives are allowed, which is [[COM:L|incompatible with commons]].', 					'{\{subst:copyvionote|1=%FILE%}}',			'Notification of possible copyright violations. (NoDerivative)'],
		'del':		[true,	'mdInsertDeleteReasen',	'',					'mdDelteConfirmation',	true,	false,	false,	"{\{delete|reason=%REASON%|subpage=%SUBPAGE%|%D%}}\n", '[[COM:DR|Nominating for deletion]].', 														'{\{subst:idw|2=%REQUESTPAGE%|3=plural}}\nAffected:\n* [[:%FILE%]]\n', 'Warning: Some of your [[%FULLREQUESTPAGE%|uploads have been nominated for deletion]].'],
		'np':		[false,	false,					'',					'',						true,	false,	false,	"{\{subst:npd}}\n",								'Missing [[COM:PERMISSION|permission]].', 															'{\{subst:image permission|1=%FILE%}}',		'Please send a permission for [[%FILE%]] and some other files to [[COM:OTRS|OTRS]].'],
		'ns':		[false,	false,					'',					'',						true,	false,	false,	"{\{subst:nsd}}\n",								'File has no [[COM:Source|source]].', 																'{\{subst:image source|1=%FILE%}}',			'[[%FILE%]] (and maybe some other ones) does not have [[COM:Source|a source]].'],
		'ns-dw':	[false,	false,					'',					'',						true,	false,	false,	"{\{subst:Dw-nsd}}\n",							'File is a [[COM:DW|derivative work]] and sources or permission of the original works are not given.', '{\{subst:dw image source|1=%FILE%}}', 	'[[%FILE%]] (and some other files) are a [[COM:DW|derivative works]] and don\'t have sources.' ],
		'otrs':		[false,	'mdInsertOther',		'mdOTRSprefill',	'mdInsertConfirmation',	false,	false,	true,	"",												'Addding an [[COM:OTRS|OTRS]] tag to the permission section of this file. Removing problem tags.', 	'',											''],
		'other':	[false,	'mdInsertOther',		'mdOTRSprefill',	'mdInsertConfirmation',	false,	false,	true,	"",												'Addding an [[COM:OTRS|OTRS]] or license-review tag to the permission section of this file.', 		'',											'']
	},
	mdCommands: {
		'c_replace':{ tasks: ['mdInsertPermission'] },
		'prepend':	{ tasks: ['mdPrependText', 'mdPrependTemplate'] },
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
		'otrs':		{ tasks: ['mdInsertPermission'] },
		'other':	{ tasks: ['mdInsertPermission'] }
	},
	mdOptDefault: 'del',
	mdOptText: {
		'cv': 'Marking as possible [[COM:Copyvio|copyright violation]] because '
	},
 
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
		[/\{\{[Nn]onderivative.*\}\}/g],
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
		[/[Aa]dmin[- ]reviewed [licenses|Flickr images]/,	'lrd', '8fa'],
		[/Flickr images needing human review/,				'frR', 'af8'],
		[/License review needed/,							'lrR', 'af8'],
	],
 
	mdLicenseRecognization: [
		// RegExp for the tag			note to add to the thumb-page
		[/Category:CC[- _]BY-SA.*/i,	'CC-By-SA'],
		[/Category:CC[- _]BY.*/i,		'CC-By'],
		[/Category:CC[- _]Zero.*/i,		'CC0'],
		[/Category:GFDL.*/i,			'GFDL'],
		[/Category:PD[- _]Old.*/i,		'PD-old'],
		[/Category:PD[- _]self.*/i,		'PD-self'],
		[/Category:PD[- _]author.*/i, 	'PD-author'],
		[/Category:PD.*/i, 				'PDx'],
		[/Category:FAL/i, 				'LibreA'],
		[/Category:Images requiring attribution/i, 				'Attrib'],
		[/Category:Copyrighted free use.*/i, 					'CFreeUse'],
		[/Category:Mozilla Public License/i, 					'MPL'],
		[/Category:GPL/i, 										'GPL'],
		[/Category:Free screenshot.*/i, 						'free-Screenshot'],
		[/Category:Self[- _]published[- _]work/i, 				'<b>self</b>'],  // rm the next tags from being shown
		[/Valid SVG/, ''], [/Translation possible/, ''], [/License[- _]migration redundant/, ''], [/Retouched pictures/, ''], [/Extracted images/, ''], [/Images with annotations/, ''], [/Media needing category/, ''], [/requiring review/, ''], [/[Flickr|License] review needed/, ''], [/[Aa]dmin[- ]reviewed/, ''], [/UploadWizard/, ''], [/OTRS[- _]received/, ''], [/Items[- _]with[- _]OTRS[- _]permission/, ''], [/OTRS[- _]pending/, ''], [/Media with locations/, ''], [/Media missing/, ''], [/Media without a/, ''], [/Deletion requests/, '']
	],
 
	mdOTRSprefill: "{{PermissionOTRS|id=%ID|\~\~\~\~}} {{subst:OR|id=%ID|reason=processing, nonfree, email}}",
	mdOTRSTicketPrefill: "{{PermissionOTRS|ticket=%URL|\~\~\~\~}} {{subst:OR|ticket=%URL|reason=processing, nonfree, email}}",
	mdPermissionPattern: /(\|Permission\s*\=)/i,
	mdURLPattern: /(https:\/\/\S*)/,
	mdSelfPath: 'MediaWiki:VisualFileChange.js',
	mdErrReportPath: 'User_talk:Rillke/AjaxMassDelete.js',
	mdUserPrefix: mw.config.get('wgFormattedNamespaces')[2] + ":",
	mdUserTalkPrefix: mw.config.get('wgFormattedNamespaces')[3] + ":",
	mdContribPrefix: mw.config.get('wgFormattedNamespaces')[-1] + ":Contributions/",
	mdRequestPagePrefix: "Commons:Deletion requests/",
	mdReLoader: '<p align="center"><img src="//upload.wikimedia.org/wikipedia/commons/c/ce/RE_Ajax-Loader.gif"/></p>',
	mdSuccessIcon: '//upload.wikimedia.org/wikipedia/commons/thumb/a/ac/Crystal_Project_success.png/120px-Crystal_Project_success.png',
	mdDoingIcon: '//upload.wikimedia.org/wikipedia/commons/thumb/a/ae/Quick_restart.png/120px-Quick_restart.png',
	mdFailIcon: '//upload.wikimedia.org/wikipedia/commons/thumb/c/c8/Crystal_Project_cancel.png/120px-Crystal_Project_cancel.png',
	mdThisTaskIcon: '//upload.wikimedia.org/wikipedia/commons/thumb/4/41/Crystal_Clear_action_loopnone.png/16px-Crystal_Clear_action_loopnone.png',
	mdDoneTaskIcon: '//upload.wikimedia.org/wikipedia/commons/thumb/a/ac/Crystal_Project_success.png/16px-Crystal_Project_success.png',
	mdFailedTaskIcon: '//upload.wikimedia.org/wikipedia/commons/thumb/c/c8/Crystal_Project_cancel.png/16px-Crystal_Project_cancel.png',
	mdInfoIcon: '//upload.wikimedia.org/wikipedia/commons/0/09/Crystal_Clear_action_info.png',
	mdAttentionTaskIcon: '//upload.wikimedia.org/wikipedia/commons/thumb/a/af/Crystal_Clear_app_error-info.png/16px-Crystal_Clear_app_error-info.png',
	mdErrorsReportPath: mw.config.get('wgServer') + mw.config.get('wgArticlePath').replace("$1", mw.config.get('wgFormattedNamespaces')[3]) + ':Rillke',
	mdHelpNode: '<a href="' + mw.config.get('wgServer') + mw.config.get('wgArticlePath').replace("$1", mw.config.get('wgFormattedNamespaces')[12]) + ':VisualFileChange.js" target="_blank"><img title="Help and known issues." alt="?" src="//upload.wikimedia.org/wikipedia/commons/4/45/GeoGebra_icon_help.png"></a> ',
	excludedBots: 'FlickreviewR, Rotatebot, Cropbot, Picasa Review Bot, File Upload Bot (Magnus Manske), Flickr upload bot',
 
	/** REVISION CONTROL **/ //(x.major.minor.bug)
	mdScriptRevision: '0.6.2.1',
 
   // Translatable strings
	i18n: {
		mdButtonLabel: "Perform batch task",
		mdPerformOnWhichTarget:  "What user or category is this action about? Please insert Category:-prefix if it's a cat. Other fields are optional. Empty or invalid fields will be ignored.",
		mdTargetInput: "User or category:",
		mdDisselectAll: " (De-)select&nbsp;all&nbsp;loaded:&nbsp;",
		mdInsertDeleteReasen: "Select the files to delete and fill in the reason, please",
		mdInsertDeleteHeading: "Insert the heading for the mass deletion request, please",
		mdInsertOther: "Please insert the OTRS (or other) text to add to the permission section",
		mdInsertEditSummary: "An auto-edit summary for the file-pages will be created. Additionally add",
		mdReplacePermissionText: "Clean permission-section?",
		mdInsertPattern: "Please insert the text to be replaced.",
		mdCustomReplaceText: "Please insert the text that should be inserted instead",
		mdInsertGeneric: "Please insert the text to be added to each selected file.",
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
		nextButtonLabel: "Proceed",
		submitButtonLabel: "Execute",
		cancelButtonLabel: "Cancel",
		mdPleaseWait: "Please wait.",
		
		optStartAt: "Start listing from a specific date",
		optStartAtHowTo: 'Format:  YYYY-MM-DD<br/> or, optionally<br/>YYYY-MM-DD&nbsp;hh:mm:ss<br/>or use the picker',
		
		mdCuteSelect: {
			'and': "AND",
			'intro': "The selection of matching and loaded files will be changed. If you want to apply changes, click on the button in the bottom. To close this dialog, click on the cross in the top right corner. Specify what to (de-)select, empty fields are considered fulfilling the condition:",
			'select': "Select (/Deselect)",
			'inCat': "In Category",
			'title': "Title matches",
			'size': "Size",
			'date': "<abbr title=\"Only one date is required. But the first date (start date) must be before the second date (end date).\">Date</abbr> (time is optional)",
			'between': "between",
			'titleplaceholder': "(Reg)(?:ular )?(Exp)(?:ression)?",
			'dateplaceholder': "YYYY-MM-DD hh:mm:ss",
			'button': "Apply"
		},
		
		mdNoFilesSelected: {
			'title': 'No files selected',
			'text': 'It seems to me that you did not select any file to tag. Proceed?',
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
			'append': "append any text"
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
'jquery.tipsy',
'jquery.placeholder',
'mediawiki.html',
'mediawiki.user',
'mediawiki.util',
], function () {
	$(document).ready(function () {
		this.context = "QD";
		$(document).bind('vFC', function(e, p1, p2, p3) {
			if (window.VisualFileChangeDebug) console.log('VisualFileChange> ' + p1);
		});
		VisualFileChange.mdInstall();
	});
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
 
} // end if (guard) </nowiki>