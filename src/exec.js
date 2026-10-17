// Main script is at [[MediaWiki:VisualFileChange.js]]
// These are the delayed loaded edit components in order to speed up loading of the first UI
// <nowiki>

// Invoke jsHint-validation

/*global jQuery:false, mediaWiki:false */
/*jshint curly:false, maxerr:200, smarttabs:true, loopfunc:true*/
(function ($, mw) {
	'use strict';

	// Return if Main Script is not loaded
	if (!window.VisualFileChange) return;
	// Return if this script is already loaded
	if (window.VisualFileChange.editComponents) return;

	const vfc = window.VisualFileChange;
	const $doc = $(document);

	$.extend(window.VisualFileChange, {
		editComponents: true,
		/**  
		**  Reads user's input to the thumbnail-dialog; Called when user clicked next
		**/
		mdExecute: function () {
			vfc.mdTaskToPerform = vfc.$ctrs.ajaxMdType.val();
			var cmdConfig = vfc.mdCommandsExec[vfc.mdTaskToPerform];
			
			vfc.startDate = new Date();
			vfc.api.eFirst = vfc.mdSettings.firstTest-1;
			vfc.api.total = 0;
			vfc.api.done = 0;
			
			if (0 !== vfc.mdNumberOfExecs || 0 !== vfc.mdListUploadsPending) return; // refuse futher exec request
			if (0 !== vfc.mdPendingBatchQueries) { // call me later
				setTimeout(function () { 
					vfc.mdExecute();
				}, 1000);
				return;
			}
			vfc.mdNumberOfExecs++;

			$doc.triggerHandler('vFC', ['processing user\'s input', vfc]);
			vfc.pb.addTask('inputcheck');
			vfc.pb.setTaskState('inputcheck', 'md-doing');
			vfc.pb.setHelp(vfc.i18n.mdPleaseWait);
			vfc.pb.setHelp2('');
			vfc.pb.setHelp3('');

			var filesToTag = 0;
	
			$('input[name="mdCheckDelete"]').each(function() {
				if (this.checked) {
					vfc.iUploads[this.value].iId = -2; // Indicate the action will be performed on this file
					filesToTag++;
					var $gb = vfc.gbs[this.value];
					if ($gb) {
						$gb.$thumb.addClass('progress-doing');
					}
				}
			});
	
			if (0 === filesToTag) {
				if ( ('other' !== vfc.mdTaskToPerform ) && ('otrs' !== vfc.mdTaskToPerform) && (0 < vfc.ioUploads) ) {
					vfc.addTask('mdRvGenOGallery');
				}
				vfc.addTask('mdExecuteReady');
				vfc.dlg.dialog('close');
				vfc.nextTask();
				return;
			} else {
				vfc.mdInsertedTag = true;
			}
	
			vfc.mdDeleteHeading = vfc.cleanReason(vfc.$ctrs.deleteHeading.val());
	
			if (vfc.$ctrs.deleteReason.val()) {
				vfc.reason = cmdConfig.cleanReason ? vfc.cleanReason(vfc.$ctrs.deleteReason.val()) : vfc.$ctrs.deleteReason.val();
			} else {
				vfc.reason = '';
			}
			vfc.mdReplacePermission = vfc.$ctrs.replacePermission[0].checked;
			vfc.mdTalkNote = vfc.$ctrs.talkNote.val();
			vfc.mdAddEditSummary = vfc.$ctrs.editSummary.val() || '';

			// Processing for custom replace
			$.each(vfc.mdReplacementMatrix, function(i, rObj) {
				rObj.match = rObj.match.val();
				rObj.replace = rObj.replace.val();
				rObj.regex = rObj.regex[0].checked;
				rObj.vars = rObj.vars[0].checked;
				if (rObj.regex && rObj.match) {
					rObj.match = vfc.mdRegExpFromString(rObj.match);
					if (!rObj.match) vfc.pb.setError('INVALIDINPUT: -' + rObj.match + '- is not a valid RegExp!');
				}
				if ( /russavia/i.test( rObj.match || '' ) && $.inArray( 'autoconfirmed', mw.config.get( 'wgUserGroups' ) ) === -1 ) {
					vfc.pb.setError( 'VisualFileChange refuses to execute this request. Too much fuss around this topic currently. '
						+ 'Of course you can host your own copy of VFC. In this case, please amend the edit summary. Thanks!' );
					throw new Error( 'Induced guru meditation.' );
				}
			});
			
			// Try to save the current input state into the automatically generated client profile
			try {
				vfc.mdSaveProfileToClient('last executed (auto-saved)');
			} catch (e) {
				vfc.pb.setHelp2(vfc.i18n.mdProfileCantSave);
			}
			vfc.addTask('mdExecuteContinue');
			vfc.nextTask();
		},
		
		formatDate: function (fmt, date) {
			return mw.libs.commons.formatDate(fmt, date, this.startDate);
		},

		/**  
		**  Preparing to perform our edits
		**/
		mdExecuteContinue: function () {
			$doc.triggerHandler('vFC', ['generating page messages and summaries', vfc]);
	
			// set up some page names we'll need later
			var qp = vfc.queryParams,
				si = vfc.startInput,
				mdRequestPage;
				
			if (si.modeCat) mdRequestPage = 'Files in ';
			if (si.modeUser) mdRequestPage = 'Files uploaded by ';
			if (si.modePage) mdRequestPage = 'Files on ';
			if (si.modeSearch) mdRequestPage = 'Files found with ';
			
			mdRequestPage += qp.target;
			vfc.requestPage =  vfc.mdRequestPagePrefix + mdRequestPage;
			vfc.dailyLogPage = vfc.mdRequestPagePrefix + vfc.formatDate("YYYY/MM/DD");

			let uploadCt = 0;
			
			let action = vfc.mdTaskToPerform;
			let cmdConfig = vfc.mdCommandsExec[action];
			let cmdConfigPostExec = vfc.mdCommandsPostExec[action];
			let fTag = vfc.mdFileTags[action];
			let uTag = vfc.mdUserTags[action];
				
				
			vfc.tag = fTag.tag && fTag.tag.replace('%REASON%', vfc.reason).replace('%SUBPAGE%', mdRequestPage).replace('%D%', vfc.formatDate('year=YYYY|month=MON|day=DAY'));
			
			vfc.file_summary = vfc.mdAddEditSummary +
				(vfc.mdAddEditSummary && fTag.summary && ' - ') + 
				(fTag.summary && fTag.summary.replace('%pattern%', vfc.reason).replace('%replacementcount%', vfc.mdReplacementMatrix.length-1).replace('%REASON%', vfc.reason));
			var r = vfc.file_summary.match(/\%(.{1,9})\%/);
			if (r && r[1]) vfc.file_summary = vfc.file_summary.replace('%' + r[1] + '%', vfc.mdOptText[r[1]]);
			
			vfc.uploaders = {};
			
			// Reverse-mapping: files-uploader --- > uploader-files
			$.each(vfc.iUploads, function(upload, uItem) {
				if ( -2 === uItem.iId )  {
					if (vfc.startInput.modeUser) {
						if (!vfc.uploaders[qp.target]) {
							vfc.uploaders[qp.target] = { uploads: {} };
						}
						vfc.uploaders[qp.target].uploads[upload] = true;
					} else {
						// Remember: u is just an index of an array
						$.each(uItem.uploader, function(u, ul) {
							ul = mw.libs.commons.getUploadBotUser(ul, uItem.content, uItem.comments[u]);
							if (!vfc.uploaders[ul]) {
								vfc.uploaders[ul] = { uploads: {} };
							}
							vfc.uploaders[ul].uploads[upload] = true;
						});
					}
				}
			});
			
			$.each(vfc.uploaders, function(uploader, uploaderItem) {
				uploadCt = 0;
				
				uploaderItem.tag = (uTag.tag && uTag.tag.replace('%REQUESTPAGE%', mdRequestPage)) || '';
				uploaderItem.summary = (uTag.summary && uTag.summary.replace('%FULLREQUESTPAGE%', vfc.requestPage)) || '';
				if (/\%FILE\%/.test(uploaderItem.tag)) {
					$.each(uploaderItem.uploads, function(userUpload) {
						if ( 0 === uploadCt ) {
							uploaderItem.tag = uploaderItem.tag.replace('%FILE%', userUpload);
							uploaderItem.summary = uploaderItem.summary.replace('%FILE%', userUpload);
						} else if ( 1 === uploadCt ) {
							uploaderItem.tag += "\nAnd also: \n* [[:" + userUpload + "]] "; 
						} else {
							uploaderItem.tag += '\n* [[:' + userUpload + ']] '; 
						}
						uploadCt++;
					});
				}
				if (uTag.summary) {
					if (vfc.mdTalkNote) uploaderItem.tag += '\n\n' + vfc.mdTalkNote;
				}
			});
			
			// Prepare for createRequestSubpage
			vfc.requestPageContents = vfc.reason;
			$.each(vfc.iUploads, function(upload, upli) {
				if ( vfc.iUploads.hasOwnProperty(upload) && (-2 === upli.iId) )  { 
					vfc.requestPageContents += '\n* [[:' + upload + ']]'; 
				}
			});
					
			// Task sheduling
			$.each(cmdConfig.tasks, function(id, task) {
				vfc.addTask(task);
				if (task in vfc.i18n.task) vfc.pb.addTask(task);
			});
			$.each(cmdConfigPostExec.tasks, function(id, task) {
				vfc.addTask(task);
				if (task in vfc.i18n.task) vfc.pb.addTask(task);
			});
			vfc.addTask('mdExecuteReady');
			vfc.nextTask();
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
			this.secureCall('mdAddTemplate', 'prependtext');
		},
		
		mdAppendTemplate: function () {
			this.pb.setCurrentTaskDone();
			this.pb.setTaskState('mdAppendTemplate', 'md-doing');
			this.secureCall('mdAddTemplate', 'appendtext');
		},
		
		mdAddTemplate: function (edittype) {
			$doc.triggerHandler('vFC', ['adding templates to filepages', this]);
			this.mdUploadCt = 0;
	
			for (var upload in this.iUploads) {
				if (this.iUploads.hasOwnProperty(upload) && (-2 === this.iUploads[upload].iId)) {
					var page = {
						title: upload,
						text: this.tag,
						editType: edittype,
						watchlist: this.mdSettings.watchlistFiles
					};
					
					this.mdUploadCt++;
					this.mdEdit(page, this.file_summary, 'mdTemplateAdded', 'mdTemplateAdded');
				}
			}
			if (0 === this.mdUploadCt) this.nextTask();
		},
		
		mdRefreshCache: function () {
			$doc.triggerHandler('vFC', ['refreshing cache of file-wikitext', vfc]);
			vfc.pb.setCurrentTaskDone();
			vfc.pb.setTaskState('mdRefreshCache', 'md-doing');
			
			// Test how old the data are
			if ((new Date().getTime() - vfc.mdDateOldestDataFetched.getTime() < 60000) && vfc.startInput.loadWikitext) {
				vfc.nextTask();
				return;
			}
			vfc.refreshRequests = 0;
			var i = 0, 
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
				vfc.refreshRequests++;
				vfc.queryAPI(query, 'mdRefreshCacheCB');
			};
			$.each(vfc.iUploads, function(upload, upli) {
				if (!vfc.iUploads.hasOwnProperty(upload) || -2 !== upli.iId) return;
				titles.push(upload);
				if (10 === i) makeRequest();
				i++;
			});
			if (titles.length) makeRequest();
			if (0 === vfc.refreshRequests) vfc.nextTask();
		},
		
		mdRefreshCacheCB: function (result) {
			$doc.triggerHandler('vFC', ['got fresh page contents', vfc, result]);
			
			vfc.refreshRequests--;
			$.each(result.query.pages, function(id, pg) {
				vfc.iUploads[pg.title].content = pg.revisions[0]['*'];
			});
			if (0 === vfc.refreshRequests) vfc.nextTask();
		},

		mdInsertPermission: function () {
			$doc.triggerHandler('vFC', ['inserting permission OR custom replace', vfc]);
			vfc.pb.setCurrentTaskDone();
			vfc.pb.setTaskState('mdInsertPermission', 'md-doing');
			vfc.mdUploadCt = 0;

			let replaceSecurityLevel = vfc.$selPreserve.val();
			let replaceContainer = mw.libs.wikiDOM.nowikiEscaper();

			if ('c_replace' === vfc.mdTaskToPerform) replaceContainer.alsoPreserve(vfc.$alsoPreserve.val());

			$.each(vfc.iUploads, function(upload, upli) {
				if (!vfc.iUploads.hasOwnProperty(upload) || -2 !== upli.iId) return;
	
				var page = {};
				
				replaceContainer.setText(upli.content);

				page.title = upload;
				page.watchlist = vfc.mdSettings.watchlistOTRS;
				page.basetimestamp = upli.basetimestamp;
				page.editType = 'text';
	
				if ('otrs' === vfc.mdTaskToPerform) { // drop out other permission templates
					var iCt = 0;
					$.each(vfc.mdTagRemoval, function(id, tri) {
						iCt++;
						if (1 === iCt) return; // Skip first pattern
						replaceContainer.secureReplace(tri[0], '');
					});
				}
				if ('c_replace' !== vfc.mdTaskToPerform) {
					replaceContainer.setText( vfc.secureCall( 'mdInsertOTRS', replaceContainer.getText(), vfc.reason ) );
				} else {
					switch (replaceSecurityLevel) {
						case 'secure':
							$.each(vfc.mdReplacementMatrix, function(i, rObj) {
								if ('' === rObj.match) return;
								replaceContainer.secureReplace(rObj.match, (rObj.vars ? vfc.mdVarReplacements(rObj.replace, upload, upli) : rObj.replace));
							});
							break;
						case 'placeholder':
							$.each(vfc.mdReplacementMatrix, function(i, rObj) {
								if ('' === rObj.match) return;
								replaceContainer.replace(rObj.match, (rObj.vars ? vfc.mdVarReplacements(rObj.replace, upload, upli) : rObj.replace));
							});
							break;
						case 'none':
							$.each(vfc.mdReplacementMatrix, function(i, rObj) {
								if ('' === rObj.match) return;
								replaceContainer.ordinaryReplace(rObj.match, (rObj.vars ? vfc.mdVarReplacements(rObj.replace, upload, upli) : rObj.replace));
							});
							break;
					}
					page.watchlist = vfc.mdSettings.watchlistReplace;
				}
	
				if (upli.content === replaceContainer.getText()) {
					var $gb = vfc.gbs[upload];
					if ($gb) $gb.$thumb.removeClass('progress-doing').addClass('progress-nochange');
				} else {
					page.text = replaceContainer.doCleanUp();
					vfc.mdUploadCt++;
					vfc.mdEdit(page, vfc.file_summary, 'mdTemplateAdded', 'mdTemplateAdded');
				}
			});
			
			if (0 === vfc.mdUploadCt) vfc.nextTask();
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
			$doc.triggerHandler('vFC', ['creating request subpage', this]);
			this.pb.setCurrentTaskDone();
			this.pb.setTaskState('mdCreateRequestSubpage', 'md-doing');
			
			var page = {
				title: this.requestPage,
				text: '\n=== ' + this.mdDeleteHeading + ' ===\n\n' + this.requestPageContents + '\n~~' + '~~\n',
				watchlist: 'watch',
				editType: 'appendtext',
				create: true
			};
			
			$doc.triggerHandler('vFC', ['request subpage', this, page]);
			this.mdEdit(page, 'Starting mass deletion request', 'mdCreateRequestSubpageCB', 'mdCreateRequestSubpageCB');
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
			$doc.triggerHandler('vFC', ['creating request subpage', this]);
			this.pb.setCurrentTaskDone();
			this.pb.setTaskState('mdListRequestSubpage', 'md-doing');
			var page = {
				title: this.dailyLogPage,
				text: '\n{{' + this.requestPage + '}}\n',
				watchlist: 'nochange',
				editType: 'appendtext'
			};

			this.mdEdit(page, "Listing [[" + this.requestPage + "]]", 'mdListRequestSubpageCB', 'mdListRequestSubpageCB');
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
		
		isMobile: function (cats) {
			var isMobile = false;

			for (var i = 0, len = cats.length; i < len; i++) {
				isMobile = isMobile || /^Category:Uploaded with Mobile/.test(cats[i].title);
			}
			return isMobile;
		},

		listMobileUpload: function () {
			var isMobile = false;
			vfc.pb.setCurrentTaskDone();
			vfc.pb.setTaskState('listMobileUpload', 'md-doing');
			
			$.each(vfc.iUploads, function(title, upli) {
				if (!vfc.iUploads.hasOwnProperty(title) || -2 !== upli.iId) return;
				isMobile = isMobile || vfc.isMobile(upli.categories);
			});
			if (!isMobile) {
				vfc.pb.setCurrentTaskDone();
				return vfc.nextTask();
			}
			
			var page = {
				title: 'Commons:Deletion requests/mobile tracking',
				text: '\n{{' + vfc.requestPage + '}}\n',
				watchlist: 'nochange',
				editType: 'appendtext'
			};

			vfc.mdEdit(page, "Listing [[" + vfc.requestPage + "]]", 'listMobileUploadCB', 'listMobileUploadCB');
		},
		
		listMobileUploadCB: function (result, query, err) {
			if (err) {
				this.pb.setCurrentTaskState('md-attention');
				this.pb.setError(err);
			} else {
				this.pb.setCurrentTaskDone();
			}
			this.nextTask();
		},

		listMobileUploadSpeedy: function () {
			var mobileUploads = [];
			vfc.pb.setCurrentTaskDone();
			vfc.pb.setTaskState('listMobileUploadSpeedy', 'md-doing');
			
			$.each(vfc.iUploads, function(title, upli) {
				if (!vfc.iUploads.hasOwnProperty(title) || -2 !== upli.iId) return;
				if (vfc.isMobile(upli.categories)) mobileUploads.push(title);
			});
			if (!mobileUploads.length) {
				vfc.pb.setCurrentTaskDone();
				return vfc.nextTask();
			}
		
			var page = {
				title: 'Commons:Mobile app/deletion request tracking',
				text: '\n# [[:' + mobileUploads.join(']]\n# [[:') + ']]',
				watchlist: 'nochange',
				editType: 'appendtext'
			};

			vfc.mdEdit(page, "Listing uploads", 'listMobileUploadCB', 'listMobileUploadCB');
		},
		
		mdTemplateAdded: function (result, query, err) {
			vfc.mdUploadCt--;

			var pgTitle = (result.requestid || query.title),
				$gb = vfc.gbs[pgTitle];

			if ($gb) {
				$gb.$thumb.removeClass('progress-doing').addClass(err ? 'progress-failed' : 'progress-done');
				if (err) $gb.find('.gallerytext').prepend($('<span>', { 'class': 'error' }).text(err), '<br/>');
				if (0 === $gb.inView().length) {
					if (vfc.gbScrollTimeout) clearTimeout(vfc.gbScrollTimeout);
					vfc.gbScrollTimeout = setTimeout(function() {
						// Scroll to the recently edited 
						if(vfc.dlg) {
							vfc.dlg.clearQueue().animate({ scrollTop: $gb.position().top }, 800);
						}
					}, 150);
				}
			}
			if (result.error) {
				vfc.pb.setCurrentTaskState('md-attention');
			}
			if (0 === vfc.mdUploadCt) vfc.nextTask();
		},
		
		mdNotifyUploaders: function () {
			$doc.triggerHandler('vFC', ['notifying uploaders', vfc, vfc.uploaders]);
			vfc.pb.setCurrentTaskDone();
			vfc.pb.setTaskState('mdNotifyUploaders', 'md-doing');
			vfc.api.total = 0;
			vfc.api.done = 0;
			
			vfc.uploadersToNotify = 0;
			$.each(vfc.uploaders, function(user, upli) {
				if (mw.libs.commons.isSmallChangesBot(user)) return;
				var page = {};
				page.title = vfc.mdUserTalkPrefix + user;
				page.text = "\n" + upli.tag + " ~~" + "~~\n";
				page.editType = 'appendtext';
				page.redirect = true;
				page.create = true;
				page.watchlist = vfc.mdSettings.watchlistUserTalk;
				page.minor = false;
				vfc.mdEdit(page, upli.summary, 'mdUploaderNotified');

				vfc.uploadersToNotify++;
			});
			if (vfc.uploadersToNotify === 0) vfc.nextTask();
		},

		mdUploaderNotified: function (/*result, query, err*/) {
			this.uploadersToNotify--;
			if (this.uploadersToNotify === 0) this.nextTask();
		},
		
		/**
		** Submit an edited page.
		**/
		mdEdit: function (page, summary, callback, errCallBack) {
			var edit = {
				action: 'edit',
				summary: summary,
				watchlist: (page.watchlist || 'preferences'),
				title: page.title,
				requestid: page.title,
				editType: page.editType,
				text: page.text,
				tags: vfc.mdChangeTag
			};
			if (!page.create) edit.nocreate = true;
			if (page.redirect) edit.redirect = true;
			if (page.basetimestamp) edit.basetimestamp = page.basetimestamp;
			if ('minor' in page) edit.minor = page.minor;
			// Token last - will be set by libAPI
			
			// submit edit and showProgress
			vfc.editAPI(edit, callback, errCallBack, true);

		},
		
		/**
		** Execute the delete-task.
		**/
		mdDelete: function() {
			vfc.pb.setCurrentTaskDone();
			vfc.pb.setTaskState('mdDelete', 'md-doing');
			
			$doc.triggerHandler('vFC', ['deleting files', vfc]);
			vfc.mdUploadCt = 0;
	
			for (var upload in vfc.iUploads) {
				if (vfc.iUploads.hasOwnProperty(upload) && (-2 === vfc.iUploads[upload].iId)) {
					vfc.secureCall('mdDeletePage', upload, vfc.file_summary);
				}
			}
			if (0 === vfc.mdUploadCt) vfc.nextTask();
		},
		mdDeletePage: function(page, summary) {
			vfc.mdUploadCt++;
			vfc.api.total++;
			
			var _always = function() {
				vfc.api.done++;
				vfc.pb.showProgress(vfc.api.total, vfc.api.done, 'deletions');
			};
			var _deleted = function() {
				vfc.mdTemplateAdded({ requestid: page }, '');
				_always();
			};
			var _problem = function(text) {
				vfc.mdTemplateAdded({ requestid: page }, '', text);
				_always();
			};
			var _err = function(text) {
				vfc.mdTemplateAdded({ requestid: page }, '', text);
				_always();
			};
			// Delete as many pages the same time as specified (max. 5)
			mw.libs.commons.api.config.maxSimultaneousReq = Math.min(vfc.mdSettings.maxSimultaneousReq, 5);
			mw.libs.commons.api.deletePage({
				cb: function() {
					_deleted();
				},
				// t-text, r-result, query
				errCb: function(t, r) {
					if (r && r.error && r.error.code === 'missingtitle') {
						_problem('File not found');
					} else {
						_err(t);
						vfc.api.wasError = true;
					}
				},
				title: page,
				reason: summary,
				tags: vfc.mdChangeTag
			});
		}
	});

	mw.loader.using([
		'ext.gadget.libWikiDOM'
	], function() {
		$doc.triggerHandler('scriptLoaded', ['VisualFileChange', 'editComponents']);
	});

}(jQuery, mediaWiki));
// </nowiki>