// This script depends on AjaxQuickDelete. It helps performing mass-changes on the uploads of a paricular user.
// It was composed by [[User:Rillke]] in 2011; Thanks DieBuche for advice; some code stolen from commons:MediaWiki:AjaxQuickDelete.js
// <nowiki>
// TODO if version 1.18 ready, add possibility to revert all images
//   http://svn.wikimedia.org/viewvc/mediawiki/trunk/phase3/includes/api/ApiFileRevert.php?view=log
//   action=filerevert&filename=File:MassDeleteOTRS.png&comment=TestingBryanTongMinhRevert&archivename=20110429234711!Wiki.png&token=+\\
// TODO obtain images from thumb.php as this would be much faster
//   Problem: Animated GIFs and some PNGs
// TODO AJAX userlist-dropdown / verification
 
if (typeof AjaxMassDelete == 'undefined') {
 
window.AjaxMassDelete = {
	/**
	** Set up the AjaxMassDelete object and add the toolbox link.  Called via $(document).ready() during page loading.
	**/
	mdInstall: function () {
		// Don't install link if the user opted out
		if (window.AjaxDeleteOptOut) return;
 
		if ( 1 == $("#t-AjaxQuickDeleteOnDemand").length ) {
			// User is using the load on demand feature. 
			// Replace the link
			$("#t-AjaxQuickDeleteOnDemand").replaceWith('<li id="t-AjaxQuickDeletx2"><span><a href="javascript:AjaxQuickDelete.mdStartMd();">Perform batch task</a></span></li>');
			// Immedately start Md
			this.mdStartMd();
		} else {
			if ( "MediaWiki:VisualFileChange.js" == mw.util.getParamValue('withJS') ) {
				// Load immediately and add no link
				this.mdStartMd();
 
			} else if (mw.config.get('wgNamespaceNumber') != 14) {
				// Set up toolbox link
				addPortletLink('p-tb', 'javascript:AjaxQuickDelete.mdStartMd();', "Perform batch task", 't-AjaxQuickDeletx2', null);
			}
		}
	},
 
	mdStartMd: function () {
		var wgPageName = mw.config.get('wgPageName');
 
		this.context = "MD"; // The error handler should know what we are performing
		this.mdBusy = false; // indicate that any dialog can be closed
		this.tasks = []; // reset task list in case an earlier error left it non-empty
		this.pageName = wgPageName;
		this.mdUser = '';
		this.mdListUploadsPending = 0;
 
		switch (mw.config.get('wgNamespaceNumber')) {
			case 6: // File
				this.addTask('findOriginalUploader');
				break;
			case 3: // User_talk
			case 2: // User
				this.uploaders = {};
				this.uploaders[mw.config.get('wgPageName').match(/.*?\:(.*?)(\/.*)*$/)[1]] = true;
				break;
			case -1: // Special pages
				try {
					if ( "Contributions" == mw.config.get('wgCanonicalSpecialPageName') ) {
						this.uploaders = {}; // Extract target from addressline
						if ( -1 != location.href.indexOf("\/Special:Contributions\/") ) {
							this.uploaders[decodeURI(location.href.match(/Special\:Contributions\/(.*?)$/)[1])] = true;
						} else if ( -1 != location.href.indexOf(mw.config.get('wgScript')) ) {
							this.uploaders[mw.util.getParamValue('target')] = true;
						}
					}
					if ( "Log" == mw.config.get('wgCanonicalSpecialPageName') ) {
						this.uploaders = {}; // Extract target from addressline
						if (mw.util.getParamValue('user')) this.uploaders[mw.util.getParamValue('user')] = true;
						if (mw.util.getParamValue('page')) { if (/User:+./.test(mw.util.getParamValue('page'))) {this.uploaders[mw.util.getParamValue('page').replace("User:", "")] = true} };
					}
				} catch (ex) { }
				break;
			case 14: // Category - Exception Script is also able to handle cats
				this.uploaders = {}; // Don't become confused it's the cat
				this.uploaders[mw.config.get('wgPageName')] = true;
				break;
		}
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
		}
		this.showProgress(this.i18n.mdTryToObtainUser);
		this.doAPICall(query, 'findOriginalUploaderCB');
	},
 
	findOriginalUploaderCB: function (result) {
		this.uploaders = {};
		var pages = result.query.pages;
		for (var id in pages) { // there should be only one, but we don't know its ID
			this.edittoken = pages[id].edittoken; // The edittoken only changes between logins
			var info = pages[id].imageinfo;
			var content = pages[id].revisions[0]['*'];
			var i =info.length - 1;
			// Now exclude bots which only reupload a new version:
			this.excludedBots = 'FlickreviewR, Rotatebot, Cropbot, Picasa Review Bot, File Upload Bot (Magnus Manske), Flickr upload bot';
			if (-1 === this.excludedBots.indexOf(info[i].user)) {
				this.uploaders[info[i].user] = true;
			}
		}
		this.nextTask();
	},
 
	mdContinue: function () {
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
		this.dlg = 0;         // will become replaced by a jQuery object
		this.mdLestart = '';  // important for continuing the query
		this.mdNoMoreFiles = false;  // set to true, when API response did not contain a new Lestart
 
		if ( typeof this.uploaders !== 'undefined' ) {
			for (var user in this.uploaders) {
				pefilledUser = user;
			}
		}
		if ( pefilledUser === '' ) { pefilledUser = mw.user.name(); }
		if ( typeof this.progressDialog !== 'undefined' ) { this.progressDialog.remove(); }
		this.prompt([{
			message: '',
			prefill: pefilledUser,
			returnvalue: 'reason',
			cleanUp: true,
			noEmpty: true,
			minLength: 1
		}], this.i18n.mdPerformOnWhichUser);
	},
 
	/**  
	**  Called by nextTask after the fill-in-user-dialog and by mdQueryFileDone (follows later)
	**  Calls the appropriate method (uploads of cats)
	**/
	mdCreateList: function () {
		if ('' == this.mdUser) { 
			this.mdUser = this.reason; // WARNING: INPUT IS UNCHECKED
			this.mdModeCat = /^Category\:/.test(this.mdUser);
		}
		if (this.context != 'MD') return;
		if (this.mdListUploadsPending > 0) { // If there are queries pendig continue later
			var o = this;
			setTimeout(function () { o.mdCreateList() }, 200); // See me later ...
			return true;
		}
		this.mdListUploadsPending++;
		
		if (!this.dlg) this.showProgress(this.i18n.mdWaitingApiRes);
		if (this.mdModeCat) this.mdSecureCall("mdFindCatMembers"); else this.mdSecureCall("mdFindUploads");
	},
	
	mdFindUploads: function () {
		var query = {
			action: 'query',
			list: 'logevents',
			leprop: 'title|type|timestamp',
			letype: 'upload',
			leuser: this.mdUser,
			lelimit: (window.AjaxMassDeleteInterval ? window.AjaxMassDeleteInterval : 30) * 2,
			lestart: this.mdLestart
		};
		this.doAPICall(query, 'mdFindUploadsCB');
	},
	
	mdFindUploadsCB: function (result) {
		this.mdListUploadsPending--;
		if ( !this.dlg && ('' == this.mdLestart) ) this.showProgress(this.i18n.mdSortingAPIres);
		var allFileChanges = result.query.logevents;
		for (var id in allFileChanges) { // loop through all filechanges (array)
			if ('upload' === allFileChanges[id].action) { // This file was initially uploaded by the user.
				this.iUploads[allFileChanges[id].title] = [];
				this.iUploads[allFileChanges[id].title].iId = this.iiUploads;
				this.iUploads[allFileChanges[id].title].time = allFileChanges[id].timestamp;
				this.iiUploads++;
			} else if ('overwrite' === allFileChanges[id].action) {
				this.oUploads[allFileChanges[id].title] = [];
				this.oUploads[allFileChanges[id].title].iId = this.ioUploads;
				this.oUploads[allFileChanges[id].title].time = allFileChanges[id].timestamp;
				this.ioUploads++;
			}
		}
		if (!result['query-continue']) { 
			this.mdNoMoreFiles = true;
		}
		if ('' == this.mdLestart) {			// Call nextTask the first time only
			if (!this.mdNoMoreFiles) this.mdLestart = result['query-continue'].logevents.lestart;
			this.nextTask();
		} else {
			if (!this.mdNoMoreFiles) this.mdLestart = result['query-continue'].logevents.lestart;
		}
	},
	
	mdFindCatMembers: function () {
		var query = {
			action: 'query',
			list: 'categorymembers',
			cmtitle: this.mdUser,
			cmtype: 'file',
			cmprop: 'title|type|timestamp',
			cmlimit: (window.AjaxMassDeleteInterval ? window.AjaxMassDeleteInterval : 30) * 2,
			cmcontinue: this.mdLestart
		};
		this.doAPICall(query, 'mdFindCatMembersCB');
	},
	
	mdFindCatMembersCB: function (result) {
		this.mdListUploadsPending--;
		if ( !this.dlg && ('' == this.mdLestart) ) this.showProgress(this.i18n.mdSortingAPIres);
		var allFileChanges = result.query.categorymembers;
		for (var id in allFileChanges) { // loop through all category-members (object)
			this.iUploads[allFileChanges[id].title] = [];
			this.iUploads[allFileChanges[id].title].iId = this.iiUploads;
			this.iUploads[allFileChanges[id].title].time = allFileChanges[id].timestamp;
			this.iiUploads++;
		}
		if (!result['query-continue']) { 
			this.mdNoMoreFiles = true;
		}
		if ('' == this.mdLestart) {			// Call nextTask the first time only
			if (!this.mdNoMoreFiles) this.mdLestart = result['query-continue'].categorymembers.cmcontinue;
			this.nextTask();
		} else {
			if (!this.mdNoMoreFiles) this.mdLestart = result['query-continue'].categorymembers.cmcontinue;
		}
	},
 
	/**  
	**  Method to securely close (you may call it "nuke") the dialog, even if there were errors; called on button cancel and by several methods
	**/
 	mdDlgThumbDlgClose: function () {
		var o = AjaxQuickDelete;
		if ( o.mdBusy ) {     // Call myself later if script is busy
			setTimeout(o.mdDlgThumbDlgClose(), 10);
			return true;
		}
		// Re-desplay the page's content
		$('#mw-page-base').show();
		$('#mw-head-base').show();
		$('#content').show();
		$('#mw-head').show();
		$('#mw-panel').show();
		$('#footer').show();
		
		if ('object' == typeof(o.dlg)) {
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
		} else if ( 'AjaxMdContainer' == $(this).children('div').eq(0).attr('id') ) {
			this.dialog("destroy");
			this.parent.remove();
			document.body.style.cursor = 'auto';
			o.context = 'MD-postDlg';
		}
	},
 
	/**  
	**  Mammoth method to set up and manage the UserInterface (UI)
	**/
	mdGenIGallery: function () {
		this.mdUploadCt = 0;              // Number of pending API queries
		this.mdActualResultCount = 0;     // Doesn't include reverts and deleted media
		this.mdPendingBatchQueries = 0;   // Number of batches currently on query; should be max. 1
		this.mdNumberOfExecs = 0;         // Is Execute called already?
		
		var o = this;

		/*  The UI  */
		this.progressDialog.remove();
 
		this.mdMinLenRequired = true;     // Is a reason required?
 
		this.mdDlgThumbDlgClose();        // Are there Contaminated Sites? Remove them now.
		
		appendCSS( '.rgallery { background-color:#FFF !important; }' );
 
		var dlgButtons = {};
		dlgButtons[this.i18n.submitButtonLabel] = function () {
			o.mdSecureCall("mdExecute");
		};
		dlgButtons[this.i18n.cancelButtonLabel] = function () {
			$(this).dialog("close");
		};
		dlgButtons[this.i18n.mdSelectButtonLabel] = function () {
			o.mdCuteSelectDlg.dialog("open");
		};
		dlgButtons[this.i18n.mdDelContribsButtonLabel] = function () {
			$('#AjaxDeletedUploads').slideToggle();
		};
 
		this.dlg = $('<div></div>').html('<div id="AjaxMdContainer"></div>').dialog({
			modal: false,
			closeOnEscape: true,
			position: 'top',
			dialogClass: "wikiEditor-toolbar-dialog",
			title: this.mdHelpNode +
				'Batch Surgery Script v.' + this.mdScriptRevision + 
				' Report bugs and ideas to <a href="' + this.mdErrorsReportPath + '" target="_blank">Rillke</a>. ' + 
				'Action:&nbsp;<select size="1" id="AjaxMdType">' +
				'<option value="cv">' + this.i18n.mdCopyvio + '</option><option value="cv-dw">' + this.i18n.mdCopyvioDerative + '</option><option value="cv-fu">' + this.i18n.mdCopyvioFairUse + '</option><option value="cv-logo">' + this.i18n.mdCopyvioLogo + '</option><option value="cv-ndw">' + this.i18n.mdCopyvioND + '</option>' + 
				'<option value="del" selected="selected">' + this.i18n.mdDelete + '</option><option value="np">' + this.i18n.mdNoPermission + '</option><option value="ns">' + this.i18n.mdNoSource + '</option>' + 
				'<option value="other">' + this.i18n.mdOtrsAdd + '</option><option value="otrs">' + this.i18n.mdOtrsRmTags + '</option>' + 
				'<option value="c_replace">' + this.i18n.mdCustomReplace + '</option>' +
				'</select>' + 
				this.i18n.mdDisselectAll + '<input type="checkbox" id="AjaxMdIa" value="1"/>',
			height: $(window).height() - 30,
			width: $(window).width(),
			buttons: dlgButtons,
			close: this.mdDlgThumbDlgClose,
			resizeStop: function(event, ui) { $('.ui-dialog > .ui-dialog-content').eq(0).scroll(); } // Fire scroll evt on resize for (continue query if btn gets visible)
		});
		
		// Hide the complete page (avoids scrolling)
		$('#mw-page-base').hide();
		$('#mw-head-base').hide();
		$('#content').hide();
		$('#mw-head').hide();
		$('#mw-panel').hide();
		$('#footer').hide();
 
		if (!this.dlg) return 0;
		$('.ui-dialog-buttonpane').prepend(
			'<div id="mdConfirmationSurrounder" style="width:100%;min-height:20px;"><span id="mdDelteReasonConfirmationLabel">' + this.i18n.mdDelteReasonConfirmationLabel +
			'</span>: <span id="mdDelteReasonConfirmation">' + this.i18n.mdSpecifyReason + '</span></div>');
		$('#AjaxMdContainer').append(
			(this.mdModeCat ? 'Files in -' : 'Initally uploaded files by -') + 
			'<a href="' + mw.config.get('wgServer') + (this.mdModeCat ? mw.config.get('wgArticlePath').replace("$1", this.mdUser) : (mw.config.get('wgArticlePath').replace("$1", o.userTalkPrefix) + this.mdUser)) + '" target="_blank">' + this.mdUser +'</a>-. ' + 
			'<label id="mdTaskForUser" for="mdDeleteReason">' + this.i18n.mdInsertDeleteReasen + '</label>: <input type="text" id="mdDeleteReason" style="width: 70%;"/>' + 
			'<span id="mdReplacePermissionWrapper"><input type="checkbox" id="mdReplacePermission"/><label for="mdReplacePermission"> ' + this.i18n.mdReplacePermissionText + '</label></span>')
			.append('<table width="100%"><tr id="mdRequestPageTitle"><td><label for="mdDeleteHeading">' + this.i18n.mdInsertDeleteHeading + ': </label></td>' + 
				'<td width="70%"><input type="text" id="mdDeleteHeading" style="width: 99%;" value="' + 
				(this.mdModeCat ? 'Files in [[:' + this.mdUser + ']] ' : ('Files uploaded by [[' + this.mdUserPrefix + this.mdUser + '|' + this.mdUser + ']] ' + 
				'([[' + this.userTalkPrefix + this.mdUser + '|talk]] &#x00B7; [[' + this.mdContribPrefix + this.mdUser + '|contribs]])')) + '"/></td></tr>' +
				'<tr id="mdTalkNoteNode"><td><label for="mdTalkNote">' + this.i18n.mdInsertTalkNote + ': </label></td>' + 
				'<td width="70%"><input type="text" id="mdTalkNote" style="width: 99%;" value="' + 
					(window.AjaxMassDeleteUserNote ? window.AjaxMassDeleteUserNote : 'Yours sincerely') + '"/></td></tr>' +
				'<tr id="mdReplaceTextNode"><td><label for="mdRRegEx">RegExp?</label><input type="checkbox" id="mdRRegEx"/><br>' + 
				'<label for="mdReplaceText">' + this.i18n.mdCustomReplaceText + ': </label></td>' + 
				'<td width="70%"><textarea rows="3" cols="50" id="mdReplaceText"></textarea></td></tr></table>')
			.append('<div id="AjaxMdNotReady">Please wait while enumerating uploads ...</div><ul id="AjaxDeletedUploads" style="width:99%; display:none; background:#FCC url(//upload.wikimedia.org/wikipedia/commons/d/d6/User-trash.png) no-repeat scroll center;"></ul><ul id="AjaxMdUlContainer" class="gallery rgallery"></ul>');
 
		var submitButton = $('.ui-dialog-buttonpane button:first');
		var $mdDeleteReason = $('#mdDeleteReason');
 
		$mdDeleteReason.keyup( function (event) {
			if ( ($(this).val().length < 6 ) && o.mdMinLenRequired ) {
				submitButton.addClass('ui-state-disabled');
				$('#mdDelteReasonConfirmation').replaceWith('<span id="mdDelteReasonConfirmation" style="font-weight:bold;">' + o.i18n.mdSpecifyReason + '</span>');
			} else {
				submitButton.removeClass('ui-state-disabled');
				$('#mdDelteReasonConfirmation').replaceWith('<span id="mdDelteReasonConfirmation">' + 
					mw.html.escape($(this).val()) + '</span>'); 
				if ('13' == event.keyCode) submitButton.click();
			}
		});
		$('#mdDeleteHeading').keyup( function (event) { if ('13' == event.keyCode && ($mdDeleteReason.val().length > 5 || !o.mdMinLenRequired)) submitButton.click(); });
		$('#mdTalkNote').keyup( function (event) { if ('13' == event.keyCode && ($mdDeleteReason.val().length > 5 || !o.mdMinLenRequired)) submitButton.click(); });
		$('#AjaxMdIa').change( function (event) {
			var tmpChecked = this.checked;
			$('input[name="mdCheckDelete"]').each(function(index) {
				this.checked = tmpChecked;
			});
		});
		
		this.$AjaxDeletedUploads = $('#AjaxDeletedUploads'); // For later usage to speed up gallery-box creating
		this.$AjaxMdNotReady = $('#AjaxMdNotReady');
		//
		// Event handler for the selection box (task to perform)
		//
		$('#AjaxMdType').change( function (event) {
			var submitButton = $('.ui-dialog-buttonpane button:first');
			if ('del' == $(this).val()) { $('#mdRequestPageTitle').show(); } else { $('#mdRequestPageTitle').hide(); }
			switch ($(this).val()) {
				case 'cv':
				case 'cv-dw':
				case 'cv-fu':
				case 'del':
					o.mdMinLenRequired = true;
					$mdDeleteReason.removeClass('ui-state-disabled');
					$mdDeleteReason.keyup();
					$('#mdTaskForUser').contents().eq(0).replaceWith(o.i18n.mdInsertDeleteReasen);
					$('#mdConfirmationSurrounder').show();
					$('#mdDelteReasonConfirmationLabel').replaceWith('<span id="mdDelteReasonConfirmationLabel">' + o.i18n.mdDelteReasonConfirmationLabel + '</span>');
					$('#mdTalkNoteNode').show();
					$('#mdReplaceTextNode').hide();
					$('#mdReplacePermissionWrapper').hide();
				break;
				case 'otrs':
				case 'other':
					o.mdMinLenRequired = false;
					submitButton.removeClass('ui-state-disabled');
					$mdDeleteReason.removeClass('ui-state-disabled');
					if ( '' == $mdDeleteReason.val() )  $mdDeleteReason.val(o.mdOTRSprefill);
					// For some reason RegExp.$1 will not work in the following line
					if ( /(\d{16})/g.test($mdDeleteReason.val()) ) $mdDeleteReason.val( o.mdOTRSprefill.replace(/\%ID/g, /(\d{16})/g.exec($mdDeleteReason.val())[0]) ); 
					if ( o.mdURLPattern.test($mdDeleteReason.val()) ) $mdDeleteReason.val( o.mdOTRSTicketPrefill.replace(/\%URL/g, $mdDeleteReason.val()) );
					$('#mdTaskForUser').contents().eq(0).replaceWith(o.i18n.mdInsertOther);
					$('#mdConfirmationSurrounder').show();
					$('#mdDelteReasonConfirmationLabel').replaceWith('<span id="mdDelteReasonConfirmationLabel">' + o.i18n.mdInsertConfirmationLabel + '</span>');
					$('#mdTalkNoteNode').hide();
					$('#mdReplaceTextNode').hide();
					$('#mdReplacePermissionWrapper').show();
				break;
				case 'cv-ndw':
				case 'cv-logo':
				case 'np':
				case 'ns':
					o.mdMinLenRequired = false;
					submitButton.removeClass('ui-state-disabled');
					$mdDeleteReason.addClass('ui-state-disabled');
					$('#mdConfirmationSurrounder').hide();
					$('#mdTalkNoteNode').show();
					$('#mdReplaceTextNode').hide();
					$('#mdReplacePermissionWrapper').hide();
				break;
				case 'c_replace':
					o.mdMinLenRequired = false;
					submitButton.removeClass('ui-state-disabled');
					$mdDeleteReason.removeClass('ui-state-disabled');
					$('#mdConfirmationSurrounder').hide();
					$('#mdTalkNoteNode').hide();
					$('#mdTaskForUser').contents().eq(0).replaceWith(o.i18n.mdInsertReplaceMatch);
					$('#mdReplaceTextNode').show();
					$('#mdReplacePermissionWrapper').hide();
				break;
			}
		});
		$('#AjaxMdType').val('del');
		$('#AjaxMdType').change();
		$mdDeleteReason.keyup();
 
 
 
		// cute-selection dialog
		var dlgSelectButtons = {};
		dlgSelectButtons[this.i18n.mdSelectApplyButtonLabel] = function () { 
			var curUpld = '';
			var $curThmb = '';
			var newVal = $('#chkAjaxMdSelect')[0].checked;
			var v_txtAjaxMdSelectCat = $.trim($('#txtAjaxMdSelectCat').val().replace(/^Category\:/, ""));
			var v_txtAjaxMdSelectTitle = $.trim($('#txtAjaxMdSelectTitle').val().replace(/^File\:/, ""));
			if ( '' != v_txtAjaxMdSelectTitle ) v_txtAjaxMdSelectTitle = new RegExp(v_txtAjaxMdSelectTitle, '');
			var v_txtAjaxMdSelectSize = $('#txtAjaxMdSelectSize').val();
			var vl_selAjaxMdSelectSize = ( $('#selAjaxMdSelectSize').val() == 'l' );
			var v_txtAjaxMdSelectDate0 = $('#txtAjaxMdSelectDate0').val();
			if ( '' != v_txtAjaxMdSelectDate0 ) {
				try {
					/(\d\d)-(\d\d)-(\d{4})/.exec(v_txtAjaxMdSelectDate0);
					v_txtAjaxMdSelectDate0 = new Date(RegExp.$3, RegExp.$2, RegExp.$1);
				} catch (ex) { alert('Invalid start-date'); return; }
			}
			var v_txtAjaxMdSelectDate1 = $('#txtAjaxMdSelectDate1').val();
			if ( '' != v_txtAjaxMdSelectDate1 ) {
				try {
					/(\d\d)-(\d\d)-(\d{4})/.exec(v_txtAjaxMdSelectDate1);
					v_txtAjaxMdSelectDate1 = new Date(RegExp.$3, RegExp.$2, RegExp.$1);
				} catch (ex) { alert('Invalid end-date'); return 0; }
			}
 
			for (var upload in o.iUploads) {
				try {
					var isMatch = {};
					curUpld = o.iUploads[upload];
					// yyyy    mm     dd
					/(\d{4})-(\d\d)-(\d\d)T(\d\d:\d\d:\d\d)Z/.exec(curUpld.time);
					curUpldDate = new Date(RegExp.$1, RegExp.$2, RegExp.$3);
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
				} catch (ex) { if ('undefined' != typeof(console)) console.log('Error: ' + err); }
			}
		};
 
		appendCSS('.numbersOnly { text-align:right; }');
 
		var $AjaxMdCuteSelect = $('<div>', { id: 'AjaxMdCuteSelect' } )
		this.mdCuteSelectDlg = $('<div></div>').append($AjaxMdCuteSelect).dialog({
			modal: true,
			closeOnEscape: true,
			position: 'center',
			title: 'Cute-Selection: Specify the options, please',
			height: Math.min($(window).height(), 320),
			width: Math.min($(window).width(), 600),
			buttons: dlgSelectButtons,
			show: 'slide',
			hide: 'fade',
			autoOpen: false
		});
		$AjaxMdCuteSelect
			.append(this.i18n.mdCuteSelectionIntro + '<table><tr><td><label for="chkAjaxMdSelect">' + this.i18n.mdCuteSelectionSelect + '</label></td><td><input type="checkbox" id="chkAjaxMdSelect" value="1" checked=""/></td></tr>' +
			'<tr><td><label for="txtAjaxMdSelectCat">' + this.i18n.mdCuteSelectionInCat + ' </label></td><td><input type="text" id="txtAjaxMdSelectCat" size="40"/> ' + this.i18n.mdCuteSelectionAnd + '</td></tr>' +
			'<tr><td><label for="txtAjaxMdSelectTitle">' + this.i18n.mdCuteSelectionTitle + ' <abbr title="Regular Expression. Example: Tower.+ will select Towers or TowersInSpain but not Tower">(RegExpr)</abbr> </label></td><td><input type="text" id="txtAjaxMdSelectTitle" size="40"/> ' + this.i18n.mdCuteSelectionAnd + '</td></tr>' +
			'<tr><td>' + this.i18n.mdCuteSelectionSize + ' <select size="1" id="selAjaxMdSelectSize"><option value="l">&lt</option><option value="g">&gt</option></select></td><td><input type="text" class="numbersOnly" id="txtAjaxMdSelectSize" size="15"/><label for="txtAjaxMdSelectSize">KBytes</label> ' + this.i18n.mdCuteSelectionAnd + ' </td></tr>' +
			'<tr><td>' + this.i18n.mdCuteSelectionDate + ' </td><td><label for="txtAjaxMdSelectDate0"> ' + this.i18n.mdCuteSelectionBetween + ' </label><input type="text" id="txtAjaxMdSelectDate0" class="dateOnly" size="10" maxlength="10"/><label for="txtAjaxMdSelectDate1"> ' + this.i18n.mdCuteSelectionAnd + ' </label><input type="text" id="txtAjaxMdSelectDate1" class="dateOnly" size="10" maxlength="10"/></td></tr></table>');
 
		$('.numbersOnly').keyup(function () { 
			this.value = this.value.replace(/[^0-9]/g,'');
		});
		$('.dateOnly').keyup(function () { 
			this.value = this.value.replace(/[^0-9\-]/g,'');
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
 
		this.iCurrentIId = -1;     // Last queried file to continue obtaining detail-info
		this.mdSecureCall("mdSendNextQueries");
	},
 
	/**  
	**  Send the next batch of queries. Called by mdGenIGallery (mammoth method above) and mdQueryMore (Query on demand)
	**/
	mdSendNextQueries: function () {
		if (0 == this.mdPendingBatchQueries)  {
			this.mdPendingBatchQueries++;
			for (var upload in this.iUploads) {
				if ((this.iCurrentIId + 1) > this.iUploads[upload].iId) continue;
				var query = {
					action: 'query',
					prop: 'imageinfo|info|revisions|categories',
					rvprop: 'timestamp|content',
					intoken: ('undefined' == typeof(this.edittoken)) ? 'edit' : '',
					iiprop: 'url|size',
					iiurlwidth: 120,
					iiurlheight: 120,
					titles: upload,
					clprop: 'hidden',
					cllimit: 25
				}
				this.doAPICall(query, 'mdQueriedFile'); // Dont use task queue because this is a loop
				this.mdUploadCt++;
				this.iCurrentIId = this.iUploads[upload].iId;
				if ((window.AjaxMassDeleteInterval ? window.AjaxMassDeleteInterval : 30) == this.mdUploadCt) {
					break;
				}
			}
		}
		if (0 === this.mdUploadCt) this.nextTask();
		$('#mdQueryMoreBtn').addClass('ui-state-disabled');
	},
	
	/** Helper function: Creating a gallery box **/
	mdCreateGalleryBox: function (img, txt, height) {
		$ih = $('<div>', { style: 'margin:15px auto;', name: 'mdImageHere' } );
		$th = $('<div>', { 'class': 'gallerytext', name: 'mdTextHere' });
		var $galleryBox = $('<li>', { style: 'width: 155px', 'class': 'gallerybox ronpending' }).append($('<div>', { style: 'width: 155px' }).append($('<div>', { style: 'width: 150px;', 'class': 'thumb'}).css('height', height).append($ih)).append($th));

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
		if ('MD-Error' == this.context || 'MD-postDlg' == this.context) return; // don't try to add something if there was an error.
		var pages = result.query.pages;
		for (var id in pages) { // there should be only one, but we don't know its ID
			this.$AjaxMdNotReady.contents().eq(0).replaceWith('Querying detailed information: ' + (this.mdUploadCt) + 
			' uploads left on this batch of queries. ' + (this.iiUploads) + ' cached uploads current image: ' + pages[id].title); 

			if ('undefined' == typeof(pages[id].imageinfo)) { try { 
				this.$AjaxDeletedUploads.append(this.mdSecureCall("mdCreateDelUploadItem", pages[id].title));
				} catch (e) {} continue; 
			} // The file has been deleted

			/*  Adding a thumbnail to the dialog  */
			this.mdBusy = true;
			this.mdActualResultCount++;
			var cleanPageTitle = mw.html.escape(pages[id].title);
			$galleryBox = this.mdCreateGalleryBox(
				[ $('<a>', { href: pages[id].imageinfo[0].descriptionurl, target: '_blank', 'class': 'image' })
					.append( $('<img>', { src: pages[id].imageinfo[0].thumburl, width: pages[id].imageinfo[0].thumbwidth, height: pages[id].imageinfo[0].thumbheight, alt: pages[id].title }) ) ],
				[ ('<i>' + this.iUploads[pages[id].title].iId + ': </i>'),
				$('<input>', { type: 'checkbox', name: 'mdCheckDelete', value: pages[id].title } ),
				(this.mdSecureCall("mdExtractTags", pages[id].categories) + '<br/>'),
				(cleanPageTitle  + '<br/>'),
				(this.iUploads[pages[id].title].time.replace(/[T|Z]/g, " ") +  '<br/>'),
				(Math.round(pages[id].imageinfo[0].size / 1024) + ' KBytes') ],
				150
			);
			$('#AjaxMdUlContainer').append($galleryBox);
			this.mdBusy = false;
 
 
			if ( 'undefined' != typeof(pages[id].edittoken) && '' != pages[id].edittoken ) { 
				this.edittoken = pages[id].edittoken; } // prevent to assign an empty edit token
			this.iUploads[pages[id].title].content = pages[id].revisions[0]['*']; // save the content for OTRS usage
			this.iUploads[pages[id].title].categories = pages[id].categories;     // save cats for selector
			this.iUploads[pages[id].title].size = pages[id].imageinfo[0].size / 1024; // for selector
		}
		if (0 === this.mdUploadCt) this.nextTask();
	},
 
	/**  
	**  Called when a batch of files has been queried  
	**/
	mdQueryFileDone: function () {
		this.mdBusy = false;
		this.mdPendingBatchQueries--;
		$('#AjaxMdNotReady').hide();
		
		var o = this;
 
		if ( (this.iiUploads > (this.iCurrentIId + 1))  || !this.mdNoMoreFiles) {
			var $mdQueryMore = $('#mdQueryMoreBtn');
			$mdQueryMore.removeClass('ui-state-disabled');
			$('.ui-dialog > .ui-dialog-content').bind("scroll", function() {
				if ( $mdQueryMore.visible().length > 0 ) {
					o.mdSecureCall("mdQueryMore");
				}
			});
		}
		if (!this.mdNoMoreFiles) { // silently run the next upload-list-query in background
			this.mdSecureCall("mdCreateList");
		}
 
		document.body.style.cursor = 'auto';
		if (0 == this.mdActualResultCount) { // If there are no thumbs on the dialog, continue
			if ('MD-RevertImage' != this.context) { // Don't shedule further tasks if called from revert part
				if ("MD" == this.context) alert(this.i18n.mdNoResult.replace("$1", this.mdUser));
				this.mdDlgThumbDlgClose(); // remove the dialog
				if (!this.mdModeCat) this.addTask('mdRvGenOGallery');
				this.addTask('mdExecuteReady');
			}
			this.nextTask();
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
		
		if (0 != this.mdNumberOfExecs || 0 != this.mdListUploadsPending) return; // refuse futher exec request
		if (0 != this.mdPendingBatchQueries) { // call me later
			setTimeout( function () { o.mdExecute() }, 1000);
			return;
		}
		this.mdNumberOfExecs++;
		
		var fAreMultipleFiles = 0;
		$('#AjaxMdContainer').hide();
		$('#AjaxMdContainer').parent().append('<div id="mdWaitContainer">' + this.i18n.mdExecutingTaskEnumerateFiles + this.mdReLoader + '</div>');
 
		$('input[name="mdCheckDelete"]').each(function(index) {
			if (this.checked) {
				o.iUploads[this.value].iId = -2; // Indicate the action will be performed on this file
				fAreMultipleFiles++;
			}
		});
 
		if (0 == fAreMultipleFiles) {
			if ( ('other' != $('#AjaxMdType').val() ) && ('otrs' != $('#AjaxMdType').val()) && (0 < this.ioUploads) ) {
				this.addTask('mdRvGenOGallery');
			}
			this.addTask('mdExecuteReady');
			this.dlg.dialog("close");
			this.nextTask();
			return;
		} else {
			this.mdInsertedTag = true;
		}
 
		this.mdDeleteHeading = this.cleanReason($('#mdDeleteHeading').val());
 
		this.mdTaskToPerform = $('#AjaxMdType').val();
		if ('undefined' != typeof($('#mdDeleteReason').val())) {
			this.reason = ('other' == this.mdTaskToPerform || 'otrs' == this.mdTaskToPerform || 'c_replace' == this.mdTaskToPerform) ? 
				$('#mdDeleteReason').val() : this.cleanReason($('#mdDeleteReason').val());
		} else {
			this.reason = '';
		}
		this.mdReplaceText = $('#mdReplaceText').val();
		this.mdMatchRegExp = $('#mdRRegEx')[0].checked;
		this.mdReplacePermission = $('#mdReplacePermission')[0].checked;
		this.mdTalkNote = $('#mdTalkNote').val();
 
		this.addTask('mdExecuteContinue');
		this.mdDlgThumbDlgClose();
		this.nextTask();
	},
 
	/**  
	**  Dialog has been removed; preparing to perform our edits
	**/
	mdExecuteContinue: function () {
		this.showProgress(this.i18n.mdExecutingTask);
		this.startDate = new Date();
 
		// set up some page names we'll need later
		var mdRequestPage = (this.mdModeCat ? 'Files in ' : 'Files uploaded by ') + this.mdUser;
		this.requestPage =  this.requestPagePrefix + mdRequestPage;
		this.dailyLogPage = this.requestPagePrefix + this.formatDate("YYYY/MM/DD");
 
		var mdUploadCt = 0;
 
		switch (this.mdTaskToPerform) {
			case 'del':
				this.tag = "{{delete|reason=" + this.reason + "|subpage=" + mdRequestPage + this.formatDate("|year=YYYY|month=MON|day=DAY}}\n");
				this.img_summary = 'Nominating for deletion. Tagging performed with [[' + this.mdSelfPath + '|AjaxMassDelete.js]].';
				this.talk_tag = "{\{subst:idw|2=" + mdRequestPage + "|3=plural}}";
				this.talk_summary = "Warning: Some of your [[" + this.requestPage + "|uploads have been nominated for deletion]].";
				// Prepare for createRequestSubpage
				for (var upload in this.iUploads) {
					if ( -2 == this.iUploads[upload].iId )  { this.reason += '\n* [[:' + upload + ']]'; }
				}
				if ( this.mdTalkNote && '' != this.mdTalkNote ) this.talk_tag += '\n\n' + this.mdTalkNote;
				break;
			case 'np':
				this.tag = "{\{subst:npd}}\n";
				this.img_summary = 'Missing permission. Tagging performed with [[' + this.mdSelfPath + '|AjaxMassDelete.js]].';
				this.talk_tag = "{\{subst:image permission|1=%FILE%}} And also for:";
				this.talk_summary = "Please send a permission for [[:%FILE%]] and some other files to [[COM:OTRS|OTRS]]";
				for (var upload in this.iUploads) {
					if ( -2 == this.iUploads[upload].iId )  { 
						if ( 0 == mdUploadCt ) {
							this.talk_tag = this.talk_tag.replace('%FILE%', upload);
							this.talk_summary = this.talk_summary.replace('%FILE%', upload);
						} else {
							this.talk_tag += '\n* [[:' + upload + ']] '; 
						}
						mdUploadCt++;
					}
				}
				if ( this.mdTalkNote && '' != this.mdTalkNote ) this.talk_tag += '\n\n' + this.mdTalkNote;
				break;
			case 'ns':
				this.tag = "{\{subst:nsd}}\n";
				this.img_summary = 'File has no source. Tagging performed with [[' + this.mdSelfPath + '|AjaxMassDelete.js]].';
				this.talk_tag = "{\{subst:image source|1=%FILE%}} And also for:";
				this.talk_summary = "%FILE% does not have a source.";
				for (var upload in this.iUploads) {
					if ( -2 == this.iUploads[upload].iId )  { 
						if ( 0 == mdUploadCt ) {
							this.talk_tag = this.talk_tag.replace('%FILE%', upload);
							this.talk_summary = this.talk_summary.replace('%FILE%', upload);
						} else {
							this.talk_tag += '\n* [[:' + upload + ']] '; 
						}
						mdUploadCt++;
					}
				}
				if ( this.mdTalkNote && '' != this.mdTalkNote ) this.talk_tag += '\n\n' + this.mdTalkNote;
				break;
			case 'cv-ndw':
				this.reason = "This file is under a license that does not allow unrestricted modification. " + 
					"The file is subject to speedy deletion unless it is relicensed according to the [[Commons:Licensing|Commons&nbsp;licensing&nbsp;policy]]."
			case 'cv-logo':
			case 'cv':
			case 'cv-dw':
			case 'cv-fu':
				this.tag = ('cv-logo' == this.mdTaskToPerform) ? "{\{Logo}}\n" : ('cv-dw' == this.mdTaskToPerform) ? "{\{Derivative|1=" + this.reason + "}}\n" : "{\{copyvio|1=" + this.reason + "}}\n";
				this.img_summary = "Marking as possible copyvio because " + (('cv-logo' == this.mdTaskToPerform) ? "this logo exceeds the threshold of originality" : this.reason ) 
					+ " using [[" + this.mdSelfPath + "|VisualFileChange.js]].";
				this.talk_tag = "{\{subst:" + (('cv-fu' == this.mdTaskToPerform) ? "No fair use" : (('cv-dw' == this.mdTaskToPerform) ? "Derivativenote" : "copyvionote")) + "|1=%FILE%}} And also:";
				this.talk_summary = "Notification of possible copyright violations.";
				for (var upload in this.iUploads) {
					if ( -2 == this.iUploads[upload].iId )  { 
						if ( 0 == mdUploadCt ) {
							this.talk_tag = this.talk_tag.replace('%FILE%', upload);
						} else {
							this.talk_tag += '\n* [[:' + upload + ']] '; 
						}
						mdUploadCt++;
					}
				}
				if ( this.mdTalkNote && '' != this.mdTalkNote ) this.talk_tag += '\n\n' + this.mdTalkNote;
				break;
			case 'otrs':
			case 'other':
				this.tag = this.reason;
				this.img_summary = 'Adding [[COM:OTRS|OTRS]] permission or another tag to the permission section using [[' + this.mdSelfPath + '|VisualFileChange.js]].';
			break;
			case 'c_replace':
				this.tag = this.reason;
				this.img_summary = 'Replacing "%pattern%" with "%replace%" using [[' + this.mdSelfPath + '|VisualFileChange.js]].';
			break;
		}
 
		// Task sheduling
 
		// Prepare for notifyUploaders
		this.uploaders = {};
		this.uploaders[this.mdUser] = true;
 
		//First, create deletion page
		if ('del' == this.mdTaskToPerform) 
			this.addTask('mdCreateRequestSubpage');
		if ( ('other' != this.mdTaskToPerform) && ('otrs' != this.mdTaskToPerform) && ('c_replace' != this.mdTaskToPerform) ) {
			this.addTask('mdPrependTemplate');
			if (!this.mdModeCat) this.addTask('notifyUploaders');
		}
		else {
			this.addTask('mdInsertPermission');
		}
		if ('del' == this.mdTaskToPerform) 
			this.addTask('listRequestSubpage');
		if ( ('other' != this.mdTaskToPerform) && ('otrs' != this.mdTaskToPerform) && ('c_replace' != this.mdTaskToPerform) && (0 != this.ioUploads) ) {
			this.addTask('mdRvGenOGallery');
		}
		this.addTask('mdExecuteReady');
		this.nextTask();
	},
 
	mdPrependTemplate: function () {
		try { this.showProgress(this.i18n.addingAnyTemplate); } catch (ex) { }
		this.mdUploadCt = 0;
 
		for (var upload in this.iUploads) {
			if (-2 != this.iUploads[upload].iId) continue;
 
			var page = [];
			page.title = upload;
			page.text = this.tag;
			page.editType = 'prependtext';
			if (window.AjaxDeleteWatchFile) page.watchlist = 'watch';
 
			this.mdUploadCt++;
			this.savePage(page, this.img_summary, 'mdTemplateAdded');
		}
		if (0 === this.mdUploadCt) this.nextTask();
	},
 
	mdInsertPermission: function () {
		try { this.showProgress(this.i18n.addingAnyTemplate); } catch (ex) { }
		this.mdUploadCt = 0;
 
		for (var upload in this.iUploads) {
			if (-2 != this.iUploads[upload].iId) continue;
 
			var page = [];
			page.title = upload;
			page.text = this.iUploads[upload].content;
 
			if ('otrs' == this.mdTaskToPerform) { // drop out other permission templates
				var iCt = 0;
				mdTagLoop:
				for (var id in this.mdTagRemoval) {
					iCt++;
					if (1 == iCt) continue mdTagLoop; // Skip first pattern
					page.text = page.text.replace(this.mdTagRemoval[id][0], '');
				}
			}
			if ('c_replace' != this.mdTaskToPerform) {
				page.text = this.mdSecureCall( "mdInsertOTRS", page.text, this.tag );
			} else {
				if ('' == this.tag) continue;
				this.img_summary = this.img_summary.replace('%pattern%', this.tag).replace('%replace%', this.mdReplaceText);
				var tmpRegEx = this.mdMatchRegExp ? eval(this.tag) : this.tag;
				page.text = page.text.replace(tmpRegEx, this.mdReplaceText);
			}
 
			page.text = page.text.replace('== Summary ==', '== {{int:summary}} ==')
				.replace('== Licensing ==', '== {{int:license-header}} ==').replace('== License ==', '== {{int:license-header}} ==').replace('== Lizenz ==', '== {{int:license-header}} ==');
 
			page.editType = 'text';
			if (window.AjaxDeleteWatchFile) page.watchlist = 'watch';
 
			if (this.iUploads[upload].content != page.text) {
				this.mdUploadCt++;
				this.savePage(page, this.img_summary, 'mdTemplateAdded');
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
		var page = [];
		page.title = this.requestPage;
		page.text = "\n\n=== " + this.mdDeleteHeading + " ===\n\n" + this.reason + "\n~~" + "~~\n";
		page.watchlist = 'watch';
		page.editType = 'appendtext';
 
		this.showProgress(this.i18n.creatingNomination);
 
		this.savePage(page, 'Starting mass deletion request using [[' + this.mdSelfPath + '|VisualFileChange.js]]', 'nextTask');
	},
 
	mdTemplateAdded: function (result) {
		this.showProgress(this.i18n.addingAnyTemplate + result.edit.title);
		this.mdUploadCt--;
		if (0 === this.mdUploadCt) this.nextTask();
	},
 
	/**
	** II. REVERT PART
	**
	**/
	mdRvGenOGallery: function () {
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
			close: this.mdDlgThumbDlgClose
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
		this.progressDialog.remove();
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
			if (0 == rvMatrix.length || 'object' != typeof(rvMatrix[0]) || rvMatrix[0].user != this.mdUser) { 
				this.mdRvAllFilesQueried();
				return;
			}
			for (var rv in rvMatrix) {
				if (rvMatrix[rv].user != this.mdUser) { // Find the first revision of another user
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
			wpComment: 'Reverting this image to previous revision of ' + this.oUploads[title].preVandalUser + ' using [[' + this.mdSelfPath + '|AjaxMassDelete.js]]'
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
		if (this.progressDialog) this.progressDialog.remove();
 
		this.context = "QD";
 
		if ( this.mdInsertedTag ) {
			if ('del' == this.mdTaskToPerform) {
				// navigating to the new created deletion request
				var encTitle = this.requestPage;
				encTitle = encodeURIComponent(encTitle.replace(/ /g, '_')).replace(/%2F/ig, '/').replace(/%3A/ig, ':');
				location.href = mw.config.get('wgServer') + mw.config.get('wgArticlePath').replace("$1", encTitle);
			}
			else if (-1 == mw.config.get('wgNamespaceNumber') && ( 'c_replace' != this.mdTaskToPerform && 'OTRS' != this.mdTaskToPerform && 'other' != this.mdTaskToPerform )) {
				// navigating to the user-discussion-page
				var encTitle = this.userTalkPrefix + this.mdUser;
				encTitle = encodeURIComponent(encTitle.replace(/ /g, '_')).replace(/%2F/ig, '/').replace(/%3A/ig, ':');
				location.href = mw.config.get('wgServer') + mw.config.get('wgArticlePath').replace("$1", encTitle);
			} else {
				this.reloadPage();
			}
		}
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
				if (x.status < 200) return this.showProgress(status);
				
				o.mdSecureCall(callback, result);
			},
			error: function (x, status, error) {
				return o.fail("API request returned code " + x.status + " " + status + "Error code is " + error);
			}
		});
	},
 
	/**
	** Overwrite the crude error handler.
	** Has to become updated if AjaxQuickDelete is updated
	**/
	fail: function (err) {
		document.body.style.cursor = 'auto';
		if ('undefined' != typeof(console)) console.log('Error: ' + err);
		var msg = this.i18n.taskFailure[this.currentTask] || this.i18n.genericFailure;
 
		var reportPage = '';
		this.mdBusy = false; // Prevents that our mdDlgThumbDlgClose will be refused
 
		if ( 'MD' == this.context || 'MD-RevertImage' == this.context || 'MD-postDlg' == this.context ) {
			reportPage = this.mdErrReportPath;
			fix = '';
 
			this.mdDlgThumbDlgClose();
			this.showProgress(this.i18n.genericFailure);
			this.context = 'MD-Error';
			$('.ui-dialog-titlebar').show();
		} else {
			//TODO: Needs cleanup
			if (this.img_summary == 'Nominating for deletion') fix = (this.templateAdded ? this.i18n.completeRequestByHand : this.i18n.addTemplateByHand);
			else fix = '';
			reportPage = "MediaWiki_talk:AjaxQuickDelete";
		}
 
		$('#feedbackContainer').html(msg + ' ' + fix + '<br>' + this.i18n.errorDetails + '<br>' + err + '<br><a href="' + mw.config.get('wgServer') + '/wiki/' + reportPage + '">' + this.i18n.errorReport + '</a>');
		$('.ui-dialog-content').height('auto');
		$('.ui-dialog').addClass('ajaxDeleteError');
		// This funny construct is necessary: 
		// 1. o because this-pointer in set-timeout is altered
		// 2. annonymous function to prevent that the code is immediatly executed (browser would "think" to obtain the value of reloadPage())
		var o = this;
		if (this.templateAdded) setTimeout(function () { o.reloadPage() }, 5000); 
	},
	
	/**
	** Method to catch errors and report where they occured
	**/
	mdSecureCall: function(stFunction) {
		var o = this;
		try {
			this.currentTask = o.mdSecureCall.arguments[0];
			return this[stFunction].apply(this, Array.prototype.slice.call(o.mdSecureCall.arguments, 1)); // arguments is not of type array so we can't just write arguments.slice
		} catch (ex) {
			o.fail(ex);
		}
	},
 
	mdTagRemoval: [
		[/\{\{[Oo]TRS[ _][Pp]ending[^\}\n]*\}\}/g],
		[/\{\{[Oo]TRS[ _][Rr]eceived\|.*\}\}/g],
		[/\{\{[Nn]o[ _]license[^\}\n]*\}\}/g],
		[/\{\{[Nn]o[ _]permission[^\}\n]*\}\}/g],
		[/\{\{[Nn]o[ _]OTRS[ _]permission[^\}\n]*\}\}/g],
		[/\{\{[Nn]o[ _]source[ _]since\|.*\}\}/g],
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
		[/Valid SVG/, ''], [/Translation possible/, ''], [/License[- _]migration redundant/, ''], [/Retouched pictures/, ''], [/Extracted images/, ''], [/Images with annotations/, ''], [/Media needing category/, ''], [/requiring review/, ''], [/[Flickr|License] review needed/, ''], [/[Aa]dmin[- ]reviewed/, ''], [/UploadWizard/, ''], [/OTRS[- _]received/, ''], [/Items[- _]with[- _]OTRS[- _]permission/, ''], [/OTRS[- _]pending/, ''], [/Media with locations/, ''], [/Media missing/, ''], [/Media without a/, ''],
	],
 
	mdOTRSprefill: "{{PermissionOTRS|id=%ID|\~\~\~\~}} {{OTRS received|id=%ID|reason=processing, nonfree, email}}",
	mdOTRSTicketPrefill: "{{PermissionOTRS|ticket=%URL|\~\~\~\~}} {{OTRS received|ticket=%URL|reason=processing, nonfree, email}}",
	mdPermissionPattern: /(\|Permission\s*\=)/i,
	mdURLPattern: /(https:\/\/\S*)/,
	mdSelfPath: 'User:Rillke/AjaxMassDelete.js',
	mdErrReportPath: 'User_talk:Rillke/AjaxMassDelete.js',
	mdUserPrefix: mw.config.get('wgFormattedNamespaces')[2] + ":",
	mdContribPrefix: mw.config.get('wgFormattedNamespaces')[-1] + ":Contributions/",
	mdReLoader: '<p align="center"><img src="//upload.wikimedia.org/wikipedia/commons/c/ce/RE_Ajax-Loader.gif"/></p>',
 
	/** REVISION CONTROL **/ //(x.major.minor.bug)
	mdScriptRevision: '0.3.5.4',
 
   // Translatable strings - they will be merged into AjaxQuickDelete (Objects)
	i18n: {
		mdPerformOnWhichUser:  "What user or category is this action about? Please insert Category:-prefix if it's a cat.",
		mdWaitingApiRes: "Waiting for API response list.",
		mdSortingAPIres: "Sorting API results.",
		mdTryToObtainUser: "Trying to guess which user this task will be about.",
		mdDisselectAll: " (Dis-)select&nbsp;all:&nbsp;",
		mdInsertDeleteReasen: "Select the files to delete and fill in the reason, please",
		mdInsertDeleteHeading: "Insert the heading for the mass deletion request, please",
		mdInsertOther: "Please insert the OTRS (or other) text to add to the permission section",
		mdReplacePermissionText: "Clean permission-section?",
		mdCustomReplaceText: "Please insert the text that should be inserted instead",
		mdInsertTalkNote: "Please enter a note to add to the user\'s talk-page",
		mdInsertReplaceMatch: "What text should become replaced on the selected files?",
		mdDelteReasonConfirmationLabel: "Your provided reason to delete is",
		mdInsertConfirmationLabel: "Your provided tag to insert in the permission section is",
		mdSpecifyReason: "Please specify a reason with at least 6 letters.",
		mdMore: "more",
		mdNoResult: "Script cannot find any file / initial upload in / by $1.",
		mdCuteSelectionAnd: "AND",
		mdCuteSelectionIntro: "The selection of matching and loaded files will be changed. If you want to apply changes, click on the button in the bottom. To close this dialog, click on the cross in the top right corner. Specify what to (dis-)select, empty fields are considered fulfilling the condition:",
		mdCuteSelectionSelect: "Select (/Disselect)",
		mdCuteSelectionInCat: "In Category",
		mdCuteSelectionTitle: "Title matches",
		mdCuteSelectionSize: "Size",
		mdCuteSelectionDate: "Date (DD-MM-YYYY)",
		mdCuteSelectionBetween: "between",
		mdExecutingTaskEnumerateFiles: "Enumerating files for the requested task.",
		mdExecutingTask: "Executing your requested task.",
		mdSelectButtonLabel: "Select",
		mdDelContribsButtonLabel: "Toggle cached deleted uploads",
		mdSelectApplyButtonLabel: "Apply to selection",
		mdRevertButtonLabel: "Revert images",
 
		mdCopyvio: "Copyvio",
		mdCopyvioDerative: "Copyvio derivative",
		mdCopyvioFairUse: "Copyvio fair-use",
		mdCopyvioLogo: "Copyvio sophisticated logo",
		mdCopyvioND: "Copyvio derivative prohib",
		mdDelete: "Nominate for deletion",
		mdNoPermission: "No permission",
		mdNoSource: "No source",
		mdOtrsAdd: "OTRS- add",
		mdOtrsRmTags: "OTRS- remove tags",
		mdCustomReplace: "custom replace",
 
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
			mdCreateGalleryBox: "While creating the HTML for a gallerybox, an error occured.",
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
			mdTemplateAdded: "An error occurred after a template has been added to a description page.",
			mdRvGenOGallery: "An error occurred setting up the selection-revert dialog.",
			mdRvQueriedFile: "An error occurred after gathering revert-file information and inserting them into the dialog.",
			mdRvCreateImgRevisionMatrix: "An error occurred trying to obtain image revisions.",
			mdRvEvalSelction: "An error occurred processing selected files.",
			mdRevertImage: "There was an error before or while posting the revert-request.",
			mdReverted: "An error occurred after posting the revert-request."
		}
	}
};
 
// Load this script in special-namespace, too.
if (!window.AjaxDeleteOptOut  && -1 == mw.config.get('wgNamespaceNumber')) {
	importScript('MediaWiki:AjaxQuickDelete.js');
}
 
/*if (wgUserLanguage != 'en') importScript('MediaWiki:AjaxMassDelete.js/' + wgUserLanguage);*/
mediaWiki.loader.using('jquery.ui.dialog', function () {
	$(document).ready(function () {
		this.context = "QD";
		//$.extend( [ deep ], target, object1, [ objectN ] )
		$.extend( true, AjaxQuickDelete, AjaxMassDelete ) // merge the content into AjaxQuickDelete-Object; returnvalue is the merged object but AjaxQuickDelete is also modified
		AjaxQuickDelete.mdInstall();
		try {
			AjaxQuickDelete.mdErrorsReportPath = mw.config.get('wgServer') + mw.config.get('wgArticlePath').replace("$1", AjaxQuickDelete.userTalkPrefix) + 'Rillke';
			AjaxQuickDelete.mdHelpNode =  '<a href="' + mw.config.get('wgServer') + mw.config.get('wgArticlePath').replace("$1", AjaxQuickDelete.userTalkPrefix) + 'Rillke/AjaxMassDelete.js" target="_blank"><img title="Help and known issues." alt="?" src="//upload.wikimedia.org/wikipedia/commons/4/45/GeoGebra_icon_help.png"></a> ';
			delete AjaxMassDelete; // Destroy this object
		} catch (ex) {
			AjaxMassDelete = {};
		}
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
    jq = jQuery;
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
                var vp = jq(p[i]), v = { 
                    t: vp.scrollTop(),
                    b: vp.scrollTop() + vp.height(),
                    l: vp.scrollLeft(),
                    r: vp.scrollLeft() + vp.width()
                }, el = jq(elem), e = {
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