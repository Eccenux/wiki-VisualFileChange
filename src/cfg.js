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


$.extend(window.VisualFileChange,
{
	ConfigManager: true,
	
	mdConfig: function () {
		var o = this,
			cfg = this.mdDefaults,
			$dlgNode = $('<div>');
		
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
				case 'bool':
					$valEl = $('<input>', { type: 'checkbox', id: 'mdCfg' + el.v }).appendTo($elDiv);
					if (vl) $valEl[0].attr('checked', 'checked');
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
			width: Math.min(500, $(window).width()),
			close: function () {
				$(this).remove();
			},
			buttons: dlgButtons
		});
	},
	
	mdPublishSettings: function(dlgNode, cfg) {
		var o = this;
		$.each(cfg, function(i, el) {
			var val = $('#mdCfg'+el.v).val();
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
				$dlgNode.append($('<div>', { text: ' ' + p1 }).prepend($('<img>', { src: o[p4], height: 16, width: 16, alt: '(i): ' })));
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
						$(document).triggerHandler('vFC_S', ['WARNING: Could not remove ' + el.old + ' from ' + jsPath, o, el, 'mdFailedTaskIcon']);
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
			if (0 === o.settingSaves) $(document).triggerHandler('vFC_S', ['Nothing to change. You can close this dialog now.', o, '', 'mdDoneTaskIcon']);
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
					$(document).triggerHandler('vFC_S', [o.i18n.mdConfig.getScriptErr, this, error, 'mdFailedTaskIcon']);
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
			$(document).triggerHandler('vFC_S', ['Updated ' + pgTitle + ' failded. ERROR: ' + err, this, err, 'mdFailedTaskIcon']);
		} else {
			$(document).triggerHandler('vFC_S', [pgTitle + ' successfully updated', this, result, 'mdDoneTaskIcon']);
		}
		if (0 === this.settingSaves) {
			$(document).triggerHandler('vFC_S', ['Ready. You can close this dialog now.', this]);
		}
	},
	
	mdConfigInstall: function () {
		var o = this;
		this.pb.$cfg.click(function(e) {
			e.preventDefault();
			o.mdSecureCall('mdConfig');
		}).show();
	}
});


mw.loader.using(['jquery.ui.dialog', 'jquery.ui.slider', 'mediawiki.user'], function() {
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