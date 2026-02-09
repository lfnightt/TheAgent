(() => {
  const form = document.querySelector('.prompt');
  const input = document.getElementById('promptInput');
  const battleBtn = document.getElementById('battleBtn');
  const battleMenu = document.getElementById('battleMenu');
  const sxsControls = document.getElementById('sxsControls');
  const modelBtnA = document.getElementById('modelBtnA');
  const modelBtnB = document.getElementById('modelBtnB');
  const modelMenuA = document.getElementById('modelMenuA');
  const modelMenuB = document.getElementById('modelMenuB');

  if (!form || !input) return;

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

  form.addEventListener('submit', (e) => {
    e.preventDefault();

    const value = input.value.trim();
    if (!value) {
      input.focus();
      return;
    }

    input.value = '';
    input.focus();
  });
})();
