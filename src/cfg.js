// Main script is at [[MediaWiki:VisualFileChange.js]]
// These are the delayed loaded configuration components (user's custom config) in order to speed up loading of the first UI
// <nowiki>

// Invoke jsHint-validation

/*global jQuery:false, mediaWiki:false */
/*jshint curly:false, smarttabs:true */
(function ($, mw) {
'use strict';

// Return if Main Script is not loaded
if (!window.VisualFileChange) return;
// Return if this script is already loaded
if (window.VisualFileChange.configManager) return;

mw.util.addCSS( ' .vFCConfigRequired { visibility:visible !important; }\n' );

var profileVar = 'vFC_Profiles';
var scriptpath = mw.config.get('wgUserName') ? mw.config.get('wgFormattedNamespaces')[2] + ':' + mw.config.get('wgUserName').replace(/ /g, '_') + '/' : '';
var commonjsPath = scriptpath + 'common.js';
var skinjsPath = scriptpath + mw.config.get('skin') + '.js';

$.extend(window.VisualFileChange,
{
	configManager: true,
	
	mdConfig: function () {
		var o = this,
			cfg = this.mdDefaults,
			$dlgNode = $('<div>', { style: 'overflow:auto; max-height:' + (Math.round($(window).height()) - 150) + 'px;' });

		$('<p>', { text: 'Ok and save will apply settings. If you permanently save the settings they will be visible for each user. Do not insert private data here.' }).appendTo($dlgNode);
		$.each(cfg, function(i, el) {
			var $elDiv = $('<div>', { id: 'mdCfg_' + el.v + '_wrap' }).data('cfg', el);
			var $valEl, $valEl2, vl = (el.controls ? $(el.controls).val() : '') || o.mdSettings[el.v];
			
			$('<label>', { text: el.d, 'for': 'mdCfg' + el.v }).appendTo($elDiv);
			$('<br>').appendTo($elDiv);
			switch (typeof el['default']) {
				case 'number': 
					$valEl = $('<input>', { type: 'text', size: (el.max+'').length, id: 'mdCfg' + el.v, 'class': 'numbersOnly' })
						.focus(function() { $(this).select(); })
						.keyup(function(e) {
							var val = this.value = this.value.replace(/[^0-9]/g,'');
							if (val) {
								if (val > el.max) {
									this.value = el.max;
								} else if (val < el.min) {
									this.value = el.min;
								}
								$valEl2.slider('option', 'value', this.value);
							}
						}).val(vl).appendTo($elDiv);
					$valEl2 = $('<div>', { style: 'margin-top:5px; margin-bottom:5px;' }).slider({
						min: el.min,
						max: el.max,
						value: vl,
						change: function(e, ui) {
							$valEl.val( ui.value );
						},
						slide: function(e, ui) {
							$valEl.val( ui.value );
						}
					}).appendTo($elDiv);
					break;
				case 'string':
					if ('function' === typeof el.select) {
						$elDiv.append(el.select().attr('id', 'mdCfg' + el.v).val(vl));
					} else if ('string' === typeof el.select) {
						$elDiv.append(o[el.select]().attr('id', 'mdCfg' + el.v).val(vl));
					} else {
						$('<input>', { type: 'text', id: 'mdCfg' + el.v, style: 'width:99%' }).val(vl).appendTo($elDiv);
					}
					break;
				case 'boolean':
					$valEl = $('<input>', { type: 'checkbox', id: 'mdCfg' + el.v }).appendTo($elDiv);
					if (vl) $valEl[0].checked = true;
					break;
				case 'function':
					$valEl = $(el.controls).clone().attr('id', 'mdCfg' + el.v);
					$valEl.appendTo($elDiv);
					break;
			}
			$elDiv.append('<hr/>', '<br/>').appendTo($dlgNode);
		});
		var dlgButtons = {};
		dlgButtons[o.i18n.mdConfig.okButton] = function() {
			o.mdPublishSettings(this, cfg);
			$(this).dialog('close');
		};
		dlgButtons[o.i18n.mdConfig.cancelButton] = function() {
			$(this).dialog('close');
		};
		if (!mw.user.anonymous()) {
			dlgButtons[o.i18n.mdConfig.permaSaveButton] = function() {
				o.mdPublishSettings(this, cfg);
				$dlgNode.html('');
				$dlgNode.dialog('option', 'buttons', {});
				
				$(document).bind('vFC_S', function(e, p0, p1, p2, p3, p4) {
					$dlgNode.append($('<div>', { style: 'font-size:80%', text: '>' + (new Date().toLocaleString()) }));
					if (p4) {
						$dlgNode.append($('<div>', { text: ' ' + p1, 'class': p4 }));
					} else {
						$dlgNode.append($('<div>', { text: ' ' + p1 }).prepend(o.mdCreatejIcon('ui-icon-info')));
					}
					$(document).triggerHandler('vFC', ['Settings', p2, p1]);
				});
				
				o.mdSaveSettings(cfg, 'vFCvFCCfg', o.mdSettings, 'vFCSettings', 'is updating configuration');
			};
		}
		dlgButtons[o.i18n.mdConfig.defaultsButton] = function() {
			$.each(cfg, function(i, el) {
				$('#mdCfg'+el.v).val(el['default']).keyup();
			});
		};
		$dlgNode.dialog({
			title: 'Advanced settings',
			modal: true,
			resizable: false,
			width: Math.min(650, $(window).width()),
			close: function () {
				$(this).remove();
			},
			buttons: dlgButtons,
			open: function() {
				var $buttons = $(this).parent().find('.ui-dialog-buttonpane button');
				$buttons.eq(0).button({ icons: { primary: 'ui-icon-circle-check' } }).addClass('ui-button-blue');
				$buttons.eq(1).button({ icons: { primary: 'ui-icon-circle-close' } }).addClass('ui-button-red');
				if (!mw.user.anonymous()) $buttons.eq(2).button({ icons: { primary: 'ui-icon-script', secondary: 'ui-icon-disk' } }).addClass('ui-button-orange');
				$buttons.eq(mw.user.anonymous() ? 2 : 3).button({ icons: { primary: 'ui-icon-refresh' } });
			}
		});
		this.$configDlgNode = $dlgNode;
	},
	
	mdPublishSettings: function(dlgNode, cfg) {
		var o = this;
		$.each(cfg, function(i, el) {
			var val; 
			if ('boolean' === typeof el['default']) {
				val = $('#mdCfg'+el.v)[0].checked;
			} else {
				val = $('#mdCfg'+el.v).val();
			}
			o.mdSettings[el.v] = val;
			window.vFCSettings[el.v] = val;
			if (el.old) window[el.old] = val;
			if (el.controls) {
				var $controlled = $(el.controls);
				if (0 === $controlled.length) return;
				$controlled.val(val);
				$controlled.triggerHandler('keyup');
				$controlled.triggerHandler('change');
			}
		});
	},
	
	mdLoadRawPage: function(page, cbOk, cbErr) {
		var o = this;
		$.ajax({
			url: mw.config.get('wgScript'),
			data: { 'action': 'raw', title: page, maxage: 0, smaxage: 0 },
			dataType: 'text',
			error: function(x, status, error) {
				if ('Not Found' === error) {
					cbOk('', page);
					return;
				}
				if (x && 404 === x.status) {
					cbOk('', page);
					return;
				}
				cbErr(o.i18n.mdConfig.getScriptErr);
				$(document).triggerHandler('vFC_S', [400, o.i18n.mdConfig.getScriptErr, this, error, 'md-failed']);
			},
			success: function(res) {
				cbOk(res, page);
			},
			type: 'GET',
			cache: false
		});
	},
	
	/**
	**  Save the configuration on the position where it comes from
	**  
	**/
	mdReplaceConfig: function (commonText, skinText, preferred, pattern, replace) {
		var o = this,
			t1Contains = pattern.test(commonText),
			t2Contains = pattern.test(skinText);
		
		var addLog = function(jsFile) {
			$(document).triggerHandler('vFC_S', [570, 'Adding new configuration to ' + jsFile, o]);
		};
		if (t1Contains && t2Contains) {
			if (1 === preferred) {
				addLog(commonjsPath);
				return [commonText.replace(pattern, replace), skinText.replace(pattern, '')];
			} else {
				addLog(skinjsPath);
				return [commonText.replace(pattern, ''), skinText.replace(pattern, replace)];
			}
		}
		if (t1Contains) {
			addLog(commonjsPath);
			return [commonText.replace(pattern, replace), skinText];
		}
		if (t2Contains) {
			addLog(skinjsPath);
			return [commonText, skinText.replace(pattern, replace)];
		}
		if (1 === preferred) {
			addLog(commonjsPath);
			return [commonText + replace, skinText];
		} else {
			addLog(skinjsPath);
			return [commonText, skinText + replace];
		}
	},
	
	mdSaveSettings: function ( cfg, vFCBannerSig, varToSave, globalVarName, whatIAmDoing ) {
		var o = this;
		
		var skinjs, commonjs, skinjsN, commonjsN;
		
		$(document).triggerHandler('vFC_S', [100, 'Initializing', this]);
		
		var removeOldConfig = function(text, jsPath) {
			if (!text || !cfg) return text;
			// Remove old variables: We assume that the user did not use multiple lines... sorry
			$.each(cfg, function(i, el) {
				if (el.old) {
					var rx = new RegExp('[\\t ]*(?:var\\s+|window.)' + $.escapeRE(el.old) + '\\s*\\=.+', 'g'),
						rxN = new RegExp('[\\t ]*(?:var\\s+|window.)' + $.escapeRE(el.old) + '\\s*\\=.+(?:\\n\\s*)?\\+');
					if (rxN.test(text)) {
						$(document).triggerHandler('vFC_S', [550, 'WARNING: Could not remove ' + el.old + ' from ' + jsPath, o, el, 'md-attention']);
						return;
					}
					text = text.replace(rx, '');
				}
			});
			return text;
		};
		
		var vFCBanner = '\n\n//' + vFCBannerSig + '/////////////////////////////////////\n' +
						'/////// VISUAL FILE CHANGE CONFIGURATION ///////\n' +
						'///// DO NOT MODIFY BY HAND - FINGERS AWAY! ////\n' +
						'////////////////////////////////////////////////\n';
		var vFCBannerEnd = '//////////////////////////////////' + vFCBannerSig + 'End//';
		var vFCBannerRx = new RegExp('\\n?\\n?\\/\\/'+ vFCBannerSig +'(?:.|\\n)+'+ vFCBannerSig +'End\\/\\/', 'g');
						
		
		var buildNewCfg = function() {
			return vFCBanner + 'window.'+ globalVarName +' = ' + $.toJSON(varToSave) + '; \n' + vFCBannerEnd;
		};
		
		var gotJS = function(res, jsFile) {
			if (commonjsPath === jsFile) {
				commonjsN = commonjs = res;
			} else {
				skinjsN = skinjs = res;
			}
			$(document).triggerHandler('vFC_S', [400, 'Server returned ' + jsFile + '. ' + ($.trim(res) ? ('Size: ' + res.length) + ' chars.' : 'It is empty.'), o]);
			if ('string' !== typeof skinjs || 'string' !== typeof commonjs) return;
			
			// So we got all the code we need.
			$(document).triggerHandler('vFC_S', [500, 'Removing old configuration from your custom JavaScript configuration files', o]);
			skinjs = removeOldConfig(skinjs, skinjsPath);
			commonjs = removeOldConfig(commonjs, commonjsPath);
			
			var prefJS;
			prefJS = skinjs.length ? 2 : 1;
			prefJS = (skinjs !== skinjsN) ? 2 : prefJS;
			prefJS = (commonjs !== commonjsN) ? 1 : prefJS;
			if (skinjs === skinjsN && commonjs === commonjsN) prefJS = (/(?:vFCvFCCfg|Visual ?File ?Change)/i.test(commonjs)) ? 1 : 2;
			var bothJS = o.mdReplaceConfig( commonjs, skinjs, prefJS, vFCBannerRx, buildNewCfg() );
			commonjs = bothJS[0];
			skinjs = bothJS[1];
			
			var page = {
				title: '',
				text: '',
				watchlist: 'nochange',
				editType: 'text'
			};
			var editSummary = '[[' + o.mdSelfPath + '|VisualFileChange.js]] ' + whatIAmDoing;
			
			o.settingSaves = 0;
			if (skinjs !== skinjsN) {
				page.title = skinjsPath;
				page.text = skinjs;
				$(document).triggerHandler('vFC_S', [600, 'Saving ' + skinjsPath, o]);
				o.mdSavePage(page, editSummary, 'mdSaveSettingsCB', 'mdSaveSettingsCB');
				o.settingSaves++;
			}
			if (commonjs !== commonjsN) {
				page.title = commonjsPath;
				page.text = commonjs;
				$(document).triggerHandler('vFC_S', [600, 'Saving ' + commonjsPath, o]);
				o.settingSaves++;
				o.mdSavePage(page, editSummary, 'mdSaveSettingsCB', 'mdSaveSettingsCB');
			}
			if (0 === o.settingSaves) $(document).triggerHandler('vFC_S', [1000, 'Nothing to change. You can close this dialog now.', o, '', 'md-done']);
		};
		
		o.mdLoadRawPage(commonjsPath, gotJS, o.fail);
		o.mdLoadRawPage(skinjsPath, gotJS, o.fail);
		$(document).triggerHandler('vFC_S', [200, 'Loading your custom JavaScript configuration files', this]);
	},
	
	mdSaveSettingsCB: function (result, query, err) {
		this.settingSaves--;
		var pgTitle = (result.requestid || query.title);
		if (err) {
			$(document).triggerHandler('vFC_S', [999 -this.settingSaves*250, 'Updated ' + pgTitle + ' failded. ERROR: ' + err, this, err, 'md-failed']);
		} else {
			$(document).triggerHandler('vFC_S', [999 -this.settingSaves*250, pgTitle + ' successfully updated', this, result, 'md-done']);
		}
		if (0 === this.settingSaves) {
			$(document).triggerHandler('vFC_S', [1000, 'Ready. You can close this dialog now.', this]);
			$(document).unbind('vFC_S');
		}
	},
	
	/**
	 *	vFC_Profiles = { 
	 *		profileName: {
	 *			action: 'string',
	 *			editInputs: {
	 *				id: value
	 *			},
	 *			objectMembers: {
	 *				memberName: memberVal
	 *			},
	 *			continueAt: {
	 *				setVals: [],
	 *				vals: []
	 *			},
	 *			time: execution/save-time
	 *		}
	 *	}
	 *
	 *
	 *
	 */
	mdGetClientProfiles: function () {
		return $.jStorage.get(profileVar, {});
	},
	getNewConfigItem: function (objProfile) {
		if ('object' === typeof objProfile) return objProfile;
	
		var o = this,
			newConfigItem = { editInputs: {}, action: o.$AjaxMdType.val(), objectMembers:{}, continueAt: o.lastContinues, time: o.startDate || new Date() },
			membersToSave = ['mdTarget', 'mdLedir', 'mdCmdir', 'mdCmsort'];

		$.each(membersToSave, function(i, memberName) {
			var memberVal = o[memberName];
			if ('undefined' !== typeof memberVal) newConfigItem.objectMembers[memberName] = memberVal;
		});

		o.$mdControls.find('input, textarea, select').each(function(i, el) {
			var $el = $(el),
				$elId = $el.attr('id'),
				$elType = $el.attr('type');

			if (!$elId) return;
			newConfigItem.editInputs[$elId] = ('checkbox' === $elType) ? $el[0].checked : $el.val();
		});
		return newConfigItem;
	},
	mdUpdateJSProfile: function () {
		this.mdSaveSettings(0, 'vFCProfil', window[profileVar], profileVar, 'is updating a profile');
	},
	mdSaveProfileToJS: function (saveName, objProfile, progressCB) {
		var o = this;
		
		if (!window[profileVar]) window[profileVar] = {};
		window[profileVar][saveName] = o.getNewConfigItem(objProfile);
		
		$(document).bind('vFC_S', function(e, p0, p1, p2, p3, p4) {
			$(document).triggerHandler('vFC', ['Settings', p2, p1]);
			progressCB(p0);
		});
		o.mdUpdateJSProfile();
	},
	mdSaveProfileToClient: function (saveName, objProfile) {
		var o = this,
			oldClientConfig = o.mdGetClientProfiles();

		oldClientConfig[saveName] = o.getNewConfigItem(objProfile);
		$.jStorage.set(profileVar, oldClientConfig);
	},
	mdApplyProfile: function (applyName, source) {
		var o = this,
			profiles;

		if (!applyName) {
			return false;
		}

		switch (source) {
			case 'client':
				profiles = o.mdGetClientProfiles();
				break;
			case 'js':
				profiles = window[profileVar];
				break;
		}
		profiles = profiles[applyName];
		if (!profiles || !profiles.editInputs) return false;
		
		o.$AjaxMdType.val(profiles.action).change();
		$.each(profiles.editInputs, function(id, val) {
			var $ctr = o.$mdControls.find('#' + id);
			if (!$ctr.length) return;
			if ('boolean' === typeof val) {
				$ctr[0].checked = val;
				$ctr.change();
			} else {
				$ctr.val(val).keyup();
			}
		});
		return true;
	},
	mdRemoveProfileFromJS: function (rmName, progressCB) { 
		var o = this,
			newConfig = {};

		$.each(window[profileVar], function(profileName, profileContent) {
			if (profileName !== rmName) {
				newConfig[profileName] = profileContent;
			}
		});
		window[profileVar] = newConfig;
		
		$(document).bind('vFC_S', function(e, p0, p1, p2, p3, p4) {
			$(document).triggerHandler('vFC', ['Settings', p2, p1]);
			progressCB(p0, p4);
		});
		o.mdUpdateJSProfile();
	},
	mdRemoveProfileFromClient: function (rmName) {
		var o = this,
			oldClientConfig = o.mdGetClientProfiles(),
			newConfig = {};

		$.each(oldClientConfig, function(profileName, profileContent) {
			if (profileName !== rmName) {
				newConfig[profileName] = profileContent;
			}
		});
		$.jStorage.set(profileVar, newConfig);
	},
	
	mdProfile: function () {
		var o = this,
			oldClientConfig,
			$dlgNode, $profileSelect, $descSave, $addNameL, $addName, $addButtonClient, $addButtonJS, $descLoad, $loadButton, $descRemove, $removeButton, $cmdSection, $jsProgess;

		if (!window[profileVar]) window[profileVar] = {};
		var loadProfile = function() {
			if (!o.mdApplyProfile($profileSelect.data('selectedProfileName'), $profileSelect.data('selectedProfile').data('profileSource'))) {
				$profileSelect.addClass('ui-state-error');
				setTimeout(function() {
					$profileSelect.removeClass('ui-state-error');
				}, 1500);
			}
		};
		var updateSelect = function() {
			var profiles = o.mdGetClientProfiles();
			$profileSelect.text('');
			$.each(profiles, function(profileName, profileContent) {
				$profileSelect.append($('<option>', { text: profileName + ' (browser)' }).data('profileSource', 'client'));
			});
			$.each(window[profileVar], function(profileName, profileContent) {
				$profileSelect.append($('<option>', { text: profileName + ' (Commons)' }).data('profileSource', 'js'));
			});
		};
		var testSaveInfo = function() {
			if (!$addName.val()) {
				$addName.addClass('ui-state-highlight');
				setTimeout(function() {
					$addName.removeClass('ui-state-highlight');
				}, 1500);
				return false;
			}
			if (!o.$mdControls) return false;
			return true;
		};
		var prepareJSAction = function() {
			$addButtonJS.button('option', 'disabled', true);
			$removeButton.button('option', 'disabled', true);
			$jsProgess.removeClass('ui-state-error');
			$jsProgess.show();
		};
		var saveToClient = function() {
			if (!testSaveInfo()) return;
			o.mdSaveProfileToClient($addName.val());
			updateSelect();
			$addName.val('');
		};
		var saveToJS = function() {
			if (!testSaveInfo()) return;
			prepareJSAction();
			o.mdSaveProfileToJS($addName.val(), 0, showProgress);
			$addName.val('');
		};
		var removeFromClient = function(what) {
			o.mdRemoveProfileFromClient(what);
			updateSelect();
			$profileSelect.change();
		};
		var removeFromJS = function(what) {
			prepareJSAction();
			o.mdRemoveProfileFromJS(what, showProgress);
		};
		var showProgress = function(p, p4) {
			if ('md-failed' === p4) {
				$jsProgess.addClass('ui-state-error');
				alert('Error. Profile not saved.');
			}
			if (1000 === p) {
				updateSelect();
				$addButtonJS.button('option', 'disabled', false);
				$removeButton.button('option', 'disabled', false);
				$profileSelect.change();
				$jsProgess.fadeOut(2000);
			}
			mw.loader.using('jquery.ui.progressbar', function() {
				$jsProgess.progressbar({ value: p/10 });
			});
		};
		
		this.$profileDlgNode = $dlgNode = $('<div>', { text: 'Save the current input state into a profile or load a profile. VisualFileChange automatically updates a profile (auto) when you execute a task.' });
		$profileSelect = $('<select>', { size: 15, style: 'min-width:150px; max-width:200px;' }).change(function() {
			var $sel = $profileSelect,
				$selVal = $sel.val() || '',
				selProfile = $selVal.replace(/ \(.+\)$/, '');
			$addName.val(selProfile);
			$sel.data('selectedProfile', $sel.children().eq($sel[0].selectedIndex));
			$sel.data('selectedProfileName', selProfile);
			$loadButton.button( 'option', 'disabled', !$selVal );
			$removeButton.button( 'option', 'disabled', !$selVal );
		});
		$descSave = $('<div>', { text: 'Save current inputs into your' });
		$addNameL = $('<label>', { 'for': 'mdProfileName', text: 'Use the same name again to override a profile.' });
		$addName = $('<input>', { id: 'mdProfileName', type: 'text', size: 40, placeholder: 'Profile name', style: 'display:block; margin-left:0.4em' }).placeholder();
		$addButtonClient = $('<button>', { text: 'Browser (may not permanent)'})
			.button({ icons: { primary: 'ui-icon-disk' } })
			.click(saveToClient);
		$addButtonJS = $('<button>', { text: 'Commons-account (publicly visible)' })
			.button({ icons: { primary: 'ui-icon-script' } })
			.click(saveToJS);
		if (mw.user.anonymous()) $addButtonJS.button('option', 'disabled', true);
		$jsProgess = $('<div>', { style: 'display:inline-block; width:200px; height:25px;' });
		
		$descLoad = $('<div>', { text: 'Load a profile. Caution: Your current inputs will be lost.' });
		$loadButton = $('<button>', { text: 'Load', disabled: 'disabled', style: 'display:block;' })
			.button({ icons: { primary: 'ui-icon-folder-open' } })
			.click(loadProfile);
		
		$descRemove = $('<div>', { text: 'Remove a profile.' });
		$removeButton = $('<button>', { text: 'Remove', disabled: 'disabled', style: 'display:block;' })
			.button({ icons: { primary: 'ui-icon-trash' } })
			.click(function() {
				switch ($profileSelect.data('selectedProfile').data('profileSource')) {
					case 'client':
						removeFromClient($profileSelect.data('selectedProfileName'));
						break;
					case 'js':
						removeFromJS($profileSelect.data('selectedProfileName'));
						break;
				}
			});
		
		$cmdSection = $('<div>', { style: 'display:inline-block; margin:4px; max-width:360px' }).append($descLoad, $loadButton, $descRemove, $removeButton, $('<hr/>'), $addNameL, $addName, $descSave, $addButtonClient, ' ', $addButtonJS, $jsProgess);
		
		$dlgNode.append($('<br>'), $profileSelect, $cmdSection);
		
		updateSelect();
		mw.loader.load('jquery.ui.progressbar');
		
		$dlgNode.dialog({
			title: 'Profile manager',
			modal: true,
			resizable: false,
			width: Math.min(610, $(window).width()),
			close: function () {
				$(this).remove();
			}
		});
	},
	
	mdSuggestContinue: function () {
		var o = this,
			autoExecProfile = o.mdGetClientProfiles()['auto-exec'],
			lookFor,
			$doc = $(document);

		if (!autoExecProfile) return;
		lookFor = autoExecProfile.objectMembers.mdTarget;
		if (!autoExecProfile.continueAt || !autoExecProfile.continueAt.vals.length) return;
		
		var keyTimeout = 0;

		$doc.bind('vFC_Startup_target', function(e, text) {
			clearTimeout(keyTimeout);
			keyTimeout = setTimeout(function() {
				if (text.replace(/^User\:/, '') === lookFor) {
					o.$gNotifyText.text('You entered the same target as performed edits on last time and the good news are that VisualFileChange has automtatically saved the files that were loaded last so you can continue there. ');
					o.$gNotifyText.append( $('<a>', { href: '#', text: 'Continue now!' }).click(function(e) {
						e.preventDefault();
						$.each(autoExecProfile.objectMembers, function(memberName, memberValue) {
							o[memberName] = memberValue;
						});
						$.each(autoExecProfile.continueAt.setVals, function(i, memberToSet) {
							o[memberToSet] = autoExecProfile.continueAt.vals[0];
						});
						o.lastContinues.setVals = autoExecProfile.continueAt.setVals;
						o.$AjaxMdContainer.text(o.i18n.mdPleaseWait);
						o.loadModule('ui.js', 'nextTask');
						$doc.bind('vFC.autoContinue', function(e, what) {
							if ('initial uploads dialog' === what) {
								$doc.unbind('vFC_Startup_target');
								$doc.unbind('vFC.autoContinue');
								o.mdApplyProfile('auto-exec', 'client');
							}
						});
					}) );
					o.$gNotifyArea.show();
				} else {
					o.$gNotifyArea.hide();
				}
			}, 800);
		});
		if (o.$targetInput) o.$targetInput.triggerHandler('keyup');
	},
	
	mdConfigInstall: function () {
		var o = this;
		this.pb.$cfg.click(function(e) {
			e.preventDefault();
			o.mdSecureCall('mdConfig');
		});
		this.pb.$profile.click(function(e) {
			e.preventDefault();
			if ($(this).hasClass('ui-state-disabled')) return;
			o.mdSecureCall('mdProfile');
		});
		o.mdSuggestContinue();
	}
});


mw.loader.using([
	'jquery.ui.dialog', 
	'jquery.ui.slider', 
	'jquery.ui.button', 
	'jquery.cookie', 
	'jquery.placeholder', 
	'mediawiki.user',
	'ext.gadget.jStorage'
	], function() {
	$(document).triggerHandler('scriptLoaded', ['VisualFileChange', 'configManager']);
});

}(jQuery, mediaWiki));
// </nowiki>