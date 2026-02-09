(() => {
  const form = document.querySelector('.prompt');
  const input = document.getElementById('promptInput');
  const chat = document.getElementById('chat');
  const chatMessages = document.getElementById('chatMessages');
  const landingTitle = document.getElementById('landingTitle');
  const landingTitleMobile = document.getElementById('landingTitleMobile');
  const battleBtn = document.getElementById('battleBtn');
  const battleMenu = document.getElementById('battleMenu');
  const sxsControls = document.getElementById('sxsControls');
  const modelBtnA = document.getElementById('modelBtnA');
  const modelBtnB = document.getElementById('modelBtnB');
  const modelMenuA = document.getElementById('modelMenuA');
  const modelMenuB = document.getElementById('modelMenuB');
  const attachImageBtn = document.querySelector('.icon-btn[aria-label="Attach image"]');
  const addBtn = document.querySelector('.icon-btn[aria-label="Add"]');
  const textFileInput = document.getElementById('textFileInput');
  const promptFile = document.getElementById('promptFile');
  const promptFileClear = document.getElementById('promptFileClear');
  const sendBtn = document.getElementById('sendBtn');
  const sendIcon = document.getElementById('sendIcon');

  if (!form || !input) return;

  const ensureChatMode = () => {
    document.body.classList.add('is-chat');
    if (chat) chat.hidden = false;
    if (landingTitle) landingTitle.hidden = true;
    if (landingTitleMobile) landingTitleMobile.hidden = true;
    updateComposerOffset();
  };

  const updateComposerOffset = () => {
    if (!form) return;
    const rect = form.getBoundingClientRect();
    const computed = window.getComputedStyle(form);
    const bottom = Number.parseFloat(computed.bottom || '0') || 0;
    const height = rect.height || 0;
    const extraGap = 20;
    const offset = Math.max(120, Math.round(bottom + height + extraGap));
    document.documentElement.style.setProperty('--composer-offset', `${offset}px`);
  };

  let shouldAutoScroll = true;
  const isNearBottom = () => {
    if (!chatMessages) return true;
    const threshold = 80;
    return chatMessages.scrollHeight - chatMessages.scrollTop - chatMessages.clientHeight < threshold;
  };

  const scrollChatToBottom = () => {
    if (!chatMessages) return;
    if (!shouldAutoScroll) return;
    chatMessages.scrollTop = chatMessages.scrollHeight;
  };

  if (chatMessages) {
    chatMessages.addEventListener(
      'scroll',
      () => {
        shouldAutoScroll = isNearBottom();
      },
      { passive: true }
    );
  }

  const chatHistory = [];

  let isGenerating = false;
  let activeAbortController = null;
  let activeTyping = null;

  const setSendingState = (generating) => {
    isGenerating = generating;

    if (input) input.disabled = generating;
    if (addBtn) addBtn.disabled = generating;
    if (attachImageBtn) attachImageBtn.disabled = generating;

    if (sendBtn) {
      sendBtn.setAttribute('aria-label', generating ? 'Stop' : 'Send');
      sendBtn.dataset.state = generating ? 'stop' : 'send';
    }
    if (sendIcon) {
      sendIcon.className = generating ? 'fa-solid fa-stop' : 'fa-solid fa-arrow-right';
    }
  };

  const stopGeneration = () => {
    if (activeAbortController) {
      try {
        activeAbortController.abort();
      } catch {
        // ignore
      }
    }
    if (activeTyping && typeof activeTyping.cancel === 'function') {
      activeTyping.cancel();
    }
    activeAbortController = null;
    activeTyping = null;
    setSendingState(false);
  };

  if (sendBtn) {
    sendBtn.addEventListener('click', (e) => {
      if (!isGenerating) return;
      e.preventDefault();
      stopGeneration();
    });
  }

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      if (activeTyping && typeof activeTyping.kick === 'function') activeTyping.kick();
    }
  });

  const typewriterToElement = (el, fullText, opts = {}) => {
    const text = String(fullText || '');
    const minDelay = typeof opts.minDelay === 'number' ? opts.minDelay : 10;
    const maxDelay = typeof opts.maxDelay === 'number' ? opts.maxDelay : 22;
    const avgDelay = Math.max(1, Math.round((minDelay + maxDelay) / 2));

    let i = 0;
    let cancelled = false;
    let timer = null;

    const startAt = performance.now();

    let doneResolve;
    const done = new Promise((resolve) => {
      doneResolve = resolve;
    });

    const step = () => {
      if (cancelled) return;
      if (!el) return;

      const now = performance.now();
      const target = Math.min(text.length, Math.max(i + 1, Math.floor((now - startAt) / avgDelay)));
      i = target;
      el.textContent = text.slice(0, i);
      scrollChatToBottom();

      if (i >= text.length) {
        if (typeof doneResolve === 'function') doneResolve('done');
        return;
      }
      const delay = Math.round(minDelay + Math.random() * (maxDelay - minDelay));
      timer = window.setTimeout(step, delay);
    };

    const start = () => {
      if (!el) return;
      el.textContent = '';
      step();
    };

    const cancel = () => {
      cancelled = true;
      if (timer) window.clearTimeout(timer);
      if (typeof doneResolve === 'function') doneResolve('cancelled');
    };

    const kick = () => {
      if (cancelled) return;
      if (timer) window.clearTimeout(timer);
      step();
    };

    start();
    return { cancel, kick, done };
  };

  const getSelectedModelUi = () => {
    const btn = modelBtnA || null;
    if (!btn) return { name: 'AI' };
    const nameEl = btn.querySelector('.select-btn__label');
    const name = nameEl ? nameEl.textContent.trim() : 'AI';
    return { name };
  };

  const appendUserMessage = (text) => {
    if (!chatMessages) return;
    const row = document.createElement('div');
    row.className = 'chat__row chat__row--user';
    const bubble = document.createElement('div');
    bubble.className = 'chat__bubble';
    bubble.textContent = text;
    row.appendChild(bubble);
    chatMessages.appendChild(row);
  };

  const appendAiMessage = (text) => {
    if (!chatMessages) return;
    const { name } = getSelectedModelUi();

    const row = document.createElement('div');
    row.className = 'chat__row chat__row--ai';

    const wrap = document.createElement('div');
    wrap.className = 'chat__ai';

    const head = document.createElement('div');
    head.className = 'chat__ai-head';

    const iconWrap = document.createElement('span');
    iconWrap.className = 'chat__ai-icon';
    const safeIcon = document.createElement('i');
    safeIcon.className = 'fa-solid fa-robot';
    safeIcon.setAttribute('aria-hidden', 'true');
    iconWrap.appendChild(safeIcon);
    head.appendChild(iconWrap);

    const label = document.createElement('span');
    label.textContent = name;
    head.appendChild(label);

    const msg = document.createElement('div');
    msg.className = 'chat__ai-text';
    msg.textContent = text;

    wrap.appendChild(head);
    wrap.appendChild(msg);
    row.appendChild(wrap);
    chatMessages.appendChild(row);

    return { row, msg };
  };

  const requestAiReply = async (message, signal) => {
    const baseUrl =
      typeof window !== 'undefined' && typeof window.WORKER_CHAT_URL === 'string'
        ? window.WORKER_CHAT_URL.trim().replace(/\/+$/, '')
        : '';
    const endpoint = baseUrl ? `${baseUrl}/api/chat` : '/api/chat';

    const selectedKey = selectedModelA;
    const history = chatHistory.slice(-12);

    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message, modelKey: selectedKey, messages: history }),
      signal,
    });

    const data = await res.json().catch(() => null);
    if (!res.ok) {
      const err = data && typeof data.error === 'string' ? data.error : 'Request failed';
      const status = data && typeof data.status === 'number' ? data.status : null;
      const details = data && typeof data.details === 'string' ? data.details : '';
      const msg = `${err}${status ? ` (HF ${status})` : ''}${details ? `: ${details}` : ''}`;
      throw new Error(msg);
    }

    const reply = data && typeof data.reply === 'string' ? data.reply : '';
    if (!reply) throw new Error('Empty reply');
    return reply;
  };

  input.addEventListener('keydown', (e) => {
    if (e.key !== 'Enter') return;
    if (e.shiftKey) return;
    e.preventDefault();
    if (typeof form.requestSubmit === 'function') {
      form.requestSubmit();
      return;
    }
    form.dispatchEvent(new Event('submit', { cancelable: true }));
  });

  if (attachImageBtn) {
    attachImageBtn.addEventListener('click', () => {
      attachImageBtn.classList.toggle('is-active');
    });
  }

  const getFileExt = (name) => {
    const safe = (name || '').trim();
    const dot = safe.lastIndexOf('.');
    if (dot === -1) return '';
    return safe.slice(dot + 1).toLowerCase();
  };

  const isAllowedTextFile = (file) => {
    if (!file) return false;
    if (typeof file.type === 'string' && file.type.startsWith('text/')) return true;
    const allowedExts = new Set([
      'txt',
      'md',
      'json',
      'csv',
      'xml',
      'yaml',
      'yml',
      'html',
      'htm',
      'css',
      'js',
      'ts',
    ]);
    return allowedExts.has(getFileExt(file.name));
  };

  const iconForExt = (ext) => {
    switch ((ext || '').toLowerCase()) {
      case 'html':
      case 'htm':
        return 'fa-brands fa-html5';
      case 'css':
        return 'fa-brands fa-css3-alt';
      case 'js':
        return 'fa-brands fa-js';
      case 'ts':
      case 'json':
      case 'xml':
      case 'yaml':
      case 'yml':
      case 'md':
      case 'txt':
        return 'fa-regular fa-file-lines';
      case 'csv':
        return 'fa-solid fa-file-csv';
      default:
        return 'fa-regular fa-file-lines';
    }
  };

  const setSelectedFile = (file) => {
    const has = !!file;
    form.classList.toggle('prompt--has-file', has);
    if (!promptFile) return;

    promptFile.hidden = !has;
    if (!has) {
      promptFile.removeAttribute('title');
      const icon = promptFile.querySelector('.prompt__file-tile i');
      if (icon) icon.className = 'fa-regular fa-file-lines';
      return;
    }

    promptFile.title = file.name;
    const ext = getFileExt(file.name);
    const icon = promptFile.querySelector('.prompt__file-tile i');
    if (icon) icon.className = iconForExt(ext);

    updateComposerOffset();
  };

  const clearSelectedFile = () => {
    if (textFileInput) textFileInput.value = '';
    setSelectedFile(null);
    updateComposerOffset();
  };

  window.addEventListener('resize', () => {
    if (!document.body.classList.contains('is-chat')) return;
    updateComposerOffset();
  });

  if (addBtn && textFileInput) {
    addBtn.addEventListener('click', () => {
      textFileInput.click();
    });
  }

  if (textFileInput) {
    textFileInput.addEventListener('change', () => {
      const file = textFileInput.files && textFileInput.files[0] ? textFileInput.files[0] : null;
      if (!file) {
        clearSelectedFile();
        return;
      }

      if (!isAllowedTextFile(file)) {
        clearSelectedFile();
        alert('Only text files are allowed.');
        return;
      }

      setSelectedFile(file);
    });
  }

  if (promptFileClear) {
    promptFileClear.addEventListener('click', () => {
      clearSelectedFile();
    });
  }

  const getBattleBtnPrimaryIcon = () => {
    if (!battleBtn) return null;
    const children = Array.from(battleBtn.children);
    return (
      children.find((el) => el.tagName === 'I') ||
      children.find((el) => el.tagName === 'SVG') ||
      null
    );
  };

  const battleBtnLabel = battleBtn ? battleBtn.querySelector('.pill__label') : null;
  const battleBtnPrimaryIcon = getBattleBtnPrimaryIcon();
  const defaultBattle = {
    label: battleBtnLabel ? battleBtnLabel.textContent || 'Battle' : 'Battle',
    iconClass: battleBtnPrimaryIcon && battleBtnPrimaryIcon.tagName === 'I' ? battleBtnPrimaryIcon.className : '',
  };

  const setMenuOpen = (open) => {
    if (!battleBtn || !battleMenu) return;
    battleMenu.dataset.state = open ? 'open' : 'closed';
    battleBtn.setAttribute('aria-expanded', open ? 'true' : 'false');
  };

  const setModelMenuOpen = (which, open) => {
    const btn = which === 'A' ? modelBtnA : modelBtnB;
    const menu = which === 'A' ? modelMenuA : modelMenuB;
    if (!btn || !menu) return;
    menu.dataset.state = open ? 'open' : 'closed';
    btn.setAttribute('aria-expanded', open ? 'true' : 'false');
  };

  const isModelMenuOpen = (which) => {
    const menu = which === 'A' ? modelMenuA : modelMenuB;
    if (!menu) return false;
    return menu.dataset.state === 'open';
  };

  const closeAllMenus = () => {
    setMenuOpen(false);
    setModelMenuOpen('A', false);
    setModelMenuOpen('B', false);
  };

  const setMode = (mode) => {
    if (!sxsControls) return;
    const normalized = (mode || '').trim().toLowerCase();
    const isSxs = normalized === 'side by side';
    const isDirect = normalized === 'direct chat';

    if (attachImageBtn) {
      attachImageBtn.hidden = !isDirect;
      if (!isDirect) attachImageBtn.classList.remove('is-active');
    }

    const shouldShow = isSxs || isDirect;
    sxsControls.hidden = !shouldShow;

    const items = Array.from(sxsControls.querySelectorAll('.sxs__item'));
    const second = items[1] || null;
    if (second) second.hidden = isDirect;

    if (!shouldShow || isDirect) {
      setModelMenuOpen('B', false);
    }
    if (!shouldShow) {
      setModelMenuOpen('A', false);
    }
  };

  const setModelButtonFromItem = (btn, item) => {
    if (!btn || !item) return;
    const labelEl = btn.querySelector('.select-btn__label');
    const iconWrap = btn.querySelector('.select-btn__icon');
    const label = item.querySelector('.model-menu__label');
    const icon = item.querySelector('.model-menu__icon');
    if (!labelEl || !iconWrap || !label || !icon) return;

    labelEl.textContent = label.textContent.trim();
    iconWrap.textContent = '';
    const iconNode = icon.querySelector('svg, img');
    if (iconNode) iconWrap.appendChild(iconNode.cloneNode(true));
  };

  let selectedModelA = null;
  let selectedModelB = null;

  const updateDisabledModels = () => {
    if (modelMenuA && modelMenuB) {
      const itemsA = Array.from(modelMenuA.querySelectorAll('.model-menu__item'));
      const itemsB = Array.from(modelMenuB.querySelectorAll('.model-menu__item'));

      for (const it of itemsA) {
        const shouldDisable = !!selectedModelB && it.dataset.model === selectedModelB;
        it.disabled = shouldDisable;
        it.classList.toggle('is-disabled', shouldDisable);
        it.setAttribute('aria-disabled', shouldDisable ? 'true' : 'false');
      }

      for (const it of itemsB) {
        const shouldDisable = !!selectedModelA && it.dataset.model === selectedModelA;
        it.disabled = shouldDisable;
        it.classList.toggle('is-disabled', shouldDisable);
        it.setAttribute('aria-disabled', shouldDisable ? 'true' : 'false');
      }
    }
  };

  const initModelButtons = () => {
    if (modelBtnA && modelMenuA) {
      const first = modelMenuA.querySelector('.model-menu__item[data-model="chatgpt"]');
      if (first) {
        setModelButtonFromItem(modelBtnA, first);
        selectedModelA = first.dataset.model || null;
      }
    }
    if (modelBtnB && modelMenuB) {
      const first = modelMenuB.querySelector('.model-menu__item[data-model="gemini"]');
      if (first) {
        setModelButtonFromItem(modelBtnB, first);
        selectedModelB = first.dataset.model || null;
      }
    }

    updateDisabledModels();
  };

  const isMenuOpen = () => {
    if (!battleMenu) return false;
    return battleMenu.dataset.state === 'open';
  };

  if (battleBtn && battleMenu) {
    battleBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      setMenuOpen(!isMenuOpen());
    });

    const applySelectionToBattleBtn = (menuItem) => {
      if (!battleBtnLabel || !battleBtnPrimaryIcon) return;
      const titleEl = menuItem.querySelector('.menu__title');
      const iconEl = menuItem.querySelector('.menu__icon');

      const nextLabel = titleEl ? titleEl.textContent.trim() : '';
      if (!nextLabel) return;

      if (nextLabel.toLowerCase() === defaultBattle.label.toLowerCase()) {
        battleBtnLabel.textContent = defaultBattle.label;
        if (battleBtnPrimaryIcon.tagName === 'I') {
          battleBtnPrimaryIcon.className = defaultBattle.iconClass;
        }
        setMode('Battle');
        return;
      }

      battleBtnLabel.textContent = nextLabel;

      setMode(nextLabel);

      if (battleBtnPrimaryIcon.tagName === 'I' && iconEl && iconEl.tagName === 'I') {
        const cleaned = iconEl.className
          .split(' ')
          .filter((c) => c && c !== 'menu__icon')
          .join(' ');
        battleBtnPrimaryIcon.className = cleaned;
      }
    };

    const menuItems = Array.from(battleMenu.querySelectorAll('.menu__item'));
    for (const item of menuItems) {
      item.addEventListener('click', () => {
        applySelectionToBattleBtn(item);
        setMenuOpen(false);
      });
    }

    battleMenu.addEventListener('click', (e) => {
      e.stopPropagation();
    });

    document.addEventListener('click', () => {
      closeAllMenus();
    });

    document.addEventListener('keydown', (e) => {
      if (e.key !== 'Escape') return;
      const anyOpen = isMenuOpen() || isModelMenuOpen('A') || isModelMenuOpen('B');
      if (!anyOpen) return;
      closeAllMenus();
      battleBtn.focus();
    });
  }

  if (modelBtnA && modelMenuA) {
    modelBtnA.addEventListener('click', (e) => {
      e.stopPropagation();
      setModelMenuOpen('B', false);
      setModelMenuOpen('A', !isModelMenuOpen('A'));
    });

    modelMenuA.addEventListener('click', (e) => {
      e.stopPropagation();
    });

    const inputA = modelMenuA.querySelector('.model-menu__input');
    if (inputA) {
      inputA.addEventListener('click', (e) => e.stopPropagation());
      inputA.addEventListener('input', () => {
        const q = inputA.value.trim().toLowerCase();
        const items = Array.from(modelMenuA.querySelectorAll('.model-menu__item'));
        for (const it of items) {
          const label = it.querySelector('.model-menu__label');
          const text = (label ? label.textContent : it.textContent).trim().toLowerCase();
          it.style.display = !q || text.includes(q) ? '' : 'none';
        }
      });
    }

    modelMenuA.addEventListener('click', (e) => {
      const item = e.target.closest('.model-menu__item');
      if (!item) return;
      if (item.disabled || item.getAttribute('aria-disabled') === 'true') return;
      if (item.dataset.model && item.dataset.model === selectedModelB) return;
      setModelButtonFromItem(modelBtnA, item);
      selectedModelA = item.dataset.model || null;
      updateDisabledModels();
      setModelMenuOpen('A', false);
    });
  }

  if (modelBtnB && modelMenuB) {
    modelBtnB.addEventListener('click', (e) => {
      e.stopPropagation();
      setModelMenuOpen('A', false);
      setModelMenuOpen('B', !isModelMenuOpen('B'));
    });

    modelMenuB.addEventListener('click', (e) => {
      e.stopPropagation();
    });

    const inputB = modelMenuB.querySelector('.model-menu__input');
    if (inputB) {
      inputB.addEventListener('click', (e) => e.stopPropagation());
      inputB.addEventListener('input', () => {
        const q = inputB.value.trim().toLowerCase();
        const items = Array.from(modelMenuB.querySelectorAll('.model-menu__item'));
        for (const it of items) {
          const label = it.querySelector('.model-menu__label');
          const text = (label ? label.textContent : it.textContent).trim().toLowerCase();
          it.style.display = !q || text.includes(q) ? '' : 'none';
        }
      });
    }

    modelMenuB.addEventListener('click', (e) => {
      const item = e.target.closest('.model-menu__item');
      if (!item) return;
      if (item.disabled || item.getAttribute('aria-disabled') === 'true') return;
      if (item.dataset.model && item.dataset.model === selectedModelA) return;
      setModelButtonFromItem(modelBtnB, item);
      selectedModelB = item.dataset.model || null;
      updateDisabledModels();
      setModelMenuOpen('B', false);
    });
  }

  initModelButtons();
  setMode(battleBtnLabel ? battleBtnLabel.textContent.trim() : 'Battle');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    if (isGenerating) return;

    const value = input.value.trim();
    if (!value) {
      input.focus();
      return;
    }

    ensureChatMode();
    appendUserMessage(value);
    const ai = appendAiMessage('');
    shouldAutoScroll = true;
    scrollChatToBottom();

    setSendingState(true);
    activeAbortController = new AbortController();

    chatHistory.push({ role: 'user', content: value });

    input.value = '';
    input.focus();

    try {
      const reply = await requestAiReply(value, activeAbortController.signal);
      chatHistory.push({ role: 'assistant', content: reply });
      if (ai && ai.msg) {
        activeTyping = typewriterToElement(ai.msg, reply, { minDelay: 10, maxDelay: 22 });
        await activeTyping.done;
      }
    } catch (err) {
      if (ai && ai.msg) {
        const isAbort = err && typeof err === 'object' && (err.name === 'AbortError' || err.code === 20);
        ai.msg.textContent = isAbort
          ? 'متوقف شد.'
          : `Error: ${err instanceof Error ? err.message : 'Request failed'}`;
      }
    } finally {
      activeAbortController = null;
      activeTyping = null;
      setSendingState(false);
      scrollChatToBottom();
    }
  });
})();
