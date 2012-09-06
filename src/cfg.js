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

mw.util.addCSS( ' .vFCConfigRequired { visibility:visible !important; }\n' +
	 'div.growlUI { background: url("data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAMAAABEpIrGAAACfFBMVEUAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAgBUAAAAAAAAAAAAAAAAAAAAAAAALdRwTgSMAAAANeR8ReyAUgCMMfhweiC0XgyZgsmgPgRxhtWcZgyhRpVc6mkVMplUahCkYgicMdBYUgCMOeiJ5w3oVgTEahCkTgSAdhyotkTlbr2MMdhsWgCWJ04sUfiMdhyyCyoQNeR8RfSBnt20zkT4Udi1wvHUkijB1v3cchisJexwNeSFIolFxu3QTfSIpiTRVq10tjzk' + 
		'UfiMniTMWfiV1v3kNdx9ksmkOfCAAgAAVfSRksml7w30ehi0QfiBLoVMjiTFVp1sNexo1k0AQeh0ZgSgNfSIkiDJ2vnhxvXRHn1IQcCAYgidtt3AtjzlzvXMSfiEJGgATeyJZqV84lEMIVBVhs2lCnE12vnkcVgAehi1BnUo5l0QObhlAmEhtt28Pcx15wXxfsWUVgSQAbgAVgSR8xnwLVRYhhS8afiYFGQkTfSJisGdAsEBPv09Lu0tJuUlWxlZUxFRGuEZYyFhCskJEtkQwojAzozN+xoA5qzl3wXdQuFB2xnRQulA6qjpfy19vzW9JtEZYuFhStFJBr0F6xnqK1Ipculxbu1s7rTtvx29703uI0ohOtE41pzV5w3qX25dKrUeEzoRx0XF5wXlPtU9K' +
		'tEpawFp1wXN0xHJatFpKukqG0IRkxmR1xXN503mF1YVNvU1lvWVxx3FRwVFhyWF8zHxitmJLt0tlv2VbxlhfvV9SsFI8rDx5xXd3w3c+rj43qTdlx2U/qz+J04k2pjYuoC5ftV9sxmqN1438JI1wAAAAhnRSTlMAAxAYCggNHAwBIBQTBiMEFgQHCxonKhsYkiwmPHQrxanxRPG77Obqpq0WjEn8DMFQwt7vKaD+WtH+E1j14w313PzRGyjr+Xbq7eTo3dD7J/VZBq70/NJ+7tTwTeY/wSfb/vnrEMf64v6qCqXz6CLv5/4D1Ovnfe78nPr0rges/l7s1TVe8XMkZZgAAAGWSURBVHhexdBTkyUxGIDhtA6NsW3btte2bRt9rLFtG2vb+4e2u+Ziqvucz' +
		'O0+F0mq3lTlq4D/Jdrfd90eGjjq5+UJ4LwTWyb+lgTzYd0taMVoNA6crQIQUd3vdDrdk1g5pLvHter1+pdZSQAi+ccLyuB22Ahp6Utqtfqbz25Il2cvPqWMxwAIjwMzGo3mT0A8pEcefaXVahdSQlghNSx89eAS0WQwGPrPOTP7hYsjlzzo7nz5udlsfrPZBTAl3GhovHnrNgB37raZTKbljExmf/S4' + 
		'lyTf5+Tm5Re8JUlyurAIMBXPfaFM1ZaW1ZLU4VM5+5MrKtv7KJ1d53uobai6BrBs2LjpWR3tI7183gJsbd022/x1VccOd2DHzl3134dpP+v3ALv27ts/ZqXMH3QD9h06fOSDxWI9dhzS+ciJk6de//p9+owSJxQIn1kRMc5BRbIrVyevXXdSYTIRysHFyFqXEjxUiHEFknv3Hzx0dJAIuJgQ5RFS2wsOjq6ujAusJzCVE5fLeIIxpILAlTwOh2cz5Pr+AdZMhGvAEGFPAAAAAElFTkSuQmCC") no-repeat 10px 10px } div.growlUI h1, div.growlUI h2 {color: white; padding: 5px 5px 5px 75px; text-align: left }'
);

var profileVar = 'vFC_Profiles';
var scriptpath = mw.config.get('wgUserName') ? mw.config.get('wgFormattedNamespaces')[2] + ':' + mw.config.get('wgUserName').replace(/ /g, '_') + '/' : '';
var commonjsPath = scriptpath + 'common.js';
var skinjsPath = scriptpath + mw.config.get('skin') + '.js';
var vfc = window.VisualFileChange;

$.extend(window.VisualFileChange,
{
	configManager: true,
	
	mdConfig: function () {
		var cfg = vfc.mdDefaults,
			$dlgNode = $('<div>', { style: 'overflow:auto; max-height:' + (Math.round($(window).height()) - 150) + 'px;' });
			
		$dlgNode.$c = $('<div>').css('padding', '3px').appendTo($dlgNode);
		$('<p>', { text: 'Ok and save will apply settings. If you permanently save the settings they will be visible for each user. Do not insert private data here.' }).prependTo($dlgNode);
		$.each(cfg, function(i, el) {
			var $elDiv = $('<div>', { id: 'mdCfg_' + el.v + '_wrap' }).data('cfg', el);
			var $valEl, $valEl2, vl = (el.controls ? $(el.controls).val() : '') || vfc.mdSettings[el.v];
			
			$('<label>', { text: el.d, 'for': 'mdCfg' + el.v }).appendTo($elDiv);
			$('<br>').appendTo($elDiv);
			switch (typeof el['default']) {
				case 'number': 
					$valEl = $('<input>').attr({ type: 'text', size: (el.max+'').length, id: 'mdCfg' + el.v, 'class': 'numbersOnly' })
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
						$elDiv.append(vfc[el.select]().attr('id', 'mdCfg' + el.v).val(vl));
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
			$elDiv.append('<hr/>', '<br/>').appendTo($dlgNode.$c);
		});
		var dlgButtons = {};
		dlgButtons[vfc.i18n.mdConfig.okButton] = function() {
			vfc.mdPublishSettings(this, cfg);
			$(this).dialog('close');
		};
		dlgButtons[vfc.i18n.mdConfig.cancelButton] = function() {
			$(this).dialog('close');
		};
		if (!mw.user.anonymous()) {
			dlgButtons[vfc.i18n.mdConfig.permaSaveButton] = function() {
				vfc.mdPublishSettings(this, cfg);
				$dlgNode.$s = $('<div>', { style: 'text-align:left; min-height:290px' });
				$dlgNode.$c.block({ 
					message: $dlgNode.$s,
					css: {
						width: '95%'
					}
				});
				$dlgNode.dialog('option', 'buttons', {});
				
				$(document).bind('vFC_S', function(e, text, status, obj) {
					var icon = 'info';
					switch (status) {
						case -1:
							icon = 'close';
							break;
						case -2:
							icon = 'alert';
							break;
						case 100:
							icon = 'check';
							text += " You can close this dialog now.";
							$dlgNode.$c.unblock({
								onUnblock: function(){ 
									$dlgNode.dialog('close');
									$.growlUI("Saved", "Configuration saved to your JavaScript");
								}
							});
							break;
					}
					$dlgNode.$s.append($('<div>', { style: 'font-size:80%', text: '>' + (new Date().toLocaleString()) }));
					$dlgNode.$s.append($('<div>', { text: ' ' + text }).prepend($.createIcon('ui-icon-' + icon)));

					$(document).triggerHandler('vFC', ['Settings>' + text, vfc]);
				});
				
				vfc.mdSaveSettings(cfg, 'vFCvFCCfg', vfc.mdSettings, 'vFCSettings', 'is updating configuration');
			};
		}
		dlgButtons[vfc.i18n.mdConfig.defaultsButton] = function() {
			$.each(cfg, function(i, el) {
				$('#mdCfg'+el.v).val(el['default']).keyup();
			});
		};
		$dlgNode.dialog({
			title: 'Advanced settings',
			modal: true,
			resizable: false,
			width: Math.min(670, $(window).width()),
			close: function () {
				$(this).remove();
			},
			buttons: dlgButtons,
			open: function() {
				var $buttons = $(this).parent().find('.ui-dialog-buttonpane button');
				$buttons.eq(0).specialButton('proceed');
				$buttons.eq(1).specialButton('cancel');
				if (!mw.user.anonymous()) $buttons.eq(2).button({ icons: { primary: 'ui-icon-script', secondary: 'ui-icon-disk' } }).addClass('ui-button-orange');
				$buttons.eq(mw.user.anonymous() ? 2 : 3).button({ icons: { primary: 'ui-icon-refresh' } });
			}
		});
		vfc.$dialogsToClose.push($dlgNode);
	},
	
	mdPublishSettings: function(dlgNode, cfg) {
		$.each(cfg, function(i, el) {
			var val; 
			if ('boolean' === typeof el['default']) {
				val = $('#mdCfg'+el.v)[0].checked;
			} else if ('number' === typeof el['default']) {
				val = parseFloat($('#mdCfg'+el.v).val(), 10);
			} else {
				val = $('#mdCfg'+el.v).val();
			}
			vfc.mdSettings[el.v] = val;
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
	
	mdSaveSettings: function ( cfg, vFCBannerSig, varToSave, globalVarName, whatIAmDoing ) {
		var opt = mw.libs.settingsManager.option({ 
			optionName: globalVarName, 
			value: varToSave,
			encloseSignature: vFCBannerSig,
			encloseBlock:	'/////// VISUAL FILE CHANGE CONFIGURATION ///////\n' +
							'///// DO NOT MODIFY BY HAND - FINGERS AWAY! ////\n' +
							'////////////////////////////////////////////////\n',
			triggerSaveAt: /Visual ?File ?Change/i,
			editSummary: '[[' + vfc.mdSelfPath + '|VisualFileChange.js]] ' + whatIAmDoing
		});
		opt.save($(document), 'vFC_S').done(function() {
			// ...
			
			$(document).unbind('vFC_S');
		});
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
	 *			proceedAt: {
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
	
		var newConfigItem = { editInputs: {}, action: vfc.$ctrs.ajaxMdType.val(), objectMembers:{}, proceedAt: vfc.lastContinues, time: vfc.startDate || new Date() },
			membersToSave = ['queryParams', 'startInput'];

		$.each(membersToSave, function(i, memberName) {
			var memberVal = vfc[memberName];
			if ('undefined' !== typeof memberVal) newConfigItem.objectMembers[memberName] = memberVal;
		});

		vfc.$ctrs.container.find('input, textarea, select').each(function(i, el) {
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
		if (!window[profileVar]) window[profileVar] = {};
		window[profileVar][saveName] = vfc.getNewConfigItem(objProfile);
		
		$(document).unbind('vFC_S');
		$(document).bind('vFC_S', function(e, text, status, obj) {
			$(document).triggerHandler('vFC', ['Profile>' + text, vfc]);
			progressCB(status, text, "Saved", "The selected profile was saved to your user namespace");
		});
		vfc.mdUpdateJSProfile();
	},
	mdSaveProfileToClient: function (saveName, objProfile) {
		var oldClientConfig = vfc.mdGetClientProfiles();

		oldClientConfig[saveName] = vfc.getNewConfigItem(objProfile);
		$.jStorage.set(profileVar, oldClientConfig);
	},
	mdApplyProfile: function (applyName, source) {
		var profiles;

		if (!applyName) {
			return false;
		}

		switch (source) {
			case 'client':
				profiles = vfc.mdGetClientProfiles();
				break;
			case 'js':
				profiles = window[profileVar];
				break;
		}
		profiles = profiles[applyName];
		if (!profiles || !profiles.editInputs) return false;
		
		vfc.$ctrs.ajaxMdType.val(profiles.action).change();
		$.each(profiles.editInputs, function(id, val) {
			var $ctr = vfc.$ctrs.container.find('#' + id);
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
		var newConfig = {};

		$.each(window[profileVar], function(profileName, profileContent) {
			if (profileName !== rmName) {
				newConfig[profileName] = profileContent;
			}
		});
		window[profileVar] = newConfig;
		
		$(document).unbind('vFC_S');
		$(document).bind('vFC_S', function(e, text, status, obj) {
			$(document).triggerHandler('vFC', ['Profile>' + text, vfc]);
			progressCB(status, text, "Removed", "The selected profile was removed from your user namespace");
		});
		vfc.mdUpdateJSProfile();
	},
	mdRemoveProfileFromClient: function (rmName) {
		var oldClientConfig = vfc.mdGetClientProfiles(),
			newConfig = {};

		$.each(oldClientConfig, function(profileName, profileContent) {
			if (profileName !== rmName) {
				newConfig[profileName] = profileContent;
			}
		});
		$.jStorage.set(profileVar, newConfig);
	},
	
	mdProfile: function () {
		var oldClientConfig,
			$dlgNode, $profileSelect, $descSave, $addNameL, $addName, $addButtonClient, $addButtonJS, $descLoad, $loadButton, $descRemove, $removeButton, $cmdSection, $jsProgess;

		if (!window[profileVar]) window[profileVar] = {};
		var loadProfile = function() {
			if (!vfc.mdApplyProfile($profileSelect.data('selectedProfileName'), $profileSelect.data('selectedProfile').data('profileSource'))) {
				$profileSelect.addClass('ui-state-error');
				setTimeout(function() {
					$profileSelect.removeClass('ui-state-error');
				}, 1500);
			}
		};
		var updateSelect = function() {
			var profiles = vfc.mdGetClientProfiles();
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
			if (!vfc.$ctrs || !vfc.$ctrs.container) return false;
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
			vfc.mdSaveProfileToClient($addName.val());
			updateSelect();
			$addName.val('');
		};
		var saveToJS = function() {
			if (!testSaveInfo()) return;
			prepareJSAction();
			vfc.mdSaveProfileToJS($addName.val(), 0, showProgress);
			$addName.val('');
		};
		var removeFromClient = function(what) {
			vfc.mdRemoveProfileFromClient(what);
			updateSelect();
			$profileSelect.change();
		};
		var removeFromJS = function(what) {
			prepareJSAction();
			vfc.mdRemoveProfileFromJS(what, showProgress);
		};
		var showProgress = function(status, statusText, successHeading, successText) {
			switch (status) {
				case -1:
					$jsProgess.addClass('ui-state-error');
					alert('Error. Profile not saved: ' + statusText);
					break;
				case -2:
					$jsProgess.addClass('ui-state-highlight');
					$.growlUI("Problem", "Updating profiles threw an issue " + statusText);
					break;
				case 100:
					updateSelect();
					$addButtonJS.button('option', 'disabled', false);
					$removeButton.button('option', 'disabled', false);
					$profileSelect.change();
					$jsProgess.fadeOut(2000);
					$.growlUI(successHeading, successText);
					break;
			}
			mw.loader.using('jquery.ui.progressbar', function() {
				$jsProgess.progressbar({ value: status });
			});
		};
		
		$dlgNode = $('<div>', { text: 'Save the current input state into a profile or load a profile. VisualFileChange automatically updates a profile (auto) when you execute a task.' });
		$profileSelect = $('<select>').attr({ size: 15, style: 'min-width:150px; max-width:200px;' }).change(function() {
			var $sel = $profileSelect,
				$selVal = $sel.val() || '',
				selProfile = $selVal.replace(/ \([^\)\n]+\)$/, '');
			$addName.val(selProfile);
			$sel.data('selectedProfile', $sel.children().eq($sel[0].selectedIndex));
			$sel.data('selectedProfileName', selProfile);
			$loadButton.button( 'option', 'disabled', !$selVal );
			$removeButton.button( 'option', 'disabled', !$selVal );
		}).dblclick(function() {
			$loadButton.click();
			$dlgNode.dialog('close');
		});
		$descSave = $('<div>', { text: 'Save current inputs into your' });
		$addNameL = $('<label>', { text: 'Use the same name again to override a profile.' }).attr({ 'for': 'mdProfileName' });
		$addName = $('<input>').attr({ id: 'mdProfileName', type: 'text', size: 40, placeholder: 'Profile name', style: 'display:block; margin-left:0.4em' }).placeholder();
		$addButtonClient = $('<button>', { text: 'Browser (may not permanent)'})
			.button({ icons: { primary: 'ui-icon-disk' } })
			.click(saveToClient);
		$addButtonJS = $('<button>', { text: 'Commons-account (publicly visible)' })
			.button({ icons: { primary: 'ui-icon-script' } })
			.click(saveToJS);
		if (mw.user.anonymous()) $addButtonJS.button('option', 'disabled', true);
		$jsProgess = $('<div>', { style: 'display:inline-block; width:200px; height:25px;' });
		
		$descLoad = $('<div>', { text: 'Load a profile. Caution: Your current inputs will be lost. Double-click a profile name to load it and return.' });
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
		vfc.$dialogsToClose.push($dlgNode);
	},
	
	mdSuggestContinue: function () {
		var autoExecProfile = vfc.mdGetClientProfiles()['last executed (auto-saved)'],
			lookFor,
			$doc = $(document);

		if (!autoExecProfile || !autoExecProfile.objectMembers.queryParams) return;
		lookFor = autoExecProfile.objectMembers.queryParams.target;
		if (!autoExecProfile.proceedAt || !autoExecProfile.proceedAt.vals.length) return;
		
		var keyTimeout = 0;

		$doc.bind('vFC_Startup_target', function(e, text) {
			clearTimeout(keyTimeout);
			keyTimeout = setTimeout(function() {
				if (text.replace(/^User\:/, '') === lookFor) {
					vfc.$gNotifyText.text('You entered the same target as performed edits on last time and the good news are that VisualFileChange has automatically saved the files that were loaded last so you can continue there. ');
					vfc.$gNotifyText.append( $('<a>', { href: '#', text: 'Continue now!' }).button().click(function(e) {
						e.preventDefault();
						$.each(autoExecProfile.objectMembers, function(memberName, memberValue) {
							vfc[memberName] = memberValue;
						});
						$.each(autoExecProfile.proceedAt.setVals, function(i, memberToSet) {
							vfc.queryParams[memberToSet] = autoExecProfile.proceedAt.vals[0];
						});
						
						vfc.lastContinues.setVals = autoExecProfile.proceedAt.setVals;
						vfc.$AjaxMdContainer.text(vfc.i18n.mdPleaseWait);
						vfc.loadModule('ui.js', 'nextTask');
						$doc.bind('vFC.autoContinue', function(e, what) {
							if ('initial uploads dialog' === what) {
								$doc.unbind('vFC_Startup_target');
								$doc.unbind('vFC.autoContinue');
								vfc.mdApplyProfile('last executed (auto-saved)', 'client');
							}
						});
					}) );
					vfc.$gNotifyArea.show();
				} else {
					vfc.$gNotifyArea.hide();
				}
			}, 800);
		});
		if (vfc.$targetInput) vfc.$targetInput.triggerHandler('keyup');
	},
	
	mdConfigInstall: function () {
		vfc.pb.$cfg.click(function(e) {
			e.preventDefault();
			vfc.secureCall('mdConfig');
		});
		vfc.pb.$profile.click(function(e) {
			e.preventDefault();
			if ($(this).hasClass('ui-state-disabled')) return;
			vfc.secureCall('mdProfile');
		});
		vfc.mdSuggestContinue();
	}
});


mw.loader.using([
	'jquery.ui.dialog', 
	'jquery.ui.slider', 
	'jquery.ui.button', 
	'jquery.cookie', 
	'jquery.placeholder', 
	'jquery.jStorage',
	'mediawiki.user',
	'ext.gadget.SettingsManager',
	'ext.gadget.jquery.blockUI'
	], function() {
	$(document).triggerHandler('scriptLoaded', ['VisualFileChange', 'configManager']);
});

}(jQuery, mediaWiki));
// </nowiki>