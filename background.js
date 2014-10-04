// Rainbow Tabs: a chrome extension.
// 2014 Nagisa Day. Uses the tool color-thief by lokesh from github.

var rainbowTabs = function() {

    var colorIndexList = [];
    var colorThief = new ColorThief();

    var tabCount;
    var faviconsLoaded = 0;

    var MIN_SAT = 0;
    var MAX_HUE = 360;
    var PREFIX = "tab";

    var DEBUG = 0;

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

    var log = function(msg, hexcolor) {
        if(DEBUG == 1){
            if(hexcolor){
                console.log("%c" + msg, 'background:#' + hexcolor);
            } else {
                console.log(msg);
            }
        }
    };

    var findTabColor = function(tab) {
        if(tab.favIconUrl) {
            var iconImg = document.createElement('img');
            iconImg.src = "chrome://favicon/" + tab.url;
            iconImg.onload = function() {
                var colors = colorThief.getPalette(this,3,5);
                var bestHue = MAX_HUE;
                var bestSat = MIN_SAT;
                for(var i=0; i < colors.length; i++) {
                    var rgb = colors[i];
                    log("####", rgbToHex(rgb));
                    hue = getHueFromRgb(rgb);
                    if(hue<0) { hue = MAX_HUE + hue; }
                    sat = getSatFromRgb(rgb);
                    if(bestHue < MAX_HUE || sat > bestSat) {
                        bestHue = hue;
                        bestSat = sat;
                        log("Best hue so far:" + bestHue, hueToHex(bestHue));
                    }
                }
                if(bestHue == MAX_HUE){ log("We could not find a good hue."); }
                storeHueForTab(tab.id, bestHue);
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
    var getSatFromRgb = function(rgb) {
        var r = rgb[0] / 255;
        var g = rgb[1] / 255;
        var b = rgb[2] / 255;
        var cmax = Math.max(r,g,b);
        var cmin = Math.min(r,g,b);
        var delta = cmax - cmin;
        if (delta == 0) return 0;
        return delta/cmax;
    };
    var rgbToHex = function(rgb) {
        log(rgb);
        var r = Math.round(rgb[0]).toString(16),
            b = Math.round(rgb[1]).toString(16),
            g = Math.round(rgb[2]).toString(16);

        var pad = function(s) { return (s.length == 1 ? '0' : '') + s; };
        r = pad(r);
        b = pad(b);
        g = pad(g);

        var hex = r + b + g;
        return hex;
    };
    var hueToHex = function(hue) {
        var sat = 1, val = 0.7;
        var h = hue/60;
        var c = val * sat;
        var x = c * (1 - Math.abs((h) % 2 - 1));
        var m = val - c;
        var z = 0;

        c = Math.floor((c+m) * 256);
        x = Math.floor((x+m) * 256);
        z = Math.floor((z+m) * 256);

        switch(Math.floor(h)){
            case 0: return rgbToHex([c, x, z]);
            case 1: return rgbToHex([x, c, z]);
            case 2: return rgbToHex([z, c, x]);
            case 3: return rgbToHex([z, x, c]);
            case 4: return rgbToHex([x, z, c]);
            case 5: return rgbToHex([c, z, x]);
            default: return "000000";
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
