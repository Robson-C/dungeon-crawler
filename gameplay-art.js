"use strict";

// Crops and foot anchors measured from the transparent atlas (4 poses × 2 actors).
// A shared scale per actor preserves the crouch in the attack pose.
const gameplayActorHeights = [405, 345];
const gameplayActorFrames = [
  [
    { x: 82, y: 24, w: 239, h: 405, anchorX: 152.5 },
    { x: 469, y: 30, w: 314, h: 399, anchorX: 199 },
    { x: 951, y: 35, w: 267, h: 398, anchorX: 161 },
    { x: 1356, y: 48, w: 389, h: 382, anchorX: 195 }
  ],
  [
    { x: 122, y: 523, w: 193, h: 345, anchorX: 95 },
    { x: 527, y: 527, w: 227, h: 339, anchorX: 110 },
    { x: 976, y: 530, w: 221, h: 339, anchorX: 113.5 },
    { x: 1378, y: 545, w: 358, h: 321, anchorX: 141.5 }
  ]
];
const gameplayPropFrames = [
  { x: 21, y: 272, w: 681, h: 186, axisY: 93 },
  { x: 751, y: 323, w: 695, h: 171, axisY: 40 },
  { x: 1720, y: 48, w: 181, h: 612 }
];

// Illustration only: world coordinates and collision footprints remain in game.js.
function createGameplayArt() {
  const terrainThemes = [
    { id: "slate", patchTiles: 4, solid: "#0b12199e", light: "#aca99b73", shade: "#050c14b0", shadow: "#070e16" },
    { id: "limestone", patchTiles: 3, solid: "#27261fa6", light: "#d7cfb875", shade: "#171b15b0", shadow: "#242118" },
    { id: "earth", patchTiles: 4, solid: "#131c16a6", light: "#aaa68a73", shade: "#07110ab0", shadow: "#15160f" }
  ].map(theme => {
    const image = new Image();
    image.src = `assets/gameplay-terrain-${theme.id}.png`;
    return { ...theme, image };
  });
  let terrain = terrainThemes[0].image;
  const wallTorch = new Image();
  const actors = new Image();
  const runner = new Image();
  const verticalRunner = new Image();
  const diagonalRunner = new Image();
  const slasher = new Image();
  const guardianSheet = new Image();
  const guardianAttackBody = new Image();
  const adventurerSheet = new Image();
  const adventurerAttackBody = new Image();
  const itemSprites = new Map();
  const characterSheets = new Map();
  const enemySheets = new Map();
  const directionalSlasher = new Image();
  const props = new Image();
  let terrainCache = null;
  let cachedTiles = null;
  let cachedTheme = null;
  let cachedVisualSeed = null;
  const defaultAppearance = { theme: 0, seed: 0 };
  const cacheScale = 4;
  const ready = image => image.complete && image.naturalWidth > 0;
  wallTorch.src = "assets/gameplay-wall-torch.png";
  actors.src = "assets/gameplay-actors.png";
  runner.src = "assets/player-run.png";
  verticalRunner.src = "assets/player-vertical.png";
  diagonalRunner.src = "assets/player-diagonal.png";
  slasher.src = "assets/player-slash.png";
  guardianSheet.src = "assets/human-guardian-body.webp";
  guardianAttackBody.src = "assets/human-guardian-body-slash.webp";
  adventurerSheet.src = "assets/human-adventurer-cartoon.webp";
  adventurerAttackBody.src = "assets/human-adventurer-body-slash.webp";
  itemSprite(gameItems.shortSword);
  directionalSlasher.src = "assets/player-directional-slash.webp";
  props.src = "assets/gameplay-props.png";

  function itemSprite(item) {
    if (!item) return null;
    const path = item.weaponSprite || gameItems.shortSword.weaponSprite;
    if (!itemSprites.has(path)) {
      const image = new Image();
      image.src = path;
      itemSprites.set(path, image);
    }
    return itemSprites.get(path);
  }

  function prepareCharacter(race, characterClass) {
    const key = `${race}-${characterClass}`;
    if (!characterSheets.has(key)) {
      const image = new Image();
      image.src = `assets/characters/${key}.webp`;
      characterSheets.set(key, image);
    }
    return characterSheets.get(key);
  }

  function enemyView(direction) {
    const octant = (Math.round(direction / (Math.PI / 4)) + 8) % 8;
    const rows = [0, 3, 1, 3, 0, 4, 2, 4];
    return { row: rows[octant], facing: octant >= 3 && octant <= 5 ? -1 : 1 };
  }

  function enemyPose(target) {
    if (target.state === "windup") return 5;
    if (target.state === "recovery") {
      const elapsed = Math.max(0, (target.recoveryDuration ?? .75) - target.remaining);
      if (elapsed < .18) return 6;
      if (elapsed < .5) return 7;
      return 0;
    }
    return target.moving ? 1 + Math.floor((target.stride ?? 0) / 3.5) % 4 : 0;
  }

  function enemy(context, target, now) {
    const definition = enemyArtData[target.type];
    if (!definition) return false;
    if (!enemySheets.has(target.type)) {
      const image = new Image();
      image.src = definition.image;
      enemySheets.set(target.type, image);
    }
    const image = enemySheets.get(target.type);
    if (!ready(image)) return false;
    const direction = target.state === "windup" || target.state === "recovery"
      ? target.direction : target.lookDirection ?? target.direction;
    const view = enemyView(direction);
    const pose = enemyPose(target);
    const frame = definition.frames[view.row * 8 + pose];
    const scale = definition.height / definition.referenceHeight;
    context.save();
    context.fillStyle = "#07111666";
    context.beginPath();
    context.ellipse(target.x, target.y, 5.5, 1.8, 0, 0, Math.PI * 2);
    context.fill();
    context.restore();
    return drawFigure(context, image, frame, scale, frame.ground, target.x, target.y,
      view.facing, now < target.flashUntil);
  }

  function terrainTile(context, index, x, y, width, height) {
    const size = terrain.naturalWidth / 2;
    // Exclude the atlas dividers from repeated floor swatches.
    const inset = size * .008;
    context.drawImage(terrain, (index % 2) * size + inset, Math.floor(index / 2) * size + inset,
      size - inset * 2, size - inset * 2, x, y, width, height);
  }

  function appearance(seed, number) {
    let state = seed >>> 0;
    let theme = state % terrainThemes.length;
    // The cosmetic sequence has its own state and can be rebuilt for any floor.
    // Each step selects one of the other materials.
    for (let floor = 1; floor < number; floor++) {
      state = (Math.imul(1664525, state) + 1013904223) >>> 0;
      theme = (theme + 1 + (state >>> 16) % (terrainThemes.length - 1)) % terrainThemes.length;
    }
    return { theme, seed: (seed ^ Math.imul(number, 0x85ebca6b)) >>> 0 };
  }

  function drawWallCaps(ink, mask, columns, rows, cellSize, theme) {
    const texture = document.createElement("canvas");
    texture.width = cellSize * 12 * cacheScale;
    texture.height = cellSize * 3 * cacheScale;
    const size = terrain.naturalWidth / 2;
    texture.getContext("2d").drawImage(terrain, 0, size, size, size / 4,
      0, 0, texture.width, texture.height);
    const pattern = ink.createPattern(texture, "repeat");
    pattern.setTransform(new DOMMatrix().scale(1 / cacheScale));
    const surface = new Path2D();
    const light = new Path2D();
    const shade = new Path2D();
    const bevel = cellSize * .2;

    // Fill one joined surface. Only its exposed perimeter receives a bevel,
    // so cell boundaries never become seams between separate wall pieces.
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < columns; col++) {
        const id = row * columns + col;
        if (!mask[id]) continue;
        const north = row === 0 || !mask[id - columns];
        const east = col + 1 === columns || !mask[id + 1];
        const south = row + 1 === rows || !mask[id + columns];
        const west = col === 0 || !mask[id - 1];
        const nw = north && west ? bevel : 0;
        const ne = north && east ? bevel : 0;
        const se = south && east ? bevel : 0;
        const sw = south && west ? bevel : 0;
        const x = col * cellSize, y = row * cellSize;
        surface.moveTo(x + nw, y);
        surface.lineTo(x + cellSize - ne, y);
        surface.lineTo(x + cellSize, y + ne);
        surface.lineTo(x + cellSize, y + cellSize - se);
        surface.lineTo(x + cellSize - se, y + cellSize);
        surface.lineTo(x + sw, y + cellSize);
        surface.lineTo(x, y + cellSize - sw);
        surface.lineTo(x, y + nw);
        surface.closePath();
        if (north) {
          light.moveTo(x, y + nw);
          light.lineTo(x + nw, y);
          light.lineTo(x + cellSize - ne, y);
          light.lineTo(x + cellSize, y + ne);
        }
        if (west) {
          light.moveTo(x, y + nw);
          light.lineTo(x, y + cellSize - sw);
        }
        if (south) {
          shade.moveTo(x, y + cellSize - sw);
          shade.lineTo(x + sw, y + cellSize);
          shade.lineTo(x + cellSize - se, y + cellSize);
          shade.lineTo(x + cellSize, y + cellSize - se);
        }
        if (east) {
          shade.moveTo(x + cellSize, y + ne);
          shade.lineTo(x + cellSize, y + cellSize - se);
        }
      }
    }
    ink.save();
    ink.fillStyle = pattern;
    ink.fill(surface);
    ink.lineWidth = .55;
    ink.lineCap = "round";
    ink.lineJoin = "round";
    ink.strokeStyle = theme.light;
    ink.stroke(light);
    ink.strokeStyle = theme.shade;
    ink.stroke(shade);
    ink.restore();
  }

  function buildTerrain(tiles, columns, rows, tileSize, theme, visualSeed) {
    terrainCache = document.createElement("canvas");
    terrainCache.width = columns * tileSize * cacheScale;
    terrainCache.height = rows * tileSize * cacheScale;
    const ink = terrainCache.getContext("2d");
    ink.scale(cacheScale, cacheScale);
    ink.imageSmoothingEnabled = true;
    ink.imageSmoothingQuality = "high";
    // Large quiet surfaces dominate. Sparse wear and the placement/scale of
    // the material vary with the floor's cosmetic seed.
    const patchSize = tileSize * (theme.patchTiles + ((visualSeed >>> 20) & 1));
    const offsetX = (visualSeed >>> 4) % patchSize;
    const offsetY = (visualSeed >>> 12) % patchSize;
    for (let y = -offsetY; y < rows * tileSize; y += patchSize) {
      for (let x = -offsetX; x < columns * tileSize; x += patchSize) {
        const col = (x + offsetX) / patchSize, row = (y + offsetY) / patchSize;
        let variation = visualSeed ^ Math.imul(col, 0x9e3779b1) ^ Math.imul(row, 0x85ebca6b);
        variation = Math.imul(variation ^ (variation >>> 16), 0x45d9f3b) >>> 0;
        terrainTile(ink, (variation >>> 16) % 5 === 0 ? 1 : 0, x, y, patchSize, patchSize);
      }
    }
    const size = terrain.naturalWidth / 2;
    const wallSlice = size / 3;
    const wallOffset = (visualSeed >>> 24) % 3;
    const capColumns = columns * 4, capRows = rows * 4;
    const caps = new Uint8Array(capColumns * capRows);
    const markCap = (col, row, width, height) => {
      for (let y = row; y < row + height; y++) {
        caps.fill(1, y * capColumns + col, y * capColumns + col + width);
      }
    };
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < columns; col++) {
        const id = row * columns + col;
        const x = col * tileSize, y = row * tileSize;
        if (tiles[id]) {
          if (row > 0 && !tiles[id - columns]) {
            const shadow = ink.createLinearGradient(0, y, 0, y + 5);
            shadow.addColorStop(0, theme.shadow + "80");
            shadow.addColorStop(1, theme.shadow + "00");
            ink.fillStyle = shadow;
            ink.fillRect(x, y, tileSize, 5);
          }
          if (col > 0 && !tiles[id - 1]) {
            const shadow = ink.createLinearGradient(x, 0, x + 3, 0);
            shadow.addColorStop(0, theme.shadow + "40");
            shadow.addColorStop(1, theme.shadow + "00");
            ink.fillStyle = shadow;
            ink.fillRect(x, y, 3, tileSize);
          }
          continue;
        }
        // Solid ground has a subdued stone surface. This also gives narrow
        // dividing walls a complete top, aligned with their collision cells.
        ink.fillStyle = theme.solid;
        ink.fillRect(x, y, tileSize, tileSize);
        const north = row > 0 && tiles[id - columns];
        const east = col + 1 < columns && tiles[id + 1];
        const south = row + 1 < rows && tiles[id + columns];
        const west = col > 0 && tiles[id - 1];
        if (south) {
          ink.drawImage(terrain, ((col + wallOffset) % 3) * wallSlice, size, wallSlice, size,
            x, y, tileSize, tileSize);
        }
        const cx = col * 4, cy = row * 4;
        if (north || south) markCap(cx, cy, 4, 1);
        // At a front face, the coping ends at its top. The masonry below
        // supplies the corner instead of extending the roof down as a post.
        const sideHeight = south ? 1 : 4;
        if (west) markCap(cx, cy, 1, sideHeight);
        if (east) markCap(cx + 3, cy, 1, sideHeight);

        // Diagonal floor cells join the coping through the solid corner.
        // Northern corners span the height of the front-facing wall.
        if (!south && !east && row + 1 < rows && col + 1 < columns && tiles[id + columns + 1]) {
          markCap(cx + 3, cy, 1, 4);
        }
        if (!south && !west && row + 1 < rows && col > 0 && tiles[id + columns - 1]) {
          markCap(cx, cy, 1, 4);
        }
        if (!north && !east && row > 0 && col + 1 < columns && tiles[id - columns + 1]) {
          markCap(cx + 3, cy, 1, 1);
        }
        if (!north && !west && row > 0 && col > 0 && tiles[id - columns - 1]) {
          markCap(cx, cy, 1, 1);
        }
      }
    }
    drawWallCaps(ink, caps, capColumns, capRows, tileSize / 4, theme);
    cachedTiles = tiles;
    cachedTheme = theme;
    cachedVisualSeed = visualSeed;
  }

  function room(context, floor, view, left, top, now, columns, rows, tileSize) {
    const floorAppearance = floor.appearance ?? defaultAppearance;
    const theme = terrainThemes[floorAppearance.theme] ?? terrainThemes[0];
    if (!ready(theme.image)) return false;
    terrain = theme.image;
    const visualSeed = floorAppearance.seed >>> 0;
    if (cachedTiles !== floor.tiles || cachedTheme !== theme || cachedVisualSeed !== visualSeed) {
      buildTerrain(floor.tiles, columns, rows, tileSize, theme, visualSeed);
    }
    context.drawImage(terrainCache, left * cacheScale, top * cacheScale,
      view.width * cacheScale, view.height * cacheScale, left, top, view.width, view.height);
    const firstRow = Math.max(0, Math.floor(top / tileSize) - 2);
    const lastRow = Math.min(rows - 1, Math.ceil((top + view.height) / tileSize) + 1);
    const firstCol = Math.max(0, Math.floor(left / tileSize) - 2);
    const lastCol = Math.min(columns - 1, Math.ceil((left + view.width) / tileSize) + 1);
    for (let row = firstRow; row <= lastRow; row++) {
      for (let col = firstCol; col <= lastCol; col++) {
        const id = row * columns + col;
        if (floor.tiles[id] || !floor.tiles[id + columns] || (col + row) % 7 !== 0) continue;
        const x = col * tileSize + 8, y = row * tileSize + 10;
        const flicker = Math.sin(now / 170 + col) * .7;
        const glow = context.createRadialGradient(x, y, 1, x, y, 30 + flicker);
        glow.addColorStop(0, "#ffc87766");
        glow.addColorStop(.4, "#eba23e24");
        glow.addColorStop(1, "#eea04400");
        context.fillStyle = glow;
        context.fillRect(x - 32, y - 32, 64, 64);
        if (ready(wallTorch)) {
          const height = 17, width = height * wallTorch.naturalWidth / wallTorch.naturalHeight;
          context.drawImage(wallTorch, x - width / 2, y - 9, width, height);
          continue;
        }
        if (ready(props)) {
          const torch = gameplayPropFrames[2];
          const height = 11, width = height * torch.w / torch.h;
          context.drawImage(props, torch.x, torch.y, torch.w, torch.h,
            x - width / 2, y - 6, width, height);
          continue;
        }
        context.fillStyle = "#68472d";
        context.fillRect(x - 1.5, y - 2, 3, 6);
        context.fillStyle = "#de8f3d";
        context.fillRect(x - 1.3, y - 5, 2.6, 5);
        context.fillStyle = "#ffe0a2";
        context.fillRect(x - .6, y - 5 + flicker, 1.2, 3.5);
      }
    }
    const { stairs } = floor;
    const size = terrain.naturalWidth / 2;
    context.drawImage(terrain, size * 1.06, size * 1.05, size * .88, size * .88,
      stairs.left - 3, stairs.top - 4, 38, 36);
    return true;
  }

  function actor(context, row, pose, x, y, facing, flashing) {
    if (!ready(actors)) return false;
    const frame = gameplayActorFrames[row][pose];
    return drawFigure(context, actors, frame, 21 / gameplayActorHeights[row], frame.h, x, y, facing, flashing);
  }

  // Register the pelvis horizontally. A common ground line preserves the airborne poses.
  const runFrames = [213, 212, 208, 204, 206, 203, 204, 213].map((anchorX, i) => ({
    x: Math.floor((i % 4) * 1774 / 4), y: i < 4 ? 0 : 443,
    w: i % 2 === 0 ? 443 : 444, h: i < 4 ? 443 : 444, anchorX
  }));
  function run(context, distance, x, y, facing, flashing) {
    if (!ready(runner)) return false;
    const frame = runFrames[Math.floor(distance / 4.5) % runFrames.length];
    return drawFigure(context, runner, frame, 21 / 405, 433, x, y, facing, flashing);
  }

  // Column zero holds the standing pose. Register at the hips so the flowing
  // cape and the sword do not shift the whole character sideways between steps.
  function directionalFrames(rows) {
    return rows.map((anchors, row) => anchors.map((anchorX, col) => {
      const left = Math.floor(col * 1983 / 5);
      return { x: left, y: row * 396, w: Math.floor((col + 1) * 1983 / 5) - left,
        h: 396 + row, anchorX };
    }));
  }
  const verticalFrames = directionalFrames([[233, 246, 234, 235, 231], [229, 245, 227, 226, 225]]);
  const diagonalFrames = directionalFrames([[226, 237, 225, 227, 222], [222, 235, 221, 215, 221]]);

  function directional(context, north, distance, x, y, flashing, diagonalFacing = 0) {
    const sheet = diagonalFacing ? diagonalRunner : verticalRunner;
    if (!ready(sheet)) return false;
    const pose = distance > 0 ? 1 + Math.floor(distance / 9) % 4 : 0;
    const frames = diagonalFacing ? diagonalFrames : verticalFrames;
    return drawFigure(context, sheet, frames[north ? 1 : 0][pose], 21 / 381, 389,
      x, y, diagonalFacing || 1, flashing);
  }

  function drawFigure(context, sheet, frame, scale, ground, x, y, facing, flashing) {
    const width = frame.w * scale, height = frame.h * scale;
    context.save();
    const shadow = context.createRadialGradient(x, y, 1, x, y, 9);
    shadow.addColorStop(0, "#050b10a0");
    shadow.addColorStop(1, "#050b1000");
    context.fillStyle = shadow;
    context.fillRect(x - 9, y - 3, 18, 6);
    context.translate(x, y);
    context.scale(facing, 1);
    if (flashing) context.globalAlpha = .45;
    context.drawImage(sheet, frame.x, frame.y, frame.w, frame.h,
      -frame.anchorX * scale, -ground * scale, width, height);
    context.restore();
    return true;
  }

  function weapon(context, x, y, angle, reach, readyStrike = false, sword = false) {
    context.save();
    context.translate(x, y);
    context.rotate(angle);
    if (ready(props)) {
      const prop = gameplayPropFrames[sword ? 0 : 1];
      const scale = Math.max(1, reach - 1) / prop.w;
      context.drawImage(props, prop.x, prop.y, prop.w, prop.h,
        2, -prop.axisY * scale, prop.w * scale, prop.h * scale);
      context.restore();
      return;
    }
    context.fillStyle = "#58402b";
    context.fillRect(2, -.6, sword ? 3 : Math.max(2, reach - 5), 1.2);
    if (sword) {
      context.fillStyle = "#c79c60";
      context.fillRect(4.5, -1.7, .8, 3.4);
      context.fillStyle = "#b3c6cc";
      context.fillRect(5, -.8, Math.max(1, reach - 5), 1.6);
      context.fillStyle = "#e0e8dc";
      context.fillRect(5, -.8, Math.max(1, reach - 5), .45);
      context.restore();
      return;
    }
    context.fillStyle = "#ba8c51";
    context.fillRect(3, -.4, Math.max(1, reach - 7), .4);
    context.beginPath();
    context.moveTo(reach + 1, 0);
    context.lineTo(reach - 4, -1.7);
    context.lineTo(reach - 3, 0);
    context.lineTo(reach - 4, 1.7);
    context.closePath();
    context.fillStyle = readyStrike ? "#ffe0a2" : "#becbd1";
    context.fill();
    context.restore();
  }

  // Hip registration and grip centers in the six whole-body drawings.
  // Columns: raised, extended, lowered. Rows: planted and running.
  const slashFrames = [
    [[258, 242, 113], [250, 430, 185], [239, 365, 265]],
    [[256, 248, 108], [253, 440, 168], [246, 358, 243]]
  ].map((row, r) => row.map(([anchorX, fistX, fistY], col) => ({
    x: col * 512, y: r * 512, w: 512, h: 512, anchorX, fistX, fistY
  })));

  // Each pair of rows is one view (south, north, southeast, northeast).
  // Each cell records the hip and the closed hand in its own 256px coordinates.
  const directionalSlashFrames = [
    [[134,168,67], [135,92,117], [137,54,142]],
    [[134,168,66], [136,88,114], [138,54,138]],
    [[134,164,32], [129,187,14], [136,218,73]],
    [[134,165,33], [129,189,15], [136,219,65]],
    [[140,146,62], [131,171,114], [128,145,149]],
    [[139,146,61], [132,173,113], [129,150,145]],
    [[140,176,32], [137,214,31], [137,217,113]],
    [[138,177,33], [134,218,29], [137,222,111]]
  ].map((row, r) => row.map(([anchorX, fistX, fistY], col) => ({
    x: col * 256, y: r * 256, w: 256, h: 256, anchorX, fistX, fistY
  })));

  function slash(context, x, y, sign, moving, flashing, blade, direction) {
    const heading = Math.abs(direction);
    const lateral = heading === 0 || heading === Math.PI;
    const sheet = lateral ? slasher : directionalSlasher;
    if (!ready(sheet) || !ready(props)) return false;
    const step = blade.sweep < .22 ? 0 : blade.sweep < .76 ? 1 : 2;
    const viewRow = direction === Math.PI / 2 ? 0 :
      direction === -Math.PI / 2 ? 2 : direction < 0 ? 6 : 4;
    const row = Number(moving) + (lateral ? 0 : viewRow);
    // Mirroring reverses the drawn cut. Reverse its phases to follow the physical arc.
    const frame = (lateral ? slashFrames : directionalSlashFrames)[row][sign > 0 ? step : 2 - step];
    const scale = lateral ? 21 / 470 : 21 / 232;
    const ground = lateral ? (moving ? 487 : 485) : (moving ? 246 : 240);
    drawArmedPose(context, sheet, frame, scale, ground, x, y, sign, flashing, blade, direction);
    return true;
  }

  // East, south, north, southeast, northeast. Grips and blade angles are
  // registered to each body drawing and shared by every equipped weapon.
  const guardianMotionFrames = [
    [[96,72], [101,76], [103,67], [95,83], [97,71]],
    [[77,85], [72,84], [64,85], [66,86], [76,83]],
    [[101,76], [106,52], [106,51], [108,57], [108,52]],
    [[96,75], [99,78], [99,71], [96,85], [95,76]],
    [[101,69], [108,55], [104,52], [104,60], [105,58]]
  ].map((row, r) => row.map(([fistX, fistY], c) => ({
    x: c * 160, y: r * 144, w: 160, h: 144, anchorX: 80, fistX, fistY,
    weaponAngle: -Math.PI / 4, weaponBehind: r === 2 || r === 4
  })));

  // Measured grips for the adventurer's locomotion frames, in the same five views.
  const adventurerFrames = [
    [[80,96], [107,88], [108,84], [109,88], [99,88]],
    [[64,100], [70,91], [65,80], [73,86], [72,100]],
    [[111,100], [112,89], [104,90], [105,89], [104,88]],
    [[76,100], [96,100], [95,90], [100,90], [88,100]],
    [[80,98], [88,94], [106,80], [113,82], [109,86]]
  ].map((row, r) => row.map(([fistX, fistY], c) => ({
    x: c * 160, y: r * 144, w: 160, h: 144, anchorX: 80, fistX, fistY,
    weaponAngle: -Math.PI / 4, weaponBehind: r === 2 || r === 4
  })));
  const adventurerAttackFrames = [
    [[96,96,-55], [108,98,0], [108,126,35], [96,105,-50]],
    [[81,116,35], [75,125,90], [55,125,150], [80,110,-50]],
    [[44,68,-140], [89,64,-95], [115,69,-45], [106,87,-60]],
    [[85,96,-30], [104,112,20], [93,137,55], [104,105,-50]],
    [[38,71,-150], [112,69,-35], [124,104,10], [108,86,-55]]
  ].map((row, r) => row.map(([fistX, fistY, angle], c) => ({
    x: c * 192, y: r * 176, w: 192, h: 176, anchorX: 80, fistX, fistY,
    weaponAngle: angle * Math.PI / 180, weaponBehind: r === 2 || r === 4
  })));
  const guardianAttackFrames = [
    [[96,94,-55], [108,96,0], [109,126,35], [99,105,-50]],
    [[77,116,35], [76,112,90], [67,120,150], [83,109,-50]],
    [[48,69,-140], [90,54,-95], [116,67,-45], [111,87,-60]],
    [[89,93,-30], [106,112,20], [94,134,55], [106,107,-50]],
    [[42,71,-150], [110,69,-35], [114,102,10], [110,87,-55]]
  ].map((row, r) => row.map(([fistX, fistY, angle], c) => ({
    x: c * 192, y: r * 176, w: 192, h: 176, anchorX: 80, fistX, fistY,
    weaponAngle: angle * Math.PI / 180, weaponBehind: r === 2 || r === 4
  })));

  function guardian(context, x, y, direction, moving, stride, flashing, blade, item = gameItems.shortSword) {
    if (!ready(guardianSheet) || !ready(guardianAttackBody)) return false;
    const heading = Math.abs(direction);
    const sign = heading > Math.PI / 2 ? -1 : 1;
    let row = 0;
    if (heading === Math.PI / 2) row = direction > 0 ? 1 : 2;
    else if (heading > 0 && heading < Math.PI) row = direction > 0 ? 3 : 4;
    const scale = 21 / 118;
    if (blade || !moving) {
      let pose = 3;
      if (blade && blade.phase < .83) {
        const step = blade.sweep < .22 ? 0 : blade.sweep < .76 ? 1 : 2;
        pose = sign > 0 ? step : 2 - step;
      }
      drawEquippedPose(context, guardianAttackBody, guardianAttackFrames[row][pose],
        scale, 154, x, y, sign, flashing, item);
      return true;
    }
    const pose = 1 + Math.floor(stride / 9) % 4;
    drawEquippedPose(context, guardianSheet, guardianMotionFrames[row][pose], scale, 132, x, y, sign, flashing, item);
    return true;
  }

  function adventurer(context, x, y, direction, moving, stride, flashing, blade, item = gameItems.shortSword) {
    if (!ready(adventurerSheet) || !ready(adventurerAttackBody)) return false;
    const heading = Math.abs(direction);
    const sign = heading > Math.PI / 2 ? -1 : 1;
    let row = 0;
    if (heading === Math.PI / 2) row = direction > 0 ? 1 : 2;
    else if (heading > 0 && heading < Math.PI) row = direction > 0 ? 3 : 4;
    const scale = 21 / 118;
    if (blade || !moving) {
      let pose = 3;
      if (blade && blade.phase < .83) {
        const step = blade.sweep < .22 ? 0 : blade.sweep < .76 ? 1 : 2;
        pose = sign > 0 ? step : 2 - step;
      }
      drawEquippedPose(context, adventurerAttackBody, adventurerAttackFrames[row][pose],
        scale, 154, x, y, sign, flashing, item);
      return true;
    }
    const frame = adventurerFrames[row][1 + Math.floor(stride / 9) % 4];
    drawEquippedPose(context, adventurerSheet, frame, scale, 132, x, y, sign, flashing, item);
    return true;
  }

  // Nine whole-body drawings per view. Columns 1–4 form the running loop.
  // Columns 5–7 are wind-up/contact/follow-through. Hands are registered locally.
  const characterGrips = [
    [[74,98],[108,88],[110,91],[112,95],[106,93],[75,84],[128,68],[130,68],[74,98]],
    [[61,101],[65,91],[62,83],[66,88],[64,100],[62,91],[61,97],[107,81],[61,101]],
    [[110,100],[110,85],[110,85],[110,85],[110,85],[116,71],[126,60],[129,60],[110,100]],
    [[70,100],[95,100],[95,90],[96,97],[86,103],[72,99],[126,79],[130,73],[70,100]],
    [[78,100],[88,102],[109,85],[115,83],[111,83],[87,83],[127,60],[130,60],[78,100]]
  ];
  const goblinFrontGrips = [[51,106],[62,91],[62,83],[65,89],[55,104],[63,91],[82,99],[115,80],[51,106]];
  const characterAttackAngles = [
    [-55,0,35], [35,90,150], [-140,-95,-45], [-30,20,55], [-150,-35,10]
  ];

  function character(context, x, y, race, characterClass, direction, moving, stride, flashing, blade, item) {
    if (race === "human" && characterClass === "adventurer") {
      return adventurer(context, x, y, direction, moving, stride, flashing, blade, item);
    }
    if (race === "human" && characterClass === "guardian") {
      return guardian(context, x, y, direction, moving, stride, flashing, blade, item);
    }
    const sheet = prepareCharacter(race, characterClass);
    if (!ready(sheet)) return false;
    const heading = Math.abs(direction), sign = heading > Math.PI / 2 ? -1 : 1;
    let row = 0, col = moving ? 1 + Math.floor(stride / 9) % 4 : 0;
    if (heading === Math.PI / 2) row = direction > 0 ? 1 : 2;
    else if (heading > 0 && heading < Math.PI) row = direction > 0 ? 3 : 4;
    let angle = -Math.PI / 4;
    if (blade && blade.phase < .83) {
      const phase = blade.sweep < .22 ? 0 : blade.sweep < .76 ? 1 : 2;
      const pose = sign > 0 ? phase : 2 - phase;
      col = 5 + pose;
      angle = characterAttackAngles[row][pose] * Math.PI / 180;
    }
    const [fistX, fistY] = race === "goblin" && row === 1 ? goblinFrontGrips[col] : characterGrips[row][col];
    const frame = {x:col*160,y:row*144,w:160,h:144,anchorX:80,fistX,fistY,
      weaponAngle:angle,weaponBehind:row===2||row===4};
    drawEquippedPose(context,sheet,frame,21/118,132,x,y,sign,flashing,item);
    return true;
  }

  function drawEquippedPose(context, sheet, frame, scale, ground, x, y, sign, flashing, item) {
    const weapon = itemSprite(item);
    const showWeapon = weapon && ready(weapon);
    if (!frame.weaponBehind || !showWeapon) drawFigure(context, sheet, frame, scale, ground, x, y, sign, flashing);
    if (!showWeapon) return;
    equippedWeapon(context, item, x + sign * (frame.fistX - frame.anchorX) * scale,
      y + (frame.fistY - ground) * scale, frame.weaponAngle, flashing, sign);
    if (frame.weaponBehind) {
      drawFigure(context, sheet, frame, scale, ground, x, y, sign, flashing);
      return;
    }
    // Fingers cover the grip, preserving the appearance of a held item.
    context.save();
    if (flashing) context.globalAlpha = .45;
    context.translate(x, y);
    context.scale(sign, 1);
    context.drawImage(sheet, frame.x + frame.fistX - 5, frame.y + frame.fistY - 5, 10, 10,
      (frame.fistX - 5 - frame.anchorX) * scale, (frame.fistY - 5 - ground) * scale, 10 * scale, 10 * scale);
    context.restore();
  }

  function equippedWeapon(context, item, x, y, angle, flashing = false, facing = 1) {
    const image = itemSprite(item);
    if (!image || !ready(image)) return false;
    context.save();
    if (flashing) context.globalAlpha = .45;
    context.translate(x, y);
    context.scale(facing, 1);
    context.rotate(angle);
    const scale = 9.8 / 256;
    context.drawImage(image, -40 * scale, -80 * scale, 256 * scale, 160 * scale);
    context.restore();
    return true;
  }

  function drawArmedPose(context, sheet, frame, scale, ground, x, y, sign, flashing, blade, direction) {
    const bladeBehind = direction < 0;
    if (!bladeBehind) drawFigure(context, sheet, frame, scale, ground, x, y, sign, flashing);
    const handX = x + sign * (frame.fistX - frame.anchorX) * scale;
    const handY = y + (frame.fistY - ground) * scale;
    // During a cut the tip follows the same arc sampled by the hit test.
    const restAngle = (sign > 0 ? 45 : 115) * Math.PI / 180;
    const dx = blade ? blade.cx + Math.cos(blade.angle) * blade.reach - handX : 8.75 * Math.cos(restAngle);
    const dy = blade ? blade.cy + Math.sin(blade.angle) * blade.reach - handY : -8.75 * Math.sin(restAngle);
    const sword = gameplayPropFrames[0];
    const gripFraction = .145;
    const length = Math.hypot(dx, dy) / (1 - gripFraction);
    context.save();
    if (flashing) context.globalAlpha = .45;
    context.translate(handX, handY);
    context.rotate(Math.atan2(dy, dx));
    context.drawImage(props, sword.x, sword.y, sword.w, sword.h,
      -gripFraction * length, -sword.axisY * .018, length, sword.h * .018);
    context.restore();
    if (bladeBehind) drawFigure(context, sheet, frame, scale, ground, x, y, sign, flashing);
  }

  return { appearance, room, actor, weapon, run, directional, slash, guardian, adventurer,
    character, prepareCharacter, equippedWeapon, enemy, enemyView, enemyPose };
}
