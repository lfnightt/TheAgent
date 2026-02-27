(() => {
  const form = document.querySelector('.prompt');
  const input = document.getElementById('promptInput');
  const chat = document.getElementById('chat');
  const chatMessages = document.getElementById('chatMessages');
  const landingTitle = document.getElementById('landingTitle');
  const landingTitleMobile = document.getElementById('landingTitleMobile');
  const newChatBtn = document.getElementById('newChatBtn');
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
  const sidebarMenuBtn = document.querySelector('.sidebar__top .icon-btn[aria-label="Menu"]');
  const mobileSidebarBtn = document.querySelector('.header__left .header__icon[aria-label="Sidebar"]');

  if (document.documentElement.classList.contains('no-fa')) {
    document.body.classList.add('no-fa');
  }

  window.setTimeout(() => {
    if (document.documentElement.classList.contains('no-fa')) {
      document.body.classList.add('no-fa');
    }
  }, 0);

  if (!form || !input) return;

  const prefersReducedMotion = () => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false;
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  };

  const animateLandingTitle = (el) => {
    if (!el) return;
    if (el.hidden) return;
    if (el.offsetParent === null) return;
    const finalText = String(el.dataset.finalText || el.textContent || '').trim();
    if (!finalText) return;
    el.dataset.finalText = finalText;

    el.classList.add('landing-title--fx');
    el.classList.add('landing-title--typing');

    const letterDelayMs = 180;

    el.classList.add('landing-title--animating');

    let currentIndex = 0;
    let timer = null;

    const typeNextLetter = () => {
      if (currentIndex >= finalText.length) {
        el.classList.remove('landing-title--animating');
        el.classList.add('landing-title--settled');
        el.classList.remove('landing-title--typing');
        return;
      }

      el.textContent = finalText.slice(0, currentIndex + 1);
      currentIndex++;

      timer = window.setTimeout(typeNextLetter, letterDelayMs);
    };

    el.textContent = '';
    timer = window.setTimeout(typeNextLetter, 400);

    return () => {
      if (timer) window.clearTimeout(timer);
      el.textContent = finalText;
      el.classList.remove('landing-title--animating');
      el.classList.remove('landing-title--typing');
    };
  };

  const playLandingTitles = () => {
    animateLandingTitle(landingTitle);
    animateLandingTitle(landingTitleMobile);
  };

  window.requestAnimationFrame(() => {
    window.requestAnimationFrame(() => {
      window.setTimeout(() => playLandingTitles(), 300);
    });
  });

  if (sidebarMenuBtn) {
    sidebarMenuBtn.addEventListener('click', () => {
      document.body.classList.toggle('is-sidebar-open');
      updateComposerOffset();
    });
  }

  if (mobileSidebarBtn) {
    mobileSidebarBtn.addEventListener('click', () => {
      document.body.classList.toggle('is-sidebar-open');
      updateComposerOffset();
    });
  }

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

  let isImageMode = false;

  const setImageMode = (enabled) => {
    isImageMode = !!enabled;
    if (attachImageBtn) attachImageBtn.classList.toggle('is-active', isImageMode);
    if (input) input.placeholder = isImageMode ? 'Describe the image you want to generate…' : 'Ask anything...';
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

  const CHAT_STORAGE_KEY = 'theagent_chat_history';
  const CHAT_SESSION_KEY = 'theagent_chat_session';

  const loadChatFromStorage = () => {
    try {
      const saved = localStorage.getItem(CHAT_STORAGE_KEY);
      const session = localStorage.getItem(CHAT_SESSION_KEY);
      if (saved && session) {
        const messages = JSON.parse(saved);
        const sessionData = JSON.parse(session);
        return { messages, mode: sessionData.mode || 'direct chat' };
      }
    } catch {
      // ignore
    }
    return null;
  };

  const saveChatToStorage = () => {
    try {
      localStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(chatHistory));
      localStorage.setItem(CHAT_SESSION_KEY, JSON.stringify({ mode: currentMode || 'direct chat' }));
    } catch {
      // ignore
    }
  };

  const clearChatStorage = () => {
    try {
      localStorage.removeItem(CHAT_STORAGE_KEY);
      localStorage.removeItem(CHAT_SESSION_KEY);
    } catch {
      // ignore
    }
  };

  const formatCodeBlocks = (text, opts = {}) => {
    const source = String(text || '');
    if (!source) return '';

    const allowPartial = opts && opts.allowPartial === true;

    const escapeHtml = (str) =>
      String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');

    const inlineCode = (raw) => `<code class="inline-code">${escapeHtml(raw)}</code>`;

    const normalizeLang = (raw) => {
      const s = String(raw || '').trim().toLowerCase();
      if (!s) return '';
      if (s === 'js') return 'javascript';
      if (s === 'ts') return 'typescript';
      if (s === 'py') return 'python';
      if (s === 'sh' || s === 'shell') return 'bash';
      return s;
    };

    const renderFence = (language, codeText) => {
      const lang = normalizeLang(language);
      const icon = 'fa-regular fa-file-code';
      const label = lang || 'text';
      const safeLang = escapeHtml(label);
      const safeCode = escapeHtml(codeText);
      const classLang = lang ? ` language-${escapeHtml(lang)}` : '';
      return (
        `<pre class="code-block" data-lang="${safeLang}">` +
        `<div class="code-header">` +
        `<div class="code-header__left"><i class="${icon}" aria-hidden="true"></i><span class="lang">${safeLang}</span></div>` +
        `<button class="copy-btn" type="button" data-copy="code"><i class="fa-regular fa-copy" aria-hidden="true"></i><span>Copy</span></button>` +
        `</div>` +
        `<code class="hljs${classLang}">${safeCode}</code>` +
        `</pre>`
      );
    };

    const out = [];
    let i = 0;
    while (i < source.length) {
      const open = source.indexOf('```', i);
      if (open === -1) {
        const tail = source.slice(i);
        out.push(escapeHtml(tail).replace(/`([^`]+)`/g, (_, c) => inlineCode(c)));
        break;
      }

      const before = source.slice(i, open);
      out.push(escapeHtml(before).replace(/`([^`]+)`/g, (_, c) => inlineCode(c)));

      const afterTicks = open + 3;
      const nl = source.indexOf('\n', afterTicks);
      if (nl === -1) {
        // Incomplete fence header
        if (allowPartial) {
          const lang = source.slice(afterTicks).trim();
          out.push(renderFence(lang, ''));
        } else {
          out.push(escapeHtml(source.slice(open)));
        }
        break;
      }

      const lang = source.slice(afterTicks, nl).trim();
      const close = source.indexOf('```', nl + 1);
      if (close === -1) {
        if (allowPartial) {
          const codeText = source.slice(nl + 1);
          out.push(renderFence(lang, codeText));
          break;
        }
        // Not allowed to render partial, just escape remaining
        out.push(escapeHtml(source.slice(open)));
        break;
      }

      const codeText = source.slice(nl + 1, close);
      out.push(renderFence(lang, codeText));
      i = close + 3;
    }

    return out.join('');
  };

  const scheduleHighlight = (() => {
    const timers = new WeakMap();
    return (root) => {
      if (!root) return;
      const hljs = typeof window !== 'undefined' ? window.hljs : null;
      if (!hljs || typeof hljs.highlightElement !== 'function') return;

      const prev = timers.get(root);
      if (prev) window.clearTimeout(prev);
      const t = window.setTimeout(() => {
        const codes = root.querySelectorAll ? root.querySelectorAll('pre.code-block code') : [];
        for (const codeEl of codes) {
          try {
            codeEl.removeAttribute('data-highlighted');
            hljs.highlightElement(codeEl);
          } catch {
            // ignore
          }
        }
      }, 80);
      timers.set(root, t);
    };
  })();

  // Copy code function
  const copyCode = (btn) => {
    const pre = btn ? btn.closest('pre') : null;
    const code = pre ? pre.querySelector('code') : null;
    const text = code ? code.textContent : '';
    if (!text) return;

    const setBtn = (state) => {
      if (!btn) return;
      if (state === 'copied') {
        btn.innerHTML = '<i class="fa-solid fa-check" aria-hidden="true"></i><span>Copied</span>';
        return;
      }
      btn.innerHTML = '<i class="fa-regular fa-copy" aria-hidden="true"></i><span>Copy</span>';
    };

    const fallbackCopy = () => {
      try {
        const ta = document.createElement('textarea');
        ta.value = text;
        ta.setAttribute('readonly', '');
        ta.style.position = 'fixed';
        ta.style.left = '-9999px';
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        ta.remove();
        setBtn('copied');
        window.setTimeout(() => setBtn('idle'), 1400);
      } catch {
        // ignore
      }
    };

    if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
      navigator.clipboard
        .writeText(text)
        .then(() => {
          setBtn('copied');
          window.setTimeout(() => setBtn('idle'), 1400);
        })
        .catch(() => fallbackCopy());
      return;
    }
    fallbackCopy();
  };

  document.addEventListener('click', (e) => {
    const btn = e.target && e.target.closest ? e.target.closest('button[data-copy="code"]') : null;
    if (!btn) return;
    e.preventDefault();
    copyCode(btn);
  });

  const restoreChatFromStorage = () => {
    const saved = loadChatFromStorage();
    if (!saved || !saved.messages || saved.messages.length === 0) return false;

    // Restore mode
    if (saved.mode) {
      setMode(saved.mode);
    }

    // Show chat UI
    document.body.classList.add('is-chat');
    if (chat) chat.hidden = false;
    if (landingTitle) landingTitle.hidden = true;
    if (landingTitleMobile) landingTitleMobile.hidden = true;

    // Restore messages visually
    for (const msg of saved.messages) {
      if (msg.role === 'user') {
        appendUserMessage(msg.content);
      } else if (msg.role === 'assistant') {
        // Check if this is an image message
        if (msg.imageUrl) {
          appendAiImageMessage(msg.imageUrl);
        } else {
          const aiMsg = appendAiMessage('');
          if (aiMsg && aiMsg.msg) {
            aiMsg.msg.innerHTML = formatCodeBlocks(msg.content, { allowPartial: false });
            scheduleHighlight(aiMsg.msg);
          }
        }
      }
    }

    updateComposerOffset();
    return true;
  };

  const chatHistory = [];

  let isGenerating = false;
  let activeAbortController = null;
  let activeTyping = null;
  let pendingVote = false;

  const setSendingState = (generating) => {
    isGenerating = generating;

    if (input) input.disabled = generating;
    if (addBtn) addBtn.disabled = generating;
    if (attachImageBtn) attachImageBtn.disabled = generating;

    if (!generating) {
      if (input) input.disabled = pendingVote;
      if (addBtn) addBtn.disabled = pendingVote;
      if (attachImageBtn) attachImageBtn.disabled = pendingVote;
    }

    if (sendBtn) {
      sendBtn.setAttribute('aria-label', generating ? 'Stop' : 'Send');
      sendBtn.dataset.state = generating ? 'stop' : 'send';
      sendBtn.disabled = generating || pendingVote;
    }
    if (sendIcon) {
      sendIcon.className = generating ? 'fa-solid fa-stop' : 'fa-solid fa-arrow-right';
    }
  };

  const setPendingVote = (pending) => {
    pendingVote = !!pending;
    if (pendingVote) {
      if (input) input.disabled = true;
      if (addBtn) addBtn.disabled = true;
      if (attachImageBtn) attachImageBtn.disabled = true;
      if (sendBtn) sendBtn.disabled = true;
    } else {
      if (!isGenerating) {
        if (input) input.disabled = false;
        if (addBtn) addBtn.disabled = false;
        if (attachImageBtn) attachImageBtn.disabled = currentMode !== 'direct chat';
        if (sendBtn) sendBtn.disabled = false;
      }
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
      const partial = text.slice(0, i);
      if (partial.includes('```')) {
        el.innerHTML = formatCodeBlocks(partial, { allowPartial: true });
        scheduleHighlight(el);
      } else {
        el.textContent = partial;
      }
      scrollChatToBottom();

      if (i >= text.length) {
        if (el && text.includes('```')) {
          el.innerHTML = formatCodeBlocks(text, { allowPartial: false });
          scheduleHighlight(el);
        }
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

  const getSelectedModelUi = (which = 'A') => {
    const btn = which === 'B' ? modelBtnB : modelBtnA;
    if (!btn) return { name: 'AI', iconNode: null };
    const nameEl = btn.querySelector('.select-btn__label');
    const name = nameEl ? nameEl.textContent.trim() : 'AI';
    const iconWrap = btn.querySelector('.select-btn__icon');
    const iconNode = iconWrap ? iconWrap.querySelector('svg, img, i') : null;
    return { name, iconNode };
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
    const { name } = getSelectedModelUi('A');

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

  const appendAiImageMessage = (imgUrl) => {
    if (!chatMessages) return;

    const row = document.createElement('div');
    row.className = 'chat__row chat__row--ai';

    const wrap = document.createElement('div');
    wrap.className = 'chat__ai';

    const head = document.createElement('div');
    head.className = 'chat__ai-head';

    const iconWrap = document.createElement('span');
    iconWrap.className = 'chat__ai-icon';
    const safeIcon = document.createElement('i');
    safeIcon.className = 'fa-regular fa-image';
    safeIcon.setAttribute('aria-hidden', 'true');
    iconWrap.appendChild(safeIcon);
    head.appendChild(iconWrap);

    const label = document.createElement('span');
    label.textContent = 'Image';
    head.appendChild(label);

    const imgContainer = document.createElement('div');
    imgContainer.className = 'chat__image-container';

    const img = document.createElement('img');
    img.className = 'chat__image';
    img.alt = '';
    img.loading = 'lazy';
    img.decoding = 'async';
    img.src = imgUrl;

    // Hover controls overlay
    const controls = document.createElement('div');
    controls.className = 'chat__image-controls';

    // Download button
    const downloadBtn = document.createElement('button');
    downloadBtn.className = 'chat__image-btn';
    downloadBtn.setAttribute('aria-label', 'Download image');
    downloadBtn.title = 'Download';
    downloadBtn.innerHTML = '<i class="fa-solid fa-download"></i>';
    downloadBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const link = document.createElement('a');
      link.href = imgUrl;
      link.download = `generated-image-${Date.now()}.png`;
      link.click();
    });

    // Fullscreen button
    const fullscreenBtn = document.createElement('button');
    fullscreenBtn.className = 'chat__image-btn';
    fullscreenBtn.setAttribute('aria-label', 'View fullscreen');
    fullscreenBtn.title = 'Fullscreen';
    fullscreenBtn.innerHTML = '<i class="fa-solid fa-expand"></i>';
    fullscreenBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      openImageModal(imgUrl);
    });

    controls.appendChild(downloadBtn);
    controls.appendChild(fullscreenBtn);

    imgContainer.appendChild(img);
    imgContainer.appendChild(controls);

    wrap.appendChild(head);
    wrap.appendChild(imgContainer);
    row.appendChild(wrap);
    chatMessages.appendChild(row);

    return { row, img };
  };

  const setThinking = (el, text = 'Thinking…') => {
    if (!el) return;
    el.textContent = '';
    const wrap = document.createElement('span');
    wrap.className = 'thinking thinking--shimmer';
    wrap.textContent = text;
    el.appendChild(wrap);
  };

  const clearThinking = (el) => {
    if (!el) return;
    const thinking = el.querySelector('.thinking');
    if (thinking) thinking.remove();
  };

  const appendBattleAiMessage = (opts = {}) => {
    if (!chatMessages) return;

    const mode = typeof opts.mode === 'string' ? opts.mode : currentMode;
    const headerA = opts.headerA || null;
    const headerB = opts.headerB || null;

    const row = document.createElement('div');
    row.className = 'chat__row chat__row--battle';

    const makePanel = (title, meta) => {
      const panel = document.createElement('div');
      panel.className = 'battle-panel';

      const head = document.createElement('div');
      head.className = 'battle-panel__head';

      const iconWrap = document.createElement('span');
      iconWrap.className = 'battle-panel__head-icon';
      head.appendChild(iconWrap);

      const label = document.createElement('span');
      label.textContent = title;
      head.appendChild(label);

      if (meta && typeof meta.name === 'string') {
        label.textContent = meta.name;
      }
      if (meta && meta.iconNode) {
        iconWrap.appendChild(meta.iconNode.cloneNode(true));
      }

      const body = document.createElement('div');
      body.className = 'battle-panel__body';
      body.textContent = '';

      panel.appendChild(head);
      panel.appendChild(body);

      return { panel, body, head, iconWrap, label };
    };

    const a = makePanel('Model One', headerA);
    const b = makePanel('Model Two', headerB);

    row.appendChild(a.panel);
    row.appendChild(b.panel);
    chatMessages.appendChild(row);

    return {
      row,
      msgA: a.body,
      msgB: b.body,
      panelA: a.panel,
      panelB: b.panel,
      headA: a.head,
      headB: b.head,
      headIconA: a.iconWrap,
      headIconB: b.iconWrap,
      headLabelA: a.label,
      headLabelB: b.label,
      mode,
    };
  };

  const getRandomModelMeta = (excludeModelKey = '') => {
    const items = [];
    const pushFromMenu = (menu) => {
      if (!menu) return;
      const its = Array.from(menu.querySelectorAll('.model-menu__item'));
      for (const it of its) {
        const key = typeof it.dataset.model === 'string' ? it.dataset.model.trim() : '';
        if (!key) continue;
        if (excludeModelKey && key === excludeModelKey) continue;

        const labelEl = it.querySelector('.model-menu__label');
        const name = labelEl ? labelEl.textContent.trim() : it.textContent.trim();
        const iconEl = it.querySelector('.model-menu__icon');
        items.push({ key, name, iconEl });
      }
    };
    pushFromMenu(modelMenuA);
    pushFromMenu(modelMenuB);

    if (!items.length) return { key: '', name: 'AI', iconNode: null };
    const pick = items[Math.floor(Math.random() * items.length)];
    const iconNode = pick && pick.iconEl ? pick.iconEl.querySelector('svg, img, i') : null;
    return { key: pick.key, name: pick.name || 'AI', iconNode };
  };

  const setBattleHeaderToModel = (headEl, iconWrap, labelEl, meta) => {
    if (!headEl || !iconWrap || !labelEl || !meta) return;

    headEl.classList.remove('is-switching');
    void headEl.offsetWidth;
    headEl.classList.add('is-switching');

    window.setTimeout(() => {
      iconWrap.textContent = '';
      if (meta.iconNode) {
        iconWrap.appendChild(meta.iconNode.cloneNode(true));
      }
      labelEl.textContent = meta.name;
    }, 260);

    window.setTimeout(() => {
      headEl.classList.remove('is-switching');
    }, 560);
  };

  const randomizeBattleHeaders = (ai) => {
    if (!ai) return;
    const metaA = getRandomModelMeta('');
    const metaB = getRandomModelMeta(metaA.key);
    setBattleHeaderToModel(ai.headA, ai.headIconA, ai.headLabelA, metaA);
    setBattleHeaderToModel(ai.headB, ai.headIconB, ai.headLabelB, metaB);
  };

  const appendBattleVoteBar = (ai) => {
    const panelA = ai ? ai.panelA : null;
    const panelB = ai ? ai.panelB : null;

    const existing = document.getElementById('battleVoteBar');
    if (existing) existing.remove();

    const bar = document.createElement('div');
    bar.id = 'battleVoteBar';
    bar.className = 'vote-bar vote-bar--fixed';

    const clearPanelStates = () => {
      if (panelA) {
        panelA.classList.remove('is-green');
        panelA.classList.remove('is-red');
      }
      if (panelB) {
        panelB.classList.remove('is-green');
        panelB.classList.remove('is-red');
      }
    };

    const setPanelState = (stateA, stateB) => {
      clearPanelStates();
      if (panelA && stateA) panelA.classList.add(stateA);
      if (panelB && stateB) panelB.classList.add(stateB);
    };

    const makeBtn = (label) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'vote-btn';
      btn.textContent = label;
      return btn;
    };

    const btnA = makeBtn('Model one was better');
    const btnBothGood = makeBtn('Both were good');
    const btnBothBad = makeBtn('Both were bad');
    const btnB = makeBtn('Model two was better');

    const clearBtnStates = () => {
      for (const b of [btnA, btnBothGood, btnBothBad, btnB]) {
        b.classList.remove('is-green');
        b.classList.remove('is-red');
      }
    };

    const hover = (which) => {
      clearBtnStates();
      clearPanelStates();
      if (which === 'a') {
        btnA.classList.add('is-green');
        setPanelState('is-green', null);
      }
      if (which === 'both_good') {
        btnBothGood.classList.add('is-green');
        setPanelState('is-green', 'is-green');
      }
      if (which === 'both_bad') {
        btnBothBad.classList.add('is-red');
        setPanelState('is-red', 'is-red');
      }
      if (which === 'b') {
        btnB.classList.add('is-green');
        setPanelState(null, 'is-green');
      }
    };

    const unhover = () => {
      clearBtnStates();
      clearPanelStates();
    };

    const finalizeChoice = (which) => {
      clearBtnStates();
      if (which === 'a') setPanelState('is-green', null);
      if (which === 'b') setPanelState(null, 'is-green');
      if (which === 'both_good') setPanelState('is-green', 'is-green');
      if (which === 'both_bad') setPanelState('is-red', 'is-red');
    };

    btnA.addEventListener('mouseenter', () => hover('a'));
    btnBothGood.addEventListener('mouseenter', () => hover('both_good'));
    btnBothBad.addEventListener('mouseenter', () => hover('both_bad'));
    btnB.addEventListener('mouseenter', () => hover('b'));
    bar.addEventListener('mouseleave', () => unhover());

    const improveTextForModel = async (modelKey, userPrompt, previousAnswer, signal) => {
      const safePrev = String(previousAnswer || '').trim();
      const safePrompt = String(userPrompt || '').trim();
      const msg =
        `The user asked:\n${safePrompt}\n\n` +
        `Your previous answer was:\n${safePrev}\n\n` +
        `Rewrite the same answer to be much better: more accurate, more helpful, and more practical. ` +
        `Fix mistakes, add steps/examples if needed, and keep the final answer concise.`;
      return await requestAiReply(msg, modelKey, signal);
    };

    const choose = async (which) => {
      finalizeChoice(which);
      bar.remove();
      setPendingVote(false);

      if (!ai) return;

      if (ai.mode === 'battle') {
        randomizeBattleHeaders(ai);
      }

      const canImprove = ai && ai.userPrompt && ai.modelKeyA && ai.modelKeyB;
      if (!canImprove) return;

      const shouldImproveA = which === 'both_bad' || which === 'b';
      const shouldImproveB = which === 'both_bad' || which === 'a';

      if (!shouldImproveA && !shouldImproveB) return;

      setSendingState(true);
      const ctrl = new AbortController();
      try {
        const tasks = [];
        if (shouldImproveA) {
          tasks.push(
            improveTextForModel(ai.modelKeyA, ai.userPrompt, ai.replyA, ctrl.signal).then((t) => ({ which: 'A', text: t }))
          );
        }
        if (shouldImproveB) {
          tasks.push(
            improveTextForModel(ai.modelKeyB, ai.userPrompt, ai.replyB, ctrl.signal).then((t) => ({ which: 'B', text: t }))
          );
        }

        const results = await Promise.allSettled(tasks);
        for (const r of results) {
          if (r.status !== 'fulfilled') continue;
          const out = r.value;
          if (out.which === 'A' && ai.msgA) {
            ai.replyA = out.text;
            const typing = typewriterToElement(ai.msgA, out.text, { minDelay: 8, maxDelay: 18 });
            await typing.done;
          }
          if (out.which === 'B' && ai.msgB) {
            ai.replyB = out.text;
            const typing = typewriterToElement(ai.msgB, out.text, { minDelay: 8, maxDelay: 18 });
            await typing.done;
          }
        }
      } finally {
        setSendingState(false);
      }
    };

    btnA.addEventListener('click', () => choose('a'));
    btnBothGood.addEventListener('click', () => choose('both_good'));
    btnBothBad.addEventListener('click', () => choose('both_bad'));
    btnB.addEventListener('click', () => choose('b'));

    bar.appendChild(btnA);
    bar.appendChild(btnBothGood);
    bar.appendChild(btnBothBad);
    bar.appendChild(btnB);

    document.body.appendChild(bar);
    return { bar };
  };

  const requestAiReply = async (message, modelKey, signal) => {
    const baseUrl =
      typeof window !== 'undefined' && typeof window.WORKER_CHAT_URL === 'string'
        ? window.WORKER_CHAT_URL.trim().replace(/\/+$/, '')
        : '';
    const endpoint = baseUrl ? `${baseUrl}/api/chat` : '/api/chat';

    const selectedKey = modelKey;
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

  const requestImage = async (prompt, signal) => {
    const baseUrl =
      typeof window !== 'undefined' && typeof window.WORKER_CHAT_URL === 'string'
        ? window.WORKER_CHAT_URL.trim().replace(/\/+$/, '')
        : '';
    const endpoint = baseUrl ? `${baseUrl}/api/image` : '/api/image';

    const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
    const isAborted = () => signal && (signal.aborted === true);

    const blobToBase64 = (blob) => {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
    };

    const shouldRetry = (resStatus, upstreamStatus, details) => {
      const s = typeof upstreamStatus === 'number' ? upstreamStatus : resStatus;
      const d = String(details || '');
      if (s === 530) return true;
      if (s >= 500 && s <= 599) return true;
      if (/\b1033\b/.test(d)) return true;
      return false;
    };

    let lastErr = null;
    for (let attempt = 0; attempt < 4; attempt++) {
      if (isAborted()) throw new Error('Aborted');

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, width: 768, height: 768 }),
        signal,
      });

      if (res.ok) {
        const blob = await res.blob();
        // Convert to base64 data URL for persistence
        const base64Url = await blobToBase64(blob);
        return base64Url;
      }

      const data = await res.json().catch(() => null);
      const err = data && typeof data.error === 'string' ? data.error : 'Request failed';
      const status = data && typeof data.status === 'number' ? data.status : res.status;
      const details = data && typeof data.details === 'string' ? data.details : '';
      const isBusy = res.status === 503 || status === 530 || /\b1033\b/.test(String(details || ''));
      const msg = isBusy
        ? 'Image service is busy right now. Please try again in a moment.'
        : `${err}${status ? ` (${status})` : ''}${details ? `: ${details}` : ''}`;
      lastErr = new Error(msg);

      if (attempt < 3 && shouldRetry(res.status, status, details)) {
        await sleep(1100 * (attempt + 1));
        continue;
      }

      throw lastErr;
    }

    throw lastErr || new Error('Request failed');
  };

  // Fullscreen image modal
  const openImageModal = (imgUrl) => {
    // Remove existing modal if any
    const existingModal = document.getElementById('imageModal');
    if (existingModal) existingModal.remove();

    // Create modal
    const modal = document.createElement('div');
    modal.id = 'imageModal';
    modal.className = 'image-modal';

    // Backdrop
    const backdrop = document.createElement('div');
    backdrop.className = 'image-modal__backdrop';

    // Container
    const container = document.createElement('div');
    container.className = 'image-modal__container';

    // Close button
    const closeBtn = document.createElement('button');
    closeBtn.className = 'image-modal__close';
    closeBtn.setAttribute('aria-label', 'Close');
    closeBtn.innerHTML = '<i class="fa-solid fa-xmark"></i>';
    closeBtn.addEventListener('click', () => modal.remove());

    // Image
    const img = document.createElement('img');
    img.className = 'image-modal__img';
    img.src = imgUrl;
    img.alt = 'Generated image';

    // Controls bar
    const controls = document.createElement('div');
    controls.className = 'image-modal__controls';

    // Download button in modal
    const downloadBtn = document.createElement('button');
    downloadBtn.className = 'image-modal__btn';
    downloadBtn.innerHTML = '<i class="fa-solid fa-download"></i> Download';
    downloadBtn.addEventListener('click', () => {
      const link = document.createElement('a');
      link.href = imgUrl;
      link.download = `generated-image-${Date.now()}.png`;
      link.click();
    });

    controls.appendChild(downloadBtn);
    container.appendChild(closeBtn);
    container.appendChild(img);
    container.appendChild(controls);
    modal.appendChild(backdrop);
    modal.appendChild(container);

    // Close on backdrop click
    backdrop.addEventListener('click', () => modal.remove());

    // Close on Escape key
    const onKeydown = (e) => {
      if (e.key === 'Escape') {
        modal.remove();
        document.removeEventListener('keydown', onKeydown);
      }
    };
    document.addEventListener('keydown', onKeydown);

    document.body.appendChild(modal);
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
      setImageMode(!isImageMode);
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

  const resetToLanding = () => {
    stopGeneration();
    clearChatStorage();

    const vote = document.getElementById('battleVoteBar');
    if (vote) vote.remove();

    setPendingVote(false);

    chatHistory.length = 0;
    if (chatMessages) chatMessages.textContent = '';

    document.body.classList.remove('is-chat');
    document.body.classList.remove('is-battle');
    document.body.classList.remove('is-sxs');

    if (chat) chat.hidden = true;
    if (landingTitle) landingTitle.hidden = false;
    if (landingTitleMobile) landingTitleMobile.hidden = false;

    window.setTimeout(() => playLandingTitles(), 150);

    if (input) {
      input.value = '';
      input.disabled = false;
    }

    clearSelectedFile();
    updateComposerOffset();
  };

  if (newChatBtn) {
    newChatBtn.addEventListener('click', () => {
      resetToLanding();
    });
  }

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
    currentMode = normalized;

    document.body.classList.toggle('is-battle', normalized === 'battle');
    document.body.classList.toggle('is-sxs', isSxs);

    if (attachImageBtn) {
      attachImageBtn.hidden = !isDirect;
      if (!isDirect) attachImageBtn.classList.remove('is-active');
    }

    if (!isDirect) {
      setImageMode(false);
    }

    const shouldShow = isSxs || isDirect;
    sxsControls.hidden = !shouldShow;

    const items = Array.from(sxsControls.querySelectorAll('.sxs__item'));
    const second = items[1] || null;
    if (second) second.hidden = isDirect;

    if (isDirect) {
      selectedModelB = null;
    }

    if (!shouldShow || isDirect) {
      setModelMenuOpen('B', false);
    }
    if (!shouldShow) {
      setModelMenuOpen('A', false);
    }

    updateDisabledModels();
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
  let currentMode = '';

  const updateDisabledModels = () => {
    if (currentMode === 'direct chat') {
      if (modelMenuA) {
        const itemsA = Array.from(modelMenuA.querySelectorAll('.model-menu__item'));
        for (const it of itemsA) {
          it.disabled = false;
          it.classList.remove('is-disabled');
          it.setAttribute('aria-disabled', 'false');
        }
      }
      if (modelMenuB) {
        const itemsB = Array.from(modelMenuB.querySelectorAll('.model-menu__item'));
        for (const it of itemsB) {
          it.disabled = false;
          it.classList.remove('is-disabled');
          it.setAttribute('aria-disabled', 'false');
        }
      }
      return;
    }
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
        if (item.getAttribute('aria-disabled') === 'true') return;
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
      if (currentMode !== 'direct chat' && item.dataset.model && item.dataset.model === selectedModelB) return;
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
  setMode(battleBtnLabel ? battleBtnLabel.textContent.trim() : 'Direct Chat');

  // Set default mode to image generation
  setImageMode(true);

  // Restore chat from storage on page load
  restoreChatFromStorage();

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    if (isGenerating) return;
    if (pendingVote) return;

    const value = input.value.trim();
    if (!value) {
      input.focus();
      return;
    }

    ensureChatMode();
    appendUserMessage(value);

    const isBattle = !isImageMode && currentMode === 'battle';
    const isSxs = currentMode === 'side by side';
    const isDual = !isImageMode && (isBattle || isSxs);

    const headerA = isSxs ? getSelectedModelUi('A') : null;
    const headerB = isSxs ? getSelectedModelUi('B') : null;

    const ai = isImageMode
      ? appendAiMessage('')
      : isDual
        ? appendBattleAiMessage({ mode: currentMode, headerA, headerB })
        : appendAiMessage('');

    if (isDual && ai) {
      setThinking(ai.msgA);
      setThinking(ai.msgB);
    }
    if (isImageMode && ai && ai.msg) {
      setThinking(ai.msg, 'Generating Image…');
    }
    if (!isImageMode && !isDual && ai && ai.msg) {
      setThinking(ai.msg);
    }
    shouldAutoScroll = true;
    scrollChatToBottom();

    setSendingState(true);
    activeAbortController = new AbortController();

    chatHistory.push({ role: 'user', content: value });
    saveChatToStorage();

    input.value = '';
    input.focus();

    try {
      if (isImageMode) {
        const imgUrl = await requestImage(value, activeAbortController.signal);
        if (ai && ai.row) ai.row.remove();

        const node = appendAiImageMessage(imgUrl);
        if (node && node.img) {
          node.img.addEventListener(
            'load',
            () => {
              shouldAutoScroll = true;
              scrollChatToBottom();
            },
            { once: true }
          );
        }
        // Save image URL to chat history for persistence
        chatHistory.push({ role: 'assistant', content: '[IMAGE]', imageUrl: imgUrl });
        saveChatToStorage();
      } else if (isDual) {
        const modelKeyA = isBattle ? 'chatgpt' : selectedModelA;
        const modelKeyB = isBattle ? 'gemini' : selectedModelB;

        if (ai) {
          ai.userPrompt = value;
          ai.modelKeyA = modelKeyA;
          ai.modelKeyB = modelKeyB;
        }

        const [resA, resB] = await Promise.allSettled([
          requestAiReply(value, modelKeyA, activeAbortController.signal),
          requestAiReply(value, modelKeyB, activeAbortController.signal),
        ]);

        const replyA = resA.status === 'fulfilled' ? resA.value : '';
        const replyB = resB.status === 'fulfilled' ? resB.value : '';

        if (ai) {
          ai.replyA = replyA;
          ai.replyB = replyB;
        }

        if (replyA) {
          chatHistory.push({ role: 'assistant', content: replyA });
          saveChatToStorage();
        }
        if (replyB) {
          chatHistory.push({ role: 'assistant', content: replyB });
          saveChatToStorage();
        }

        if (ai && ai.msgA) {
          const text = replyA || (resA.status === 'rejected' ? 'Error: Request failed' : '');
          if (ai) ai.replyA = text;
          clearThinking(ai.msgA);
          activeTyping = typewriterToElement(ai.msgA, text, { minDelay: 10, maxDelay: 22 });
          await activeTyping.done;
        }
        if (ai && ai.msgB) {
          clearThinking(ai.msgB);
          const typingB = typewriterToElement(
            ai.msgB,
            replyB || (resB.status === 'rejected' ? 'Error: Request failed' : ''),
            { minDelay: 10, maxDelay: 22 }
          );
          await typingB.done;
          if (ai) ai.replyB = ai.msgB.textContent;
        }

        setPendingVote(true);
        appendBattleVoteBar(ai);
      } else {
        const reply = await requestAiReply(value, selectedModelA, activeAbortController.signal);
        chatHistory.push({ role: 'assistant', content: reply });
        saveChatToStorage();
        if (ai && ai.msg) {
          clearThinking(ai.msg);
          activeTyping = typewriterToElement(ai.msg, reply, { minDelay: 10, maxDelay: 22 });
          await activeTyping.done;
        }
      }
    } catch (err) {
      const isAbort = err && typeof err === 'object' && (err.name === 'AbortError' || err.code === 20);
      const text = isAbort ? 'Stopped.' : `Error: ${err instanceof Error ? err.message : 'Request failed'}`;
      if (ai && ai.msg) {
        clearThinking(ai.msg);
        ai.msg.textContent = text;
      }
      if (ai && ai.msgA) {
        clearThinking(ai.msgA);
        ai.msgA.textContent = text;
      }
      if (ai && ai.msgB) {
        clearThinking(ai.msgB);
        ai.msgB.textContent = text;
      }
    } finally {
      activeAbortController = null;
      activeTyping = null;
      setSendingState(false);
      scrollChatToBottom();
    }
  });
})();
