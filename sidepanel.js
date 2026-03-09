// Side panel JavaScript for Paper Chat

// State management
// Per-tab state: keyed by tab ID
const tabStates = {};  // { [tabId]: { chatHistory, currentPDF, chatHTML } }
let activeTabId = null;

// Current tab's working state (mirrors tabStates[activeTabId])
let chatHistory = [];
let currentPDF = null;

let settings = {
  apiProvider: 'openai',
  apiKey: '',
  customEndpoint: '',
  modelName: ''
};

// Detect if a URL points to a PDF (local, direct .pdf link, or ArXiv PDF)
function isPDFUrl(url) {
  if (!url) return false;
  try {
    const u = new URL(url);
    // Local files
    if (u.protocol === 'file:') return true;
    // Direct .pdf extension
    if (u.pathname.toLowerCase().endsWith('.pdf')) return true;
    // ArXiv PDF pages: arxiv.org/pdf/xxxx
    if (u.hostname === 'arxiv.org' && u.pathname.startsWith('/pdf/')) return true;
    // Chrome's built-in PDF viewer wrapping a URL
    if (u.protocol === 'chrome-extension:' && u.pathname.includes('pdf')) return true;
    return false;
  } catch {
    return false;
  }
}

// DOM elements
const settingsBtn = document.getElementById('settingsBtn');
const closeSettingsBtn = document.getElementById('closeSettingsBtn');
const settingsPanel = document.getElementById('settingsPanel');
const apiProviderSelect = document.getElementById('apiProvider');
const apiKeyInput = document.getElementById('apiKey');
const toggleApiKeyBtn = document.getElementById('toggleApiKey');
const customEndpointGroup = document.getElementById('customEndpointGroup');
const customEndpointInput = document.getElementById('customEndpoint');
const modelNameInput = document.getElementById('modelName');
const saveSettingsBtn = document.getElementById('saveSettingsBtn');
const settingsStatus = document.getElementById('settingsStatus');
const pdfStatusText = document.getElementById('pdfStatusText');
const pdfInfo = document.getElementById('pdfInfo');
const chatMessages = document.getElementById('chatMessages');
const messageInput = document.getElementById('messageInput');
const sendBtn = document.getElementById('sendBtn');
const clearChatBtn = document.getElementById('clearChatBtn');

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  loadSettings();
  checkPDFStatus();
  setupEventListeners();
});

// Event listeners
function setupEventListeners() {
  settingsBtn.addEventListener('click', openSettings);
  closeSettingsBtn.addEventListener('click', closeSettings);
  saveSettingsBtn.addEventListener('click', saveSettings);
  toggleApiKeyBtn.addEventListener('click', toggleApiKeyVisibility);
  apiProviderSelect.addEventListener('change', handleProviderChange);
  sendBtn.addEventListener('click', sendMessage);
  clearChatBtn.addEventListener('click', clearChat);
  
  messageInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  });
  
  messageInput.addEventListener('input', () => {
    updateSendButtonState();
  });
}

// Settings functions
function openSettings() {
  settingsPanel.classList.remove('hidden');
}

function closeSettings() {
  settingsPanel.classList.add('hidden');
  settingsStatus.classList.remove('show');
}

function toggleApiKeyVisibility() {
  const type = apiKeyInput.type === 'password' ? 'text' : 'password';
  apiKeyInput.type = type;
  toggleApiKeyBtn.textContent = type === 'password' ? '👁️' : '🙈';
}

function handleProviderChange() {
  const provider = apiProviderSelect.value;
  if (provider === 'custom') {
    customEndpointGroup.style.display = 'block';
  } else {
    customEndpointGroup.style.display = 'none';
  }
  
  // Set default model names
  if (provider === 'openai') {
    modelNameInput.placeholder = 'e.g., gpt-4, gpt-3.5-turbo';
  } else if (provider === 'anthropic') {
    modelNameInput.placeholder = 'e.g., claude-3-opus-20240229';
  } else {
    modelNameInput.placeholder = 'Enter model name (required)';
  }
}

async function loadSettings() {
  try {
    const result = await chrome.storage.local.get(['settings']);
    if (result.settings) {
      settings = result.settings;
      apiProviderSelect.value = settings.apiProvider || 'openai';
      apiKeyInput.value = settings.apiKey || '';
      customEndpointInput.value = settings.customEndpoint || '';
      modelNameInput.value = settings.modelName || '';
      handleProviderChange();
      updateUIState();
    }
  } catch (error) {
    console.error('Error loading settings:', error);
  }
}

async function saveSettings() {
  const apiKey = apiKeyInput.value.trim();
  
  if (!apiKey) {
    showSettingsStatus('Please enter an API key', 'error');
    return;
  }
  
  settings = {
    apiProvider: apiProviderSelect.value,
    apiKey: apiKey,
    customEndpoint: customEndpointInput.value.trim(),
    modelName: modelNameInput.value.trim()
  };
  
  try {
    await chrome.storage.local.set({ settings });
    showSettingsStatus('Settings saved successfully!', 'success');
    updateUIState();
    setTimeout(() => {
      closeSettings();
    }, 1500);
  } catch (error) {
    console.error('Error saving settings:', error);
    showSettingsStatus('Error saving settings', 'error');
  }
}

function showSettingsStatus(message, type) {
  settingsStatus.textContent = message;
  settingsStatus.className = `status-message show ${type}`;
}

// PDF text extraction using PDF.js
async function extractPDFText(url) {
  try {
    // Point PDF.js worker to the local file
    pdfjsLib.GlobalWorkerOptions.workerSrc = chrome.runtime.getURL('pdf.worker.min.js');

    const loadingTask = pdfjsLib.getDocument(url);
    const pdf = await loadingTask.promise;
    const numPages = pdf.numPages;

    let fullText = '';
    // Cap at 30 pages to avoid exceeding context limits
    const maxPages = Math.min(numPages, 30);
    for (let i = 1; i <= maxPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      const pageText = textContent.items.map(item => item.str).join(' ');
      fullText += `\n--- Page ${i} ---\n${pageText}`;
    }
    if (numPages > maxPages) {
      fullText += `\n\n[Note: Only the first ${maxPages} of ${numPages} pages were loaded.]`;
    }
    return fullText.trim();
  } catch (err) {
    console.error('PDF text extraction failed:', err);
    return null;
  }
}

// Per-tab state helpers
function saveCurrentTabState() {
  if (activeTabId === null) return;
  tabStates[activeTabId] = {
    chatHistory: [...chatHistory],
    currentPDF: currentPDF,
    chatHTML: chatMessages.innerHTML
  };
}

function loadTabState(tabId) {
  const state = tabStates[tabId];
  if (state) {
    chatHistory = [...state.chatHistory];
    currentPDF = state.currentPDF;
    chatMessages.innerHTML = state.chatHTML;
  } else {
    // Fresh state for this tab
    chatHistory = [];
    currentPDF = null;
    chatMessages.innerHTML = `
      <div class="welcome-message">
        <h3>Welcome to Paper Chat! 👋</h3>
        <p>To get started:</p>
        <ol>
          <li>Click the ⚙️ icon to set your API key</li>
          <li>Open a PDF in Chrome</li>
          <li>Start chatting about the document!</li>
        </ol>
      </div>`;
  }
}

// Trigger PDF text extraction and update status
async function loadPDFText(pdf) {
  if (pdf.text !== undefined) return; // already extracted (or attempted)
  pdf.text = null; // mark as in-progress
  pdfStatusText.textContent = `📄 ${pdf.title} — extracting text…`;

  const text = await extractPDFText(pdf.url);
  pdf.text = text;

  if (text) {
    const words = text.split(/\s+/).length;
    pdfStatusText.textContent = `📄 ${pdf.title} (${words.toLocaleString()} words extracted)`;
  } else {
    pdfStatusText.textContent = `📄 ${pdf.title} (text extraction failed — title-only mode)`;
  }
  updateUIState();
}

// PDF detection — uses isPDFUrl() and manages per-tab state
async function checkPDFStatus() {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab) return;

    const newTabId = tab.id;

    // If we switched tabs, save old state and load new
    if (newTabId !== activeTabId) {
      saveCurrentTabState();
      activeTabId = newTabId;
      loadTabState(newTabId);
    }

    // Detect PDF for this tab if not already known
    if (!currentPDF && isPDFUrl(tab.url)) {
      currentPDF = {
        url: tab.url,
        title: tab.title || 'PDF Document'
      };
      // Kick off text extraction (async, non-blocking for UI)
      loadPDFText(currentPDF);
    }

    if (currentPDF) {
      if (currentPDF.text === undefined) {
        // Extraction not yet started (loaded from saved state)
        loadPDFText(currentPDF);
      }
      pdfStatusText.textContent = `📄 ${currentPDF.title}`;
      pdfInfo.classList.add('success');
    } else {
      pdfInfo.classList.remove('success');
    }

    updateUIState();
  } catch (error) {
    console.error('Error checking PDF status:', error);
  }
}

// UI state management
function updateUIState() {
  const hasApiKey = settings.apiKey && settings.apiKey.length > 0;
  const hasPDF = currentPDF !== null;
  const canChat = hasApiKey && hasPDF;
  
  messageInput.disabled = !canChat;
  sendBtn.disabled = !canChat || messageInput.value.trim().length === 0;
  
  if (!hasApiKey) {
    pdfStatusText.textContent = '⚠️ Please set your API key in settings';
    pdfInfo.classList.remove('success');
  } else if (!hasPDF) {
    pdfStatusText.textContent = '📄 No PDF detected - open a PDF to start chatting';
    pdfInfo.classList.remove('success');
  }
}

function updateSendButtonState() {
  const hasText = messageInput.value.trim().length > 0;
  const hasApiKey = settings.apiKey && settings.apiKey.length > 0;
  const hasPDF = currentPDF !== null;
  sendBtn.disabled = !hasText || !hasApiKey || !hasPDF;
}

// Chat functions
async function sendMessage() {
  const message = messageInput.value.trim();
  if (!message) return;
  
  // Add user message to chat
  addMessageToChat(message, 'user');
  messageInput.value = '';
  updateSendButtonState();
  
  // Add to history
  chatHistory.push({ role: 'user', content: message });
  
  // Show loading indicator
  const loadingId = addLoadingMessage();
  
  try {
    // Call LLM API
    const response = await callLLMAPI(message);
    removeLoadingMessage(loadingId);
    
    // Add assistant response
    addMessageToChat(response, 'assistant');
    chatHistory.push({ role: 'assistant', content: response });
    
  } catch (error) {
    removeLoadingMessage(loadingId);
    addMessageToChat(`Error: ${error.message}`, 'error');
    console.error('Error calling LLM:', error);
  }
}

function renderMarkdownWithLatex(content) {
  // Protect LaTeX blocks from being mangled by the Markdown parser.
  // We replace them with placeholders, run marked, then restore them.
  const latexBlocks = [];

  // Display math: $$...$$
  let processed = content.replace(/\$\$([\s\S]+?)\$\$/g, (_, math) => {
    const idx = latexBlocks.length;
    latexBlocks.push({ type: 'display', math });
    return `%%LATEX_BLOCK_${idx}%%`;
  });

  // Inline math: $...$
  processed = processed.replace(/\$([^\n$]+?)\$/g, (_, math) => {
    const idx = latexBlocks.length;
    latexBlocks.push({ type: 'inline', math });
    return `%%LATEX_BLOCK_${idx}%%`;
  });

  // Parse Markdown
  let html = marked.parse(processed);

  // Restore and render LaTeX
  html = html.replace(/%%LATEX_BLOCK_(\d+)%%/g, (_, idx) => {
    const { type, math } = latexBlocks[Number(idx)];
    try {
      return katex.renderToString(math, {
        displayMode: type === 'display',
        throwOnError: false
      });
    } catch (e) {
      return type === 'display' ? `$$${math}$$` : `$${math}$`;
    }
  });

  return html;
}

function addMessageToChat(content, type) {
  // Remove welcome message if it exists
  const welcomeMsg = chatMessages.querySelector('.welcome-message');
  if (welcomeMsg) {
    welcomeMsg.remove();
  }
  
  const messageDiv = document.createElement('div');
  messageDiv.className = `message ${type}`;

  if (type === 'assistant') {
    // Render Markdown + LaTeX for assistant messages
    messageDiv.classList.add('markdown-body');
    messageDiv.innerHTML = renderMarkdownWithLatex(content);
  } else {
    // Plain text for user messages and errors
    messageDiv.textContent = content;
  }

  chatMessages.appendChild(messageDiv);
  
  // Scroll to bottom
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

function addLoadingMessage() {
  const loadingDiv = document.createElement('div');
  const loadingId = 'loading-' + Date.now();
  loadingDiv.id = loadingId;
  loadingDiv.className = 'message loading';
  loadingDiv.innerHTML = `
    <span>Thinking</span>
    <div class="loading-dots">
      <span></span>
      <span></span>
      <span></span>
    </div>
  `;
  chatMessages.appendChild(loadingDiv);
  chatMessages.scrollTop = chatMessages.scrollHeight;
  return loadingId;
}

function removeLoadingMessage(loadingId) {
  const loadingDiv = document.getElementById(loadingId);
  if (loadingDiv) {
    loadingDiv.remove();
  }
}

function clearChat() {
  chatHistory = [];
  chatMessages.innerHTML = `
    <div class="welcome-message">
      <h3>Chat cleared! 🧹</h3>
      <p>Start a new conversation about your PDF.</p>
    </div>
  `;
}

// LLM API call
async function callLLMAPI(userMessage) {
  const { apiProvider, apiKey, customEndpoint, modelName } = settings;
  
  if (!apiKey) {
    throw new Error('API key not configured');
  }

  const pdfTitle = currentPDF?.title || 'a document';
  const pdfText = currentPDF?.text;
  const pdfContext = pdfText
    ? `\n\nHere is the full text of the PDF for your reference:\n\n${pdfText}`
    : '\n\n(The PDF text could not be extracted. Answer based on the title and the user\'s questions only.)';

  const systemPrompt = `You are a helpful assistant that helps users understand and analyze PDF documents. The user is currently viewing a PDF titled "${pdfTitle}".
Format your responses using Markdown (headings, bold, italics, bullet lists, numbered lists, code blocks, etc.) where appropriate.
For mathematical expressions, use LaTeX notation: inline math with $...$ and display (block) math with $$...$$. Do not use \\( \\) or \\[ \\] delimiters.${pdfContext}`;
  
  let endpoint, headers, body;
  
  // Configure based on provider
  if (apiProvider === 'openai') {
    endpoint = 'https://api.openai.com/v1/chat/completions';
    headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    };
    body = {
      model: modelName || 'gpt-3.5-turbo',
      messages: [
        { role: 'system', content: systemPrompt },
        ...chatHistory
      ]
    };
  } else if (apiProvider === 'anthropic') {
    endpoint = 'https://api.anthropic.com/v1/messages';
    headers = {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01'
    };
    
    // Convert chat history to Anthropic format
    const messages = chatHistory.map(msg => ({
      role: msg.role === 'assistant' ? 'assistant' : 'user',
      content: msg.content
    }));
    
    body = {
      model: modelName || 'claude-3-opus-20240229',
      max_tokens: 4096,
      system: systemPrompt,
      messages: messages
    };
  } else if (apiProvider === 'custom') {
    if (!customEndpoint) {
      throw new Error('Custom endpoint URL is required. Please set it in Settings.');
    }
    if (!modelName) {
      throw new Error('Model name is required for custom API. Please set it in Settings.');
    }
    // Normalize base URL: strip trailing slash, then append the chat completions path
    const baseUrl = customEndpoint.replace(/\/+$/, '');
    endpoint = baseUrl.endsWith('/chat/completions')
      ? baseUrl
      : `${baseUrl}/chat/completions`;
    headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    };
    body = {
      model: modelName,
      messages: [
        { role: 'system', content: systemPrompt },
        ...chatHistory
      ]
    };
  }
  
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: headers,
    body: JSON.stringify(body)
  });
  
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error?.message || `API request failed: ${response.status} ${response.statusText}`);
  }
  
  const data = await response.json();
  
  // Extract response based on provider
  if (apiProvider === 'openai' || apiProvider === 'custom') {
    return data.choices[0].message.content;
  } else if (apiProvider === 'anthropic') {
    return data.content[0].text;
  }
  
  throw new Error('Unexpected API response format');
}

// Listen for tab switches — reload state when user switches to a different tab
chrome.tabs.onActivated.addListener(({ tabId }) => {
  saveCurrentTabState();
  activeTabId = tabId;
  loadTabState(tabId);

  // Re-check PDF status for the newly active tab
  chrome.tabs.get(tabId, (tab) => {
    if (chrome.runtime.lastError || !tab) return;

    // Detect PDF if not already stored
    if (!currentPDF && isPDFUrl(tab.url)) {
      currentPDF = {
        url: tab.url,
        title: tab.title || 'PDF Document'
      };
    }

    if (currentPDF) {
      // Kick off text extraction if not done yet
      if (currentPDF.text === undefined) {
        loadPDFText(currentPDF);
      }
      pdfStatusText.textContent = `📄 ${currentPDF.title}`;
      pdfInfo.classList.add('success');
    } else {
      pdfInfo.classList.remove('success');
    }
    updateUIState();
  });
});

// Also handle tab URL updates (e.g. navigating to a PDF in the same tab)
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (tabId !== activeTabId) return;
  if (changeInfo.status !== 'complete') return;

  // If the tab navigated to a new URL, reset its state
  if (changeInfo.url) {
    tabStates[tabId] = null; // clear stored state for this tab
    chatHistory = [];
    currentPDF = null;
    chatMessages.innerHTML = `
      <div class="welcome-message">
        <h3>Welcome to Paper Chat! 👋</h3>
        <p>To get started:</p>
        <ol>
          <li>Click the ⚙️ icon to set your API key</li>
          <li>Open a PDF in Chrome</li>
          <li>Start chatting about the document!</li>
        </ol>
      </div>`;
  }

  if (isPDFUrl(tab.url)) {
    currentPDF = {
      url: tab.url,
      title: tab.title || 'PDF Document'
    };
    loadPDFText(currentPDF);
    pdfStatusText.textContent = `📄 ${currentPDF.title}`;
    pdfInfo.classList.add('success');
  } else {
    pdfInfo.classList.remove('success');
  }
  updateUIState();
});

// Listen for PDF detection from content script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === 'PDF_DETECTED') {
    // Only update if this message is from the active tab
    if (sender.tab && sender.tab.id !== activeTabId) return;
    if (!currentPDF) {
      currentPDF = {
        url: request.url,
        title: request.title || 'PDF Document'
      };
      loadPDFText(currentPDF);
    }
    pdfStatusText.textContent = `📄 ${currentPDF.title}`;
    pdfInfo.classList.add('success');
    updateUIState();
  }
});
