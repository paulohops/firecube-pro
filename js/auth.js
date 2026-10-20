/**
 * auth.js - User Authentication, Database Sync & Profile Management
 * Connects to the server REST API to persist accounts and solves in a real database.
 */

class AuthManager {
  constructor() {
    this.currentUser = null;
    this.token = null;
    this.AVATARS = [
      { id: 'fire', icon: '🔥', label: 'Chama Eterna' },
      { id: 'cube', icon: '🧊', label: 'Cubo de Gelo' },
      { id: 'lightning', icon: '⚡', label: 'Raio Veloz' },
      { id: 'robot', icon: '🤖', label: 'Cibernético' },
      { id: 'dragon', icon: '🐉', label: 'Dragão Mestre' },
      { id: 'crown', icon: '👑', label: 'Coroa Imperial' },
      { id: 'wolf', icon: '🐺', label: 'Lobo Solitário' },
      { id: 'target', icon: '🎯', label: 'Precisão Total' }
    ];

    this.init();
  }

  async init() {
    const savedUser = localStorage.getItem('firecube_user');
    const savedToken = localStorage.getItem('firecube_token');

    if (savedUser) {
      try {
        this.currentUser = JSON.parse(savedUser);
        this.token = savedToken || this.currentUser.id;
      } catch (e) {}
    }

    // Ensure only the user's account (Paulonho) is configured at level 0
    if (!this.currentUser || this.currentUser.username !== 'Paulonho' || this.currentUser.level !== 0) {
      this.currentUser = {
        id: "usr_1792450526249_414",
        username: "Paulonho",
        email: "paulohops@live.com",
        avatar: "🔥",
        avatarId: "fire",
        elo: 1000,
        level: 0,
        xp: 0,
        fireCoins: 0,
        duelsWon: 0,
        duelsLost: 0,
        activeSkin: "default",
        unlockedSkins: ["default"],
        isGuest: false,
        createdAt: "19/10/2026"
      };
      this.token = this.currentUser.id;
      this.saveUserLocally();
    }

    // Sync with database if connected
    this.syncFromDatabase();

    this.updateHeaderUI();
  }

  saveUserLocally() {
    localStorage.setItem('firecube_user', JSON.stringify(this.currentUser));
    if (this.token) localStorage.setItem('firecube_token', this.token);
    this.updateHeaderUI();
  }

  async syncFromDatabase() {
    if (!this.currentUser || !this.currentUser.id || this.currentUser.isGuest) return;

    try {
      const res = await fetch(`/api/auth/me?userId=${this.currentUser.id}`);
      if (res.ok) {
        const data = await res.json();
        if (data.user) {
          this.currentUser = { ...this.currentUser, ...data.user, isGuest: false };
          this.saveUserLocally();
          if (Array.isArray(data.solves) && window.app) {
            window.app.solves = data.solves;
            window.app.saveSolves();
            window.app.updateStatsUI();
            window.app.renderSolvesList();
          }
        }
      }
    } catch (e) {
      console.log('Database sync offline, using local cache.');
    }
  }

  async syncToDatabase() {
    if (!this.currentUser || !this.currentUser.id || this.currentUser.isGuest) return;

    try {
      await fetch('/api/user/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: this.currentUser.id,
          elo: this.currentUser.elo,
          level: this.currentUser.level,
          xp: this.currentUser.xp,
          fireCoins: this.currentUser.fireCoins,
          duelsWon: this.currentUser.duelsWon,
          duelsLost: this.currentUser.duelsLost,
          activeSkin: this.currentUser.activeSkin,
          unlockedSkins: this.currentUser.unlockedSkins
        })
      });
    } catch (e) {}
  }

  async register(username, email, password, avatarId) {
    const avatarObj = this.AVATARS.find(a => a.id === avatarId) || this.AVATARS[0];

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username,
          email,
          password,
          avatar: avatarObj.icon,
          avatarId: avatarObj.id
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro ao criar conta.');

      this.currentUser = { ...data.user, isGuest: false };
      this.token = data.token;
      this.saveUserLocally();
      if (window.soundEngine) window.soundEngine.playCoinSound();
      return { success: true, user: this.currentUser };
    } catch (err) {
      return { success: false, error: err.message };
    }
  }

  async login(identifier, password) {
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier, password })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro ao realizar login.');

      this.currentUser = { ...data.user, isGuest: false };
      this.token = data.token;
      this.saveUserLocally();

      if (data.solves && window.app) {
        window.app.solves = data.solves;
        window.app.saveSolves();
        window.app.updateStatsUI();
        window.app.renderSolvesList();
      }

      if (window.soundEngine) window.soundEngine.playCoinSound();
      return { success: true, user: this.currentUser };
    } catch (err) {
      return { success: false, error: err.message };
    }
  }

  logout() {
    this.currentUser = {
      id: 'usr_guest_' + Math.floor(1000 + Math.random() * 9000),
      username: 'Visitante',
      email: '',
      avatar: '🔥',
      avatarId: 'fire',
      level: 1,
      xp: 0,
      fireCoins: 100,
      elo: 1000,
      duelsWon: 0,
      duelsLost: 0,
      unlockedSkins: ['default'],
      activeSkin: 'default',
      isGuest: true,
      createdAt: new Date().toLocaleDateString('pt-BR')
    };
    this.token = null;
    localStorage.removeItem('firecube_token');
    this.saveUserLocally();
    if (window.app) {
      window.app.solves = [];
      window.app.saveSolves();
      window.app.updateStatsUI();
      window.app.renderSolvesList();
      window.app.showToast('Você saiu da sua conta.');
    }
  }

  getDivision(elo) {
    if (elo >= 2200) return { name: 'Mestre do Fogo', badge: '🔥 Mestre', color: '#ef4444' };
    if (elo >= 1800) return { name: 'Platina', badge: '💎 Platina', color: '#06b6d4' };
    if (elo >= 1400) return { name: 'Ouro', badge: '🥇 Ouro', color: '#f59e0b' };
    if (elo >= 1000) return { name: 'Prata', badge: '🥈 Prata', color: '#94a3b8' };
    return { name: 'Bronze', badge: '🥉 Bronze', color: '#b45309' };
  }

  updateHeaderUI() {
    if (!this.currentUser) return;

    const avatarEl = document.getElementById('user-header-avatar');
    const nameEl = document.getElementById('user-header-name');
    const eloEl = document.getElementById('user-header-elo');
    const coinsEl = document.getElementById('user-header-coins');
    const levelEl = document.getElementById('user-header-level');
    const statusPill = document.getElementById('user-header-status-pill');

    if (avatarEl) avatarEl.textContent = this.currentUser.avatar;
    if (nameEl) nameEl.textContent = this.currentUser.username;
    if (eloEl) eloEl.textContent = `${this.currentUser.elo} Elo`;
    if (coinsEl) coinsEl.textContent = `${this.currentUser.fireCoins} 🔥`;
    if (levelEl) levelEl.textContent = `Nív. ${this.currentUser.level}`;

    if (statusPill) {
      statusPill.textContent = this.currentUser.isGuest ? 'Visitante' : '💾 Banco Ativo';
      statusPill.className = 'user-status-pill ' + (this.currentUser.isGuest ? 'status-guest' : 'status-db');
    }

    const streakEl = document.getElementById('header-streak-count');
    if (streakEl && window.gamification) {
      streakEl.textContent = window.gamification.streak || 1;
    }
  }
}

window.authManager = new AuthManager();
