// ==UserScript==
// @name            hitokoto.uc.js
// @description     hitokoto一句话
// @namespace       https://github.com/feiruo/userchromejs/
// @author          feiruo
// @include         chrome://browser/content/browser.xul
// @charset      	utf-8
// @version         2.1
// @note            当hitokoto不能访问的时候使用本地数据库。
// @note            每次关闭浏览器后数据库添加获取过的内容，并去重复。
// @note            左键图标复制内容，右键重新获取，中键保存并去重。
// @note            2.1 设置延迟，如果设定时间内内未获得hitokoto数据则使用本地数据库。
// ==/UserScript==
location == "chrome://browser/content/browser.xul" && (function() {

	var autotip = 0; //0为地址栏文字显示，1为自动弹出

	//如果是地址栏文字，文字长度（个数，包括标点符号），留空或0则全部显示
	SayingLong = 10;

	var autotiptime = 5000; //设置自动弹出时，多少秒后关闭弹窗

	var is_autoRefresh = true;		//是否设置自动刷新内容
	var refreshTime = 45 * 1000;	//同一页面自动刷新语录时间，需要上一选项为true才生效，默认45秒

	var Local_Delay = 2500; //毫秒， 延迟时间，时间内未取得hitokoto在线数据，则使用本地数据库
	var Local_Path = 'lib\\hitokoto.json'; //数据库文件位置

	var hitokoto_lib = false;
	var hitokoto_json = [];

	window.hitokoto = {
		isReqHash: [],
		hitokotoHash: [],

		init: function() {
			var self = this;

			hitokoto_lib = this.loadFile();

			if (hitokoto_lib)
				hitokoto_json = JSON.parse(hitokoto_lib);

			if (autotip == 0)
				this.addlabel();

			this.addIcon();
			this.onLocationChange();
			this.progressListener = {
				onLocationChange: function() {
					self.onLocationChange();
				},
				onProgressChange: function() {},
				onSecurityChange: function() {},
				onStateChange: function() {},
				onStatusChange: function() {}
			};
			window.getBrowser().addProgressListener(this.progressListener);

			window.addEventListener("unload", function() {
				hitokoto.finsh();
				hitokoto.onDestroy();
			}, false);
		},
		onDestroy: function() {
			window.getBrowser().removeProgressListener(this.progressListener);
		},
		loadFile: function() {
			var aFile = Cc["@mozilla.org/file/directory_service;1"].getService(Ci.nsIDirectoryService).QueryInterface(Ci.nsIProperties).get('UChrm', Ci.nsILocalFile);
			aFile.appendRelativePath(Local_Path);
			if (!aFile.exists() || !aFile.isFile()) return null;
			var fstream = Cc["@mozilla.org/network/file-input-stream;1"].createInstance(Ci.nsIFileInputStream);
			var sstream = Cc["@mozilla.org/scriptableinputstream;1"].createInstance(Ci.nsIScriptableInputStream);
			fstream.init(aFile, -1, 0, 0);
			sstream.init(fstream);
			var data = sstream.read(sstream.available());
			try {
				data = decodeURIComponent(escape(data));
			} catch (e) {}
			sstream.close();
			fstream.close();
			return data;
		},
		addIcon: function() {
			this.icon = $('urlbar-icons').appendChild($C('image', {
				id: 'hitokoto-icon',
				src: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAADbklEQVQ4jTWKW0ybZQBA/8Rnn40PvhgfNIsajTHenozTZMZb9MlF4+XBYGam28wWXBySMfkCImxcZMKADGqhgVK0XAstLRRKaQcUKLRQWqAttD8t/bmW9uP44DzJeTpHOcjnz0kphZRSNLjj4rW7S+JsQ0C8fHNE6G0zQspjkZNSZB8+UuZE7jAlpNwXUkqhqMf5ah5SNx7jzC037xmSvNUa5+2GAN0Pov9n8kA6k2IptkWTN40jAUpS00Q+f4Q8PeHusJ9HP2vmyctdvFlu5ePGWT6snaS0x8P1xkGe+Lwa04iN33pcvFgX5JnyWZRtTRNoEdDW+aXdyRtXdDRMbGCJZLGu57BuSIyBY+pdO1ztmOXBtJ22PgvPFVl4vzOFEt8/FKe7a2zNOen1q4wnwZUE2+Z/WiJ5rFFwxU9Y3NplL70Ch8tcqrzPmbI5FFVdEcdLI0z7Anh2wbUNjugptk1Jf+gEvW+XuskYo5FDdnbWOEj6ON3zc6P8T54vNKNoc2aRXnCwmJEs7Erc21kGw3s4onk65lUM8yrf66dp9u4yE02T14LAJj+3/MPTP5pRVLtepNNx1rIwqx5gj+1hCKiMRY+od4Xp8ie5ZJiiqHcRdyLHxPIqairM/lGCL6rMKAGHWfi1fTypHMPrGRrdMX4fC9Mb0Ljc5qKkd4mS1iEK6ocxL2cwrRxT2jUOchvIonhGTGIgnKHFl6TSuU5xl5syk5vW6TiFTUOUdE1hMhr5qeIe3VMhrFtQcN/LnR4HAMpMf7todYW52DXPN21efm3txzAwStVQAKPDzfWKJi58fZHHHn8dUdPGSALEUIiXrnWyEIujRGx6oR+Y5FyFjfOVgzgmxkmpIVrtPjZjAabdDj658RdPnb/NHx1DGINZKkbWeOFaN6X9ARTNrhOhlQAfVFh495aZ7uYavFYDCXUNUIE9+kedjI/b+XvKT+1kku90Hp69YuCCbg4ladMJkNwZnOfVIjPN99rIL9g4TQfQNnyo3lEIumDVSV2vhx+My7xzs4dhX5iKXh+K9JhEd0cfHxV38q3eR0F1Pwn/FGhBovoW9i095OPzRPyTfFkzyFe1Y1gmggD0eUIoxaU68cgrVzlb2M5ta4Qm4yxVOhvmqWmWPGNoc3aOVu14B9r5tKyHPucKZHPAKZmDE/4FfP05vqO/HLUAAAAASUVORK5CYII=',
				tooltip: 'hitokototip',
				style: 'padding: 0px 2px'
			}));

			this.icon.addEventListener("click", function(event) {
				if (event.button == 0) {
					Cc['@mozilla.org/widget/clipboardhelper;1'].createInstance(Ci.nsIClipboardHelper).copyString($("hitokotoPopupLabel").textContent);
				} else if (event.button == 1) {
					hitokoto.finsh();
				} else if (event.button == 2) {
					hitokoto.onLocationChange(true);
					event.preventDefault();
				}
			}, false);

			var xmltt = '\
        	<tooltip id="hitokototip" style="opacity: 0.8 ;color: brown ;text-shadow:0 0 3px #CCC ;background: rgba(255,255,255,0.6) ;padding-bottom:3px ;border:1px solid #BBB ;border-radius: 3px ;box-shadow:0 0 3px #444 ;">\
        	<label id="hitokotoPopupLabel" flex="1" />\
    		</tooltip>\
    		';
			var rangett = document.createRange();
			rangett.selectNodeContents($('mainPopupSet'));
			rangett.collapse(false);
			rangett.insertNode(rangett.createContextualFragment(xmltt.replace(/\n|\r/g, '')));
			rangett.detach();

			this.hitokototip = $("hitokotoPopupLabel");
			this.hitokototip.addEventListener("click", function(e) {
				if (e.button == 0) {
					$("hitokototip").hidePopup();
				} else if (e.button == 2) {
					Cc['@mozilla.org/widget/clipboardhelper;1'].createInstance(Ci.nsIClipboardHelper).copyString($("hitokotoPopupLabel").textContent);
					$("hitokototip").hidePopup();
				}
			}, false);
		},
		addlabel: function() {
			this.hitokotos = $('urlbar-icons').appendChild($C('statusbarpanel', {
				id: 'hitokoto-statusbarpanel',
				style: 'color: brown; margin: 0 0 -1px 0'
			}));
			var cssStr = ('\
			#hitokoto-statusbarpanel,#hitokoto-icon{-moz-box-ordinal-group: 0 !important;}\
			#urlbar:hover #hitokoto-statusbarpanel,#hitokoto-icon{visibility: collapse !important;}\
			#urlbar:hover #hitokoto-icon,#hitokoto-statusbarpanel{visibility: visible !important;}\
			#hitokoto-statusbarpanel{-moz-appearance: none !important;padding: 0px 0px 0px 0px !important;border: none !important;border-top: none !important;border-bottom: none !important;}\
			');
			var style = document.createProcessingInstruction('xml-stylesheet', 'type="text/css" href="data:text/css;utf-8,' + encodeURIComponent(cssStr) + '"');
			document.insertBefore(style, document.documentElement);
		},
		onLocationChange: function(forceRefresh) {
			if (forceRefresh) {
				this.forceRefresh = true;
			}
			var aLocation = window.content.document.location;
			if (aLocation && aLocation.href && !/about:blank/.test(aLocation.href)) {
				this.lookup(aLocation.href);
			}

		},
		lookup: function(host) {
			if (this.forceRefresh) {
				this.forceRefresh = false;
				this.lookup_hitokoto(host);
				return;
			}
			if (this.hitokotoHash[host]) {
				this.updateTooltipText(this.hitokotoHash[host]);
			} else {
				if (!this.isReqHash[host]) {
					this.lookup_hitokoto(host);
				}
			}
			this.isReqHash[host] = true;
		},
		lookup_hitokoto: function(host) {
			var self = this;
			var req = new XMLHttpRequest();
			req.open("GET", 'http://api.hitokoto.us/rand', true);
			req.send(null);
			var onerror = function() {
				var obj = self.locallib();
				self.hitokotoHash[host] = obj;
				self.updateTooltipText(obj);
			};
			req.onerror = onerror;
			req.timeout = Local_Delay;
			req.ontimeout = onerror;
			req.onload = function() {
				if (req.status == 200) {
					var obj;
					var responseObj = JSON.parse(req.responseText);
					hitokoto_json.push(responseObj);
					if (responseObj.source == "") {
						obj = responseObj.hitokoto;
					} else if (responseObj.source.match("《")) {
						obj = responseObj.hitokoto + '--' + responseObj.source;
					} else {
						obj = responseObj.hitokoto + '--《' + responseObj.source + '》';
					}
					self.hitokotoHash[host] = obj;
					self.updateTooltipText(obj);
				} else {
					onerror();
				}
			};
		},
		locallib: function() {
			var localjson;
			if (hitokoto_lib) {
				var responseObj = hitokoto_json[Math.floor(Math.random() * hitokoto_json.length)];
				if (responseObj.source == "") {
					localjson = responseObj.hitokoto;
				} else if (responseObj.source.match("《")) {
					localjson = responseObj.hitokoto + '--' + responseObj.source;
				} else {
					localjson = responseObj.hitokoto + '--《' + responseObj.source + '》';
				}
				return localjson;
			} else {
				return localjson = "hitokoto无法访问";
			}			
		},
		updateTooltipText: function(val) {
			if (SayingLong && SayingLong !== 0 && val.length > SayingLong) {
				urlval = val.substr(0, SayingLong) + '.....';
			} else {
				urlval = val;
			}

			if (autotip == 0) this.hitokotos.label = urlval;
			else {
				var popup = $("hitokototip");
				if (this.timer) clearTimeout(this.timer);
				if (typeof popup.openPopup != 'undefined') popup.openPopup(this.icon, "overlap", 0, 0, true, false);
				else popup.showPopup(this.icon, -1, -1, "popup", null, null);
				this.timer = setTimeout(function() {
					popup.hidePopup();
				}, autotiptime);
			}
			var label = $("hitokotoPopupLabel");
			while (label.firstChild) {
				label.removeChild(label.firstChild);
			}
			if (val != "") label.appendChild(document.createTextNode(val));
		},
		finsh: function() {
			var hitokotolibs = {};
			var newInfo = [];
			hitokoto_json.forEach(function(i) {
				if (!hitokotolibs[i.hitokoto]) {
					hitokotolibs[i.hitokoto] = true;
					newInfo.push(i);
				}
			});
			this.saveFile(Local_Path, JSON.stringify(newInfo));
		},
		saveFile: function(name, data) {
			var file;
			if (typeof name == "string") {
				var file = Services.dirsvc.get('UChrm', Ci.nsILocalFile);
				file.appendRelativePath(name);
			} else {
				file = name;
			}

			var suConverter = Cc["@mozilla.org/intl/scriptableunicodeconverter"].createInstance(Ci.nsIScriptableUnicodeConverter);
			suConverter.charset = 'UTF-8';
			data = suConverter.ConvertFromUnicode(data);

			var foStream = Cc['@mozilla.org/network/file-output-stream;1'].createInstance(Ci.nsIFileOutputStream);
			foStream.init(file, 0x02 | 0x08 | 0x20, 0664, 0);
			foStream.write(data, data.length);
			foStream.close();
		},
	};

	hitokoto.init();

	//自动刷新
	if(is_autoRefresh === true){
		(function autoRefresh(time){
			setTimeout(function(){
					hitokoto.onLocationChange(true);
					autoRefresh(time);
				},time);
		})(refreshTime);
	}

	function $(id) document.getElementById(id);

	function $C(name, attr) {
		var el = document.createElement(name);
		if (attr) Object.keys(attr).forEach(function(n) el.setAttribute(n, attr[n]));
		return el;
	}
})()