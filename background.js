// Background service worker for Paper Chat extension

// Open side panel when extension icon is clicked
chrome.action.onClicked.addListener((tab) => {
  chrome.sidePanel.open({ windowId: tab.windowId });
});

// Listen for messages from content script or side panel
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === 'PDF_CONTENT') {
    // Forward PDF content to side panel
    chrome.runtime.sendMessage({
      type: 'PDF_LOADED',
      content: request.content,
      url: request.url
    });
  }
  return true;
});
