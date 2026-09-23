// Apodaca Riders - Sistema de Rifa Oficial (Modo Ruleta & Gran Tómbola de Bolas Numeradas)
document.addEventListener('DOMContentLoaded', () => {
  // Elements
  const participantInput = document.getElementById('participant-input');
  const btnAddParticipant = document.getElementById('btn-add-participant');
  const participantsList = document.getElementById('participants-list');
  const countParticipants = document.getElementById('count-participants');

  const prizeInput = document.getElementById('prize-input');
  const btnAddPrize = document.getElementById('btn-add-prize');
  const prizesList = document.getElementById('prizes-list');
  const countPrizes = document.getElementById('count-prizes');

  const prizeSelector = document.getElementById('current-prize-select');
  const currentPrizeDisplay = document.getElementById('current-prize-display');

  const reelStageContainer = document.getElementById('reel-stage-container');
  const tombolaStageContainer = document.getElementById('tombola-stage-container');
  const btnModeReel = document.getElementById('btn-mode-reel');
  const btnModeTombola = document.getElementById('btn-mode-tombola');

  const reelViewport = document.getElementById('reel-viewport');
  const reelTrack = document.getElementById('reel-track');
  const btnSpin = document.getElementById('btn-spin');
  const btnSpinText = document.getElementById('btn-spin-text');
  const stageStatusHint = document.getElementById('stage-status-hint');

  const podiumList = document.getElementById('podium-list');
  const countWinners = document.getElementById('count-winners');

  const winnerModal = document.getElementById('winner-modal');
  const modalWinnerName = document.getElementById('modal-winner-name');
  const modalPrizeTitle = document.getElementById('modal-prize-title');
  const modalCharacterImg = document.getElementById('modal-character-img');
  const btnClaimPrize = document.getElementById('btn-claim-prize');

  const bulkModal = document.getElementById('bulk-modal');
  const bulkModalTitle = document.getElementById('bulk-modal-title');
  const bulkTextarea = document.getElementById('bulk-textarea');
  const btnSaveBulk = document.getElementById('btn-save-bulk');
  const btnCancelBulk = document.getElementById('btn-cancel-bulk');

  const btnSoundToggle = document.getElementById('btn-sound-toggle');
  const btnFullscreen = document.getElementById('btn-fullscreen');
  const btnLoadApodaca = document.getElementById('btn-load-apodaca');
  const btnCopyWhatsapp = document.getElementById('btn-copy-whatsapp');
  const btnDownloadReport = document.getElementById('btn-download-report');
  const btnResetRaffle = document.getElementById('btn-reset-raffle');
  const btnClearAll = document.getElementById('btn-clear-all');
  const toastMsg = document.getElementById('toast-msg');

  const CARD_HEIGHT = 72; // px

  // Official Apodaca Riders list from the user
  const APODACA_RIDERS_RAW = `1. Yaare 👸
2. Juank 🐂
3. Miza 🤴🏼
4. Yona 👨🏻💻
5. Juan RAM 🛻
6. Engel🐩
7. Maximo décimo meridio
8. Hilario Cycling 🇲🇽
9. David
10. Irán
11. Román
12. Diego 🐢
13. Estrellita 💖✨
14. Lalo Mc Queen
15. Angel lija
16. Jared
17. Iván 🤙🏻
18. Yordani
19. Geni
20. Martin
21. Saul ✌️
22. Esme
23. Kalvin
24. Monserrat 💖
25. Jefrey 💪
26. Victor 🛒
27. Joel 🚴♀️
28. Humberto🚲
29. Andrea 🐺
30. Poncho Denigris
31. Konan Big (whatifor)
32. Jehú 🦎
33. Baltazar Sandoval
34. AdaL
35. Vicky
36. Mario Rdz + 🐕🦺
37. Saúl G 🦖
38. Sebastián 🛋️⚡
39. Aitan
40. Gerry Oviedo (ER)
41. Marina Mendez
42. ReyGzz
43. Hugo
44. Claudia
45. Jon
46. Marco G
47. Nicole G
48. Alan
49. Jacobo 🛠️
50. Julio
51. Sam 🪼 (ER)
52. Escobedo Riders presente en este gran aniversario
53. Mario
54. Jahir gtz🐯
55. Iker
56. Jassiel
57. Tavo
58. Gil (Texano)
59. Dylan Ortiz
60. Rosita 🍓 (ZB)
61. Vane (ZB)
62. Arthur (ZB)
63. Mary (ZB)`;

  const DEFAULT_PRIZES = [
    { name: 'Casco de Ciclismo MIPS', icon: '⛑️' },
    { name: 'Jersey Conmemorativo Apodaca Riders', icon: '🎽' },
    { name: 'Juego de Luces LED Delantera y Trasera', icon: '🔦' },
    { name: 'Ánfora Térmica + Portaánfora', icon: '🍶' },
    { name: 'Kit de Parches y Multiherramienta', icon: '🔧' },
    { name: 'Lentes Deportivos para Ciclismo', icon: '🕶️' }
  ];

  // Parses WhatsApp list extracting both official number and name
  function parseRidersList(rawText) {
    const lines = rawText.split(/\r?\n/);
    const parsed = [];
    let fallbackNum = 1;
    lines.forEach((line) => {
      let trimmed = line.trim();
      if (!trimmed) return;
      if (trimmed.includes('Rodada Nocturna') || (trimmed.includes('Apodaca Riders') && !trimmed.match(/^\d+[\.\-\)]/))) {
        return;
      }
      const match = trimmed.match(/^(\d+)[\.\-\)]\s*(.*)$/);
      if (match) {
        parsed.push({
          number: parseInt(match[1], 10),
          name: match[2].trim()
        });
      } else {
        const cleaned = trimmed.replace(/^\d+[\.\-\)]\s*/, '').trim();
        if (cleaned.length > 0) {
          parsed.push({
            number: fallbackNum,
            name: cleaned
          });
        }
      }
      fallbackNum++;
    });
    return parsed;
  }

  // State
  let state = {
    mode: 'tombola', // Default to the requested Tombola mode!
    participants: [],
    prizes: [],
    winners: [],
    isSpinning: false,
    bulkTarget: 'participants'
  };

  // Initialize Tombola Engine
  let tombolaEngine = null;
  if (window.TombolaEngine) {
    tombolaEngine = new TombolaEngine('tombola-canvas');
  }

  function getRandomInt(max) {
    if (max <= 0) return 0;
    const array = new Uint32Array(1);
    window.crypto.getRandomValues(array);
    return array[0] % max;
  }

  function cryptoShuffle(array) {
    const arr = [...array];
    for (let i = arr.length - 1; i > 0; i--) {
      const j = getRandomInt(i + 1);
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  // Storage
  function loadState() {
    try {
      const p = localStorage.getItem('apodaca_rifa_participants');
      const pr = localStorage.getItem('apodaca_rifa_prizes');
      const w = localStorage.getItem('apodaca_rifa_winners');

      if (p) state.participants = JSON.parse(p);
      if (pr) state.prizes = JSON.parse(pr);
      if (w) state.winners = JSON.parse(w);

      if (state.participants.length === 0 && state.winners.length === 0) {
        loadApodacaOfficialData();
      }
    } catch (e) {
      console.warn('Storage read error:', e);
      loadApodacaOfficialData();
    }
  }

  function loadApodacaOfficialData() {
    const riders = parseRidersList(APODACA_RIDERS_RAW);
    state.participants = riders.map((r, idx) => ({
      id: 'p_' + Date.now() + '_' + idx + '_' + Math.random().toString(36).substr(2, 4),
      number: r.number,
      name: r.name,
      gender: idx % 2 === 0 ? 'female' : 'male'
    }));

    if (state.prizes.length === 0) {
      state.prizes = DEFAULT_PRIZES.map((pr, idx) => ({
        id: 'pr_' + Date.now() + '_' + idx,
        name: pr.name,
        icon: pr.icon
      }));
    }

    state.winners = [];
    saveState();
  }

  function saveState() {
    try {
      localStorage.setItem('apodaca_rifa_participants', JSON.stringify(state.participants));
      localStorage.setItem('apodaca_rifa_prizes', JSON.stringify(state.prizes));
      localStorage.setItem('apodaca_rifa_winners', JSON.stringify(state.winners));
      if (tombolaEngine) {
        tombolaEngine.setupBalls(state.participants);
      }
    } catch (e) {
      console.warn('Storage write error:', e);
    }
  }

  function showToast(text, duration = 3000) {
    if (!toastMsg) return;
    toastMsg.textContent = text;
    toastMsg.classList.add('show');
    setTimeout(() => {
      toastMsg.classList.remove('show');
    }, duration);
  }

  // Mode Switcher
  btnModeReel.addEventListener('click', () => {
    state.mode = 'reel';
    btnModeReel.classList.add('active');
    btnModeTombola.classList.remove('active');
    reelStageContainer.style.display = 'flex';
    tombolaStageContainer.classList.remove('active');
    btnSpinText.textContent = '¡GIRAR RULETA AL AZAR!';
    updateStageUI();
  });

  btnModeTombola.addEventListener('click', () => {
    state.mode = 'tombola';
    btnModeTombola.classList.add('active');
    btnModeReel.classList.remove('active');
    reelStageContainer.style.display = 'none';
    tombolaStageContainer.classList.add('active');
    btnSpinText.textContent = '¡GIRAR TÓMBOLA DE BOLAS!';
    if (tombolaEngine) {
      tombolaEngine.setupBalls(state.participants);
    }
    updateStageUI();
  });

  // Render UI
  function renderAll() {
    renderParticipants();
    renderPrizes();
    renderPrizeSelector();
    renderPodium();
    updateStageUI();
    if (tombolaEngine) {
      tombolaEngine.setupBalls(state.participants);
    }
  }

  function renderParticipants() {
    countParticipants.textContent = state.participants.length;
    participantsList.innerHTML = '';

    if (state.participants.length === 0) {
      participantsList.innerHTML = `
        <div class="empty-state">
          <p>No hay ciclistas en la lista.</p>
          <small>Agrega ciclistas o carga la lista de Apodaca Riders.</small>
        </div>
      `;
      return;
    }

    state.participants.forEach((p) => {
      const card = document.createElement('div');
      card.className = 'item-card';
      const avatarSrc = `assets/characters/${p.gender || 'female'}_front.png`;
      card.innerHTML = `
        <div class="item-info">
          <div class="ball-badge-num" title="Número de bola">#${p.number}</div>
          <div class="item-name" title="${escapeHtml(p.name)}">${escapeHtml(p.name)}</div>
        </div>
        <button class="btn-del" title="Eliminar ciclista">✕</button>
      `;

      card.querySelector('.btn-del').addEventListener('click', (e) => {
        e.stopPropagation();
        deleteParticipant(p.id);
      });

      participantsList.appendChild(card);
    });
  }

  function deleteParticipant(id) {
    if (state.isSpinning) return;
    const idx = state.participants.findIndex(item => item.id === id);
    if (idx !== -1) {
      const removed = state.participants.splice(idx, 1)[0];
      saveState();
      renderAll();
      showToast(`Eliminado: #${removed.number} ${removed.name}`);
    }
  }

  function renderPrizes() {
    countPrizes.textContent = state.prizes.length;
    prizesList.innerHTML = '';

    if (state.prizes.length === 0) {
      prizesList.innerHTML = `
        <div class="empty-state">
          <p>Sin premios pendientes.</p>
          <small>Agrega premios para comenzar la rifa.</small>
        </div>
      `;
      return;
    }

    state.prizes.forEach((pr, index) => {
      const card = document.createElement('div');
      card.className = 'item-card';
      card.innerHTML = `
        <div class="item-info">
          <span style="font-size: 1.25rem;">${pr.icon || '🎁'}</span>
          <div>
            <div class="item-name">${escapeHtml(pr.name)}</div>
            <div class="item-sub">Premio #${index + 1}</div>
          </div>
        </div>
        <button class="btn-del" title="Eliminar premio">✕</button>
      `;

      card.querySelector('.btn-del').addEventListener('click', (e) => {
        e.stopPropagation();
        deletePrize(pr.id);
      });

      prizesList.appendChild(card);
    });
  }

  function deletePrize(id) {
    if (state.isSpinning) return;
    const idx = state.prizes.findIndex(item => item.id === id);
    if (idx !== -1) {
      const removed = state.prizes.splice(idx, 1)[0];
      saveState();
      renderAll();
      showToast(`Premio eliminado: ${removed.name}`);
    }
  }

  function renderPrizeSelector() {
    prizeSelector.innerHTML = '';

    if (state.prizes.length === 0) {
      const opt = document.createElement('option');
      opt.textContent = 'Sin premios pendientes';
      opt.disabled = true;
      opt.selected = true;
      prizeSelector.appendChild(opt);
      currentPrizeDisplay.textContent = '¡Todos los premios han sido sorteados!';
      return;
    }

    state.prizes.forEach((pr) => {
      const opt = document.createElement('option');
      opt.value = pr.id;
      opt.textContent = `${pr.icon || '🎁'} ${pr.name}`;
      prizeSelector.appendChild(opt);
    });

    const activePrize = state.prizes.find(p => p.id === prizeSelector.value) || state.prizes[0];
    if (activePrize) {
      currentPrizeDisplay.textContent = activePrize.name;
    }
  }

  prizeSelector.addEventListener('change', () => {
    const activePrize = state.prizes.find(p => p.id === prizeSelector.value);
    if (activePrize) {
      currentPrizeDisplay.textContent = activePrize.name;
    }
  });

  function renderPodium() {
    countWinners.textContent = state.winners.length;
    podiumList.innerHTML = '';

    if (state.winners.length === 0) {
      podiumList.innerHTML = `
        <div class="empty-state">
          <p>Aún no hay ganadores.</p>
          <small>Gira la tómbola para conocer al primer ganador.</small>
        </div>
      `;
      return;
    }

    const reversed = [...state.winners].reverse();
    reversed.forEach((w) => {
      const card = document.createElement('div');
      card.className = 'winner-card';
      card.innerHTML = `
        <div class="winner-order-badge">#${w.order}</div>
        <div class="winner-meta">
          <div class="winner-cyclist-name">
            <span class="winner-ball-tag">Bola #${w.participant.number || ''}</span>
            ${escapeHtml(w.participant.name)}
          </div>
          <div class="winner-prize-name">
            <span>${w.prize.icon || '🎁'}</span>
            <span>${escapeHtml(w.prize.name)}</span>
          </div>
        </div>
      `;
      podiumList.appendChild(card);
    });
  }

  function initStaticReel() {
    reelTrack.style.transition = 'none';
    reelTrack.style.transform = 'translate3d(0, 0, 0)';
    reelTrack.innerHTML = '';

    if (state.participants.length === 0) {
      reelTrack.innerHTML = `
        <div class="reel-card" style="opacity: 0.4;">Esperando ciclistas...</div>
        <div class="reel-card">¿Quién ganará?</div>
        <div class="reel-card" style="opacity: 0.4;">¡Agrega participantes!</div>
      `;
      return;
    }

    const p1 = state.participants[getRandomInt(state.participants.length)];
    const p2 = state.participants[getRandomInt(state.participants.length)];
    const p3 = state.participants[getRandomInt(state.participants.length)];

    [p1, p2, p3].forEach(p => {
      const card = document.createElement('div');
      card.className = 'reel-card';
      const avatarSrc = `assets/characters/${p.gender || 'female'}_front.png`;
      card.innerHTML = `
        <span class="ball-badge-num">#${p.number}</span>
        <span>${escapeHtml(p.name)}</span>
      `;
      reelTrack.appendChild(card);
    });
  }

  function updateStageUI() {
    const hasParticipants = state.participants.length > 0;
    const hasPrizes = state.prizes.length > 0;

    if (!hasParticipants && !hasPrizes && state.winners.length > 0) {
      stageStatusHint.textContent = '🏁 ¡Rifa Finalizada! Todos los premios han sido entregados.';
      btnSpin.disabled = true;
    } else if (!hasParticipants) {
      stageStatusHint.textContent = '⚠️ Agrega ciclistas en la lista para continuar.';
      btnSpin.disabled = true;
      initStaticReel();
    } else if (!hasPrizes) {
      stageStatusHint.textContent = '⚠️ Agrega premios para continuar el sorteo.';
      btnSpin.disabled = true;
      initStaticReel();
    } else {
      stageStatusHint.textContent = `Listos: ${state.participants.length} bolas en la tómbola compitiendo por ${state.prizes.length} premios.`;
      btnSpin.disabled = false;
      if (!state.isSpinning && state.mode === 'reel') {
        initStaticReel();
      }
    }
  }

  function addSingleParticipant(name) {
    if (!name.trim()) return;
    const nextNum = state.participants.length > 0 
      ? Math.max(...state.participants.map(p => p.number || 0)) + 1 
      : 1;

    state.participants.push({
      id: 'p_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
      number: nextNum,
      name: name.trim(),
      gender: Math.random() > 0.5 ? 'female' : 'male'
    });
    saveState();
    renderAll();
    showToast(`Ciclista agregado: #${nextNum} ${name.trim()}`);
  }

  function addSinglePrize(name) {
    if (!name.trim()) return;
    state.prizes.push({
      id: 'pr_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
      name: name.trim(),
      icon: '🎁'
    });
    saveState();
    renderAll();
    showToast(`Premio agregado: ${name.trim()}`);
  }

  btnAddParticipant.addEventListener('click', () => {
    addSingleParticipant(participantInput.value);
    participantInput.value = '';
    participantInput.focus();
  });

  participantInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      addSingleParticipant(participantInput.value);
      participantInput.value = '';
    }
  });

  btnAddPrize.addEventListener('click', () => {
    addSinglePrize(prizeInput.value);
    prizeInput.value = '';
    prizeInput.focus();
  });

  prizeInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      addSinglePrize(prizeInput.value);
      prizeInput.value = '';
    }
  });

  // Bulk Import
  document.getElementById('btn-bulk-participants').addEventListener('click', () => {
    state.bulkTarget = 'participants';
    bulkModalTitle.textContent = 'Pegar Lista de Ciclistas (WhatsApp)';
    bulkTextarea.placeholder = 'Pega la lista tal como te la mandan:\n1. Yaare 👸\n2. Juank 🐂\n3. Miza 🤴🏼...';
    bulkTextarea.value = '';
    bulkModal.classList.add('open');
  });

  document.getElementById('btn-bulk-prizes').addEventListener('click', () => {
    state.bulkTarget = 'prizes';
    bulkModalTitle.textContent = 'Pegar Lista de Premios';
    bulkTextarea.placeholder = 'Pega un premio por línea:\nCasco Giro\nJersey Apodaca Riders\nLuces LED...';
    bulkTextarea.value = '';
    bulkModal.classList.add('open');
  });

  btnCancelBulk.addEventListener('click', () => {
    bulkModal.classList.remove('open');
  });

  btnSaveBulk.addEventListener('click', () => {
    const raw = bulkTextarea.value;
    if (!raw.trim()) {
      bulkModal.classList.remove('open');
      return;
    }

    if (state.bulkTarget === 'participants') {
      const parsedRiders = parseRidersList(raw);
      parsedRiders.forEach((r, idx) => {
        state.participants.push({
          id: 'p_' + Date.now() + '_' + idx + '_' + Math.random().toString(36).substr(2, 4),
          number: r.number,
          name: r.name,
          gender: idx % 2 === 0 ? 'female' : 'male'
        });
      });
      showToast(`¡${parsedRiders.length} ciclistas importados con su número!`);
    } else {
      const lines = raw.split(/\r?\n/).map(s => s.trim().replace(/^\d+[\.\-\)]\s*/, '')).filter(s => s.length > 0);
      lines.forEach((name, idx) => {
        state.prizes.push({
          id: 'pr_' + Date.now() + '_' + idx + '_' + Math.random().toString(36).substr(2, 4),
          name: name,
          icon: '🎁'
        });
      });
      showToast(`¡${lines.length} premios importados con éxito!`);
    }

    saveState();
    renderAll();
    bulkModal.classList.remove('open');
  });

  // Reload Official Apodaca Riders
  btnLoadApodaca.addEventListener('click', () => {
    loadApodacaOfficialData();
    renderAll();
    showToast('🚴 ¡Lista oficial de Apodaca Riders cargada (63 ciclistas)!');
  });

  // Reset Raffle
  btnResetRaffle.addEventListener('click', () => {
    if (state.winners.length === 0) {
      showToast('No hay ganadores para reiniciar.');
      return;
    }
    state.winners.forEach(w => {
      state.participants.push(w.participant);
      state.prizes.push(w.prize);
    });
    // Sort by number
    state.participants.sort((a, b) => (a.number || 0) - (b.number || 0));
    state.winners = [];
    saveState();
    renderAll();
    showToast('🔄 Rifa reiniciada: ciclistas y premios devueltos a la tómbola.');
  });

  // Clear All
  btnClearAll.addEventListener('click', () => {
    state.participants = [];
    state.prizes = [];
    state.winners = [];
    saveState();
    renderAll();
    showToast('🗑️ Lista vaciada por completo.');
  });

  // Dispatcher: Spin Tombola or Reel
  btnSpin.addEventListener('click', () => {
    if (state.isSpinning) return;
    if (state.participants.length === 0 || state.prizes.length === 0) return;

    if (state.mode === 'tombola' && tombolaEngine) {
      startTombolaDraw();
    } else {
      startReelDraw();
    }
  });

  // 1. TÓMBOLA DRAW WITH GIANT BALL REVEAL
  function startTombolaDraw() {
    state.isSpinning = true;
    btnSpin.disabled = true;
    stageStatusHint.textContent = '🎱 ¡La Tómbola de Apodaca Riders está girando a toda velocidad!';

    const prizeId = prizeSelector.value;
    const prizeIndex = state.prizes.findIndex(p => p.id === prizeId);
    const chosenPrizeIndex = prizeIndex !== -1 ? prizeIndex : 0;
    const chosenPrize = state.prizes[chosenPrizeIndex];

    const winnerIndex = getRandomInt(state.participants.length);
    const chosenWinner = state.participants[winnerIndex];

    window.soundEngine.playWhoosh();

    tombolaEngine.spin(chosenWinner, () => {
      finishRaffle(chosenWinner, winnerIndex, chosenPrize, chosenPrizeIndex);
    });
  }

  // 2. REEL DRAW
  function startReelDraw() {
    state.isSpinning = true;
    btnSpin.disabled = true;
    stageStatusHint.textContent = '🚴 ¡Sorteo en curso! La ruleta está decidiendo al azar...';

    const prizeId = prizeSelector.value;
    const prizeIndex = state.prizes.findIndex(p => p.id === prizeId);
    const chosenPrizeIndex = prizeIndex !== -1 ? prizeIndex : 0;
    const chosenPrize = state.prizes[chosenPrizeIndex];

    const winnerIndex = getRandomInt(state.participants.length);
    const chosenWinner = state.participants[winnerIndex];

    const shuffledPool = cryptoShuffle(state.participants);
    const TOTAL_CARDS = 48;
    const WINNER_POS = TOTAL_CARDS - 3;

    const reelCardsData = [];
    for (let i = 0; i < TOTAL_CARDS; i++) {
      if (i === WINNER_POS) {
        reelCardsData.push(chosenWinner);
      } else {
        const poolIndex = i % shuffledPool.length;
        reelCardsData.push(shuffledPool[poolIndex]);
      }
    }

    reelTrack.innerHTML = '';
    reelTrack.style.transition = 'none';
    reelTrack.style.transform = 'translate3d(0, 0, 0)';

    reelCardsData.forEach((p, idx) => {
      const card = document.createElement('div');
      card.className = 'reel-card';
      if (idx === WINNER_POS) card.id = 'winner-reel-card';
      card.innerHTML = `
        <span class="ball-badge-num">#${p.number}</span>
        <span>${escapeHtml(p.name)}</span>
      `;
      reelTrack.appendChild(card);
    });

    void reelTrack.offsetWidth;
    const targetTranslateY = (WINNER_POS - 1) * CARD_HEIGHT;

    window.soundEngine.playWhoosh();

    const DURATION = 5.2;
    reelTrack.style.transition = `transform ${DURATION}s cubic-bezier(0.12, 0.85, 0.22, 1.0)`;
    reelTrack.style.transform = `translate3d(0, -${targetTranslateY}px, 0)`;
    reelTrack.classList.add('fast-blur');

    let lastPassed = -1;
    let animId = null;

    function trackReelMotion() {
      const matrix = window.getComputedStyle(reelTrack).transform;
      if (matrix && matrix !== 'none') {
        const vals = matrix.split('(')[1].split(')')[0].split(',');
        const currentY = Math.abs(parseFloat(vals.length > 6 ? vals[13] : vals[5])) || 0;
        const currentCard = Math.floor((currentY + CARD_HEIGHT / 2) / CARD_HEIGHT);

        if (currentCard !== lastPassed) {
          lastPassed = currentCard;
          const remaining = Math.max(0, targetTranslateY - currentY);
          const ratio = remaining / targetTranslateY;
          const pitch = 650 + ratio * 450;
          window.soundEngine.playTick(pitch, 0.12);

          if (ratio < 0.2) {
            reelTrack.classList.remove('fast-blur');
          }
        }
      }

      if (state.isSpinning) {
        animId = requestAnimationFrame(trackReelMotion);
      }
    }

    animId = requestAnimationFrame(trackReelMotion);

    const onTransitionEnd = () => {
      reelTrack.removeEventListener('transitionend', onTransitionEnd);
      cancelAnimationFrame(animId);
      reelTrack.classList.remove('fast-blur');

      const winnerEl = document.getElementById('winner-reel-card');
      if (winnerEl) {
        winnerEl.classList.add('winner-card-highlight');
      }

      finishRaffle(chosenWinner, winnerIndex, chosenPrize, chosenPrizeIndex);
    };

    reelTrack.addEventListener('transitionend', onTransitionEnd, { once: true });
  }

  function finishRaffle(winner, winnerIdx, prize, prizeIdx) {
    state.isSpinning = false;
    stageStatusHint.textContent = `🎉 ¡Ganador oficial: #${winner.number} ${winner.name}!`;

    window.soundEngine.playFanfare();

    window.confettiEngine.burst(window.innerWidth / 2, window.innerHeight * 0.45, 150);
    setTimeout(() => {
      window.confettiEngine.burst(window.innerWidth * 0.35, window.innerHeight * 0.5, 90);
      window.confettiEngine.burst(window.innerWidth * 0.65, window.innerHeight * 0.5, 90);
    }, 350);

    // ZERO REPETITIONS: REMOVE WINNER AND PRIZE PERMANENTLY
    state.participants.splice(winnerIdx, 1);
    state.prizes.splice(prizeIdx, 1);

    const winnerRecord = {
      id: 'w_' + Date.now(),
      order: state.winners.length + 1,
      participant: winner,
      prize: prize,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    state.winners.push(winnerRecord);

    saveState();

    setTimeout(() => {
      showWinnerModal(winnerRecord);
    }, 850);
  }

  function showWinnerModal(winnerRecord) {
    modalWinnerName.innerHTML = `<span style="color: var(--color-gold); font-size: 1.4rem; display: block; margin-bottom: 0.2rem;">BOLA GANADORA #${winnerRecord.participant.number}</span>${escapeHtml(winnerRecord.participant.name)}`;
    modalPrizeTitle.textContent = `${winnerRecord.prize.icon || '🎁'} ${winnerRecord.prize.name}`;
    modalCharacterImg.src = `assets/design/winner_victory_trophy.jpg`;

    winnerModal.classList.add('open');
  }

  btnClaimPrize.addEventListener('click', () => {
    winnerModal.classList.remove('open');
    renderAll();
  });

  // Export to WhatsApp
  btnCopyWhatsapp.addEventListener('click', () => {
    if (state.winners.length === 0) {
      showToast('⚠️ Aún no hay ganadores para compartir.');
      return;
    }

    let text = `🌙🚴‍♀️ *RESULTADOS RIFA APODACA RIDERS* 🚴‍♂️🌙\n`;
    text += `====================================\n`;
    text += `📅 Fecha: ${new Date().toLocaleDateString()}\n`;
    text += `¡Muchas felicidades a los afortunados ganadores de la rodada!\n\n`;

    state.winners.forEach((w) => {
      text += `🏆 *Premio #${w.order}*:\n`;
      text += `   🎱 Bola #${w.participant.number}: *${w.participant.name}*\n`;
      text += `   🎁 Se llevó: *${w.prize.name}*\n\n`;
    });

    if (state.prizes.length > 0) {
      text += `⏳ *Premios pendientes*: ${state.prizes.length}\n`;
    } else {
      text += `🏁 ¡Todos los premios han sido entregados con éxito!\n`;
    }
    text += `\n🚴‍♂️ ¡Gracias por acompañarnos y rodar con nosotros! 🚵‍♀️`;

    navigator.clipboard.writeText(text).then(() => {
      showToast('📋 ¡Resultados copiados listos para pegar en WhatsApp!');
    }).catch(() => {
      prompt('Copia el texto para el grupo de WhatsApp:', text);
    });
  });

  // Download Text Report
  btnDownloadReport.addEventListener('click', () => {
    if (state.winners.length === 0) {
      showToast('⚠️ Aún no hay ganadores registrados.');
      return;
    }

    let text = `RODADA NOCTURNA CON APODACA RIDERS - ACTA DE RIFA\n`;
    text += `Fecha: ${new Date().toLocaleString()}\n`;
    text += `=========================================================\n\n`;

    state.winners.forEach((w) => {
      text += `#${w.order} | Bola #${w.participant.number} | Ganador: ${w.participant.name} | Premio: ${w.prize.name} | Hora: ${w.timestamp}\n`;
    });

    text += `\nCiclistas restantes en tómbola: ${state.participants.length}\n`;
    state.participants.forEach(p => {
      text += `- #${p.number} ${p.name}\n`;
    });

    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Rifa_Apodaca_Riders_${new Date().toISOString().slice(0, 10)}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('📥 Reporte descargado.');
  });

  // Sound Toggle
  btnSoundToggle.addEventListener('click', () => {
    const isMuted = window.soundEngine.toggleMute();
    btnSoundToggle.textContent = isMuted ? '🔇' : '🔊';
    showToast(isMuted ? 'Sonido desactivado' : 'Sonido activado');
  });

  if (window.soundEngine.muted) {
    btnSoundToggle.textContent = '🔇';
  }

  // Fullscreen Toggle
  btnFullscreen.addEventListener('click', () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      btnFullscreen.textContent = '⤓';
    } else {
      document.exitFullscreen().catch(() => {});
      btnFullscreen.textContent = '⛶';
    }
  });

  function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  // Default mode setup
  if (state.mode === 'tombola') {
    btnModeTombola.classList.add('active');
    btnModeReel.classList.remove('active');
    reelStageContainer.style.display = 'none';
    tombolaStageContainer.classList.add('active');
    btnSpinText.textContent = '¡GIRAR TÓMBOLA DE BOLAS!';
  }

  // Start app
  loadState();
  renderAll();
});
