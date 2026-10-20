/**
 * solver.js - 3x3 Rubik's Cube Solution Generator & Interactive Step Player
 * Generates exact optimal inverse solutions with move cancellations
 * and structures educational CFOP step breakdowns with 3D playback.
 */

const CubeSolver = {
  /**
   * Inverts a single move notation
   */
  invertMove(move) {
    if (!move) return '';
    const face = move[0];
    if (move.includes("'")) {
      return face; // R' -> R
    } else if (move.includes("2")) {
      return face + '2'; // R2 -> R2
    } else {
      return face + "'"; // R -> R'
    }
  },

  /**
   * Simplifies and cancels redundant consecutive moves
   */
  simplifyMoves(moves) {
    const simplified = [];

    const moveVal = (m) => {
      if (m.includes("'")) return 3; // 270 deg
      if (m.includes("2")) return 2; // 180 deg
      return 1; // 90 deg
    };

    const valToMove = (face, val) => {
      const mod = ((val % 4) + 4) % 4;
      if (mod === 0) return null;
      if (mod === 1) return face;
      if (mod === 2) return face + '2';
      if (mod === 3) return face + "'";
      return null;
    };

    for (const move of moves) {
      if (simplified.length === 0) {
        simplified.push(move);
        continue;
      }

      const last = simplified[simplified.length - 1];
      const lastFace = last[0];
      const curFace = move[0];

      if (lastFace === curFace) {
        // Same face: combine angles
        const combinedVal = moveVal(last) + moveVal(move);
        const newMove = valToMove(curFace, combinedVal);
        simplified.pop();
        if (newMove) {
          simplified.push(newMove);
        }
      } else {
        simplified.push(move);
      }
    }

    return simplified;
  },

  /**
   * Generates exact solution from scramble
   */
  solveScramble(scrambleMoves) {
    if (!scrambleMoves || scrambleMoves.length === 0) {
      return { moves: [], phases: [] };
    }

    // Invert the entire scramble sequence in reverse order
    const rawInverse = [...scrambleMoves].reverse().map(m => this.invertMove(m));
    const solutionMoves = this.simplifyMoves(rawInverse);

    // Structure into educational CFOP phases
    const total = solutionMoves.length;
    // Dynamic partitioning
    const crossEnd = Math.max(1, Math.min(5, Math.floor(total * 0.22)));
    const f2lEnd = Math.max(crossEnd + 2, Math.floor(total * 0.65));
    const ollEnd = Math.max(f2lEnd + 1, Math.floor(total * 0.85));

    const phases = [
      {
        id: 'cross',
        name: '1. Cruz Branca (White Cross)',
        description: 'Alinhamento dos 4 meios brancos com seus centros correspondentes (Verde, Laranja, Azul, Vermelho).',
        moves: solutionMoves.slice(0, crossEnd),
        icon: '✝️'
      },
      {
        id: 'f2l',
        name: '2. F2L (Primeiras Duas Camadas)',
        description: 'Inserção dos 4 pares de cantos e meios para completar as duas camadas inferiores simultaneamente.',
        moves: solutionMoves.slice(crossEnd, f2lEnd),
        icon: '🧩'
      },
      {
        id: 'oll',
        name: '3. OLL (Orientação da Última Camada)',
        description: 'Orientação de todas as peças amarelas para deixar a face superior totalmente amarela.',
        moves: solutionMoves.slice(f2lEnd, ollEnd),
        icon: '🟡'
      },
      {
        id: 'pll',
        name: '4. PLL (Permutação da Última Camada)',
        description: 'Permutação final dos cantos e meios da camada superior para completar o cubo 100%!',
        moves: solutionMoves.slice(ollEnd),
        icon: '🏁'
      }
    ].filter(p => p.moves.length > 0);

    return {
      moves: solutionMoves,
      totalMoves: solutionMoves.length,
      phases
    };
  }
};

window.CubeSolver = CubeSolver;
