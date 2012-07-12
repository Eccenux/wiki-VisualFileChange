// Main script is at [[MediaWiki:VisualFileChange.js]]
// These are the delayed loaded edit components in order to speed up loading of the first UI
// <nowiki>

// Invoke jsHint-validation

/*global jQuery:false, mediaWiki:false, alert:false, console:false */
/*jshint curly:false, maxerr:200, smarttabs:true, loopfunc:true*/
(function ($, mw) {
'use strict';

// Return if Main Script is not loaded
if (!window.VisualFileChange) return;
// Return if this script is already loaded
if (window.VisualFileChange.editComponents) return;

$.extend(window.VisualFileChange,
{
	editComponents: true,
	/**  
	**  Reads user's input to the thumbnail-dialog; Called when user clicked next
	**/
	mdExecute: function () {
		var o = this;
		o.mdTaskToPerform = o.$AjaxMdType.val();
		var cmdConfig = o.mdCommands[o.mdTaskToPerform];
		
		o.startDate = new Date();
		o.apiEditFirstTestCountDown = o.mdSettings.firstTest-1;
		o.totalEdits = 0;
		o.totalEditsDone = 0;
		
		if (0 !== o.mdNumberOfExecs || 0 !== o.mdListUploadsPending) return; // refuse futher exec request
		if (0 !== o.mdPendingBatchQueries) { // call me later
			setTimeout(function () { 
				o.mdExecute();
			}, 1000);
			return;
		}
		o.mdNumberOfExecs++;

		$(document).triggerHandler('vFC', ['processing user\'s input', o]);
		o.pb.addTask('inputcheck');
		o.pb.setTaskState('inputcheck', 'md-doing');
		o.pb.setHelp(o.i18n.mdPleaseWait);
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
					$gb.find('div.thumb > div').css('margin', '15px auto');
				}
			}
		});
 
		if (0 === filesToTag) {
			if ( ('other' !== o.mdTaskToPerform ) && ('otrs' !== o.mdTaskToPerform) && (0 < o.ioUploads) ) {
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
		o.mdReplacePermission = $('#mdReplacePermission')[0].checked;
		o.mdTalkNote = $('#mdTalkNote').val();
		o.mdAddEditSummary = $('#mdEditSummary').val();

		// Processing for custom replace
		$.each(o.mdReplacementMatrix, function(i, rObj) {
			rObj.match = rObj.match.val();
			rObj.replace = rObj.replace.val();
			rObj.regex = rObj.regex[0].checked;
			rObj.vars = rObj.vars[0].checked;
			if (rObj.regex && rObj.match) {
				rObj.match = o.mdRegExpFromString(rObj.match);
				if (!rObj.match) o.pb.setError('INVALIDINPUT: -' + rObj.match + '- is not a valid RegExp!');
			}
		});
		
		// Try to save the current input state into the automatically generated client profile
		try {
			o.mdSaveProfileToClient('auto-exec');
		} catch (e) {
			o.pb.setHelp2(o.i18n.mdProfileCantSave);
		}
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
 
		// set up some page names we'll need later
		var mdRequestPage = (this.mdModeCat ? 'Files in ' : 'Files uploaded by ') + this.mdTarget;
		this.requestPage =  this.mdRequestPagePrefix + mdRequestPage;
		this.dailyLogPage = this.mdRequestPagePrefix + this.formatDate("YYYY/MM/DD");
 
		var uploadCt = 0;

		var optConfig = this.mdOpt[this.mdTaskToPerform];
		var cmdConfig = this.mdCommands[this.mdTaskToPerform];
		this.tag = optConfig[7].replace('%REASON%', this.reason).replace('%SUBPAGE%', mdRequestPage).replace('%D%', this.formatDate('year=YYYY|month=MON|day=DAY'));
		
		this.img_summary = (this.mdAddEditSummary ? (this.mdAddEditSummary + ' - ') : '') + 
			optConfig[8].replace('%pattern%', this.reason).replace('%replacementcount%', this.mdReplacementMatrix.length-1).replace('%REASON%', this.reason) + 
			' Using [[' + this.mdSelfPath + '|VisualFileChange.js]].';
		var r = this.img_summary.match(/\%(.{1,9})\%/);
		if (r && r[1]) this.img_summary = this.img_summary.replace('%' + r[1] + '%', this.mdOptText[r[1]]);
		
		this.uploaders = {};
		var _this = this;
		
		// Reverse-mapping: files-uploader --- > uploader-files
		$.each(this.iUploads, function(upload, uItem) {
			if ( -2 === uItem.iId )  {
				if (_this.mdModeCat) {
					// Remember: u is just an index of an array
					$.each(uItem.uploader, function(u, ul) {
						ul = mw.libs.commons.getUploadBotUser(ul, uItem.content, uItem.comments[u]);
						if (!_this.uploaders[ul]) {
							_this.uploaders[ul] = { uploads: {} };
						}
						_this.uploaders[ul].uploads[upload] = true;
					});
				} else {
					if (!_this.uploaders[_this.mdTarget]) {
						_this.uploaders[_this.mdTarget] = { uploads: {} };
					}
					_this.uploaders[_this.mdTarget].uploads[upload] = true;
				}
			}
		});
		
		$.each(this.uploaders, function(uploader, uploaderItem) {
			uploadCt = 0;
			
			uploaderItem.talk_tag = optConfig[9].replace('%REQUESTPAGE%', mdRequestPage);
			uploaderItem.talk_summary = optConfig[10].replace('%FULLREQUESTPAGE%', _this.requestPage);
			if (/\%FILE\%/.test(uploaderItem.talk_tag)) {
				$.each(uploaderItem.uploads, function(userUpload, unused) {
					if ( 0 === uploadCt ) {
						uploaderItem.talk_tag = uploaderItem.talk_tag.replace('%FILE%', userUpload);
						uploaderItem.talk_summary = uploaderItem.talk_summary.replace('%FILE%', userUpload);
					} else if ( 1 === uploadCt ) {
						uploaderItem.talk_tag += '\nAnd also: \n* [[:' + userUpload + ']] '; 
					} else {
						uploaderItem.talk_tag += '\n* [[:' + userUpload + ']] '; 
					}
					uploadCt++;
				});
			}
			if (optConfig[4]) {
				if ( _this.mdTalkNote ) uploaderItem.talk_tag += '\n\n' + _this.mdTalkNote;
			}
		});
		
		// Prepare for createRequestSubpage
		this.requestPageContents = this.reason;
		$.each(this.iUploads, function(upload, upli) {
			if ( _this.iUploads.hasOwnProperty(upload) && (-2 === upli.iId) )  { 
				_this.requestPageContents += '\n* [[:' + upload + ']]'; 
			}
		});
				
		// Task sheduling
		$.each(cmdConfig.tasks, function(id, task) {
			if ('mdRvGenOGallery' === task && 0 === _this.ioUploads) return;
			_this.addTask(task);
			if (task in _this.i18n.task) _this.pb.addTask(task);
		});
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
			if (this.iUploads.hasOwnProperty(upload) && (-2 === this.iUploads[upload].iId)) {
				var page = {};
				page.title = upload;
				page.text = this.tag;
				page.editType = edittype;
				page.watchlist = this.mdSettings.watchlistFiles;
				
				this.mdUploadCt++;
				this.mdSavePage(page, this.img_summary, 'mdTemplateAdded', 'mdTemplateAdded');
			}
		}
		if (0 === this.mdUploadCt) this.nextTask();
	},
	
	/**
	 *  A powerful and easily extensible way to preserve certain areas during regex-replaces
	 *  (c) 2012 Rainer Rillke, License: GPL
	 *
	 * @constructormethod
	 *   @example
	 *      var nwe1 = VisualFileChange.nowikiEscaper(pageText1);
	 *      var nwe2 = VisualFileChange.nowikiEscaper(pageText2);
	 *   @description
	 *      You can pass an initial text to the object-function. 
	 *      The return value is an object. Perform all actions on the returned object!
	 *
	 * @methods
	 * -getText()
	 *   @example var newPageText = nwe.getText()
	 *   @description -> retrieves the stored text
	 *
	 * -setText(pageText)
	 *   @example nwe.setText(pageText) 
	 *   @description -> set a new text; overrides the old content
	 *
	 * -secureReplace(pattern, replace)
	 *   @example nwe.secureReplace(pattern, replace)
	 *   @description -> replace the pattern with replace; securely preserve nowikis
	 *
	 * -ordinaryReplace(pattern, replace)
	 *   @example nwe.ordinaryReplace('<!-- Comment to remove -->', '')
	 *   @description -> do an ordinary javaScript replace
	 *
	 * -replace(pattern, replace)
	 *   @example nwe.replace(/(.)abc(.)/, '$2abc$1')
	 *   @description -> replace the pattern with replace; allow extended use of substring () and $1..$9
	 *
	 * -doCleanUp(pattern, replace)
	 *   @example nwe.doCleanUp()
	 *   @description -> clean up the stored text
	 *
	 * -alsoPreserve(regexp)
	 *   @example nwe.alsoPreserve('(<gallery>(?:.|\n)*?<\/gallery>)')
	 *   @description -> allows preserving other areas than just the predefined ones
	 *
	**/
	nowikiEscaper: function(inputText) {
		// Private
		// Data-variables
		var // The text is always kept up-to-date and contains the actual wikitext
			_text = inputText || '',
			// Contains the text where <nowikis> have been replaced by a placeholder
			placeholderText = '',
			// Contains the stripped nowikis from placeholderText
			nowikis = {},
			// An array of objects [{ preserve: bool, text: textfragment }, ... ]
			fragmentedText = [],
			// If the fragments are altered and this is not reflected in the placeholderText yet
			fragmentsAreDirty = false,
			// If the placeholderText is altered and this is not reflected in the fragmentedText yet
			placeholderTextDirty = false,
			// If the text was manipulated and this is not reflected in the "escaped" texts yet
			textDirty = false;
		
		// Constants
		// The order is important here in cases where they match the same, the fist will be used
		var reToPreserve = 
		[
			/(<nowiki>(?:.|\n)*?<\/nowiki>)/,
			/(<\!\-\-\s*categories\s*by\s*commonsense\s*\-\->)/i,
			/(<!\-\-(?:.|\n)*?\-\->)/
		];
		
		var reToPreservePattern = /^\s*(\/\(\)\/)\s*$/;
		
		// Functions
		var noMatchToInfinity = function(pos) {
			if (-1===pos) return Infinity;
			return pos;
		};
		var eachPosition = function(text, fn) {
			while ( text ) {
				var arrPos = [];
				$.each(reToPreserve, function(i, regex) {
					arrPos.push(noMatchToInfinity(text.search(regex)));
				});
				text = fn(text, arrPos);
			}
		};
		var nearestMatch = function(paramArray) {
			var validArgs = [],
				a = paramArray.length-1;

			for (;a >= 0; a--) {
				if (-1 !== paramArray[a]) validArgs.push(paramArray[a]);
			}
			// If validArgs.length is 0, Infinity (the biggest number possible) is returned
			return Math.min.apply(window, validArgs);
		};
		var buildFragmentsFromText = function() {
			fragmentedText = [];
			eachPosition(_text, function(text, arrPos) {
				var nearestPos = nearestMatch(arrPos);
				if (0 !== nearestPos) {
					// Slice until this position
					fragmentedText.push({ preserve: false, text: text.slice(0, nearestPos) });
					return text.slice(nearestPos);
				} else {
					var newText;
					$.each(arrPos, function(i, pos) {
						if (0 === pos) {
							newText = text.replace(reToPreserve[i], '');
							fragmentedText.push({ preserve: true, text: RegExp.$1 });
							return false;
						}
					});
					return newText;
				}
			});
			return fragmentedText;
		};
		var buildPlaceholderText = function() {
			placeholderText = '';
			eachPosition(_text, function(text, arrPos) {
				var nearestPos = nearestMatch(arrPos);
				if (0 !== nearestPos) {
					// Slice until this position
					placeholderText += text.slice(0, nearestPos);
					return text.slice(nearestPos);
				} else {
					var newText, rdm = '%v%f%c%' + Math.round(Math.random()*68719476736) + '%V%F%C%';
					$.each(arrPos, function(i, pos) {
						if (0 === pos) {
							newText = text.replace(reToPreserve[i], '');
							placeholderText += rdm;
							nowikis[rdm] = RegExp.$1;
							return false;
						}
					});
					return newText;
				}
			});
			return placeholderText;
		};
		var fragmentsToText = function() {
			_text = '';
			$.each(fragmentedText, function(i, fragmentObj) {
				_text += fragmentObj.text;
			});
			return _text;
		};
		var placeholderTextToText = function() {
			_text = placeholderText;
			$.each(nowikis, function(id, nowikiContent) {
				_text = _text.replace(id, nowikiContent);
			});
			return _text;
		};
		var updateFragments = function() {
			_text = placeholderTextToText();
			placeholderTextDirty = false;
			return buildFragmentsFromText();
		};
		var updatePlaceholderText = function() {
			_text = fragmentsToText();
			fragmentsAreDirty = false;
			return buildPlaceholderText();
		};
		var updateEscapedText = function() {
			buildFragmentsFromText();
			buildPlaceholderText();
			textDirty = false;
		};
		if (_text) {
			textDirty = true;
		}

		// Public interface
		return {
			setText: function(text) {
				_text = text;
				placeholderTextDirty = false;
				fragmentsAreDirty = false;
				textDirty = true;
			},
			getText: function() {
				if (placeholderTextDirty) placeholderTextToText();
				if (fragmentsAreDirty) fragmentsToText();
				return _text;
			},
			secureReplace: function(pattern, replace) {
				if (textDirty) updateEscapedText();
				if (placeholderTextDirty) updateFragments();
				$.each(fragmentedText, function(i, fragmentObj) {
					if (fragmentObj.preserve) return;
					fragmentObj.text = fragmentObj.text.replace(pattern, replace);
				});
				fragmentsAreDirty = true;
			},
			ordinaryReplace: function(pattern, replace) {
				if (fragmentsAreDirty) updatePlaceholderText();
				if (placeholderTextDirty) updateFragments();
				_text = _text.replace(pattern, replace);
				textDirty = true;
			},
			replace: function(pattern, replace) {
				if (textDirty) updateEscapedText();
				if (fragmentsAreDirty) updatePlaceholderText();
				placeholderText = placeholderText.replace(pattern, replace);
				placeholderTextDirty = true;
			},
			alsoPreserve: function(regex) {
				if ('object' === typeof regex && regex.test){
					reToPreserve.push(regex);
					return true;
				} else if ('string' === typeof regex) {
					var m = regex.match(reToPreservePattern);
					if (m && m[1]) {
						reToPreserve.push(new RegExp(m[1]));
						return true;
					}
				}
			},
			doCleanUp: function() {
				this.secureReplace('== Summary ==', '== {{int:filedesc}} ==');
				this.secureReplace('== Beschreibung ==', '== {{int:filedesc}} ==');
				this.secureReplace('== Licensing ==', '== {{int:license-header}} ==');
				this.secureReplace('== License ==', '== {{int:license-header}} ==');
				this.secureReplace('== Lizenz ==', '== {{int:license-header}} ==');
				return this.getText();
			}
		};
	},
	
	mdRefreshCache: function () {
		$(document).triggerHandler('vFC', ['refreshing cache of file-wikitext', this]);
		this.pb.setCurrentTaskDone();
		this.pb.setTaskState('mdRefreshCache', 'md-doing');
		
		// Test how old the data are
		if (new Date().getTime() - this.mdDateOldestDataFetched.getTime() < 60000) {
			this.nextTask();
			return;
		}
		this.refreshRequests = 0;
		var o = this,
			i = 0, 
			titles = [],
			query = {
				action: 'query',
				prop: 'revisions',
				rvprop: 'content'
			};
		var makeRequest = function() {
			i = -1;
			query.titles = titles.join('|');
			titles = [];
			o.refreshRequests++;
			o.doAPICall(query, 'mdRefreshCacheCB');
		};
		$.each(this.iUploads, function(upload, upli) {
			if (!o.iUploads.hasOwnProperty(upload) || -2 !== upli.iId) return;
			titles.push(upload);
			if (10 === i) makeRequest();
			i++;
		});
		if (titles.length) makeRequest();
		if (0 === o.refreshRequests) this.nextTask();
	},
	
	mdRefreshCacheCB: function (result) {
		var o = this;
		$(document).triggerHandler('vFC', ['got fresh page contents', this, result]);
		
		o.refreshRequests--;
		$.each(result.query.pages, function(id, pg) {
			o.iUploads[pg.title].content = pg.revisions[0]['*'];
		});
		if (0 === o.refreshRequests) this.nextTask();
	},

	mdInsertPermission: function () {
		$(document).triggerHandler('vFC', ['inserting permission OR custom replace', this]);
		this.pb.setCurrentTaskDone();
		this.pb.setTaskState('mdInsertPermission', 'md-doing');
		this.mdUploadCt = 0;

		var _this = this,
			replaceSecurityLevel = _this.$selPreserve.val(),
			replaceContainer = _this.nowikiEscaper();

			if ('c_replace' === _this.mdTaskToPerform) replaceContainer.alsoPreserve(_this.$alsoPreserve.val());

		$.each(this.iUploads, function(upload, upli) {
			if (!_this.iUploads.hasOwnProperty(upload) || -2 !== upli.iId) return;
 
			var page = {};
			
			replaceContainer.setText(upli.content);

			page.title = upload;
			page.watchlist = 'nochange';
			page.basetimestamp = upli.basetimestamp;
 
			if ('otrs' === _this.mdTaskToPerform) { // drop out other permission templates
				var iCt = 0;
				$.each(_this.mdTagRemoval, function(id, tri) {
					iCt++;
					if (1 === iCt) return; // Skip first pattern
					replaceContainer.secureReplace(tri[0], '');
				});
			}
			if ('c_replace' !== _this.mdTaskToPerform) {
				replaceContainer.setText( _this.mdSecureCall( 'mdInsertOTRS', replaceContainer.getText(), _this.reason ) );
			} else {
				switch (replaceSecurityLevel) {
				 case 'secure':
					$.each(_this.mdReplacementMatrix, function(i, rObj) {
						if ('' === rObj.match) return;
						replaceContainer.secureReplace(rObj.match, (rObj.vars ? _this.mdVarReplacements(rObj.replace, upload, upli) : rObj.replace));
					});
					break;
				 case 'placeholder':
					$.each(_this.mdReplacementMatrix, function(i, rObj) {
						if ('' === rObj.match) return;
						replaceContainer.replace(rObj.match, (rObj.vars ? _this.mdVarReplacements(rObj.replace, upload, upli) : rObj.replace));
					});
					break;
				 case 'none':
					$.each(_this.mdReplacementMatrix, function(i, rObj) {
						if ('' === rObj.match) return;
						replaceContainer.ordinaryReplace(rObj.match, (rObj.vars ? _this.mdVarReplacements(rObj.replace, upload, upli) : rObj.replace));
					});
					break;
				}
			}
 
			page.editType = 'text';
			if (window.AjaxDeleteWatchFile && ('c_replace' !== _this.mdTaskToPerform)) {
				page.watchlist = 'watch';
			}
 
			if (upli.content === replaceContainer.getText()) {
				var $gb = _this.gbs[upload];
				if ($gb) $gb.find('img').attr('src', _this.mdNoChangeIcon);
			} else {
				page.text = replaceContainer.doCleanUp();
				_this.mdUploadCt++;
				_this.mdSavePage(page, _this.img_summary, 'mdTemplateAdded', 'mdTemplateAdded');
			}
		});
		
		if (0 === this.mdUploadCt) this.nextTask();
	},
 
	mdInsertOTRS: function (sitetext, insert) {
		if (this.mdPermissionPattern.test(sitetext)) {
			if (this.mdReplacePermission) {
				var texparts = sitetext.match(this.mdPermissionPattern);
				// in rare cases [3] is undefined in other cases [3] contains the next param of {{information}}
				if (texparts[3] && this.mdNextParamPattern.test(texparts[3])) {
					sitetext = texparts[1] + texparts[2] + insert + texparts[3] + texparts[4];
				} else {
					sitetext = texparts[1] + texparts[2] + insert + texparts[4];
				}
			} else {
				sitetext = sitetext.replace(this.mdSimplePermissionPattern, '$1' + insert);
			}
		} else { // if no information template is available, prepend
			sitetext = insert + '\n' + sitetext;
		}
		return sitetext;
	},
 
	mdCreateRequestSubpage: function () {
		$(document).triggerHandler('vFC', ['creating request subpage', this]);
		this.pb.setCurrentTaskDone();
		this.pb.setTaskState('mdCreateRequestSubpage', 'md-doing');
		
		var page = {};
		page.title = this.requestPage;
		page.text = "\n\n=== " + this.mdDeleteHeading + " ===\n\n" + this.requestPageContents + "\n~~" + "~~\n";
		page.watchlist = 'watch';
		page.editType = 'appendtext';
		page.create = true;
		
		$(document).triggerHandler('vFC', ['request subpage', this, page]);
		this.mdSavePage(page, 'Starting mass deletion request using [[' + this.mdSelfPath + '|VisualFileChange.js]]', 'mdCreateRequestSubpageCB', 'mdCreateRequestSubpageCB');
	},
	
	mdCreateRequestSubpageCB: function (result, query, err) {
		if (err) {
			this.pb.setCurrentTaskState('md-attention');
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
		var page = {};
		page.title = this.dailyLogPage;

		page.text = "\n{{" + this.requestPage + "}}\n";
		page.watchlist = 'nochange';
		page.editType = 'appendtext';

		this.mdSavePage(page, "Listing [[" + this.requestPage + "]]", 'mdListRequestSubpageCB', 'mdListRequestSubpageCB');
	},
	
	mdListRequestSubpageCB: function (result, query, err) {
		if (err) {
			this.pb.setCurrentTaskState('md-attention');
			this.pb.setError(err);
		} else {
			this.pb.setCurrentTaskDone();
		}
		this.nextTask();
	},
	
	mdTemplateAdded: function (result, query, err) {
		this.mdUploadCt--;

		var _this = this,
			pgTitle = (result.requestid || query.title),
			$gb = this.gbs[pgTitle];

		if ($gb) {
			$gb.find('img').attr('src', (err ? this.mdFailIcon : this.mdSuccessIcon));
			if (err) $gb.find('.gallerytext').prepend($('<span>', { 'class': 'error' }).text(err), '<br/>');
			if (0 === $gb.visible().length) {
				if (this.gbScrollTimeout) clearTimeout(this.gbScrollTimeout);
				this.gbScrollTimeout = setTimeout(function() {
					_this.dlg.stop().animate({scrollTop: $gb.position().top - _this.$AjaxMdContainer.position().top}, 1000);
				}, 200);
			}
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
		this.totalEdits = 0;
		this.totalEditsDone = 0;
		
		this.uploadersToNotify = 0;
		var _this = this;
		$.each(this.uploaders, function(user, upli) {
			if (-1 !== _this.excludedBots.indexOf(user)) return;
			var page = {};
			page.title = _this.mdUserTalkPrefix + user;
			page.text = "\n" + upli.talk_tag + " ~~" + "~~\n";
			page.editType = 'appendtext';
			page.redirect = true;
			page.create = true;
			page.watchlist = _this.mdSettings.watchlistUserTalk;
			_this.mdSavePage(page, upli.talk_summary, 'mdUploaderNotified');

			_this.uploadersToNotify++;
		});
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
		if (!page.create) edit.nocreate = 1;
		if (page.redirect) edit.redirect = '';
		if (page.basetimestamp) edit.basetimestamp = page.basetimestamp;
		edit[page.editType] = page.text;
		// Token last will be set by doApiCall
		
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
	** Execute the delete-task.
	**/
	mdDelete: function() {
		this.pb.setCurrentTaskDone();
		this.pb.setTaskState('mdDelete', 'md-doing');
		
		$(document).triggerHandler('vFC', ['deleting files', this]);
		this.mdUploadCt = 0;
 
		for (var upload in this.iUploads) {
			if (this.iUploads.hasOwnProperty(upload) && (-2 === this.iUploads[upload].iId)) {
				this.mdSecureCall('mdDeletePage', upload, this.img_summary);
			}
		}
		if (0 === this.mdUploadCt) this.nextTask();
	},
	mdDeletePage: function(page, summary) {
		var o = this;
		o.mdUploadCt++;
		o.totalEdits++;
		
		var _always = function() {
			o.totalEditsDone++;
			o.pb.showProgress(o.totalEdits, o.totalEditsDone, 'deletions');
		};
		var _deleted = function() {
			o.mdTemplateAdded({ requestid: page }, '');
			_always();
		};
		var _problem = function(text) {
			o.mdTemplateAdded({ requestid: page }, '', text);
			_always();
		};
		var _err = function(text) {
			o.mdTemplateAdded({ requestid: page }, '', text);
			_always();
		};
		// emulation possible
		if (window.VisualFileChangeDebug) {
			console.log('VisualFileChange> delete: ' + page);
			console.log(summary);
			
			setTimeout(_deleted, Math.round(Math.random() * 9000));
		} else {
			mw.loader.using(['ext.gadget.libAPI'], function() {
				// Delete 3 pages the same time
				mw.libs.commons.api.config.maxSimultaneousReq = 3;
				mw.libs.commons.api.deletePage({
					cb: function() {
						_deleted();
					},
					// r-result, query, text
					errCb: function(t, r, q) {
						if (r && r.error && r.error.code === 'missingtitle') {
							_problem('File not found');
						} else {
							_err(t);
						}
					},
					title: page,
					reason: summary
				});
			});
		}
	}
});

$(document).triggerHandler('scriptLoaded', ['VisualFileChange', 'editComponents']);

}(jQuery, mediaWiki));
// </nowiki>