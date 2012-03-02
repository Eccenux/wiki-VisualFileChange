// Main script is at MediaWiki:VisualFileChange.js
// These are the delayed loaded display components (UI) in order to speed up loading of the first UI

/*global jQuery:false, mediaWiki:false, alert:false */
/*jshint curly:false, maxerr:200, laxbreak:true, bitwise:false,*/
(function ($, mw) {
'use strict';

// Return if Main Script is not loaded
if (!window.VisualFileChange) return;
// Return if this script is already loaded
if (window.VisualFileChange.displayComponents) return;

mw.util.addCSS( ' .rgallery { background-color:#FFF !important; }\n'
	+ ' .numbersOnly { text-align:right; }\n'
	+ ' .md-deleted-uploads { width:99%; display:none; background:#FCC url(//upload.wikimedia.org/wikipedia/commons/d/d6/User-trash.png) no-repeat scroll center; }\n'
	+ ' a:link.md-loglink { color:#BB6!important; display:inline-block; }\n'
	+ ' .tipsycategory { border-bottom: 1px Dotted #888; font-style:italic; margin-right:4px; display:inline-block; }\n'
	+ ' .tipsymetadata { color:#6389C2;border-bottom: 1px Dotted #57B;white-space:nowrap; font-style:italic; font-weight:bold; margin-right:4px; display:inline-block }\n'
	+ ' .jFileTitle { display:block; text-align:center; padding-right:0px !important; background: #eee !important; margin-top:3px; border-radius:5px; }\n'
	+ ' .jFileTime { color:gray;font-size:0.9em; line-height:1.1em; }\n'
	+ ' .jFileSize { color:green;font-size:0.9em; }\n'
	+ ' .md-re-escape-helper { position:absolute; color:#FFF; cursor:pointer; padding:3px; -webkit-border-top-left-radius: 8px; -webkit-border-bottom-left-radius: 8px;-moz-border-radius-topleft: 8px;-moz-border-radius-bottomleft: 8px;border-top-left-radius: 8px;border-bottom-left-radius: 8px; ' + 
		'background: rgb(97,196,25); background: -moz-radial-gradient(center, ellipse cover, rgb(97,196,25), rgb(180,227,145)); background: -webkit-gradient(radial, center center, 0px, center center, 100%, color-stop(0%,rgb(97,196,25)), color-stop(100%,rgb(180,227,145))); ' + 
		'background:-webkit-radial-gradient(center, ellipse cover, rgb(97,196,25),rgb(180,227,145)); background: -o-radial-gradient(center, ellipse cover, rgb(97,196,25),rgb(180,227,145)); background: -ms-radial-gradient(center, ellipse cover, rgb(97,196,25),rgb(180,227,145)); background: radial-gradient(center, ellipse cover, rgb(97,196,25),rgb(180,227,145)); }\n'
	+ ' .md-examine-contents { display:inline-block; font-size:1.2em; width:49%; white-space:pre-wrap; font-family:monospace; border:1px solid #362B36; text-align:left; }\n'
	+ ' li.gallerybox { width:155px; background:#f8f8f8; border:#FFF 2px solid; }\n'
	+ ' li.md-selected { background-color:#BBE; }\n'
	+ ' li.md-selected div.thumb { background-color:#DDE; border:#FFF 1px solid; }\n'
	+ ' li#mdLastSelected { border:#447 2px solid; }\n'
);

$.extend(window.VisualFileChange,
{
	displayComponents: true,
	
	/**  
	**  Called by nextTask after the fill-in-user-dialog and by mdQueryFileDone (follows later)
	**  Calls the appropriate method (uploads of cats)
	**/
	mdCreateList: function () {
		if (this.mdNumberOfExecs) {
			$(document).triggerHandler('vFC', ['filelist query aborted due to exection of edit-tasks', this]);
			return true;
		}
		if (this.mdListUploadsPending > 0) {
			$(document).triggerHandler('vFC', ['filelist will queried later due to a pending query', this]);
			var o = this;
			setTimeout(function () { 
				o.mdCreateList();
			}, 200); // See me later ...
			return true;
		}
		$(document).triggerHandler('vFC', ['preparing querying the filelist', this]);
		this.pb.setCurrentTaskDone();
		this.pb.setTaskState( 'list', 'md-doing' );
		if (this.mdFirstRun) { // First time only
			this.pb.setHelp(this.i18n.mdPleaseWait);
			this.mdTarget = $.trim(this.mdTarget.replace(/^User\:/, '')); // WARNING: INPUT IS UNCHECKED
			this.mdModeCat = /^Category\:/.test(this.mdTarget);
		}
		
		if (this.context !== 'MD') return;
		this.mdListUploadsPending++;
		
		if (this.mdModeCat) this.mdSecureCall('mdFindCatMembers'); else this.mdSecureCall('mdFindUploads');
	},
	
	mdSaveContinueKey: function (key) {
		this.lastContinues.vals.push(key);
		if (this.lastContinues.vals.length > 2) this.lastContinues.vals.shift();
	},
	
	mdFindUploads: function () {
		var query = {
			action: 'query',
			list: 'logevents',
			leprop: 'title|type|timestamp',
			leaction: 'upload/upload',
			leuser: this.mdTarget,
			lelimit: this.mdSettings.loadBatchSize,
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
		var _this = this;
		$.each(allFileChanges, function(id, fc) { // loop through all filechanges (upload-events) (array)
		
			// This file was initially uploaded by the user.
			if ('upload' === fc.action) { 
				// Do not mess-up numbers when a file was deleted and re-uploaded
				if (fc.title in _this.iUploads) return; 
				_this.iUploads[fc.title] = { uploader: [] };
				_this.iUploads[fc.title].iId = _this.iiUploads;
				_this.iUploads[fc.title].time = fc.timestamp;
				_this.iiUploads++;
			// User overwrote file.
			} else if ('overwrite' === fc.action) {
				_this.oUploads[fc.title] = {};
				_this.oUploads[fc.title].iId = _this.ioUploads;
				_this.oUploads[fc.title].time = fc.timestamp;
				_this.ioUploads++;
			}
			
		});
		
		if (!result['query-continue']) { 
			this.mdNoMoreFiles = true;
		}
		if (!this.mdNoMoreFiles) {
			this.mdLestart = result['query-continue'].logevents.lestart;
			this.mdSaveContinueKey(this.mdLestart);
		}
		if (this.mdFirstRun) {			// Call nextTask the first time only
			this.mdFirstRun = false;
			this.nextTask();
		} else {
			if (!this.mdActualResultCount) this.mdSecureCall('mdQueryMore');
		}
	},
	
	mdFindCatMembers: function () {
		var query = {
			action: 'query',
			list: 'categorymembers',
			cmtitle: this.mdTarget,
			cmtype: 'file',
			cmprop: 'title|type|timestamp',
			cmlimit: this.mdSettings.loadBatchSize,
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
		
		var _this = this;
		
		// loop through all category-members (object)
		$.each(result.query.categorymembers, function(id, fc) {
			_this.iUploads[fc.title] = { uploader: [], comments: [] };
			_this.iUploads[fc.title].iId = _this.iiUploads;
			_this.iUploads[fc.title].time = fc.timestamp;
			_this.iiUploads++;
		});
		if (!result['query-continue']) { 
			this.mdNoMoreFiles = true;
		}
		if (!this.mdNoMoreFiles) {
			this.mdLestart = result['query-continue'].categorymembers.cmcontinue || result['query-continue'].categorymembers.cmstart;
			if (result['query-continue'].categorymembers.cmstart) this.mdCmstart = result['query-continue'].categorymembers.cmstart;
			this.mdSaveContinueKey(this.mdCmstart || this.mdLestart);
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
		
		if ('' === r) {
			cb.apply(obj, ['', true]);
			return;
		}
		
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
	
	mdRegExpFromString: function(st) {
		var match, m = st.match(this.mdRegExpPattern);
		if (m && m[0] && m[1]) {
			match = new RegExp(m[1], m[2]);
		} else {
			match = '';
		}
		return match;
	},
	
	mdCreateExamineNode: function() {
		var o = this;
		var $examineToggler, $examineInput, $examineButton, $loadDivButton, $examineFirstDiv, $examineSecondDiv, $examineDiffDiv, $examineOuterDiv;
			
		$examineInput = $('<input>', { type: 'text', 'class': 'numbersOnly', maxlength: 4, size: 11, placeholder: 'file number' }).placeholder();
		$examineButton = $('<button>', { text: 'Compare!' }).click(function() {
			$examineFirstDiv.text('');
			$examineSecondDiv.text('');
			if (!$examineInput.val()) return;
			var replaceSecurityLevel = o.$selPreserve.val();

			$.each(o.iUploads, function(upload, curUpld) {
				if (!curUpld.content || (($examineInput.val()-0) !== curUpld.iId)) return;

				var replaceContainer = o.nowikiEscaper(curUpld.content);
				replaceContainer.alsoPreserve(o.$alsoPreserve.val());

				$.each(o.mdReplacementMatrix, function(i, rObj) {
					var match;
					match = rObj.match.val();
					if (rObj.regex[0].checked && match) {
						match = o.mdRegExpFromString(match);
					}
					if (!match) return;
					switch (replaceSecurityLevel) {
						case 'secure':
							replaceContainer.secureReplace(match, rObj.replace.val());
							break;
						case 'placeholder':
							replaceContainer.replace(match, rObj.replace.val());
							break;
						case 'none':
							replaceContainer.ordinaryReplace(match, rObj.replace.val());
							break;
					}
				});
				$examineFirstDiv.text(curUpld.content);
				$examineSecondDiv.text(replaceContainer.doCleanUp());
				if (window.schnark_diff && window.schnark_diff.html_diff) {
					$examineDiffDiv.html('<div style="float:right; font-family:sans-serif;">Powered by SchnarkDiff</div>' + window.schnark_diff.html_diff(curUpld.content, replaceContainer.getText(), true));
				}
			});
		}).button({ icons: { primary: 'ui-icon-search' } });
		$loadDivButton = $('<button>', { text: 'Load highlight diff-Module from [[:de:Benutzer:Schnark/js/diff.js/core.js]]' }).click(function() {
			$(this).button('option', 'disabled', true);
			o.loadModule('diff', function() {
				$examineButton.click();
			});
		}).button();
		$examineFirstDiv = $('<div>', { 'class': 'md-examine-contents' });
		$examineSecondDiv = $('<div>', { 'class': 'md-examine-contents' });
		$examineDiffDiv = $('<div>', { 'class': 'md-examine-contents', style: 'width:98%' });
		$examineOuterDiv = $('<div>', { style: 'text-align:center;' }).append($examineInput, ' ', $examineButton, ' ', $loadDivButton, ' ', $('<div>').append($examineFirstDiv, $examineSecondDiv, $examineDiffDiv));
		
		$('.numbersOnly').keyup(function () { 
			this.value = this.value.replace(/[^0-9]/g,'');
		});

		return o.createToggler('Examine scheduled changes', $examineOuterDiv.hide());
	},
	
	mdEscapeSpecial: function(string) {
		var specials = ['t', 'n', 'v', '0', 'f'];
		$.each(specials, function(i, s) {
			var rx = new RegExp('\\'+s, 'g');
			string = string.replace(rx, '\\'+s);
		});
		return string;
	},
	
	mdCreateReplaceNode: function() {
		var o = this;
		var rowCount = 0;
		var $lastBigArea = 0;
		
		var $desc = $('<p>', { text: 'Replacement is done row-by-row from top. Rows with empty or invalid pattern fields are skipped. When not using RegExp-replace only the first occurrence of the pattern in each file will be replaced.' });
		var $regExpEscapeHelper = $('<div>', { style: 'display:none;', 'class': 'md-re-escape-helper', html: 'R. → /R\\./g', title: 'Make a match-all-occurrences-RegExp from' }).click(function() {
			var $serviceFor = $(this).data('mdServiceFor');
			$serviceFor.val('/' + o.mdEscapeSpecial($.escapeRE( $serviceFor.val().replace(/\//g, '\\/') )) + '/g').keyup();
			$(this).hide();
		});
		var $table = $('<table>', { style: 'border:1px solid #BBB', width: '100%', cellspacing: 0, cellpadding: 0 });
		var $thead = $('<thead>').append(
			$('<th>', { text: 'Nr ' }),
			$('<th>').append($('<abbr>', { title: 'Check if Regular Expression. Use full JavaScript RegExp-Syntax like /find.+/g', text: 'RegExp?' })),
			$('<th>', { text: 'Pattern to match' }),
			$('<th>', { text: 'Text to insert instead' })
		).appendTo($table);
		var $selPreserve = o.$selPreserve = $('<select>', { id: 'selPreserve', size: 1 }).append(
			$('<option>', { text: 'Preserve nowikis, comments. Do this as secure as possible (internal split into array). (recommended)', value: 'secure' }),
			$('<option>', { text: 'Preserve nowikis, comments. Allow usage of substring and $1 (internal usage of placeholders (%v%f%c%\\d+)).', value: 'placeholder' }),
			$('<option>', { text: 'Do not preserve nowikis and comments.', value: 'none' })
		);
		var $alsoPreserveL = o.$alsoPreserve = $('<label>', { 'for': 'alsoPreserve', text: 'Also preserve the following areas from being replaced.' });
		var $alsoPreserve = o.$alsoPreserve = $('<input>', { type: 'text', id: 'alsoPreserve', placeholder: 'RegExp without flags enclosed in (): /(toPreserve)/ Example: /(<gallery>(?:.|\\n)*?<\\/gallery>)/', style: 'width:99%' }).placeholder();
		var $tbody = $('<tbody>', { id: 'mdRTableBody' }).appendTo($table);
		var $rn = $('<tr>', { id: 'mdReplaceTextNode' }).append($('<td>').append($desc, $regExpEscapeHelper, $table, $selPreserve, $('<br/>'), $alsoPreserveL, $alsoPreserve, $('<br/>'), o.mdCreateExamineNode()));
		
		var regExTester = function($text, $cb, $replace) {
			var testConditions = function() {
				var isRE = o.mdRegExpPattern.test($text.val());
				$cb.parent().css('background', '');
				$text.css('background', '');
				if (isRE && !$cb[0].checked) {
					$cb.parent().css('background', '#FCC');
				} else if (!isRE && $cb[0].checked) {
					$text.css('background', '#FCC');
				}
			};
			var testEmptyReplace = function() {
				$replace.css('background', '');
				if ($text.val() && !$replace.val()) {
					$replace.css('background', '#FEB');
				}
			};
			$text.bind('input keyup change', testConditions);
			$text.bind('input keyup change', testEmptyReplace);
			$cb.change(testConditions);
			$replace.bind('input keyup change', testEmptyReplace);
		};
		var $newRow = function() {
			rowCount++;
			var $mA = $newMatchArea(),
				$rA = $newReplaceArea(),
				$rE = $newRegexCheckBox();
			
			o.mdReplacementMatrix.push({ match: $mA, replace: $rA, regex: $rE });
			
			$rE.click(function(e) {
				e.stopPropagation();
			});
			regExTester($mA, $rE, $rA);
			$('<tr>', { align: 'center' }).append(
				$('<td>').append(rowCount + '.'),
				$('<td>').append($rE).click(function() {
					$rE[0].checked = !$rE[0].checked;
					$rE.triggerHandler('change');
				}),
				$('<td>').append($mA),
				$('<td>').append($rA)
			).appendTo($tbody);
		};
		var resizeHandler = function($el) {
			$el.focus(function() {
				if ($lastBigArea) $lastBigArea.css('height', '');
				$el.css('height', '5em');
				$lastBigArea = $el;
			});
			return $el;
		};
		var $newMatchArea = function() {
			return resizeHandler($('<textarea></textarea>', { id: 'mdMatchText'+rowCount, rows: 1, cols: 50, style: 'width:95%' }).bind('input.resize keyup.resize change.resize', function(e) {
				var $el = $(this);
				if (!$el.val()) return;
				$el.unbind('input.resize keyup.resize change.resize');
				$newRow();
			})).focus(function() {
				var $el = $(this);
				var pos = $el.position();
				$regExpEscapeHelper.show().css('top', pos.top + 5).css('left', pos.left - $regExpEscapeHelper.width() - 6);
				$regExpEscapeHelper.data('mdServiceFor', $el);
			});
		};
		var $newReplaceArea = function() {
			return resizeHandler($('<textarea></textarea>', { id: 'mdReplaceText'+rowCount, rows: 1, cols: 50, style: 'width:95%' }));
		};		
		var $newRegexCheckBox = function() {
			return $('<input>', { type: 'checkbox', id: 'mdRRegEx'+rowCount });
		};
		$newRow();
		return $rn;
	},
 
	/**  
	**  Mammoth method to set up and manage the UserInterface (UI)
	**/
	mdGenIGallery: function() {
		$(document).triggerHandler('vFC', ['preparing initial uploads dialog', this]);
	
		this.mdUploadCt = 0;              // Number of pending API queries
		this.mdActualResultCount = 0;     // Doesn't include reverts and deleted media
		this.mdPendingBatchQueries = 0;   // Number of batches currently on query; should be max. 1
		this.mdThumbsOnDlg = 0;           // How many thumbs on the dialog?
		this.mdReplacementMatrix = [];    // Contains pointers to jQuery-Array-Inputfields for the custom replace
		this.mdDateOldestDataFetched = new Date();
		
		var o = this;
		
		// Tipsy-tooltips for metadata and categories
		$('.tipsymetadata').die();
		$('.tipsymetadata').tipsy( {
			title: function() {
				$('.tipsy').remove();
				return o.mdSecureCall('mdGetMetaTable', $(this).parent().attr('tipsy-title'), o);
			},
			live: true,
			html: true,
			gravity: $.fn.tipsy.autoNS
		} );
		$('.tipsycategory').die();
		$('.tipsycategory').tipsy( {
			title: function() { 
				$('.tipsy').remove();
				return o.mdSecureCall('mdGetCatTable', $(this).parent().attr('tipsy-title'), o, false).html(); 
			},
			live: true,
			html: true,
			delayOut: 1000,
			gravity: $.fn.tipsy.autoNS
		} );

		/*  The UI  */
		this.mdMinLenRequired = true;     // Is a reason required?

		var confirmDlg = function(title, text, cancel, ignore, icon) {
			var dlg2Btns = {};
			var dlgWidth = Math.min(600, $(window).width() - 250);
			dlg2Btns[cancel] = function() {
				$(this).dialog("close");
			};
			dlg2Btns[ignore] = function() {
				$(this).dialog("close");
				o.mdSecureCall("mdExecute");
			};
			$('<div>').append($('<img>', { src: icon, height: 128, width: 128, style: 'float:left;' }), $('<div>', { style: 'margin-top: 30px' }).text(text))
				.dialog({
					title: title,
					buttons: dlg2Btns,
					modal: true,
					position: [($(window).width() - dlgWidth - 250) / 2 + 250, ($(window).height() - 200) / 2 ],
					close: function() {
						$(this).dialog("destroy");
						$(this).remove();
					}
				});
		};
		
		var $AjaxMdType;
		
		var dlgButtons = {};
		dlgButtons[this.i18n.submitButtonLabel] = function() {
			var pp = o.i18n.mdPotentialProblems;
			if ($('input[name="mdCheckDelete"]:checked').length === 0) {
				confirmDlg(pp.titleNf, pp.textNf, pp.back, pp.proceed, o.mdInfoIcon);
			} else {
				o.mdSecureCall("mdExecute");
			}
		};
		dlgButtons[this.i18n.cancelButtonLabel] = function() {
			$(this).dialog("close");
		};

		var getSelect = function() {
			var sel = '<select size="1" id="AjaxMdType">';
			$.each(o.mdOpt, function(id, opt) {
				sel += '<option value="' + id + '">' + o.i18n.mdOptions[id] + '</option>';
			});
			sel += '</select>';
			return sel;
		};

		var dlgResizeTimeout = 0;
		this.dlg.dialog({
			modal: false,
			title: this.mdHelpNode +
				' Action:&nbsp;' +
				getSelect() +
				this.i18n.mdDisselectAll + '<input type="checkbox" id="AjaxMdIa" value="1"/> &nbsp;',
			width: $(window).width() - 250,
			height: $(window).height(),
			buttons: dlgButtons,
			resizeStop: function(event, ui) { 
				clearTimeout(dlgResizeTimeout);
				dlgResizeTimeout = setTimeout(function() {
					$('.ui-dialog > .ui-dialog-content').eq(0).scroll(); 
				}, 500);
			} // Fire scroll evt on resize for (continue query if btn gets visible)
		});
		this.dlg.dialog( 'option', 'position', 'right' );
		this.dlg.dialog( 'option', 'modal', 'false' );
		var windowRezizeTimeout = 0;
		$(window).resize(function() {
			clearTimeout(windowRezizeTimeout);
			windowRezizeTimeout = setTimeout(function() {
				if (o && o.dlg) o.dlg.dialog('option', 'width', $(window).width() - (o.pb.isHidden() ? 0 : 250));
			}, 1000);
		});

		var $AjaxMdContainer = this.$AjaxMdContainer.text('');
		this.$mdControls = $('<div>');

		if (!this.dlg) return 0;
		
		$('<a>', { href: '#', text: this.i18n.mdCuteSelectLabel }).click(function(e) {
			e.preventDefault();
			o.mdCuteSelectDlg.dialog("open");
		}).appendTo( $('#AjaxMdIa').parent() );

		var subHeading = this.mdModeCat ? 'Files in -' : 'Initally uploaded files by -';
		var targetHref = mw.util.wikiGetlink((this.mdModeCat ? '' : o.mdUserTalkPrefix) + this.mdTarget);
		var defaultHeading = (this.mdModeCat ? 'Files in [[:' + this.mdTarget + ']] ' : ('Files uploaded by [[' + this.mdUserPrefix + this.mdTarget + '|' + this.mdTarget + ']] '
				+ '([[' + this.mdUserTalkPrefix + this.mdTarget + '|talk]] · [[' + this.mdContribPrefix + this.mdTarget + '|contribs]])'));

		// Change the title of the browser tab/window
		document.title = "VisualFileChange: " + subHeading + this.mdTarget + "- ";
		
		// Append controls to the dialog
		this.$mdControls.append(
			subHeading, $('<a>', { href: targetHref, target: '_blank', text: this.mdTarget }), "-. ",
			$('<label>', { id: 'mdTaskForUser', 'for': 'mdDeleteReason', text: this.i18n.mdInsertDeleteReasen }), ": ",
			$('<textarea></textarea>', { id: 'mdDeleteReason', style: 'width: 99%; height: 40px;' }), $('<br/>'),
			$('<label>', { 'for': 'mdEditSummary', text: this.i18n.mdInsertEditSummary }), ": ",
			$('<input>', { type: 'text', id: 'mdEditSummary', style: 'width: 70%;', maxlength: 100 }),
			$('<span>', { id: 'mdReplacePermissionWrapper' }).append(
				$('<input>', { type: 'checkbox', id: 'mdReplacePermission' }), 
				$('<label>', { 'for': 'mdReplacePermission', text: ' ' + this.i18n.mdReplacePermissionText })
			))
			.append(
			$('<table>', { cellspacing: 0, cellpadding: 0, style: 'position:relative;', width: '100%' })
				.append($('<tr>', { id: 'mdRequestPageTitle' }).append(
					$('<td>').append($('<label>', { 'for': 'mdDeleteHeading', text: this.i18n.mdInsertDeleteHeading })),
					$('<td>', { width: '70%' }).append($('<input>', { type: 'text', id: 'mdDeleteHeading', style: 'width: 99%;', value: defaultHeading }))
				)).append($('<tr>', { id: 'mdTalkNoteNode' }).append(
					$('<td>').append($('<label>', { 'for': 'mdTalkNote', text: this.i18n.mdInsertTalkNote })),
					$('<td>', { width: '70%' }).append($('<input>', { type: 'text', id: 'mdTalkNote', style: 'width: 99%;', value: this.mdSettings.userNote }))
				)).append(o.mdCreateReplaceNode())
			)
			.appendTo($AjaxMdContainer);

			$AjaxMdContainer
			.append(o.createToggler(this.i18n.mdDelContribsButtonLabel, $('<ul>', { 
				id: 'AjaxDeletedUploads', 
				'class': 'md-deleted-uploads'
			})))
			.append('<div id="AjaxMdNotReady">Please wait while enumerating uploads ...</div><ul id="AjaxMdUlContainer" class="gallery rgallery"></ul>');
 
		// Add label to the button
		var $AjaxMdActionConfirm = $('<span>', { id: 'AjaxMdActionConfirm' });

		var $buttons = this.dlg.parent().find('.ui-dialog-buttonpane button'),
			$submitButton = $buttons.eq(0).button({ icons: { primary: 'ui-icon-check' }, label: $('<span>', { text: this.i18n.submitButtonLabel }).append( $AjaxMdActionConfirm ) }),
			$cancelButton = $buttons.eq(1).button({ icons: { primary: 'ui-icon-close' } }),
			$mdDeleteReason = $('#mdDeleteReason');

		$mdDeleteReason.keyup( function (event) {
			if ( ($(this).val().length < 6 ) && o.mdMinLenRequired ) {
				$submitButton.button('option', 'disabled', true);
				o.pb.setHelp2(o.i18n.mdSpecifyReason);
			} else {
				$submitButton.button('option', 'disabled', false);
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
			var $inputs = $('input[name="mdCheckDelete"]');
			var $checkedInputs = $inputs.filter(':checked');
			o.pb.setHelp3(o.i18n.mdSelectedCount.replace('%C%', $checkedInputs.length));
			$inputs.closest('li.gallerybox').removeClass('md-selected');
			$checkedInputs.closest('li.gallerybox').addClass('md-selected');
		};
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
		$('input[name="mdCheckDelete"]').die( 'mouseup' );
		$('input[name="mdCheckDelete"]').live( 'mouseup', function (e) {
			var $ls, $this, newVal, $lsBox;
			$ls = $('#mdLastSelected');
			$lsBox = $ls.find('input[name="mdCheckDelete"]');
			$this = $(this).closest('li.gallerybox');
			
			if ($ls.length && e.shiftKey && this !== $lsBox[0]) {
				newVal = !this.checked;
				if ($this.nextAll('#mdLastSelected').length) {
					$this.nextUntil('#mdLastSelected').find('input[name="mdCheckDelete"]').each(function() {
						this.checked = newVal;
					});
				} else {
					$this.prevUntil('#mdLastSelected').find('input[name="mdCheckDelete"]').each(function() {
						this.checked = newVal;
					});
				}
				$lsBox[0].checked = newVal;
				clearTimeout(timoutID);
				timoutID = setTimeout(updateSelectedCount, 200);
			}
			$ls.removeAttr('id');
			$this.attr('id', 'mdLastSelected');
		});
		
		this.$AjaxDeletedUploads = $('#AjaxDeletedUploads'); // For later usage to speed up gallery-box creating
		this.$AjaxMdUlContainer = $('#AjaxMdUlContainer');
		this.$AjaxMdNotReady = $('#AjaxMdNotReady');
		
		//
		// Event handler for the selection box (task to perform)
		//
		this.$AjaxMdType = $AjaxMdType = $('#AjaxMdType');
		$AjaxMdType.change( function (event) {
			var optConfig = o.mdOpt[$(this).val()];
			if (!optConfig) return;
			if ('del' === $(this).val()) { 
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
			$AjaxMdActionConfirm.text(' (' + o.i18n.mdOptions[$(this).val()] + ')');
		});
		$AjaxMdType.val(this.mdSettings.defaultAction);
		$AjaxMdType.change();
		$AjaxMdType.bind('click mousedown mouseup', function(e) { e.stopPropagation(); });
		$('#AjaxMdIa').bind('click mousedown mouseup', function(e) { e.stopPropagation(); });
		$mdDeleteReason.keyup();
 
 
 
		// cute-selection dialog
		var $metaSelect = $('<select>', { style: 'width:10em;', size: 1 });
		var dlgSelectButtons = {};
		dlgSelectButtons[this.i18n.mdCuteSelect.button] = function () { 
			var $curThmb = '';
			var newVal = $('#chkAjaxMdSelect')[0].checked;
			var v_txtAjaxMdSelectCat = $.trim($('#txtAjaxMdSelectCat').val().replace(/^Category\:/, "").replace(/_/g, ''));
			var v_txtAjaxMdSelectTitle = $.trim($('#txtAjaxMdSelectTitle').val().replace(/^File\:/, "").replace(/_/g, ''));
			if ( v_txtAjaxMdSelectTitle ) v_txtAjaxMdSelectTitle = new RegExp(v_txtAjaxMdSelectTitle, '');
			var v_txtAjaxMdSelectWikitext = $('#txtAjaxMdSelectWikitext').val();
			if (v_txtAjaxMdSelectWikitext) v_txtAjaxMdSelectWikitext = new RegExp(v_txtAjaxMdSelectWikitext, '');
			var v_txtAjaxMdSelectSize = $('#txtAjaxMdSelectSize').val();
			var vl_selAjaxMdSelectSize = ( ($('#selAjaxMdSelectSize').val() + '') === 'l' );
			var v_txtAjaxMdSelectMeta = new RegExp($.trim($('#txtAjaxMdSelectMeta').val()), '');
			var vl_selAjaxMdSelectMeta = $metaSelect.val();
			var v_txtAjaxMdSelectDate0 = $('#txtAjaxMdSelectDate0').val();
			var dateFromString = function(st) {
				try {
					/(\d{4})-(\d\d?)-(\d\d?)(?: (\d\d?):(\d\d?):(\d\d?))?/.exec(st);
					return RegExp.$4 ? (new Date(RegExp.$1, (RegExp.$2 - 1), RegExp.$3, RegExp.$4, RegExp.$5, RegExp.$6)) : (new Date(RegExp.$1, (RegExp.$2 - 1), RegExp.$3));
				} catch (ex) {
					return 0;
				}
			};
			if ( v_txtAjaxMdSelectDate0 ) {
				v_txtAjaxMdSelectDate0 = dateFromString(v_txtAjaxMdSelectDate0);
				if (!v_txtAjaxMdSelectDate0) { alert('Invalid start-date'); return; }
			}
			var v_txtAjaxMdSelectDate1 = $('#txtAjaxMdSelectDate1').val();
			if ( '' !== v_txtAjaxMdSelectDate1 ) {
				v_txtAjaxMdSelectDate1 = dateFromString(v_txtAjaxMdSelectDate1);
				if (!v_txtAjaxMdSelectDate1) { alert('Invalid end-date'); return; }
			}

			$.each(o.iUploads, function(upload, curUpld) {
				try {
					var isMatch = {};
					// yyyy    mm     dd
					/(\d{4})-(\d\d)-(\d\d)T(?:(\d\d):(\d\d):(\d\d))Z/.exec(curUpld.time);
					var curUpldDate = new Date(RegExp.$1, (RegExp.$2 - 1), RegExp.$3, RegExp.$4, RegExp.$5, RegExp.$6);
					$curThmb = $('input[value="' + upload.replace('"', '\\"') + '"]');
 
					if ( v_txtAjaxMdSelectCat ) {
						for (var ct in curUpld.categories) {
							if (curUpld.categories.hasOwnProperty(ct) && (curUpld.categories[ct].title.replace("Category:", "") === v_txtAjaxMdSelectCat)) { 
								isMatch.cat = true;
							}
						}
					} else {isMatch.cat = true;}
 
					if ( 'object' === typeof(v_txtAjaxMdSelectTitle) ) {
						if ( v_txtAjaxMdSelectTitle.test(upload.replace("File:", "")) ) {
							isMatch.title = true;
						}
					} else {isMatch.title = true;}
					
					if ( 'object' === typeof(v_txtAjaxMdSelectWikitext) && curUpld.content ) {
						if ( v_txtAjaxMdSelectWikitext.test(curUpld.content) ) {
							isMatch.content = true;
						}
					} else {isMatch.content = true;}
 
					if ( '' !== v_txtAjaxMdSelectSize ) {
						if ( (vl_selAjaxMdSelectSize && (curUpld.size < v_txtAjaxMdSelectSize)) || (!vl_selAjaxMdSelectSize && (curUpld.size > v_txtAjaxMdSelectSize)) ) isMatch.size = true;
					} else {isMatch.size = true;}
 
					if ( 'object' === typeof(v_txtAjaxMdSelectDate0) ) { // between -> start date -> must be in the past
						if (curUpldDate >= v_txtAjaxMdSelectDate0) isMatch.date0 = true;
					} else {isMatch.date0 = true;} 
 
					if ( 'object' === typeof(v_txtAjaxMdSelectDate1) ) { // and -> end date -> must be in the future
						if (curUpldDate <= v_txtAjaxMdSelectDate1) isMatch.date1 = true;
					} else {isMatch.date1 = true;}
					
					if (vl_selAjaxMdSelectMeta) {
						for (var md in curUpld.metadata) {
							if (curUpld.metadata.hasOwnProperty(md) && curUpld.metadata[md].name === vl_selAjaxMdSelectMeta && v_txtAjaxMdSelectMeta.test(curUpld.metadata[md].value)) { 
								isMatch.meta = true;
							}
						}
					} else { isMatch.meta = true; }
 
					if ( isMatch.cat && isMatch.title && isMatch.content && isMatch.size && isMatch.meta && isMatch.date0 && isMatch.date1 && (1 === $curThmb.length) ) $curThmb[0].checked = newVal;
				} catch (ex) { if ('undefined' !== typeof(console)) console.log('Error: ' + ex); }
			});
			updateSelectedCount();
		};
		
		var $AjaxMdCuteSelect = $('<div>', { id: 'AjaxMdCuteSelect' } );
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
					$('<td>').append($('<label>', { 'for': 'txtAjaxMdSelectWikitext', html: this.i18n.mdCuteSelect.wikitext + ' <abbr title="Regular Expression. Example: \\{\\{[Tt]emplate\\}\\} would match {{template}} and {{Template}}">(RegExpr)</abbr>' })),
					$('<td>').append($('<input>', { type: 'text', id: 'txtAjaxMdSelectWikitext', 'size': 50, placeholder: this.i18n.mdCuteSelect.wikitextplaceholder }), this.i18n.mdCuteSelect.and)),
				$('<tr>').append(
					$('<td>').append( this.i18n.mdCuteSelect.size + ' <select size="1" id="selAjaxMdSelectSize"><option value="l">&lt</option><option value="g">&gt</option></select>' ),						
					$('<td>').append($('<input>', { type: 'text', 'class': 'numbersOnly', id: 'txtAjaxMdSelectSize', 'size': 15 }),
						$('<label>', { 'for': 'txtAjaxMdSelectSize', text: 'KibiBytes (1024 Bytes)' }), ' ', this.i18n.mdCuteSelect.and)),
				$('<tr>').append(
					$('<td>').append($metaSelect),						
					$('<td>').append($('<label>', { 'for': 'txtAjaxMdSelectMeta', text: this.i18n.mdCuteSelect.matches }), 
						$('<input>', { type: 'text', placeholder: this.i18n.mdCuteSelect.titleplaceholder, id: 'txtAjaxMdSelectMeta', 'size': 41 }), this.i18n.mdCuteSelect.and)),
				$('<tr>').append(
					$('<td>').append(this.i18n.mdCuteSelect.date),
					$('<td>').append(
						$('<label>', { 'for': 'txtAjaxMdSelectDate0' }).append($('<abbr>', { 
							text: this.i18n.mdCuteSelect.between,
							title: this.i18n.mdCuteSelect.after
						})),
						$('<input>', { type: 'text', id: 'txtAjaxMdSelectDate0', 'size': 20, 'class': 'dateOnly', maxlength: 19, placeholder: this.i18n.mdCuteSelect.dateplaceholder })
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
						$('<label>', { 'for': 'txtAjaxMdSelectDate1' }).append($('<abbr>', { 
							text: this.i18n.mdCuteSelect.and,
							title: this.i18n.mdCuteSelect.before
						})),
						$('<input>', { type: 'text', id: 'txtAjaxMdSelectDate1', 'size': 20, 'class': 'dateOnly', maxlength: 19, placeholder: this.i18n.mdCuteSelect.dateplaceholder })
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
		
		var pbWidth = (this.pb.isHidden() ? 0 : 250);
		var dlgWidth = Math.min(600, $(window).width() - pbWidth);
		this.mdCuteSelectDlg = $('<div></div>').append($AjaxMdCuteSelect).dialog({
			modal: true,
			resizable: false,
			closeOnEscape: true,
			position: [($(window).width() - dlgWidth - pbWidth) / 2 + pbWidth, ($(window).height() - 250) / 2 ],
			title: 'Cute-Selection: Specify the options, please',
			height: 'auto',
			width: dlgWidth,
			buttons: dlgSelectButtons,
			open: function(evt, ui) {
				$metaSelect.children().remove();
				$('<option>', { text: ' ', value: '' }).appendTo($metaSelect);
				o.metaKeys.sort();
				$.each(o.metaKeys, function(k, val) {
					$('<option>', { text: val }).appendTo($metaSelect);
				});
			},
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
		this.$mdQueryMoreBtn = $('<button>', { id: 'mdQueryMoreBtn', text: this.i18n.mdMore })
				.button({ disabled: true, icons: { primary: 'ui-icon-arrowthick-1-s', secondary: 'ui-icon-arrowthick-1-s' } })
				.click( function (event) { o.mdQueryMore(); })
				.appendTo($queryMore);
		
		$AjaxMdContainer.append($queryMore).append('<div style="height:100px">&nbsp;</div>');
		/* End of UI */
		
		$(document).triggerHandler('vFC', ['initial uploads dialog', this, this.dlg]);
		// Temporary fix
		$('.vFCConfigRequired').removeClass('ui-state-disabled');
 
		this.iCurrentIId = -1;     // Last queried file to continue obtaining detail-info
		this.mdSecureCall('mdSendNextQueries');
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
				if (0 === files.length) {
					return;
				}
				var query = {
					action: 'query',
					prop: 'imageinfo|info|revisions|categories',
					rvprop: 'timestamp|content',
					intoken: ('undefined' === typeof _this.edittoken) ? 'edit' : '',
					iiprop: 'url|size|metadata',
					iiurlwidth: 120,
					iiurlheight: 120,
					titles: files.join('|'),
					clprop: 'hidden',
					cllimit: 500
				};
				if (_this.mdModeCat) {
					query.iiprop += '|user|sha1|comment';
					query.iilimit = 500;
				}
				
				$(document).triggerHandler('vFC', ['detail-info', _this, query]);
				
				_this.mdUploadCt++;
				_this.doAPICall(query, 'mdQueriedFile'); // Dont use task queue because this is a loop
			};

			$.each(this.iUploads, function(upload, upli) {
				if ((_this.iCurrentIId + 1) > upli.iId) return;
				collectedFiles.push(upload);
				collectedCount++;
				if (collectedCount > 9) {  // only 10 at once
					collectedCount = 0;
					sendReq(collectedFiles);
					collectedFiles = [];
				}
				_this.iCurrentIId = upli.iId;
				if (Math.round(_this.mdSettings.loadBatchSize / 10) === _this.mdUploadCt) {
					return false;
				}
			});
			sendReq(collectedFiles);
		}
		
		if (0 === this.mdUploadCt) this.nextTask();
		this.$mdQueryMoreBtn.button('option', 'disabled', true);
	},
	
	/* Helper function: Creating a gallery box for gallery view */
	mdCreateGalleryBox: function( img, txt, height, style, imgTitle, imgH ) {
		var id,
			$ih = $('<div>', { style: 'margin:' + (imgH ? (Math.round((height - imgH) / 2) + 'px auto;') : '15px auto;') } ),
			$th = $('<div>', { 'class': 'gallerytext', 'tipsy-title': imgTitle }),
			$galleryBox = $('<li>', { 'class': 'gallerybox' }).append($('<div>', { style: 'width: 155px' }).append($('<div>', { style: 'width: 150px;', 'class': 'thumb'}).css('height', height).append($ih)).append($th));
		if ('string' === typeof style) $th.attr('style', style);
		
		$.each(img, function(id, imgi) {
			$ih.append(imgi);
		});
		$.each(txt, function(id, txti) {
			$th.append(txti);
		});
		return $galleryBox;
	},
	
	/** Helper function: Creating a link to the log of a deleted item **/
	mdCreateDelUploadItem: function (img) {
		return $('<li>').append($('<a>', { href: mw.config.get('wgServer') + mw.config.get('wgScript') + '?title=Special:Log&page=' + img, target: '_blank' }).append(mw.html.escape(img)))
			.append($('<a>', { href: mw.config.get('wgServer') + mw.config.get('wgArticlePath').replace("$1", 'Special:Undelete/' + img), target: '_blank' }).append(" (undel)"));
	},
	
	/** Called by Tipsy on hovering. Get a list of cats for a specific file. 
		@param {string} revision-identifier
		@param {object} reference to JSONListUploads 
		@param {boolean} render as flickr-like tags?
	**/
	mdGetCatTable: function( rv, o, asTags ) {
		var cats = o.iUploads[rv].categories,
			$catWrap = $('<div>'),
			$catsList = $('<ul>');
		
		if (asTags) {
			$catsList.addClass('j-cat-wrap');
		} else {
			$catWrap.html('<b><i>Categories:</i></b><br/><br/>');
		}
		$catWrap.append($catsList);
		
		$.each(cats, function(id, tCat) {
			if ('undefined' === typeof cats[id].hidden) $catsList.append( 
				$('<li>', { 'class': (asTags ? ' j-cat-label' : '') }).append($('<a>', 
					{	'class': (asTags ? ' j-cat-label' : ''), 
						href: mw.util.wikiGetlink(tCat.title), 
						target: '_blank' 
					}).text(tCat.title.replace('Category:', '')), ' ') );
		});
		return $catWrap;
	},
	
	/* Helper function: Called by QueryIICB. Get model info from Image-Metadata */
	mdGetCamModel: function( uItem ) {
		if (!uItem || !uItem.metadata) return '';
		
		var model = '';
		var mdata = uItem.metadata;
		if ('object' !== typeof mdata) return '';
		$.each(mdata, function(id, mdatai) {
			if ('Model' === mdatai.name) {
				model = $.trim(mdatai.value) + ' ';
				return false;
			}
		});
		return model;
	},
	
	/* Called by Tipsy on hovering. Get a list of cats for a specific file */
	mdGetMetaTable: function( rv, o ) {
		var	id, val,
			mdata = o.iUploads[rv].metadata,
			fRestr = (mdata.length > 6),
			stMdat = '<b><i>File-Metadata:</i></b><br/><br/>',
			restrArr = ["ImageDescription", "Make", "Model", "Copyright", "DateTime", "Artist", "Title", "Author", "Creator", "CreationDate"];
			
		$.each(mdata, function(id, mdatai) {
			if ('string' !== typeof mdatai.value) return;
			try {
				val = mw.html.escape(mdatai.value).slice(0, 200);
			} catch (ex) {
				val = mdatai.value;
			}
			stMdat += ((fRestr && (-1 === $.inArray(mdatai.name, restrArr))) ? '' : '<i>' + mdatai.name + '</i><br/>' + val + '<br/><br/>');
		});
		return stMdat;
	},
	
	/* Helper function: Extract categories from the list of those. */
	mdExtractTags: function( mdCats ) {
		var	thiscat,
			mdTags = '',
			_this = this,
			skip = false;
			
		if ( typeof mdCats !== 'object' ) return mdTags;
		mdTags += '<i>';

		// First the licenses (hidden):
		$.each(mdCats, function(i, cati) {
			if ( 'string' === typeof cati.hidden ) { // it is an empty string if true
				thiscat = cati.title;
				skip = false;
				$.each(_this.mdLicenseRecognization, function(id, recogi) {
					if ( recogi[0].test(thiscat) ) {
						if ( recogi[1] !== '' ) {
							mdTags += '<abbr title="' + thiscat.replace('Category:', '') + '">' + recogi[1] + '</abbr> ';
						}
						skip = true;
						return false;
					}
				});
				if (skip) return;
				
				// This will be only executed if there was no match
				mdTags += '<abbr title="' + thiscat.replace('Category:', '') + '">U</abbr> ';
			}
		});
		
		mdTags += '</i> <span style="background-color:#FC9;">';

		// Then, deletion tags:
		$.each(mdCats, function(i, cati) {
			thiscat = cati.title;
			skip = false;
			$.each(_this.mdTagRecognization, function(id, thistag) {
				if ( thistag[0].test(thiscat) ) {
					if ( thistag[1] !== '' ) {
						mdTags += (thistag[2] ? '<span style="background-color:#' + thistag[2] + ';">' : '') + '<abbr title="' + thiscat.replace('Category:', '') + '">' + thistag[1] + '</abbr>' + (thistag[2] ? '</span>' : '');
					}
					skip = true;
					return false;
				}
			});
			if (skip) return;
		});
		
		mdTags += '</span>';

		return mdTags;
	},
	
	/* Format a number > 1 (1000 --> 1 000) */
	mdFormattNumber: function( iNr ) {
		iNr += '';
		var rx = /(\d+)(\d{3})/;
		while (rx.test(iNr)) {
			iNr = iNr.replace(rx, '$1' + '<span style="font-size:40%;font-weight:100">&nbsp;</span>' + '$2');
		}
		return iNr;
	},

	/**  
	**  API-Call-back method to eval the queried file and add a thumb
	**/
	mdQueriedFile: function (result) {
		this.mdUploadCt--;
		
		$(document).triggerHandler('vFC', ['got detail-info', this, result]);
		
		if ('MD-Error' === this.context || 'MD-postDlg' === this.context) return; // don't try to add something if there was an error.
		var pages = result.query.pages;
		
		var o = this;

		$.each(pages, function(id, pg) {
			var dirtyTitle = pg.title,
				uItem = o.iUploads[dirtyTitle],
				i, ii,
				seenHash = {};
			
			o.$AjaxMdNotReady.contents().eq(0).replaceWith('Querying detailed information: ' + (o.mdUploadCt) + 
			' batch-queries pending. Total files: ' + (o.iiUploads) + '. Current image: ' + dirtyTitle); 

			if ('undefined' === typeof pg.imageinfo) { 
				try { 
					o.$AjaxDeletedUploads.append(o.mdSecureCall('mdCreateDelUploadItem', dirtyTitle));
				} catch (e) {} 
				return; 
			} // The file has been deleted

			/*  Adding a thumbnail to the dialog  */
			o.mdBusy = true;
			o.mdActualResultCount++;
			
			if (o.mdModeCat) {
				for (i = pg.imageinfo.length - 1; i >= 0; i--) {
					ii = pg.imageinfo[i];
					if (ii.sha1 && !seenHash[ii.sha1]) {
						seenHash[ii.sha1] = true;
						// Admins can hide usernames. Make sure not pushing undefined.
						if (ii.user) {
							uItem.uploader.push(ii.user);
							uItem.comments.push(ii.comment || '');
						}
					}
				}
			}
			
			ii = pg.imageinfo[0];
			ii.metadata = ii.metadata || [];      // not all images have metadata
			pg.categories = pg.categories || [];  // not all images have categories

			uItem.content = pg.revisions[0]['*']; // save the content for OTRS usage, replace and find-the-real-uploader
			uItem.basetimestamp = pg.revisions[0].timestamp; // timestamp to detect edit conflicts
			uItem.categories = pg.categories;     // save cats for cute-selection
			uItem.metadata = ii.metadata;         // save Exif and other for cute-selection
			uItem.size = (ii.size >> 10);         // for cute-selection
			
			// List all Meta-Keys
			if (ii.metadata.length) {
				$.each(ii.metadata, function(i, m) {
					var tp = typeof m.value;
					if (tp === 'string' || tp === 'number' || tp === 'boolean') {
						if (-1 === $.inArray(m.name, o.metaKeys)) o.metaKeys.push(m.name);
					}
				});
			}
			
			var camModel = o.mdSecureCall('mdGetCamModel', uItem);
			var loglink = mw.config.get('wgServer') + mw.config.get('wgScript') + '?title=Special:Log&page=' + mw.util.wikiUrlencode(dirtyTitle);
			
			var $galleryBox = o.mdCreateGalleryBox(
				[ $('<a>', { href: ii.descriptionurl, target: '_blank', 'class': 'image' })
					.append( $('<img>', { src: ii.thumburl, width: ii.thumbwidth, height: ii.thumbheight, alt: dirtyTitle }) ) ],
				[ ('<i>' + uItem.iId + ': </i>'),
				$('<input>', { type: 'checkbox', name: 'mdCheckDelete', value: dirtyTitle } ),
				$('<span>', { 'class': 'tipsycategory' }).text('c'), ' ',
				(($.isArray(ii.metadata) && !!ii.metadata.length) ? 
					$('<span>', { 'class': 'tipsymetadata' }).text(camModel || 'm') : 
					''), 
				$('<a>', { href: loglink, target: '_blank', text: 'log', 'class': 'md-loglink' }), '<br/>',
				(o.mdSecureCall('mdExtractTags', pg.categories)), ' ',
				$('<a>', { href: ii.descriptionurl, target: '_blank', 'class': 'image jFileTitle' })
					.text(dirtyTitle),
				$('<div>', { 'class': 'jFileTime' }).text(uItem.time.replace(/[T|Z]/g, " ")),
				$('<div>', { 'class': 'jFileSize' }).html(
					o.mdSecureCall('mdFormattNumber', uItem.size) 
					+ '&nbsp;<abbr title="1 KibiByte= 1024 Bytes">KiB</abbr>&nbsp; '
					+ (o.mdSecureCall('mdFormattNumber', ii.width) + '&nbsp;×&nbsp;' + o.mdSecureCall('mdFormattNumber', ii.height)) 
					+ 'px')
				],
				150,
				'',
				dirtyTitle,
				ii.thumbheight
			);
			o.gbs[dirtyTitle] = $galleryBox;
			o.mdBusy = false;
 
			if ( pg.edittoken ) { // prevent assigning an empty edit token
				o.edittoken = pg.edittoken; 
			} 
		});
		if (0 === this.mdUploadCt) this.nextTask();
	},
 
	/**  
	**  Called when a batch of files has been queried  
	**/
	mdQueryFileDone: function () {
		var o = this;
		
		// Append all queried files to the screen-container
		$.each(this.iUploads, function(id, uItem) {
			if (!uItem.gbInUse) {
				var $galleryBox = o.gbs[id];
				if ($galleryBox) {
					uItem.gbInUse = true;
					o.$AjaxMdUlContainer.append($galleryBox);
					o.mdThumbsOnDlg++;
				}
			}
		});

		this.mdBusy = false;
		this.mdPendingBatchQueries--;
		$('#AjaxMdNotReady').hide();
		this.pb.setCurrentTaskDone();
		
		$(document).triggerHandler('vFC', ['detail-info processed', o]);
 
		if ( (o.iiUploads > (o.iCurrentIId + 1))  || !o.mdNoMoreFiles) {
			o.$mdQueryMoreBtn.button('option', 'disabled', false);
			$('.ui-dialog > .ui-dialog-content').bind('scroll', function() {
				if ( o.$mdQueryMoreBtn.visible().length > 0 ) {
					o.mdSecureCall('mdQueryMore');
				}
			});
		}
		if (!o.mdNoMoreFiles) { // silently run the next upload-list-query in background
			o.mdSecureCall('mdCreateList');
		}
 
		document.body.style.cursor = 'auto';
		if (0 === o.mdActualResultCount) { // If there are no thumbs on the dialog, continue
			if ('MD-RevertImage' !== o.context) { // Don't shedule further tasks if called from revert part
				if ('MD' === o.context) {
					if (!o.mdModeCat && !o.mdNoMoreFiles) {	
						return;
					} else {
						alert(o.i18n.mdNoResult.replace("%TARGET%", o.mdTarget));
					}
				}
				o.mdDlgThumbDlgClose(); // remove the dialog
				if (!o.mdModeCat) o.addTask('mdRvGenOGallery');
				o.addTask('mdExecuteReady');
			}
			o.nextTask();
		}
	},
 
	/**  
	**  Called by scroll-event when the button "more" becomes visible (mdQueryFileDone binds the evt) or onClick on the button
	**/
	mdQueryMore: function () {
		if (0 === this.mdPendingBatchQueries) {
			this.mdUploadCt = 0;
			this.addTask('mdQueryFileDone');
			this.mdSecureCall('mdSendNextQueries');
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
				if (this.oUploads.hasOwnProperty(upload)) {
					var query = {
						action: 'view',
						title: upload
					};
					$('#AjaxMdNotReady').contents().eq(0).replaceWith("Obtaining information from index.php for " + upload);
					this.doHTTPRequest(query, 'mdRvQueriedFile', 'GET');
					this.mdUploadCt++;
				}
			}
		}
		if (0 === this.mdUploadCt) this.nextTask();
	},
 
	mdRvQueriedFile: function (result) {
		this.mdUploadCt--;
		if ('MD-Error' === this.context || 'MD-postDlg' === this.context) {
			this.mdRvAllFilesQueried();
			return;
		}
		var parsedDOM = $(result);
		var pageTitle = $('#firstHeading', parsedDOM).contents().eq(0).text();
		if (pageTitle && -1 !== pageTitle.indexOf('File:')) {
			$('#AjaxMdNotReady').contents().eq(0).replaceWith('Querying detailed information and obtaining edittoken. Pending ' + (this.mdUploadCt) + 
			' of ' + (this.ioUploads) + ' total uploads current image: ' + pageTitle); 
			var rvMatrix = this.mdSecureCall("mdRvCreateImgRevisionMatrix", parsedDOM);
			var preVandalRv = 0;
			if (0 === rvMatrix.length || 'object' !== typeof rvMatrix[0] || rvMatrix[0].user !== this.mdTarget) { 
				this.mdRvAllFilesQueried();
				return;
			}
			for (var rv in rvMatrix) {
				// Find the first revision of another user
				if (rvMatrix.hasOwnProperty(rv) && (rvMatrix[rv].user !== this.mdTarget)) {
					preVandalRv = rvMatrix[rv];
					break;
				}
			}
			if ('object' === typeof(preVandalRv)) {
				if ('object' !== typeof(this.oUploads[pageTitle])) { // Is this upload in the list?
					var pageTitleR = $('#contentSub > a', parsedDOM).eq(0).attr('title'); // Redirect
					if ('' === pageTitleR || 'object' !== typeof this.oUploads[pageTitleR]) {
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
 
				var $galleryBox = this.mdCreateGalleryBox(
					[ $('<a>', { href: imgDescrPageLink, target: '_blank', 'class': 'image' })
						.append( $('<img>', { style: 'vertical-align:top', src: rvMatrix[0].img, width: (0 !== rvMatrix[0].imgWidth ? rvMatrix[0].imgWidth : ''), height: (0 !== rvMatrix[0].imgHeight ? rvMatrix[0].imgHeight : ''), alt: pageTitle })), 
					('<p style="vertical-align:middle">revert to ' + preVandalRv.user + '</p>'), 
					$('<a>', { href: preVandalRv.href, target: '_blank', 'class': 'image' })
						.append( $('<img>', { style: 'vertical-align:bottom', src: preVandalRv.img, width: (0 !== preVandalRv.imgWidth ? preVandalRv.imgWidth : ''), height: (0 !== preVandalRv.imgHeight ? preVandalRv.imgHeight : ''), alt: pageTitle }) ) ],
					[ ('<i>' + this.oUploads[pageTitle].iId + ': </i>'),
					$('<input>', { type: 'checkbox', name: 'mdCheckDelete', value: pageTitle } ),
					('<a' + imgDescrPageLink + '>' + pageTitle.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;') + '</a>') ],
					310,
					'',
					pageTitle,
					rvMatrix[0].imgHeight
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
			if (0 === this.mdActualResultCount) {
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
				if ('object' !== typeof(revArray[Math.floor(iCell/cols)]) && Math.floor(iCell/cols) >= 0) revArray[Math.floor(iCell/cols)] = {};
				if ( $(val).children('a').length ) {
					var aNode = $(val).children('a').eq(0),
						hrefContent;

					if ( -1 !== $(aNode).attr('href').indexOf("wpEditToken=") ) {
						hrefContent = $(aNode).attr('href'); // with (revArray[Math.floor(iCell/cols)]) { - why it doesn't work?
						revArray[Math.floor(iCell/cols)].editToken = hrefContent.match(/wpEditToken=[a-fA-F0-9]{32}\%2B\%5C/)[0].replace('wpEditToken=', '').replace('%2B%5C', '+\\');
						revArray[Math.floor(iCell/cols)].oldImage = hrefContent.match(/oldimage=\d+\%21/)[0].replace('oldimage=', '').replace('%21', '');
						return true;
					}
					if ( -1 !== $(aNode).attr('class').indexOf("mw-userlink") ) {
						revArray[Math.floor(iCell/cols)].user = $(aNode).contents().eq(0).text();
						return true; // skip the other tests, like continue in a loop
					}
					if ( -1 !== $(aNode).attr('href').indexOf("//upload.wikimedia.org/wikipedia/")) {
						hrefContent = $(aNode).attr('href');
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
		if (0 === this.mdUploadCt) {
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
		if (!$('#mw-returnto', $(result)).children().length) { 
			// Error!
		}
		if (0 === this.mdUploadCt) {
			this.mdDlgThumbDlgClose();
			this.nextTask();
		}
	},
 
	mdExecuteReady: function () {
		this.context = "QD";
		this.pb.setCurrentTaskDone();
		var o = this;

		var $dlgNode = $('<div>', { id: 'mdWhereToGoDlg', title: 'What would you like to do next?', text: 'Note: You cannot execute new requests without reloading this page. ' })
			.append($('<br/>'), $('<a>', { href: '#', text: 'But you can save your inputs into a profile.' }).click(function(e) {
				e.preventDefault();
				o.mdProfile();
			}))
			.append($('<br/>'), mw.html.escape('The inputs of the last executed requests are automatically saved.'));
		var $ulNode = $('<ul>');
		
		var addLink = function(href, text, target) {
			$('<li>').append($('<a>', { 
				style: 'font-size:2em; line-height:1.8em', 
				href: mw.util.wikiGetlink(href),
				target: target,
				text: text
			})).appendTo($ulNode);
		};
		
		if (this.mdWasAPIError) {
			$dlgNode.append(
				o.createNotifyArea('We regret the the inconvenience: The Server-API returned an error during executing your requested task. ' +
				'Please check your contributions, whether something went wrong.',
				'ui-icon-alert', 'ui-state-error')
			);
		}
		addLink('Special:MyContributions', "Check your contributions", 'contribswindow');
		
		if ( this.mdInsertedTag ) {
			var encTitle;
			if ('del' === this.mdTaskToPerform) {
				// allow navigating to the new created deletion request
				addLink(this.requestPage, "Go to the created request page");
			}
			if (!this.mdModeCat && (-1 === $.inArray(this.mdTaskToPerform, ['c_replace', 'OTRS', 'other']))) {
				addLink(this.mdUserTalkPrefix + this.mdTarget, "Look at the user\'s talk-page");
				addLink(this.mdContribPrefix + this.mdTarget, "...or the user\'s contribs");
				// Revert files overwritten by this user ....
			}
			addLink(mw.config.get('wgPageName'), "Reload this page", '_self');
		}
		$dlgNode.append($ulNode).dialog({
			show: { effect: 'highlight', duration: 1800 },
			width: Math.min(450, $(window).width())
		});
		document.title = "VisualFileChange: Ready!";
	},

	mdGoToSite: function (target) {
		if (!window.VisualFileChangeDebug && !this.mdWasAPIError) {
			setTimeout(function() {
				location.href = target;
			}, 5000);
		}
	}
});

mw.loader.using(['jquery.ui.dialog', 'jquery.ui.button', 'jquery.tipsy', 'jquery.placeholder'], function() {
	$(document).triggerHandler('scriptLoaded', ['VisualFileChange', 'displayComponents']);
});

}(jQuery, mediaWiki));