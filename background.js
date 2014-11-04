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

    var DEBUG = false;

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
        if(DEBUG){
            if(hexcolor){
                console.log("%c" + msg, 'background:#' + hexcolor);
            } else {
                console.log(msg);
            }
        }
    };
    var log_rgb = function(msg, rgb) {
        if(DEBUG) log(msg, rgbToHex(rgb));
    };
    var log_hue = function(msg, hue) {
        if(DEBUG) log(msg, hueToHex(hue));
    };

    var findTabColor = function(tab) {
        if(tab.favIconUrl) {
            var iconImg = document.createElement('img');
            iconImg.src = "chrome://favicon/" + tab.url;

            iconImg.onload = function() {
                var colors = colorThief.getPalette(this,3,5);
                var bestHue = MAX_HUE;
                var bestSat = MIN_SAT;

                for(var i = 0; i < colors.length; i++) {
                    var rgb = colors[i];
                    log_rgb("Current color", rgb);

                    var hsv = getHsvFromRgb(rgb);
                    if(hsv.hue < 0) hsv.hue = MAX_HUE + hsv.hue;

                    // if saturation is greater than before,
                    // and if the value is not too dark (eg very dark green just looks black)
                    if(hsv.sat > bestSat && hsv.val > 0.2) {
                        bestHue = hsv.hue;
                        bestSat = hsv.sat;
                        log_hue("Best hue so far:" + bestHue, bestHue);
                    }
                }
                if(bestHue == MAX_HUE) log("We could not find a good hue.");
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
    var getHsvFromRgb = function(rgb) {
        var r = rgb[0] / 255;
        var g = rgb[1] / 255;
        var b = rgb[2] / 255;
        var cmax = Math.max(r,g,b);
        var cmin = Math.min(r,g,b);
        var delta = cmax - cmin;

        return {
            hue: (function() {
                    if (delta == 0) return MAX_HUE;
                    switch(cmax) {
                        case r: return 60 * (((g - b)/delta) % 6);
                        case g: return 60 * (((b - r)/delta) + 2);
                        case b: return 60 * (((r - g)/delta) + 4);
                    }
                })(),
            sat: (delta == 0) ? 0 : delta/cmax,
            val: cmax
        };
    };

    var rgbToHex = function(rgb) {
        log(rgb);
        var r = Math.round(rgb[0]).toString(16),
            b = Math.round(rgb[1]).toString(16),
            g = Math.round(rgb[2]).toString(16);

        var pad = function(s) { return (s.length == 1) ? '0' + s : s; };
        r = pad(r);
        b = pad(b);
        g = pad(g);

        var hex = r + b + g;
        return hex;
    };

    var hueToHex = function(hue) {
        var sat = 1, val = 0.9;
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
    // Sort key:value "array" by value low to high, and run callback on each
    var bySortedValue = function(obj, callback, context) {
        var tuples = [];
        for(var key in obj) tuples.push([key, obj[key]]);

        tuples.sort(function(a, b) {
            var aVal = a[1],
                bVal = b[1];
            if(aVal < bVal) return 1;
            if(aVal > bVal) return -1;
            return 0;
        });
        var length = tuples.length;
        while (length--) callback.call(context, tuples[length][0], tuples[length][1]);
    };

    return run;
};

chrome.browserAction.onClicked.addListener(rainbowTabs());
