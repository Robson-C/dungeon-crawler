"use strict";

// These browser interactions are suppressed across menus, dialogs and the map.
// Pointer events still drive the inventory's own item drag and aiming cancellation.
for (const type of ["contextmenu", "selectstart", "dragstart"]) {
  document.addEventListener(type, event => event.preventDefault(), { capture: true });
}
document.addEventListener("keydown", event => {
  if ((event.ctrlKey || event.metaKey) && !event.altKey && event.code === "KeyA") event.preventDefault();
}, { capture: true });

const world = { width: 896, height: 512 };
const tileSize = 16;
const columns = world.width / tileSize, rows = world.height / tileSize;
const radius = 5;
const speed = 72;
const attributeTiming = Object.freeze({ periodMs: 10000, tickMs: 500 });
const enemyDropChance = 0.5;
const dropAnimation = { flight: 420, bounce: 180, deathFade: 180 };
const baseCharacterStats = Object.freeze({
  health: 100, energy: 100, armor: 10, strength: 10, stamina: 10, willpower: 10, intellect: 10,
  fireResistance: 0, iceResistance: 0, poisonResistance: 0, lightningResistance: 0
});
const raceDefinitions = {
  human: { name: "Humano", modifiers: {}, description: "Sem bônus ou penalidades." },
  goblin: { name: "Goblin", modifiers: { health: -20, stamina: 5 },
    description: "+5 Vigor. −20 Vida." },
  skeleton: { name: "Esqueleto", modifiers: { armor: -5, willpower: 5 },
    description: "+5 Vontade. −5 Armadura." },
  draconic: { name: "Dracônico", modifiers: { health: 20, stamina: 5, intellect: -5, willpower: -5 },
    description: "+20 Vida e +5 Vigor. −5 Intelecto e Vontade. Habilidade de fogo em breve." }
};
const classDefinitions = {
  adventurer: { name: "Aventureiro", modifiers: { stamina: 5, fireResistance: 10, iceResistance: 10,
    poisonResistance: 10, lightningResistance: 10 },
    description: "+5 Vigor e +10 em todas as resistências." },
  guardian: { name: "Guardião", modifiers: { health: 20, armor: 5 },
    description: "+20 Vida e +5 Armadura." },
  elementalist: { name: "Elementalista", modifiers: { fireResistance: 20, iceResistance: 20,
    poisonResistance: 20, lightningResistance: 20 },
    description: "+20 em todas as resistências elementais." },
  alchemist: { name: "Alquimista", modifiers: { poisonResistance: 30, lightningResistance: 30 },
    description: "+30 de resistência a veneno e elétrica. Habilidade de veneno em breve." }
};

// Resistances store percentage points. Elemental damage is a future mechanic.
function initialCharacterStats(race, characterClass) {
  const stats = { ...baseCharacterStats };
  for (const definition of [raceDefinitions[race], classDefinitions[characterClass]]) {
    for (const [stat, modifier] of Object.entries(definition.modifiers)) stats[stat] += modifier;
  }
  return { ...stats, maxHealth: stats.health, maxEnergy: stats.energy };
}
const targetMaxHealth = 3;
const enemyRules = { notice: 46, loseInterest: 96, speed: 49, attackRange: 17, reach: 19,
  windup: 0.55, recovery: 0.75 };
const enemySpawn = { radius: 6, health: targetMaxHealth, strength: 1, armor: 0, flashUntil: 0, state: "idle",
  direction: Math.PI, remaining: 0 };
const enemyFamilies = Object.keys(enemyArtData);

// A separate cosmetic stream preserves map generation and the number of enemies.
function enemyFamilyAt(seed, number, index) {
  let value = (seed ^ Math.imul(number, 0x9e3779b1) ^ Math.imul(index + 1, 0x85ebca6b)) >>> 0;
  value = Math.imul(value ^ (value >>> 16), 0x7feb352d) >>> 0;
  return enemyFamilies[value % enemyFamilies.length];
}
let runSeed, depth, floor;
const steps = [-columns, 1, columns, -1];

function tileAt(x, y) {
  return Math.floor(y / tileSize) * columns + Math.floor(x / tileSize);
}

function tileCenter(id) {
  return { x: (id % columns + 0.5) * tileSize, y: (Math.floor(id / columns) + 0.5) * tileSize };
}

// Every walkable tile is inside a solid outer border, including the ends of corridors.
function distancesFrom(tiles, origin) {
  const distance = new Int16Array(tiles.length).fill(-1);
  const queue = [origin];
  distance[origin] = 0;
  for (let i = 0; i < queue.length; i++) {
    const id = queue[i];
    for (const step of steps) {
      const next = id + step;
      if (tiles[next] && distance[next] === -1) {
        distance[next] = distance[id] + 1;
        queue.push(next);
      }
    }
  }
  return distance;
}

// Subdivide the usable footprint at fresh positions on each floor. Bounds omit the
// last row/column of each parcel when carved, leaving a shared wall for doorways.
function partitionFloor(integer, style) {
  const pad = style === "halls" ? 4 : 3;
  const x = integer(1, pad), y = integer(1, pad);
  const root = { x, y, w: columns - x - integer(1, pad), h: rows - y - integer(1, pad) };
  const parts = [root];
  let hub = null;
  if (style === "junction") {
    const west = integer(9, root.w - 22), north = integer(8, root.h - 17);
    const w = integer(10, root.w - west - 9), h = integer(8, root.h - north - 8);
    hub = { x: x + west, y: y + north, w, h };
    parts.splice(0, 1, hub,
      { x, y, w: west, h: root.h },
      { x: hub.x + w, y, w: root.w - west - w, h: root.h },
      { x: hub.x, y, w, h: north },
      { x: hub.x, y: hub.y + h, w, h: root.h - north - h });
  }
  const count = style === "halls" ? 3 : integer(5, 14);
  while (parts.length < count) {
    const choices = parts.filter(p => p !== hub && (p.w >= 16 || p.h >= 16));
    if (!choices.length) break;
    const p = choices[integer(0, choices.length - 1)];
    const vertical = p.w >= 16 && (p.h < 16 || integer(1, p.w + p.h) <= p.w);
    const cut = integer(8, (vertical ? p.w : p.h) - 8);
    if (vertical) {
      parts.push({ x: p.x + cut, y: p.y, w: p.w - cut, h: p.h });
      p.w = cut;
    } else {
      parts.push({ x: p.x, y: p.y + cut, w: p.w, h: p.h - cut });
      p.h = cut;
    }
  }
  return { parts, hub };
}

function carveLayout(integer, style) {
  const tiles = new Uint8Array(columns * rows);
  const { parts, hub } = partitionFloor(integer, style);
  function carve(x, y, w, h) {
    const left = Math.max(1, x), right = Math.min(columns - 1, x + w);
    for (let row = Math.max(y, 1); row < Math.min(rows - 1, y + h); row++) {
      tiles.fill(1, row * columns + left, row * columns + right);
    }
  }
  const rooms = parts.map(p => {
    const w = style === "halls" ? p.w - 1 : integer(7, p.w - 1);
    const h = style === "halls" ? p.h - 1 : integer(7, p.h - 1);
    const x = p.x + integer(0, p.w - w - 1), y = p.y + integer(0, p.h - h - 1);
    // A corner recess leaves the central five rows and columns unbroken.
    const notchW = integer(0, Math.floor((w - 5) / 2));
    const notchH = integer(0, Math.floor((h - 5) / 2));
    const corner = integer(0, 3);
    for (let j = 0; j < h; j++) {
      const cut = (corner < 2 ? j : h - 1 - j) < notchH ? notchW : 0;
      carve(x + (corner % 2 ? 0 : cut), y + j, w - cut, 1);
    }
    return { p, x, y, w, h, cx: x + Math.floor(w / 2), cy: y + Math.floor(h / 2) };
  });

  function join(a, b, horizontal) {
    const width = style === "halls" ? 1 : integer(1, 5);
    const offset = Math.floor(width / 2);
    const acrossA = horizontal ? a.cy : a.cx, acrossB = horizontal ? b.cy : b.cx;
    const from = horizontal ? a.cx : a.cy, to = horizontal ? b.cx : b.cy;
    const seam = horizontal ? b.p.x - 1 : b.p.y - 1;
    const low = Math.max(acrossA, acrossB) - 2, high = Math.min(acrossA, acrossB) + 2;
    // Adjacent rooms with overlapping faces can share a single-tile doorway.
    const faceStart = horizontal ? Math.max(a.y, b.y) + 1 : Math.max(a.x, b.x) + 1;
    const faceEnd = horizontal ? Math.min(a.y + a.h, b.y + b.h) - 2 : Math.min(a.x + a.w, b.x + b.w) - 2;
    if (style === "halls" && faceStart <= faceEnd) {
      const first = integer(faceStart, faceEnd);
      const innerA = horizontal ? a.x + a.w - 1 : a.y + a.h - 1;
      const innerB = horizontal ? b.x : b.y;
      const tile = (along, cross) => horizontal ? cross * columns + along : along * columns + cross;
      if (tiles[tile(innerA, first)] && tiles[tile(innerB, first)]) {
        if (horizontal) carve(innerA, first, innerB - innerA + 1, 1);
        else carve(first, innerA, 1, innerB - innerA + 1);
        return;
      }
    }
    const start = low <= high ? integer(low, high) : acrossA;
    const end = low <= high ? start : acrossB;
    function strip(along, cross, length, breadth) {
      if (horizontal) carve(along, cross, length, breadth);
      else carve(cross, along, breadth, length);
    }
    strip(from, start - offset, seam - from + 1, width);
    strip(seam - offset, Math.min(start, end) - offset, width, Math.abs(end - start) + width);
    strip(seam, end - offset, to - seam + 1, width);
  }

  // Shuffle adjoining parcels, then connect every component. Extra connections
  // create loops; the junction floor opens all four faces of its central room.
  const edges = [];
  for (const a of rooms) for (const b of rooms) {
    const p = a.p, q = b.p;
    if (p.x + p.w === q.x && Math.min(p.y + p.h, q.y + q.h) > Math.max(p.y, q.y))
      edges.push({ a, b, horizontal: true });
    if (p.y + p.h === q.y && Math.min(p.x + p.w, q.x + q.w) > Math.max(p.x, q.x))
      edges.push({ a, b, horizontal: false });
  }
  const groups = new Map(rooms.map(r => [r, r]));
  const loopChance = integer(12, 72);
  while (edges.length) {
    const { a, b, horizontal } = edges.splice(integer(0, edges.length - 1), 1)[0];
    const groupA = groups.get(a), groupB = groups.get(b);
    if (groupA === groupB && a.p !== hub && b.p !== hub && integer(1, 100) > loopChance) continue;
    join(a, b, horizontal);
    if (groupA !== groupB) {
      for (const r of rooms) if (groups.get(r) === groupB) groups.set(r, groupA);
    }
  }
  return { tiles, rooms, hub };
}

function fillThinIslands(tiles) {
  const seen = new Uint8Array(tiles.length);
  for (let start = 0; start < tiles.length; start++) {
    if (tiles[start] || seen[start]) continue;
    const island = [start];
    seen[start] = 1;
    let keep = false;
    for (let i = 0; i < island.length; i++) {
      const id = island[i], x = id % columns;
      if (x === 0 || x === columns - 1 || id < columns || id >= tiles.length - columns) {
        // Any wall that reaches the outer border belongs to the edge of the map.
        keep = true;
      } else if (!tiles[id + 1] && !tiles[id + columns] && !tiles[id + columns + 1]) {
        keep = true;
      }
      for (const step of steps) {
        const next = id + step;
        if (next < 0 || next >= tiles.length || (step === -1 && x === 0) || (step === 1 && x === columns - 1)) continue;
        if (tiles[next] || seen[next]) continue;
        seen[next] = 1;
        island.push(next);
      }
    }
    if (!keep) for (const id of island) tiles[id] = 1;
  }
}

function generateFloor(seed, number) {
  let state = (seed ^ Math.imul(number, 0x9e3779b1)) >>> 0;
  function integer(min, max) {
    state = (Math.imul(1664525, state) + 1013904223) >>> 0;
    return min + Math.floor(state / 4294967296 * (max - min + 1));
  }
  let layout;
  do {
    layout = populateFloor(integer, seed, number);
  } while (!layout);
  layout.appearance = gameplayArt.appearance(seed, number);
  return layout;
}

function populateFloor(integer, seed, number) {
  const roll = integer(1, 100);
  const style = roll <= 18 ? "halls" : roll <= 44 ? "junction" : "mixed";
  const { tiles, rooms, hub } = carveLayout(integer, style);
  fillThinIslands(tiles);
  const entry = hub && integer(0, 1) ? rooms[0] : rooms[integer(0, rooms.length - 1)];
  const spawn = tileCenter((entry.cy + integer(-2, 2)) * columns + entry.cx + integer(-2, 2));
  const distances = distancesFrom(tiles, tileAt(spawn.x, spawn.y));
  const ordered = distances.filter(d => d >= 0).sort();
  const protectedDistance = ordered[Math.ceil(ordered.length / 4) - 1];
  const landings = [], guardSites = [];
  for (let id = 0; id < tiles.length; id++) {
    if (!tiles[id]) continue;
    const p = tileCenter(id);
    if (Math.hypot(p.x - spawn.x, p.y - spawn.y) > enemyRules.notice + tileSize) guardSites.push(id);
    if (distances[id] <= protectedDistance) continue;
    // A 5×5 landing leaves a walkable ring around the 3×3 stair footprint.
    // Include the extra row touched by the marker above the steps in the distance check.
    let fits = true;
    for (let dy = -2; dy <= 2 && fits; dy++) for (let dx = -2; dx <= 2 && fits; dx++) {
      const cell = id + dy * columns + dx;
      fits = tiles[cell] === 1 && (Math.abs(dx) > 1 || dy === 2 || distances[cell] > protectedDistance);
    }
    if (fits) landings.push(id);
  }
  // Retry with the next layout from the same seed if placement is impossible.
  if (!landings.length) return null;
  const landing = tileCenter(landings[integer(0, landings.length - 1)]);
  const stairs = { left: landing.x - 16, right: landing.x + 16, top: landing.y - 14, bottom: landing.y + 15 };
  const enemies = [], total = integer(2, 5) * 2;
  while (enemies.length < total && guardSites.length) {
    const p = tileCenter(guardSites.splice(integer(0, guardSites.length - 1), 1)[0]);
    if (Math.hypot(p.x - landing.x, p.y - landing.y) < 36 ||
        enemies.some(e => Math.hypot(p.x - e.x, p.y - e.y) < 35)) continue;
    enemies.push({ ...enemySpawn, ...p, type: enemyFamilyAt(seed, number, enemies.length),
      moving: false, stride: 0, lookDirection: Math.PI, recoveryDuration: enemyRules.recovery });
  }
  if (enemies.length < total) return null;
  return { tiles, spawn, stairs, enemies, drops: [], pathOrigin: -1, paths: null };
}

function clearFloor(x, y, r) {
  if (x - r < 0 || y - r < 0 || x + r >= world.width || y + r >= world.height) return false;
  const tiles = floor.tiles;
  return tiles[tileAt(x - r, y - r)] && tiles[tileAt(x + r, y - r)] &&
    tiles[tileAt(x - r, y + r)] && tiles[tileAt(x + r, y + r)];
}

function canStand(x, y) {
  return clearFloor(x, y, radius) && floor.enemies.every(enemy =>
    !enemy.health || Math.hypot(x - enemy.x, y - enemy.y) >= radius + enemy.radius);
}

function move(player, dx, dy, seconds) {
  const length = Math.hypot(dx, dy);
  if (!length || player.finished) return;
  const distance = speed * Math.min(seconds, 0.05) / length;
  const x = player.x + dx * distance;
  const y = player.y + dy * distance;
  if (canStand(x, player.y)) player.x = x;
  if (canStand(player.x, y)) player.y = y;
}

const menu = document.getElementById("menu");
const characterCreate = document.getElementById("character-create");
const game = document.getElementById("game");
const instructions = document.getElementById("instructions");
const play = document.getElementById("play");
const canvas = document.getElementById("room");
const ctx = canvas.getContext("2d");
const gameplayArt = createGameplayArt();
const dropImages = new Map();
const zoom = 1.5;
const view = { width: 448 / zoom, height: 256 / zoom };
const pixelsPerUnit = canvas.width / view.width;
const end = document.getElementById("end");
const healthDisplay = document.getElementById("health");
const inventoryHealth = document.getElementById("inventory-health");
const inventory = document.getElementById("inventory");
const inventoryView = createInventoryView(inventory);
const inventoryFigure = document.getElementById("inventory-portrait");
const inventoryFigureCanvas = document.createElement("canvas");
inventoryFigureCanvas.width = 160;
inventoryFigureCanvas.height = 144;
inventoryFigureCanvas.hidden = true;
inventoryFigureCanvas.setAttribute("aria-hidden", "true");
inventoryFigure.append(inventoryFigureCanvas);
const reset = document.getElementById("reset");
const inventoryButton = document.getElementById("open-inventory");
const energyDisplay = document.getElementById("energy");
const healthFill = document.getElementById("health-fill");
const energyFill = document.getElementById("energy-fill");
const gameFeedback = document.getElementById("game-feedback");
const camera = { left: 0, top: 0 };
const attackDistance = 18, pickupDistance = 10;
let playerOrder = null;
let ignoreWorldClick = false;
let feedbackUntil = 0;
let player;
let previous = null;
let gameTime = 0;
let regenerationElapsedMs = 0;

function formatResource(value) {
  return String(Math.floor(value));
}

function regenerateResources(elapsedMs) {
  if (!player || player.finished || player.health <= 0 || game.hidden ||
      !Number.isFinite(elapsedMs) || elapsedMs <= 0) return;
  regenerationElapsedMs += elapsedMs;
  const ticks = Math.floor((regenerationElapsedMs + 1e-7) / attributeTiming.tickMs);
  if (!ticks) return;
  regenerationElapsedMs = Math.max(0, regenerationElapsedMs - ticks * attributeTiming.tickMs);
  const fraction = ticks * attributeTiming.tickMs / attributeTiming.periodMs;
  player.health = Math.min(player.maxHealth, player.health + Math.max(0, player.stamina) * fraction);
  player.energy = Math.min(player.maxEnergy, player.energy + Math.max(0, player.willpower) * fraction);
  showHealth();
  abilities.refresh();
  if (inventory.open) showCharacterSheet();
}
let facing = 1;
let stride = 0;
let playerMoved = false;
let idleStarted = null;
let lastDirection = 0;
let swing = null;
let pendingSwingDirection = null;
const swingDuration = 300;
let mousePoint = null;
let doubleUntil = 0;
let doubleConfirmationClick = null;
const abilities = createAbilitySystem({
  player: () => player, enemies: () => floor?.enemies || [], time: () => gameTime,
  active: () => !game.hidden && !inventory.open && !itemCatalogDialog.open,
  stop: () => { clearPlayerOrder(); clearSwings(); }, focus: () => canvas.focus(),
  line: (a, b, r) => clearPath(a, b, r), floorClear: (x, y, r) => clearFloor(x, y, r),
  enemyCanStand: (enemy, x, y) => clearFloor(x, y, enemy.radius) &&
    Math.hypot(x - player.x, y - player.y) >= enemy.radius + radius &&
    floor.enemies.every(other => other === enemy || !other.health ||
      Math.hypot(x - other.x, y - other.y) >= enemy.radius + other.radius),
  face: angle => { lastDirection = angle; facing = Math.cos(angle) < 0 ? -1 : 1; },
  heading: () => lastDirection,
  drawWeapon: (context, x, y, angle) => gameplayArt.equippedWeapon(context,
    inventoryView.getEquipped("weapon"), x, y, angle),
  beginDouble: angle => {
    clearSwings(); doubleUntil = gameTime + 340;
    swing = { direction: angle, started: gameTime, checked: 0, hit: true, ability: true,
      x: player.x, y: player.y };
  },
  defeat: target => dropEnemyItem(target, gameTime), targetAt: point => enemyAt(point),
  refresh: () => { showHealth(); if (inventory.open) showCharacterSheet(); }
});

function rect(x, y, w, h, color) {
  ctx.fillStyle = color;
  ctx.fillRect(x, y, w, h);
}

// Stable stone texture for each tile position.
function grain(col, row) {
  return ((col * 197 + row * 367 + col * row * 53) >>> 0) % 101;
}

// A narrow wall has no 2×2 patch of rock touching any of its four corners.
// The solid outer border adjoins the void beyond the map.
function isThinWall(tiles, id, col, row) {
  if (col === 0 || row === 0 || col === columns - 1 || row === rows - 1) return false;
  for (const vertical of [-columns, columns]) {
    if (tiles[id + vertical]) continue;
    for (const side of [-1, 1]) {
      if (!tiles[id + side] && !tiles[id + vertical + side]) return false;
    }
  }
  return true;
}

function drawRoom(now, left, top) {
  if (gameplayArt.room(ctx, floor, view, left, top, now, columns, rows, tileSize)) return;
  const stones = ["#3b4849", "#3f4c4c", "#3c4949", "#414c4b", "#3b4749"];
  const { tiles, stairs } = floor;
  rect(left, top, view.width, view.height, "#131b1d");
  for (let row = Math.max(0, Math.floor(top / tileSize) - 1); row < Math.min(rows, Math.ceil((top + view.height) / tileSize) + 1); row++) {
    for (let col = Math.max(0, Math.floor(left / tileSize) - 1); col < Math.min(columns, Math.ceil((left + view.width) / tileSize) + 1); col++) {
      const id = row * columns + col;
      const x = col * tileSize, y = row * tileSize;
      if (tiles[id]) {
        const half = (row + col) % 2;
        const n = grain(Math.floor((col + row % 2) / 2), row);
        rect(x, y, 16, 16, "#2a3637");
        rect(x + (half ? 0 : 1), y + 1, half ? 16 : 15, 15, stones[n % stones.length]);
        rect(x + (half ? 0 : 2), y + 1, half ? 16 : 14, 1, "#4a5653");
        if (n % 5 === 0 && half) rect(x + 3, y + 8, 3, 1, "#53605a");
        if (!tiles[id - columns]) rect(x, y, 16, 3, "#14212060");
      } else if (tiles[id + columns]) {
        rect(x, y, 16, 16, "#333e3c");
        rect(x + 1, y + 2, 15, 4, "#65716a");
        rect(x + 1, y + 2, 14, 1, "#849080");
        rect(x + 1, y + 7, 15, 7, "#49534e");
        if ((col + row) % 7 === 0) {
          rect(x + 6, y + 7, 4, 6, "#7a5536");
          rect(x + 6, y + 4, 4, 5, "#d3934c");
          rect(x + 7, y + 2 + (Math.floor(now / 200) % 2), 2, 6, "#f7cf86");
        }
      } else {
        if (isThinWall(tiles, id, col, row)) {
          rect(x, y, 16, 16, "#505b55");
          rect(x + 1, y + 1, 14, 1, "#707b70");
        }
        if (tiles[id - columns]) rect(x, y, 16, 4, "#606d64");
        if (col > 0 && tiles[id - 1]) rect(x, y, 4, 16, "#50605a");
        if (col + 1 < columns && tiles[id + 1]) rect(x + 12, y, 4, 16, "#657168");
      }
    }
  }
  rect(stairs.left - 3, stairs.top - 4, 38, 36, "#a89976");
  rect(stairs.left - 1, stairs.top - 2, 34, 32, "#182224");
  for (let i = 0; i < 5; i++) {
    const y = stairs.top + 2 + i * 5;
    rect(stairs.left + 3, y, 26, 4, ["#354043", "#485251", "#626761", "#7e8072", "#969681"][i]);
    rect(stairs.left + 3, y + 3, 26, 1, "#253033");
  }
  rect(stairs.left + 13, stairs.top - 16, 5, 7, "#ecc083");
  rect(stairs.left + 11, stairs.top - 12, 9, 2, "#ecc083");
  rect(stairs.left + 14, stairs.top - 9, 3, 2, "#ecc083");
}

// Each sprite pixel is half a world unit. The feet anchor movement and depth.
const adventurer = document.getElementById("equipped-character");
const sprite = adventurer.getContext("2d");
const dyes = { o: "#22232a", r: "#754036", c: "#b65b3f", h: "#e48d52",
  d: "#513a35", s: "#cd8e63", f: "#ffd3a0", w: "#ffead0",
  t: "#395450", a: "#618178", g: "#e7bb64", b: "#745542", l: "#a68259" };
const humanHead = [
  "           ooooooo",
  "        ooocccccccoo",
  "       occhhhhhhccrro",
  "      occchhhcccccrrro",
  "     orcccchhcccrrrddoo",
  "     orrcccccdddddsfffo",
  "     orrrccdddsffffssso",
  "     orrrcddssffffooddo",
  "     orrcdddssffffwodso",
  "      orrdssdsfffffffffo",
  "      orrdsffsfffffffsso",
  "       orddsssssffddffo",
  "       orrdddsffffssso",
  "      orccrdddsssssso"
];
const cloakedBody = [
  "     orcchccrrddddoo",
  "    orccchhhccccrrccoo",
  "   orrccchhccccggcaatto",
  "   orrcchcccrrrggtaaato",
  "  orrcccrrcrrdtttaattto",
  "  orcccrrcrrdtttaatttboo",
  "  orccrrccrdtaaaatttolso",
  " orrcrrccrdtaatattttoffso",
  " orrcrccrdtttaatttttoffso",
  " orrcccrdbbbbggbbbbboddo",
  "orrcccrdbblllgglbblbo",
  "orrcchrdtttaatattttto",
  "orcccrrdttatttattttto",
  " orrrrrdtttttttttdddo",
  "  ooooddbbbbooodbbbbo",
  "      odbbbbo  obbbbo",
  "      odbllbo  oblbbbo",
  "      odbbbbo  obbbbbo",
  "     odlllbbbo oblllbbo",
  "     oooooooo  oooooooo"
];
const goblinHead = [
  "            ooooo", "         ooovvvvvvoo", "       oovvkkkknnkkvo",
  "  oo  ovvkkknnnnnnnkvo", "  onvovvkkknnnnnnnnkkvo", "   okknvkkknnnnvvkkvvvo",
  "   ovknnvvkknnkkvvggvo", "    ovknkvkkknnnnnogvo", "     ovvvvvkkknnnnnnnkoo",
  "       ovvkkknnnnnnnnnkko", "        ovvkkknnvvvvvvo", "         ovvkkknnwknwo",
  "          ovvkkknnkkko", "           oovvvvvvo"
];
const armoredBody = [
  "       oooiiiiiooo", "     ooimmmllmmiiioo", "    oimlllllmmmilmmioo",
  "   oimllmimmmmmillmmio", "   oimmmiillllmiiimmio", "   oooiimmmmmlmioooio",
  "    ooiilmmmmmmiioimio", "     oiilllllmmioommmio", "     oiimmmmmmiiooimmio",
  "     obbbbbggbbbboimio", "     obllbbggbblbooooo", "    oimlmmiimmlmio",
  "    oimmiiooimmmiio", "    oiiioo  oiimioo", "     ommio  oimmmio",
  "     oimio  oiimmio", "     obbbo   obbbbo", "     oblbbo  oblbbbo",
  "    odlllbo  oblllbbo", "    ooooooo  oooooooo"
];
Object.assign(dyes, { v: "#425a43", k: "#779353", n: "#a9bd73", i: "#38474e", m: "#80949a" });
const hurtSprite = document.createElement("canvas");
hurtSprite.width = adventurer.width;
hurtSprite.height = adventurer.height;
const hurtCtx = hurtSprite.getContext("2d");
function characterSelection() {
  return {
    race: characterCreate.querySelector('[name="race"]:checked'),
    characterClass: characterCreate.querySelector('[name="class"]:checked')
  };
}

function characterOptions(type) {
  return Array.from(characterCreate.querySelectorAll(`[name="${type}"]`));
}

function setCharacterOption(type, index) {
  const options = characterOptions(type);
  const selected = (index + options.length) % options.length;
  options.forEach((option, i) => { option.checked = i === selected; });
}

function changeCharacterOption(type, direction) {
  const options = characterOptions(type);
  setCharacterOption(type, options.findIndex(option => option.checked) + direction);
  updateCharacter();
}

function randomizeCharacter(type) {
  for (const selector of type ? [type] : ["race", "class"]) {
    setCharacterOption(selector, Math.floor(Math.random() * characterOptions(selector).length));
  }
  updateCharacter();
}

function updateCharacter() {
  const { race, characterClass } = characterSelection();
  const rows = (race.value === "human" ? humanHead : goblinHead)
    .concat(characterClass.value === "adventurer" ? cloakedBody : armoredBody);
  sprite.clearRect(0, 0, adventurer.width, adventurer.height);
  rows.forEach((row, y) => {
    Array.from(row).forEach((pixel, x) => {
      if (pixel === " ") return;
      sprite.fillStyle = dyes[pixel];
      sprite.fillRect(x, y, 1, 1);
    });
  });
  hurtCtx.globalCompositeOperation = "copy";
  hurtCtx.drawImage(adventurer, 0, 0);
  hurtCtx.globalCompositeOperation = "source-atop";
  hurtCtx.fillStyle = "#ffe8cc";
  hurtCtx.fillRect(0, 0, hurtSprite.width, hurtSprite.height);
  const preview = document.getElementById("preview");
  const inventoryPortrait = document.getElementById("inventory-portrait");
  preview.dataset.appearance = inventoryPortrait.dataset.appearance = `${race.value}-${characterClass.value}`;
  const existingHuman = race.value === "human" && ["adventurer","guardian"].includes(characterClass.value);
  preview.style.backgroundImage = existingHuman ? "" :
    `url("assets/characters/${race.value}-${characterClass.value}.webp")`;
  preview.style.backgroundSize = existingHuman ? "" : "900% 500%";
  inventoryPortrait.style.setProperty("--character-sheet", existingHuman ? "" :
    `url("assets/characters/${race.value}-${characterClass.value}.webp")`);
  if (!existingHuman) gameplayArt.prepareCharacter(race.value, characterClass.value);
  const stats = initialCharacterStats(race.value, characterClass.value);
  for (const stat of Object.keys(baseCharacterStats)) {
    document.getElementById(`creation-${stat}`).textContent = formatResource(stats[stat]);
  }
  for (const [type, definitions] of [["race", raceDefinitions], ["class", classDefinitions]]) {
    const options = characterOptions(type);
    const index = options.findIndex(option => option.checked);
    const definition = definitions[options[index].value];
    for (const [suffix,offset] of [["neighbor-previous",-1],["current",0],["neighbor-next",1]]) {
      const optionIndex = (index + offset + options.length) % options.length;
      const button = document.getElementById(`${type}-${suffix}`);
      button.textContent = definitions[options[optionIndex].value].name;
      button.dataset.optionIndex = optionIndex;
      button.setAttribute("aria-pressed", offset === 0 ? "true" : "false");
    }
    document.getElementById(`${type}-trait-name`).textContent = definition.name;
    document.getElementById(`${type}-trait-description`).textContent = definition.description;
  }
  const appearance = `Raça ${raceDefinitions[race.value].name}, classe ${classDefinitions[characterClass.value].name}`;
  inventoryPortrait.setAttribute("aria-label", appearance);
  preview.setAttribute("aria-label", appearance);
}

function bladePose(x, y, elapsed) {
  const phase = Math.min(1, Math.max(0, elapsed / swingDuration));
  const cut = Math.min(1, Math.max(0, (phase - 0.15) / 0.62));
  const sweep = cut * cut * (3 - 2 * cut);
  const angle = swing.direction - 1.08 + 2.16 * sweep;
  const reach = 12 + 5 * Math.sin(Math.PI * cut);
  const cx = x + 2 * Math.cos(swing.direction);
  const cy = y - 8 + 2 * Math.sin(swing.direction);
  return { phase, sweep, angle, reach, cx, cy };
}

function calculateDamage(strength = 0, weapon = null, armor = 0) {
  const range = weapon?.damage;
  const weaponDamage = range ? range.min + Math.floor(Math.random() * (range.max - range.min + 1)) : 0;
  return Math.max(0, strength + weaponDamage - armor);
}

// Keep the original sampled trail for the remaining pixel sprites.
function drawSwing(x, y, elapsed) {
  const item = inventoryView.getEquipped("weapon");
  if (!item) return;
  const { phase, sweep, angle, reach, cx, cy } = bladePose(x, y, elapsed);
  if (player.race === "human" && player.characterClass === "adventurer") {
    ctx.save();
    ctx.translate(cx, cy);
    if (phase > .15 && phase < .86) {
      ctx.beginPath();
      ctx.arc(0, 0, reach, angle - Math.min(.6, sweep * 2.16), angle);
      ctx.strokeStyle = "#ffdfa569";
      ctx.lineWidth = 1.3;
      ctx.stroke();
    }
    ctx.restore();
    gameplayArt.equippedWeapon(ctx, item, cx, cy, angle);
    return;
  }

  function mark(distance, heading, size, color) {
    rect(Math.round(cx + distance * Math.cos(heading)),
         Math.round(cy + distance * Math.sin(heading)), size, size, color);
  }

  const trail = Math.min(sweep * 2.16, 0.72) * Math.min(1, (1 - phase) / 0.23);
  for (let offset = trail; offset > 0; offset -= 0.055) {
    mark(reach, angle - offset, 1, "#ffe2a9");
    mark(reach - 2, angle - offset, 1, "#aab7a285");
  }
  gameplayArt.equippedWeapon(ctx, item, cx, cy, angle);
}

function clearPath(a, b, padding) {
  const dx = b.x - a.x, dy = b.y - a.y;
  const samples = Math.ceil(Math.hypot(dx, dy) / (tileSize / 4));
  for (let i = 1; i <= samples; i++) {
    if (!clearFloor(a.x + dx * i / samples, a.y + dy * i / samples, padding)) return false;
  }
  return true;
}

function pursuitPoint(enemy) {
  if (clearPath(enemy, player, enemy.radius)) return player;
  const origin = tileAt(player.x, player.y);
  if (floor.pathOrigin !== origin) {
    floor.paths = distancesFrom(floor.tiles, origin);
    floor.pathOrigin = origin;
  }
  const id = tileAt(enemy.x, enemy.y);
  const next = steps.map(step => id + step).find(neighbor =>
    floor.paths[neighbor] >= 0 && floor.paths[neighbor] < floor.paths[id]);
  if (next === undefined) return tileCenter(id);
  const goal = tileCenter(next);
  return clearPath(enemy, goal, enemy.radius) ? goal : tileCenter(id);
}

function enemyAttackConnects(target, dx, dy) {
  const ux = Math.cos(target.direction), uy = Math.sin(target.direction);
  const forward = dx * ux + dy * uy, side = Math.abs(dx * uy - dy * ux);
  if (enemyArtData[target.type]?.attack === "swipe") {
    return Math.hypot(dx, dy) <= enemyRules.reach + radius && forward >= 0 &&
      side <= Math.max(radius, forward * .8);
  }
  const along = Math.max(0, Math.min(enemyRules.reach, forward));
  return Math.hypot(dx - along * ux, dy - along * uy) <= radius;
}

function updateEnemy(target, now, dt) {
  target.moving = false;
  if (!target.health || player.finished) return;
  if (abilities.frozen(target)) return;
  const victim = abilities.lure(target) || player;
  const dx = victim.x - target.x, dy = victim.y - target.y;
  const distance = Math.hypot(dx, dy);
  if (target.state === "windup" || target.state === "recovery") {
    target.remaining -= dt;
    if (target.remaining > 0) return;
    if (target.state === "windup") {
      if (enemyAttackConnects(target, dx, dy) && clearPath(target, victim, 0)) {
        if (victim !== player) {
          abilities.hitDecoy(); target.state = "recovery";
          target.remaining = target.recoveryDuration = enemyRules.recovery;
          return;
        }
        const damage = calculateDamage(target.strength ?? 1, target.weapon, player.armor);
        player.health = Math.max(0, player.health - damage);
        player.flashUntil = now + 240;
        showHealth();
        if (player.health === 0) finishRun();
      }
      target.state = "recovery";
      target.remaining = enemyRules.recovery;
      target.recoveryDuration = enemyRules.recovery;
      return;
    }
    target.state = "chase";
  }
  const limit = target.state === "idle" ? enemyRules.notice : enemyRules.loseInterest;
  if (distance > limit) { target.state = "idle"; return; }
  if (target.state === "idle" && !clearPath(target, victim, 0)) return;
  if (distance <= enemyRules.attackRange && clearPath(target, victim, 0)) {
    target.direction = Math.atan2(dy, dx);
    target.state = "windup";
    target.remaining = enemyRules.windup;
    return;
  }
  target.state = "chase";
  const goal = victim === player ? pursuitPoint(target) : victim;
  const vx = goal.x - target.x, vy = goal.y - target.y;
  const length = Math.hypot(vx, vy);
  if (!length) return;
  const step = Math.min(enemyRules.speed * dt, length) / length;
  const x = target.x + vx * step, y = target.y + vy * step;
  if (clearFloor(x, y, target.radius) && Math.hypot(x - player.x, y - player.y) >= target.radius + radius &&
      floor.enemies.every(other => other === target || !other.health || Math.hypot(x - other.x, y - other.y) >= target.radius + other.radius)) {
    target.direction = target.lookDirection = Math.atan2(vy, vx);
    target.stride = (target.stride ?? 0) + Math.hypot(x - target.x, y - target.y);
    target.moving = true;
    target.x = x; target.y = y;
  }
}

function drawTarget(target, now) {
  const dead = target.health === 0;
  const elapsed = dead ? now - target.diedAt : 0;
  if (dead && (!Number.isFinite(elapsed) || elapsed < 0 || elapsed >= dropAnimation.deathFade)) return;
  ctx.save();
  if (dead) {
    const progress = elapsed / dropAnimation.deathFade;
    ctx.globalAlpha *= 1 - progress;
    ctx.translate(0, progress * 2);
  }
  drawTargetPose(target, dead ? target.diedAt : now, !dead);
  ctx.restore();
}

function drawTargetPose(target, now, showHealth) {
  const x = Math.round(target.x), y = Math.round(target.y);
  const hit = showHealth && now < target.flashUntil;
  if (gameplayArt.enemy(ctx, showHealth ? target : { ...target, flashUntil: 0 }, now)) {
    const top = y - enemyArtData[target.type].height - 3;
    for (let i = 0; showHealth && i < targetMaxHealth; i++) {
      rect(x - 7 + i * 5, top, 4, 1.2, i < target.health ? "#f1ce85" : "#202b2d");
    }
    return;
  }
  const illustratedPose = target.state === "windup" ? 3
    : target.state === "chase" ? 1 + Math.floor(now / 140) % 2 : 0;
  const illustratedFacing = Math.cos(target.direction) < 0 ? -1 : 1;
  if (gameplayArt.actor(ctx, 1, illustratedPose, target.x, target.y, illustratedFacing, hit)) {
    const thrusting = target.state === "recovery" && target.remaining > enemyRules.recovery - .15;
    const ready = target.state === "windup";
    gameplayArt.weapon(ctx, x, y - 8, ready ? -Math.PI / 2 : target.direction,
      thrusting ? enemyRules.reach : ready ? 14 : 9, ready);
    for (let i = 0; showHealth && i < targetMaxHealth; i++) {
      rect(x - 7 + i * 5, y - 25, 4, 1.2, i < target.health ? "#f1ce85" : "#202b2d");
    }
    return;
  }
  rect(x - 8, y - 1, 16, 3, "#202c2dbb");
  const sign = Math.cos(target.direction) < 0 ? -1 : 1;
  const walking = target.state === "chase" ? Math.floor(now / 110) % 2 : 0;
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(sign, 1);
  rect(-4, -5, 3, 5 - walking, "#2c2628");
  rect(1, -5, 3, 4 + walking, "#3b3030");
  rect(-5, -10, 10, 7, hit ? "#fff4cb" : "#875246");
  rect(-5, -5, 10, 1, "#c39a65");
  rect(-5, -16, 9, 7, hit ? "#fff4cb" : "#90ab75");
  rect(-8, -15, 4, 3, hit ? "#fff4cb" : "#708359");
  rect(-5, -13, 11, 2, "#43533f");
  rect(2, -13, 2, 1, "#ffe29b");
  rect(3, -10, 1, 2, "#efe0b3");
  ctx.restore();
  const thrust = target.state === "recovery" && target.remaining > enemyRules.recovery - 0.15;
  const ready = target.state === "windup";
  const angle = ready ? -Math.PI / 2 : target.direction;
  const reach = thrust ? enemyRules.reach : ready ? 14 : 9;
  ctx.save();
  ctx.translate(x, y - 8);
  ctx.rotate(angle);
  rect(3, -1, reach - 3, 2, "#876342");
  rect(reach - 4, -1.5, 4, 3, ready ? "#ffd484" : "#d9d9be");
  ctx.restore();
  for (let i = 0; showHealth && i < targetMaxHealth; i++) {
    rect(x - 7 + i * 5, y - 26, 4, 2, i < target.health ? "#f1ce85" : "#202b2d");
  }
}

function dropEnemyItem(target, now = gameTime) {
  if (target.health !== 0 || target.dropRolled) return;
  // Resolve once even when the roll produces nothing.
  target.dropRolled = true;
  target.diedAt = now;
  if (Math.random() >= enemyDropChance) return;
  const item = itemCatalog[Math.floor(Math.random() * itemCatalog.length)];
  // Toss away from the player, trying nearby directions before staying in place.
  const direction = Math.atan2(target.y - player.y, target.x - player.x);
  let x = target.x, y = target.y;
  for (const offset of [0, Math.PI / 4, -Math.PI / 4, Math.PI / 2, -Math.PI / 2, Math.PI]) {
    const landing = { x: target.x + Math.cos(direction + offset) * 9,
      y: target.y + Math.sin(direction + offset) * 9 };
    if (!clearFloor(landing.x, landing.y, 3) || !clearPath(target, landing, 3)) continue;
    ({ x, y } = landing);
    break;
  }
  floor.drops.push({ item, x, y, originX: target.x, originY: target.y, startedAt: now });
  if (!dropImages.has(item.icon)) {
    const image = new Image();
    image.src = item.icon;
    dropImages.set(item.icon, image);
  }
}

function dropPose(drop, now) {
  const elapsed = Math.max(0, now - drop.startedAt);
  const progress = Math.min(1, elapsed / dropAnimation.flight);
  const bounce = Math.min(1, Math.max(0, (elapsed - dropAnimation.flight) / dropAnimation.bounce));
  const inFlight = elapsed < dropAnimation.flight;
  const bounceWave = bounce < 1 ? Math.sin(Math.PI * bounce) : 0;
  const height = inFlight ? 10 * (1 - progress) + 40 * progress * (1 - progress)
    : 3 * bounceWave;
  const tilt = (drop.x >= drop.originX ? 1 : -1) *
    (inFlight ? 0.55 * Math.sin(Math.PI * progress) : 0.12 * bounceWave);
  return {
    x: drop.originX + (drop.x - drop.originX) * progress,
    y: drop.originY + (drop.y - drop.originY) * progress,
    height, tilt, airborne: elapsed < dropAnimation.flight + dropAnimation.bounce
  };
}

function drawDrops(now = gameTime, layer = "all") {
  for (const drop of floor.drops) {
    const pose = dropPose(drop, now);
    if (layer !== "air") {
      ctx.save();
      ctx.translate(pose.x, pose.y);
      const scale = 1 - Math.min(20, pose.height) / 40;
      ctx.fillStyle = "#080d1299";
      ctx.beginPath();
      ctx.ellipse(0, 0, 5 * scale, 1.7 * scale, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
    if ((layer === "ground" && pose.airborne) || (layer === "air" && !pose.airborne)) continue;
    const image = dropImages.get(drop.item.icon);
    ctx.save();
    ctx.translate(pose.x, pose.y - 2 - pose.height);
    ctx.rotate(pose.tilt);
    if (image?.complete && image.naturalWidth > 0) {
      const scale = 14 / Math.max(image.naturalWidth, image.naturalHeight);
      const width = image.naturalWidth * scale, height = image.naturalHeight * scale;
      ctx.drawImage(image, -width / 2, -height / 2, width, height);
    } else {
      // Keep the drop visible while its existing item icon loads.
      ctx.fillStyle = "#c8b58e";
      ctx.rotate(Math.PI / 4);
      ctx.fillRect(-2, -2, 4, 4);
    }
    ctx.restore();
  }
}

function checkSwordHit(now) {
  if (swing.hit) return;
  const x = Math.round(player.x);
  const y = Math.round(player.y) + Math.floor(stride / 6) % 2;
  const elapsed = now - swing.started;
  // Sweep between frames so a short contact still registers at low frame rates.
  const from = Math.max(swing.checked, swingDuration * 0.15);
  const to = Math.min(elapsed, swingDuration * 0.77);
  for (let t = from; t <= to; t = Math.min(t + 8, to)) {
    const fraction = elapsed > swing.checked ? (t - swing.checked) / (elapsed - swing.checked) : 1;
    const pose = bladePose(swing.x + fraction * (x - swing.x), swing.y + fraction * (y - swing.y), t);
    const ux = Math.cos(pose.angle), uy = Math.sin(pose.angle);
    for (const target of floor.enemies) {
      if (!target.health) continue;
      const dx = target.x - pose.cx, dy = target.y - 8 - pose.cy;
      const along = Math.max(6, Math.min(pose.reach, dx * ux + dy * uy));
      if (Math.hypot(dx - along * ux, dy - along * uy) > target.radius || !clearPath(player, target, 0)) continue;
      const damage = calculateDamage(player.strength, inventoryView.getEquipped("weapon"), target.armor);
      if (damage > 0) abilities.breakIce(target);
      target.health = Math.max(0, target.health - damage);
      if (target.health === 0) dropEnemyItem(target, now);
      target.flashUntil = now + 120;
      swing.hit = true;
      return;
    }
    if (t === to) break;
  }
  swing.checked = elapsed;
  swing.x = x;
  swing.y = y;
}

function drawPlayer(now) {
  const spin = abilities.circularPose();
  abilities.drawCircular(ctx, "back");
  ctx.save();
  const tone = abilities.ironTone();
  if (tone > 0) ctx.filter = `grayscale(${tone * .98}) brightness(${1 + tone * .16}) contrast(${1 + tone * .08})`;
  drawPlayerFigure(now, spin);
  ctx.restore();
  abilities.drawCircular(ctx, "front");
}

function drawPlayerFigure(now, spin) {
  if (playerMoved || swing || spin || player.finished || player.race !== "human") {
    idleStarted = null;
    return drawPlayerPose(now, spin);
  }

  idleStarted ??= now;
  const breath = (1 - Math.cos((now - idleStarted) * 2 * Math.PI / 3000)) / 2;
  // Keep the feet planted and the sword in the hand by drawing both in the same transform.
  ctx.save();
  ctx.translate(0, player.y);
  ctx.scale(1, 1 + 0.045 * breath);
  ctx.translate(0, -player.y);
  drawPlayerPose(now);
  ctx.restore();
}

function drawPlayerPose(now, spin = null) {
  const x = Math.round(player.x), y = Math.round(player.y);
  const flashing = now < player.flashUntil && Math.floor((player.flashUntil - now) / 60) % 2 === 1;
  const weapon = spin ? null : inventoryView.getEquipped("weapon");
  const direction = spin ? Math.round(Math.atan2(Math.sin(spin.angle), Math.cos(spin.angle)) / (Math.PI / 4)) * Math.PI / 4
    : swing?.direction ?? lastDirection;
  const currentBlade = spin ? { phase: Math.min(.82, spin.phase), sweep: spin.sweep,
    angle: spin.angle, cx: x, cy: y - 8, reach: 17 }
    : swing && bladePose(x, y + Math.floor(stride / 6) % 2, now - swing.started);
  if (gameplayArt.character(ctx, player.x, player.y, player.race, player.characterClass,
      direction, playerMoved, stride, flashing, currentBlade, weapon)) return;
  if (player.race === "human" && player.characterClass === "guardian") {
    const blade = swing && bladePose(x, y + Math.floor(stride / 6) % 2, now - swing.started);
    if (gameplayArt.guardian(ctx, player.x, player.y, swing?.direction ?? lastDirection,
        playerMoved, stride, flashing, blade, weapon)) return;
  }
  if (player.race === "human" && player.characterClass === "adventurer") {
    const cartoonBlade = swing && bladePose(x, y + Math.floor(stride / 6) % 2, now - swing.started);
    if (gameplayArt.adventurer(ctx, player.x, player.y, swing?.direction ?? lastDirection,
        playerMoved, stride, flashing, cartoonBlade, weapon)) return;
    if (swing) {
      const blade = bladePose(x, y + Math.floor(stride / 6) % 2, now - swing.started);
      const sign = Math.abs(swing.direction) > Math.PI / 2 ? -1 : 1;
      if (gameplayArt.slash(ctx, player.x, player.y, sign, playerMoved, flashing, blade,
          swing.direction)) return;
    }
    const heading = Math.abs(lastDirection);
    if (!swing && heading > 0 && heading < Math.PI) {
      const diagonalFacing = heading === Math.PI / 2 ? 0 : facing;
      if (gameplayArt.directional(ctx, lastDirection < 0, playerMoved ? stride : 0,
          player.x, player.y, flashing, diagonalFacing)) return;
    }
    if (!swing && playerMoved && stride > 0 &&
        gameplayArt.run(ctx, stride, player.x, player.y, facing, flashing)) return;
    const pose = swing ? 3 : 0;
    if (gameplayArt.actor(ctx, 0, pose, player.x, player.y, facing, flashing)) {
      if (swing) drawSwing(x, y + Math.floor(stride / 6) % 2, now - swing.started);
      else {
        // The running sword is in the near hand. Register its idle grip to that
        // fist (188,260) using the same foot anchor and scale as the idle sprite.
        const idle = gameplayActorFrames[0][0];
        const scale = 21 / gameplayActorHeights[0];
        const handX = player.x + facing * (188 - idle.x - idle.anchorX) * scale;
        const handY = player.y + (260 - idle.y - idle.h) * scale;
        // The near elbow is at (169,197). Turn the forearm a quarter turn.
        const angle = Math.atan2(169 - 188, facing * (260 - 197));
        const gripOffset = 2 + 8 * .145;
        const originX = handX - gripOffset * Math.cos(angle);
        const originY = handY - gripOffset * Math.sin(angle);
        if (weapon) gameplayArt.weapon(ctx, originX, originY, angle, 9, false, true);
      }
      return;
    }
  }
  rect(x - 8, y - 2, 16, 4, "#202c2dbb");
  const bob = Math.floor(stride / 6) % 2;
  ctx.save();
  ctx.imageSmoothingEnabled = false;
  ctx.translate(x, y);
  ctx.scale(facing, 1);
  ctx.drawImage(flashing ? hurtSprite : adventurer, -7, -17 + bob * 0.5, 14, 17);
  if (!swing) {
    const handY = -6 + bob * 0.5;
    gameplayArt.equippedWeapon(ctx, weapon, 5, handY, -Math.PI / 4);
  }
  ctx.restore();
  if (swing) {
    drawSwing(x, y + bob, now - swing.started);
  }
}

function clearPlayerOrder() {
  playerOrder = null;
  pendingSwingDirection = null;
}

function worldPoint(event) {
  const bounds = canvas.getBoundingClientRect();
  if (!bounds.width || !bounds.height || event.clientX < bounds.left || event.clientX > bounds.right ||
      event.clientY < bounds.top || event.clientY > bounds.bottom) return null;
  return { x: camera.left + (event.clientX - bounds.left) / bounds.width * view.width,
    y: camera.top + (event.clientY - bounds.top) / bounds.height * view.height };
}

function tellPlayer(message) {
  gameFeedback.textContent = message;
  gameFeedback.hidden = false;
  feedbackUntil = gameTime + 2200;
}

function playerPathClear(a, b) {
  if (!clearPath(a, b, radius)) return false;
  const dx = b.x - a.x, dy = b.y - a.y, lengthSquared = dx * dx + dy * dy;
  return floor.enemies.every(enemy => {
    if (!enemy.health) return true;
    const t = lengthSquared ? Math.max(0, Math.min(1,
      ((enemy.x - a.x) * dx + (enemy.y - a.y) * dy) / lengthSquared)) : 0;
    return Math.hypot(a.x + dx * t - enemy.x, a.y + dy * t - enemy.y) >= radius + enemy.radius;
  });
}

// A route uses tile centers around walls, then follows the exact clicked point.
// Enemies block routes as well as movement; smoothing never cuts through either.
function findPlayerPath(goal, reach) {
  const distance = Math.hypot(goal.x - player.x, goal.y - player.y);
  const travel = Math.max(0, distance - Math.max(0, reach - 0.5));
  const destination = distance ? { x: player.x + (goal.x - player.x) * travel / distance,
    y: player.y + (goal.y - player.y) * travel / distance } : { x: player.x, y: player.y };
  if (playerPathClear(player, destination) && (!reach || clearPath(destination, goal, 0))) return [destination];
  const origin = tileAt(player.x, player.y), goalTile = tileAt(goal.x, goal.y);
  const parents = new Int16Array(floor.tiles.length).fill(-1), queue = [origin];
  parents[origin] = origin;
  for (let index = 0; index < queue.length; index++) {
    const id = queue[index], point = tileCenter(id);
    const arrived = reach ? Math.hypot(point.x - goal.x, point.y - goal.y) <= reach && clearPath(point, goal, 0)
      : id === goalTile && playerPathClear(point, goal);
    if (arrived && (id !== origin || playerPathClear(player, point))) {
      const route = [];
      for (let cursor = id; cursor !== origin; cursor = parents[cursor]) route.push(tileCenter(cursor));
      route.reverse();
      if (!route.length && Math.hypot(player.x - point.x, player.y - point.y) > 0.35) route.push(point);
      if (!reach) route.push({ x: goal.x, y: goal.y });
      return route;
    }
    const col = id % columns, row = Math.floor(id / columns);
    for (const next of [row > 0 ? id - columns : -1, col + 1 < columns ? id + 1 : -1,
      row + 1 < rows ? id + columns : -1, col > 0 ? id - 1 : -1]) {
      if (next < 0 || parents[next] !== -1 || !floor.tiles[next]) continue;
      const neighbor = tileCenter(next);
      if (!canStand(neighbor.x, neighbor.y)) continue;
      if (!playerPathClear(id === origin ? player : point, neighbor)) continue;
      parents[next] = id;
      queue.push(next);
    }
  }
  return null;
}

function updatePlayerOrder(now, dt) {
  if (!playerOrder || inventory.open || itemCatalogDialog.open || player.finished || abilities.isAiming() || abilities.isPicking()) return;
  const order = playerOrder;
  if ((order.type === "attack" && (!order.target.health || !floor.enemies.includes(order.target))) ||
      (order.type === "pickup" && !floor.drops.includes(order.target))) { clearPlayerOrder(); return; }
  const goal = order.target;
  const reach = order.type === "attack" ? attackDistance : order.type === "pickup" ? pickupDistance : 0.35;
  if (Math.hypot(goal.x - player.x, goal.y - player.y) <= reach && clearPath(player, goal, 0)) {
    if (order.type === "attack") {
      lastDirection = Math.atan2(goal.y - player.y, goal.x - player.x);
      facing = Math.cos(lastDirection) < 0 ? -1 : 1;
      if (!swing && now >= doubleUntil) pendingSwingDirection = lastDirection;
    } else if (order.type === "pickup") {
      if (dropPose(goal, now).airborne) return;
      if (inventoryView.addItem(goal.item)) {
        floor.drops.splice(floor.drops.indexOf(goal), 1);
        tellPlayer(`${goal.item.name} recolhido.`);
      } else tellPlayer("Mochila cheia.");
      clearPlayerOrder();
    } else clearPlayerOrder();
    return;
  }
  const changed = !order.planned || Math.hypot(goal.x - order.planned.x, goal.y - order.planned.y) > 4;
  const blocked = order.route?.length && !playerPathClear(player, order.route[0]);
  if (!order.route?.length || ((changed || blocked) && now - order.plannedAt >= 180)) {
    order.route = findPlayerPath(goal, order.type === "move" ? 0 : reach);
    order.planned = { x: goal.x, y: goal.y };
    order.plannedAt = now;
    if (!order.route) { tellPlayer("Caminho bloqueado."); clearPlayerOrder(); return; }
  }
  while (order.route.length && Math.hypot(order.route[0].x - player.x, order.route[0].y - player.y) <= 0.35) order.route.shift();
  if (!order.route.length) return;
  for (let index = order.route.length - 1; index > 0; index--) {
    if (playerPathClear(player, order.route[index])) { order.route.splice(0, index); break; }
  }
  const next = order.route[0], dx = next.x - player.x, dy = next.y - player.y;
  lastDirection = Math.atan2(dy, dx);
  if (dx) facing = dx < 0 ? -1 : 1;
  // A fresh obstruction waits for the bounded replan instead of sliding into it.
  if (playerPathClear(player, next)) move(player, dx, dy, Math.min(dt, Math.hypot(dx, dy) / speed));
}

function drawPlayerOrder() {
  if (!playerOrder) return;
  const target = playerOrder.target;
  ctx.save();
  ctx.strokeStyle = playerOrder.type === "attack" ? "#dd8060bb" : "#ebc988bb";
  ctx.lineWidth = 0.6;
  ctx.beginPath();
  ctx.ellipse(target.x, target.y, playerOrder.type === "attack" ? 9 : 5, 2.5, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}

function enemyAt(point) {
  return [...floor.enemies].sort((a, b) => b.y - a.y).find(target => {
    const height = enemyArtData[target.type]?.height ?? 25;
    return target.health > 0 && Math.abs(point.x - target.x) <= Math.max(10, height * .55) &&
      point.y >= target.y - height && point.y <= target.y + 3;
  });
}

canvas.addEventListener("pointermove", event => {
  if (player && !game.hidden) mousePoint = worldPoint(event);
});
canvas.addEventListener("pointerdown", event => {
  if (event.button !== 2 || game.hidden || player.finished || inventory.open || itemCatalogDialog.open) return;
  event.preventDefault(); abilities.cancel(); clearPlayerOrder(); clearSwings();
});
canvas.addEventListener("click", event => {
  if (ignoreWorldClick) { ignoreWorldClick = false; return; }
  if (event.button !== 0 || game.hidden || player.finished || inventory.open || itemCatalogDialog.open) return;
  const point = worldPoint(event);
  if (!point) return;
  mousePoint = point;
  // A native double/triple click continues the successful confirmation gesture;
  // it must not become an auto-attack order after the aim has already closed.
  if (doubleConfirmationClick && event.detail > 1 &&
      Math.hypot(event.clientX - doubleConfirmationClick.x, event.clientY - doubleConfirmationClick.y) <= 6) return;
  doubleConfirmationClick = null;
  if (abilities.isAiming()) {
    if (abilities.confirm(point) && swing?.ability) {
      doubleConfirmationClick = { x: event.clientX, y: event.clientY };
    }
    return;
  }
  abilities.cancel();
  clearPlayerOrder();
  const enemy = enemyAt(point);
  const drop = enemy ? null : [...floor.drops].reverse().find(target => {
    const pose = dropPose(target, gameTime);
    return Math.abs(point.x - pose.x) <= 8 && Math.abs(point.y - (pose.y - 2 - pose.height)) <= 8;
  });
  if (enemy) playerOrder = { type: "attack", target: enemy };
  else if (drop) playerOrder = { type: "pickup", target: drop };
  else if (floor.tiles[tileAt(point.x, point.y)]) {
    const goal = clearFloor(point.x, point.y, radius) ? point : tileCenter(tileAt(point.x, point.y));
    playerOrder = { type: "move", target: goal };
  }
  canvas.focus();
});

function drawInventoryFigure() {
  const ink = inventoryFigureCanvas.getContext("2d");
  ink.resetTransform();
  ink.clearRect(0, 0, 160, 144);
  const scale = 118 / 21;
  ink.scale(scale, scale);
  const painted = gameplayArt.character(ink, 80 / scale, 132 / scale,
    player.race, player.characterClass, 0, false, 0, false, null,
    inventoryView.getEquipped("weapon"));
  inventoryFigure.toggleAttribute("data-rendered", painted);
  inventoryFigureCanvas.hidden = !painted;
}

function frame(timestamp) {
  if (game.hidden) return;
  const dt = previous === null ? 0 : (timestamp - previous) / 1000;
  previous = timestamp;
  gameTime += dt * 1000;
  const now = gameTime;
  if (!player.finished) {
    const { x, y } = player;
    updatePlayerOrder(now, dt);
    playerMoved = player.x !== x || player.y !== y;
    stride = playerMoved ? stride + Math.hypot(player.x - x, player.y - y) : 0;
    const { stairs } = floor;
    if (player.x >= stairs.left && player.x <= stairs.right &&
        player.y >= stairs.top && player.y <= stairs.bottom) enterFloor(depth + 1);
  }
  if (swing) {
    if (!swing.ability) checkSwordHit(now);
    if (swing.ability && now - swing.started >= 170 && now < doubleUntil) { swing.started = now; swing.hit = true; }
    if (now - swing.started >= swingDuration) swing = null;
  }
  abilities.tick(Math.min(dt, 0.05));
  for (const enemy of floor.enemies) updateEnemy(enemy, now, Math.min(dt, 0.05));
  regenerateResources(dt * 1000);
  if (!swing && pendingSwingDirection !== null && now >= doubleUntil) {
    swing = { direction: pendingSwingDirection, started: now, checked: 0, hit: false,
              x: Math.round(player.x), y: Math.round(player.y) + Math.floor(stride / 6) % 2 };
    pendingSwingDirection = null;
  }
  showHealth();
  if (now >= feedbackUntil) gameFeedback.hidden = true;
  updateCamera();
  const { left, top } = camera;
  ctx.setTransform(pixelsPerUnit, 0, 0, pixelsPerUnit, -left * pixelsPerUnit, -top * pixelsPerUnit);
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  drawRoom(now, left, top);
  drawPlayerOrder();
  drawDrops(now, "ground");
  const actors = [player, ...floor.enemies].sort((a, b) => a.y - b.y);
  for (const actor of actors) {
    if (actor === player) drawPlayer(now);
    else drawTarget(actor, now);
  }
  drawDrops(now, "air");
  abilities.draw(ctx, mousePoint || { x: player.x + Math.cos(lastDirection) * 40,
    y: player.y + Math.sin(lastDirection) * 40 });
  if (inventory.open) drawInventoryFigure();
  if (!player.finished) requestAnimationFrame(frame);
}

function clearSwings() {
  swing = null;
  pendingSwingDirection = null;
  doubleConfirmationClick = null;
}

function showHealth() {
  const value = `${formatResource(player.health)}/${formatResource(player.maxHealth)}`;
  inventoryHealth.textContent = value;
  for (const [bar, fill, current, maximum] of [[healthDisplay, healthFill, player.health, player.maxHealth],
    [energyDisplay, energyFill, player.energy, player.maxEnergy]]) {
    const amount = Math.max(0, Math.min(maximum, current));
    bar.setAttribute("aria-valuemax", maximum);
    bar.setAttribute("aria-valuenow", amount);
    fill.style.transform = `scaleX(${maximum > 0 ? amount / maximum : 0})`;
  }
}

function updateCamera() {
  camera.left = Math.max(0, Math.min(world.width - view.width, player.x - view.width / 2));
  camera.top = Math.max(0, Math.min(world.height - view.height, player.y - view.height / 2));
}

function showCharacterSheet() {
  for (const field of inventory.querySelectorAll("[data-stat]")) {
    const value = player[field.dataset.stat];
    field.textContent = field.dataset.stat === "energy" ? `${formatResource(player.energy)}/${formatResource(player.maxEnergy)}`
      : typeof value === "number" ? formatResource(value) : value;
  }
  const spells = document.getElementById("inventory-spells");
  spells.replaceChildren(...player.spells.map(name => {
    const entry = document.createElement("li");
    entry.textContent = name;
    return entry;
  }));
  document.getElementById("no-spells").hidden = player.spells.length > 0;
  drawInventoryFigure();
}

function finishRun() {
  player.finished = true;
  clearPlayerOrder();
  clearSwings();
  inventoryButton.disabled = true;
  abilities.clearFloor();
  abilities.cancel();
  if (inventory.open) inventory.close();
  if (itemCatalogDialog.open) itemCatalogDialog.close();
  end.hidden = false;
  reset.focus();
}

inventory.addEventListener("close", () => {
  inventoryButton.setAttribute("aria-expanded", "false");
  if (!inventory.open && !game.hidden && !player.finished) canvas.focus();
});

inventoryButton.addEventListener("click", () => {
  if (game.hidden || player.finished || itemCatalogDialog.open) return;
  clearPlayerOrder();
  clearSwings();
  abilities.cancel();
  if (inventory.open) inventory.close();
  else {
    showCharacterSheet();
    inventory.show();
    inventoryButton.setAttribute("aria-expanded", "true");
  }
});

document.addEventListener("pointerdown", event => {
  ignoreWorldClick = false;
  if (inventory.open && event.isPrimary && event.button === 0 && !inventory.contains(event.target) &&
      !inventoryButton.contains(event.target)) {
    ignoreWorldClick = event.target === canvas;
    inventory.close();
  }
});

const sellDropzone = document.getElementById("sell-dropzone");
sellDropzone.addEventListener("dragover", event => event.preventDefault());
sellDropzone.addEventListener("drop", event => event.preventDefault());

window.addEventListener("keydown", event => {
  if (game.hidden || player.finished || event.ctrlKey || event.metaKey || event.altKey) return;
  const skillKey = /^(?:Digit|Numpad)([1-5])$/.exec(event.code);
  if (skillKey) {
    if (inventory.open || itemCatalogDialog.open) return;
    event.preventDefault(); if (!event.repeat) abilities.activate(Number(skillKey[1]) - 1);
    return;
  }
  if (event.code === "KeyR" && !inventory.open && !itemCatalogDialog.open) {
    event.preventDefault(); if (!event.repeat) abilities.testingRefill(); return;
  }
  if (event.code === "Escape" && (abilities.isAiming() || abilities.isPicking())) {
    event.preventDefault(); abilities.cancel(); return;
  }
  if (itemCatalogDialog.open && event.target?.closest?.("#item-catalog")) {
    if (event.code === "Escape") {
      event.preventDefault();
      itemCatalogDialog.close();
    }
    return;
  }
  if (event.code === "Escape" && inventory.open) {
    event.preventDefault();
    inventory.close();
    return;
  }
  if (event.code === "Escape" && itemCatalogDialog.open) {
    event.preventDefault();
    itemCatalogDialog.close();
    return;
  }
  if (event.code === "Escape") {
    event.preventDefault();
    clearPlayerOrder();
    clearSwings();
    return;
  }
  if (event.target === canvas && ["Space", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(event.code)) event.preventDefault();
});
window.addEventListener("blur", () => {
  abilities.cancel(); clearPlayerOrder(); clearSwings(); playerMoved = false; stride = 0; previous = null;
});
function enterFloor(number) {
  abilities.clearFloor(); mousePoint = null; doubleUntil = 0;
  depth = number;
  floor = generateFloor(runSeed, number);
  Object.assign(player, floor.spawn);
  player.flashUntil = 0;
  document.getElementById("floor-number").textContent = String(depth).padStart(2, "0");
  facing = 1;
  lastDirection = 0;
  idleStarted = null;
  clearPlayerOrder();
  clearSwings();
  stride = 0;
  previous = null;
  updateCamera();
}

function startRun() {
  abilities.reset();
  if (itemCatalogDialog.open) itemCatalogDialog.close();
  characterCreate.hidden = true;
  game.hidden = false;
  runSeed = crypto.getRandomValues(new Uint32Array(1))[0];
  const { race, characterClass } = characterSelection();
  player = {
    race: race.value, characterClass: characterClass.value,
    ...initialCharacterStats(race.value, characterClass.value),
    finished: false, level: 1, xp: 0, manaPearls: 0, spells: []
  };
  inventoryView.reset();
  gameTime = 0;
  regenerationElapsedMs = 0;
  abilities.reset();
  clearPlayerOrder();
  inventoryButton.disabled = false;
  inventoryButton.setAttribute("aria-expanded", "false");
  gameFeedback.hidden = true;
  ignoreWorldClick = false;
  enterFloor(1);
  showHealth();
  end.hidden = true;
  canvas.focus();
  requestAnimationFrame(frame);
}

function showMenu() {
  abilities.cancel();
  clearPlayerOrder();
  clearSwings();
  if (inventory.open) inventory.close();
  if (itemCatalogDialog.open) itemCatalogDialog.close();
  game.hidden = true;
  characterCreate.hidden = true;
  menu.hidden = false;
  play.focus();
}

play.addEventListener("click", () => {
  randomizeCharacter();
  menu.hidden = true;
  characterCreate.hidden = false;
  document.getElementById("character-title").focus();
});
characterCreate.addEventListener("change", updateCharacter);
for (const type of ["race", "class"]) {
  document.getElementById(`${type}-previous`).addEventListener("click", () => changeCharacterOption(type, -1));
  document.getElementById(`${type}-next`).addEventListener("click", () => changeCharacterOption(type, 1));
  document.getElementById(`${type}-random`).addEventListener("click", () => randomizeCharacter(type));
  for (const suffix of ["neighbor-previous", "current", "neighbor-next"]) {
    const button = document.getElementById(`${type}-${suffix}`);
    button.addEventListener("click", () => {
      setCharacterOption(type, Number(button.dataset.optionIndex));
      updateCharacter();
    });
  }
}
document.getElementById("back-character").addEventListener("click", showMenu);
document.getElementById("start").addEventListener("click", startRun);
reset.addEventListener("click", startRun);
document.getElementById("back-menu").addEventListener("click", showMenu);
document.getElementById("help").addEventListener("click", () => instructions.showModal());
updateCharacter();

const itemCatalogDialog = document.getElementById("item-catalog");
const catalogFeedback = document.getElementById("catalog-feedback");
document.getElementById("clear-test-bag").addEventListener("click", () => {
  inventoryView.clearBag();
  catalogFeedback.textContent = "Mochila vazia. Os itens equipados continuam disponíveis.";
});
document.getElementById("open-item-catalog").addEventListener("click", () => {
  if (player.finished) return;
  clearPlayerOrder();
  clearSwings();
  abilities.cancel();
  if (inventory.open) inventory.close();
  catalogFeedback.textContent = "";
  itemCatalogDialog.show();
});
itemCatalogDialog.addEventListener("close", () => canvas.focus());
const categoryNames = {weapon:"Armas",head:"Elmos",armor:"Armaduras",boots:"Botas",necklace:"Colares",ring:"Anéis"};
for (const [category,label] of Object.entries(categoryNames)) {
  const section = document.createElement("section");
  const title = document.createElement("h3");
  title.textContent = label;
  const grid = document.createElement("div");
  grid.className = "catalog-grid";
  for (const item of itemCatalog.filter(item => item.category === category)) {
    const button = document.createElement("button");
    button.type = "button";
    const icon = document.createElement("img");
    icon.src = item.icon;
    icon.alt = "";
    const name = document.createElement("span");
    name.textContent = item.name;
    button.append(icon, name);
    button.addEventListener("click", () => {
      catalogFeedback.textContent = inventoryView.addItem(item)
        ? `${item.name} adicionado à mochila.` : "Mochila cheia. Libere um espaço para adicionar o item.";
    });
    grid.append(button);
  }
  section.append(title, grid);
  document.getElementById("catalog-groups").append(section);
}
