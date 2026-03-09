**This repository is coded purely by Claude-sonnet-4-6.**

# Paper Chat - Chrome Extension for PDF Analysis

A Chrome extension that allows you to chat with PDFs using Large Language Models (LLMs). Open any PDF in Chrome, activate the sidebar, and start asking questions or requesting summaries.

## Features

- 🤖 **LLM Integration**: Support for OpenAI, Anthropic (Claude), and custom API endpoints
- 💬 **Interactive Chat**: Ask questions and get answers about your PDF documents
- 🔒 **Secure**: API keys stored locally in your browser
- 🎨 **Clean UI**: Modern, intuitive sidebar interface
- ⚙️ **Flexible Configuration**: Choose your preferred LLM provider and model

## Installation

### Step 1: Load the Extension in Chrome

1. Open Chrome and navigate to `chrome://extensions/`
2. Enable **Developer mode** (toggle in the top-right corner)
3. Click **Load unpacked**
4. Select the `paper-chat` folder containing the extension files

### Step 2: Configure Your API Key

1. Click the Paper Chat extension icon in your Chrome toolbar
2. Click the ⚙️ (settings) icon in the sidebar
3. Select your LLM provider:
   - **OpenAI**: For GPT models
   - **Anthropic**: For Claude models
   - **Custom API**: For other OpenAI-compatible endpoints
4. Enter your API key
5. (Optional) Specify a model name (e.g., `gpt-4`, `claude-3-opus-20240229`)
6. Click **Save Settings**

### Getting API Keys

- **OpenAI**: Get your API key from [platform.openai.com/api-keys](https://platform.openai.com/api-keys)
- **Anthropic**: Get your API key from [console.anthropic.com](https://console.anthropic.com/)

## Usage

1. **Open a PDF** in Chrome (either from a URL or local file)
2. **Click the extension icon** to open the sidebar
3. **Start chatting!** Ask questions about the PDF content

### Example Questions

- "What is this document about?"
- "Summarize the main points"
- "Explain the methodology section"
- "What are the key findings?"
- "Can you extract the references?"

## File Structure

```
paper-chat/
├── manifest.json          # Extension configuration
├── background.js          # Background service worker
├── content.js            # Content script for PDF detection
├── sidepanel.html        # Sidebar UI structure
├── sidepanel.css         # Sidebar styling
├── sidepanel.js          # Sidebar functionality
├── icon16.png            # Extension icon (16x16)
├── icon48.png            # Extension icon (48x48)
├── icon128.png           # Extension icon (128x128)
└── README.md             # This file
```

## Supported LLM Providers

### OpenAI
- Default endpoint: `https://api.openai.com/v1/chat/completions`
- Recommended models: `gpt-4`, `gpt-3.5-turbo`, `gpt-4-turbo`

### Anthropic (Claude)
- Default endpoint: `https://api.anthropic.com/v1/messages`
- Recommended models: `claude-3-opus-20240229`, `claude-3-sonnet-20240229`

### Custom API
- Use any OpenAI-compatible API endpoint
- Specify your custom endpoint URL and model name

## Features Overview

### Settings Panel
- **LLM Provider Selection**: Choose between OpenAI, Anthropic, or custom API
- **API Key Management**: Securely store your API key (with show/hide toggle)
- **Model Configuration**: Specify which model to use
- **Custom Endpoint**: For self-hosted or alternative LLM services

### Chat Interface
- **Message History**: Maintains conversation context
- **Loading Indicators**: Visual feedback while waiting for responses
- **Error Handling**: Clear error messages if something goes wrong
- **Clear Chat**: Reset conversation at any time

### PDF Detection
- Automatically detects when you're viewing a PDF
- Shows PDF status in the sidebar
- Enables chat functionality when PDF is detected

## Limitations & Future Enhancements

### Current Limitations
- PDF text extraction is basic (requires PDF.js integration for full functionality)
- Currently works best with text-based PDFs
- No support for images or complex layouts yet

### Planned Features
- Full PDF text extraction using PDF.js
- Support for scanned PDFs (OCR)
- Export chat history
- Multiple PDF comparison
- Annotation and highlighting
- Custom prompts and templates

## Privacy & Security

- **Local Storage**: All settings and API keys are stored locally in your browser
- **No Data Collection**: This extension does not collect or transmit any user data
- **Direct API Calls**: Communications go directly from your browser to the LLM provider
- **Open Source**: All code is visible and auditable

## Troubleshooting

### Extension doesn't appear
- Make sure Developer mode is enabled in `chrome://extensions/`
- Try reloading the extension

### PDF not detected
- Ensure you're viewing a PDF file (URL ends with `.pdf` or is a local file)
- Try refreshing the page
- Check the browser console for errors

### API errors
- Verify your API key is correct
- Check that you have sufficient API credits
- Ensure your model name is valid for your provider
- Check your internet connection

### Chat not working
- Make sure you've configured your API key in settings
- Verify a PDF is detected (check the status bar)
- Check the browser console for detailed error messages

## Development

### Prerequisites
- Chrome browser (version 88+)
- Python 3 with PIL/Pillow (for icon generation)

### Making Changes
1. Edit the source files
2. Go to `chrome://extensions/`
3. Click the refresh icon on the Paper Chat extension
4. Test your changes

## License

MIT License - feel free to modify and distribute as needed.

## Contributing

Contributions are welcome! Feel free to submit issues or pull requests.

## Support

For issues, questions, or suggestions, please open an issue on the project repository.

---

**Note**: This extension requires an active API key from a supported LLM provider. API usage may incur costs based on your provider's pricing.
