// This script depends on AjaxQuickDelete. It helps performing mass-changes on the contributions of a paricular user.
// It was composed by [[User:Rillke]] in 2011; a lot of code stolen from commons:MediaWiki:AjaxQuickDelete.js
// <nowiki>
// TODO if version 1.18 ready, add possibility to revert all images
//   http://svn.wikimedia.org/viewvc/mediawiki/trunk/phase3/includes/api/ApiFileRevert.php?view=log
//   action=filerevert&filename=File:MassDeleteOTRS.png&comment=TestingBryanTongMinhRevert&archivename=20110429234711!Wiki.png&token=+\\
// TODO obtain images from thumb.php as this would be much faster
//   Problem: Animated GIFs and some PNGs
// TODO AJAX userlist-dropdown / verification

if (typeof(AjaxMassDelete) == 'undefined') {
 
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
			// Set up toolbox link
			if (mw.config.get('wgNamespaceNumber') != 14) addPortletLink('p-tb', 'javascript:AjaxQuickDelete.mdStartMd();', "Perform batch task", 't-AjaxQuickDeletx2', null);
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
							var userTarget = "Special:Contributions/"
							var pPrefix = location.href.indexOf(userTarget);
 
							if ( -1 == pPrefix ) break;
							this.uploaders[location.href.slice( pPrefix + userTarget.length, location.href.length )] = true;
 
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
		}
		this.addTask('mdContinue');
		this.nextTask();
	},
 
   findOriginalUploader: function () {
	 var query = {
		action: 'query',
		prop: 'imageinfo|revisions|info',
		rvprop: 'content|timestamp',
		intoken: 'edit',
		iiprop: 'user|sha1|comment',
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
		this.addTask('mdFindUploads');
		this.addTask('mdGenIThumbs');
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
 
		if (typeof( 'undefined' != this.uploaders )) {
			for (var user in this.uploaders) {
				pefilledUser = user;
			}
		}
		if ( '' == pefilledUser ) { pefilledUser = mw.config.get('wgUserName'); }
		if ( 'undefined' != typeof(this.progressDialog) ) { this.progressDialog.remove(); }
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
	**/
	mdFindUploads: function () {
		if ('' == this.mdUser) this.mdUser = this.reason; // WARNING: INPUT IS UNCHECKED
		if (this.context != 'MD') return;
		if (this.mdListUploadsPending > 0) { // If there are queries pendig continue later
			var o = this;
			setTimeout(function () { o.mdFindUploads() }, 200); // See me later ...
			return true;
		}
		this.mdListUploadsPending++;
		var query = {
			action: 'query',
			list: 'logevents',
			leprop: 'title|type|timestamp',
			letype: 'upload',
			leuser: this.mdUser,
			lelimit: (window.AjaxMassDeleteInterval ? window.AjaxMassDeleteInterval : 30) * 2,
			lestart: this.mdLestart
		};
		if (!this.dlg) this.showProgress(this.i18n.mdWaitingApiRes);
		this.doAPICall(query, 'mdFindUploadsCB');
	},
 
	mdFindUploadsCB: function (result) {
		this.mdListUploadsPending--;
		if ( !this.dlg && ('' == this.mdLestart) ) this.showProgress(this.i18n.mdSortingAPIres);
		var allFileChanges = result.query.logevents;
		for (var id in allFileChanges) { // loop through all filechanges
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
 
	/**  
	**  Method to securely close (you may call it "nuke") the dialog, even if there were errors; called on button cancel and by several methods
	**/
 	mdDlgThumbDlgClose: function () {
		if ( AjaxQuickDelete.mdBusy ) {     // Call myself later if script is busy
			setTimeout(AjaxQuickDelete.mdDlgThumbDlgClose(), 10);
			return true;
		}
		if ('object' == typeof(AjaxQuickDelete.dlg)) {
			AjaxQuickDelete.dlg.dialog("destroy");
			AjaxQuickDelete.dlg.remove();
			document.body.style.cursor = 'auto';
			AjaxQuickDelete.context = 'MD-postDlg';
			try {
				delete AjaxQuickDelete.dlg;
			}
			catch (ex) {
				AjaxQuickDelete.dlg = 0;
			}
		} else if ( 'AjaxMdContainer' == $(this).children('div').eq(0).attr('id') ) {
			this.dialog("destroy");
			this.parent.remove();
			document.body.style.cursor = 'auto';
			AjaxQuickDelete.context = 'MD-postDlg';
		}
	},
 
	/**  
	**  Mammoth method to set up and manage the UserInterface (UI)
	**/
	mdGenIThumbs: function () {
		this.mdUploadCt = 0;              // Number of pending API queries
		this.mdActualResultCount = 0;     // Doesn't include reverts and deleted media
		this.mdPendingBatchQueries = 0;   // Number of batches currently on query; should be max. 1
		this.mdNumberOfExecs = 0;         // Is Execute called already?
 
		/*  The UI  */
		this.progressDialog.remove();
 
		this.mdMinLenRequired = true;     // Is a reason required?
 
		var dlgButtons = {};
		dlgButtons[this.i18n.submitButtonLabel] = function () {
			try {
				AjaxQuickDelete.mdExecute();
			} catch (ex) {
				AjaxQuickDelete.fail(ex);
			}
		};
		dlgButtons[this.i18n.cancelButtonLabel] = function () {
			$(this).dialog("close");
		};
		this.mdDlgThumbDlgClose();        // Are there Contaminated Sites? Remove them now.
		this.dlg = $('<div></div>').html('<div id="AjaxMdContainer"></div>').dialog({
			modal: true,
			closeOnEscape: true,
			position: 'center',
			dialogClass: "wikiEditor-toolbar-dialog",
			title: 'Batch Surgery Script v.' + this.mdScriptRevision + 
				' Report bugs and ideas to <a href="' + this.mdErrorsReportPath + '" target="_blank">Rillke</a>. ' + 
				'Action:&nbsp;<select size="1" id="AjaxMdType">' +
				'<option value="cv">' + this.i18n.mdCopyvio + '</option><option value="cv-dw">' + this.i18n.mdCopyvioDerative + '</option><option value="cv-fu">' + this.i18n.mdCopyvioFairUse + '</option><option value="cv-logo">' + this.i18n.mdCopyvioLogo + '</option><option value="cv-ndw">' + this.i18n.mdCopyvioND + '</option>' + 
				'<option value="del" selected="selected">' + this.i18n.mdDelete + '</option><option value="np">' + this.i18n.mdNoPermission + '</option><option value="ns">' + this.i18n.mdNoSource + '</option>' + 
				'<option value="other">' + this.i18n.mdOtrsAdd + '</option><option value="otrs">' + this.i18n.mdOtrsRmTags + '</option>' + 
				'<option value="c_replace">' + this.i18n.mdCustomReplace + '</option>' +
				'</select>' + 
				' (Dis-)select&nbsp;all:&nbsp;<input type="checkbox" id="AjaxMdIa" value="1"/>',
			height: $(window).height() * 0.97,
			width: $(window).width() * 0.99,
			buttons: dlgButtons,
			close: this.mdDlgThumbDlgClose,
			resizeStop: function(event, ui) { $('.ui-dialog > .ui-dialog-content').eq(0).scroll(); } // Fire scroll evt on resize for (continue query if btn gets visible)
		});
 
 
		if (!this.dlg) return 0;
		$('.ui-dialog-buttonpane').prepend(
			'<span id="mdConfirmationSurrounder" style="display:inline"><span id="mdDelteReasonConfirmationLabel">' + this.i18n.mdDelteReasonConfirmationLabel +
			'</span>: <span id="mdDelteReasonConfirmation">' + this.i18n.mdSpecifyReason + '</span></span>');
		$('#AjaxMdContainer').append('Initally uploaded files by -' + 
			'<a href="' + mw.config.get('wgServer') + mw.config.get('wgArticlePath').replace("$1", AjaxQuickDelete.userTalkPrefix) + this.mdUser + '" target="_blank">' + this.mdUser +'</a>-. ' + 
			'<label id="mdTaskForUser" for="mdDeleteReason">' + this.i18n.mdInsertDeleteReasen + '</label>: <input type="text" id="mdDeleteReason" style="width: 70%;"/>' + 
			'<span id="mdReplacePermissionWrapper"><input type="checkbox" id="mdReplacePermission"/><label for="mdReplacePermission"> ' + this.i18n.mdReplacePermissionText + '</label></span>')
			.append('<table width="100%"><tr id="mdRequestPageTitle"><td><label for="mdDeleteHeading">' + this.i18n.mdInsertDeleteHeading + ': </label></td>' + 
				'<td width="70%"><input type="text" id="mdDeleteHeading" style="width: 99%;" value="' + 
				'Files uploaded by [[' + this.mdUserPrefix + this.mdUser + '|' + this.mdUser + ']] ' + 
				'([[' + this.userTalkPrefix + this.mdUser + '|talk]] &#x00B7; [[' + this.mdContribPrefix + this.mdUser + '|contribs]])' + '"/></td></tr>' +
				'<tr id="mdTalkNoteNode"><td><label for="mdTalkNote">' + this.i18n.mdInsertTalkNote + ': </label></td>' + 
				'<td width="70%"><input type="text" id="mdTalkNote" style="width: 99%;" value="' + 
					(window.AjaxMassDeleteUserNote ? window.AjaxMassDeleteUserNote : 'Yours sincerely') + '"/></td></tr>' +
				'<tr id="mdReplaceTextNode"><td><label for="mdRRegEx">RegExp?</label><input type="checkbox" id="mdRRegEx"/><br>' + 
				'<label for="mdReplaceText">' + this.i18n.mdCustomReplaceText + ': </label></td>' + 
				'<td width="70%"><textarea rows="3" cols="50" id="mdReplaceText"></textarea></td></tr></table>')
			.append('<div id="AjaxMdNotReady">Please wait while enumerating uploads ...</div><ul id="AjaxMdUlContainer" class="gallery"></ul>');
 
		var submitButton = $('.ui-dialog-buttonpane button:first');
		var $mdDeleteReason = $('#mdDeleteReason');
		
		$mdDeleteReason.keyup( function (event) {
			if ( ($(this).val().length < 6 ) && AjaxQuickDelete.mdMinLenRequired ) {
				submitButton.addClass('ui-state-disabled');
				$('#mdDelteReasonConfirmation').replaceWith('<span id="mdDelteReasonConfirmation" style="font-weight:bold;">' + AjaxQuickDelete.i18n.mdSpecifyReason + '</span>');
			} else {
				submitButton.removeClass('ui-state-disabled');
				$('#mdDelteReasonConfirmation').replaceWith('<span id="mdDelteReasonConfirmation">' + 
					$(this).val().replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/'/g, '&#x0027;').replace(/"/g, '&quot;').replace(/&/g, '&amp;') + '</span>');
				if ('13' == event.keyCode) submitButton.click();
			}
		});
		$('#mdDeleteHeading').keyup( function (event) { if ('13' == event.keyCode && ($mdDeleteReason.val().length > 5 || !AjaxQuickDelete.mdMinLenRequired)) submitButton.click(); });
		$('#mdTalkNote').keyup( function (event) { if ('13' == event.keyCode && ($mdDeleteReason.val().length > 5 || !AjaxQuickDelete.mdMinLenRequired)) submitButton.click(); });
		$('#AjaxMdIa').change( function (event) {
			var tmpChecked = this.checked;
			$('input[name="mdCheckDelete"]').each(function(index) {
				this.checked = tmpChecked;
			});
		});
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
					AjaxQuickDelete.mdMinLenRequired = true;
					$mdDeleteReason.removeClass('ui-state-disabled');
					$mdDeleteReason.keyup();
					$('#mdTaskForUser').contents().eq(0).replaceWith(AjaxQuickDelete.i18n.mdInsertDeleteReasen);
					$('#mdConfirmationSurrounder').show();
					$('#mdDelteReasonConfirmationLabel').replaceWith('<span id="mdDelteReasonConfirmationLabel">' + AjaxQuickDelete.i18n.mdDelteReasonConfirmationLabel + '</span>');
					$('#mdTalkNoteNode').show();
					$('#mdReplaceTextNode').hide();
					$('#mdReplacePermissionWrapper').hide();
				break;
				case 'otrs':
				case 'other':
					AjaxQuickDelete.mdMinLenRequired = false;
					submitButton.removeClass('ui-state-disabled');
					$mdDeleteReason.removeClass('ui-state-disabled');
					if ( '' == $mdDeleteReason.val() )  $mdDeleteReason.val(AjaxQuickDelete.mdOTRSprefill);
					// For some reason RegExp.$1 will not work in the following line
					if ( /(\d{16})/g.test($mdDeleteReason.val()) ) $mdDeleteReason.val( AjaxQuickDelete.mdOTRSprefill.replace(/\%ID/g, /(\d{16})/g.exec($mdDeleteReason.val())[0]) ); 
					if ( AjaxQuickDelete.mdURLPattern.test($mdDeleteReason.val()) ) $mdDeleteReason.val( AjaxQuickDelete.mdOTRSTicketPrefill.replace(/\%URL/g, $mdDeleteReason.val()) );
					$('#mdTaskForUser').contents().eq(0).replaceWith(AjaxQuickDelete.i18n.mdInsertOther);
					$('#mdConfirmationSurrounder').show();
					$('#mdDelteReasonConfirmationLabel').replaceWith('<span id="mdDelteReasonConfirmationLabel">' + AjaxQuickDelete.i18n.mdInsertConfirmationLabel + '</span>');
					$('#mdTalkNoteNode').hide();
					$('#mdReplaceTextNode').hide();
					$('#mdReplacePermissionWrapper').show();
				break;
				case 'cv-ndw':
				case 'cv-logo':
				case 'np':
				case 'ns':
					AjaxQuickDelete.mdMinLenRequired = false;
					submitButton.removeClass('ui-state-disabled');
					$mdDeleteReason.addClass('ui-state-disabled');
					$('#mdConfirmationSurrounder').hide();
					$('#mdTalkNoteNode').show();
					$('#mdReplaceTextNode').hide();
					$('#mdReplacePermissionWrapper').hide();
				break;
				case 'c_replace':
					AjaxQuickDelete.mdMinLenRequired = false;
					submitButton.removeClass('ui-state-disabled');
					$mdDeleteReason.removeClass('ui-state-disabled');
					$('#mdConfirmationSurrounder').hide();
					$('#mdTalkNoteNode').hide();
					$('#mdTaskForUser').contents().eq(0).replaceWith(AjaxQuickDelete.i18n.mdInsertReplaceMatch);
					$('#mdReplaceTextNode').show();
					$('#mdReplacePermissionWrapper').hide();
				break;
			}
		});
		$('#AjaxMdType').val('del');
		$('#AjaxMdType').change();
		$mdDeleteReason.keyup();
 
		var $queryMore = $('<div>', {
			id: "mdQueryMore",
			align: "center"
		});
		$queryMore.append('<button id="mdQueryMoreBtn" class="ui-button ui-widget ui-state-default ui-corner-all ui-button-text-only ui-state-disabled" type="button" role="button" aria-disabled="false"><span class="ui-button-text">' + this.i18n.mdMore + '&gt;&gt;</span></button>');
		$('#AjaxMdContainer').append($queryMore).append('<div style="height:100px">&nbsp;</div>');
		$('#mdQueryMoreBtn').click( function (event) { AjaxQuickDelete.mdQueryMore(); });
		/* End of UI */
 
		this.iCurrentIId = -1;     // Last queried file to continue obtaining detail-info
		this.mdSendNextQueries();
	},
 
	/**  
	**  Send the next batch of queries. Called by mdGenIThumbs (mammoth method above) and mdQueryMore (Query on demand)
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
					clprop: 'hidden'
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
 
	/**  
	**  API-Call-back method to eval the queried file and add a thumb
	**/
	mdQueriedFile: function (result) {
		this.mdUploadCt--;
		if ('MD-Error' == this.context || 'MD-postDlg' == this.context) return; // don't try to add something if there was an error.
		var pages = result.query.pages;
		for (var id in pages) { // there should be only one, but we don't know its ID
			try {
			$('#AjaxMdNotReady').contents().eq(0).replaceWith('Querying detailed information: ' + (this.mdUploadCt) + 
			' uploads left on this batch of queries. ' + (this.iiUploads) + ' cached uploads current image: ' + pages[id].title); 
			} catch (ex) {}
			if ('undefined' == typeof(pages[id].imageinfo)) continue; // The file has been deleted
 
			/*  Adding a thumbnail to the dialog  */
			this.mdBusy = true;
			this.mdActualResultCount++;
			$('#AjaxMdUlContainer').append(this.mdThumbHTMLpre +
				'<a class="image" href="' + pages[id].imageinfo[0].descriptionurl + '" target="_blank">' +
				// '<img src="http://commons.wikimedia.org/w/thumb.php?f=' + pages[id].title.replace('File:', '') + '&width=120&height=120" alt="' + pages[id].title + '">'
				'<img src="' + pages[id].imageinfo[0].thumburl + '" width="' + pages[id].imageinfo[0].thumbwidth + '" height="' + pages[id].imageinfo[0].thumbheight + '" alt="' + pages[id].title + '">' +
				'</a></div></div><div class="gallerytext"><i>' + this.iUploads[pages[id].title].iId + ': </i>' + 
				'<input type="checkbox" name="mdCheckDelete" value="' + pages[id].title + '"> ' + 
				this.mdExtractTags( pages[id].categories ) + '<br/>' + 
				pages[id].title + '<br/>' + 
				this.iUploads[pages[id].title].time.replace(/[T|Z]/g, " ") +  '<br/>' + 
				Math.round(pages[id].imageinfo[0].size / 1024) + ' KBytes</div></div></li>');
			this.mdBusy = false;
 
 
			if ( 'undefined' != typeof(pages[id].edittoken) && '' != pages[id].edittoken ) { 
				this.edittoken = pages[id].edittoken; } // prevent to assign an empty edit token
			this.iUploads[pages[id].title].content = pages[id].revisions[0]['*']; // save the content for OTRS usage
			this.iUploads[pages[id].title].categories = pages[id].categories;     // save cats for selector (not implemented yet)
			
		}
		if (0 === this.mdUploadCt) this.nextTask();
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
					console.log(this.mdLicenseRecognization[id][0] + ".test(" + thiscat + ")");
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
				if ( this.mdTagRecognization[id][0].test(thiscat) ) {
					if ('' != this.mdTagRecognization[id][1]) mdTags += '<abbr title="' + thiscat.replace('Category:', '') + '">' + this.mdTagRecognization[id][1] + '</abbr> ';
					continue catloop2;
				}
			}
		}
		mdTags+= '</span>';
 
		return mdTags;
	},
 
	/**  
	**  Called when a batch of files has been queried  
	**/
	mdQueryFileDone: function () {
		this.mdBusy = false;
		this.mdPendingBatchQueries--;
		$('#AjaxMdNotReady').hide();
 
		if ( (this.iiUploads > (this.iCurrentIId + 1))  || !this.mdNoMoreFiles) {
			var $mdQueryMore = $('#mdQueryMoreBtn');
			$mdQueryMore.removeClass('ui-state-disabled');
			$('.ui-dialog > .ui-dialog-content').bind("scroll", function() {
				if ( $mdQueryMore.visible().length > 0 ) {
					AjaxQuickDelete.mdQueryMore();
				}
			});
		}
		if (!this.mdNoMoreFiles) { // silently run the next upload-list-query in background
			this.mdFindUploads();
		}
 
		document.body.style.cursor = 'auto';
		if (0 == this.mdActualResultCount) { // If there are no thumbs on the dialog, continue
			if ('MD-RevertImage' != this.context) { // Don't shedule further tasks if called from revert part
				this.mdDlgThumbDlgClose(); // remove the dialog
				this.addTask('mdRvGenOThumbs');
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
			this.mdSendNextQueries();
		}
	},
 
	/**  
	**  Reads user's input to the thumbnail-dialog 
	**/
	mdExecute: function () {
		if (0 != this.mdNumberOfExecs || 0 != this.mdListUploadsPending) return; // refuse futher exec request
		if (0 != this.mdPendingBatchQueries) { // call me later
			var o = this;
			setTimeout( function () { o.mdExecute() }, 1000);
			return;
		}
		this.mdNumberOfExecs++;
 
		var fAreMultipleFiles = 0;
		$('#AjaxMdContainer').hide();
		$('#AjaxMdContainer').parent().append('<div id="mdWaitContainer">' + this.i18n.mdExecutingTaskEnumerateFiles + this.mdReLoader + '</div>');
 
		$('input[name="mdCheckDelete"]').each(function(index) {
			if (this.checked) {
				AjaxQuickDelete.iUploads[this.value].iId = -2; // Indicate the action will be performed on this file
				fAreMultipleFiles++;
			}
		});
 
		if (0 == fAreMultipleFiles) {
			if ( ('other' != $('#AjaxMdType').val() ) && ('otrs' != $('#AjaxMdType').val()) && (0 < this.ioUploads) ) {
				this.addTask('mdRvGenOThumbs');
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
		var mdRequestPage = 'Files uploaded by ' + this.mdUser;
		this.requestPage = this.requestPagePrefix + mdRequestPage;
		this.dailyLogPage = this.requestPagePrefix + this.formatDate("YYYY/MM/DD");
 
		var mdUploadCt = 0;
 
		switch (this.mdTaskToPerform) {
			case 'del':
				this.tag = "{{delete|reason=" + this.reason + "|subpage=" + mdRequestPage + this.formatDate("|year=YYYY|month=MON|day=DAY}}\n");
				this.img_summary = 'Nominating for deletion. Tagging performed with [[' + AjaxQuickDelete.mdSelfPath + '|AjaxMassDelete.js]].';
				this.talk_tag = "{\{subst:idw|2=" + mdRequestPage + "|3=plural}}";
				this.talk_summary = "Warning: Some of your images have been nominated for deletion.";
				// Prepare for createRequestSubpage
				for (var upload in this.iUploads) {
					if ( -2 == this.iUploads[upload].iId )  { this.reason += '\n* [[:' + upload + ']]'; }
				}
				if ( this.mdTalkNote && '' != this.mdTalkNote ) this.talk_tag += '\n\n' + this.mdTalkNote;
				break;
			case 'np':
				this.tag = "{\{subst:npd}}\n";
				this.img_summary = 'Missing permission. Tagging performed with [[' + AjaxQuickDelete.mdSelfPath + '|AjaxMassDelete.js]].';
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
				this.img_summary = 'File has no source. Tagging performed with [[' + AjaxQuickDelete.mdSelfPath + '|AjaxMassDelete.js]].';
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
					+ " using [[" + AjaxQuickDelete.mdSelfPath + "|AjaxMassDelete.js]].";
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
				this.img_summary = 'Adding [[COM:OTRS|OTRS]] permission or another tag to the permission section using [[' + AjaxQuickDelete.mdSelfPath + '|AjaxMassDelete.js]].';
			break;
			case 'c_replace':
				this.tag = this.reason;
				this.img_summary = 'Performing a custom replace with [[' + AjaxQuickDelete.mdSelfPath + '|AjaxMassDelete.js]].';
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
			this.addTask('notifyUploaders');
		}
		else {
			this.addTask('mdInsertPermission');
		}
		if ('del' == this.mdTaskToPerform) 
			this.addTask('listRequestSubpage');
		if ( ('other' != this.mdTaskToPerform) && ('otrs' != this.mdTaskToPerform) && ('c_replace' != this.mdTaskToPerform) && (0 != this.ioUploads) ) {
			this.addTask('mdRvGenOThumbs');
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
				for (var id in this.mdTagRecognization) {
					iCt++;
					if (1 == iCt) continue mdTagLoop; // Skip first pattern
					page.text = page.text.replace(this.mdTagRecognization[id][0], '');
				}
			}
			if ('c_replace' != this.mdTaskToPerform) {
				page.text = this.mdInsertOTRS( page.text, this.tag );
			} else {
				if ('' == this.tag) continue;
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
 
		this.savePage(page, 'Starting mass deletion request using [[' + AjaxQuickDelete.mdSelfPath + '|AjaxMassDelete.js]]', 'nextTask');
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
	mdRvGenOThumbs: function () {
		this.context = "MD-RevertImage";
		this.mdUploadCt = 0;
		if ( this.progressDialog ) this.progressDialog.remove();
		this.mdActualResultCount = 0;
		var dlgButtons = {};
		dlgButtons[this.i18n.mdRevertButtonLabel] = function () { 
			try {
				AjaxQuickDelete.mdRvEvalSelction();
			} catch (ex) {
				AjaxQuickDelete.fail(ex);
			}
		};
		dlgButtons[this.i18n.cancelButtonLabel] = function () {
			$(this).dialog("close");
			if ( AjaxQuickDelete.mdInsertedTag ) {
				AjaxQuickDelete.addTask('mdExecuteReady');
				AjaxQuickDelete.nextTask();
			}
		};
		this.mdDlgThumbDlgClose();
		this.dlg = $('<div></div>').html('<div id="AjaxMdContainer"></div>').dialog({
			modal: true,
			closeOnEscape: true,
			position: 'center',
			dialogClass: "wikiEditor-toolbar-dialog",
			title: 'Batch Surgery Script in Beta-Mode.' + 
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
			$('#AjaxMdContainer').append('<div id="AjaxMdNotReady">Please wait while enumerating overwritten files ...</div><ul id="AjaxMdUlContainer" class="gallery"></ul>');
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
			try {
			$('#AjaxMdNotReady').contents().eq(0).replaceWith('Querying detailed information and obtaining edittoken. Pending ' + (this.mdUploadCt) + 
			' of ' + (this.ioUploads) + ' total uploads current image: ' + pageTitle); 
			} catch (ex) {}
			var rvMatrix = this.mdRvCreateImgRevisionMatrix(parsedDOM);
			var preVandalRv = 0;
			if ('object' != typeof(rvMatrix[0]) || rvMatrix[0].user != this.mdUser) { 
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
				var imgDescrPageLink = ' href="' + mw.config.get('wgServer') + mw.config.get('wgArticlePath').replace("$1", pageTitle.replace(/ /g, '_')) + '" target="_blank"';
				$('#AjaxMdUlContainer').append(this.mdThumbHTMLpre.replace("height: 150px\;", "height: 310px\;") +
					'<a class="image"' + imgDescrPageLink + '>' +
					'<img style="vertical-align:top" src="' + rvMatrix[0].img + 
						((0 != rvMatrix[0].imgWidth) ? '" width="' + rvMatrix[0].imgWidth + '" height="' + rvMatrix[0].imgHeight : '') + '" alt="' + pageTitle + '"></a>' +
					'<p style="vertical-align:middle">revert to ' + preVandalRv.user + '</p>' +
					'<a class="image" href="' + preVandalRv.href + '" target="_blank">' +
					'<img style="vertical-align:bottom" src="' + preVandalRv.img + 
						((0 != preVandalRv.imgWidth) ? '" width="' + preVandalRv.imgWidth + '" height="' + preVandalRv.imgHeight : '') + '" alt="' + pageTitle + '"></a>' +
					'</div></div><div class="gallerytext"><i>' + this.oUploads[pageTitle].iId + ': </i>' + 
					'<input type="checkbox" name="mdCheckDelete" value="' + pageTitle + '" ' + ( document.getElementById("AjaxMdIa").checked ? 'checked="checked"' : '') + '> ' + 
					'<a' + imgDescrPageLink + '>' + pageTitle + '</a><br/></div></div></li>');
				this.mdBusy = false;
				this.mdActualResultCount++;
			}
		}
		this.mdRvAllFilesQueried();
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
				if ( -1 != $(aNode).attr('href').indexOf("http://upload.wikimedia.org/wikipedia/")) {
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
		});
		return revArray;
	},
 
	mdRvEvalSelction: function () {
		this.mdUploadCt = 0;
		$('#AjaxMdContainer').hide();
		$('#AjaxMdContainer').parent().append('<div id="mdWaitContainer">' + this.i18n.mdExecutingTaskEnumerateFiles + this.mdReLoader + '</div>');
 
		$('input[name="mdCheckDelete"]').each(function(index) {
			if (this.checked) {
				AjaxQuickDelete.mdUploadCt++;
				AjaxQuickDelete.mdRevertImage(this.value);
			}
		});
		this.mdDlgThumbDlgClose();
		if (0 == this.mdUploadCt) {
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
		if (0 == AjaxQuickDelete.mdUploadCt) {
			AjaxQuickDelete.nextTask();
		}
	},
 
	mdExecuteReady: function () {
		if (this.progressDialog) this.progressDialog.remove();
		alert('Check your own contributions to determine, whether this script worked correctly, please. Report bugs to User:Rillke.');
 
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
 
				try {
					o[callback](result);
				} catch (e) {
					return o.fail(e);
				}
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
		if (console) console.log('Error: ' + err);
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
 
	mdTagRecognization: [
		// RegExp for the tag								note to add to the thumb-page
		[/Category:Deletion requests.*/,					'd'],
		[/Category:Incomplete deletion requests.*/,			'd(incomplete)'],
		[/Category:Media missing permission.*/,				'!p'],
		[/Category:Media without a license.*/,				'!l'],
		[/Category:Media without a source.*/,				'!s'],
		[/Category:Other speedy deletions.*/,				'speedyd'],
		[/Category:Copyright violations.*/,					'copyvio'],
		[/OTRS pending.*/,									'on'],
		[/Items with OTRS permission confirmed.*/,			'opm'],
		[/OTRS received.*/,									'or'],
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
		[/Category:Valid SVG/, ''], [/Category:Translation possible/, ''], [/Category:License[- _]migration redundant/, ''], [/Category:Retouched pictures/, ''], [/Category:Extracted images/, ''], [/Category:Images with annotations/, ''], [/Category:Media needing category.*/, ''], [/Category:.*requiring review.*/, ''], [/Category:Uploaded with UploadWizard/, ''], [/Category:OTRS[- _]received.*/, ''], [/Category:Items[- _]with[- _]OTRS[- _]permission.*/, ''], [/Category:OTRS[- _]pending.*/, ''], [/Category:Media with locations/, ''],
	],
 
	mdOTRSprefill: "{{PermissionOTRS|id=%ID|\~\~\~\~}} {{OTRS received|id=%ID|reason=processing, nonfree, email}}",
	mdOTRSTicketPrefill: "{{PermissionOTRS|ticket=%URL|\~\~\~\~}} {{OTRS received|ticket=%URL|reason=processing, nonfree, email}}",
	mdPermissionPattern: /(\|Permission\s*\=)/i,
	mdURLPattern: /(https:\/\/\S*)/,
	mdSelfPath: 'User:Rillke/AjaxMassDelete.js',
	mdErrReportPath: 'User_talk:Rillke/AjaxMassDelete.js',
	mdThumbHTMLpre: '<li style="width: 155px" class="gallerybox"><div style="width: 155px"><div style="width: 150px; height: 150px;" class="thumb"><div style="margin:15px auto;">',
	mdUserPrefix: mw.config.get('wgFormattedNamespaces')[2] + ":",
	mdContribPrefix: mw.config.get('wgFormattedNamespaces')[-1] + ":Contributions/",
	mdReLoader: '<p align="center"><img src="http://upload.wikimedia.org/wikipedia/commons/c/ce/RE_Ajax-Loader.gif"/></p>',
	
	/** REVISION CONTROL **/
	mdScriptRevision: '0.0.0.0',
 
   // Translatable strings - they will be merged into AjaxQuickDelete (Objects)
	i18n: {
		mdPerformOnWhichUser:  "What user is this action about?",
		mdWaitingApiRes: "Waiting for API response list.",
		mdSortingAPIres: "Sorting API results.",
		mdTryToObtainUser: "Trying to guess which user this task will be about.",
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
		mdExecutingTaskEnumerateFiles: "Enumerating files for the requested task.",
		mdExecutingTask: "Executing your requested task.",
		mdRevertButtonLabel: "Revert images",
 
		mdCopyvio: "Copyvio",
		mdCopyvioDerative: "Copyvio derative",
		mdCopyvioFairUse: "Copyvio fair-use",
		mdCopyvioLogo: "Copyvio sophisticated logo",
		mdCopyvioND: "Copyvio no derative allowed",
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
			mdFindUploads: "An error occurred while querying the upload-list.",
			mdFindUploadsCB: "An error occurred after querying the upload-list.",
			mdGenIThumbs: "An error occurred setting up the selection dialog.",
			mdSendNextQueries: "An error occurred preparing to query file-information.",
			mdQueriedFile: "An error occurred after gathering file information and inserting them into the dialog.",
			mdExtractTags: "An error occurred while extracting tags from the page's content.",
			mdExtractLicense: "An error occurred while extracting license from categories.",
			mdQueryFileDone: "An error occurred after gathering all file-information.",
			mdQueryMore: "Attempting to continue querying script encountered an error.",
			mdExecute: "An error occurred while fetching your input.",
			mdExecuteContinue: "An error occurred while preparing the request.",
			mdInsertPermission: "An error occurred while preparing the insertion of the permission.",
			mdInsertOTRS: "An error occurred while preparing the page-content of the permission.",
			mdCreateRequestSubpage: "An error occurred creating the deletion-request subpage.",
			mdTemplateAdded: "An error occurred after a template has been added to a description page.",
			mdRvGenOThumbs: "An error occurred setting up the selection-revert dialog.",
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
			delete AjaxMassDelete; // Destroy this object
			AjaxQuickDelete.mdErrorsReportPath = mw.config.get('wgServer') + mw.config.get('wgArticlePath').replace("$1", AjaxQuickDelete.userTalkPrefix) + 'Rillke';
		} catch (ex) {
			AjaxMassDelete = {};
		}
	});
});
 
/// <reference path="jquery-1.4.2.min.js"/>
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
        /// <summary>Filter that checks if the item(s) is visible within the page. Returns set of visible elements</summary>
        /// <returns type="jQuery" />
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