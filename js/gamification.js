/**
 * gamification.js - Codédex Club (codedex.io) Gamification System
 * Features:
 * - Collectible Clubédex Member Passport (Player Card with Streak, Level, Titles, Rank)
 * - Daily Quests / Bounties with real-time tracking and claimable XP / FireCoins
 * - Enamel Pins & Badges collection showcase
 * - Elo rating, Leveling curve, and 3D Cube Skins
 */

class GamificationEngine {
  constructor() {
    this.TITLES = [
      { level: 0, title: 'Iniciante do Fogo', icon: '🌱' },
      { level: 1, title: 'Aprendiz do Fogo', icon: '🔥' },
      { level: 2, title: 'Mestre do F2L', icon: '🧩' },
      { level: 3, title: 'Velocista Sônico', icon: '⚡' },
      { level: 4, title: 'Lenda do Sub-20', icon: '🌪️' },
      { level: 5, title: 'Titã WCA Imperial', icon: '👑' }
    ];

    this.PINS = [
      { id: 'pin_first_solve', title: 'Giro Inicial', desc: 'Completou sua 1ª resolução oficial', icon: '🎯', xp: 40, coins: 15 },
      { id: 'pin_sub_60', title: 'Fagulha', desc: 'Resolução Sub-60s (< 1 minuto)', icon: '⚡', xp: 80, coins: 30 },
      { id: 'pin_sub_30', title: 'Lança-Chamas', desc: 'Resolução Sub-30s (< 30 segundos)', icon: '🔥', xp: 160, coins: 60 },
      { id: 'pin_sub_15', title: 'Lorde Cósmico', desc: 'Resolução Sub-15s (< 15 segundos)', icon: '👑', xp: 400, coins: 150 },
      { id: 'pin_bot_slayer', title: 'Caçador de Bots', desc: 'Venceu um duelo contra a IA', icon: '🤖', xp: 100, coins: 40 },
      { id: 'pin_streak_3', title: 'Em Chamas', desc: 'Manteve 3 dias seguidos de streak', icon: '🌟', xp: 120, coins: 50 },
      { id: 'pin_collector', title: 'Colecionador', desc: 'Desbloqueou uma skin na Loja 3D', icon: '🎨', xp: 90, coins: 35 },
      { id: 'pin_founder', title: 'Membro do Clube', desc: 'Conta persistente salva no banco', icon: '🛡️', xp: 50, coins: 20 }
    ];

    this.DEFAULT_QUESTS = [
      {
        id: 'quest_solves',
        title: 'Treino Diário de Velocidade',
        desc: 'Complete 3 resoluções no cronômetro hoje',
        target: 3,
        current: 0,
        xp: 45,
        coins: 20,
        icon: '🎯',
        claimed: false
      },
      {
        id: 'quest_duel',
        title: 'Duelo na Arena',
        desc: 'Vença 1 duelo contra qualquer Bot de IA',
        target: 1,
        current: 0,
        xp: 80,
        coins: 35,
        icon: '⚔️',
        claimed: false
      },
      {
        id: 'quest_sub45',
        title: 'Ritmo Acelerado',
        desc: 'Consiga uma resolução Sub-45s',
        target: 1,
        current: 0,
        xp: 65,
        coins: 25,
        icon: '⚡',
        claimed: false
      },
      {
        id: 'quest_inspection',
        title: 'Inspeção Cirúrgica',
        desc: 'Complete 1 solve usando a inspeção de 15s',
        target: 1,
        current: 0,
        xp: 35,
        coins: 15,
        icon: '🧠',
        claimed: false
      }
    ];

    this.SKINS = [
      {
        id: 'default',
        name: 'Clássico Oficial WCA',
        cost: 0,
        unlocked: true,
        colors: { U: 0xffffff, D: 0xffd500, F: 0x009b48, B: 0x0046ad, L: 0xff5800, R: 0xb71234, INNER: 0x18181b }
      },
      {
        id: 'fire_inferno',
        name: 'Fogo Infernal 🔥',
        cost: 150,
        unlocked: false,
        colors: { U: 0xffea00, D: 0xd90429, F: 0xff5400, B: 0x3a0ca3, L: 0xff9100, R: 0xef233c, INNER: 0x2b0908 }
      },
      {
        id: 'cyber_neon',
        name: 'Cyberpunk Neon 🌌',
        cost: 250,
        unlocked: false,
        colors: { U: 0x00f5d4, D: 0x7b2cbf, F: 0x00bbf9, B: 0x3f37c9, L: 0xf72585, R: 0xff0054, INNER: 0x0f172a }
      },
      {
        id: 'carbon_black',
        name: 'Fibra de Carbono 🖤',
        cost: 350,
        unlocked: false,
        colors: { U: 0xe2e8f0, D: 0x64748b, F: 0x22c55e, B: 0x0284c7, L: 0xea580c, R: 0xdc2626, INNER: 0x09090b }
      },
      {
        id: 'royal_gold',
        name: 'Ouro Imperial 👑',
        cost: 500,
        unlocked: false,
        colors: { U: 0xfff3b0, D: 0xca8a04, F: 0xd97706, B: 0x78350f, L: 0xf59e0b, R: 0xb45309, INNER: 0x1c1917 }
      }
    ];

    this.unlockedPins = [];
    this.quests = [];
    this.streak = 1;

    this.init();
  }

  init() {
    this.loadGamificationData();
    this.checkDailyStreak();
    this.syncUserSkins();
  }

  loadGamificationData() {
    // Pins
    const savedPins = localStorage.getItem('firecube_pins');
    this.unlockedPins = savedPins ? JSON.parse(savedPins) : ['pin_first_solve'];

    // Quests
    const savedQuests = localStorage.getItem('firecube_quests');
    const questDate = localStorage.getItem('firecube_quests_date');
    const today = new Date().toDateString();

    if (savedQuests && questDate === today) {
      try {
        this.quests = JSON.parse(savedQuests);
      } catch (e) {
        this.resetDailyQuests();
      }
    } else {
      this.resetDailyQuests();
    }

    // Streak
    const savedStreak = localStorage.getItem('firecube_streak');
    this.streak = savedStreak ? parseInt(savedStreak, 10) : 1;
  }

  resetDailyQuests() {
    this.quests = JSON.parse(JSON.stringify(this.DEFAULT_QUESTS));
    localStorage.setItem('firecube_quests', JSON.stringify(this.quests));
    localStorage.setItem('firecube_quests_date', new Date().toDateString());
  }

  saveGamificationData() {
    localStorage.setItem('firecube_pins', JSON.stringify(this.unlockedPins));
    localStorage.setItem('firecube_quests', JSON.stringify(this.quests));
    localStorage.setItem('firecube_streak', this.streak.toString());
  }

  checkDailyStreak() {
    const lastDate = localStorage.getItem('firecube_last_login_date');
    const today = new Date().toDateString();

    if (!lastDate) {
      this.streak = 1;
    } else if (lastDate !== today) {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      if (yesterday.toDateString() === lastDate) {
        this.streak += 1;
        if (this.streak >= 3) this.unlockPin('pin_streak_3');
      } else {
        this.streak = 1; // Streak reset
      }
    }
    localStorage.setItem('firecube_last_login_date', today);
    this.saveGamificationData();
  }

  syncUserSkins() {
    const user = window.authManager ? window.authManager.currentUser : null;
    if (!user) return;
    if (!user.unlockedSkins) user.unlockedSkins = ['default'];

    this.SKINS.forEach(skin => {
      skin.unlocked = user.unlockedSkins.includes(skin.id);
    });
  }

  getUserTitle(level) {
    const titleObj = [...this.TITLES].reverse().find(t => level >= t.level) || this.TITLES[0];
    return `${titleObj.icon} ${titleObj.title}`;
  }

  getMemberId(userId) {
    if (!userId) return '#CUB-0001';
    let hash = 0;
    for (let i = 0; i < userId.length; i++) hash = (hash * 31 + userId.charCodeAt(i)) % 9000;
    return `#CUB-${1000 + Math.abs(hash)}`;
  }

  /* ------------------- LEVEL & XP ------------------- */

  addXP(amount, reason = '') {
    const user = window.authManager.currentUser;
    if (!user) return;

    user.xp = (user.xp || 0) + amount;
    const requiredXP = user.level * 160;

    let leveledUp = false;
    while (user.xp >= requiredXP) {
      user.xp -= requiredXP;
      user.level += 1;
      user.fireCoins = (user.fireCoins || 0) + 70; // Level up reward
      leveledUp = true;
    }

    window.authManager.saveUserLocally();
    window.authManager.syncToDatabase();

    if (leveledUp) {
      if (window.soundEngine) window.soundEngine.playLevelUp();
      this.showLevelUpModal(user.level);
    } else if (window.app) {
      window.app.showToast(`+${amount} XP ${reason ? '· ' + reason : ''}`);
    }

    if (window.authManager) window.authManager.updateHeaderUI();
    this.updatePassportUI();
  }

  addCoins(amount) {
    const user = window.authManager.currentUser;
    if (!user) return;
    user.fireCoins = (user.fireCoins || 0) + amount;
    window.authManager.saveUserLocally();
    window.authManager.syncToDatabase();
    if (window.soundEngine) window.soundEngine.playCoinSound();
    if (window.authManager) window.authManager.updateHeaderUI();
    this.updatePassportUI();
  }

  updateElo(change) {
    const user = window.authManager.currentUser;
    if (!user) return;

    user.elo = Math.max(400, (user.elo || 1000) + change);
    window.authManager.saveUserLocally();
    window.authManager.syncToDatabase();
    if (window.authManager) window.authManager.updateHeaderUI();
  }

  /* ------------------- PINS / BADGES ------------------- */

  unlockPin(pinId) {
    if (this.unlockedPins.includes(pinId)) return;

    const pin = this.PINS.find(p => p.id === pinId);
    if (!pin) return;

    this.unlockedPins.push(pinId);
    this.saveGamificationData();

    this.addXP(pin.xp, `Pin Desbloqueado: ${pin.title}`);
    this.addCoins(pin.coins);

    if (window.app) {
      window.app.showToast(`✨ Novo Pin do Clubédex Conquistado: ${pin.icon} ${pin.title}!`);
    }
  }

  unlock(pinId) {
    if (!pinId.startsWith('pin_')) {
      this.unlockPin('pin_' + pinId);
    } else {
      this.unlockPin(pinId);
    }
  }

  checkAchievementsOnSolve(solveTimeMs, isPB) {
    this.onSolveCompleted(solveTimeMs, true);
    this.addXP(40, 'Resolução');
    if (isPB) {
      this.addXP(100, 'NOVO RECORDE PESSOAL');
      this.addCoins(25);
    }
  }

  /* ------------------- QUESTS REACTIVE TRACKING ------------------- */

  onSolveCompleted(timeMs, hadInspection) {
    // 1. Quests progress
    const questSolves = this.quests.find(q => q.id === 'quest_solves');
    if (questSolves && !questSolves.claimed) {
      questSolves.current = Math.min(questSolves.target, questSolves.current + 1);
    }

    if (timeMs < 45000) {
      const questSub45 = this.quests.find(q => q.id === 'quest_sub45');
      if (questSub45 && !questSub45.claimed) {
        questSub45.current = 1;
      }
    }

    if (hadInspection) {
      const questInsp = this.quests.find(q => q.id === 'quest_inspection');
      if (questInsp && !questInsp.claimed) {
        questInsp.current = 1;
      }
    }

    this.saveGamificationData();

    // 2. Pins checks
    this.unlockPin('pin_first_solve');
    if (timeMs < 60000) this.unlockPin('pin_sub_60');
    if (timeMs < 30000) this.unlockPin('pin_sub_30');
    if (timeMs < 15000) this.unlockPin('pin_sub_15');

    const user = window.authManager ? window.authManager.currentUser : null;
    if (user && !user.isGuest) {
      this.unlockPin('pin_founder');
    }
  }

  onDuelWon() {
    const questDuel = this.quests.find(q => q.id === 'quest_duel');
    if (questDuel && !questDuel.claimed) {
      questDuel.current = 1;
      this.saveGamificationData();
    }
    this.unlockPin('pin_bot_slayer');
  }

  claimQuest(questId) {
    const quest = this.quests.find(q => q.id === questId);
    if (!quest || quest.claimed || quest.current < quest.target) return;

    quest.claimed = true;
    this.saveGamificationData();

    this.addXP(quest.xp, `Missão Diária Concluída`);
    this.addCoins(quest.coins);

    if (window.soundEngine) window.soundEngine.playCoinSound();
    if (window.app) {
      window.app.showToast(`🎉 Recompensa de Missão Reivindicada: +${quest.xp} XP e +${quest.coins} 🔥!`);
    }

    this.renderQuestsList();
  }

  /* ------------------- MODAL & UI RENDERING ------------------- */

  openClubedexModal() {
    const modal = document.getElementById('clubedex-modal');
    if (!modal) return;

    this.renderPassportCard();
    this.renderQuestsList();
    this.renderPinsGrid();

    modal.classList.add('active');
  }

  renderPassportCard() {
    const user = window.authManager.currentUser || { username: 'Visitante', avatar: '🔥', level: 1, xp: 0, fireCoins: 100, elo: 1000, duelsWon: 0, duelsLost: 0 };
    const requiredXP = user.level * 160;
    const progressPct = Math.min(100, Math.round(((user.xp || 0) / requiredXP) * 100));
    const memberId = this.getMemberId(user.id);
    const title = this.getUserTitle(user.level);

    const cardEl = document.getElementById('clubedex-passport-container');
    if (cardEl) {
      cardEl.innerHTML = `
        <div class="clubedex-passport-card">
          <div class="passport-holo-tag">CODÉDEX CLUB · OFFICIAL CUBER PASSPORT</div>
          <div class="passport-main-row">
            <div class="passport-avatar-wrap">
              <span class="passport-avatar-icon">${user.avatar || '🔥'}</span>
              <span class="passport-level-tag">Lvl ${user.level}</span>
            </div>
            <div class="passport-info-column">
              <div class="passport-name-row">
                <h3>${user.username}</h3>
                <span class="passport-member-id">${memberId}</span>
              </div>
              <div class="passport-title-text">${title}</div>
              <div class="passport-streak-row">
                <span class="streak-fire-pill">🔥 ${this.streak} ${this.streak === 1 ? 'Dia' : 'Dias'} de Fogo Seguidos!</span>
                <span class="passport-coins-pill">${user.fireCoins} 🔥 Moedas</span>
              </div>
            </div>
          </div>

          <div class="passport-xp-section">
            <div class="passport-xp-labels">
              <span>Progresso para o Nível ${user.level + 1}</span>
              <span><strong>${user.xp || 0}</strong> / ${requiredXP} XP</span>
            </div>
            <div class="passport-xp-track">
              <div class="passport-xp-fill" style="width: ${progressPct}%;"></div>
            </div>
          </div>

          <div class="passport-stats-footer">
            <div><strong>${user.elo || 1000}</strong><small>Elo Competitivo</small></div>
            <div><strong>${user.duelsWon || 0}V - ${user.duelsLost || 0}D</strong><small>Duelos na Arena</small></div>
            <div><strong>${this.unlockedPins.length} / ${this.PINS.length}</strong><small>Pins Colecionados</small></div>
          </div>
        </div>
      `;
    }
  }

  renderQuestsList() {
    const listEl = document.getElementById('clubedex-quests-list');
    if (!listEl) return;

    listEl.innerHTML = this.quests.map(q => {
      const isDone = q.current >= q.target;
      const pct = Math.min(100, Math.round((q.current / q.target) * 100));

      return `
        <div class="club-quest-card ${q.claimed ? 'is-claimed' : (isDone ? 'is-ready' : '')}">
          <div class="quest-icon-badge">${q.icon}</div>
          <div class="quest-content">
            <div class="quest-top-line">
              <h4>${q.title}</h4>
              <span class="quest-reward-pill">+${q.xp} XP · +${q.coins} 🔥</span>
            </div>
            <p>${q.desc}</p>
            <div class="quest-progress-track">
              <div class="quest-progress-fill" style="width: ${pct}%;"></div>
            </div>
          </div>
          <div class="quest-action-col">
            ${q.claimed
              ? `<span class="badge-claimed">✅ Concluído</span>`
              : (isDone
                ? `<button class="btn-claim-quest" onclick="gamification.claimQuest('${q.id}')">Reivindicar!</button>`
                : `<span class="quest-counter">${q.current}/${q.target}</span>`
              )
            }
          </div>
        </div>
      `;
    }).join('');
  }

  renderPinsGrid() {
    const gridEl = document.getElementById('clubedex-pins-grid');
    if (!gridEl) return;

    gridEl.innerHTML = this.PINS.map(pin => {
      const isUnlocked = this.unlockedPins.includes(pin.id);
      return `
        <div class="club-pin-item ${isUnlocked ? 'unlocked' : 'locked'}" title="${pin.title}: ${pin.desc}">
          <div class="pin-enamel-badge">
            <span>${pin.icon}</span>
          </div>
          <strong class="pin-title">${pin.title}</strong>
          <small class="pin-desc">${isUnlocked ? 'Desbloqueado' : 'Bloqueado'}</small>
        </div>
      `;
    }).join('');
  }

  updatePassportUI() {
    this.renderPassportCard();
  }

  showLevelUpModal(level) {
    const modal = document.getElementById('levelup-modal');
    if (modal) {
      const numEl = document.getElementById('levelup-number');
      if (numEl) numEl.textContent = level;
      modal.classList.add('active');
    }
  }

  getLeaderboard() {
    const user = window.authManager.currentUser;
    return [
      { rank: 1, name: 'Yiheng Wang 👑', avatar: '👑', badge: 'WCA Recordista', avgTime: '4.48s', elo: 2540 },
      { rank: 2, name: 'Max Park ⚡', avatar: '⚡', badge: 'Lenda Mundial', avgTime: '4.86s', elo: 2480 },
      { rank: 3, name: 'Tymon Kolasiński 🌪️', avatar: '🌪️', badge: 'Mestre CFOP', avgTime: '5.09s', elo: 2390 },
      { rank: 4, name: 'SpeedBot 3000', avatar: '🤖', badge: 'IA Avançada', avgTime: '20.50s', elo: 1850 },
      {
        rank: 5,
        name: user ? user.username : 'Você',
        avatar: user ? user.avatar : '🔥',
        badge: this.getUserTitle(user ? user.level : 1),
        avgTime: document.getElementById('stat-best')?.textContent || '32.40s',
        elo: user ? user.elo : 1000,
        isCurrentUser: true
      },
      { rank: 6, name: 'AlgoBot Pro', avatar: '⚡', badge: 'IA Intermediária', avgTime: '42.00s', elo: 1250 },
      { rank: 7, name: 'Cubinho Bot', avatar: '🤖', badge: 'IA Iniciante', avgTime: '1:40.00', elo: 750 }
    ];
  }
}

window.gamification = new GamificationEngine();
