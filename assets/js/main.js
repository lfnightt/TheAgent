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

  if (document.documentElement.classList.contains('no-fa')) {
    document.body.classList.add('no-fa');
  }

  window.setTimeout(() => {
    if (document.documentElement.classList.contains('no-fa')) {
      document.body.classList.add('no-fa');
    }
  }, 0);

  if (!form || !input) return;

  if (sidebarMenuBtn) {
    sidebarMenuBtn.addEventListener('click', () => {
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

  const setThinking = (el) => {
    if (!el) return;
    el.textContent = '';
    const wrap = document.createElement('span');
    wrap.className = 'thinking thinking--shimmer';
    wrap.textContent = 'Thinking…';
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
        `کاربر این پیام را داده:\n${safePrompt}\n\n` +
        `این پاسخ قبلی تو بوده:\n${safePrev}\n\n` +
        `حالا همان پاسخ را خیلی بهتر، دقیق\u200cتر و کاربردی\u200cتر بازنویسی کن. ` +
        `اشتباهات را اصلاح کن، مثال/گام\u200cها را اگر لازم است اضافه کن، و پاسخ نهایی را روان و مختصر نگه دار.`;
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

  const resetToLanding = () => {
    stopGeneration();

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

    const isBattle = currentMode === 'battle';
    const isSxs = currentMode === 'side by side';
    const isDual = isBattle || isSxs;

    const headerA = isSxs ? getSelectedModelUi('A') : null;
    const headerB = isSxs ? getSelectedModelUi('B') : null;

    const ai = isDual
      ? appendBattleAiMessage({ mode: currentMode, headerA, headerB })
      : appendAiMessage('');

    if (isDual && ai) {
      setThinking(ai.msgA);
      setThinking(ai.msgB);
    }
    if (!isDual && ai && ai.msg) {
      setThinking(ai.msg);
    }
    shouldAutoScroll = true;
    scrollChatToBottom();

    setSendingState(true);
    activeAbortController = new AbortController();

    chatHistory.push({ role: 'user', content: value });

    input.value = '';
    input.focus();

    try {
      if (isDual) {
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

        if (replyA) chatHistory.push({ role: 'assistant', content: replyA });
        if (replyB) chatHistory.push({ role: 'assistant', content: replyB });

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
        if (ai && ai.msg) {
          clearThinking(ai.msg);
          activeTyping = typewriterToElement(ai.msg, reply, { minDelay: 10, maxDelay: 22 });
          await activeTyping.done;
        }
      }
    } catch (err) {
      const isAbort = err && typeof err === 'object' && (err.name === 'AbortError' || err.code === 20);
      const text = isAbort ? 'متوقف شد.' : `Error: ${err instanceof Error ? err.message : 'Request failed'}`;
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
