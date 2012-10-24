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
var vfc = window.VisualFileChange,
	i18n = vfc.i18n.cfg,
	$doc = $(document),
	$win = $(window);

$.extend(window.VisualFileChange,
{
	configManager: true,
	
	mdConfig: function () {
		var cfg = vfc.mdDefaults,
			_prog,
			_done;
			
		_prog = function( id, verbose, $dlg ) {
			if ('dlgup' === id) vfc.$dialogsToClose.push($dlg);
		};
		_done = function(id, verbose, location, settings, $dlg) {
		
			vfc.mdPublishSettings( settings );
			
			switch (location) {
				case 'page':
					$.growlUI(i18n.tmpStored, i18n.tmpStoredText);
					$dlg.dialog('close');
					break;
				case 'account-publicly':
					// Append a status node to the object
					$dlg.$s = $('<div>', { style: 'text-align:left; min-height:290px' });
					$dlg.$c.block({ 
						message: $dlg.$s,
						css: {
							width: '95%'
						}
					});
					$dlg.dialog('option', 'buttons', {});
					
					$doc.bind('vFC_S', function(e, text, status, obj) {
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
								text += " " + i18n.youCanCloseDialog;
								$dlg.$c.unblock({
									onUnblock: function(){ 
										$dlg.dialog('close');
										$.growlUI(i18n.jsSaved, i18n.jsSavedText);
									}
								});
								break;
						}
						$dlg.$s.append($('<div>', { style: 'font-size:80%', text: '>' + (new Date().toLocaleString()) }));
						$dlg.$s.append($('<div>', { text: ' ' + text }).prepend($.createIcon('ui-icon-' + icon)));

						$doc.triggerHandler('vFC', ['Settings>' + text, vfc]);
					});
					
					vfc.mdSaveSettings(cfg, 'vFCvFCCfg', vfc.mdSettings, 'vFCSettings', 'is updating configuration');
					
					break;
			}
		};

		$.each(cfg, function(i, el) {
			el.value = (el.controls ? $(el.controls).val() : '') || vfc.mdSettings[el.name];
		});
		
		window.mw.libs
			.SettingsUI(cfg, "VisualFileChange")
			.show().progress(_prog).done(_done);
	},
	
	mdPublishSettings: function(cfg) {
		$.each(cfg, function(i, el) {
			var val = el.value;
			vfc.mdSettings[el.name] = val;
			window.vFCSettings[el.name] = val;
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
		opt.save($doc, 'vFC_S').done(function() {
			// ...
			
			$doc.unbind('vFC_S');
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
		
		$doc.unbind('vFC_S');
		$doc.bind('vFC_S', function(e, text, status, obj) {
			$doc.triggerHandler('vFC', ['Profile>' + text, vfc]);
			progressCB(status, text, i18n.jsProfileSaved, i18n.jsProfileSavedText);
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
		
		$doc.unbind('vFC_S');
		$doc.bind('vFC_S', function(e, text, status, obj) {
			$doc.triggerHandler('vFC', ['Profile>' + text, vfc]);
			progressCB(status, text, i18n.jsProfileRm, i18n.jsProfileRmText);
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
					alert(i18n.jsProfileErr + statusText);
					break;
				case -2:
					$jsProgess.addClass('ui-state-highlight');
					$.growlUI(i18n.jsProfileWarn, i18n.jsProfileWarnText + statusText);
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
		
		$dlgNode = $('<div>', { text: i18n.aboutProfiles });
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
		$descSave = $('<div>', { text: i18n.profileSelectLocation });
		$addNameL = $('<label>', { text: i18n.profileName }).attr({ 'for': 'mdProfileName' });
		$addName = $('<input>').attr({ id: 'mdProfileName', type: 'text', size: 40, placeholder: 'Profile name', style: 'display:block; margin-left:0.4em' }).placeholder();
		$addButtonClient = $('<button>', { text: i18n.locationBrowser })
			.button({ icons: { primary: 'ui-icon-disk' } })
			.click(saveToClient);
		$addButtonJS = $('<button>', { text: i18n.locationAccount })
			.button({ icons: { primary: 'ui-icon-script' } })
			.click(saveToJS);
		if (mw.user.isAnon()) $addButtonJS.button('option', 'disabled', true);
		$jsProgess = $('<div>', { style: 'display:inline-block; width:200px; height:25px;' });
		
		$descLoad = $('<div>', { text: i18n.loadProfileText });
		$loadButton = $('<button>', { text: i18n.loadProfile, disabled: 'disabled', style: 'display:block;' })
			.button({ icons: { primary: 'ui-icon-folder-open' } })
			.click(loadProfile);
		
		$descRemove = $('<div>', { text: i18n.removeProfileText });
		$removeButton = $('<button>', { text: i18n.removeProfile, disabled: 'disabled', style: 'display:block;' })
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
			title: i18n.profileManager,
			modal: true,
			resizable: false,
			width: Math.min(610, $win.width()),
			close: function () {
				$(this).remove();
			}
		});
		vfc.$dialogsToClose.push($dlgNode);
	},
	
	mdSuggestContinue: function () {
		var autoExecProfile = vfc.mdGetClientProfiles()['last executed (auto-saved)'],
			lookFor;

		if (!autoExecProfile || !autoExecProfile.objectMembers.startInput) return;
		lookFor = autoExecProfile.objectMembers.startInput.target;
		if (!autoExecProfile.proceedAt || !autoExecProfile.proceedAt.vals.length) return;
		
		var keyTimeout = 0;

		$doc.bind('vFC_Startup_target', function(e, text) {
			clearTimeout(keyTimeout);
			keyTimeout = setTimeout(function() {
				if ($.trim(text.replace(/_/, 'g')) === lookFor) {
					vfc.$gNotifyText.text(vfc.i18n.offerContinue + ' ');
					vfc.$gNotifyText.append( $('<a>', { href: '#', text: vfc.i18n.continueNow }).button().click(function(e) {
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
	'ext.gadget.libJQuery',
	'ext.gadget.SettingsManager',
	'ext.gadget.SettingsUI',
	'ext.gadget.jquery.blockUI'
	], function() {
	$doc.triggerHandler('scriptLoaded', ['VisualFileChange', 'configManager']);
});

}(jQuery, mediaWiki));
// </nowiki>