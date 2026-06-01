(function () {
  const script = document.currentScript || document.querySelector('script[data-api-key]');
  const API_KEY = script?.getAttribute('data-api-key');
  const BASE_URL = script?.getAttribute('data-base-url') || 'https://knowledge-ai-rag-chatbot.vercel.app';

  if (!API_KEY) return console.error('[KnowledgeAI] data-api-key is required');

  let settings = { primaryColor: '#7c3aed', botName: 'AI Assistant', welcomeMessage: 'Hi! How can I help you today?', placeholder: 'Ask me anything...' };
  let messages = [];
  let isOpen = false;
  let isLoading = false;

  fetch(`${BASE_URL}/api/widget/${API_KEY}`)
    .then(r => r.json())
    .then(data => { if (data.settings) settings = { ...settings, ...data.settings }; init(); })
    .catch(() => init());

  // ── Lightweight markdown renderer ──────────────────────────
  function renderMarkdown(text) {
    if (!text) return '';
    let html = text
      // Escape HTML first
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      // Code blocks ```...```
      .replace(/```[\w]*\n?([\s\S]*?)```/g, '<pre><code>$1</code></pre>')
      // Inline code `...`
      .replace(/`([^`]+)`/g, '<code>$1</code>')
      // Bold **text** or __text__
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/__(.+?)__/g, '<strong>$1</strong>')
      // Italic *text* or _text_
      .replace(/\*([^*]+)\*/g, '<em>$1</em>')
      .replace(/_([^_]+)_/g, '<em>$1</em>')
      // Headers ### ## #
      .replace(/^### (.+)$/gm, '<h3>$1</h3>')
      .replace(/^## (.+)$/gm, '<h2>$1</h2>')
      .replace(/^# (.+)$/gm, '<h1>$1</h1>')
      // Horizontal rule
      .replace(/^---$/gm, '<hr>')
      // Unordered lists - item or * item
      .replace(/^[\-\*] (.+)$/gm, '<li>$1</li>')
      // Ordered lists 1. item
      .replace(/^\d+\. (.+)$/gm, '<li class="kai-ol">$1</li>')
      // Wrap consecutive <li> in <ul> or <ol>
      .replace(/(<li>[\s\S]*?<\/li>(\n|$))+/g, m => {
        if (m.includes('class="kai-ol"')) return '<ol>' + m.replace(/ class="kai-ol"/g, '') + '</ol>';
        return '<ul>' + m + '</ul>';
      })
      // Blockquote > text
      .replace(/^&gt; (.+)$/gm, '<blockquote>$1</blockquote>')
      // Links [text](url)
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>')
      // Line breaks — double newline = paragraph, single = <br>
      .replace(/\n\n+/g, '</p><p>')
      .replace(/\n/g, '<br>');

    // Wrap in paragraph if not already block element
    if (!html.match(/^<(h[1-3]|ul|ol|pre|blockquote|hr)/)) {
      html = '<p>' + html + '</p>';
    }
    return html;
  }

  function init() {
    injectStyles();
    document.body.appendChild(createWidget());
  }

  function injectStyles() {
    const style = document.createElement('style');
    style.textContent = `
      #kai-widget * { box-sizing: border-box; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; }
      #kai-widget { position: fixed; bottom: 24px; right: 24px; z-index: 999999; }
      #kai-toggle { width: 56px; height: 56px; border-radius: 50%; background: ${settings.primaryColor}; border: none; cursor: pointer; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 24px rgba(0,0,0,0.25); transition: transform 0.2s; color: ${settings.primaryColor}; }
      #kai-toggle:hover { transform: scale(1.08); }
      #kai-toggle svg { width: 26px; height: 26px; fill: white; }
      #kai-box { display: none; position: absolute; bottom: 68px; right: 0; width: 370px; height: 540px; background: #fff; border-radius: 16px; box-shadow: 0 8px 40px rgba(0,0,0,0.18); flex-direction: column; overflow: hidden; }
      #kai-box.open { display: flex; }
      #kai-header { background: ${settings.primaryColor}; padding: 14px 16px; display: flex; align-items: center; justify-content: space-between; flex-shrink: 0; }
      #kai-header-title { color: white; font-weight: 600; font-size: 15px; }
      #kai-header-sub { color: rgba(255,255,255,0.75); font-size: 11px; margin-top: 1px; }
      #kai-close { background: none; border: none; cursor: pointer; color: white; opacity: 0.8; font-size: 20px; line-height: 1; padding: 0; }
      #kai-close:hover { opacity: 1; }
      #kai-messages { flex: 1; overflow-y: auto; padding: 14px; display: flex; flex-direction: column; gap: 10px; background: #f5f5fa; }
      .kai-msg { max-width: 86%; border-radius: 14px; font-size: 13.5px; line-height: 1.6; word-break: break-word; }
      .kai-msg.user { background: ${settings.primaryColor}; color: white; border-radius: 14px 14px 2px 14px; align-self: flex-end; padding: 10px 14px; }
      .kai-msg.bot { background: #fff; color: #1a1a2e; border-radius: 14px 14px 14px 2px; box-shadow: 0 1px 4px rgba(0,0,0,0.08); align-self: flex-start; padding: 10px 14px; }
      /* Markdown styles inside bot messages */
      .kai-msg.bot p { margin: 0 0 8px 0; }
      .kai-msg.bot p:last-child { margin-bottom: 0; }
      .kai-msg.bot h1,.kai-msg.bot h2,.kai-msg.bot h3 { margin: 8px 0 4px; font-weight: 700; color: #111; }
      .kai-msg.bot h1 { font-size: 15px; }
      .kai-msg.bot h2 { font-size: 14px; }
      .kai-msg.bot h3 { font-size: 13.5px; }
      .kai-msg.bot ul,.kai-msg.bot ol { margin: 6px 0; padding-left: 18px; }
      .kai-msg.bot li { margin: 3px 0; }
      .kai-msg.bot strong { font-weight: 700; color: #111; }
      .kai-msg.bot em { font-style: italic; }
      .kai-msg.bot code { background: #f0f0f5; border-radius: 4px; padding: 1px 5px; font-size: 12px; font-family: 'Courier New', monospace; color: #7c3aed; }
      .kai-msg.bot pre { background: #1e1e2e; border-radius: 8px; padding: 10px 12px; overflow-x: auto; margin: 8px 0; }
      .kai-msg.bot pre code { background: none; color: #a6e3a1; padding: 0; font-size: 12px; }
      .kai-msg.bot blockquote { border-left: 3px solid ${settings.primaryColor}; margin: 6px 0; padding: 4px 10px; color: #555; background: #f8f8ff; border-radius: 0 6px 6px 0; }
      .kai-msg.bot a { color: ${settings.primaryColor}; text-decoration: underline; }
      .kai-msg.bot hr { border: none; border-top: 1px solid #eee; margin: 8px 0; }
      /* Typing indicator */
      .kai-typing { display: flex; gap: 4px; align-items: center; padding: 12px 14px; }
      .kai-dot { width: 7px; height: 7px; border-radius: 50%; background: #bbb; animation: kai-bounce 1.2s infinite; }
      .kai-dot:nth-child(2) { animation-delay: 0.2s; }
      .kai-dot:nth-child(3) { animation-delay: 0.4s; }
      @keyframes kai-bounce { 0%,60%,100% { transform: translateY(0); } 30% { transform: translateY(-6px); } }
      #kai-input-area { padding: 10px 12px; border-top: 1px solid #eee; display: flex; gap: 8px; background: #fff; flex-shrink: 0; }
      #kai-input { flex: 1; border: 1px solid #e0e0e0; border-radius: 10px; padding: 9px 12px; font-size: 13px; outline: none; resize: none; max-height: 80px; }
      #kai-input:focus { border-color: ${settings.primaryColor}; }
      #kai-send { background: ${settings.primaryColor}; border: none; border-radius: 10px; width: 38px; height: 38px; cursor: pointer; display: flex; align-items: center; justify-content: center; flex-shrink: 0; align-self: flex-end; }
      #kai-send:disabled { opacity: 0.5; cursor: not-allowed; }
      #kai-send svg { width: 16px; height: 16px; fill: white; }
      #kai-branding { text-align: center; font-size: 10px; color: #ccc; padding: 4px 0 6px; background: #fff; flex-shrink: 0; }
      #kai-branding a { color: #bbb; text-decoration: none; }
      @media (max-width: 480px) {
        #kai-box { width: calc(100vw - 20px); right: -10px; height: 72vh; bottom: 66px; }
        #kai-widget { bottom: 16px; right: 16px; }
      }
    `;
    document.head.appendChild(style);
  }

  function createWidget() {
    const wrap = document.createElement('div');
    wrap.id = 'kai-widget';
    wrap.innerHTML = `
      <div id="kai-box">
        <div id="kai-header">
          <div>
            <div id="kai-header-title">${settings.botName}</div>
            <div id="kai-header-sub">Powered by Knowledge AI</div>
          </div>
          <button id="kai-close">&#x2715;</button>
        </div>
        <div id="kai-messages">
          <div class="kai-msg bot"><p>${settings.welcomeMessage}</p></div>
        </div>
        <div id="kai-input-area">
          <textarea id="kai-input" rows="1" placeholder="${settings.placeholder}"></textarea>
          <button id="kai-send">
            <svg viewBox="0 0 24 24"><path d="M2 21l21-9L2 3v7l15 2-15 2z"/></svg>
          </button>
        </div>
        <div id="kai-branding">Powered by <a href="https://knowledge-ai-rag-chatbot.vercel.app" target="_blank">Knowledge AI</a></div>
      </div>
      <button id="kai-toggle" title="Chat with us">
        <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <!-- Robot head -->
          <rect x="4" y="7" width="16" height="11" rx="3" fill="white"/>
          <!-- Eyes -->
          <circle cx="9" cy="12" r="1.8" fill="currentColor"/>
          <circle cx="15" cy="12" r="1.8" fill="currentColor"/>
          <!-- Antenna -->
          <line x1="12" y1="7" x2="12" y2="4" stroke="white" stroke-width="1.8" stroke-linecap="round"/>
          <circle cx="12" cy="3" r="1.2" fill="white"/>
          <!-- Mouth -->
          <rect x="8.5" y="15" width="7" height="1.5" rx="0.75" fill="currentColor"/>
        </svg>
      </button>
    `;
    setTimeout(() => {
      wrap.querySelector('#kai-toggle').addEventListener('click', toggleChat);
      wrap.querySelector('#kai-close').addEventListener('click', toggleChat);
      wrap.querySelector('#kai-send').addEventListener('click', sendMessage);
      wrap.querySelector('#kai-input').addEventListener('keydown', function (e) {
        if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
      });
      // Auto-resize textarea
      wrap.querySelector('#kai-input').addEventListener('input', function () {
        this.style.height = 'auto';
        this.style.height = Math.min(this.scrollHeight, 80) + 'px';
      });
    }, 0);
    return wrap;
  }

  function toggleChat() {
    isOpen = !isOpen;
    document.getElementById('kai-box').classList.toggle('open', isOpen);
    if (isOpen) document.getElementById('kai-input').focus();
  }

  async function sendMessage() {
    const input = document.getElementById('kai-input');
    const text = input.value.trim();
    if (!text || isLoading) return;

    input.value = '';
    input.style.height = 'auto';
    appendMessage('user', text);
    messages.push({ role: 'user', content: text });

    const typingEl = appendTyping();
    isLoading = true;
    document.getElementById('kai-send').disabled = true;

    try {
      const response = await fetch(`${BASE_URL}/api/widget/${API_KEY}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages }),
      });

      typingEl.remove();
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let botText = '';
      const msgEl = appendBotMessage();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const lines = decoder.decode(value).split('\n');
        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const data = line.slice(6).trim();
          if (data === '[DONE]') break;
          try {
            const parsed = JSON.parse(data);
            if (parsed.type === 'text-delta' && parsed.delta) {
              botText += parsed.delta;
              msgEl.innerHTML = renderMarkdown(botText);
              scrollToBottom();
            }
          } catch {}
        }
      }

      messages.push({ role: 'assistant', content: botText });
    } catch {
      typingEl?.remove();
      appendMessage('bot', 'Sorry, something went wrong. Please try again.');
    }

    isLoading = false;
    document.getElementById('kai-send').disabled = false;
    input.focus();
  }

  function appendMessage(role, text) {
    const msgs = document.getElementById('kai-messages');
    const el = document.createElement('div');
    el.className = `kai-msg ${role}`;
    if (role === 'bot') el.innerHTML = renderMarkdown(text);
    else el.textContent = text;
    msgs.appendChild(el);
    scrollToBottom();
    return el;
  }

  function appendBotMessage() {
    const msgs = document.getElementById('kai-messages');
    const el = document.createElement('div');
    el.className = 'kai-msg bot';
    msgs.appendChild(el);
    scrollToBottom();
    return el;
  }

  function appendTyping() {
    const msgs = document.getElementById('kai-messages');
    const el = document.createElement('div');
    el.className = 'kai-msg bot kai-typing';
    el.innerHTML = '<div class="kai-dot"></div><div class="kai-dot"></div><div class="kai-dot"></div>';
    msgs.appendChild(el);
    scrollToBottom();
    return el;
  }

  function scrollToBottom() {
    const msgs = document.getElementById('kai-messages');
    if (msgs) msgs.scrollTop = msgs.scrollHeight;
  }
})();
