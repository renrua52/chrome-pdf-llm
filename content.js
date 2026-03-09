// Content script to detect PDF pages and notify the side panel

// Check if current page is a PDF (including ArXiv PDF pages)
function isPDFPage() {
  const url = window.location.href;
  const pathname = window.location.pathname.toLowerCase();

  // Native PDF (Chrome renders it directly)
  if (document.contentType === 'application/pdf') return true;
  // Direct .pdf URL
  if (pathname.endsWith('.pdf')) return true;
  // ArXiv PDF viewer page: arxiv.org/pdf/xxxx
  if (window.location.hostname === 'arxiv.org' && pathname.startsWith('/pdf/')) return true;

  return false;
}

// Get a human-readable title for the current PDF
function getPDFTitle() {
  // Use the page <title> if available and meaningful
  const pageTitle = document.title && document.title.trim();
  if (pageTitle && pageTitle !== 'PDF' && pageTitle !== '') return pageTitle;

  // Fall back to the filename from the URL path
  const parts = window.location.pathname.split('/');
  const last = parts[parts.length - 1];
  if (last) return decodeURIComponent(last);

  return 'PDF Document';
}

async function extractPDFContent() {
  try {
    if (isPDFPage()) {
      chrome.runtime.sendMessage({
        type: 'PDF_DETECTED',
        url: window.location.href,
        title: getPDFTitle()
      });
      return { detected: true, url: window.location.href };
    }
  } catch (error) {
    console.error('Error detecting PDF:', error);
  }
  return null;
}

// Run extraction when page loads
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', extractPDFContent);
} else {
  extractPDFContent();
}

// Listen for requests from side panel
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === 'REQUEST_PDF_CONTENT') {
    extractPDFContent().then(content => {
      sendResponse({ content });
    });
    return true; // Keep channel open for async response
  }
});
