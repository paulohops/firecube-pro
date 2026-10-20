/**
 * scramble.js - Official WCA 3x3 Scramble Generator & Lightweight Move Ribbon
 * Ultra-fast, responsive, lightweight chip renderer inspired by modern speedcubing tools.
 */

const ScrambleEngine = {
  FACES: ['U', 'D', 'L', 'R', 'F', 'B'],
  MODIFIERS: ['', "'", '2'],
  FACE_AXIS: {
    'U': 0, 'D': 0,
    'L': 1, 'R': 1,
    'F': 2, 'B': 2
  },

  FACE_NAMES: {
    'U': 'Face Superior (Branco/Up)',
    'D': 'Face Inferior (Amarelo/Down)',
    'F': 'Face Frontal (Verde/Front)',
    'B': 'Face Traseira (Azul/Back)',
    'L': 'Face Esquerda (Laranja/Left)',
    'R': 'Face Direita (Vermelho/Right)'
  },

  generate(length = 21) {
    const scramble = [];
    let lastFace = null;
    let secondLastFace = null;

    for (let i = 0; i < length; i++) {
      let face;
      while (true) {
        face = this.FACES[Math.floor(Math.random() * this.FACES.length)];
        if (face === lastFace) continue;
        if (
          lastFace &&
          secondLastFace &&
          this.FACE_AXIS[face] === this.FACE_AXIS[lastFace] &&
          this.FACE_AXIS[face] === this.FACE_AXIS[secondLastFace]
        ) {
          continue;
        }
        break;
      }

      const modifier = this.MODIFIERS[Math.floor(Math.random() * this.MODIFIERS.length)];
      scramble.push(face + modifier);

      secondLastFace = lastFace;
      lastFace = face;
    }

    return scramble;
  },

  getMoveMeta(move) {
    const face = move[0];
    const isPrime = move.includes("'");
    const isDouble = move.includes("2");

    let dirLabel = '90° Horário';
    let dirIcon = '↻';
    if (isPrime) {
      dirLabel = '90° Anti-horário';
      dirIcon = '↺';
    } else if (isDouble) {
      dirLabel = '180° Giro Duplo';
      dirIcon = '⇄ 2×';
    }

    return {
      face,
      faceName: this.FACE_NAMES[face] || face,
      dirLabel,
      dirIcon,
      isDouble,
      isPrime
    };
  },

  /**
   * Generates the CSS elements for each square (quadradinho) according to the layer
   */
  getGridHTML(face) {
    switch (face) {
      case 'U':
        return `
          <div class="move-grid-layer layer-u">
            <div class="cell-sq"></div>
            <div class="cell-sq"></div>
            <div class="cell-sq"></div>
            <div class="cell-blank-area"></div>
          </div>
        `;
      case 'D':
        return `
          <div class="move-grid-layer layer-d">
            <div class="cell-blank-area"></div>
            <div class="cell-sq"></div>
            <div class="cell-sq"></div>
            <div class="cell-sq"></div>
          </div>
        `;
      case 'L':
        return `
          <div class="move-grid-layer layer-l">
            <div class="cell-sq"></div>
            <div class="cell-sq"></div>
            <div class="cell-sq"></div>
            <div class="cell-blank-area"></div>
          </div>
        `;
      case 'R':
        return `
          <div class="move-grid-layer layer-r">
            <div class="cell-blank-area"></div>
            <div class="cell-sq"></div>
            <div class="cell-sq"></div>
            <div class="cell-sq"></div>
          </div>
        `;
      case 'F':
        return `
          <div class="move-grid-layer layer-f">
            <div class="cell-sq"></div><div class="cell-sq"></div><div class="cell-sq"></div>
            <div class="cell-sq"></div><div class="cell-sq"></div><div class="cell-sq"></div>
            <div class="cell-sq"></div><div class="cell-sq"></div><div class="cell-sq"></div>
          </div>
        `;
      case 'B':
        return `
          <div class="move-grid-layer layer-b">
            <div class="cell-center-sq"></div>
          </div>
        `;
      default:
        return `<div class="move-grid-layer layer-f">${'<div class="cell-sq"></div>'.repeat(9)}</div>`;
    }
  },

  /**
   * Generates the precise SVG arrow and numeral overlay
   */
  getSvgHTML(move) {
    const red = '#800000';
    switch (move) {
      case 'U':
        return `
          <svg class="move-svg-overlay" viewBox="0 0 44 44">
            <path d="M 36 6 Q 22 12 10 7" stroke="${red}" stroke-width="2.8" stroke-linecap="round" fill="none"/>
            <polygon points="6,5 13,3 11,9" fill="${red}"/>
          </svg>
        `;
      case "U'":
        return `
          <svg class="move-svg-overlay" viewBox="0 0 44 44">
            <path d="M 8 6 Q 22 12 34 7" stroke="${red}" stroke-width="2.8" stroke-linecap="round" fill="none"/>
            <polygon points="38,5 31,3 33,9" fill="${red}"/>
          </svg>
        `;
      case 'U2':
        return `
          <svg class="move-svg-overlay" viewBox="0 0 44 44">
            <line x1="36" y1="7.3" x2="11" y2="7.3" stroke="${red}" stroke-width="2.8" stroke-linecap="round"/>
            <polygon points="6,7.3 13,3.5 13,11" fill="${red}"/>
            <text x="22" y="27" text-anchor="middle" dominant-baseline="central" font-family="Arial, Helvetica, sans-serif" font-weight="900" font-size="16" fill="#000000">2</text>
          </svg>
        `;

      case 'D':
        return `
          <svg class="move-svg-overlay" viewBox="0 0 44 44">
            <path d="M 8 38 Q 22 32 34 37" stroke="${red}" stroke-width="2.8" stroke-linecap="round" fill="none"/>
            <polygon points="38,39 33,35 31,41" fill="${red}"/>
          </svg>
        `;
      case "D'":
        return `
          <svg class="move-svg-overlay" viewBox="0 0 44 44">
            <path d="M 36 38 Q 22 32 10 37" stroke="${red}" stroke-width="2.8" stroke-linecap="round" fill="none"/>
            <polygon points="6,39 13,41 11,35" fill="${red}"/>
          </svg>
        `;
      case 'D2':
        return `
          <svg class="move-svg-overlay" viewBox="0 0 44 44">
            <line x1="8" y1="36.7" x2="33" y2="36.7" stroke="${red}" stroke-width="2.8" stroke-linecap="round"/>
            <polygon points="38,36.7 31,33 31,40.4" fill="${red}"/>
            <text x="22" y="18" text-anchor="middle" dominant-baseline="central" font-family="Arial, Helvetica, sans-serif" font-weight="900" font-size="16" fill="#000000">2</text>
          </svg>
        `;

      case 'L':
        return `
          <svg class="move-svg-overlay" viewBox="0 0 44 44">
            <path d="M 7.3 8 Q 13 22 8 34" stroke="${red}" stroke-width="2.8" stroke-linecap="round" fill="none"/>
            <polygon points="7.3,38 3.5,31 11,31" fill="${red}"/>
          </svg>
        `;
      case "L'":
        return `
          <svg class="move-svg-overlay" viewBox="0 0 44 44">
            <path d="M 7.3 36 Q 13 22 8 10" stroke="${red}" stroke-width="2.8" stroke-linecap="round" fill="none"/>
            <polygon points="7.3,6 3.5,13 11,13" fill="${red}"/>
          </svg>
        `;
      case 'L2':
        return `
          <svg class="move-svg-overlay" viewBox="0 0 44 44">
            <line x1="7.3" y1="8" x2="7.3" y2="33" stroke="${red}" stroke-width="2.8" stroke-linecap="round"/>
            <polygon points="7.3,38 3.5,31 11.1,31" fill="${red}"/>
            <text x="27" y="22" text-anchor="middle" dominant-baseline="central" font-family="Arial, Helvetica, sans-serif" font-weight="900" font-size="16" fill="#000000">2</text>
          </svg>
        `;

      case 'R':
        return `
          <svg class="move-svg-overlay" viewBox="0 0 44 44">
            <path d="M 36.7 36 Q 31 22 36 10" stroke="${red}" stroke-width="2.8" stroke-linecap="round" fill="none"/>
            <polygon points="36.7,6 33,13 40.4,13" fill="${red}"/>
          </svg>
        `;
      case "R'":
        return `
          <svg class="move-svg-overlay" viewBox="0 0 44 44">
            <path d="M 36.7 8 Q 31 22 36 34" stroke="${red}" stroke-width="2.8" stroke-linecap="round" fill="none"/>
            <polygon points="36.7,38 33,31 40.4,31" fill="${red}"/>
          </svg>
        `;
      case 'R2':
        return `
          <svg class="move-svg-overlay" viewBox="0 0 44 44">
            <line x1="36.7" y1="36" x2="36.7" y2="11" stroke="${red}" stroke-width="2.8" stroke-linecap="round"/>
            <polygon points="36.7,6 33,13 40.4,13" fill="${red}"/>
            <text x="17" y="22" text-anchor="middle" dominant-baseline="central" font-family="Arial, Helvetica, sans-serif" font-weight="900" font-size="16" fill="#000000">2</text>
          </svg>
        `;

      case 'F':
        return `
          <svg class="move-svg-overlay" viewBox="0 0 44 44">
            <path d="M 11 27 A 15 15 0 0 1 33 24" stroke="${red}" stroke-width="3" stroke-linecap="round" fill="none"/>
            <polygon points="34,29 36,22 29,24" fill="${red}"/>
          </svg>
        `;
      case "F'":
        return `
          <svg class="move-svg-overlay" viewBox="0 0 44 44">
            <path d="M 33 27 A 15 15 0 0 0 11 24" stroke="${red}" stroke-width="3" stroke-linecap="round" fill="none"/>
            <polygon points="10,29 15,24 8,22" fill="${red}"/>
          </svg>
        `;
      case 'F2':
        return `
          <svg class="move-svg-overlay" viewBox="0 0 44 44">
            <path d="M 9 24 A 15 15 0 0 1 34 23" stroke="${red}" stroke-width="3" stroke-linecap="round" fill="none"/>
            <polygon points="36,28 37,21 30,23" fill="${red}"/>
            <text x="22" y="23" text-anchor="middle" dominant-baseline="central" font-family="Arial, Helvetica, sans-serif" font-weight="900" font-size="16" fill="#000000">2</text>
          </svg>
        `;

      case 'B':
        return `
          <svg class="move-svg-overlay" viewBox="0 0 44 44">
            <path d="M 28 35 A 15 15 0 1 0 11 31" stroke="${red}" stroke-width="2.8" stroke-linecap="round" fill="none"/>
            <polygon points="13,36 7,33 13,30" fill="${red}"/>
          </svg>
        `;
      case "B'":
        return `
          <svg class="move-svg-overlay" viewBox="0 0 44 44">
            <path d="M 16 35 A 15 15 0 1 1 33 31" stroke="${red}" stroke-width="2.8" stroke-linecap="round" fill="none"/>
            <polygon points="31,36 31,30 37,33" fill="${red}"/>
          </svg>
        `;
      case 'B2':
        return `
          <svg class="move-svg-overlay" viewBox="0 0 44 44">
            <path d="M 9 24 A 15 15 0 0 1 34 23" stroke="${red}" stroke-width="2.8" stroke-linecap="round" fill="none"/>
            <polygon points="36,28 37,21 30,23" fill="${red}"/>
            <text x="22" y="22" text-anchor="middle" dominant-baseline="central" font-family="Arial, Helvetica, sans-serif" font-weight="900" font-size="15" fill="#000000">2</text>
          </svg>
        `;

      default:
        return '';
    }
  },

  /**
   * Renders a single move card: CSS cells + SVG movement arrow + bold label
   */
  renderMoveCard(move, index) {
    const meta = this.getMoveMeta(move);
    const gridHTML = this.getGridHTML(meta.face);
    const svgHTML = this.getSvgHTML(move);

    return `
      <div class="move-card-unit" data-index="${index}" title="${meta.faceName} - ${meta.dirLabel}">
        <div class="move-frame-box">
          ${gridHTML}
          ${svgHTML}
        </div>
        <div class="move-label-bold">${move}</div>
      </div>
    `;
  },

  /**
   * Renders the complete scramble sequence into visual cards matching the reference image
   */
  renderScrambleHTML(scrambleMoves) {
    return scrambleMoves.map((move, index) => this.renderMoveCard(move, index)).join('');
  }
};

window.ScrambleEngine = ScrambleEngine;
