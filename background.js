// Rainbow Tabs: a chrome extension.
// 2014 Nagisa Day. Uses the tool color-thief by lokesh from github.

var global;

var rainbowTabs = (function() {

    var allTabs = [];
    var colorIndexList = [];
    var colorThief = new ColorThief();

    var tabCount;
    var faviconsLoaded = 0;

    var MIN_HUE = 0;
    var MAX_HUE = 360;
    var PREFIX = "tab";

    var rainbowSort = function(tabs) {
        tabs.forEach(function(tab) {
            getColorIndexForTab(tab);
        });
    };

    var getColorIndexForTab = function(tab) {
        if(tab.favIconUrl) {
            var iconImg = document.createElement('img');
            iconImg.src = "chrome://favicon/" + tab.url;
            iconImg.onload = function() {
                var rgb = colorThief.getColor(this);
                var hue = getHueFromRgb(rgb);
                insertHueIntoColorIndexList(tab.id, hue);
            };
        }
        else {
            insertHueIntoColorIndexList(tab.id, MAX_HUE);
        }
    };

    var insertHueIntoColorIndexList = function(tabId, hue) {
        colorIndexList[PREFIX + tabId] = hue;
        faviconsLoaded++;

        if(faviconsLoaded == tabCount) {
            continueRainbowSort();
        }
    };

    var continueRainbowSort = function() {
        var newPosition = 0;

        bySortedValue(colorIndexList, function(key,value) {
            var tabId = parseInt(key.substr(PREFIX.length));
            chrome.tabs.move(tabId,{index: newPosition++});
        });
    };


    // http://www.rapidtables.com/convert/color/rgb-to-hsv.htm
    var getHueFromRgb = function(rgb) {
        var r = rgb[0] / 255;
        var g = rgb[1] / 255;
        var b = rgb[2] / 255;
        var cmax = Math.max(r,g,b);
        var cmin = Math.min(r,g,b);
        var delta = cmax - cmin;
        if (delta == 0) return MAX_HUE;

        switch(cmax) {
            case r: return 60 * (((g - b)/delta) % 6);
            case g: return 60 * (((b - r)/delta) + 2);
            case b: return 60 * (((r - g)/delta) + 4);
        }
    };

    // http://stackoverflow.com/a/5200010
    var bySortedValue = function(obj, callback, context) {
        var tuples = [];

        for (var key in obj) tuples.push([key, obj[key]]);

        tuples.sort(function(a, b) {
            return a[1] < b[1] ? 1 : a[1] > b[1] ? -1 : 0
        });

        var length = tuples.length;
        while (length--) callback.call(context, tuples[length][0], tuples[length][1]);
    };
    
    return function() {
        var _tabs;
        var _faviconURLs;

        return {
            run: function() {
                chrome.tabs.query({ currentWindow: true }, function (tabs) {
                    allTabs = tabs;
                    tabCount = tabs.length;
                    rainbowSort(tabs);
                });
            }
        }
    };
})();

var instance = rainbowTabs();
chrome.browserAction.onClicked.addListener(instance.run);
