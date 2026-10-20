/**
 * app.js - Master Controller for FireCube Pro
 * Integrates Timer, Views (Treino, Duelo Bot, Evolução), 3D Cubes, WCA Scrambler,
 * User Auth & Database, Gamification, and Visual Guides.
 */

class FireCubeApp {
  constructor() {
    this.timerState = 'IDLE';
    this.startTime = 0;
    this.elapsedTime = 0;
    this.timerInterval = null;
    this.holdTimer = null;
    this.holdDuration = 300;
    this.inspectionRemaining = 15;
    this.inspectionInterval = null;
    this.inspectionPenalty = null;

    this.solves = [];
    this.currentScramble = [];
    this.currentScrambleString = '';

    // Views: 'timer' | 'bot-duel' | 'evolution'
    this.activeView = 'timer';

    this.settings = {
      inspection: true,
      sound: true,
      autoScramble: true,
      theme: 'dark',
      viewMode: '3d'
    };

    this.cube3D = null;
    this.activeSolution = null;
    this.solutionPlayer = {
      isPlaying: false,
      speed: 220
    };

    this.init();
  }

  init() {
    this.loadSettings();
    this.loadSolves();
    this.applyTheme(this.settings.theme);

    // Initialize Main 3D Cube
    if (typeof RubiksCube3D !== 'undefined') {
      this.cube3D = new RubiksCube3D('cube3d-canvas', 'cube-net-container');
    }

    // Apply active user skin to 3D cube if any
    const user = window.authManager.currentUser;
    if (user && user.activeSkin && window.gamification) {
      const skin = window.gamification.SKINS.find(s => s.id === user.activeSkin);
      if (skin && this.cube3D) this.cube3D.setSkin(skin.colors);
    }

    // Generate initial scramble
    this.newScramble();

    // Attach Event Listeners
    this.setupTimerEvents();
    this.setupUIEvents();
    this.setupKeyboardShortcuts();

    // Render UI
    this.updateStatsUI();
    this.renderSolvesList();
    if (window.authManager) window.authManager.updateHeaderUI();

    // Evolution Initial render
    setTimeout(() => {
      if (window.evolutionTracker) {
        window.evolutionTracker.renderChart(this.solves);
        window.evolutionTracker.updateMetricsUI(this.solves);
      }
    }, 400);
  }

  /* ------------------- VIEW ROUTING & TABS ------------------- */

  switchView(viewName) {
    this.activeView = viewName;

    const views = ['timer', 'bot-duel', 'evolution'];
    views.forEach(v => {
      const el = document.getElementById(`view-${v}`);
      const btn = document.getElementById(`nav-btn-${v}`);
      if (el) el.style.display = (v === viewName) ? 'block' : 'none';
      if (btn) btn.classList.toggle('active', v === viewName);
    });

    if (viewName === 'bot-duel') {
      if (window.duelArena) {
        window.duelArena.initBotDuelPage();
        setTimeout(() => {
          if (window.duelArena.botCube3D) window.duelArena.botCube3D.onResize();
        }, 60);
      }
    } else if (viewName === 'evolution') {
      if (window.evolutionTracker) {
        window.evolutionTracker.renderChart(this.solves);
        window.evolutionTracker.updateMetricsUI(this.solves);
      }
    } else if (viewName === 'timer') {
      if (this.cube3D) this.cube3D.onResize();
    }
  }

  /* ------------------- SETTINGS & STORAGE ------------------- */

  loadSettings() {
    const saved = localStorage.getItem('firecube_settings');
    if (saved) {
      try {
        this.settings = { ...this.settings, ...JSON.parse(saved) };
      } catch (e) {}
    }

    const cbInspection = document.getElementById('cb-inspection');
    const cbSound = document.getElementById('cb-sound');
    const cbAutoScramble = document.getElementById('cb-auto-scramble');

    if (cbInspection) cbInspection.checked = this.settings.inspection;
    if (cbSound) {
      cbSound.checked = this.settings.sound;
      if (window.soundEngine) window.soundEngine.enabled = this.settings.sound;
    }
    if (cbAutoScramble) cbAutoScramble.checked = this.settings.autoScramble;
  }

  saveSettings() {
    localStorage.setItem('firecube_settings', JSON.stringify(this.settings));
  }

  loadSolves() {
    const saved = localStorage.getItem('firecube_solves');
    if (saved) {
      try {
        this.solves = JSON.parse(saved);
        return;
      } catch (e) {}
    }
    this.solves = [];
    this.saveSolves();
  }

  saveSolves() {
    localStorage.setItem('firecube_solves', JSON.stringify(this.solves));
  }

  applyTheme(theme) {
    if (theme === 'mint') theme = 'light';
    this.settings.theme = theme;
    this.saveSettings();
    document.body.classList.remove('theme-mint', 'theme-dark', 'theme-light');
    document.body.classList.add(`theme-${theme}`);

    const themeToggleBtn = document.getElementById('btn-toggle-theme');
    if (themeToggleBtn) {
      themeToggleBtn.innerHTML = theme === 'light'
        ? `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path></svg> <span>Tema Escuro</span>`
        : `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line></svg> <span>Tema Claro</span>`;
    }

    if (window.evolutionTracker && this.solves.length > 0) {
      window.evolutionTracker.renderChart(this.solves);
    }
  }

  toggleTheme() {
    const nextTheme = this.settings.theme === 'light' ? 'dark' : 'light';
    this.applyTheme(nextTheme);
    this.showToast(`🌓 Tema ${nextTheme === 'light' ? 'Claro' : 'Escuro'} ativado!`);
  }

  /* ------------------- SCRAMBLE & 3D ------------------- */

  newScramble() {
    this.currentScramble = ScrambleEngine.generate(21);
    this.currentScrambleString = this.currentScramble.join(' ');

    const scrambleTextEl = document.getElementById('scramble-text');
    if (scrambleTextEl) {
      scrambleTextEl.textContent = this.currentScrambleString;
    }

    const scrambleVisualEl = document.getElementById('scramble-visual-cards');
    if (scrambleVisualEl) {
      scrambleVisualEl.innerHTML = ScrambleEngine.renderScrambleHTML(this.currentScramble);
    }

    // Scramble on Bot Duel page if present
    const botScrambleEl = document.getElementById('duel-bot-scramble-text');
    if (botScrambleEl) {
      botScrambleEl.textContent = this.currentScrambleString;
    }

    if (this.cube3D) {
      this.cube3D.applyScramble(this.currentScramble, false);
    }

    if (window.duelArena && window.duelArena.botCube3D) {
      window.duelArena.botCube3D.applyScramble(this.currentScramble, false);
      const solution = CubeSolver.solveScramble(this.currentScramble);
      window.duelArena.botSolutionMoves = solution.moves || [];
    }

    this.activeSolution = CubeSolver.solveScramble(this.currentScramble);
  }

  copyScramble() {
    if (!this.currentScrambleString) return;
    navigator.clipboard.writeText(this.currentScrambleString).then(() => {
      this.showToast('📋 Embaralhamento copiado com sucesso!');
    });
  }

  /* ------------------- TIMER CONTROLS ------------------- */

  setupTimerEvents() {
    const timerArea = document.getElementById('timer-display-area');

    window.addEventListener('keydown', (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
      if (e.code === 'Space') {
        e.preventDefault();
        this.handleTimerTriggerDown();
      }
    });

    window.addEventListener('keyup', (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
      if (e.code === 'Space') {
        e.preventDefault();
        this.handleTimerTriggerUp();
      }
    });

    if (timerArea) {
      timerArea.addEventListener('pointerdown', (e) => {
        if (e.target.closest('button')) return;
        this.handleTimerTriggerDown();
      });
    }

    const duelUserCard = document.getElementById('duel-user-timer-card');
    if (duelUserCard) {
      duelUserCard.addEventListener('pointerdown', (e) => {
        if (e.target.closest('button')) return;
        this.handleTimerTriggerDown();
      });
    }

    window.addEventListener('pointerup', () => {
      if (this.timerState === 'HOLDING' || this.timerState === 'READY') {
        this.handleTimerTriggerUp();
      }
    });
  }

  handleTimerTriggerDown() {
    if (this.timerState === 'RUNNING') {
      this.stopTimer();
      return;
    }

    if (this.timerState === 'IDLE') {
      if (this.settings.inspection) {
        this.startInspection();
      } else {
        this.startHolding();
      }
      return;
    }

    if (this.timerState === 'INSPECTION') {
      this.startHolding();
    }
  }

  handleTimerTriggerUp() {
    if (this.timerState === 'HOLDING') {
      clearTimeout(this.holdTimer);
      if (this.settings.inspection && this.inspectionInterval) {
        this.timerState = 'INSPECTION';
        this.setTimerDisplayStatus('inspection');
      } else {
        this.timerState = 'IDLE';
        this.setTimerDisplayStatus('idle');
      }
    } else if (this.timerState === 'READY') {
      this.startSolveTimer();
    }
  }

  startHolding() {
    this.timerState = 'HOLDING';
    this.setTimerDisplayStatus('holding');

    clearTimeout(this.holdTimer);
    this.holdTimer = setTimeout(() => {
      if (this.timerState === 'HOLDING') {
        this.timerState = 'READY';
        this.setTimerDisplayStatus('ready');
        if (window.soundEngine) window.soundEngine.playReady();
      }
    }, this.holdDuration);
  }

  startInspection() {
    this.timerState = 'INSPECTION';
    this.inspectionRemaining = 15;
    this.inspectionPenalty = null;
    this.setTimerDisplayStatus('inspection');
    this.updateTimerText(this.inspectionRemaining.toString());

    clearInterval(this.inspectionInterval);
    this.inspectionInterval = setInterval(() => {
      this.inspectionRemaining--;

      if (this.inspectionRemaining === 7) {
        if (window.soundEngine) window.soundEngine.playInspection8s();
      } else if (this.inspectionRemaining === 3) {
        if (window.soundEngine) window.soundEngine.playInspection12s();
      }

      if (this.inspectionRemaining > 0) {
        if (this.timerState === 'INSPECTION') {
          this.updateTimerText(this.inspectionRemaining.toString());
        }
      } else if (this.inspectionRemaining <= 0 && this.inspectionRemaining > -2) {
        this.inspectionPenalty = '+2';
        if (this.timerState === 'INSPECTION') {
          this.updateTimerText('+2');
          if (window.soundEngine) window.soundEngine.playPenalty();
        }
      } else {
        this.inspectionPenalty = 'DNF';
        if (this.timerState === 'INSPECTION') {
          this.updateTimerText('DNF');
          if (window.soundEngine) window.soundEngine.playPenalty();
        }
      }
    }, 1000);
  }

  startSolveTimer() {
    clearInterval(this.inspectionInterval);
    clearTimeout(this.holdTimer);

    this.timerState = 'RUNNING';
    this.startTime = performance.now();
    this.setTimerDisplayStatus('running');

    if (window.soundEngine) window.soundEngine.playStart();

    // Trigger Bot to start if in Bot Duel view!
    if (this.activeView === 'bot-duel' && window.duelArena) {
      window.duelArena.onUserStartedTimer();
    }

    const loop = () => {
      if (this.timerState !== 'RUNNING') return;
      const now = performance.now();
      this.elapsedTime = now - this.startTime;
      this.updateTimerText(StatsEngine.formatTime(this.elapsedTime));
      this.timerInterval = requestAnimationFrame(loop);
    };
    this.timerInterval = requestAnimationFrame(loop);
  }

  stopTimer() {
    cancelAnimationFrame(this.timerInterval);
    clearInterval(this.inspectionInterval);
    this.timerState = 'IDLE';

    const finalMs = Math.round(performance.now() - this.startTime);
    this.elapsedTime = finalMs;

    this.setTimerDisplayStatus('stopped');
    if (window.soundEngine) window.soundEngine.playStop();

    const prevStats = StatsEngine.computeFullStats(this.solves);
    const effectiveTime = this.inspectionPenalty === '+2' ? finalMs + 2000 : finalMs;
    const isNewPB = this.inspectionPenalty !== 'DNF' && (!prevStats.best || effectiveTime < prevStats.best);

    const nextSolveNum = this.solves.length > 0 ? Math.max(...this.solves.map(s => s.solveNum || 0)) + 1 : 1;
    const newSolve = {
      id: Date.now(),
      userId: window.authManager.currentUser ? window.authManager.currentUser.id : 'guest',
      solveNum: nextSolveNum,
      time: finalMs,
      penalty: this.inspectionPenalty,
      scramble: this.currentScrambleString,
      date: new Date().toLocaleString('pt-BR'),
      notes: isNewPB ? 'Novo Recorde Pessoal (PB)!' : ''
    };

    this.solves.push(newSolve);
    this.saveSolves();

    // Persist solve to database
    if (window.authManager.currentUser && !window.authManager.currentUser.isGuest) {
      fetch('/api/solves', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newSolve)
      }).catch(() => {});
    }

    this.updateTimerText(StatsEngine.formatTime(finalMs, this.inspectionPenalty));

    // Gamification Integration
    if (window.gamification && this.inspectionPenalty !== 'DNF') {
      window.gamification.checkAchievementsOnSolve(effectiveTime, isNewPB);
      window.authManager.syncToDatabase();
    }

    // Duel Integration
    if (window.duelArena) {
      if (this.activeView === 'bot-duel' && !window.duelArena.botFinished) {
        window.duelArena.onUserWon(effectiveTime);
        window.authManager.syncToDatabase();
      } else if (window.duelArena.mode === 'pvp') {
        window.duelArena.onUserFinishedPvP(effectiveTime);
        window.authManager.syncToDatabase();
      }
    }

    if (isNewPB) {
      if (window.soundEngine) window.soundEngine.playPB();
      this.showToast('🎉 NOVO RECORDE PESSOAL (PB)! Parabéns!');
    }

    this.updateStatsUI();
    this.renderSolvesList();
    if (window.authManager) window.authManager.updateHeaderUI();

    // Update Evolution metrics & chart
    if (window.evolutionTracker) {
      window.evolutionTracker.renderChart(this.solves);
      window.evolutionTracker.updateMetricsUI(this.solves);
    }

    if (this.settings.autoScramble && this.activeView === 'timer') {
      setTimeout(() => {
        this.newScramble();
      }, 350);
    }
  }

  setTimerDisplayStatus(status) {
    const timerDisplay = document.getElementById('timer-digital');
    const timerContainer = document.getElementById('timer-display-area');
    if (!timerDisplay || !timerContainer) return;

    timerDisplay.classList.remove('status-holding', 'status-ready', 'status-running', 'status-inspection');
    timerContainer.classList.remove('state-holding', 'state-ready', 'state-running', 'state-inspection');

    if (status === 'holding') {
      timerDisplay.classList.add('status-holding');
      timerContainer.classList.add('state-holding');
    } else if (status === 'ready') {
      timerDisplay.classList.add('status-ready');
      timerContainer.classList.add('state-ready');
    } else if (status === 'running') {
      timerDisplay.classList.add('status-running');
      timerContainer.classList.add('state-running');
    } else if (status === 'inspection') {
      timerDisplay.classList.add('status-inspection');
      timerContainer.classList.add('state-inspection');
    }
  }

  updateTimerText(text) {
    const timerDisplay = document.getElementById('timer-digital');
    if (timerDisplay) {
      timerDisplay.textContent = text;
    }
    const botUserTimer = document.getElementById('duel-user-timer-display');
    if (botUserTimer) {
      botUserTimer.textContent = text;
    }
  }

  /* ------------------- STATS & SOLVES ------------------- */

  renderSolvesList() {
    const listEl = document.getElementById('solves-list-body');
    const countBadge = document.getElementById('solves-count');
    if (!listEl) return;

    if (countBadge) countBadge.textContent = this.solves.length;

    if (this.solves.length === 0) {
      listEl.innerHTML = `
        <div class="empty-solves-msg">
          <p>Nenhum tempo registrado ainda.</p>
          <p class="sub">Segure a barra de espaço para iniciar seu primeiro solve!</p>
        </div>
      `;
      return;
    }

    const reversed = [...this.solves].reverse();

    listEl.innerHTML = reversed.map((solve) => {
      const formatted = StatsEngine.formatTime(solve.time, solve.penalty);
      const isPlus2 = solve.penalty === '+2';
      const isDNF = solve.penalty === 'DNF';

      return `
        <div class="solve-row ${isDNF ? 'is-dnf' : ''}" data-id="${solve.id}">
          <span class="solve-num">${solve.solveNum}.</span>
          <span class="solve-time" title="Clique para ver detalhes do solve" onclick="app.openSolveModal(${solve.id})">${formatted}</span>
          <div class="solve-actions">
            <button class="btn-penalty ${isPlus2 ? 'active' : ''}" onclick="app.togglePenalty(${solve.id}, '+2')" title="Adicionar penalidade +2">+2</button>
            <button class="btn-penalty ${isDNF ? 'active' : ''}" onclick="app.togglePenalty(${solve.id}, 'DNF')" title="Marcar como DNF">DNF</button>
            <button class="btn-del-solve" onclick="app.deleteSolve(${solve.id})" title="Excluir tempo">&times;</button>
          </div>
        </div>
      `;
    }).join('');
  }

  updateStatsUI() {
    const stats = StatsEngine.computeFullStats(this.solves);

    const setVal = (id, valMs, suffix = '') => {
      const el = document.getElementById(id);
      if (el) {
        if (valMs === null || valMs === undefined) {
          el.textContent = '--:--';
        } else if (valMs === Infinity) {
          el.textContent = 'DNF';
        } else {
          el.textContent = StatsEngine.formatTime(valMs) + suffix;
        }
      }
    };

    setVal('stat-best', stats.best);
    setVal('stat-worst', stats.worst);
    setVal('stat-mean', stats.mean);
    setVal('stat-median', stats.median);
    setVal('stat-stddev', stats.stdDev);
    setVal('stat-ao5', stats.ao5);
    setVal('stat-middle5', stats.middleAo5);
    setVal('stat-best-ao5', stats.bestAo5);
    setVal('stat-ao12', stats.ao12);
    setVal('stat-middle12', stats.middleAo12);
    setVal('stat-best-ao12', stats.bestAo12);

    this.renderLevelCard(stats.userLevel);
  }

  renderLevelCard(level) {
    const badgeEl = document.getElementById('user-rank-badge');
    const tierNameEl = document.getElementById('user-tier-name');
    const progressBarEl = document.getElementById('level-progress-fill');
    const progressTextEl = document.getElementById('level-progress-text');
    const tipEl = document.getElementById('user-level-tip');

    if (badgeEl) badgeEl.textContent = level.tier.badge;
    if (tierNameEl) tierNameEl.textContent = level.tier.name;

    if (progressBarEl) {
      progressBarEl.style.width = `${level.percentToNext}%`;
    }

    if (progressTextEl) {
      if (level.gapSeconds) {
        progressTextEl.innerHTML = `Faltam <strong>${level.gapSeconds}s</strong> para o nível <strong>${level.tier.nextTier}</strong>`;
      } else if (level.tier.id === 'pro') {
        progressTextEl.innerHTML = `Nível Máximo! Próxima meta: <strong>Recorde Mundial (3.13s)</strong>`;
      } else {
        progressTextEl.textContent = level.label;
      }
    }

    if (tipEl) {
      tipEl.innerHTML = `<strong>Dica do seu nível:</strong> ${level.tip}`;
    }
  }

  togglePenalty(id, penaltyType) {
    const solve = this.solves.find(s => s.id === id);
    if (!solve) return;

    solve.penalty = (solve.penalty === penaltyType) ? null : penaltyType;
    this.saveSolves();
    this.renderSolvesList();
    this.updateStatsUI();
  }

  deleteSolve(id) {
    this.solves = this.solves.filter(s => s.id !== id);
    this.saveSolves();
    this.renderSolvesList();
    this.updateStatsUI();

    if (window.authManager.currentUser && !window.authManager.currentUser.isGuest) {
      fetch('/api/solves/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ solveId: id, userId: window.authManager.currentUser.id })
      }).catch(() => {});
    }
  }

  clearSession() {
    if (confirm('Tem certeza que deseja limpar todos os tempos da sessão atual?')) {
      this.solves = [];
      this.saveSolves();
      this.renderSolvesList();
      this.updateStatsUI();
      this.showToast('Sessão reiniciada.');
    }
  }

  exportSolves() {
    if (this.solves.length === 0) {
      alert('Nenhum tempo para exportar.');
      return;
    }

    const textLines = this.solves.map((s, idx) => {
      const timeStr = StatsEngine.formatTime(s.time, s.penalty);
      return `${idx + 1}. ${timeStr} | Embaralhamento: ${s.scramble} | Data: ${s.date}`;
    });

    const fullExport = `FireCube Pro - Relatório de Sessão\n` +
      `Total de Solves: ${this.solves.length}\n` +
      `Melhor: ${document.getElementById('stat-best')?.textContent || '--'}\n` +
      `Média Ao5: ${document.getElementById('stat-ao5')?.textContent || '--'}\n` +
      `Média Ao12: ${document.getElementById('stat-ao12')?.textContent || '--'}\n\n` +
      textLines.join('\n');

    navigator.clipboard.writeText(fullExport).then(() => {
      this.showToast('📊 Todos os tempos copiados para a área de transferência!');
    });
  }

  /* ------------------- AUTH & DATABASE MODAL ------------------- */
  openLoginModal(defaultTab = 'login') {
    this.openAuthModal(defaultTab);
  }

  openAuthModal(defaultTab = 'login') {
    const modal = document.getElementById('auth-modal');
    if (!modal) return;

    this.switchAuthTab(defaultTab);

    // Populate current logged in info if user is authenticated
    const user = window.authManager.currentUser;
    const authStatusEl = document.getElementById('auth-current-profile-box');
    if (authStatusEl) {
      if (user && !user.isGuest) {
        authStatusEl.innerHTML = `
          <div style="display: flex; align-items: center; justify-content: space-between; padding: 10px; background: rgba(34, 197, 94, 0.1); border: 1px solid rgba(34, 197, 94, 0.3); border-radius: var(--radius-md);">
            <div style="display: flex; align-items: center; gap: 8px;">
              <span style="font-size: 1.6rem;">${user.avatar}</span>
              <div>
                <strong>${user.username}</strong> <span style="font-size: 0.75rem; color: #10b981;">(💾 Banco Conectado)</span><br>
                <span style="font-size: 0.78rem; color: var(--text-muted);">${user.email || 'Conta Registrada'} · ${user.elo} Elo</span>
              </div>
            </div>
            <button class="btn-action-small" onclick="app.logoutUser()" style="color: #ef4444;">Sair</button>
          </div>
        `;
      } else {
        authStatusEl.innerHTML = `
          <div style="padding: 8px 12px; background: rgba(245, 158, 11, 0.1); border: 1px solid rgba(245, 158, 11, 0.3); border-radius: var(--radius-md); font-size: 0.82rem; color: #f59e0b;">
            ⚠️ Você está jogando como <strong>Visitante</strong>. Crie uma conta ou faça login para salvar seus tempos e Elo no banco de dados!
          </div>
        `;
      }
    }

    // Render avatar list for register
    const avatarListEl = document.getElementById('register-avatar-selection');
    if (avatarListEl) {
      avatarListEl.innerHTML = window.authManager.AVATARS.map(a => `
        <div class="avatar-option ${a.id === 'fire' ? 'selected' : ''}" 
             data-id="${a.id}" 
             onclick="app.selectRegisterAvatar('${a.id}')">
          <span class="avatar-icon">${a.icon}</span>
          <span class="avatar-label">${a.label}</span>
        </div>
      `).join('');
    }

    modal.classList.add('active');
  }

  switchAuthTab(tab) {
    const isLogin = tab === 'login';
    document.getElementById('auth-tab-btn-login')?.classList.toggle('active', isLogin);
    document.getElementById('auth-tab-btn-register')?.classList.toggle('active', !isLogin);
    document.getElementById('auth-panel-login').style.display = isLogin ? 'block' : 'none';
    document.getElementById('auth-panel-register').style.display = !isLogin ? 'block' : 'none';
  }

  selectRegisterAvatar(id) {
    document.querySelectorAll('#register-avatar-selection .avatar-option').forEach(el => {
      el.classList.toggle('selected', el.getAttribute('data-id') === id);
    });
  }

  async submitLogin() {
    const input = document.getElementById('login-ident-input');
    const pass = document.getElementById('login-pass-input');
    const msgEl = document.getElementById('login-error-msg');

    if (!input || !pass) return;
    if (msgEl) msgEl.textContent = '';

    const res = await window.authManager.login(input.value, pass.value);
    if (res.success) {
      this.closeModal('auth-modal');
      this.showToast(`🔥 Bem-vindo de volta, ${res.user.username}!`);
      this.updateStatsUI();
      this.renderSolvesList();
      window.authManager.updateHeaderUI();
    } else {
      if (msgEl) msgEl.textContent = res.error;
    }
  }

  async submitRegister() {
    const userEl = document.getElementById('reg-user-input');
    const emailEl = document.getElementById('reg-email-input');
    const passEl = document.getElementById('reg-pass-input');
    const selectedAvatar = document.querySelector('#register-avatar-selection .avatar-option.selected');
    const avatarId = selectedAvatar ? selectedAvatar.getAttribute('data-id') : 'fire';
    const msgEl = document.getElementById('register-error-msg');

    if (!userEl || !passEl) return;
    if (msgEl) msgEl.textContent = '';

    const res = await window.authManager.register(userEl.value, emailEl.value, passEl.value, avatarId);
    if (res.success) {
      this.closeModal('auth-modal');
      this.showToast(`🎉 Conta criada com sucesso! Salvo no banco de dados.`);
      window.authManager.updateHeaderUI();
    } else {
      if (msgEl) msgEl.textContent = res.error;
    }
  }

  logoutUser() {
    window.authManager.logout();
    this.closeModal('auth-modal');
  }

  /* ------------------- NEW MODALS: DICAS E GUIA VISUAL ------------------- */

  openScrambleTipsModal() {
    const modal = document.getElementById('scramble-tips-modal');
    if (modal) modal.classList.add('active');
  }

  openVisualGuideModal() {
    const modal = document.getElementById('visual-guide-modal');
    if (modal) modal.classList.add('active');
  }

  openLeaderboardModal() {
    const modal = document.getElementById('leaderboard-modal');
    if (!modal) return;

    const listEl = document.getElementById('leaderboard-list');
    if (listEl && window.gamification) {
      const entries = window.gamification.getLeaderboard();
      listEl.innerHTML = entries.map(item => `
        <div class="leaderboard-row ${item.isCurrentUser ? 'current-user-row' : ''}">
          <span class="lb-rank ${item.rank <= 3 ? 'top-rank rank-' + item.rank : ''}">#${item.rank}</span>
          <span class="lb-avatar">${item.avatar}</span>
          <span class="lb-name">${item.name}</span>
          <span class="lb-badge">${item.badge}</span>
          <span class="lb-time">${item.avgTime}</span>
          <span class="lb-elo">${item.elo} Elo</span>
        </div>
      `).join('');
    }

    modal.classList.add('active');
  }

  openStoreModal() {
    const modal = document.getElementById('store-modal');
    if (!modal) return;

    const user = window.authManager.currentUser;
    const storeCoinsEl = document.getElementById('store-user-coins');
    if (storeCoinsEl) storeCoinsEl.textContent = `${user.fireCoins} 🔥`;

    const gridEl = document.getElementById('store-skins-grid');
    if (gridEl && window.gamification) {
      gridEl.innerHTML = window.gamification.SKINS.map(skin => {
        const isUnlocked = user.unlockedSkins.includes(skin.id);
        const isActive = user.activeSkin === skin.id;

        return `
          <div class="store-skin-card ${isActive ? 'active-skin' : ''}">
            <div class="skin-card-header">
              <span class="skin-name">${skin.name}</span>
              ${isActive ? '<span class="skin-badge-equipped">EM USO</span>' : ''}
            </div>
            <div class="skin-color-preview">
              <span style="background-color: #${skin.colors.U.toString(16).padStart(6, '0')};"></span>
              <span style="background-color: #${skin.colors.F.toString(16).padStart(6, '0')};"></span>
              <span style="background-color: #${skin.colors.R.toString(16).padStart(6, '0')};"></span>
              <span style="background-color: #${skin.colors.L.toString(16).padStart(6, '0')};"></span>
              <span style="background-color: #${skin.colors.D.toString(16).padStart(6, '0')};"></span>
            </div>
            <div class="skin-card-footer">
              ${isUnlocked
                ? `<button class="btn-secondary-action" onclick="app.equipSkin('${skin.id}')">${isActive ? 'Equipado' : 'Equipar'}</button>`
                : `<button class="btn-primary-action" onclick="app.buySkin('${skin.id}')">${skin.cost} 🔥 Desbloquear</button>`
              }
            </div>
          </div>
        `;
      }).join('');
    }

    modal.classList.add('active');
  }

  buySkin(skinId) {
    const user = window.authManager.currentUser;
    const skin = window.gamification.SKINS.find(s => s.id === skinId);
    if (!skin) return;

    if (user.fireCoins < skin.cost) {
      alert(`Você precisa de ${skin.cost} 🔥 Moedas para desbloquear esta skin!`);
      return;
    }

    user.fireCoins -= skin.cost;
    user.unlockedSkins.push(skin.id);
    user.activeSkin = skin.id;
    window.authManager.saveUserLocally();
    window.authManager.syncToDatabase();

    if (this.cube3D) this.cube3D.setSkin(skin.colors);
    if (window.soundEngine) window.soundEngine.playCoinSound();

    this.openStoreModal();
    this.showToast(`✨ Skin "${skin.name}" equipada no Cubo 3D!`);
  }

  equipSkin(skinId) {
    const user = window.authManager.currentUser;
    const skin = window.gamification.SKINS.find(s => s.id === skinId);
    if (!skin) return;

    user.activeSkin = skin.id;
    window.authManager.saveUserLocally();
    window.authManager.syncToDatabase();

    if (this.cube3D) this.cube3D.setSkin(skin.colors);
    this.openStoreModal();
    this.showToast(`Cubo 3D atualizado para: ${skin.name}`);
  }

  openPvPModal() {
    if (window.duelArena) window.duelArena.createRoom();
  }

  copyRoomLink() {
    const input = document.getElementById('room-link-input');
    if (input) {
      input.select();
      navigator.clipboard.writeText(input.value).then(() => {
        this.showToast('🔗 Link da sala copiado! Envie para o seu amigo.');
      });
    }
  }

  openSolveModal(id) {
    const solve = this.solves.find(s => s.id === id);
    if (!solve) return;

    const modal = document.getElementById('solve-detail-modal');
    if (!modal) return;

    document.getElementById('modal-solve-num').textContent = `Solve #${solve.solveNum}`;
    document.getElementById('modal-solve-time').textContent = StatsEngine.formatTime(solve.time, solve.penalty);
    document.getElementById('modal-solve-date').textContent = solve.date;
    document.getElementById('modal-solve-scramble').textContent = solve.scramble;

    const notesInput = document.getElementById('modal-solve-notes');
    if (notesInput) {
      notesInput.value = solve.notes || '';
      notesInput.oninput = () => {
        solve.notes = notesInput.value;
        this.saveSolves();
      };
    }

    const loadCubeBtn = document.getElementById('btn-modal-load-scramble');
    if (loadCubeBtn) {
      loadCubeBtn.onclick = () => {
        this.currentScrambleString = solve.scramble;
        this.currentScramble = solve.scramble.split(' ');
        document.getElementById('scramble-text').textContent = solve.scramble;
        document.getElementById('scramble-visual-cards').innerHTML = ScrambleEngine.renderScrambleHTML(this.currentScramble);
        if (this.cube3D) this.cube3D.applyScramble(this.currentScramble);
        this.activeSolution = CubeSolver.solveScramble(this.currentScramble);
        this.closeModal('solve-detail-modal');
        this.showToast(`Embaralhamento #${solve.solveNum} carregado no cubo 3D!`);
      };
    }

    modal.classList.add('active');
  }

  openSolutionModal() {
    if (!this.activeSolution) {
      this.activeSolution = CubeSolver.solveScramble(this.currentScramble);
    }

    const modal = document.getElementById('solution-modal');
    if (!modal) return;

    const phasesContainer = document.getElementById('solution-phases-container');
    if (phasesContainer) {
      phasesContainer.innerHTML = this.activeSolution.phases.map(p => `
        <div class="solution-phase-card">
          <div class="phase-header">
            <span class="phase-icon">${p.icon}</span>
            <div class="phase-title-wrap">
              <h4>${p.name}</h4>
              <p>${p.description}</p>
            </div>
            <span class="phase-count">${p.moves.length} movs</span>
          </div>
          <div class="phase-moves-strip">
            ${p.moves.map(m => `<span class="sol-move-badge">${m}</span>`).join(' ')}
          </div>
        </div>
      `).join('');
    }

    const fullSeqEl = document.getElementById('solution-full-sequence');
    if (fullSeqEl) {
      fullSeqEl.innerHTML = this.activeSolution.moves.map((m, idx) =>
        `<span class="sol-move-item" id="sol-move-${idx}">${m}</span>`
      ).join(' ');
    }

    const totalMovesEl = document.getElementById('solution-total-moves');
    if (totalMovesEl) totalMovesEl.textContent = `${this.activeSolution.totalMoves} movimentos`;

    modal.classList.add('active');
  }

  playSolutionStepByStep() {
    if (!this.activeSolution || !this.cube3D) return;
    const moves = this.activeSolution.moves;

    if (this.solutionPlayer.isPlaying) {
      this.pauseSolution();
      return;
    }

    this.solutionPlayer.isPlaying = true;
    const playBtn = document.getElementById('btn-play-solution');
    if (playBtn) playBtn.innerHTML = '⏸ Pausar';

    this.cube3D.playMoves(moves, this.solutionPlayer.speed, (stepIdx, move) => {
      document.querySelectorAll('.sol-move-item').forEach(el => el.classList.remove('active-step'));
      const activeEl = document.getElementById(`sol-move-${stepIdx}`);
      if (activeEl) activeEl.classList.add('active-step');

      if (stepIdx === moves.length) {
        this.solutionPlayer.isPlaying = false;
        if (playBtn) playBtn.innerHTML = '▶️ Concluído!';
        this.showToast('🎉 Cubo 3D 100% resolvido!');
      }
    });
  }

  pauseSolution() {
    this.solutionPlayer.isPlaying = false;
    if (this.cube3D) this.cube3D.stopAnimation();
    const playBtn = document.getElementById('btn-play-solution');
    if (playBtn) playBtn.innerHTML = '▶️ Continuar';
  }

  resetCubeToScramble() {
    if (this.cube3D && this.currentScramble) {
      this.cube3D.applyScramble(this.currentScramble, false);
      document.querySelectorAll('.sol-move-item').forEach(el => el.classList.remove('active-step'));
      const playBtn = document.getElementById('btn-play-solution');
      if (playBtn) playBtn.innerHTML = '▶️ Iniciar Reprodução';
      this.showToast('Cubo resetado para o estado do embaralhamento.');
    }
  }

  openBenchmarksModal() {
    const modal = document.getElementById('benchmarks-modal');
    if (modal) modal.classList.add('active');
  }

  closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) modal.classList.remove('active');
  }

  /* ------------------- UI SETUP & KEYBOARD ------------------- */

  setupUIEvents() {
    const btnNewScramble = document.getElementById('btn-new-scramble');
    if (btnNewScramble) btnNewScramble.onclick = () => this.newScramble();

    const btnCopyScramble = document.getElementById('btn-copy-scramble');
    if (btnCopyScramble) btnCopyScramble.onclick = () => this.copyScramble();

    const btnViewSolution = document.getElementById('btn-view-solution');
    if (btnViewSolution) btnViewSolution.onclick = () => this.openSolutionModal();

    const btnBenchmarks = document.getElementById('btn-view-benchmarks');
    if (btnBenchmarks) btnBenchmarks.onclick = () => this.openBenchmarksModal();

    const btnToggleTheme = document.getElementById('btn-toggle-theme');
    if (btnToggleTheme) {
      btnToggleTheme.onclick = () => this.toggleTheme();
    }

    const btnToggle3D = document.getElementById('btn-view-3d');
    const btnToggle2D = document.getElementById('btn-view-2d');
    const cube3DContainer = document.getElementById('cube3d-canvas');
    const netContainer = document.getElementById('cube-net-container');

    if (btnToggle3D && btnToggle2D && cube3DContainer && netContainer) {
      btnToggle3D.onclick = () => {
        btnToggle3D.classList.add('active');
        btnToggle2D.classList.remove('active');
        cube3DContainer.style.display = 'block';
        netContainer.style.display = 'none';
        if (this.cube3D) this.cube3D.onResize();
      };

      btnToggle2D.onclick = () => {
        btnToggle2D.classList.add('active');
        btnToggle3D.classList.remove('active');
        cube3DContainer.style.display = 'none';
        netContainer.style.display = 'flex';
        if (this.cube3D) this.cube3D.update2DNet();
      };
    }

    const btnResetCam = document.getElementById('btn-reset-cam');
    if (btnResetCam) {
      btnResetCam.onclick = () => {
        if (this.cube3D) this.cube3D.resetCamera();
      };
    }

    const cbInspection = document.getElementById('cb-inspection');
    if (cbInspection) {
      cbInspection.onchange = () => {
        this.settings.inspection = cbInspection.checked;
        this.saveSettings();
      };
    }

    const cbSound = document.getElementById('cb-sound');
    if (cbSound) {
      cbSound.onchange = () => {
        this.settings.sound = cbSound.checked;
        if (window.soundEngine) window.soundEngine.enabled = cbSound.checked;
        this.saveSettings();
      };
    }

    const cbAutoScramble = document.getElementById('cb-auto-scramble');
    if (cbAutoScramble) {
      cbAutoScramble.onchange = () => {
        this.settings.autoScramble = cbAutoScramble.checked;
        this.saveSettings();
      };
    }

    const btnClearSession = document.getElementById('btn-clear-session');
    if (btnClearSession) btnClearSession.onclick = () => this.clearSession();

    const btnExportSession = document.getElementById('btn-export-session');
    if (btnExportSession) btnExportSession.onclick = () => this.exportSolves();
  }

  setupKeyboardShortcuts() {
    window.addEventListener('keydown', (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

      if (e.key === 'Escape') {
        document.querySelectorAll('.app-modal.active').forEach(m => m.classList.remove('active'));
      }

      if (e.altKey && e.key.toLowerCase() === 'n') {
        e.preventDefault();
        this.newScramble();
      }

      if (e.altKey && e.key.toLowerCase() === 's') {
        e.preventDefault();
        this.openSolutionModal();
      }

      if (e.altKey && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (this.solves.length > 0) {
          const last = this.solves[this.solves.length - 1];
          this.deleteSolve(last.id);
          this.showToast('Último solve removido.');
        }
      }

      if (e.altKey && e.key === '2') {
        e.preventDefault();
        if (this.solves.length > 0) {
          const last = this.solves[this.solves.length - 1];
          this.togglePenalty(last.id, '+2');
        }
      }

      if (e.altKey && e.key.toLowerCase() === 'd') {
        e.preventDefault();
        if (this.solves.length > 0) {
          const last = this.solves[this.solves.length - 1];
          this.togglePenalty(last.id, 'DNF');
        }
      }
    });
  }

  showToast(msg) {
    const toast = document.getElementById('app-toast');
    if (!toast) return;
    toast.textContent = msg;
    toast.classList.add('visible');
    setTimeout(() => {
      toast.classList.remove('visible');
    }, 2800);
  }
}

window.addEventListener('DOMContentLoaded', () => {
  window.app = new FireCubeApp();
});
