// Main script is at [[MediaWiki:VisualFileChange.js]]
// These are the delayed loaded display components (UI) in order to speed up loading of the first UI
// <nowiki>

// Invoke jsHint-validation

/*global jQuery:false, mediaWiki:false, alert:false */
/*jshint curly:false, maxerr:200, laxbreak:true, bitwise:false,*/
(function ($, mw, undefined) {
'use strict';

// Return if Main Script is not loaded
if (!window.VisualFileChange) return;
// Return if this script is already loaded
if (window.VisualFileChange.displayComponents) return;

var css,
	vfc = window.VisualFileChange,
	i18n = vfc.i18n,
	$doc = $(document),
	$win = $(window);
	
css = ' .rgallery { background-color:#FFF !important; }\n'
	+ ' #AjaxMdContainer { position:relative; }\n'
	+ ' .md-toggle-pane { position:absolute; }\n'
	+ ' .md-nav-button { display:inline-block; background-color:white; border:2px solid #f3f3f3; -webkit-border-radius:10px; -moz-border-radius:10px; border-radius:10px } '
	+ ' .md-nav-button:hover, .md-nav-button:focus { background-color:#f0f0fd; }'
	+ ' .md-nav-button:active { border-color:#ccc }'
	+ ' .md-nav-button-container { position:absolute; top:3em; right:1.5em; max-width:18px }\n'
	+ ' .md-nav-button-wrap { display:inline-block; background:none!important; border:none!important; }\n'
	+ ' .numbersOnly { text-align:right; }\n'
	+ ' .md-deleted-uploads { width:99%; display:none; background:#FCC url(//upload.wikimedia.org/wikipedia/commons/d/d6/User-trash.png) no-repeat scroll center; }\n'
	+ ' a:link.md-loglink { color:#BB6!important; display:inline-block; }\n'
	+ ' a.md-talklink { color:#888!important; border-bottom: 1px Dotted #555; white-space:nowrap; font-style:italic; font-weight:bold; margin-right:4px; display:inline-block; text-decoration:none!important; }\n'
	+ ' .tipsycategory { border-bottom: 1px Dotted #888; font-style:italic; margin-right:4px; display:inline-block; cursor:help }\n'
	+ ' .tipsymetadata { color:#6389C2; border-bottom: 1px Dotted #57B; white-space:nowrap; font-style:italic; font-weight:bold; margin-right:4px; display:inline-block; cursor:help }\n'
	+ ' .jFileTitle { display:block; text-align:center; padding-right:0px !important; background: #eee !important; margin-top:3px; border-radius:5px; }\n'
	+ ' .jFileTime { color:gray;font-size:0.9em; line-height:1.1em; }\n'
	+ ' .jFileSize { color:green;font-size:0.9em; }\n'
	+ ' li.rgallerybox { width:155px; background:#f8f8f8; border:#FFF 2px solid; }\n'
	+ ' li.md-selected { background-color:#BBE; }\n'
	+ ' li.md-selected div.thumb { background-color:#DDE; border:#FFF 1px solid; }\n'
	+ ' div.jImage { position:relative }\n'
	+ ' div.jProgress { position:absolute; top:0px; left:0px; height:16px; width:16px }\n'
	+ ' div.jImage.progress-doing div.jProgress { background:url(\'' + vfc.icons.current + '\') no-repeat center; }\n'
	+ ' div.jImage.progress-done div.jProgress { background:url(\'' + vfc.icons.done + '\') no-repeat center; }\n'
	+ ' div.jImage.progress-failed div.jProgress { background:url(\'' + vfc.icons.failed + '\') no-repeat center; }\n'
	+ ' div.jImage.progress-nochange div.jProgress { background:url(\'' + vfc.icons.nochange + '\') no-repeat center; }\n'
	+ ' div.jGU { position:absolute; right:0px; bottom:0px; height:0px; width:0px; overflow:visible; cursor:pointer }\n'
	+ ' li.rgallerybox div.jImage.progress-done { border:2px solid #393; }\n'
	+ ' li.rgallerybox div.jImage.progress-failed { background-color:#ebb; border:2px solid #933; }\n'
	+ ' li.rgallerybox div.jImage.progress-nochange { background-color:#eeb; border:2px solid #993; }\n'
	+ ' .md-re-escape-helper { position:absolute; z-index:1002; color:#FFF; cursor:pointer; padding:3px; -webkit-border-top-left-radius: 8px; -webkit-border-bottom-left-radius: 8px;-moz-border-radius-topleft: 8px;-moz-border-radius-bottomleft: 8px;border-top-left-radius: 8px;border-bottom-left-radius: 8px; ' + 
		'background: rgb(97,196,25); background: -moz-radial-gradient(center, ellipse cover, rgb(97,196,25), rgb(180,227,145)); background: -webkit-gradient(radial, center center, 0px, center center, 100%, color-stop(0%,rgb(97,196,25)), color-stop(100%,rgb(180,227,145))); ' + 
		'background:-webkit-radial-gradient(center, ellipse cover, rgb(97,196,25),rgb(180,227,145)); background: -o-radial-gradient(center, ellipse cover, rgb(97,196,25),rgb(180,227,145)); background: -ms-radial-gradient(center, ellipse cover, rgb(97,196,25),rgb(180,227,145)); background: radial-gradient(center, ellipse cover, rgb(97,196,25),rgb(180,227,145)); }\n'
	+ ' .md-examine-contents { display:inline-block; width:49%; white-space:pre-wrap; font-family:monospace; border:1px solid #362B36; text-align:left; word-wrap:break-word; }\n'
	+ ' li#mdLastSelected { border:#447 2px solid; }\n';
	
// Fix https://bugzilla.wikimedia.org/show_bug.cgi?id=32687 and some vector readability improvements
if ('vector' === mw.config.get('skin')) css += ' .ui-buttonset .ui-button { margin-left:0px!important; margin-right:-.3em!important; }\n' 
		+ ' .ui-buttonset .ui-button-text-only > .ui-button-text { padding-left:0.5em !important; padding-right:0.5em !important; }\n'
		+ ' .ui-buttonset > label.ui-state-active { background:#F0F0F0 !important; }\n'
		+ ' .md-examine-contents { font-size:1.2em; }';
	
mw.util.addCSS(css);


$.extend(window.VisualFileChange,
{
	displayComponents: true,
	
	/**  
	**  Called by nextTask after the fill-in-user-dialog and by mdQueryFileDone (follows later)
	**  Calls the appropriate method (uploads of cats)
	**/
	mdCreateList: function () {
		var si = vfc.startInput,
			qp = vfc.queryParams;
		
		if (vfc.mdNumberOfExecs) {
			$doc.triggerHandler('vFC', ['filelist query aborted due to exection of edit-tasks', vfc]);
			return true;
		}
		if (vfc.mdListUploadsPending > 0) {
			$doc.triggerHandler('vFC', ['filelist will queried later due to a pending query', vfc]);
			setTimeout(function () { 
				vfc.mdCreateList();
			}, 200); // See me later ...
			return true;
		}
		$doc.triggerHandler('vFC', ['preparing querying the filelist', vfc]);
		vfc.pb.setCurrentTaskDone();
		vfc.pb.setTaskState( 'list', 'md-doing' );
		if (vfc.mdFirstRun) { // First time only
			vfc.pb.setHelp(i18n.mdPleaseWait);
		}
		
		if (vfc.internalState !== 'md') return;
		vfc.mdListUploadsPending++;
		
		var method;
		if (si.modeCat) method = 'mdFindCatMembers';
		if (si.modeUser) method = 'mdFindUploads';
		if (si.modePage) method = 'mdFindFiles';
		vfc.secureCall(method);
	},
	
	mdSaveContinueKey: function (key) {
		vfc.lastContinues.vals.push(key);
		if (vfc.lastContinues.vals.length > 2) vfc.lastContinues.vals.shift();
	},
	
	mdFindUploads: function () {
		var qp = vfc.queryParams;
		var query = {
			action: 'query',
			list: 'logevents',
			leprop: 'title|type|timestamp',
			leaction: 'upload/upload',
			leuser: qp.target,
			lelimit: vfc.mdSettings.loadBatchSize,
			ledir: qp.ledir
		};
		if (qp.lestart) query.lestart = qp.lestart;
		$doc.triggerHandler('vFC', ['useruploads', vfc, query]);
		vfc.queryAPI(query, 'mdFindUploadsCB');
	},
	
	mdFindUploadsCB: function (result) {
		vfc.mdListUploadsPending--;
		$doc.triggerHandler('vFC', ['got useruploads', vfc, result]);
		vfc.pb.setCurrentTaskDone();
		
		var allFileChanges = result.query.logevents,
			qp = vfc.queryParams;
		
		$.each(allFileChanges, function(id, fc) { // loop through all filechanges (upload-events) (array)
		
			// This file was initially uploaded by the user.
			if ('upload' === fc.action) { 
				// Do not mess-up numbers when a file was deleted and re-uploaded
				if (fc.title in vfc.iUploads) return; 
				vfc.iUploads[fc.title] = { uploader: [] };
				vfc.iUploads[fc.title].iId = vfc.iiUploads;
				vfc.iUploads[fc.title].time = fc.timestamp;
				vfc.iiUploads++;
			// User overwrote file.
			} else if ('overwrite' === fc.action) {
				vfc.oUploads[fc.title] = {};
				vfc.oUploads[fc.title].iId = vfc.ioUploads;
				vfc.oUploads[fc.title].time = fc.timestamp;
				vfc.ioUploads++;
			}
			
		});
		
		if (!result['query-continue']) { 
			vfc.mdNoMoreFiles = true;
		}
		if (!vfc.mdNoMoreFiles) {
			qp.lestart = result['query-continue'].logevents.lestart;
			vfc.mdSaveContinueKey(qp.lestart);
		}
		if (vfc.mdFirstRun) {			// Call nextTask the first time only
			vfc.mdFirstRun = false;
			vfc.nextTask();
		} else {
			if (!vfc.mdActualResultCount) vfc.secureCall('mdQueryMore');
		}
	},
	
	mdFindCatMembers: function () {
		var qp = vfc.queryParams;
		
		var query = {
			action: 'query',
			list: 'categorymembers',
			cmtitle: qp.target,
			cmtype: 'file',
			cmprop: 'title|type|timestamp',
			cmlimit: vfc.mdSettings.loadBatchSize,
			cmdir: qp.cmdir,
			cmsort: qp.cmsort
		};
		// "[cmtype is] Ignored when cmsort=timestamp is set"
		if ('timestamp' === qp.cmsort) query.cmnamespace = 6;
		// Prevent passing empty params
		if (qp.cmcontinue) query.cmcontinue = qp.cmcontinue;
		if (qp.cmstart) query.cmstart = qp.cmstart;
		if (qp.cmstartsortkey) query.cmstartsortkey = qp.cmstartsortkey;
		$doc.triggerHandler('vFC', ['catmembers', vfc, query]);
		
		vfc.queryAPI(query, 'mdFindCatMembersCB');
	},
	
	mdFindCatMembersCB: function (result) {
		vfc.mdListUploadsPending--;
		$doc.triggerHandler('vFC', ['got catmembers', vfc, result]);
		vfc.pb.setCurrentTaskDone();
		
		var qp = vfc.queryParams;
		
		// loop through all category-members (object)
		$.each(result.query.categorymembers, function(id, fc) {
			vfc.iUploads[fc.title] = { uploader: [], comments: [] };
			vfc.iUploads[fc.title].iId = vfc.iiUploads;
			vfc.iUploads[fc.title].time = fc.timestamp;
			vfc.iiUploads++;
		});
		if (!result['query-continue']) { 
			vfc.mdNoMoreFiles = true;
		}
		if (!vfc.mdNoMoreFiles) {
			qp.cmcontinue = result['query-continue'].categorymembers.cmcontinue || result['query-continue'].categorymembers.cmstart;
			if (result['query-continue'].categorymembers.cmstart) qp.cmstart = result['query-continue'].categorymembers.cmstart;
			vfc.mdSaveContinueKey(qp.cmcontinue || qp.cmstart);
		}
		if (vfc.mdFirstRun) {			// Call nextTask the first time only
			vfc.mdFirstRun = false;
			vfc.nextTask();
		}
	},
	
	mdFindFiles: function () {
		var qp = vfc.queryParams;
		
		var query = {
			action: 'query',
			prop: 'images',
			titles: qp.target,
			imlimit: vfc.mdSettings.loadBatchSize,
			imdir: qp.imdir
		};
		// Prevent passing empty params
		if (qp.imcontinue) query.imcontinue = qp.imcontinue;
		$doc.triggerHandler('vFC', ['imagesonpage', vfc, query]);
		
		vfc.queryAPI(query, 'mdFindFilesCB');
	},
	
	mdFindFilesCB: function (result) {
		vfc.mdListUploadsPending--;
		$doc.triggerHandler('vFC', ['got imagesonpage', vfc, result]);
		vfc.pb.setCurrentTaskDone();
		
		var qp = vfc.queryParams;
		
		// loop through all pages-members (there should be only one)
		$.each(result.query.pages, function(pgId, pg) {
			if (!pg.images && pg.missing !== undefined) throw new Error("Page does not exist. Enter full page name!");
			if (!pg.images && pg.invalid) throw new Error("Invalid page name specified.");
			if (!pg.images) pg.images = {};
			
			$.each(pg.images, function(imNr, im) {
				vfc.iUploads[im.title] = { uploader: [], comments: [] };
				vfc.iUploads[im.title].iId = vfc.iiUploads;
				vfc.iiUploads++;
			});
		});
		if (!result['query-continue']) { 
			vfc.mdNoMoreFiles = true;
		}
		if (!vfc.mdNoMoreFiles) {
			qp.imcontinue = result['query-continue'].images.imcontinue;
			vfc.mdSaveContinueKey(qp.imcontinue);
		}
		if (vfc.mdFirstRun) {			// Call nextTask the first time only
			vfc.mdFirstRun = false;
			vfc.nextTask();
		}
	},
	
	mdRegExpFromString: function(st) {
		var match, m = st.match(vfc.mdRegExpPattern);
		if (m && m[0] && m[1]) {
			match = new RegExp(m[1], m[2]);
		} else {
			match = '';
		}
		return match;
	},
	
	mdVarReplacements: function(replacetext, uploadTitle, uploadObject) {
		if (!/\%.+\%/.test(replacetext)) return replacetext;

		replacetext = replacetext.replace('%PAGENAME%', uploadTitle.replace(/^File:/, ''));
		replacetext = replacetext.replace('%FULLPAGENAME%', uploadTitle);
		replacetext = replacetext.replace('%FULLPAGENAMEE%', encodeURIComponent(uploadTitle));
		$.each(uploadObject.metadata, function(i, el) {
			if (-1 !== $.inArray(typeof el.value, ['string', 'number'])) replacetext = replacetext.replace('%' + el.name + '%', el.value);
		});
		return replacetext;
	},
	
	mdCreateExamineNode: function() {
		var $examineToggler, $examineInput, $examineButton, $loadDivButton, $examineFirstDiv, $examineSecondDiv, $examineDiffDiv, $examineOuterDiv;
			
		var _getRenderLink = function(text, title, $node) {
			var rl, 
				blockCSS = { width: '99%' }, 
				__doUnblock   = function() { $node.unblock(); return false; },
				$blockNode    = $('<div>', { style: 'text-align:left;', title: "Click to hide preview", click: __doUnblock }),
				$closeButton  = $.createIcon('ui-icon-close').css({ cursor: 'pointer', 'float': 'right' }).click(__doUnblock).appendTo($blockNode),
				$blockContent = $('<div>').appendTo($blockNode);
				
			var _gotParsedText = function(t) {
				$blockContent.html(t);
				// Block again in order to vertically center text
				$node.block({ css: blockCSS, message: $blockNode });
			};
			rl = $('<a>', { href: '#render', text: 'Render preview', style: 'display:inline-block; float:right; font-family:sans-serif;' }).button().click(function(e) {
				e.preventDefault();
				$blockContent.html('').append($('<div>', { style: "text-align:center; font-size:2em; line-height:1.5em", text: "Server is parsing wiki-markup" }));
				$node.block({ css: blockCSS, message: $blockNode });
				mw.libs.commons.api.parse(text, mw.config.get('wgUserLanguage'), title, _gotParsedText);
			});
			return rl;
		};
		$examineInput = $('<input>').attr({ type: 'text', 'class': 'numbersOnly', maxlength: 4, size: 11, placeholder: 'file number' }).placeholder();
		$examineButton = $('<button>', { text: 'Compare!' }).click(function() {
			$examineFirstDiv.text('');
			$examineSecondDiv.text('');
			if (!$examineInput.val()) return;
			var replaceSecurityLevel = vfc.$selPreserve.val();

			$.each(vfc.iUploads, function(upload, curUpld) {
				if (!curUpld.content || (Number($examineInput.val()) !== curUpld.iId)) return;

				var newText,
					oldText = curUpld.content,
					replaceContainer = mw.libs.wikiDOM.nowikiEscaper(oldText);
					
				replaceContainer.alsoPreserve(vfc.$alsoPreserve.val());

				$.each(vfc.mdReplacementMatrix, function(i, rObj) {
					var match, replace;
					match = rObj.match.val();
					replace = rObj.replace.val();
					
					if (rObj.regex[0].checked && match) {
						match = vfc.mdRegExpFromString(match);
					}
					if (!match) return;
					
					if (rObj.vars[0].checked) replace = vfc.mdVarReplacements(replace, upload, curUpld);
					
					switch (replaceSecurityLevel) {
						case 'secure':
							replaceContainer.secureReplace(match, replace);
							break;
						case 'placeholder':
							replaceContainer.replace(match, replace);
							break;
						case 'none':
							replaceContainer.ordinaryReplace(match, replace);
							break;
					}
				});

				newText = replaceContainer.doCleanUp();
				
				// Side by side
				$examineFirstDiv.text(oldText);
				$examineSecondDiv.text(newText);
				$examineSecondDiv.prepend(_getRenderLink(newText, upload, $examineOuterDiv));
				
				// Diff
				if (mw.libs.schnark_diff && mw.libs.schnark_diff.html_diff) {
					$examineDiffDiv.html('<a target="_blank" href="//de.wikipedia.org/wiki/Benutzer:Schnark/js/diff/core" style="display:inline-block; float:right; font-family:sans-serif;">Powered by SchnarkDiff</a>' + mw.libs.schnark_diff.html_diff(oldText, newText, true));
				}
			});
		}).button({ icons: { primary: 'ui-icon-search' } });
		$loadDivButton = $('<button>', { text: 'Diff' }).click(function() {
			var $btn = $(this);
			$btn.button({ disabled: true, label: 'Loading from [[:de:Benutzer:Schnark/js/diff.js/core.js]]' });
			vfc.loadModule('diff', function() {
				$btn.button({ label: 'Diff loaded' });
				$examineButton.click();
			});
		}).button({ icons: { primary: 'ui-icon-shuffle' } });
		
		$examineFirstDiv = $('<div>', { 'class': 'md-examine-contents' });
		$examineSecondDiv = $('<div>', { 'class': 'md-examine-contents' });
		$examineDiffDiv = $('<div>', { 'class': 'md-examine-contents', style: 'width:98%' });
		$examineOuterDiv = $('<div>', { style: 'text-align:center;' }).append($examineInput, ' ', $examineButton, ' ', $loadDivButton, ' ', $('<div>').append($examineDiffDiv, $examineFirstDiv, $examineSecondDiv));
		
		$('.numbersOnly').keyup(function () { 
			this.value = this.value.replace(/[^0-9]/g,'');
		});

		return vfc.$createToggler('Examine scheduled changes', $examineOuterDiv.hide());
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
		var rowCount = 0;
		var $lastBigArea = 0;
		
		var $desc = $('<p>', { text: "Replacement is done row-by-row from top. Rows with empty or invalid pattern fields are skipped. When not using RegExp-replace only the first occurrence of the pattern in each file will be replaced." });
		var $regExpEscapeHelper = $('<div>', { style: 'display:none;', 'class': 'md-re-escape-helper', html: 'R. → /R\\./g', title: "Convert pattern to a \'match-all-occurrences-RegExp\'" }).click(function() {
			var $rREH = $(this),
				$serviceFor = $rREH.data('mdServiceFor'),
				$serviceForEnable = $rREH.data('mdServiceForEnable');
				
			$serviceFor.val('/' + vfc.mdEscapeSpecial($.escapeRE( $serviceFor.val() )) + '/g').keyup();
			if (!$serviceForEnable[0].checked) $serviceForEnable.click();
			
			$(this).hide();
		});
		var $table = $('<table>').attr({ style: 'border:1px solid #BBB', width: '100%', cellspacing: 0, cellpadding: 0 });
		var $thead = $('<thead>').append(
			$('<th>').append($('<abbr>', { title: "Replacing is done for each selected file from top to bottom", text: 'Nr ' })),
			$('<th>').append($('<a>', { title: "Flags (=options) control how to treat your input.", text: 'Flags', target: '_blank', href: mw.util.wikiGetlink('Help:VisualFileChange.js') + '#Custom_replace:_Flags' })),
			$('<th>').append($('<abbr>', { title: "Simple string or a /Regular Expression/ \nSimple strings are only replaced once per file", text:  'Pattern to match' })),
			$('<th>').append($('<abbr>', { title: "Text, %variables% and/or submatches of a RegExp ($1-$9) like /abc(.+?)ghi/", text: 'Text to insert instead' }))
		).appendTo($table);
		var $selPreserve = vfc.$selPreserve = $('<select>').attr({ id: 'selPreserve', size: 1 }).append(
			$('<option>', { text: 'Preserve nowikis, comments. Do this as secure as possible (internal split into array). (recommended)', value: 'secure' }),
			$('<option>', { text: 'Preserve nowikis, comments. Allow usage of substring and $1 (internal usage of placeholders (%v%f%c%\\d+)).', value: 'placeholder' }),
			$('<option>', { text: 'Do not preserve nowikis and comments.', value: 'none' })
		);
		var $alsoPreserveL = vfc.$alsoPreserve = $('<label>', { 'for': 'alsoPreserve', text: 'Also preserve the following areas from being replaced.' });
		var $alsoPreserve = vfc.$alsoPreserve = $('<input>').attr({ type: 'text', id: 'alsoPreserve', placeholder: 'RegExp without flags enclosed in (): /(toPreserve)/ Example: /(<gallery>(?:.|\\n)*?<\\/gallery>)/', style: 'width:99%' }).placeholder();
		var $tbody = $('<tbody>', { id: 'mdRTableBody' }).appendTo($table);
		var $rn = $('<tr>', { id: 'mdReplaceTextNode' }).append($('<td>').append($desc, $regExpEscapeHelper, $table, $selPreserve, $('<br/>'), $alsoPreserveL, $alsoPreserve, $('<br/>'), vfc.mdCreateExamineNode()));
		
		var regExTester = function($text, $cb, $replace) {
			var testConditions = function() {
				var val = $text.val(),
					isRE = vfc.mdRegExpPattern.test(val);
				$cb.parent().css('background', '');
				$text.css('background', '');
				if (isRE && !$cb[0].checked) {
					$cb.parent().css('background', '#FCC');
				} else if (!isRE && $cb[0].checked) {
					$text.css('background', '#FCC');
				}
				if (!val || isRE) {
					$regExpEscapeHelper.hide();
				} else {
					$regExpEscapeHelper.show();
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
			var $mA  = $newMatchArea(),
				$rA  = $newReplaceArea(),
				$rE  = $newRegexCheckBox(),
				$rEL = $newRegexLabel(),
				$v   = $newVarCheckBox(),
				$vL  = $newVarLabel();
			
			vfc.mdReplacementMatrix.push({ match: $mA, replace: $rA, regex: $rE, vars: $v });
			
			$mA.data('mdServiceForEnable', $rE);
			$rE.click(function(e) {
				e.stopPropagation();
			});
			$rEL.click(function(e) {
				e.stopPropagation();
			});
			regExTester($mA, $rE, $rA);
			$('<tr>', { align: 'center' }).append(
				$('<td>').append(rowCount + '.'),
				$('<td>', { style: 'max-width:15%' }).append($rE, $rEL, $v, $vL).buttonset(),
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
			return resizeHandler($('<textarea></textarea>').attr({ id: 'mdMatchText'+rowCount, rows: 1, cols: 50, style: 'width:95%', placeholder: "text or pattern to be replaced" }).bind('input.resize keyup.resize change.resize', function(e) {
				var $el = $(this);
				if (!$el.val()) return;
				$el.unbind('input.resize keyup.resize change.resize');
				$newRow();
			})).focus(function() {
				var $el = $(this),
					val = $el.val(),
					pos = $el.position();
					
				$regExpEscapeHelper.show().css('top', pos.top + 5).css('left', pos.left - $regExpEscapeHelper.width() - 6);
				$regExpEscapeHelper.data('mdServiceFor', $el);
				$regExpEscapeHelper.data('mdServiceForEnable', $el.data('mdServiceForEnable'));
				
				if (!val || vfc.mdRegExpPattern.test(val)) {
					$regExpEscapeHelper.hide();
				}
			});
		};
		var $newReplaceArea = function() {
			return resizeHandler($('<textarea></textarea>').attr({ id: 'mdReplaceText'+rowCount, rows: 1, cols: 50, style: 'width:98%', placeholder: "text or variables to be inserted instead" }));
		};		
		var $newRegexCheckBox = function() {
			return $('<input>').attr({ type: 'checkbox', id: 'mdRRegEx'+rowCount });
		};
		var $newRegexLabel = function() {
			return $('<label>', { 'for': 'mdRRegEx'+rowCount, text: '/R/', title: 'Select if Regular Expression. Use full JavaScript RegExp-Syntax like /find.+/g' });
		};
		var $newVarCheckBox = function() {
			return $('<input type="checkbox" checked="checked">').attr({ id: 'mdRVar'+rowCount });
		};
		var $newVarLabel = function() {
			return $('<label>', { 'for': 'mdRVar'+rowCount, text: '%V%', title: 'Select to allow inserting variables like %FULLPAGENAME%' });
		};
		$newRow();
		return $rn;
	},
	
	mdMwRTACache: {},
	mdMwReasonToAutocomplete: function(title, $el, saveKey) {
		var mwRTAtoken = vfc.mdMwRTAtoken = new Date();
		if (!title) {
			// Disable autocomplete
			$el.autocomplete({ disabled: true });
			// Discard pending query
			vfc.mdMwRTAtoken = 0;
			return;
		}
		var __gotResult = function(r) {
			var $r = $(r),
				suggestions = [],
				lastSummaries = $.jStorage.get(vfc.summaryChageKey);
				
			// Add last used summaries
			if (lastSummaries && lastSummaries[saveKey]) {
				suggestions = $.map(lastSummaries[saveKey], function(txt, i) {
					return { value: txt };
				});
			}
			
			// There is http://jqueryui.com/demos/autocomplete/#categories
			// But since there are only two groups, is seems to be unnecessary
			// to group the result
			$r.find('li > ul > li').each(function(i, li) {
				var $li = $(li),
					wikitext = '';
				$li.contents().each(function(x, n) {
					var $n = $(n),
						href = $n.attr('href');
					if (href) {
						href = href.match(vfc.mdWikipageRegExp);
						if (href && href[1]) {
							wikitext += '[[' + decodeURI(href[1]).replace(/^Commons:/, 'COM:').replace(/\%27/g, '\'').replace(/\%22/g, '\"') + '|' + $n.text() + ']]';
							return;
						}
					}
					wikitext += $n.text();
				});
				suggestions.push({ label: $li.text(), value: wikitext });
			});
			// Add to cache
			vfc.mdMwRTACache[title] = suggestions;
			// Upadate if the token matches
			if (mwRTAtoken === vfc.mdMwRTAtoken) $el.autocomplete({ disabled: false, source: suggestions });
		};
		if (title in vfc.mdMwRTACache) {
			// If a query for this page is pending, return
			var rtaItem = vfc.mdMwRTACache[title];
			if (rtaItem instanceof Date) {
				// Allows updating on callback (__gotResult)
				vfc.mdMwRTAtoken = rtaItem;
				return;
			}
			// Use the cached value
			$el.autocomplete({ disabled: false, source: rtaItem });
		} else {
			vfc.mdMwRTACache[title] = mwRTAtoken;
			mw.libs.commons.api.parse('{{' + title + '}}', mw.config.get('wgUserLanguage'), 'File:A.png', __gotResult, true);
		}
	},
 
	/**  
	**  Mammoth method to set up and manage the UserInterface (UI)
	**/
	mdGenIGallery: function() {
		$doc.triggerHandler('vFC', ['preparing initial uploads dialog', vfc]);
	
		vfc.mdUploadCt = 0;              // Number of pending API queries
		vfc.mdActualResultCount = 0;     // Doesn't include reverts and deleted media
		vfc.mdPendingBatchQueries = 0;   // Number of batches currently on query; should be max. 1
		vfc.mdThumbsOnDlg = 0;           // How many thumbs on the dialog?
		vfc.mdReplacementMatrix = [];    // Contains pointers to jQuery-Array-Inputfields for the custom replace
		vfc.mdDateOldestDataFetched = new Date();
		vfc.$ctrs = {};
		
		// Tipsy-tooltips for metadata and categories
		$('.tipsymetadata').die();
		$('.tipsymetadata').tipsy( {
			title: function() {
				$('.tipsy').remove();
				return vfc.secureCall('mdGetMetaTable', $(this).parent().attr('tipsy-title'), vfc);
			},
			live: true,
			html: true,
			gravity: $.fn.tipsy.autoNS
		} );
		$('.tipsycategory').die();
		$('.tipsycategory').tipsy( {
			title: function() { 
				$('.tipsy').remove();
				return vfc.secureCall('mdGetCatTable', $(this).parent().attr('tipsy-title'), vfc, false).html(); 
			},
			live: true,
			html: true,
			delayOut: 1000,
			gravity: $.fn.tipsy.autoNS
		} );

		/*  The UI  */
		var _callExec = function(action) {
			// Save suggestions:
			if (i18n.reasonAutoSuggest[action]) {
				var s  = $.jStorage.get(vfc.summaryChageKey) || {},
					ss = s[action] || [],
					nv = vfc.$ctrs.editSummary.val();
					
				while (ss.length > vfc.mdSettings.summaryChacheLen) {
					ss.pop();
				}
				if (nv && -1 === $.inArray(nv, ss)) {
					if (ss.length === vfc.mdSettings.summaryChacheLen && 0 !== ss.length) ss.pop();
					ss.unshift(nv);
				}
				s[action] = ss;
				$.jStorage.set(vfc.summaryChageKey, s);
			}
			vfc.secureCall('mdExecute');
		};
		var confirmDlg = function(title, text, cancel, ignore, icon, action) {
			var dlg2Btns = {};
			var dlgWidth = Math.min(600, $win.width() - 250);
			dlg2Btns[cancel] = function() {
				$(this).dialog("close");
			};
			dlg2Btns[ignore] = function() {
				$(this).dialog("close");
				_callExec(action);
			};
			$('<div>').append($('<img>', { src: icon, height: 128, width: 128, style: 'float:left;' }), $('<div>', { style: 'margin-top: 30px' }).text(text))
				.dialog({
					title: title,
					buttons: dlg2Btns,
					modal: true,
					position: [($win.width() - dlgWidth - 250) / 2 + 250, ($win.height() - 200) / 2 ],
					close: function() {
						$(this).dialog("destroy");
						$(this).remove();
					}
				});
		};
		
		var dlgButtons = {};
		dlgButtons[i18n.submitButtonLabel] = function() {
			var action = vfc.$ctrs.ajaxMdType.val(),
				pp = i18n.mdPotentialProblems,
				cf = vfc.mdCommandsExec[action].confirm;
				
			if ($('input[name="mdCheckDelete"]:checked').length === 0) {
				confirmDlg(pp.titleNf, pp.textNf, pp.back, pp.proceed, vfc.icons.info, action);
			} else if (cf) {
				var cfl = i18n.mdConfirm;
				confirmDlg(cfl[cf+'Title'] , cfl[cf], cfl[cf+'Cancel'], cfl[cf+'Ignore'], vfc.icons.question, action);
			} else {
				_callExec(action);
			}
		};
		dlgButtons[i18n.cancelButtonLabel] = function() {
			$(this).dialog("close");
		};

		var getSelect = function() {
			var sel = '<select size="1" id="AjaxMdType">';
			$.each(vfc.mdOpt, function(id, opt) {
				var ugs = vfc.mdCommandsExec[id].userGroups,
					disabled = '';
				if ($.isArray(ugs)) {
					var ugsIntersect = $.map(mw.config.get('wgUserGroups'), function(a) {return $.inArray(a, ugs) < 0 ? null : a;});
					if (0 === ugsIntersect.length) disabled = 'disabled="disabled"';
				}
				sel += '<option value="' + id + '" ' + disabled + '>' + mw.html.escape(i18n.mdOptions[id]) + '</option>';
			});
			sel += '</select>';
			return sel;
		};

		var dlgResizeTimeout = 0,
			$AjaxMdContainer = vfc.$AjaxMdContainer.text(''),
			si = vfc.startInput;
		
		vfc.dlg.dialog('widget').stop(true);
		if ($AjaxMdContainer.$banner) $AjaxMdContainer.$banner.fadeOut();
		$AjaxMdContainer.fadeIn();
		vfc.dlg.dialog({
			modal: false,
			title: vfc.mdHelpNode +
				' ' + i18n.action + ':&nbsp;' +
				getSelect() +
				'<label for="AjaxMdIa">' + i18n.mdDisselectAll + '</label><input type="checkbox" id="AjaxMdIa" value="1"/> &nbsp;',
			width: $win.width() - 250,
			height: $win.height(),
			buttons: dlgButtons,
			resizeStop: function(event, ui) { 
				clearTimeout(dlgResizeTimeout);
				dlgResizeTimeout = setTimeout(function() {
					$('.ui-dialog > .ui-dialog-content').eq(0).scroll(); 
				}, 500);
			} // Fire scroll evt on resize for (continue query if btn gets visible)
		});
		vfc.dlg.dialog( 'option', 'position', 'right' ).dialog( 'option', 'modal', 'false' ).css('padding', '3px 6px');
		var windowRezizeTimeout = 0;
		$win.resize(function() {
			clearTimeout(windowRezizeTimeout);
			windowRezizeTimeout = setTimeout(function() {
				if (vfc && vfc.dlg) vfc.dlg.dialog('option', 'width', $win.width() - (vfc.pb.isHidden() ? 0 : 250));
			}, 1000);
		});
		
		var subHeading,
			target = vfc.queryParams.target,
			targetHref = target,
			defaultHeading;
		
		if (si.modeCat) {
			subHeading = i18n.filesIn + ' -';
			defaultHeading = 'Files in [[:' + target + ']] ';
		}
		if (si.modeUser) {
			subHeading = i18n.filesBy + ' -';
			targetHref = vfc.mdUserTalkPrefix + targetHref;
			defaultHeading = 'Files uploaded by [[' + vfc.mdUserPrefix + target + '|' + target + ']] '
				+ '([[' + vfc.mdUserTalkPrefix + target + '|talk]] · [[' + vfc.mdContribPrefix + target + '|contribs]])';
		}
		if (si.modePage) {
			subHeading = i18n.filesOn + ' -';
			defaultHeading = 'Files on [[' + target + ']] ';
		}
		targetHref = mw.util.wikiGetlink(targetHref);
		
		
		// Build the input-ui
		// Save the controls into a var that's reference we need later
		$.extend(vfc.$ctrs, {
			ajaxMdType: $('#AjaxMdType'),
			ajaxMdIa: $('#AjaxMdIa'),
			taskForUser: $('<label>', { text: i18n.mdInsertDeleteReasen }).attr({ id: 'mdTaskForUser', 'for': 'mdDeleteReason' }),
			deleteReason: $('<textarea></textarea>').attr({ id: 'mdDeleteReason', style: 'width: 99%; height: 40px;' }),
			editSummaryL: $('<label>', { text: i18n.mdInsertEditSummary }).attr({ 'for': 'mdEditSummary' }),
			editSummary: $('<input>').attr({ type: 'text', id: 'mdEditSummary', style: 'width: 70%;', maxlength: 255, placeholder: "+Edit summary or reason" }),
			replacePermission: $('<input>').attr({ type: 'checkbox', id: 'mdReplacePermission' }),
			deleteHeading: $('<input>', { value: defaultHeading }).attr({ type: 'text', id: 'mdDeleteHeading', style: 'width: 99%;', placeholder: "Heading for deletion request" }),
			talkNote: $('<input>', { value: vfc.mdSettings.userNote }).attr({ type: 'text', id: 'mdTalkNote', style: 'width: 99%;', placeholder: "Comments for the uploader" }),
			ajaxDeletedUploads: $('<ul>').attr({ id: 'AjaxDeletedUploads', 'class': 'md-deleted-uploads' }),
			ajaxMdNotReady: $('<div>', { text: "Please wait while enumerating uploads…" }).attr({ id: 'AjaxMdNotReady' }),
			ajaxMdUlContainer: $('<ul>').attr({ id: 'AjaxMdUlContainer', 'class': 'gallery rgallery' }),
			ajaxMdActionConfirm: $('<span>').attr({ id: 'AjaxMdActionConfirm' })
		});

		vfc.$ctrs.container = $('<div>', { id: 'mdControlContainer', 'class': 'ui-widget-content' }).css('padding', '6px 10px');

		var $toTop = $('<div>', { 'class': 'md-nav-button-wrap ui-helper-reset' }).append($('<a>', { 'class': 'md-nav-button ui-icon ui-icon-arrowstop-1-n', href: '#goToTop', text: '↑', title: "To top" })),
			$toBottom = $('<div>', { 'class': 'md-nav-button-wrap ui-helper-reset' }).append($('<a>', { 'class': 'md-nav-button ui-icon ui-icon-arrowstop-1-s', href: '#goToBottom', text: '↓', title: "To bottom" })),
			$navButtonContainer = $('<div>', { 'class': 'md-nav-button-container' }).append($toTop, ' ', $toBottom).appendTo(vfc.dlg.dialog('widget')),
			__onHover = function() { $(this).addClass('ui-state-hover'); },
			__onOut = function() { $(this).removeClass('ui-state-hover'); },
			__onDown = function() { var $i = $(this); $(this).addClass('ui-state-active'); $doc.one('mouseup', function() { $i.removeClass('ui-state-active'); }); };
		
		$toTop.hover(__onHover, __onOut).focus(__onHover).blur(__onOut).mousedown(__onDown).click(function(e) { 
			e.preventDefault();
			vfc.dlg.scrollTop(0);
		});
		$toBottom.hover(__onHover, __onOut).focus(__onHover).blur(__onOut).mousedown(__onDown).click(function(e) { 
			e.preventDefault();
			vfc.dlg.scrollTop($AjaxMdContainer.height());
			vfc.dlg.triggerHandler('scroll');
		});

		if (!vfc.dlg) return 0;
		
		$('<a>', { href: '#', text: i18n.mdInvertSelection }).button().css('margin', '0px').click(function(e) {
			e.preventDefault();
			var $inputs = $('input[name="mdCheckDelete"]'),
				$checkedInputs = $inputs.filter(':checked').prop('checked', false),
				$uncheckedInputs = $inputs.not($checkedInputs).prop('checked', true);
			updateSelectedCount();
		}).appendTo( vfc.$ctrs.ajaxMdIa.parent() );		
		
		$('<a>', { href: '#', text: i18n.mdCuteSelectLabel }).button().css('margin', '0px').click(function(e) {
			e.preventDefault();
			vfc.mdCuteSelectDlg.dialog("open");
		}).appendTo( vfc.$ctrs.ajaxMdIa.parent() );

		// Change the title of the browser tab/window
		document.title = "VisualFileChange: " + subHeading + vfc.queryParams.target + "- ";
		
		// Append controls to the dialog
		vfc.$ctrs.container
			.append(
				subHeading, $('<a>', { href: targetHref, target: '_blank', text: vfc.queryParams.target }), "-. ",
				vfc.$ctrs.taskForUser, ": ",
				vfc.$ctrs.deleteReason, $('<br/>'),
				vfc.$ctrs.editSummaryL, ": ",
				vfc.$ctrs.editSummary,
				$('<span>', { id: 'mdReplacePermissionWrapper' }).append(
					vfc.$ctrs.replacePermission, 
					$('<label>', { 'for': 'mdReplacePermission', text: ' ' + i18n.mdReplacePermissionText })
				)
			)
			.append(
				$('<table>', { cellspacing: 0, cellpadding: 0, style: 'position:relative;', width: '100%' })
					.append($('<tr>', { id: 'mdRequestPageTitle' }).append(
						$('<td>').append($('<label>', { 'for': 'mdDeleteHeading', text: i18n.mdInsertDeleteHeading })),
						$('<td>', { width: '70%' }).append(vfc.$ctrs.deleteHeading)
					)).append($('<tr>', { id: 'mdTalkNoteNode' }).append(
						$('<td>').append($('<label>', { 'for': 'mdTalkNote', text: i18n.mdInsertTalkNote })),
						$('<td>', { width: '70%' }).append(vfc.$ctrs.talkNote)
					)).append(vfc.mdCreateReplaceNode())
			)
			.appendTo($AjaxMdContainer);

			$AjaxMdContainer
				.append(vfc.$createToggler(i18n.mdDelContribsButtonLabel, vfc.$ctrs.ajaxDeletedUploads))
				.append(vfc.$ctrs.ajaxMdNotReady, vfc.$ctrs.ajaxMdUlContainer);
 
		// Add label to the button
		var $buttons = vfc.dlg.parent().find('.ui-dialog-buttonpane button'),
			$submitButton = $buttons.eq(0).specialButton('proceed').button({ 
				label: $('<span>', { text: i18n.submitButtonLabel }).append( vfc.$ctrs.ajaxMdActionConfirm ) 
			}),
			$cancelButton = $buttons.eq(1).specialButton('cancel');

		var keyTimout = 0;
		var _handleCriticalKey = function () {
			clearTimeout(keyTimout);
			keyTimout = setTimeout(__handleCriticalKey, 85);
		};
		var __handleCriticalKey = function (event) {
			var reason = vfc.$ctrs.deleteReason.val(),
				summary = vfc.$ctrs.editSummary.val();
			
			if ( (reason.length < vfc.minLenReq ) || (summary.length < vfc.summaryMinLen) ) {
				$submitButton.button('option', 'disabled', true);
				if (vfc.minLenReq) {
					vfc.pb.setHelp2(vfc._msg('enter-reason', vfc.minLenReq), true);
				}
			} else {
				$submitButton.button('option', 'disabled', false);
				if (vfc.minLenReq) { 
					vfc.pb.setHelp2(reason, true);
					mw.libs.commons.api.parse(reason, mw.config.get('wgUserLanguage'), '', $.proxy(vfc.pb.setHelp2, vfc.pb));
				}
			}
		};
		vfc.$ctrs.deleteReason.bind( 'input keyup change autocompleteselect', _handleCriticalKey );
		vfc.$ctrs.editSummary.bind( 'input keyup change autocompleteselect', _handleCriticalKey );
		
		// Binding enter-key event.
		var __submitOnEnter = function(e) {
			if (13 === e.which && (vfc.$ctrs.deleteReason.val().length >= vfc.minLenReq) && vfc.$ctrs.editSummary.val().length >= vfc.summaryMinLen) {
				$submitButton.click();
			}
		};
		vfc.$ctrs.deleteHeading.keyup( __submitOnEnter );
		vfc.$ctrs.talkNote.keyup( __submitOnEnter );
		vfc.$ctrs.editSummary.keyup( __submitOnEnter );
		
		var timoutID = 0;
		var updateSelectedCount = function () {
			var $inputs = $('input[name="mdCheckDelete"]');
			var $checkedInputs = $inputs.filter(':checked');
			vfc.pb.setHelp3(vfc._msg('selected-count', $checkedInputs.length));
			$inputs.closest('li.gallerybox').removeClass('md-selected');
			$checkedInputs.closest('li.gallerybox').addClass('md-selected');
		};
		updateSelectedCount();
		vfc.$ctrs.ajaxMdIa.change( function (event) {
			var tmpChecked = this.checked;
			$('input[name="mdCheckDelete"]').each(function(index) {
				this.checked = tmpChecked;
			});
			clearTimeout(timoutID);
			timoutID = setTimeout(updateSelectedCount, 200);
		} );
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
		
		//
		// Event handler for the selection box (task to perform)
		//
		vfc.$ctrs.ajaxMdType.change( function (event) {
			var action = $(this).val(),
				opt   = vfc.mdOpt[action],
				uTags = vfc.mdUserTags[action];
				
			if (!opt) return;
			if ('del' === action) { 
				$('#mdRequestPageTitle').show(); 
			} else { 
				$('#mdRequestPageTitle').hide(); 
			}

			// minLenReq
			vfc.minLenReq = opt.minLenReq || 0;
			vfc.summaryMinLen = opt.summaryMinLen || 0;
			vfc.$ctrs.deleteReason.keyup();
			
			// byte limit
			// PlugIn has a bug: It attaches multiple handlers
			// So start unbinding them.
			vfc.$ctrs.editSummary.unbind('keypress');
			vfc.$ctrs.editSummary.byteLimit(opt.bLimit);
			var summary = vfc.$ctrs.editSummary.val();
			while ($.byteLength(summary) > opt.bLimit) {
				summary = $.trim(summary.slice(0, summary.length-1));
			}
			vfc.$ctrs.editSummary.val(summary);
			
			// acceptReason
			if (opt.reasonText) {
				vfc.$ctrs.taskForUser.text(i18n[opt.reasonText]);
				vfc.$ctrs.taskForUser.show();
				vfc.$ctrs.deleteReason.show();
			} else {
				vfc.$ctrs.taskForUser.hide();
				vfc.$ctrs.deleteReason.hide();
			}
			// prefill
			if (opt.prefill) {
				if (!vfc.$ctrs.deleteReason.val()) vfc.$ctrs.deleteReason.val(vfc[opt.prefill]);
				// For some reason RegExp.$1 will not work in the following line
				if ( /(\d{16})/g.test(vfc.$ctrs.deleteReason.val()) ) vfc.$ctrs.deleteReason.val( vfc[opt.prefill].replace(/\%ID/g, /(\d{16})/g.exec(vfc.$ctrs.deleteReason.val())[0]) ); 
				if ( vfc.mdURLPattern.test(vfc.$ctrs.deleteReason.val()) ) vfc.$ctrs.deleteReason.val( vfc.mdOTRSTicketPrefill.replace(/\%URL/g, vfc.$ctrs.deleteReason.val()) );
			}
			// confirmation
			if (opt.reasonParse) {
				vfc.pb.setHelp(i18n[opt.reasonParse]);
			} else {
				vfc.pb.setHelp2('');
				vfc.pb.setHelp('');
			}
			// talk note
			if (uTags.summary) {
				$('#mdTalkNoteNode').show();
			} else {
				$('#mdTalkNoteNode').hide();
			}
			// replace node
			if (opt.replaceNode) {
				$('#mdReplaceTextNode').show();
			} else {
				$('#mdReplaceTextNode').hide();
			}
			// OTRS replace node
			if (opt.permissionWrapper) {
				$('#mdReplacePermissionWrapper').show();
			} else {
				$('#mdReplacePermissionWrapper').hide();
			}
			vfc.$ctrs.ajaxMdActionConfirm.text(' (' + i18n.mdOptions[action] + ')');
			
			// Summary / Reason input
			vfc.$ctrs.editSummaryL.text(i18n[(opt.addSummary || 'mdInsertEditSummary')]);
			
			// Reason autocomplete
			vfc.mdMwReasonToAutocomplete(i18n.reasonAutoSuggest[action], vfc.$ctrs.editSummary, action);
		});
		vfc.$ctrs.ajaxMdType.val(vfc.mdSettings.defaultAction);
		vfc.$ctrs.ajaxMdType.change();
		vfc.$ctrs.ajaxMdType.bind('click mousedown mouseup', function(e) { e.stopPropagation(); });
		vfc.$ctrs.ajaxMdIa.bind('click mousedown mouseup', function(e) { e.stopPropagation(); });
		vfc.$ctrs.deleteReason.keyup();
 
		// cute-selection dialog
		var $metaSelect = $('<select>').attr({ style: 'width:10em;', size: 1 }),
			$uploaderSelect = $('<select>').attr({ type: 'text', id: 'txtAjaxMdSelectUploader', 'size': 1, placeholder: i18n.cuteSelect.uploader });
			
		var dlgSelectButtons = {};
		dlgSelectButtons[i18n.cuteSelect.button] = function () { 
			var $curThmb = '';
			var newVal = $('#chkAjaxMdSelect')[0].checked;
			var v_txtAjaxMdSelectCat = $.trim($('#txtAjaxMdSelectCat').val().replace(/^Category\:/, "").replace(/_/g, ''));
			var v_txtAjaxMdSelectTitle = $.trim($('#txtAjaxMdSelectTitle').val().replace(/^File\:/, "").replace(/_/g, ''));
			if ( v_txtAjaxMdSelectTitle ) v_txtAjaxMdSelectTitle = new RegExp(v_txtAjaxMdSelectTitle, '');
			var v_txtAjaxMdSelectWikitext = $('#txtAjaxMdSelectWikitext').val();
			if (v_txtAjaxMdSelectWikitext) v_txtAjaxMdSelectWikitext = new RegExp(v_txtAjaxMdSelectWikitext, '');
			var v_txtAjaxMdSelectSize = $('#txtAjaxMdSelectSize').val();
			var vl_selAjaxMdSelectSize = ( ($('#selAjaxMdSelectSize').val() + '') === 'l' );
			var vl_selAjaxMdSelectUploader = $uploaderSelect.val();
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

			$.each(vfc.iUploads, function(upload, curUpld) {
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
					
					if (vl_selAjaxMdSelectUploader) {
						if (-1 !== $.inArray(vl_selAjaxMdSelectUploader, curUpld.uploader)) isMatch.uploder = true;
					} else {isMatch.uploder = true;}
 
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
				} catch (ex) { vfc.log('Error: ' + ex); }
			});
			updateSelectedCount();
		};
		
		var cuteI18n = i18n.cuteSelect,
			$AjaxMdCuteSelect = $('<div>', { id: 'AjaxMdCuteSelect' } );
		$AjaxMdCuteSelect
			.append(cuteI18n.intro)
			.append($('<table>').append(
				$('<tr>').append(
					$('<td>').append($('<label>', { 'for': 'chkAjaxMdSelect', text: cuteI18n.select })),
					$('<td>').append($('<input>', { type: 'checkbox', id: 'chkAjaxMdSelect', 'value': 1, 'checked': '' }))),
				$('<tr>').append(
					$('<td>').append($('<label>', { 'for': 'txtAjaxMdSelectCat', text: cuteI18n.inCat })),
					$('<td>').append($('<input>', { type: 'text', id: 'txtAjaxMdSelectCat', 'size': 50 }), cuteI18n.and)),
				$('<tr>').append(
					$('<td>').append($('<label>', { 'for': 'txtAjaxMdSelectTitle', html: cuteI18n.title + ' <abbr title="Regular Expression. Example: Tower.+ will select Towers or TowersInSpain but not Tower">(RegExpr)</abbr>' })),
					$('<td>').append($('<input>').attr({ type: 'text', id: 'txtAjaxMdSelectTitle', 'size': 50, placeholder: cuteI18n.titleplaceholder }), cuteI18n.and)),
				$('<tr>').append(
					$('<td>').append($('<label>', { 'for': 'txtAjaxMdSelectWikitext', html: cuteI18n.wikitext + ' <abbr title="Regular Expression. Example: \\{\\{[Tt]emplate\\}\\} would match {{template}} and {{Template}}">(RegExpr)</abbr>' })),
					$('<td>').append($('<input>').attr({ type: 'text', id: 'txtAjaxMdSelectWikitext', 'size': 50, placeholder: cuteI18n.wikitextplaceholder }), cuteI18n.and)),
				$('<tr>').append(
					$('<td>').append( cuteI18n.size + ' <select size="1" id="selAjaxMdSelectSize"><option value="l">&lt</option><option value="g">&gt</option></select>' ),						
					$('<td>').append($('<input>', { type: 'text', 'class': 'numbersOnly', id: 'txtAjaxMdSelectSize', 'size': 15 }),
						$('<label>', { 'for': 'txtAjaxMdSelectSize', text: cuteI18n.kibibyte }), ' ', cuteI18n.and)),
				!vfc.startInput.modeUser ? $('<tr>').append(
					$('<td>').append($('<label>', { 'for': 'txtAjaxMdSelectUploader', text: cuteI18n.uploader })),
					$('<td>').append($uploaderSelect, cuteI18n.and)) : '',
				$('<tr>').append(
					$('<td>').append($metaSelect),						
					$('<td>').append($('<label>', { 'for': 'txtAjaxMdSelectMeta', text: cuteI18n.matches }), 
						$('<input>').attr({ type: 'text', placeholder: cuteI18n.titleplaceholder, id: 'txtAjaxMdSelectMeta', 'size': 41 }), cuteI18n.and)),
				$('<tr>').append(
					$('<td>').append(cuteI18n.date),
					$('<td>').append(
						$('<label>', { 'for': 'txtAjaxMdSelectDate0' }).append($('<abbr>', { 
							text: cuteI18n.between,
							title: cuteI18n.after
						})),
						$('<input>')
							.attr({ type: 'text', id: 'txtAjaxMdSelectDate0', 'size': 20, 'class': 'dateOnly', maxlength: 19, placeholder: cuteI18n.dateplaceholder })
							.datepicker( {
								changeYear: true,
								changeMonth: true,
								'dateFormat': 'yy-mm-dd 00:00:00',
								showWeek: true,
								firstDay: 1
							} )
							.tipsy({
								trigger: 'focus',
								gravity: 's',
								html: true,
								title: function() {
									return i18n.optStartAtHowTo;
							} }),
						$('<label>', { 'for': 'txtAjaxMdSelectDate1' }).append($('<abbr>', { 
							text: cuteI18n.and,
							title: cuteI18n.before
						})),
						$('<input>')
							.attr({ type: 'text', id: 'txtAjaxMdSelectDate1', 'size': 20, 'class': 'dateOnly', maxlength: 19, placeholder: cuteI18n.dateplaceholder })
							.datepicker( {
								changeYear: true,
								changeMonth: true,
								'dateFormat': 'yy-mm-dd 23:59:59',
								showWeek: true,
								firstDay: 1
							} )
							.tipsy({
								trigger: 'focus',
								gravity: 's',
								html: true,
								title: function() {
									return i18n.optStartAtHowTo;
							} })
					))
			)
			);
		
		var pbWidth = (vfc.pb.isHidden() ? 0 : 250);
		var dlgWidth = Math.min(600, $win.width() - pbWidth);
		vfc.mdCuteSelectDlg = $('<div></div>').append($AjaxMdCuteSelect).dialog({
			modal: true,
			resizable: false,
			closeOnEscape: true,
			position: [($win.width() - dlgWidth - pbWidth) / 2 + pbWidth, ($win.height() - 250) / 2 ],
			title: cuteI18n.heading,
			height: 'auto',
			width: dlgWidth,
			buttons: dlgSelectButtons,
			open: function(evt, ui) {
				$metaSelect.children().remove();
				$('<option>', { text: ' ', value: '' }).appendTo($metaSelect).clone().appendTo($uploaderSelect);
				vfc.metaKeys.sort();
				vfc.allUploaders.sort();
				$.each(vfc.metaKeys, function(k, val) {
					$('<option>', { text: val }).appendTo($metaSelect);
				});
				$.each(vfc.allUploaders, function(k, val) {
					$('<option>', { text: val }).appendTo($uploaderSelect);
				});
			},
			autoOpen: false
		});
		this.$dialogsToClose.push(this.mdCuteSelectDlg);
		
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
		vfc.$mdQueryMoreBtn = $('<button>', { id: 'mdQueryMoreBtn', text: i18n.mdMore })
				.button({ disabled: true, icons: { primary: 'ui-icon-arrowthick-1-s', secondary: 'ui-icon-arrowthick-1-s' } })
				.click( function (event) { vfc.mdQueryMore(); })
				.appendTo($queryMore);
		
		$AjaxMdContainer.append($queryMore).append('<div style="height:100px">&nbsp;</div>');
		/* End of UI */
		
		$doc.triggerHandler('vFC', ['initial uploads dialog', vfc, vfc.dlg]);
		// Temporary fix
		$('.vFCConfigRequired').removeClass('ui-state-disabled');
 
		vfc.iCurrentIId = -1;     // Last queried file to continue obtaining detail-info
		vfc.secureCall('mdSendNextQueries');
	},
 
	/**  
	**  Send the next batch of queries. Called by mdGenIGallery (mammoth method above) and mdQueryMore (Query on demand)
	**/
	mdSendNextQueries: function () {
		$doc.triggerHandler('vFC', ['querying detail-info', this]);
		this.pb.setTaskState( 'datails', 'md-doing' );
		
		if (0 === this.mdPendingBatchQueries)  {
			this.mdPendingBatchQueries++;
			var collectedFiles = [],
				collectedCount = 0,
				si = vfc.startInput;
			
			var sendReq = function (files) {
				if (0 === files.length) {
					return;
				}
				var query = {
					action: 'query',
					prop: 'imageinfo|info|revisions|categories',
					rvprop: 'timestamp',
					inprop: 'talkid',
					iiprop: 'url|size|metadata',
					iiurlwidth: 120,
					iiurlheight: 120,
					titles: files.join('|'),
					clprop: 'hidden',
					cllimit: 500
				};
				if (si.loadWikitext) {
					query.rvprop += '|content';
				}
				if (!si.modeUser) {
					query.iiprop += '|user|sha1|comment';
					query.iilimit = 500;
				}
				
				$doc.triggerHandler('vFC', ['detail-info', vfc, query]);
				
				vfc.mdUploadCt++;
				vfc.queryAPI(query, 'mdQueriedFile'); // Dont use task queue because this is a loop
			};

			$.each(this.iUploads, function(upload, upli) {
				if ((vfc.iCurrentIId + 1) > upli.iId) return;
				collectedFiles.push(upload);
				collectedCount++;
				if (collectedCount > 9) {  // only 10 at once
					collectedCount = 0;
					sendReq(collectedFiles);
					collectedFiles = [];
				}
				vfc.iCurrentIId = upli.iId;
				if ((vfc.mdUploadCt * 10 + collectedCount) >= vfc.mdSettings.loadBatchSize) {
					return false;
				}
			});
			sendReq(collectedFiles);
		}
		
		if (0 === this.mdUploadCt) this.nextTask();
		this.$mdQueryMoreBtn.button('option', 'disabled', true);
	},
	
	/* Helper function: Creating a gallery box for gallery view */
	mdCreateGalleryBox: function( img, txt, height, style, imgTitle, imgH, addGU ) {
		var id,
			$ih = $('<div>', { style: 'margin:' + (imgH ? (Math.round((height - imgH) / 2) + 'px auto;') : '15px auto;') } ),
			$th = $('<div>', { 'class': 'gallerytext', 'tipsy-title': imgTitle }),
			$gbProgress = $('<div>', { 'class': 'jProgress' }),
			$gbGU = $('<div>', { 'class': 'jGU', title: "GlobalUsage" }),
			$thumb = $('<div>', { style: 'width: 150px;', 'class': 'thumb jImage'}).css('height', height).append($ih, $gbProgress, $gbGU),
			$galleryBox = $('<li>', { 'class': 'gallerybox rgallerybox' }).append($('<div>', { style: 'width: 155px' }).append($thumb).append($th));
		if ('string' === typeof style) $th.attr('style', style);
		
		$.each(img, function(id, imgi) {
			$ih.append(imgi);
		});
		$.each(txt, function(id, txti) {
			$th.append(txti);
		});
		$galleryBox.$thumb = $thumb;
		if (addGU) {
			$gbGU.badge('?');
			$galleryBox.$gbGU = $gbGU;
		}
		return $galleryBox;
	},
	fillGlobalUsage: function() {
		mw.loader.using('ext.gadget.GlobalUsage', function() {
			vfc.secureCall('_fillGlobalUsage');
		});
	},
	_fillGlobalUsage: function() {
		var gu = window.mw.libs.GlobalUsage(5, 15, 3, true);
		gu.tipsyGravity = 'se';
		gu.query(vfc.gbu).done(function() { 
			$.each(vfc.gbu, function(i, $el) {
				$el.unbind('click');
			});
			vfc.gbu = {};
		});
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
			if (undefined === cats[id].hidden) $catsList.append( 
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
		vfc.mdUploadCt--;
		
		$doc.triggerHandler('vFC', ['got detail-info', vfc, result]);
		
		if (({ err:1, done:1 })[vfc.internalState]) return; // don't try to add something if there was an error.
		var pages = result.query.pages,
			loadThumb = vfc.startInput.loadThumbs;
			
		vfc.mdBusy = true;

		$.each(pages, function(id, pg) {
			var dirtyTitle = pg.title,
				uItem = vfc.iUploads[dirtyTitle],
				i, ii,
				seenHash = {};
			
			vfc.$ctrs.ajaxMdNotReady.text(vfc._msg('query-progress', vfc.mdUploadCt, vfc.iiUploads, dirtyTitle)); 

			if (undefined === pg.imageinfo) { 
				try { 
					vfc.$ctrs.ajaxDeletedUploads.append(vfc.secureCall('mdCreateDelUploadItem', dirtyTitle));
				} catch (e) {} 
				return; 
			} // The file has been deleted

			/*  Adding a thumbnail to the dialog  */
			vfc.mdActualResultCount++;
			
			if (!vfc.startInput.modeUser) {
				for (i = pg.imageinfo.length - 1; i >= 0; i--) {
					ii = pg.imageinfo[i];
					if (ii.sha1 && !seenHash[ii.sha1]) {
						seenHash[ii.sha1] = true;
						// Admins can hide usernames. Make sure not pushing undefined.
						if (ii.user) {
							uItem.uploader.push(ii.user);
							uItem.comments.push(ii.comment || '');
							if (-1 === $.inArray(ii.user, vfc.allUploaders)) vfc.allUploaders.push(ii.user);
						}
					}
				}
			}
			
			ii = pg.imageinfo[0];
			ii.metadata = ii.metadata || [];      // not all images have metadata
			pg.categories = pg.categories || [];  // not all images have categories

			uItem.content = pg.revisions[0]['*'] || ''; // save the content for OTRS usage, replace and find-the-real-uploader
			uItem.time = uItem.time || pg.revisions[0].timestamp;
			uItem.basetimestamp = pg.revisions[0].timestamp; // timestamp to detect edit conflicts
			uItem.categories = pg.categories;     // save cats for cute-selection
			uItem.metadata = ii.metadata;         // save Exif and other for cute-selection
			uItem.size = (ii.size >> 10);         // for cute-selection
			uItem.pageId = id;
			uItem.talkId = pg.talkid;
			
			// List all Meta-Keys
			if (ii.metadata.length) {
				$.each(ii.metadata, function(i, m) {
					var tp = typeof m.value;
					if (tp === 'string' || tp === 'number' || tp === 'boolean') {
						if (-1 === $.inArray(m.name, vfc.metaKeys)) vfc.metaKeys.push(m.name);
					}
				});
			}
			
			var camModel = vfc.secureCall('mdGetCamModel', uItem),
				loglink = mw.config.get('wgServer') + mw.config.get('wgScript') + '?title=Special:Log&page=' + mw.util.wikiUrlencode(dirtyTitle);
			
			var $galleryBox = vfc.mdCreateGalleryBox(
				[ $('<a>', { href: ii.descriptionurl, target: '_blank', 'class': 'image' })
					.append( loadThumb ? $('<img>', { src: ii.thumburl, width: ii.thumbwidth, height: ii.thumbheight, alt: dirtyTitle }) : '' ) ],
				[ ('<i>' + uItem.iId + ': </i>'),
				$('<input>', { type: 'checkbox', name: 'mdCheckDelete', value: dirtyTitle } ),
				$('<span>', { 'class': 'tipsycategory' }).text('c'), ' ',
				(($.isArray(ii.metadata) && !!ii.metadata.length) ? 
					$('<span>', { 'class': 'tipsymetadata' }).text(camModel || 'm') : 
					''), 
				(uItem.talkId ? 
					$('<a>', { 
						'class': 'md-talklink', 
						href: mw.util.wikiGetlink(dirtyTitle.replace(/^File/, 'File_talk')), 
						target: '_blank', title: i18n.hasTalk 
					}).text('t') : 
					''
				),
				$('<a>', { href: loglink, target: '_blank', text: 'log', 'class': 'md-loglink' }), '<br/>',
				(vfc.secureCall('mdExtractTags', pg.categories)), ' ',
				$('<a>', { href: ii.descriptionurl, target: '_blank', 'class': 'image jFileTitle' })
					.text(dirtyTitle),
				$('<div>', { 'class': 'jFileTime' }).text(uItem.time.replace(/[T|Z]/g, " ")),
				$('<div>', { 'class': 'jFileSize' }).html(
					vfc.secureCall('mdFormattNumber', uItem.size) 
					+ '&nbsp;' + i18n.kibibyte + '&nbsp; '
					+ (vfc.secureCall('mdFormattNumber', ii.width) + '&nbsp;×&nbsp;' + vfc.secureCall('mdFormattNumber', ii.height)) 
					+ 'px')
				],
				150,
				'',
				dirtyTitle,
				ii.thumbheight,
				true
			);
			vfc.gbs[dirtyTitle] = $galleryBox;
			vfc.gbu[dirtyTitle] = $galleryBox.$gbGU.click(vfc.fillGlobalUsage);
		});
		vfc.mdBusy = false;
		if (0 === vfc.mdUploadCt) vfc.nextTask();
	},
 
	/**  
	**  Called when a batch of files has been queried  
	**/
	mdQueryFileDone: function () {		
		// Append all queried files to the screen-container
		$.each(vfc.iUploads, function(id, uItem) {
			if (!uItem.gbInUse) {
				var $galleryBox = vfc.gbs[id];
				if ($galleryBox) {
					uItem.gbInUse = true;
					vfc.$ctrs.ajaxMdUlContainer.append($galleryBox);
					vfc.mdThumbsOnDlg++;
				}
			}
		});

		vfc.mdBusy = false;
		vfc.mdPendingBatchQueries--;
		vfc.$ctrs.ajaxMdNotReady.hide();
		vfc.pb.setCurrentTaskDone();
		
		$doc.triggerHandler('vFC', ['detail-info processed', vfc]);
 
		if ( (vfc.iiUploads > (vfc.iCurrentIId + 1))  || !vfc.mdNoMoreFiles) {
			vfc.$mdQueryMoreBtn.button('option', 'disabled', false);
			
			var __onScroll = function() {
				if ( vfc.$mdQueryMoreBtn.inView().length > 0 ) {
					vfc.secureCall('mdQueryMore');
				}
			};
			vfc.dlg.unbind('scroll', __onScroll);
			vfc.dlg.bind('scroll', __onScroll);
		}
		if (!vfc.mdNoMoreFiles) { // silently run the next upload-list-query in background
			vfc.secureCall('mdCreateList');
		}
 
		document.body.style.cursor = 'auto';
		
		var si = vfc.startInput;
		
		if (0 === vfc.mdActualResultCount) { // If there are no thumbs on the dialog, continue
			if ('revert' !== vfc.internalState) { // Don't shedule further tasks if called from revert part
				if ('md' === vfc.internalState) {
					if (si.modeUser && !vfc.mdNoMoreFiles) {	// When no files in cat/page-mode are found, it's clear there are no more files
						return;
					} else {
						vfc.infoTextToEndDlg.push(i18n.mdNoResult.replace("%TARGET%", vfc.queryParams.target));
					}
				}
				if (si.modeUser) {
					$.each(vfc.mdCommandsPostExec[vfc.mdSettings.defaultAction], function(id, task) {
						vfc.addTask(task);
						if (task in i18n.task) vfc.pb.addTask(task);
					});
				}
				vfc.addTask('mdExecuteReady');
			}
			vfc.nextTask();
		}
	},
 
	/**  
	**  Called by scroll-event when the button "more" is scrolled to view (mdQueryFileDone binds the evt) or onClick on the button
	**/
	mdQueryMore: function () {
		if (0 === this.mdPendingBatchQueries && 0 === this.mdNumberOfExecs) {
			this.mdUploadCt = 0;
			this.addTask('mdQueryFileDone');
			this.secureCall('mdSendNextQueries');
		}
	},
 
	/**
	** II. REVERT PART
	**
	**/
	mdRvGenOGallery: function () {
		this.pb.setCurrentTaskDone();
		if ('mdRvGenOGallery' in this.pb.t) this.pb.setTaskState('mdRvGenOGallery', 'md-doing');
		
		this.pb.setHelp("We are working to re-add the possibility to rollback overwritten files to combat vandalism");

		///////////////////////////////////////////
		//   SKIP THIS - TEMPORARY NOT WORKING   //
		///////////////////////////////////////////
		this.nextTask();
		return;
		///////////////////////////////////////////
	},
 
	mdExecuteReady: function () {
		this.internalState = 'ready';
		this.pb.setCurrentTaskDone();

		var i18nED = i18n.endDlg,
			$dlgNode = $('<div>', { id: 'mdWhereToGoDlg', title: i18nED.heading, text: i18nED.intro })
			.append($('<br/>'), $('<a>', { href: '#', text: i18nED.saveInProfile }).button().click(function(e) {
				e.preventDefault();
				vfc.mdProfile();
			}))
			.append($('<br/>'), mw.html.escape(i18nED.aboutLastExec));
		var $ulNode = $('<ul>');
		
		var addLink = function(href, text, target) {
			$('<li>').append($('<a>', { 
				style: 'font-size:2em; line-height:1.8em', 
				href: mw.util.wikiGetlink(href),
				target: target,
				text: text
			})).appendTo($ulNode);
		};
		
		if (this.api.wasError) {
			$dlgNode.append(
				$.createNotifyArea(i18nED.errorDuringTask, 'ui-icon-alert', 'ui-state-error')
			);
		}
		$.each(this.infoTextToEndDlg, function(i, text) {
			$dlgNode.append($.createNotifyArea(text, 'ui-icon-info', 'ui-state-highlight'));			
		});
		addLink('Special:MyContributions', i18nED.checkContribs, 'contribswindow');
		
		if ( this.mdInsertedTag ) {
			var encTitle;
			if ('del' === this.mdTaskToPerform) {
				// allow navigating to the new created deletion request
				addLink(this.requestPage, i18nED.goToRequestPage);
			}
			if (this.startInput.modeUser && (-1 === $.inArray(this.mdTaskToPerform, ['c_replace', 'OTRS', 'other']))) {
				addLink(this.mdUserTalkPrefix + vfc.queryParams.target, i18nED.goUserTalk);
				addLink(this.mdContribPrefix + vfc.queryParams.target, i18nED.goUserContribs);
				// Revert files overwritten by this user ....
			}
			addLink(mw.config.get('wgPageName'), i18nED.reload, '_self');
		}
		$dlgNode.append($ulNode).dialog({
			show: { effect: 'highlight', duration: 1800 },
			width: Math.min(450, $win.width())
		});
		document.title = i18nED.title;
		vfc.$dialogsToClose.push($dlgNode);
	}
});

mw.loader.using([
	'jquery.ui.dialog', 
	'jquery.ui.button', 
	'jquery.tipsy', 
	'jquery.placeholder', 
	'jquery.byteLimit',
	'jquery.byteLength',
	'jquery.badge',
	'jquery.jStorage',
	'ext.gadget.libAPI',
	'ext.gadget.libJQuery',
	'ext.gadget.jquery.blockUI',
	'ext.gadget.libWikiDOM'
], function() {
	$doc.triggerHandler('scriptLoaded', ['VisualFileChange', 'displayComponents']);
});

}(jQuery, mediaWiki));
// </nowiki>