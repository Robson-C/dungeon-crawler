"use strict";

// Weapon art uses a 256 × 160 canvas, with the grip centered at (40, 80)
// and the blade pointing right. Keeping that registration lets new drawings
// share every character pose and the existing attack rules.
const gameItems = {
  shortSword: {
    id: "short-sword",
    category: "weapon",
    name: "Espada curta",
    icon: "assets/short-sword.png",
    weaponSprite: "assets/short-sword.png"
  },
  spear: {
    id: "spear",
    category: "weapon",
    name: "Lança",
    icon: "assets/spear-cartoon.png",
    weaponSprite: "assets/spear-cartoon.png"
  }
};
