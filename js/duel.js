/**
 * duel.js - Dedicated Bot Duel Arena & 3D Bot Cube Solver
 * Corrected realistic difficulties, synchronized timer start, and live 3D bot simulation.
 */

class DuelArena {
  constructor() {
    this.mode = 'idle'; // 'idle' | 'bot' | 'pvp'
    this.activeBot = null;
    this.botTimer = null;
    this.botStartTime = 0;
    this.botElapsedTime = 0;
    this.botTargetMs = 0;
    this.botFinished = false;
    this.botCube3D = null;
    this.botSolutionMoves = [];
    this.botReady = false;

    // Realistic bot difficulties with precise TPS and human variation
    this.BOTS = [
      {
        id: 'bot_beginner',
        name: 'Cubinho Bot',
        avatar: '🤖',
        tier: 'Iniciante',
        elo: 750,
        avgMs: 100000, // ~1m 40s
        tps: 1.1,
        moveDuration: 550,
        desc: 'Método Camada por Camada (LBL) · Média ~1m 40s (1.1 TPS)'
      },
      {
        id: 'bot_intermediate',
        name: 'AlgoBot Pro',
        avatar: '⚡',
        tier: 'Intermediário',
        elo: 1250,
        avgMs: 42000,  // ~42s
        tps: 2.4,
        moveDuration: 300,
        desc: 'CFOP Reduzido (4-Look LL) · Média ~42s (2.4 TPS)'
      },
      {
        id: 'bot_advanced',
        name: 'SpeedBot 3000',
        avatar: '🌪️',
        tier: 'Avançado',
        elo: 1850,
        avgMs: 20500,  // ~20.5s
        tps: 4.5,
        moveDuration: 180,
        desc: 'Full CFOP (Fridrich) · Média ~20.5s (4.5 TPS)'
      },
      {
        id: 'bot_legend',
        name: 'YihengBot AI 🔥',
        avatar: '👑',
        tier: 'Campeão Mundial',
        elo: 2450,
        avgMs: 8800,   // ~8.8s
        tps: 8.5,
        moveDuration: 95,
        desc: 'Elite Mundial WCA · Média ~8.8s (8.5 TPS · Zero Pausas)'
      }
    ];

    this.selectedBotId = 'bot_intermediate';
  }

  initBotDuelPage() {
    this.mode = 'bot';
    this.botFinished = false;
    this.botReady = true;

    const bot = this.BOTS.find(b => b.id === this.selectedBotId) || this.BOTS[1];
    this.activeBot = bot;

    // Generate Scramble for duel
    if (window.app) {
      window.app.newScramble();
    }

    // Initialize Bot's 3D Cube
    const botCanvasContainer = document.getElementById('bot-cube3d-canvas');
    if (botCanvasContainer && typeof RubiksCube3D !== 'undefined') {
      if (!this.botCube3D) {
        this.botCube3D = new RubiksCube3D('bot-cube3d-canvas', null);
      }
      if (window.app && window.app.currentScramble) {
        this.botCube3D.applyScramble(window.app.currentScramble, false);
      }
    }

    // Calculate Bot's solution moves
    if (window.app && window.app.currentScramble) {
      const solution = CubeSolver.solveScramble(window.app.currentScramble);
      this.botSolutionMoves = solution.moves || [];
    }

    // Set Bot Target Time with natural variation ±6%
    const variation = 0.94 + Math.random() * 0.12;
    this.botTargetMs = Math.round(bot.avgMs * variation);

    this.updateBotPageUI();
  }

  setBotDifficulty(botId) {
    this.selectedBotId = botId;
    this.initBotDuelPage();
  }

  updateBotPageUI() {
    const bot = this.activeBot;
    if (!bot) return;

    const avatarEl = document.getElementById('duel-bot-avatar');
    const nameEl = document.getElementById('duel-bot-name');
    const eloEl = document.getElementById('duel-bot-elo');
    const descEl = document.getElementById('duel-bot-desc');
    const statusEl = document.getElementById('duel-bot-status-badge');
    const progressEl = document.getElementById('duel-bot-progress-fill');
    const timeEl = document.getElementById('duel-bot-timer-display');

    if (avatarEl) avatarEl.textContent = bot.avatar;
    if (nameEl) nameEl.textContent = bot.name;
    if (eloEl) eloEl.textContent = `${bot.elo} Elo`;
    if (descEl) descEl.textContent = bot.desc;

    if (statusEl) {
      statusEl.className = 'duel-status-waiting';
      statusEl.innerHTML = '🟡 Aguardando você iniciar o cronômetro...';
    }

    if (progressEl) progressEl.style.width = '0%';
    if (timeEl) timeEl.textContent = '0:00.00';

    // Highlight selected button
    document.querySelectorAll('.btn-bot-tier').forEach(btn => {
      btn.classList.toggle('active', btn.getAttribute('data-bot') === bot.id);
    });
  }

  /**
   * Called by app.js IMMEDIATELY when user starts their timer!
   */
  onUserStartedTimer() {
    if (this.mode !== 'bot' || this.botFinished || !this.botReady) return;

    this.botStartTime = performance.now();
    const statusEl = document.getElementById('duel-bot-status-badge');
    if (statusEl) {
      statusEl.className = 'duel-status-running';
      statusEl.innerHTML = '🔥 EM RESOLUÇÃO!';
    }

    // Start 3D Cube animation for the bot
    if (this.botCube3D && this.botSolutionMoves.length > 0) {
      this.botCube3D.playMoves(this.botSolutionMoves, this.activeBot.moveDuration);
    }

    // Start Bot timer loop
    clearInterval(this.botTimer);
    this.botTimer = setInterval(() => {
      const now = performance.now();
      this.botElapsedTime = now - this.botStartTime;
      const progress = Math.min(100, Math.round((this.botElapsedTime / this.botTargetMs) * 100));

      // Phase Text
      let phase = 'Cruz Branca ✝️';
      if (progress > 20 && progress <= 65) phase = 'F2L (4 Pares) 🧩';
      else if (progress > 65 && progress <= 85) phase = 'OLL 🟡';
      else if (progress > 85 && progress < 100) phase = 'PLL 🏁';
      else if (progress >= 100) phase = 'RESOLVIDO! ✅';

      const timeEl = document.getElementById('duel-bot-timer-display');
      const progEl = document.getElementById('duel-bot-progress-fill');
      const phaseEl = document.getElementById('duel-bot-phase-label');

      if (timeEl) timeEl.textContent = StatsEngine.formatTime(this.botElapsedTime);
      if (progEl) progEl.style.width = `${progress}%`;
      if (phaseEl) phaseEl.textContent = phase;

      if (progress >= 100) {
        clearInterval(this.botTimer);
        this.botFinished = true;

        if (window.app && window.app.timerState === 'RUNNING') {
          // Bot finished before user
          this.onBotWon();
        }
      }
    }, 60);
  }

  onBotWon() {
    clearInterval(this.botTimer);
    if (this.botCube3D) this.botCube3D.stopAnimation();

    const user = window.authManager.currentUser;
    user.duelsLost = (user.duelsLost || 0) + 1;
    window.gamification.updateElo(-10);
    window.gamification.addXP(25, 'Duelo contra Bot');

    if (window.soundEngine) window.soundEngine.playDuelLose();
    this.showDuelResultModal(false, this.activeBot.name, this.botElapsedTime);
  }

  onUserWon(userTimeMs) {
    clearInterval(this.botTimer);
    if (this.botCube3D) this.botCube3D.stopAnimation();

    const user = window.authManager.currentUser;
    user.duelsWon = (user.duelsWon || 0) + 1;

    window.gamification.updateElo(+25);
    window.gamification.addXP(130, 'VITÓRIA NO DUELO CONTRA BOT');
    window.gamification.addCoins(40);
    window.gamification.onDuelWon();
    window.gamification.unlock('bot_slayer');
    if (user.duelsWon >= 5) window.gamification.unlock('duel_master');

    if (window.soundEngine) window.soundEngine.playDuelWin();
    this.showDuelResultModal(true, this.activeBot.name, this.botElapsedTime, userTimeMs);
  }

  showDuelResultModal(isWin, oppName, oppTimeMs, userTimeMs) {
    const modal = document.getElementById('duel-result-modal');
    if (!modal) return;

    const titleEl = document.getElementById('duel-result-title');
    const descEl = document.getElementById('duel-result-desc');
    const rewardEl = document.getElementById('duel-result-rewards');

    if (isWin) {
      titleEl.innerHTML = '🏆 VITÓRIA ÉPICA!';
      titleEl.style.color = '#22c55e';
      descEl.textContent = `Você superou ${oppName} com o tempo de ${StatsEngine.formatTime(userTimeMs)}!`;
      rewardEl.innerHTML = `<span class="reward-pill">+25 Elo</span> <span class="reward-pill">+130 XP</span> <span class="reward-pill">+40 🔥 Moedas</span>`;
    } else {
      titleEl.innerHTML = '💀 DERROTA!';
      titleEl.style.color = '#ef4444';
      descEl.textContent = `${oppName} finalizou primeiro em ${StatsEngine.formatTime(oppTimeMs)}.`;
      rewardEl.innerHTML = `<span class="reward-pill" style="color: #ef4444;">-10 Elo</span> <span class="reward-pill">+25 XP</span>`;
    }

    modal.classList.add('active');
  }

  resetDuel() {
    clearInterval(this.botTimer);
    this.botFinished = false;
    this.botElapsedTime = 0;
    this.initBotDuelPage();
  }
}

window.duelArena = new DuelArena();
