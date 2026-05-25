(function () {
  const script = document.currentScript || document.querySelector('script[data-api-key]');
  const API_KEY = script?.getAttribute('data-api-key');
  const BASE_URL = script?.getAttribute('data-base-url') || 'https://knowledge-ai-rag-chatbot.vercel.app';

  if (!API_KEY) return console.error('[KnowledgeAI] data-api-key is required');

  let settings = { primaryColor: '#7c3aed', botName: 'AI Assistant', welcomeMessage: 'Hi! How can I help you today?', placeholder: 'Ask me anything...' };
  let messages = [];
  let isOpen = false;
  let isLoading = false;

  // Fetch bot settings
  fetch(`${BASE_URL}/api/widget/${API_KEY}`)
    .then(r => r.json())
    .then(data => { if (data.settings) settings = { ...settings, ...data.settings }; init(); })
    .catch(() => init());

  function init() {
    injectStyles();
    const widget = createWidget();
    document.body.appendChild(widget);
  }

  function injectStyles() {
    const style = document.createElement('style');
    style.textContent = `
      #kai-widget * { box-sizing: border-box; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; }
      #kai-widget { position: fixed; bottom: 24px; right: 24px; z-index: 999999; }
      #kai-toggle { width: 56px; height: 56px; border-radius: 50%; background: ${settings.primaryColor}; border: none; cursor: pointer; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 24px rgba(0,0,0,0.25); transition: transform 0.2s; }
      #kai-toggle:hover { transform: scale(1.08); }
      #kai-toggle svg { width: 26px; height: 26px; fill: white; }
      #kai-box { display: none; position: absolute; bottom: 68px; right: 0; width: 360px; height: 520px; background: #fff; border-radius: 16px; box-shadow: 0 8px 40px rgba(0,0,0,0.18); flex-direction: column; overflow: hidden; }
      #kai-box.open { display: flex; }
      #kai-header { background: ${settings.primaryColor}; padding: 14px 16px; display: flex; align-items: center; justify-content: space-between; }
      #kai-header-title { color: white; font-weight: 600; font-size: 15px; }
      #kai-header-sub { color: rgba(255,255,255,0.75); font-size: 11px; margin-top: 1px; }
      #kai-close { background: none; border: none; cursor: pointer; color: white; opacity: 0.8; font-size: 20px; line-height: 1; padding: 0; }
      #kai-close:hover { opacity: 1; }
      #kai-messages { flex: 1; overflow-y: auto; padding: 16px; display: flex; flex-direction: column; gap: 10px; background: #f8f8fb; }
      .kai-msg { max-width: 82%; padding: 10px 14px; border-radius: 14px; font-size: 13.5px; line-height: 1.5; word-break: break-word; }
      .kai-msg.bot { background: #fff; color: #1a1a2e; border-radius: 14px 14px 14px 2px; box-shadow: 0 1px 4px rgba(0,0,0,0.08); align-self: flex-start; }
      .kai-msg.user { background: ${settings.primaryColor}; color: white; border-radius: 14px 14px 2px 14px; align-self: flex-end; }
      .kai-typing { display: flex; gap: 4px; align-items: center; padding: 10px 14px; }
      .kai-dot { width: 7px; height: 7px; border-radius: 50%; background: #aaa; animation: kai-bounce 1.2s infinite; }
      .kai-dot:nth-child(2) { animation-delay: 0.2s; }
      .kai-dot:nth-child(3) { animation-delay: 0.4s; }
      @keyframes kai-bounce { 0%,60%,100% { transform: translateY(0); } 30% { transform: translateY(-6px); } }
      #kai-input-area { padding: 10px 12px; border-top: 1px solid #eee; display: flex; gap: 8px; background: #fff; }
      #kai-input { flex: 1; border: 1px solid #e0e0e0; border-radius: 10px; padding: 9px 12px; font-size: 13px; outline: none; resize: none; }
      #kai-input:focus { border-color: ${settings.primaryColor}; }
      #kai-send { background: ${settings.primaryColor}; border: none; border-radius: 10px; width: 38px; height: 38px; cursor: pointer; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
      #kai-send:disabled { opacity: 0.5; cursor: not-allowed; }
      #kai-send svg { width: 16px; height: 16px; fill: white; }
      #kai-branding { text-align: center; font-size: 10px; color: #bbb; padding: 4px 0 6px; background: #fff; }
      #kai-branding a { color: #bbb; text-decoration: none; }
      @media (max-width: 480px) {
        #kai-box { width: calc(100vw - 24px); right: -12px; height: 70vh; bottom: 64px; }
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
          <div class="kai-msg bot">${settings.welcomeMessage}</div>
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
        <svg viewBox="0 0 24 24"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z"/></svg>
      </button>
    `;

    setTimeout(() => {
      wrap.querySelector('#kai-toggle').addEventListener('click', toggleChat);
      wrap.querySelector('#kai-close').addEventListener('click', toggleChat);
      wrap.querySelector('#kai-send').addEventListener('click', sendMessage);
      wrap.querySelector('#kai-input').addEventListener('keydown', function (e) {
        if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
      });
    }, 0);

    return wrap;
  }

  function toggleChat() {
    isOpen = !isOpen;
    const box = document.getElementById('kai-box');
    box.classList.toggle('open', isOpen);
    if (isOpen) document.getElementById('kai-input').focus();
  }

  async function sendMessage() {
    const input = document.getElementById('kai-input');
    const text = input.value.trim();
    if (!text || isLoading) return;

    input.value = '';
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
      const msgEl = appendMessage('bot', '');

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');
        for (const line of lines) {
          // UI message stream format: lines starting with "0:" contain text deltas
          if (line.startsWith('0:"') || line.startsWith("0:'")) {
            try {
              const parsed = JSON.parse(line.slice(2));
              botText += parsed;
              msgEl.textContent = botText;
              scrollToBottom();
            } catch {}
          } else if (line.startsWith('0:')) {
            try {
              const parsed = JSON.parse(line.slice(2));
              if (typeof parsed === 'string') {
                botText += parsed;
                msgEl.textContent = botText;
                scrollToBottom();
              }
            } catch {}
          }
        }
      }

      messages.push({ role: 'assistant', content: botText });
    } catch (e) {
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
    el.textContent = text;
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
