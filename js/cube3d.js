/**
 * cube3d.js - Interactive 3D Rubik's Cube Simulator (Three.js) & 2D Net Renderer
 * Supports instant scrambles, smooth animated turns, OrbitControls, and 2D flat view.
 */

class RubiksCube3D {
  constructor(containerId, netContainerId) {
    this.container = document.getElementById(containerId);
    this.netContainer = document.getElementById(netContainerId);

    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this.controls = null;

    this.cubeGroup = null;
    this.pivot = null;
    this.cubies = [];

    this.isAnimating = false;
    this.animationQueue = [];

    // Official WCA Color Hexes
    this.COLORS = {
      U: 0xffffff, // White
      D: 0xffd500, // Yellow
      F: 0x009b48, // Green
      B: 0x0046ad, // Blue
      L: 0xff5800, // Orange
      R: 0xb71234, // Red
      INNER: 0x18181b // Matte black plastic
    };

    this.init();
  }

  init() {
    if (!this.container || typeof THREE === 'undefined') return;

    const width = this.container.clientWidth || 320;
    const height = this.container.clientHeight || 280;

    // Scene
    this.scene = new THREE.Scene();

    // Camera
    this.camera = new THREE.PerspectiveCamera(42, width / height, 0.1, 100);
    this.camera.position.set(4.5, 4.2, 5.8);

    // Renderer
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.container.innerHTML = '';
    this.container.appendChild(this.renderer.domElement);

    // OrbitControls
    if (typeof THREE.OrbitControls !== 'undefined') {
      this.controls = new THREE.OrbitControls(this.camera, this.renderer.domElement);
      this.controls.enableDamping = true;
      this.controls.dampingFactor = 0.08;
      this.controls.enablePan = false;
      this.controls.minDistance = 4;
      this.controls.maxDistance = 12;
      this.controls.target.set(0, 0, 0);
    }

    // Lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.85);
    this.scene.add(ambientLight);

    const dirLight1 = new THREE.DirectionalLight(0xffffff, 0.6);
    dirLight1.position.set(5, 10, 7);
    this.scene.add(dirLight1);

    const dirLight2 = new THREE.DirectionalLight(0xffffff, 0.4);
    dirLight2.position.set(-6, -4, -6);
    this.scene.add(dirLight2);

    // Pivot for turning layers
    this.pivot = new THREE.Group();
    this.scene.add(this.pivot);

    // Cube group
    this.cubeGroup = new THREE.Group();
    this.scene.add(this.cubeGroup);

    // Build the 26 cubies
    this.buildCube();

    // Resize handler
    window.addEventListener('resize', () => this.onResize());

    // Render loop
    this.animate();

    // Render initial 2D net
    this.update2DNet();
  }

  buildCube() {
    // Clear existing
    this.cubies = [];
    while (this.cubeGroup.children.length > 0) {
      this.cubeGroup.remove(this.cubeGroup.children[0]);
    }

    const geom = new THREE.BoxGeometry(0.95, 0.95, 0.95);

    for (let x = -1; x <= 1; x++) {
      for (let y = -1; y <= 1; y++) {
        for (let z = -1; z <= 1; z++) {
          // Skip internal center
          if (x === 0 && y === 0 && z === 0) continue;

          // Materials for each of the 6 faces: [ +X, -X, +Y, -Y, +Z, -Z ]
          const materials = [
            this.createStickerMaterial(x === 1 ? this.COLORS.R : this.COLORS.INNER), // Right (Red)
            this.createStickerMaterial(x === -1 ? this.COLORS.L : this.COLORS.INNER), // Left (Orange)
            this.createStickerMaterial(y === 1 ? this.COLORS.U : this.COLORS.INNER), // Top (White)
            this.createStickerMaterial(y === -1 ? this.COLORS.D : this.COLORS.INNER), // Bottom (Yellow)
            this.createStickerMaterial(z === 1 ? this.COLORS.F : this.COLORS.INNER), // Front (Green)
            this.createStickerMaterial(z === -1 ? this.COLORS.B : this.COLORS.INNER)  // Back (Blue)
          ];

          const cubie = new THREE.Mesh(geom, materials);
          cubie.position.set(x, y, z);
          cubie.userData = { initialPos: { x, y, z } };

          this.cubeGroup.add(cubie);
          this.cubies.push(cubie);
        }
      }
    }
  }

  createStickerMaterial(colorHex) {
    return new THREE.MeshStandardMaterial({
      color: colorHex,
      roughness: 0.35,
      metalness: 0.05
    });
  }

  setSkin(newColors) {
    this.COLORS = { ...this.COLORS, ...newColors };
    this.resetCube();
  }

  onResize() {
    if (!this.container || !this.renderer || !this.camera) return;
    const width = this.container.clientWidth;
    const height = this.container.clientHeight;
    if (width === 0 || height === 0) return;

    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  }

  animate() {
    requestAnimationFrame(() => this.animate());
    if (this.controls) this.controls.update();
    if (this.renderer && this.scene && this.camera) {
      this.renderer.render(this.scene, this.camera);
    }
  }

  resetCamera() {
    if (this.camera && this.controls) {
      this.camera.position.set(4.5, 4.2, 5.8);
      this.controls.target.set(0, 0, 0);
      this.controls.update();
    }
  }

  resetCube() {
    this.animationQueue = [];
    this.isAnimating = false;
    this.pivot.rotation.set(0, 0, 0);
    this.buildCube();
    this.update2DNet();
  }

  /**
   * Applies an official scramble (e.g. array of moves ['R', "U'", "F2", ...])
   */
  applyScramble(moves, animate = false) {
    if (!animate) {
      this.resetCube();
      for (const move of moves) {
        this.executeMoveSync(move);
      }
      this.update2DNet();
    } else {
      this.resetCube();
      this.playMoves(moves, 120);
    }
  }

  /**
   * Synchronously applies a single move without animation
   */
  executeMoveSync(move) {
    const moveInfo = this.parseMove(move);
    if (!moveInfo) return;

    const { axis, layer, angle } = moveInfo;

    // Attach matching cubies to pivot
    this.pivot.rotation.set(0, 0, 0);
    this.pivot.position.set(0, 0, 0);
    this.pivot.updateMatrixWorld();

    const affectedCubies = this.cubies.filter(c => {
      return Math.round(c.position[axis]) === layer;
    });

    affectedCubies.forEach(c => {
      this.cubeGroup.remove(c);
      this.pivot.add(c);
    });

    // Rotate pivot
    this.pivot.rotation[axis] = angle;
    this.pivot.updateMatrixWorld();

    // Reattach cubies to cubeGroup and snap coordinates
    affectedCubies.forEach(c => {
      c.applyMatrix4(this.pivot.matrixWorld);
      this.pivot.remove(c);
      this.cubeGroup.add(c);

      // Snap coordinates to integers -1, 0, 1
      c.position.x = Math.round(c.position.x);
      c.position.y = Math.round(c.position.y);
      c.position.z = Math.round(c.position.z);
    });

    this.pivot.rotation.set(0, 0, 0);
  }

  /**
   * Parses standard move notation to axis, layer, and rotation angle
   */
  parseMove(move) {
    if (!move) return null;
    const face = move[0].toUpperCase();
    const isPrime = move.includes("'");
    const isDouble = move.includes("2");

    let axis, layer, baseAngle;

    switch (face) {
      case 'R':
        axis = 'x'; layer = 1; baseAngle = -Math.PI / 2;
        break;
      case 'L':
        axis = 'x'; layer = -1; baseAngle = Math.PI / 2;
        break;
      case 'U':
        axis = 'y'; layer = 1; baseAngle = -Math.PI / 2;
        break;
      case 'D':
        axis = 'y'; layer = -1; baseAngle = Math.PI / 2;
        break;
      case 'F':
        axis = 'z'; layer = 1; baseAngle = -Math.PI / 2;
        break;
      case 'B':
        axis = 'z'; layer = -1; baseAngle = Math.PI / 2;
        break;
      default:
        return null;
    }

    let angle = baseAngle;
    if (isPrime) angle = -baseAngle;
    if (isDouble) angle = baseAngle * 2;

    return { face, axis, layer, angle };
  }

  /**
   * Asynchronously animates a single move
   */
  animateMove(move, duration = 180) {
    return new Promise((resolve) => {
      const moveInfo = this.parseMove(move);
      if (!moveInfo) return resolve();

      const { axis, layer, angle } = moveInfo;

      this.pivot.rotation.set(0, 0, 0);
      this.pivot.updateMatrixWorld();

      const affectedCubies = this.cubies.filter(c => {
        return Math.round(c.position[axis]) === layer;
      });

      affectedCubies.forEach(c => {
        this.cubeGroup.remove(c);
        this.pivot.add(c);
      });

      const startTime = performance.now();
      if (window.soundEngine) window.soundEngine.playCubeTurn();

      const animStep = (now) => {
        const elapsed = now - startTime;
        const progress = Math.min(elapsed / duration, 1);
        // Ease out quad
        const ease = 1 - (1 - progress) * (1 - progress);

        this.pivot.rotation[axis] = angle * ease;

        if (progress < 1) {
          requestAnimationFrame(animStep);
        } else {
          this.pivot.rotation[axis] = angle;
          this.pivot.updateMatrixWorld();

          affectedCubies.forEach(c => {
            c.applyMatrix4(this.pivot.matrixWorld);
            this.pivot.remove(c);
            this.cubeGroup.add(c);

            c.position.x = Math.round(c.position.x);
            c.position.y = Math.round(c.position.y);
            c.position.z = Math.round(c.position.z);
          });

          this.pivot.rotation.set(0, 0, 0);
          this.update2DNet();
          resolve();
        }
      };

      requestAnimationFrame(animStep);
    });
  }

  /**
   * Plays a sequence of moves with animation
   */
  async playMoves(moves, moveDuration = 180, onMoveStep = null) {
    this.isAnimating = true;
    for (let i = 0; i < moves.length; i++) {
      if (!this.isAnimating) break; // Allow cancel
      const move = moves[i];
      if (onMoveStep) onMoveStep(i, move);
      await this.animateMove(move, moveDuration);
    }
    this.isAnimating = false;
    if (onMoveStep) onMoveStep(moves.length, null);
  }

  stopAnimation() {
    this.isAnimating = false;
  }

  /**
   * Extracts face stickers to generate the 2D unfolded net
   */
  getFaceColors() {
    // Colors map
    const colorHexMap = {
      [this.COLORS.U]: '#ffffff',
      [this.COLORS.D]: '#ffd500',
      [this.COLORS.F]: '#009b48',
      [this.COLORS.B]: '#0046ad',
      [this.COLORS.L]: '#ff5800',
      [this.COLORS.R]: '#b71234'
    };

    const getHex = (cubie, materialIndex) => {
      const mat = cubie.material[materialIndex];
      return colorHexMap[mat.color.getHex()] || '#18181b';
    };

    // Helper to find cubie at x, y, z
    const findCubie = (x, y, z) => {
      return this.cubies.find(c =>
        Math.round(c.position.x) === x &&
        Math.round(c.position.y) === y &&
        Math.round(c.position.z) === z
      );
    };

    // Construct 3x3 grid for each face
    const net = { U: [], D: [], F: [], B: [], L: [], R: [] };

    // U face (+Y): z from -1 to 1 (top to bottom), x from -1 to 1 (left to right)
    for (let z = -1; z <= 1; z++) {
      for (let x = -1; x <= 1; x++) {
        const c = findCubie(x, 1, z);
        net.U.push(c ? getHex(c, 2) : '#ffffff');
      }
    }

    // D face (-Y): z from 1 to -1 (top to bottom), x from -1 to 1 (left to right)
    for (let z = 1; z >= -1; z--) {
      for (let x = -1; x <= 1; x++) {
        const c = findCubie(x, -1, z);
        net.D.push(c ? getHex(c, 3) : '#ffd500');
      }
    }

    // F face (+Z): y from 1 to -1, x from -1 to 1
    for (let y = 1; y >= -1; y--) {
      for (let x = -1; x <= 1; x++) {
        const c = findCubie(x, y, 1);
        net.F.push(c ? getHex(c, 4) : '#009b48');
      }
    }

    // B face (-Z): y from 1 to -1, x from 1 to -1
    for (let y = 1; y >= -1; y--) {
      for (let x = 1; x >= -1; x--) {
        const c = findCubie(x, y, -1);
        net.B.push(c ? getHex(c, 5) : '#0046ad');
      }
    }

    // L face (-X): y from 1 to -1, z from -1 to 1
    for (let y = 1; y >= -1; y--) {
      for (let z = -1; z <= 1; z++) {
        const c = findCubie(-1, y, z);
        net.L.push(c ? getHex(c, 1) : '#ff5800');
      }
    }

    // R face (+X): y from 1 to -1, z from 1 to -1
    for (let y = 1; y >= -1; y--) {
      for (let z = 1; z >= -1; z--) {
        const c = findCubie(1, y, z);
        net.R.push(c ? getHex(c, 0) : '#b71234');
      }
    }

    return net;
  }

  /**
   * Renders the 2D unfolded cross net in HTML
   */
  update2DNet() {
    if (!this.netContainer) return;
    const net = this.getFaceColors();

    const renderFaceGrid = (faceArray, label) => `
      <div class="net-face" data-face="${label}">
        <span class="net-face-label">${label}</span>
        <div class="net-3x3">
          ${faceArray.map(hex => `<div class="net-sticker" style="background-color: ${hex};"></div>`).join('')}
        </div>
      </div>
    `;

    this.netContainer.innerHTML = `
      <div class="cube-net-cross">
        <div class="net-row top">
          <div class="net-empty"></div>
          ${renderFaceGrid(net.U, 'U (Branco)')}
          <div class="net-empty"></div>
          <div class="net-empty"></div>
        </div>
        <div class="net-row middle">
          ${renderFaceGrid(net.L, 'L (Laranja)')}
          ${renderFaceGrid(net.F, 'F (Verde)')}
          ${renderFaceGrid(net.R, 'R (Vermelho)')}
          ${renderFaceGrid(net.B, 'B (Azul)')}
        </div>
        <div class="net-row bottom">
          <div class="net-empty"></div>
          ${renderFaceGrid(net.D, 'D (Amarelo)')}
          <div class="net-empty"></div>
          <div class="net-empty"></div>
        </div>
      </div>
    `;
  }
}

window.RubiksCube3D = RubiksCube3D;
