// Rainbow Tabs: a chrome extension
// C. 2014-2025 Nagisa Day
// Updated for Manifest V3 with offscreen document

var tabIdColorLookup = {};
var tabCount;
var faviconsLoaded = 0;

var MAX_HUE = 360;
var PREFIX = 'tab';

// Listen for extension icon clicks
chrome.action.onClicked.addListener(async () => {
  await runRainbowTabs();
});

async function runRainbowTabs() {
  tabIdColorLookup = {};
  faviconsLoaded = 0;

  // Ensure offscreen document exists
  await setupOffscreenDocument();

  // Get all tabs in current window
  chrome.tabs.query({ currentWindow: true }, function(tabs) {
    tabCount = tabs.length;

    if (tabCount === 0) {
      return;
    }

    tabs.forEach(function(tab) {
      findTabColor(tab);
    });
  });
}

async function setupOffscreenDocument() {
  // Check if offscreen document already exists
  const existingContexts = await chrome.runtime.getContexts({
    contextTypes: ['OFFSCREEN_DOCUMENT']
  });

  if (existingContexts.length > 0) {
    return; // Already exists
  }

  // Create offscreen document
  await chrome.offscreen.createDocument({
    url: 'offscreen.html',
    reasons: ['DOM_SCRAPING'],
    justification: 'Extract colors from tab favicons using ColorThief library'
  });
}

function findTabColor(tab) {
  // Send message to offscreen document to extract color
  // Pass the actual favIconUrl from the tab object, plus URL and title for debugging
  chrome.runtime.sendMessage(
    {
      type: 'EXTRACT_COLOR',
      favIconUrl: tab.favIconUrl,
      tabId: tab.id,
      url: tab.url,
      title: tab.title
    },
    (response) => {
      if (response && !response.error) {
        storeHueForTab(response.tabId, response.hue);
      } else {
        console.error('Error extracting color:', response?.error);
        storeHueForTab(tab.id, MAX_HUE);
      }
    }
  );
}

function storeHueForTab(tabId, hue) {
  tabIdColorLookup[PREFIX + tabId] = hue;
  faviconsLoaded++;

  if (faviconsLoaded == tabCount) {
    reorderTabs();
  }
}

function reorderTabs() {
  var newPosition = 0;

  bySortedValue(tabIdColorLookup, (key, hue) => {
    var tabId = parseInt(key.substr(PREFIX.length));
    chrome.tabs.move(tabId, { index: newPosition++ }, () => {
      // Ignore errors for tabs that may have been closed
      if (chrome.runtime.lastError) {
        console.log('Tab move error (expected if tab closed):', chrome.runtime.lastError.message);
      }
    });
  });
}

// Adapted from http://stackoverflow.com/a/5200010
// Sort key:value 'array' by value low to high, and run callback on each
function bySortedValue(obj, callback, context) {
  var tuples = [];
  for (var key in obj) tuples.push([key, obj[key]]);

  tuples.sort((a, b) => a[1] - b[1]);

  for (let i = 0; i < tuples.length; i++) {
    callback.call(context, tuples[i][0], tuples[i][1]);
  }
}
