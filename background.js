// Rainbow Tabs: a chrome extension.
// 2014 Nagisa Day. Uses the tool color-thief by lokesh from github.

var rainbowTabs = function() {

    var colorIndexList = [];
    var colorThief = new ColorThief();

    var tabCount;
    var faviconsLoaded = 0;

    var MIN_HUE = 0;
    var MAX_HUE = 360;
    var PREFIX = "tab";

    var run = function() {
        colorIndexList.length = 0;
        faviconsLoaded = 0;
        chrome.tabs.query({ currentWindow: true }, function (tabs) {
            tabCount = tabs.length;
            tabs.forEach(function(tab) {
                findTabColor(tab);
            });
        });
    };

    var findTabColor = function(tab) {
        if(tab.favIconUrl) {
            var iconImg = document.createElement('img');
            iconImg.src = "chrome://favicon/" + tab.url;
            iconImg.onload = function() {
                var rgb = colorThief.getColor(this);
                var hue = getHueFromRgb(rgb);
//                var colors = colorThief.getPalette(this,3,5);
//                var bestHue = MAX_HUE;
//                for(var i=0; i < colors.length; i++) {
//                    var rgb = colors[i];
//                    if(bestHue == MAX_HUE) {
//                        bestHue = getHueFromRgb(rgb);
//                    }
//                }
                storeHueForTab(tab.id, hue);
//                storeHueForTab(tab.id, bestHue);
            };
        }
        else {
            storeHueForTab(tab.id, MAX_HUE);
        }
    };

    var storeHueForTab = function(tabId, hue) {
        colorIndexList[PREFIX + tabId] = hue;
        faviconsLoaded++;

        if(faviconsLoaded == tabCount) {
            reorderTabs();
        }
    };

    var reorderTabs = function() {
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
    
    return run;
};

chrome.browserAction.onClicked.addListener(rainbowTabs());
