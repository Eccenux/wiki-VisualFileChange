// Main script is at MediaWiki:VisualFileChange.js
// These are the delayed loaded edit components in order to speed up loading of the first UI

/*global jQuery:false, mediaWiki:false, appendCSS:false, alert:false, console:false */
/*jshint curly:false, forin:false, maxerr:200, laxbreak:true, bitwise:false,*/
(function ($, mw) {
'use strict';

if (!window.VisualFileChange) return;

$.extend(window.VisualFileChange,
{
	editComponents: true,
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
				o.mdExecute();
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
			if ( ('other' !== $('#AjaxMdType').val() ) && ('otrs' !== $('#AjaxMdType').val()) && (0 < o.ioUploads) ) {
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
		var upload;
		
		// Reverse-mapping: files-uploader --- > uploader-files
		for (upload in this.iUploads) {
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
		for (upload in this.iUploads) {
			if ( -2 === this.iUploads[upload].iId )  { this.requestPageContents += '\n* [[:' + upload + ']]'; }
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
			if (-2 !== this.iUploads[upload].iId) continue;
 
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

	cleanUp: function(text) {
		// FIXME: Do not use hardcoded strings as replacement vars. This is exploitable.
		// The following code is part of User:Magog the Ogre/cleanup.js
		/**********************
		* Function which removes <nowiki> and <!--...--> from the text, and replaces them with a set of 
		*   temporary strings. This is necessary, because functions which change text will may to leave the 
		*   nowikis/comments intact. The temporary strings function as "markers", so that 
		*   rebuild_comments_nowikis() can later be called and the nowikis/comments will return to the correct 
		*   position, untouched. 
		* Returns: An array, whose 0th element contains the altered string, and whose 1st element contains 
		*   another array which will focus as a set "tokens", which should be kept unaltered and passed to 
		*   rebuild_comments_nowikis() later.
		**********************/
		var parse_comments_nowikis = function (text) {
			//constants
			var nw_regex = /<nowiki>((?:.|\n)*?)<\/nowiki>/,
				c_regex = /<!\-\-((?:.|\n)*?)\-\->/,
				cs_regex = /<\!\-\-(\s*categories\s*by\s*commonsense\s*)\-\->/i; /* special one for CommonSense.... causing grouping headaches */

			//variables
			var comments = [],
				nowikis = [],
				comments_cs = [],
				nw_com_order = [];

			while (1) {
				var next_nw = text.search(nw_regex),
					next_c = text.search(c_regex),
					next_cs = text.search(cs_regex);

				if (next_nw === -1 && next_c === -1) break; /* cs_regex will be -1 if c_regex is -1 */
				
				var index;
				if (next_nw === -1 || (next_c !== -1 && next_c < next_nw)) {
					if (next_cs === next_c) {
						index = comments_cs.length;
						comments_cs.push(cs_regex.exec(text)[1]);
						text = text.replace(c_regex, "%%%MTOCSCOMMENT" + index + "%%%");
						nw_com_order.push('s');
					} else {
						index = comments.length;
						comments.push(c_regex.exec(text)[1]);
						text = text.replace(c_regex, "%%%MTOCOMMENT" + index + "%%%");
						nw_com_order.push('c');
					}
				} else {
					index = nowikis.length;
					nowikis.push(nw_regex.exec(text)[1]);
					text = text.replace(nw_regex, "%%%MTONOWIKI" + index + "%%%");
					nw_com_order.push('n');
				}
			}
			return [text, [comments, nowikis, comments_cs, nw_com_order]];
		};
		/**********************
		* See function immediately above for explanation
		* remove_whitespace: when rebuilding nowikis, remove unnecessary whitespace (not shown in final version anyway)
		* Returns: Rebuilt text.
		**********************/
		var rebuild_comments_nowikis = function (text, tokens, remove_whitespace) {
			var comments = tokens[0],
				nowikis = tokens[1],
				comments_cs = tokens[2],
				nw_com_order = tokens[3];

			while (nw_com_order.length > 0) {
				var next = nw_com_order.pop();
				if (next === 's') {
					text = text.replace("%%%MTOCSCOMMENT" + (comments_cs.length - 1) + "%%%", "<!--" + comments_cs.pop() + "-->");
				} else if (next === 'c') {
					text = text.replace("%%%MTOCOMMENT" + (comments.length - 1) + "%%%", "<!--" + comments.pop() + "-->");
				} else /* i.e., nw_com_order.pop was 'n'; also, mediawiki registers all whitespace inside nw's as just one space */
				{
					var text_tmp = nowikis.pop();
					if (remove_whitespace) {
						text_tmp = text_tmp.replace(/\s+/g, ' ');
					}
					text = text.replace("%%%MTONOWIKI" + (nowikis.length) + "%%%", "<nowiki>" + text_tmp + "</" + "nowiki>");
				}
			}
			return text;
		};
		
		var cnwt = parse_comments_nowikis(text);
		var cleanup = cnwt[0];
		var tokens = cnwt[1];
		
		cleanup = cleanup.replace('== Summary ==', '== {{int:summary}} ==')
				.replace('== Licensing ==', '== {{int:license-header}} ==').replace('== License ==', '== {{int:license-header}} ==').replace('== Lizenz ==', '== {{int:license-header}} ==');
		
		cleanup = rebuild_comments_nowikis(cleanup, tokens, true);
		return cleanup;
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
			
			page.text = this.cleanUp(page.text);
 
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
	}
});

$(document).triggerHandler('scriptLoaded', ['VisualFileChange', 'EditComponents']);

}(jQuery, mediaWiki));