// Offscreen document for Rainbow Tabs
// This runs in a hidden document with DOM access for ColorThief

var colorThief = new ColorThief();
var MAX_HUE = 360;
var DEFAULT_COLOR = { hue: MAX_HUE, sat: 0, val: 0 };

// Listen for messages from the service worker
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'EXTRACT_COLOR') {
    extractColorFromFavicon(message.favIconUrl, message.tabId, message.url, message.title)
      .then(result => sendResponse(result))
      .catch(error => sendResponse({ error: error.message }));
    return true; // Keep the message channel open for async response
  }
});

async function extractColorFromFavicon(favIconUrl, tabId, url, title) {
  return new Promise(async (resolve, reject) => {
    // Extract domain for cleaner logging
    const domain = url ? new URL(url).hostname : 'unknown';
    const tabInfo = `"${title}" (${domain})`;

    if (!favIconUrl) {
      console.log(`No favicon for tab ${tabId}: ${tabInfo}`);
      resolve({ tabId, hue: MAX_HUE });
      return;
    }

    try {
      // Fetch the actual favicon URL from the tab
      const response = await fetch(favIconUrl);

      if (!response.ok) {
        console.warn(`Failed to fetch favicon for tab ${tabId}: ${tabInfo}`);
        resolve({ tabId, hue: MAX_HUE });
        return;
      }

      const blob = await response.blob();
      const dataUrl = await blobToDataURL(blob);

      var iconImg = document.createElement('img');

      iconImg.onload = function() {
        try {
          console.log(`Processing favicon for tab ${tabId}: ${tabInfo}`);
          var colors = colorThief.getPalette(iconImg, 3, 5);

          console.log(`ColorThief returned:`, colors, `for ${tabInfo}`);

          // ColorThief can return null for some images
          if (!colors || colors.length === 0) {
            console.warn(`No colors extracted for ${tabInfo}, using default`);
            resolve({ tabId, hue: MAX_HUE });
            return;
          }

          var bestColor = colors
            .map(getHsvFromRgb)
            .filter(valueSaturationFilter)
            .reduce(primaryColor, DEFAULT_COLOR);

          console.log(`Best color for ${tabInfo}: hue ${bestColor.hue}`);
          resolve({ tabId, hue: bestColor.hue });
        } catch (error) {
          console.error(`ColorThief error for ${tabInfo}:`, error);
          resolve({ tabId, hue: MAX_HUE });
        }
      };

      iconImg.onerror = function() {
        console.warn(`Image load error for ${tabInfo}`);
        resolve({ tabId, hue: MAX_HUE });
      };

      iconImg.src = dataUrl;
    } catch (error) {
      console.error(`Favicon fetch error for ${tabInfo}:`, error);
      resolve({ tabId, hue: MAX_HUE });
    }
  });
}

function blobToDataURL(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

function valueSaturationFilter(hsv) {
  return hsv.val > 0.3 && hsv.val + hsv.sat > 1;
}

function primaryColor(bestSoFarColor, color) {
  if (color.sat > bestSoFarColor.sat) {
    return color;
  }
  return bestSoFarColor;
}

// Color conversions
function getHsvFromRgb(rgb) {
  var r = rgb[0] / 255;
  var g = rgb[1] / 255;
  var b = rgb[2] / 255;
  var cmax = Math.max(r, g, b);
  var cmin = Math.min(r, g, b);
  var delta = cmax - cmin;

  return {
    hue: (function() {
      if (delta == 0) return MAX_HUE;
      switch (cmax) {
        case r:
          return 60 * (((g - b) / delta) % 6);
        case g:
          return 60 * ((b - r) / delta + 2);
        case b:
          return 60 * ((r - g) / delta + 4);
      }
    })(),
    sat: delta == 0 ? 0 : delta / cmax,
    val: cmax
  };
}
