/**
 * evolution.js - Progress Analytics, Interactive Chart.js & Speed Improvement Roadmap
 */

class EvolutionTracker {
  constructor() {
    this.chart = null;
  }

  renderChart(solves) {
    const canvas = document.getElementById('solves-chart-canvas');
    if (!canvas || typeof Chart === 'undefined') return;

    if (this.chart) {
      this.chart.destroy();
    }

    if (!solves || solves.length === 0) {
      return;
    }

    const labels = solves.map((_, i) => `#${i + 1}`);
    const rawTimes = solves.map(s => {
      if (s.penalty === 'DNF') return null;
      let t = s.time / 1000;
      if (s.penalty === '+2') t += 2;
      return parseFloat(t.toFixed(2));
    });

    // Compute rolling Ao5
    const ao5Data = solves.map((_, i) => {
      if (i < 4) return null;
      const slice = solves.slice(i - 4, i + 1);
      const avg = StatsEngine.calculateTrimmedAverage(slice);
      return (avg && avg !== Infinity) ? parseFloat((avg / 1000).toFixed(2)) : null;
    });

    // Compute PB line
    let currentPB = Infinity;
    const pbData = rawTimes.map(t => {
      if (t !== null && t < currentPB) currentPB = t;
      return currentPB === Infinity ? null : currentPB;
    });

    const isDark = document.body.classList.contains('theme-dark');
    const gridColor = isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.08)';
    const textColor = isDark ? '#babcd9' : '#313338';

    this.chart = new Chart(canvas, {
      type: 'line',
      data: {
        labels,
        datasets: [
          {
            label: 'Tempo da Resolução',
            data: rawTimes,
            borderColor: '#5865f2',
            backgroundColor: 'rgba(88, 101, 242, 0.12)',
            borderWidth: 2,
            tension: 0.2,
            pointRadius: 4,
            pointHoverRadius: 6,
            pointBackgroundColor: '#5865f2'
          },
          {
            label: 'Média de 5 (Ao5)',
            data: ao5Data,
            borderColor: '#57f287',
            borderWidth: 2.5,
            tension: 0.3,
            pointRadius: 0,
            pointHoverRadius: 4,
            borderDash: [5, 4]
          },
          {
            label: 'Melhor Tempo (PB)',
            data: pbData,
            borderColor: '#fda220',
            borderWidth: 1.8,
            tension: 0,
            pointRadius: 0,
            borderDash: [2, 2]
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            labels: {
              color: textColor,
              font: { family: "'Outfit', sans-serif", size: 12 }
            }
          },
          tooltip: {
            callbacks: {
              label: (ctx) => {
                const val = ctx.raw;
                if (!val) return 'DNF';
                return `${ctx.dataset.label}: ${StatsEngine.formatTime(val * 1000)}`;
              }
            }
          }
        },
        scales: {
          x: {
            grid: { color: gridColor },
            ticks: { color: textColor }
          },
          y: {
            grid: { color: gridColor },
            ticks: {
              color: textColor,
              callback: (val) => `${val}s`
            }
          }
        }
      }
    });
  }

  updateMetricsUI(solves) {
    if (!solves || solves.length === 0) return;

    const validTimes = solves.map(s => StatsEngine.getEffectiveTime(s)).filter(t => t !== Infinity);
    if (validTimes.length === 0) return;

    const count = validTimes.length;
    const avgMs = Math.round(validTimes.reduce((a, b) => a + b, 0) / count);

    // Sub-X Counts
    const sub60 = validTimes.filter(t => t < 60000).length;
    const sub30 = validTimes.filter(t => t < 30000).length;
    const sub20 = validTimes.filter(t => t < 20000).length;
    const sub15 = validTimes.filter(t => t < 15000).length;

    const pct60 = Math.round((sub60 / count) * 100);
    const pct30 = Math.round((sub30 / count) * 100);
    const pct20 = Math.round((sub20 / count) * 100);
    const pct15 = Math.round((sub15 / count) * 100);

    // Consistency (100 - (stdDev / avg) * 100)
    const stdDev = StatsEngine.calculateStdDev(solves);
    const consistencyScore = Math.max(10, Math.min(99, Math.round(100 - (stdDev / avgMs) * 100)));

    // Estimated TPS (assuming standard 56 moves CFOP)
    const tps = (56 / (avgMs / 1000)).toFixed(2);

    // Phase Time Breakdown
    const crossTime = (avgMs * 0.12 / 1000).toFixed(1);
    const f2lTime = (avgMs * 0.50 / 1000).toFixed(1);
    const ollTime = (avgMs * 0.16 / 1000).toFixed(1);
    const pllTime = (avgMs * 0.22 / 1000).toFixed(1);

    // Inject into UI
    const elConsistency = document.getElementById('metric-consistency');
    const elTPS = document.getElementById('metric-tps');
    const elSub60Bar = document.getElementById('metric-sub60-bar');
    const elSub30Bar = document.getElementById('metric-sub30-bar');
    const elSub20Bar = document.getElementById('metric-sub20-bar');

    const elCrossTime = document.getElementById('phase-cross-time');
    const elF2lTime = document.getElementById('phase-f2l-time');
    const elOllTime = document.getElementById('phase-oll-time');
    const elPllTime = document.getElementById('phase-pll-time');

    if (elConsistency) elConsistency.textContent = `${consistencyScore}%`;
    if (elTPS) elTPS.textContent = `${tps} voltas/s`;

    if (elSub60Bar) elSub60Bar.style.width = `${pct60}%`;
    if (elSub30Bar) elSub30Bar.style.width = `${pct30}%`;
    if (elSub20Bar) elSub20Bar.style.width = `${pct20}%`;

    if (elCrossTime) elCrossTime.textContent = `${crossTime}s`;
    if (elF2lTime) elF2lTime.textContent = `${f2lTime}s`;
    if (elOllTime) elOllTime.textContent = `${ollTime}s`;
    if (elPllTime) elPllTime.textContent = `${pllTime}s`;

    // Dynamic advice diagnosis
    const diagnosisEl = document.getElementById('metric-diagnosis-box');
    if (diagnosisEl) {
      let diagHTML = '';
      if (avgMs > 60000) {
        diagHTML = `
          <h4>🎯 Diagnóstico: Foco na Transição entre Camadas</h4>
          <p>Você gasta muito tempo parando para procurar peças. <strong>Meta imediata:</strong> Elimine as pausas na Cruz Branca e decore os movimentos do método de camadas sem olhar guias.</p>
        `;
      } else if (avgMs > 30000) {
        diagHTML = `
          <h4>🎯 Diagnóstico: O Segredo Está no F2L Intuitivo</h4>
          <p>O F2L representa <strong>50% do tempo de resolução (~${f2lTime}s)</strong>. Para quebrar a barreira dos 30s, pare de resolver canto e meio separados. Junte o par na camada de cima e insira juntos!</p>
        `;
      } else if (avgMs > 18000) {
        diagHTML = `
          <h4>🎯 Diagnóstico: Domínio do Full PLL & Lookahead</h4>
          <p>Seus finger tricks são ágeis! A chave para o <strong>Sub-15</strong> é memorizar os 21 casos de Full PLL para não precisar de 2 olhares no final e planejar a cruz completa na inspeção de 15s.</p>
        `;
      } else {
        diagHTML = `
          <h4>🎯 Diagnóstico: Nível de Elite Mundial</h4>
          <p>TPS impressionante! Otimize rotações de cubo (zero regrips), pratique X-Cross (cruz + 1º par planejados juntos) e domine COLL/ZBLL para pular etapas.</p>
        `;
      }
      diagnosisEl.innerHTML = diagHTML;
    }
  }
}

window.evolutionTracker = new EvolutionTracker();
