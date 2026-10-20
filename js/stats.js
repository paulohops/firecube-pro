/**
 * stats.js - WCA Speedcubing Statistics & Skill Level Benchmarks Engine
 * Computes official Ao5, Ao12, Mediana, Desvio, PB, and skill tier comparisons.
 */

const StatsEngine = {
  // Parâmetros de referência mundiais (em milissegundos)
  BENCHMARKS: {
    BEGINNER: {
      id: 'beginner',
      name: 'Iniciante',
      badge: '🟢 Iniciante',
      minTime: 90000, // Acima de 1:30 min (90s)
      maxTime: Infinity,
      method: 'Camada por Camada (LBL - Layer by Layer)',
      movesAvg: '100 - 130 movimentos',
      tps: '1.0 - 1.5 TPS',
      nextTier: 'Intermediário (Sub-1:15)',
      targetMs: 75000,
      tips: [
        'Treine para não parar entre os passos.',
        'Memorize os algoritmos básicos de cantos e meios sem olhar cola.',
        'Pratique a Cruz Branca na parte inferior (lado D) desde já.'
      ]
    },
    INTERMEDIATE: {
      id: 'intermediate',
      name: 'Intermediário',
      badge: '🟡 Intermediário',
      minTime: 30000, // 30s a 1:30 min
      maxTime: 90000,
      method: 'CFOP Reduzido (4-Look LL / F2L Intuitivo)',
      movesAvg: '65 - 85 movimentos',
      tps: '2.0 - 3.5 TPS',
      nextTier: 'Avançado (Sub-30)',
      targetMs: 30000,
      tips: [
        'Domine o F2L intuitivo sem pausar para caçar peças.',
        'Aprenda OLL em 2 olhares (cruz amarela + 7 algoritmos).',
        'Aprenda PLL em 2 olhares (orientar cantos depois permutar meios).',
        'Evite rotações de cubo inteiras (cube rotations) durante o F2L.'
      ]
    },
    ADVANCED: {
      id: 'advanced',
      name: 'Avançado',
      badge: '🟠 Avançado (Sub-30 / Sub-20)',
      minTime: 15000, // 15s a 30s
      maxTime: 30000,
      method: 'CFOP Completo (Fridrich)',
      movesAvg: '50 - 60 movimentos',
      tps: '4.0 - 6.0 TPS',
      nextTier: 'Expert / Pro (Sub-15 / Sub-10)',
      targetMs: 15000,
      tips: [
        'Memorize todos os 21 algoritmos de PLL completo (Full PLL).',
        'Pratique "Lookahead": rastreie o próximo par de F2L enquanto executa o atual.',
        'Planeje a Cruz completa durante os 15 segundos de inspeção WCA.'
      ]
    },
    PRO: {
      id: 'pro',
      name: 'Expert / Pro',
      badge: '🟣 Expert / Pro (Sub-15 / Sub-10)',
      minTime: 0,
      maxTime: 15000,
      method: 'CFOP Avançado + ZBLL / COLL / X-Cross',
      movesAvg: '45 - 55 movimentos',
      tps: '7.0 - 12+ TPS',
      nextTier: 'Recorde Mundial (WR ~3.13s)',
      targetMs: 3130,
      tips: [
        'Planejamento de X-Cross (Cruz + 1º par F2L) na inspeção.',
        'Controle de orientação da última camada (COLL / ZBLL).',
        'Otimização extrema de Finger Tricks sem qualquer regrip.'
      ]
    }
  },

  /**
   * Formats milliseconds into M:SS.ss or SS.ss
   */
  formatTime(ms, penalty = null) {
    if (penalty === 'DNF') return 'DNF';
    if (ms === null || ms === undefined || isNaN(ms)) return '--:--';

    let totalMs = ms;
    if (penalty === '+2') totalMs += 2000;

    const totalSeconds = totalMs / 1000;
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = Math.floor(totalSeconds % 60);
    const hundredths = Math.floor((totalMs % 1000) / 10);

    const padSec = seconds.toString().padStart(minutes > 0 ? 2 : 1, '0');
    const padHund = hundredths.toString().padStart(2, '0');

    let str = minutes > 0 ? `${minutes}:${padSec}.${padHund}` : `${padSec}.${padHund}`;
    if (penalty === '+2') str += ' (+2)';
    return str;
  },

  /**
   * Converts solve object to effective calculation value in ms (or Infinity for DNF)
   */
  getEffectiveTime(solve) {
    if (!solve) return Infinity;
    if (solve.penalty === 'DNF') return Infinity;
    let t = solve.time;
    if (solve.penalty === '+2') t += 2000;
    return t;
  },

  /**
   * Calculates standard WCA Average of N (e.g. Ao5 or Ao12)
   * Discards 1 best and 1 worst, averages the rest.
   */
  calculateTrimmedAverage(solves) {
    if (!solves || solves.length === 0) return null;
    const times = solves.map(s => this.getEffectiveTime(s));

    // Count DNFs
    const dnfCount = times.filter(t => t === Infinity).length;
    if (dnfCount >= 2) return Infinity; // WCA rule: 2 or more DNFs in Ao5/Ao12 = DNF

    // Sort ascending
    const sorted = [...times].sort((a, b) => a - b);
    // Remove lowest and highest
    const trimmed = sorted.slice(1, sorted.length - 1);

    const sum = trimmed.reduce((acc, val) => acc + val, 0);
    return Math.round(sum / trimmed.length);
  },

  /**
   * Calculates pure arithmetic mean of an array of solves
   */
  calculateMean(solves) {
    const validTimes = solves
      .map(s => this.getEffectiveTime(s))
      .filter(t => t !== Infinity);

    if (validTimes.length === 0) return null;
    const sum = validTimes.reduce((acc, t) => acc + t, 0);
    return Math.round(sum / validTimes.length);
  },

  /**
   * Calculates median of solves
   */
  calculateMedian(solves) {
    const validTimes = solves
      .map(s => this.getEffectiveTime(s))
      .filter(t => t !== Infinity)
      .sort((a, b) => a - b);

    if (validTimes.length === 0) return null;
    const mid = Math.floor(validTimes.length / 2);
    if (validTimes.length % 2 !== 0) {
      return validTimes[mid];
    } else {
      return Math.round((validTimes[mid - 1] + validTimes[mid]) / 2);
    }
  },

  /**
   * Calculates standard deviation (desvio padrão)
   */
  calculateStdDev(solves) {
    const validTimes = solves
      .map(s => this.getEffectiveTime(s))
      .filter(t => t !== Infinity);

    if (validTimes.length <= 1) return 0;
    const mean = validTimes.reduce((a, b) => a + b, 0) / validTimes.length;
    const variance = validTimes.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) / (validTimes.length - 1);
    return Math.round(Math.sqrt(variance));
  },

  /**
   * Calculates best AoN in the entire history
   */
  getBestAoN(allSolves, n) {
    if (allSolves.length < n) return null;
    let best = Infinity;

    for (let i = 0; i <= allSolves.length - n; i++) {
      const windowSlice = allSolves.slice(i, i + n);
      const avg = this.calculateTrimmedAverage(windowSlice);
      if (avg !== null && avg < best) {
        best = avg;
      }
    }

    return best === Infinity ? null : best;
  },

  /**
   * Computes the complete statistics object matching the reference UI
   */
  computeFullStats(solves) {
    if (!solves || solves.length === 0) {
      return {
        count: 0,
        best: null,
        worst: null,
        mean: null,
        median: null,
        stdDev: null,
        ao5: null,
        middleAo5: null,
        bestAo5: null,
        ao12: null,
        middleAo12: null,
        bestAo12: null,
        userLevel: this.getUserLevel(null)
      };
    }

    const validTimes = solves
      .map(s => this.getEffectiveTime(s))
      .filter(t => t !== Infinity);

    const best = validTimes.length > 0 ? Math.min(...validTimes) : null;
    const worst = validTimes.length > 0 ? Math.max(...validTimes) : null;
    const mean = this.calculateMean(solves);
    const median = this.calculateMedian(solves);
    const stdDev = this.calculateStdDev(solves);

    // Latest 5
    let ao5 = null;
    let middleAo5 = null;
    if (solves.length >= 5) {
      const last5 = solves.slice(solves.length - 5);
      ao5 = this.calculateTrimmedAverage(last5);
      // Os 3 centrais de 5
      const times5 = last5.map(s => this.getEffectiveTime(s)).sort((a, b) => a - b);
      const trim5 = times5.slice(1, 4);
      if (!trim5.includes(Infinity)) {
        middleAo5 = Math.round(trim5.reduce((a, b) => a + b, 0) / 3);
      }
    }
    const bestAo5 = this.getBestAoN(solves, 5);

    // Latest 12
    let ao12 = null;
    let middleAo12 = null;
    if (solves.length >= 12) {
      const last12 = solves.slice(solves.length - 12);
      ao12 = this.calculateTrimmedAverage(last12);
      const times12 = last12.map(s => this.getEffectiveTime(s)).sort((a, b) => a - b);
      const trim12 = times12.slice(1, 11);
      if (!trim12.includes(Infinity)) {
        middleAo12 = Math.round(trim12.reduce((a, b) => a + b, 0) / 10);
      }
    }
    const bestAo12 = this.getBestAoN(solves, 12);

    // Nível do usuário baseado em Ao5 ou Média
    const referenceTime = ao5 || mean || best;
    const userLevel = this.getUserLevel(referenceTime);

    return {
      count: solves.length,
      best,
      worst,
      mean,
      median,
      stdDev,
      ao5,
      middleAo5,
      bestAo5,
      ao12,
      middleAo12,
      bestAo12,
      userLevel
    };
  },

  /**
   * Determines the user's skill tier (Iniciante, Intermediário, Avançado, Pro)
   * and calculates progress to the next milestone.
   */
  getUserLevel(timeMs) {
    if (!timeMs || timeMs === Infinity) {
      return {
        tier: this.BENCHMARKS.BEGINNER,
        timeMs: null,
        label: 'Aguardando primeiros tempos...',
        percentToNext: 0,
        gapSeconds: null,
        tip: 'Faça 5 resoluções para calcularmos sua média oficial (Ao5) e classificar seu nível!'
      };
    }

    let tier;
    if (timeMs >= this.BENCHMARKS.BEGINNER.minTime) {
      tier = this.BENCHMARKS.BEGINNER;
    } else if (timeMs >= this.BENCHMARKS.INTERMEDIATE.minTime) {
      tier = this.BENCHMARKS.INTERMEDIATE;
    } else if (timeMs >= this.BENCHMARKS.ADVANCED.minTime) {
      tier = this.BENCHMARKS.ADVANCED;
    } else {
      tier = this.BENCHMARKS.PRO;
    }

    // Calcula porcentagem em direção ao próximo nível
    let percent = 0;
    let gapSec = 0;

    if (tier.id === 'beginner') {
      // De 180s até 90s
      const span = 90000; // 180s -> 90s
      const clamped = Math.max(90000, Math.min(180000, timeMs));
      percent = Math.round(((180000 - clamped) / span) * 100);
      gapSec = ((timeMs - 90000) / 1000).toFixed(2);
    } else if (tier.id === 'intermediate') {
      // De 90s até 30s
      const span = 60000;
      percent = Math.round(((90000 - timeMs) / span) * 100);
      gapSec = ((timeMs - 30000) / 1000).toFixed(2);
    } else if (tier.id === 'advanced') {
      // De 30s até 15s
      const span = 15000;
      percent = Math.round(((30000 - timeMs) / span) * 100);
      gapSec = ((timeMs - 15000) / 1000).toFixed(2);
    } else {
      // Pro: de 15s até 5s
      percent = Math.min(100, Math.round(((15000 - timeMs) / 10000) * 100));
      gapSec = null;
    }

    // Pick random tip from tier
    const randomTip = tier.tips[Math.floor(Math.random() * tier.tips.length)];

    return {
      tier,
      timeMs,
      percentToNext: Math.max(0, Math.min(100, percent)),
      gapSeconds: gapSec > 0 ? gapSec : null,
      tip: randomTip
    };
  }
};

window.StatsEngine = StatsEngine;
