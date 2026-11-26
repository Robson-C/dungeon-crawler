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
  const terrain = new Image();
  const actors = new Image();
  const runner = new Image();
  const verticalRunner = new Image();
  const diagonalRunner = new Image();
  const slasher = new Image();
  const directionalSlasher = new Image();
  const props = new Image();
  let terrainCache = null;
  let cachedTiles = null;
  const cacheScale = 4;
  const ready = image => image.complete && image.naturalWidth > 0;
  terrain.src = "assets/gameplay-terrain.png";
  actors.src = "assets/gameplay-actors.png";
  runner.src = "assets/player-run.png";
  verticalRunner.src = "assets/player-vertical.png";
  diagonalRunner.src = "assets/player-diagonal.png";
  slasher.src = "assets/player-slash.png";
  directionalSlasher.src = "assets/player-directional-slash.webp";
  props.src = "assets/gameplay-props.png";

  function terrainTile(context, index, x, y, width, height) {
    const size = terrain.naturalWidth / 2;
    context.drawImage(terrain, (index % 2) * size, Math.floor(index / 2) * size,
      size, size, x, y, width, height);
  }

  function buildTerrain(tiles, columns, rows, tileSize) {
    terrainCache = document.createElement("canvas");
    terrainCache.width = columns * tileSize * cacheScale;
    terrainCache.height = rows * tileSize * cacheScale;
    const ink = terrainCache.getContext("2d");
    ink.scale(cacheScale, cacheScale);
    ink.imageSmoothingEnabled = true;
    ink.imageSmoothingQuality = "high";
    ink.fillStyle = "#152027";
    ink.fillRect(0, 0, columns * tileSize, rows * tileSize);
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < columns; col++) {
        const id = row * columns + col;
        const x = col * tileSize, y = row * tileSize;
        if (tiles[id]) {
          terrainTile(ink, (col * 17 + row * 31) % 2, x, y, tileSize, tileSize);
          if (row > 0 && !tiles[id - columns]) {
            ink.fillStyle = "#0b161b45";
            ink.fillRect(x, y, tileSize, 3);
          }
          continue;
        }
        if (row + 1 < rows && tiles[id + columns]) {
          terrainTile(ink, 2, x, y, tileSize, tileSize);
        } else {
          // The coping slices occupy the solid tile, never a walkable neighbor.
          const size = terrain.naturalWidth / 2;
          const cap = (tx, ty, w, h) => ink.drawImage(terrain, 0, size,
            size, size / 4, tx, ty, w, h);
          if (row > 0 && tiles[id - columns]) cap(x, y, tileSize, 4);
          if (col > 0 && tiles[id - 1]) cap(x, y, 4, tileSize);
          if (col + 1 < columns && tiles[id + 1]) cap(x + tileSize - 4, y, 4, tileSize);
        }
      }
    }
    cachedTiles = tiles;
  }

  function room(context, floor, view, left, top, now, columns, rows, tileSize) {
    if (!ready(terrain)) return false;
    if (cachedTiles !== floor.tiles) buildTerrain(floor.tiles, columns, rows, tileSize);
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
        const glow = context.createRadialGradient(x, y, 1, x, y, 24 + flicker);
        glow.addColorStop(0, "#ffc87745");
        glow.addColorStop(1, "#eea04400");
        context.fillStyle = glow;
        context.fillRect(x - 26, y - 26, 52, 52);
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
    terrainTile(context, 3, stairs.left - 3, stairs.top - 4, 38, 36);
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
    const bladeBehind = direction < 0;
    if (!bladeBehind) drawFigure(context, sheet, frame, scale, ground, x, y, sign, flashing);
    const handX = x + sign * (frame.fistX - frame.anchorX) * scale;
    const handY = y + (frame.fistY - ground) * scale;
    const dx = blade.cx + Math.cos(blade.angle) * blade.reach - handX;
    const dy = blade.cy + Math.sin(blade.angle) * blade.reach - handY;
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
    return true;
  }

  return { room, actor, weapon, run, directional, slash };
}
