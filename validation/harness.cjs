// Exercises the current game with local Canvas and a minimal DOM.
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const assert = require("node:assert/strict");
const modules = { paths: [path.dirname(process.execPath)] };
const raster = require(require.resolve("@napi-rs/canvas", modules));
const sharp = require(require.resolve("sharp", modules));
const root = path.resolve(__dirname, "..");
const calls = [];
const loaded = new Map();

class Element {
  constructor(tag = "div") {
    this.tagName = tag;
    this.children = [];
    this.dataset = {};
    this.attrs = {};
    this.style = { setProperty(key, value) { this[key] = value; } };
    this.events = {};
    const tokens = new Set();
    this.classList = {
      add(...values) { values.forEach(value=>tokens.add(value)); },
      remove(...values) { values.forEach(value=>tokens.delete(value)); },
      contains(value) { return tokens.has(value); }
    };
    this.textContent = "";
    this.hidden = false;
    this.open = false;
    if (tag === "canvas") this.surface = raster.createCanvas(300, 150);
  }
  set width(value) { this.surface.width = value; }
  get width() { return this.surface.width; }
  set height(value) { this.surface.height = value; }
  get height() { return this.surface.height; }
  getContext() {
    if (!this.context) {
      const ctx = this.surface.getContext("2d");
      const draw = ctx.drawImage.bind(ctx);
      const pattern = ctx.createPattern.bind(ctx);
      ctx.createPattern = (source, repeat) => pattern(source.surface || source, repeat);
      ctx.drawImage = (source, ...args) => {
        if (source.assetPath) {
          const m = ctx.getTransform();
          calls.push({ src: source.assetPath, args, matrix: [m.a,m.b,m.c,m.d,m.e,m.f] });
        }
        return draw(source.surface || source, ...args);
      };
      this.context = ctx;
    }
    return this.context;
  }
  addEventListener(type, handler) { (this.events[type] ||= []).push(handler); }
  dispatch(type, values = {}) {
    for (const handler of this.events[type] || []) {
      handler({ detail: 0, preventDefault() {}, target: this, ...values });
    }
  }
  setAttribute(key, value) { this.attrs[key] = String(value); }
  getAttribute(key) { return this.attrs[key]; }
  removeAttribute(key) {
    delete this.attrs[key];
    if (key === "title") this.title = "";
    if (key === "style") for (const property of Object.keys(this.style)) {
      if (property !== "setProperty") delete this.style[property];
    }
  }
  toggleAttribute(key, value) { if (value) this.attrs[key] = ""; else delete this.attrs[key]; }
  append(...children) {
    children.forEach(child=>child.parentElement=this);
    this.children.push(...children);
  }
  replaceChildren(...children) {
    this.children.forEach(child=>child.parentElement=null);
    this.children = [];
    this.append(...children);
  }
  focus() {
    if (document.activeElement !== this) document.activeElement?.dispatch("blur");
    document.activeElement = this;
    this.dispatch("focus");
  }
  getBoundingClientRect() {
    return this.bounds || {left:80,right:144,top:80,bottom:144,width:64,height:64};
  }
  show() { this.open = true; }
  showModal() { this.show(); }
  close() { this.open = false; this.dispatch("close"); }
  closest(selector) {
    if (selector === "#item-catalog") {
      return this.id === "item-catalog" ? this : this.parentElement?.closest(selector) ?? null;
    }
    return selector.includes("button") && this.tagName === "button" ? this : null;
  }
  contains(target) { return target === this || this.children.some(child => child.contains(target)); }
  setPointerCapture(id) { this.capture = id; }
  hasPointerCapture(id) { return this.capture === id; }
  releasePointerCapture() { this.capture = null; }
  cloneNode() { const copy = new Element(this.tagName); Object.assign(copy.style, this.style); return copy; }
  remove() {}
  querySelector(selector) {
    if (selector.startsWith("#")) return elements.get(selector.slice(1));
    if (selector.includes('name="race"')) return races.find(radio => radio.checked);
    if (selector.includes('name="class"')) return classes.find(radio => radio.checked);
    throw Error("Unsupported selector " + selector);
  }
  querySelectorAll(selector) {
    if (selector === "[data-equipment]") return equipment;
    if (selector === "[data-stat]") return stats;
    if (selector === '[name="race"]') return races;
    if (selector === '[name="class"]') return classes;
    throw Error("Unsupported selector " + selector);
  }
}

const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
const elements = new Map();
for (const [,tag,attrs,id] of html.matchAll(/<([a-z][a-z0-9]*)\b([^>]*\bid="([^"]+)"[^>]*)>/g)) {
  const element = new Element(tag);
  element.id = id;
  element.hidden = /\bhidden\b/.test(attrs);
  if (tag === "canvas") {
    element.width = Number(attrs.match(/width="(\d+)"/)[1]);
    element.height = Number(attrs.match(/height="(\d+)"/)[1]);
  }
  elements.set(id, element);
}
const equipment = ["head","weapon","armor","necklace","boots","ring"].map(category => {
  const element = new Element("button");
  element.dataset.equipment = category;
  element.textContent = category;
  return element;
});
const stats = [...html.matchAll(/data-stat="([^"]+)"/g)].map(([,name]) => {
  const element = new Element();
  element.dataset.stat = name;
  return element;
});
const races = ["human","goblin","skeleton","draconic"].map(value => ({ value, checked: value === "human", labels: [{ textContent: value }] }));
const classes = ["adventurer","guardian","elementalist","alchemist"].map(value => ({ value, checked: value === "adventurer", labels: [{ textContent: value }] }));
const document = new Element();
document.getElementById = id => elements.get(id);
document.createElement = tag => new Element(tag);
document.body = new Element("body");
document.documentElement = new Element("html");
Object.assign(document.documentElement, { clientWidth:1280, clientHeight:720 });
elements.get("item-tooltip").bounds = { width:240, height:190 };
document.elementFromPoint = () => document.hit;
const window = new Element();
const sandbox = vm.createContext({
  document, window, console, Uint8Array, Uint32Array, Int16Array,
  Path2D: raster.Path2D, DOMMatrix: raster.DOMMatrix,
  getComputedStyle: () => ({ width: "48px", height: "48px" }),
  Image: class {
    set src(src) { this.assetPath = src; this.surface = loaded.get(src); }
    get complete() { return Boolean(this.surface); }
    get naturalWidth() { return this.surface?.width || 0; }
    get naturalHeight() { return this.surface?.height || 0; }
  },
  crypto: { getRandomValues(values) { values[0] = 19061; return values; } },
  requestAnimationFrame() { return 1; }, cancelAnimationFrame() {}
});
const run = code => vm.runInContext(code, sandbox);

async function setup() {
  for (const file of fs.readdirSync(path.join(root,"assets"),{recursive:true})) {
    if (/\.(png|webp)$/.test(file) && !file.startsWith("backups")) {
      loaded.set("assets/"+file.replaceAll("\\","/"), await raster.loadImage(path.join(root,"assets",file)));
    }
  }
  for (const file of ["items.js","inventory.js","gameplay-art.js","game.js"]) {
    run(fs.readFileSync(path.join(root,file),"utf8"));
  }
  elements.get("play").dispatch("click");
  assert.equal(elements.get("character-create").hidden, false);
  elements.get("start").dispatch("click");
  const bag = elements.get("bag-slots").children;
  const weaponSlot = equipment[1];
  const inventory = elements.get("inventory");
  inventory.show();
  function drag(source, target) {
    source.dispatch("pointerdown", { pointerId:1,isPrimary:true,button:0,clientX:0,clientY:0 });
    document.hit = target;
    inventory.dispatch("pointermove", { pointerId:1,clientX:20,clientY:20 });
    inventory.dispatch("pointerup", { pointerId:1,clientX:20,clientY:20 });
  }
  return {run,bag,weaponSlot,inventory,drag,elements,equipment,document,window,calls,races,classes,raster,loaded,stats};
}

function itemName(slot) { return slot.attrs["aria-label"]?.split(": ").slice(1).join(": "); }

module.exports = { setup, itemName };
