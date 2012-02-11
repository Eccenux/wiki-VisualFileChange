// Main script is at MediaWiki:VisualFileChange.js
// These are the delayed loaded configuration components (user's custom config) in order to speed up loading of the first UI

/*global jQuery:false, mediaWiki:false */
/*jshint curly:false,*/
(function ($, mw) {
'use strict';

// Return if Main Script is not loaded
if (!window.VisualFileChange) return;
// Return if this script is already loaded
if (window.VisualFileChange.ConfigManager) return;

mw.util.addCSS( ' .vFCConfigRequired { visibility:visible !important; }\n' );

$.extend(window.VisualFileChange,
{
	ConfigManager: true,
	
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
					if (el.select) {
						$elDiv.append(el.select().attr('id', 'mdCfg' + el.v).val(vl));
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
				o.mdSaveSettings(cfg, $dlgNode);
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
			width: Math.min(550, $(window).width()),
			close: function () {
				$(this).remove();
			},
			buttons: dlgButtons
		});
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
	
	mdSaveSettings: function (cfg, $dlgNode) {
		var o = this;
		var scriptpath = mw.config.get('wgFormattedNamespaces')[2] + ':' + mw.config.get('wgUserName').replace(/ /g, '_') + '/';
		var commonjsPath = scriptpath + 'common.js';
		var skinjsPath = scriptpath + mw.config.get('skin') + '.js';
		
		var skinjs, commonjs, skinjsN, commonjsN;
		
		$dlgNode.children().remove();
		$dlgNode.dialog('option', 'buttons', {});
		
		$(document).bind('vFC_S', function(e, p1, p2, p3, p4) {
			$dlgNode.append($('<div>', { style: 'font-size:80%', text: '>' + (new Date().toLocaleString()) }));
			if (p4) {
				$dlgNode.append($('<div>', { text: ' ' + p1, 'class': p4 }));
			} else {
				$dlgNode.append($('<div>', { text: '(i): ' + p1 }));
			}
			$(document).triggerHandler('vFC', ['Settings', p2, p1]);
		});
		$(document).triggerHandler('vFC_S', ['Initializing', this]);
		
		var removeOldConfig = function(text, jsPath) {
			if (!text) return text;
			// Remove the configuration block
			text = text.replace(/\n?\n?\/\/vFCvFCCfg(?:.|\n)+vFCvFCCfgEnd\/\//g, '');
			// Remove old variables: We assume that the user did not use multiple lines... sorry
			$.each(cfg, function(i, el) {
				if (el.old) {
					var rx = new RegExp('[\\t ]*(?:var\\s+|window.)' + $.escapeRE(el.old) + '\\s*\\=.+', 'g'),
						rxN = new RegExp('[\\t ]*(?:var\\s+|window.)' + $.escapeRE(el.old) + '\\s*\\=.+(?:\\n\\s*)?\\+');
					if (rxN.test(text)) {
						$(document).triggerHandler('vFC_S', ['WARNING: Could not remove ' + el.old + ' from ' + jsPath, o, el, 'md-attention']);
						return;
					}
					text = text.replace(rx, '');
				}
			});
			return text;
		};
		
		var vFCBanner = '//vFCvFCCfg/////////////////////////////////////\n' +
						'/////// VISUAL FILE CHANGE CONFIGURATION ///////\n' +
						'///// DO NOT MODIFY BY HAND - FINGERS AWAY! ////\n' +
						'////////////////////////////////////////////////\n';
		var vFCBannerEnd = '//////////////////////////////////vFCvFCCfgEnd//';
						
		
		var buildNewCfg = function() {
			return '\n\n' + vFCBanner + 'window.vFCSettings = ' + $.toJSON(o.mdSettings) + '; \n' + vFCBannerEnd;
		};
		
		var gotJS = function(res, jsFile) {
			if (commonjsPath === jsFile) {
				commonjsN = commonjs = res;
			} else {
				skinjsN = skinjs = res;
			}
			$(document).triggerHandler('vFC_S', ['Server returned ' + jsFile + '. ' + ($.trim(res) ? ('Size: ' + res.length) + ' chars.' : 'It is empty.'), o]);
			if ('string' !== typeof skinjs || 'string' !== typeof commonjs) return;
			
			// So we got all the code we need.
			$(document).triggerHandler('vFC_S', ['Removing old configuration from your custom JavaScript configuration files', o]);
			skinjs = removeOldConfig(skinjs, skinjsPath);
			commonjs = removeOldConfig(commonjs, commonjsPath);
			
			if (skinjs === skinjsN) {
				$(document).triggerHandler('vFC_S', ['Adding new configuration to ' + commonjsPath, o]);
				commonjs += buildNewCfg();
			} else {
				$(document).triggerHandler('vFC_S', ['Adding new configuration to ' + skinjsPath, o]);
				skinjs += buildNewCfg();
			}
			var page = {
				title: '',
				text: '',
				watchlist: 'nochange',
				editType: 'text'
			};
			o.settingSaves = 0;
			if (skinjs !== skinjsN) {
				page.title = skinjsPath;
				page.text = skinjs;
				$(document).triggerHandler('vFC_S', ['Saving ' + skinjsPath, o]);
				o.mdSavePage(page, '[[' + o.mdSelfPath + '|VisualFileChange.js]] is updating configuration', 'mdSaveSettingsCB', 'mdSaveSettingsCB');
				o.settingSaves++;
			}
			if (commonjs !== commonjsN) {
				page.title = commonjsPath;
				page.text = commonjs;
				$(document).triggerHandler('vFC_S', ['Saving ' + commonjsPath, o]);
				o.settingSaves++;
				o.mdSavePage(page, '[[' + o.mdSelfPath + '|VisualFileChange.js]] is updating configuration', 'mdSaveSettingsCB', 'mdSaveSettingsCB');
			}
			if (0 === o.settingSaves) $(document).triggerHandler('vFC_S', ['Nothing to change. You can close this dialog now.', o, '', 'md-done']);
		};
		
		var getJS = function(jsfile) {
			$.ajax({
				url: mw.config.get('wgScript'),
				data: { 'action': 'raw', title: jsfile, maxage: 0, smaxage: 0 },
				dataType: 'text',
				error: function(x, status, error) {
					if ('Not Found' === error) {
						gotJS('', jsfile);
						return;
					}
					if (x && 404 === x.status) {
						gotJS('', jsfile);
						return;
					}
					o.fail(o.i18n.mdConfig.getScriptErr);
					$(document).triggerHandler('vFC_S', [o.i18n.mdConfig.getScriptErr, this, error, 'md-failed']);
				},
				success: function(res) {
					gotJS(res, jsfile);
				},
				type: 'GET',
				cache: false
			});
		};
		getJS(commonjsPath);
		getJS(skinjsPath);
		$(document).triggerHandler('vFC_S', ['Loading your custom JavaScript configuration files', this]);
	},
	
	mdSaveSettingsCB: function (result, query, err) {
		this.settingSaves--;
		var pgTitle = (result.requestid || query.title);
		if (err) {
			$(document).triggerHandler('vFC_S', ['Updated ' + pgTitle + ' failded. ERROR: ' + err, this, err, 'md-failed']);
		} else {
			$(document).triggerHandler('vFC_S', [pgTitle + ' successfully updated', this, result, 'md-done']);
		}
		if (0 === this.settingSaves) {
			$(document).triggerHandler('vFC_S', ['Ready. You can close this dialog now.', this]);
		}
	},
	
	mdProfile: function () {
		var o = this,
			oldClientConfig,
			profileVar = 'vFC_Profiles',
			$dlgNode, $profileSelect, $descSave, $addNameL, $addName, $addButtonCookie, $addButtonJS, $descLoad, $loadButton, $cmdSection;

		var loadProfile = function() {
			
		};
		var loadStore = function() {
			return $.jStorage.get(profileVar, {});
		};
		var updateSelect = function() {
			var store = loadStore();
			$profileSelect.text('');
			$.each(store, function(profileName, profileContent) {
				$profileSelect.append($('<option>', { text: profileName + ' (browser)' }).data('profileSource', 'client'));
			});
		};
		var testSaveInfo = function() {
			if (!$addName.val()) {
				$addName.css('background-color', '#FCC');
				setTimeout(function() {
					$addName.css('background-color', '');
				}, 1500);
				return false;
			}
			if (!o.$mdControls) return;
			return true;
		};
		var saveToClient = function() {
			if (!testSaveInfo()) return;
			var newConfigItem = {};
			oldClientConfig = loadStore();
			o.$mdControls.find('input').each(function(i, el) {
				var $el = $(el),
					$elId = $el.attr('id');
				if (!$elId) return;
				newConfigItem[$elId] = $el.val();
			});
			oldClientConfig[$addName.val()] = newConfigItem;
			$.jStorage.set(profileVar, oldClientConfig);
			updateSelect();
			$addName.val('');
		};
		var removeFromClient = function(what) {
			oldClientConfig = loadStore();
			var newConfig = {};
			$.each(oldClientConfig, function(profileName, profileContent) {
				if (profileName !== what) {
					newConfig[profileName] = profileContent;
				}
			});
			$.jStorage.set(profileVar, newConfig);
			updateSelect();
			$addName.val('');
		};
		var saveToJS = function() {
			if (!testSaveInfo()) return;
		};
		
		//o.$mdControls.find('input#' + id).val(val)
		
		$dlgNode = $('<div>', { text: 'Save the current input state into a profile or load a profile.' });
		$profileSelect = $('<select>', { size: 15, style: 'min-width:150px' }).change(function() {
			var $sel = $profileSelect,
				$selVal = $sel.val() || '';
			$addName.val($selVal.replace(/ \(.+\)$/, ''));
			$sel.data('selectedProfile', $sel.children().eq($sel[0].selectedIndex));
			$sel.data('selectedProfileName', $selVal.replace(/ \(.+\)$/, ''));
			$loadButton.button( "option", "disabled", !$selVal );
			$removeButton.button( "option", "disabled", !$selVal );
		});
		$descSave = $('<div>', { text: 'Save current inputs into your' });
		$addNameL = $('<label>', { 'for': 'mdProfileName', text: 'Use the same name again to override a profile.' });
		$addName = $('<input>', { id: 'mdProfileName', type: 'text', size: 40, placeholder: 'Profile name', style: 'display:block;' }).placeholder();
		$addButtonCookie = $('<button>', { text: 'Browser'}).click(saveToClient);
		$addButtonJS = $('<button>', { text: 'Commons-account', disabled: 'disabled' }).click(saveToJS);
		
		$descLoad = $('<div>', { text: 'Load a profile. Caution: Your current inputs will be lost.' });
		$loadButton = $('<button>', { text: 'Load', disabled: 'disabled' }).click(loadProfile);
		
		$descRemove = $('<div>', { text: 'Remove a profile.' });
		$removeButton = $('<button>', { text: 'Remove', disabled: 'disabled' }).click(function() {
console.log($profileSelect.data('selectedProfile').data('profileSource'))
			if ('client' === $profileSelect.data('selectedProfile').data('profileSource')) {
				removeFromClient($profileSelect.data('selectedProfileName'));
			}
		});
		
		$cmdSection = $('<div>', { style: 'display:inline-block; margin:4px;' }).append($addNameL, $addName, $descSave, $addButtonCookie, $addButtonJS, $descLoad, $loadButton, $descRemove, $removeButton);
		
		$dlgNode.append($('<br>'), $profileSelect, $cmdSection);
		
		updateSelect();
		
		$dlgNode.dialog({
			title: 'Profile manager',
			modal: true,
			resizable: false,
			width: Math.min(550, $(window).width()),
			close: function () {
				$(this).remove();
			}
		});
		
		$('div.ui-dialog-content').find('button').button();
	},
	
	mdConfigInstall: function () {
		var o = this;
		this.pb.$cfg.click(function(e) {
			e.preventDefault();
			o.mdSecureCall('mdConfig');
		});
		this.pb.$profile.click(function(e) {
			e.preventDefault();
			o.mdSecureCall('mdProfile');
		});
	}
});


mw.loader.using(['jquery.ui.dialog', 'jquery.ui.slider', 'jquery.ui.button', 'jquery.cookie', 'jquery.placeholder', 'mediawiki.user'], function() {
	$(document).triggerHandler('scriptLoaded', ['VisualFileChange', 'ConfigManager']);
	window.VisualFileChange.mdConfigInstall();
});

}(jQuery, mediaWiki));


/**
 * jQuery JSON Plugin
 * version: 2.3 (2011-09-17)
 *
 * This document is licensed as free software under the terms of the
 * MIT License: http://www.opensource.org/licenses/mit-license.php
 *
 * Brantley Harris wrote this plugin. It is based somewhat on the JSON.org
 * website's http://www.json.org/json2.js, which proclaims:
 * "NO WARRANTY EXPRESSED OR IMPLIED. USE AT YOUR OWN RISK.", a sentiment that
 * I uphold.
 *
 * It is also influenced heavily by MochiKit's serializeJSON, which is
 * copyrighted 2005 by Bob Ippolito.
 */

(function( $ ) {
	/*jshint evil:true, laxbreak:true, smarttabs:true,*/
	'use strict';
	var	escapeable = /["\\\x00-\x1f\x7f-\x9f]/g,
		meta = {
			'\b': '\\b',
			'\t': '\\t',
			'\n': '\\n',
			'\f': '\\f',
			'\r': '\\r',
			'"' : '\\"',
			'\\': '\\\\'
		};

	/**
	 * jQuery.toJSON
	 * Converts the given argument into a JSON respresentation.
	 *
	 * @param o {Mixed} The json-serializble *thing* to be converted
	 *
	 * If an object has a toJSON prototype, that will be used to get the representation.
	 * Non-integer/string keys are skipped in the object, as are keys that point to a
	 * function.
	 *
	 */
	$.toJSON = typeof JSON === 'object' && JSON.stringify
		? JSON.stringify
		: function( o ) {
		/*jshint forin:false*/

		if ( o === null ) {
			return 'null';
		}

		var type = typeof o;

		if ( type === 'undefined' ) {
			return undefined;
		}
		if ( type === 'number' || type === 'boolean' ) {
			return '' + o;
		}
		if ( type === 'string') {
			return $.quoteString( o );
		}
		if ( type === 'object' ) {
			if ( typeof o.toJSON === 'function' ) {
				return $.toJSON( o.toJSON() );
			}
			if ( o.constructor === Date ) {
				var	month = o.getUTCMonth() + 1,
					day = o.getUTCDate(),
					year = o.getUTCFullYear(),
					hours = o.getUTCHours(),
					minutes = o.getUTCMinutes(),
					seconds = o.getUTCSeconds(),
					milli = o.getUTCMilliseconds();

				if ( month < 10 ) {
					month = '0' + month;
				}
				if ( day < 10 ) {
					day = '0' + day;
				}
				if ( hours < 10 ) {
					hours = '0' + hours;
				}
				if ( minutes < 10 ) {
					minutes = '0' + minutes;
				}
				if ( seconds < 10 ) {
					seconds = '0' + seconds;
				}
				if ( milli < 100 ) {
					milli = '0' + milli;
				}
				if ( milli < 10 ) {
					milli = '0' + milli;
				}
				return '"' + year + '-' + month + '-' + day + 'T' +
					hours + ':' + minutes + ':' + seconds +
					'.' + milli + 'Z"';
			}
			if ( o.constructor === Array ) {
				var ret = [];
				for ( var i = 0; i < o.length; i++ ) {
					ret.push( $.toJSON( o[i] ) || 'null' );
				}
				return '[' + ret.join(',') + ']';
			}
			var	name,
				val,
				pairs = [];
			for ( var k in o ) {
				type = typeof k;
				if ( type === 'number' ) {
					name = '"' + k + '"';
				} else if (type === 'string') {
					name = $.quoteString(k);
				} else {
					// Keys must be numerical or string. Skip others
					continue;
				}
				type = typeof o[k];

				if ( type === 'function' || type === 'undefined' ) {
					// Invalid values like these return undefined
					// from toJSON, however those object members
					// shouldn't be included in the JSON string at all.
					continue;
				}
				val = $.toJSON( o[k] );
				pairs.push( name + ':' + val );
			}
			return '{' + pairs.join( ',' ) + '}';
		}
	};

	/**
	 * jQuery.evalJSON
	 * Evaluates a given piece of json source.
	 *
	 * @param src {String}
	 */
	$.evalJSON = typeof JSON === 'object' && JSON.parse
		? JSON.parse
		: function( src ) {
		return eval('(' + src + ')');
	};

	/**
	 * jQuery.secureEvalJSON
	 * Evals JSON in a way that is *more* secure.
	 *
	 * @param src {String}
	 */
	$.secureEvalJSON = typeof JSON === 'object' && JSON.parse
		? JSON.parse
		: function( src ) {

		var filtered = 
			src
			.replace( /\\["\\\/bfnrtu]/g, '@' )
			.replace( /"[^"\\\n\r]*"|true|false|null|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?/g, ']')
			.replace( /(?:^|:|,)(?:\s*\[)+/g, '');

		if ( /^[\],:{}\s]*$/.test( filtered ) ) {
			return eval( '(' + src + ')' );
		} else {
			throw new SyntaxError( 'Error parsing JSON, source is not valid.' );
		}
	};

	/**
	 * jQuery.quoteString
	 * Returns a string-repr of a string, escaping quotes intelligently.
	 * Mostly a support function for toJSON.
	 * Examples:
	 * >>> jQuery.quoteString('apple')
	 * "apple"
	 *
	 * >>> jQuery.quoteString('"Where are we going?", she asked.')
	 * "\"Where are we going?\", she asked."
	 */
	$.quoteString = function( string ) {
		if ( string.match( escapeable ) ) {
			return '"' + string.replace( escapeable, function( a ) {
				var c = meta[a];
				if ( typeof c === 'string' ) {
					return c;
				}
				c = a.charCodeAt();
				return '\\u00' + Math.floor(c / 16).toString(16) + (c % 16).toString(16);
			}) + '"';
		}
		return '"' + string + '"';
	};

})( jQuery );



/* Modified: removed xml-support
 * ----------------------------- JSTORAGE -------------------------------------
 * Simple local storage wrapper to save data on the browser side, supporting
 * all major browsers - IE6+, Firefox2+, Safari4+, Chrome4+ and Opera 10.5+
 *
 * Copyright (c) 2010 Andris Reinman, andris.reinman@gmail.com
 * Project homepage: www.jstorage.info
 *
 * Licensed under MIT-style license:
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */

/**
 * $.jStorage
 *
 * USAGE:
 *
 * jStorage requires Prototype, MooTools or jQuery! If jQuery is used, then
 * jQuery-JSON (http://code.google.com/p/jquery-json/) is also needed.
 * (jQuery-JSON needs to be loaded BEFORE jStorage!)
 *
 * Methods:
 *
 * -set(key, value)
 * $.jStorage.set(key, value) -> saves a value
 *
 * -get(key[, default])
 * value = $.jStorage.get(key [, default]) ->
 *    retrieves value if key exists, or default if it doesn't
 *
 * -deleteKey(key)
 * $.jStorage.deleteKey(key) -> removes a key from the storage
 *
 * -flush()
 * $.jStorage.flush() -> clears the cache
 *
 * -storageObj()
 * $.jStorage.storageObj() -> returns a read-ony copy of the actual storage
 *
 * -storageSize()
 * $.jStorage.storageSize() -> returns the size of the storage in bytes
 *
 * -index()
 * $.jStorage.index() -> returns the used keys as an array
 *
 * -storageAvailable()
 * $.jStorage.storageAvailable() -> returns true if storage is available
 *
 * -reInit()
 * $.jStorage.reInit() -> reloads the data from browser storage
 *
 * <value> can be any JSON-able value, including objects and arrays.
 *
 **/

(function($){
    if(!$ || !($.toJSON || Object.toJSON || window.JSON)){
        throw new Error("jQuery, MooTools or Prototype needs to be loaded before jStorage!");
    }

    var
        /* This is the object, that holds the cached values */
        _storage = {},

        /* Actual browser storage (localStorage or globalStorage['domain']) */
        _storage_service = {jStorage:"{}"},

        /* DOM element for older IE versions, holds userData behavior */
        _storage_elm = null,

        /* How much space does the storage take */
        _storage_size = 0,

        /* function to encode objects to JSON strings */
        json_encode = $.toJSON || Object.toJSON || (window.JSON && (JSON.encode || JSON.stringify)),

        /* function to decode objects from JSON strings */
        json_decode = $.evalJSON || (window.JSON && (JSON.decode || JSON.parse)) || function(str){
            return String(str).evalJSON();
        },

        /* which backend is currently used */
        _backend = false,

        /* Next check for TTL */
        _ttl_timeout;
		 
		// Rillke: _XMLService removed

    ////////////////////////// PRIVATE METHODS ////////////////////////

    /**
     * Initialization function. Detects if the browser supports DOM Storage
     * or userData behavior and behaves accordingly.
     * @returns undefined
     */
    function _init(){
        /* Check if browser supports localStorage */
        var localStorageReallyWorks = false;
        if("localStorage" in window){
            try {
                window.localStorage.setItem('_tmptest', 'tmpval');
                localStorageReallyWorks = true;
                window.localStorage.removeItem('_tmptest');
            } catch(BogusQuotaExceededErrorOnIos5) {
                // Thanks be to iOS5 Private Browsing mode which throws
                // QUOTA_EXCEEDED_ERRROR DOM Exception 22.
            }
        }
        if(localStorageReallyWorks){
            try {
                if(window.localStorage) {
                    _storage_service = window.localStorage;
                    _backend = "localStorage";
                }
            } catch(E3) {/* Firefox fails when touching localStorage and cookies are disabled */}
        }
        /* Check if browser supports globalStorage */
        else if("globalStorage" in window){
            try {
                if(window.globalStorage) {
                    _storage_service = window.globalStorage[window.location.hostname];
                    _backend = "globalStorage";
                }
            } catch(E4) {/* Firefox fails when touching localStorage and cookies are disabled */}
        }
        /* Check if browser supports userData behavior */
        else {
            _storage_elm = document.createElement('link');
            if(_storage_elm.addBehavior){

                /* Use a DOM element to act as userData storage */
                _storage_elm.style.behavior = 'url(#default#userData)';

                /* userData element needs to be inserted into the DOM! */
                document.getElementsByTagName('head')[0].appendChild(_storage_elm);

                _storage_elm.load("jStorage");
                var data = "{}";
                try{
                    data = _storage_elm.getAttribute("jStorage");
                }catch(E5){}
                _storage_service.jStorage = data;
                _backend = "userDataBehavior";
            }else{
                _storage_elm = null;
                return;
            }
        }

        _load_storage();

        // remove dead keys
        _handleTTL();
    }

    /**
     * Loads the data from the storage based on the supported mechanism
     * @returns undefined
     */
    function _load_storage(){
        /* if jStorage string is retrieved, then decode it */
        if(_storage_service.jStorage){
            try{
                _storage = json_decode(String(_storage_service.jStorage));
            }catch(E6){_storage_service.jStorage = "{}";}
        }else{
            _storage_service.jStorage = "{}";
        }
        _storage_size = _storage_service.jStorage?String(_storage_service.jStorage).length:0;
    }

    /**
     * This functions provides the "save" mechanism to store the jStorage object
     * @returns undefined
     */
    function _save(){
        try{
            _storage_service.jStorage = json_encode(_storage);
            // If userData is used as the storage engine, additional
            if(_storage_elm) {
                _storage_elm.setAttribute("jStorage",_storage_service.jStorage);
                _storage_elm.save("jStorage");
            }
            _storage_size = _storage_service.jStorage?String(_storage_service.jStorage).length:0;
        }catch(E7){/* probably cache is full, nothing is saved this way*/}
    }

    /**
     * Function checks if a key is set and is string or numeric
     */
    function _checkKey(key){
        if(!key || (typeof key != "string" && typeof key != "number")){
            throw new TypeError('Key name must be string or numeric');
        }
        if(key == "__jstorage_meta"){
            throw new TypeError('Reserved key name');
        }
        return true;
    }

    /**
     * Removes expired keys
     */
    function _handleTTL(){
        var curtime, i, TTL, nextExpire = Infinity, changed = false;

        clearTimeout(_ttl_timeout);

        if(!_storage.__jstorage_meta || typeof _storage.__jstorage_meta.TTL != "object"){
            // nothing to do here
            return;
        }

        curtime = +new Date();
        TTL = _storage.__jstorage_meta.TTL;
        for(i in TTL){
            if(TTL.hasOwnProperty(i)){
                if(TTL[i] <= curtime){
                    delete TTL[i];
                    delete _storage[i];
                    changed = true;
                }else if(TTL[i] < nextExpire){
                    nextExpire = TTL[i];
                }
            }
        }

        // set next check
        if(nextExpire != Infinity){
            _ttl_timeout = setTimeout(_handleTTL, nextExpire - curtime);
        }

        // save changes
        if(changed){
            _save();
        }
    }

    ////////////////////////// PUBLIC INTERFACE /////////////////////////

    $.jStorage = {
        /* Version number */
        version: "0.1.6.1",

        /**
         * Sets a key's value.
         *
         * @param {String} key - Key to set. If this value is not set or not
         *              a string an exception is raised.
         * @param value - Value to set. This can be any value that is JSON
         *              compatible (Numbers, Strings, Objects etc.).
         * @returns the used value
         */
        set: function(key, value){
            _checkKey(key);
            if(typeof value == "function"){
                value = null; // functions can't be saved!
            }else if(value && typeof value == "object"){
                // clone the object before saving to _storage tree
                value = json_decode(json_encode(value));
            }
            _storage[key] = value;
            _save();
            return value;
        },

        /**
         * Looks up a key in cache
         *
         * @param {String} key - Key to look up.
         * @param {mixed} def - Default value to return, if key didn't exist.
         * @returns the key value, default value or <null>
         */
        get: function(key, def){
            _checkKey(key);
            if(key in _storage){
				return _storage[key];
            }
            return typeof(def) == 'undefined' ? null : def;
        },

        /**
         * Deletes a key from cache.
         *
         * @param {String} key - Key to delete.
         * @returns true if key existed or false if it didn't
         */
        deleteKey: function(key){
            _checkKey(key);
            if(key in _storage){
                delete _storage[key];
                // remove from TTL list
                if(_storage.__jstorage_meta &&
                  typeof _storage.__jstorage_meta.TTL == "object" &&
                  key in _storage.__jstorage_meta.TTL){
                    delete _storage.__jstorage_meta.TTL[key];
                }
                _save();
                return true;
            }
            return false;
        },

        /**
         * Sets a TTL for a key, or remove it if ttl value is 0 or below
         *
         * @param {String} key - key to set the TTL for
         * @param {Number} ttl - TTL timeout in milliseconds
         * @returns true if key existed or false if it didn't
         */
        setTTL: function(key, ttl){
            var curtime = +new Date();
            _checkKey(key);
            ttl = Number(ttl) || 0;
            if(key in _storage){

                if(!_storage.__jstorage_meta){
                    _storage.__jstorage_meta = {};
                }
                if(!_storage.__jstorage_meta.TTL){
                    _storage.__jstorage_meta.TTL = {};
                }

                // Set TTL value for the key
                if(ttl>0){
                    _storage.__jstorage_meta.TTL[key] = curtime + ttl;
                }else{
                    delete _storage.__jstorage_meta.TTL[key];
                }

                _save();

                _handleTTL();
                return true;
            }
            return false;
        },

        /**
         * Deletes everything in cache.
         *
         * @return true
         */
        flush: function(){
            _storage = {};
            _save();
            return true;
        },

        /**
         * Returns a read-only copy of _storage
         *
         * @returns Object
        */
        storageObj: function(){
            function F() {}
            F.prototype = _storage;
            return new F();
        },

        /**
         * Returns an index of all used keys as an array
         * ['key1', 'key2',..'keyN']
         *
         * @returns Array
        */
        index: function(){
            var index = [], i;
            for(i in _storage){
                if(_storage.hasOwnProperty(i) && i != "__jstorage_meta"){
                    index.push(i);
                }
            }
            return index;
        },

        /**
         * How much space in bytes does the storage take?
         *
         * @returns Number
         */
        storageSize: function(){
            return _storage_size;
        },

        /**
         * Which backend is currently in use?
         *
         * @returns String
         */
        currentBackend: function(){
            return _backend;
        },

        /**
         * Test if storage is available
         *
         * @returns Boolean
         */
        storageAvailable: function(){
            return !!_backend;
        },

        /**
         * Reloads the data from browser storage
         *
         * @returns undefined
         */
        reInit: function(){
            var new_storage_elm, data;
            if(_storage_elm && _storage_elm.addBehavior){
                new_storage_elm = document.createElement('link');

                _storage_elm.parentNode.replaceChild(new_storage_elm, _storage_elm);
                _storage_elm = new_storage_elm;

                /* Use a DOM element to act as userData storage */
                _storage_elm.style.behavior = 'url(#default#userData)';

                /* userData element needs to be inserted into the DOM! */
                document.getElementsByTagName('head')[0].appendChild(_storage_elm);

                _storage_elm.load("jStorage");
                data = "{}";
                try{
                    data = _storage_elm.getAttribute("jStorage");
                }catch(E5){}
                _storage_service.jStorage = data;
                _backend = "userDataBehavior";
            }

            _load_storage();
        }
    };

    // Initialize jStorage
    _init();

})(window.jQuery);