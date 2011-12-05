// Main script is at MediaWiki:VisualFileChange.js
// These are the delayed loaded display components (UI) in order to speed up loading of the first UI
if (window.VisualFileChange) 
{
$.extend(window.VisualFileChange,
{
	displayComponents: true,
	
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
	}
});
$(document).triggerHandler('scriptLoaded', ['VisualFileChange', 'DisplayComponents']);
}