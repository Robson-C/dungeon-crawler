"use strict";

const world = { width: 896, height: 512 };
const tileSize = 16;
const columns = world.width / tileSize, rows = world.height / tileSize;
const radius = 5;
const speed = 72;
const playerMaxHealth = 3;
const targetMaxHealth = 3;
const enemyRules = { notice: 46, loseInterest: 96, speed: 49, attackRange: 17, reach: 19,
  windup: 0.55, recovery: 0.75 };
const enemySpawn = { radius: 6, health: targetMaxHealth, flashUntil: 0, state: "idle",
  direction: Math.PI, remaining: 0 };
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
    layout = populateFloor(integer);
  } while (!layout);
  return layout;
}

function populateFloor(integer) {
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
  const enemies = [], total = integer(2, 5);
  while (enemies.length < total && guardSites.length) {
    const p = tileCenter(guardSites.splice(integer(0, guardSites.length - 1), 1)[0]);
    if (Math.hypot(p.x - landing.x, p.y - landing.y) < 36 ||
        enemies.some(e => Math.hypot(p.x - e.x, p.y - e.y) < 35)) continue;
    enemies.push({ ...enemySpawn, ...p });
  }
  if (enemies.length < total) return null;
  return { tiles, spawn, stairs, enemies, pathOrigin: -1, paths: null };
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
const game = document.getElementById("game");
const instructions = document.getElementById("instructions");
const exitScreen = document.getElementById("exit-screen");
const start = document.getElementById("start");
const canvas = document.getElementById("room");
const ctx = canvas.getContext("2d");
const zoom = 1.5;
const view = { width: 448 / zoom, height: 256 / zoom };
const pixelsPerUnit = canvas.width / view.width;
const end = document.getElementById("end");
const healthDisplay = document.getElementById("health");
const inventoryHealth = document.getElementById("inventory-health");
const inventory = document.getElementById("inventory");
const bagSlots = document.getElementById("bag-slots");
for (let i = 0; i < 24; i++) bagSlots.append(document.createElement("span"));
const reset = document.getElementById("reset");
const keys = new Set();
const directions = new Set(["KeyW", "KeyA", "KeyS", "KeyD", "ArrowUp", "ArrowLeft", "ArrowDown", "ArrowRight"]);
let player;
let previous = null;
let gameTime = 0;
let facing = 1;
let stride = 0;
let lastDirection = 0;
let swing = null;
let pendingSwingDirection = null;
const swingDuration = 300;

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
function updateCharacter() {
  const head = menu.querySelector('[name="head"]:checked');
  const body = menu.querySelector('[name="body"]:checked');
  const rows = (head.value === "human" ? humanHead : goblinHead)
    .concat(body.value === "cloak" ? cloakedBody : armoredBody);
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
  const portrait = preview.getContext("2d");
  portrait.clearRect(0, 0, preview.width, preview.height);
  portrait.drawImage(adventurer, 0, 0);
  const appearance = `Cabeça ${head.labels[0].textContent.trim()}, corpo com ${body.labels[0].textContent.trim()}`;
  adventurer.setAttribute("aria-label", appearance);
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

// Sample integer pixels so the blade and its trail match the character sprite.
function drawSwing(x, y, elapsed) {
  const { phase, sweep, angle, reach, cx, cy } = bladePose(x, y, elapsed);

  function mark(distance, heading, size, color) {
    rect(Math.round(cx + distance * Math.cos(heading)),
         Math.round(cy + distance * Math.sin(heading)), size, size, color);
  }

  const trail = Math.min(sweep * 2.16, 0.72) * Math.min(1, (1 - phase) / 0.23);
  for (let offset = trail; offset > 0; offset -= 0.055) {
    mark(reach, angle - offset, 1, "#ffe2a9");
    mark(reach - 2, angle - offset, 1, "#aab7a285");
  }
  for (let i = 3; i <= reach; i++) {
    mark(i, angle, i < reach - 1 ? 2 : 1, i < 6 ? "#856345" : "#cbd4c4");
  }
  mark(5, angle, 3, "#cf9f61");
  mark(reach, angle, 1, "#fff2d7");
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

function updateEnemy(target, now, dt) {
  if (!target.health || player.finished) return;
  const dx = player.x - target.x, dy = player.y - target.y;
  const distance = Math.hypot(dx, dy);
  if (target.state === "windup" || target.state === "recovery") {
    target.remaining -= dt;
    if (target.remaining > 0) return;
    if (target.state === "windup") {
      const ux = Math.cos(target.direction), uy = Math.sin(target.direction);
      const along = Math.max(0, Math.min(enemyRules.reach, dx * ux + dy * uy));
      if (Math.hypot(dx - along * ux, dy - along * uy) <= radius && clearPath(target, player, 0)) {
        player.health--;
        player.flashUntil = now + 240;
        showHealth();
        if (player.health === 0) finishRun();
      }
      target.state = "recovery";
      target.remaining = enemyRules.recovery;
      return;
    }
    target.state = "chase";
  }
  const limit = target.state === "idle" ? enemyRules.notice : enemyRules.loseInterest;
  if (distance > limit) { target.state = "idle"; return; }
  target.direction = Math.atan2(dy, dx);
  if (target.state === "idle" && !clearPath(target, player, 0)) return;
  if (distance <= enemyRules.attackRange && clearPath(target, player, 0)) {
    target.state = "windup";
    target.remaining = enemyRules.windup;
    return;
  }
  target.state = "chase";
  const goal = pursuitPoint(target);
  const vx = goal.x - target.x, vy = goal.y - target.y;
  const length = Math.hypot(vx, vy);
  if (!length) return;
  const step = Math.min(enemyRules.speed * dt, length) / length;
  const x = target.x + vx * step, y = target.y + vy * step;
  if (clearFloor(x, y, target.radius) && Math.hypot(x - player.x, y - player.y) >= target.radius + radius &&
      floor.enemies.every(other => other === target || !other.health || Math.hypot(x - other.x, y - other.y) >= target.radius + other.radius)) {
    target.x = x; target.y = y;
  }
}

function drawTarget(target, now) {
  if (target.health === 0) return;
  const x = Math.round(target.x), y = Math.round(target.y);
  const hit = now < target.flashUntil;
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
  for (let i = 0; i < targetMaxHealth; i++) {
    rect(x - 7 + i * 5, y - 26, 4, 2, i < target.health ? "#f1ce85" : "#202b2d");
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
      target.health--;
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
  const x = Math.round(player.x), y = Math.round(player.y);
  rect(x - 8, y - 2, 16, 4, "#202c2dbb");
  const bob = Math.floor(stride / 6) % 2;
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(facing, 1);
  const flashing = now < player.flashUntil && Math.floor((player.flashUntil - now) / 60) % 2 === 1;
  ctx.drawImage(flashing ? hurtSprite : adventurer, -7, -17 + bob * 0.5, 14, 17);
  if (!swing) {
    const handY = -6 + bob * 0.5;
    rect(4.5, handY - 9, 1.5, 7.5, "#cbd0bd");
    rect(4, handY - 1.5, 3, 1, "#c89457");
    rect(5, handY - 0.5, 1, 1.5, "#856345");
  }
  ctx.restore();
  if (swing) {
    drawSwing(x, y + bob, now - swing.started);
  }
}

function held(first, second) { return Number(keys.has(first) || keys.has(second)); }

function frame(timestamp) {
  if (game.hidden) return;
  const dt = previous === null ? 0 : (timestamp - previous) / 1000;
  previous = timestamp;
  gameTime += dt * 1000;
  const now = gameTime;
  if (!player.finished) {
    const dx = held("KeyD", "ArrowRight") - held("KeyA", "ArrowLeft");
    const dy = held("KeyS", "ArrowDown") - held("KeyW", "ArrowUp");
    if (dx || dy) lastDirection = Math.atan2(dy, dx);
    if (dx) facing = dx;
    const { x, y } = player;
    move(player, dx, dy, dt);
    stride = dx || dy ? stride + Math.hypot(player.x - x, player.y - y) : 0;
    const { stairs } = floor;
    if (player.x >= stairs.left && player.x <= stairs.right &&
        player.y >= stairs.top && player.y <= stairs.bottom) enterFloor(depth + 1);
  }
  if (swing) {
    checkSwordHit(now);
    if (now - swing.started >= swingDuration) swing = null;
  }
  for (const enemy of floor.enemies) updateEnemy(enemy, now, Math.min(dt, 0.05));
  if (!swing && pendingSwingDirection !== null) {
    swing = { direction: pendingSwingDirection, started: now, checked: 0, hit: false,
              x: Math.round(player.x), y: Math.round(player.y) + Math.floor(stride / 6) % 2 };
    pendingSwingDirection = null;
  }
  const left = Math.max(0, Math.min(world.width - view.width, Math.round(player.x - view.width / 2)));
  const top = Math.max(0, Math.min(world.height - view.height, Math.round(player.y - view.height / 2)));
  ctx.setTransform(pixelsPerUnit, 0, 0, pixelsPerUnit, -left * pixelsPerUnit, -top * pixelsPerUnit);
  ctx.imageSmoothingEnabled = false;
  drawRoom(now, left, top);
  const actors = [player, ...floor.enemies].sort((a, b) => a.y - b.y);
  for (const actor of actors) {
    if (actor === player) drawPlayer(now);
    else drawTarget(actor, now);
  }
  if (!player.finished) requestAnimationFrame(frame);
}

function clearSwings() {
  swing = null;
  pendingSwingDirection = null;
}

function showHealth() {
  const value = `${player.health}/${playerMaxHealth}`;
  healthDisplay.textContent = `Vida ${value}`;
  inventoryHealth.textContent = value;
}

function showCharacterSheet() {
  for (const field of inventory.querySelectorAll("[data-stat]")) {
    field.textContent = player[field.dataset.stat];
  }
  const spells = document.getElementById("inventory-spells");
  spells.replaceChildren(...player.spells.map(name => {
    const entry = document.createElement("li");
    entry.textContent = name;
    return entry;
  }));
  document.getElementById("no-spells").hidden = player.spells.length > 0;
}

function finishRun() {
  player.finished = true;
  keys.clear();
  clearSwings();
  if (inventory.open) inventory.close();
  end.hidden = false;
  reset.focus();
}

inventory.addEventListener("close", () => {
  if (!inventory.open && !game.hidden && !player.finished) canvas.focus();
});

const sellDropzone = document.getElementById("sell-dropzone");
sellDropzone.addEventListener("dragover", event => event.preventDefault());
sellDropzone.addEventListener("drop", event => event.preventDefault());

window.addEventListener("keydown", event => {
  if (game.hidden || player.finished || event.ctrlKey || event.metaKey || event.altKey) return;
  if (event.code === "KeyI" || (inventory.open && event.code === "Escape")) {
    event.preventDefault();
    if (event.repeat) return;
    if (inventory.open) {
      inventory.close();
    } else {
      showCharacterSheet();
      inventory.show();
      document.getElementById("inventory-title").focus();
    }
    return;
  }
  if (event.code === "Space") {
    event.preventDefault();
    if (!event.repeat && pendingSwingDirection === null) {
      const dx = held("KeyD", "ArrowRight") - held("KeyA", "ArrowLeft");
      const dy = held("KeyS", "ArrowDown") - held("KeyW", "ArrowUp");
      pendingSwingDirection = dx || dy ? Math.atan2(dy, dx) : lastDirection;
    }
    return;
  }
  if (!directions.has(event.code)) return;
  event.preventDefault();
  keys.add(event.code);
});
window.addEventListener("keyup", event => keys.delete(event.code));
window.addEventListener("blur", () => { keys.clear(); clearSwings(); previous = null; });
function enterFloor(number) {
  depth = number;
  floor = generateFloor(runSeed, number);
  Object.assign(player, floor.spawn);
  player.flashUntil = 0;
  document.getElementById("floor-number").textContent = String(depth).padStart(2, "0");
  facing = 1;
  lastDirection = 0;
  clearSwings();
  stride = 0;
  previous = null;
}

function startRun() {
  menu.hidden = true;
  game.hidden = false;
  runSeed = crypto.getRandomValues(new Uint32Array(1))[0];
  player = {
    health: playerMaxHealth, finished: false, level: 1, xp: 0, manaPearls: 0, spells: [],
    magic: 0, armor: 0, strength: 0, stamina: 0, willpower: 0, intellect: 0,
    fireResistance: 0, iceResistance: 0, poisonResistance: 0, lightningResistance: 0
  };
  gameTime = 0;
  keys.clear();
  enterFloor(1);
  showHealth();
  end.hidden = true;
  canvas.focus();
  requestAnimationFrame(frame);
}

function showMenu() {
  game.hidden = true;
  exitScreen.hidden = true;
  menu.hidden = false;
  start.focus();
}

menu.addEventListener("change", updateCharacter);
start.addEventListener("click", startRun);
reset.addEventListener("click", startRun);
document.getElementById("back-menu").addEventListener("click", showMenu);
document.getElementById("help").addEventListener("click", () => instructions.showModal());
document.getElementById("quit").addEventListener("click", () => {
  menu.hidden = true;
  exitScreen.hidden = false;
  document.getElementById("reopen").focus();
  window.close();
});
document.getElementById("reopen").addEventListener("click", showMenu);
updateCharacter();

function drawDoorway() {
  const cover = document.getElementById("doorway");
  const ink = cover.getContext("2d");
  function block(x, y, w, h, color) {
    ink.fillStyle = color;
    ink.fillRect(x, y, w, h);
  }
  const stone = ["#25312f", "#2a3735", "#303c38", "#283530", "#323b34"];
  block(0, 0, 208, 232, "#212c29");
  for (let row = 0; row < 20; row++) {
    for (let col = -1; col < 10; col++) {
      const x = col * 27 + (row % 2) * 13, y = row * 12;
      const n = grain(col + 1, row);
      block(x, y, 26, 11, stone[n % stone.length]);
      block(x + 2, y, 22, 1, "#38413a");
    }
  }
  // Stepped stone arch, with successive ribs receding towards the dark passage.
  const center = 115, sill = 149;
  for (let rib = 0; rib < 4; rib++) {
    const width = 40 - rib * 7, crown = 57 + rib * 10;
    for (let y = crown; y < sill; y += 3) {
      const height = Math.max(0, 1 - (y - crown + 1) / width);
      const half = Math.max(3, Math.floor(width * Math.sqrt(1 - height * height)));
      block(center - half, y, half * 2, 3, ["#655e4a","#393e36","#252d29","#111a19"][rib]);
      if (rib === 0 && (y - crown) % 9 === 0) {
        block(center - half, y, 7, 1, "#888064");
        block(center + half - 7, y, 7, 1, "#888064");
      }
    }
  }
  for (let i = 0; i < 10; i++) {
    const w = 12 + i * i, y = 113 + i * 3 + Math.floor(i * i / 4);
    block(center - w / 2, y, w, 3 + i, "#202823");
    block(center - w / 2, y, w, 1 + Math.floor(i / 5), "#746b52");
  }
  for (const x of [62, 167]) {
    const glow = ink.createRadialGradient(x, 106, 1, x, 106, 29);
    glow.addColorStop(0, "#eaa64e80");
    glow.addColorStop(1, "#c8934200");
    block(x - 29, 77, 58, 58, glow);
    block(x - 1, 109, 3, 9, "#69503c");
    block(x - 3, 108, 7, 4, "#a87e4e");
    block(x - 2, 103, 5, 6, "#db843f");
    block(x, 100, 2, 8, "#f6d392");
  }
  const shade = ink.createLinearGradient(0, 0, 0, 232);
  shade.addColorStop(0, "#0d1718ae");
  shade.addColorStop(0.42, "#14202008");
  shade.addColorStop(1, "#101919f5");
  block(0, 0, 208, 232, shade);
}
drawDoorway();
