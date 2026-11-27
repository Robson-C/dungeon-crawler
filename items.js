"use strict";

// Weapon art uses a 256 × 160 canvas, with the grip centered at (40, 80)
// and the blade pointing right. Keeping that registration lets new drawings
// share every character pose and the existing attack rules.
const gameItems = {
  shortSword: {
    id: "short-sword",
    category: "weapon",
    name: "Espada de guarda reta",
    damage: { min: 1, max: 2 },
    icon: "assets/short-sword.png",
    weaponSprite: "assets/short-sword.png"
  },
  curvedSabre: {
    id: "curved-sabre",
    category: "weapon",
    name: "Sabre de lâmina curva",
    damage: { min: 1, max: 2 },
    icon: "assets/sabre-curved.png",
    weaponSprite: "assets/sabre-curved.png"
  },
  crystalSword: {
    id: "crystal-sword",
    category: "weapon",
    name: "Espada de cristal",
    damage: { min: 1, max: 2 },
    icon: "assets/crystal-sword.png",
    weaponSprite: "assets/crystal-sword.png"
  },
  spear: {
    id: "spear",
    category: "weapon",
    name: "Lança",
    damage: { min: 1, max: 2 },
    icon: "assets/spear-cartoon.png",
    weaponSprite: "assets/spear-cartoon.png"
  },
  "adaga-de-osso": {
    "id": "adaga-de-osso",
    "category": "weapon",
    "name": "Adaga de osso",
    "damage": {
      "min": 1,
      "max": 2
    },
    "icon": "assets/items/adaga-de-osso.png",
    "weaponSprite": "assets/items/adaga-de-osso.png"
  },
  "machado-de-ferro": {
    "id": "machado-de-ferro",
    "category": "weapon",
    "name": "Machado de ferro",
    "damage": {
      "min": 1,
      "max": 2
    },
    "icon": "assets/items/machado-de-ferro.png",
    "weaponSprite": "assets/items/machado-de-ferro.png"
  },
  "machado-draconico": {
    "id": "machado-draconico",
    "category": "weapon",
    "name": "Machado dracônico",
    "damage": {
      "min": 1,
      "max": 2
    },
    "icon": "assets/items/machado-draconico.png",
    "weaponSprite": "assets/items/machado-draconico.png"
  },
  "maca-de-bronze": {
    "id": "maca-de-bronze",
    "category": "weapon",
    "name": "Maça de bronze",
    "damage": {
      "min": 1,
      "max": 2
    },
    "icon": "assets/items/maca-de-bronze.png",
    "weaponSprite": "assets/items/maca-de-bronze.png"
  },
  "martelo-de-pedra": {
    "id": "martelo-de-pedra",
    "category": "weapon",
    "name": "Martelo de pedra",
    "damage": {
      "min": 1,
      "max": 2
    },
    "icon": "assets/items/martelo-de-pedra.png",
    "weaponSprite": "assets/items/martelo-de-pedra.png"
  },
  "espada-serrilhada": {
    "id": "espada-serrilhada",
    "category": "weapon",
    "name": "Espada serrilhada",
    "damage": {
      "min": 1,
      "max": 2
    },
    "icon": "assets/items/espada-serrilhada.png",
    "weaponSprite": "assets/items/espada-serrilhada.png"
  },
  "lamina-de-obsidiana": {
    "id": "lamina-de-obsidiana",
    "category": "weapon",
    "name": "Lâmina de obsidiana",
    "damage": {
      "min": 1,
      "max": 2
    },
    "icon": "assets/items/lamina-de-obsidiana.png",
    "weaponSprite": "assets/items/lamina-de-obsidiana.png"
  },
  "foice-curta": {
    "id": "foice-curta",
    "category": "weapon",
    "name": "Foice curta",
    "damage": {
      "min": 1,
      "max": 2
    },
    "icon": "assets/items/foice-curta.png",
    "weaponSprite": "assets/items/foice-curta.png"
  },
  "tridente-de-cobre": {
    "id": "tridente-de-cobre",
    "category": "weapon",
    "name": "Tridente de cobre",
    "damage": {
      "min": 1,
      "max": 2
    },
    "icon": "assets/items/tridente-de-cobre.png",
    "weaponSprite": "assets/items/tridente-de-cobre.png"
  },
  "lanca-de-osso": {
    "id": "lanca-de-osso",
    "category": "weapon",
    "name": "Lança de osso",
    "damage": {
      "min": 1,
      "max": 2
    },
    "icon": "assets/items/lanca-de-osso.png",
    "weaponSprite": "assets/items/lanca-de-osso.png"
  },
  "cutelo-do-alquimista": {
    "id": "cutelo-do-alquimista",
    "category": "weapon",
    "name": "Cutelo do alquimista",
    "damage": {
      "min": 1,
      "max": 2
    },
    "icon": "assets/items/cutelo-do-alquimista.png",
    "weaponSprite": "assets/items/cutelo-do-alquimista.png"
  }
};

const equipmentItems = [
  {
    "id": "elmo-com-viseira",
    "category": "head",
    "name": "Elmo com viseira",
    "icon": "assets/items/elmo-com-viseira.webp"
  },
  {
    "id": "elmo-de-chifres",
    "category": "head",
    "name": "Elmo de chifres",
    "icon": "assets/items/elmo-de-chifres.webp"
  },
  {
    "id": "capuz-em-runas",
    "category": "head",
    "name": "Capuz em runas",
    "icon": "assets/items/capuz-em-runas.webp"
  },
  {
    "id": "diadema-de-ambar",
    "category": "head",
    "name": "Diadema de âmbar",
    "icon": "assets/items/diadema-de-ambar.webp"
  },
  {
    "id": "mascara-de-ossos",
    "category": "head",
    "name": "Máscara de ossos",
    "icon": "assets/items/mascara-de-ossos.webp"
  },
  {
    "id": "elmo-draconico",
    "category": "head",
    "name": "Elmo dracônico",
    "icon": "assets/items/elmo-draconico.webp"
  },
  {
    "id": "capuz-do-explorador",
    "category": "head",
    "name": "Capuz do explorador",
    "icon": "assets/items/capuz-do-explorador.webp"
  },
  {
    "id": "capuz-elemental",
    "category": "head",
    "name": "Capuz elemental",
    "icon": "assets/items/capuz-elemental.webp"
  },
  {
    "id": "touca-do-alquimista",
    "category": "head",
    "name": "Touca do alquimista",
    "icon": "assets/items/touca-do-alquimista.webp"
  },
  {
    "id": "mascara-solar",
    "category": "head",
    "name": "Máscara solar",
    "icon": "assets/items/mascara-solar.webp"
  },
  {
    "id": "peitoral-de-placas",
    "category": "armor",
    "name": "Peitoral de placas",
    "icon": "assets/items/peitoral-de-placas.webp"
  },
  {
    "id": "gibao-de-couro",
    "category": "armor",
    "name": "Gibão de couro",
    "icon": "assets/items/gibao-de-couro.webp"
  },
  {
    "id": "couraca-laminada",
    "category": "armor",
    "name": "Couraça laminada",
    "icon": "assets/items/couraca-laminada.webp"
  },
  {
    "id": "cota-de-malha",
    "category": "armor",
    "name": "Cota de malha",
    "icon": "assets/items/cota-de-malha.webp"
  },
  {
    "id": "peitoral-de-escamas",
    "category": "armor",
    "name": "Peitoral de escamas",
    "icon": "assets/items/peitoral-de-escamas.webp"
  },
  {
    "id": "brigantina-negra",
    "category": "armor",
    "name": "Brigantina negra",
    "icon": "assets/items/brigantina-negra.webp"
  },
  {
    "id": "colete-carmesim",
    "category": "armor",
    "name": "Colete carmesim",
    "icon": "assets/items/colete-carmesim.webp"
  },
  {
    "id": "armadura-de-ossos",
    "category": "armor",
    "name": "Armadura de ossos",
    "icon": "assets/items/armadura-de-ossos.webp"
  },
  {
    "id": "manto-elemental",
    "category": "armor",
    "name": "Manto elemental",
    "icon": "assets/items/manto-elemental.webp"
  },
  {
    "id": "avental-do-alquimista",
    "category": "armor",
    "name": "Avental do alquimista",
    "icon": "assets/items/avental-do-alquimista.webp"
  },
  {
    "id": "botas-de-montaria",
    "category": "boots",
    "name": "Botas de montaria",
    "icon": "assets/items/botas-de-montaria.webp"
  },
  {
    "id": "botas-de-placas",
    "category": "boots",
    "name": "Botas de placas",
    "icon": "assets/items/botas-de-placas.webp"
  },
  {
    "id": "botas-de-tecido",
    "category": "boots",
    "name": "Botas de tecido",
    "icon": "assets/items/botas-de-tecido.webp"
  },
  {
    "id": "botas-de-malha",
    "category": "boots",
    "name": "Botas de malha",
    "icon": "assets/items/botas-de-malha.webp"
  },
  {
    "id": "botas-draconicas",
    "category": "boots",
    "name": "Botas dracônicas",
    "icon": "assets/items/botas-draconicas.webp"
  },
  {
    "id": "sandalias-do-andarilho",
    "category": "boots",
    "name": "Sandálias do andarilho",
    "icon": "assets/items/sandalias-do-andarilho.webp"
  },
  {
    "id": "botas-do-vigia",
    "category": "boots",
    "name": "Botas do vigia",
    "icon": "assets/items/botas-do-vigia.webp"
  },
  {
    "id": "grevas-de-ossos",
    "category": "boots",
    "name": "Grevas de ossos",
    "icon": "assets/items/grevas-de-ossos.webp"
  },
  {
    "id": "botas-de-pele",
    "category": "boots",
    "name": "Botas de pele",
    "icon": "assets/items/botas-de-pele.webp"
  },
  {
    "id": "botas-do-alquimista",
    "category": "boots",
    "name": "Botas do alquimista",
    "icon": "assets/items/botas-do-alquimista.webp"
  },
  {
    "id": "presa-em-cordao",
    "category": "necklace",
    "name": "Presa em cordão",
    "icon": "assets/items/presa-em-cordao.webp"
  },
  {
    "id": "medalhao-solar",
    "category": "necklace",
    "name": "Medalhão solar",
    "icon": "assets/items/medalhao-solar.webp"
  },
  {
    "id": "pingente-de-jade",
    "category": "necklace",
    "name": "Pingente de jade",
    "icon": "assets/items/pingente-de-jade.webp"
  },
  {
    "id": "colar-de-vertebras",
    "category": "necklace",
    "name": "Colar de vértebras",
    "icon": "assets/items/colar-de-vertebras.webp"
  },
  {
    "id": "dente-draconico",
    "category": "necklace",
    "name": "Dente dracônico",
    "icon": "assets/items/dente-draconico.webp"
  },
  {
    "id": "medalhao-lunar",
    "category": "necklace",
    "name": "Medalhão lunar",
    "icon": "assets/items/medalhao-lunar.webp"
  },
  {
    "id": "frasco-de-esmeralda",
    "category": "necklace",
    "name": "Frasco de esmeralda",
    "icon": "assets/items/frasco-de-esmeralda.webp"
  },
  {
    "id": "coracao-de-brasa",
    "category": "necklace",
    "name": "Coração de brasa",
    "icon": "assets/items/coracao-de-brasa.webp"
  },
  {
    "id": "amuleto-dos-quatro-ventos",
    "category": "necklace",
    "name": "Amuleto dos quatro ventos",
    "icon": "assets/items/amuleto-dos-quatro-ventos.webp"
  },
  {
    "id": "bussola-antiga",
    "category": "necklace",
    "name": "Bússola antiga",
    "icon": "assets/items/bussola-antiga.webp"
  },
  {
    "id": "sinete-de-bronze",
    "category": "ring",
    "name": "Sinete de bronze",
    "icon": "assets/items/sinete-de-bronze.webp"
  },
  {
    "id": "aro-de-espinhos",
    "category": "ring",
    "name": "Aro de espinhos",
    "icon": "assets/items/aro-de-espinhos.webp"
  },
  {
    "id": "anel-de-jade",
    "category": "ring",
    "name": "Anel de jade",
    "icon": "assets/items/anel-de-jade.webp"
  },
  {
    "id": "garra-de-ambar",
    "category": "ring",
    "name": "Garra de âmbar",
    "icon": "assets/items/garra-de-ambar.webp"
  },
  {
    "id": "anel-de-ossos",
    "category": "ring",
    "name": "Anel de ossos",
    "icon": "assets/items/anel-de-ossos.webp"
  },
  {
    "id": "aro-lunar",
    "category": "ring",
    "name": "Aro lunar",
    "icon": "assets/items/aro-lunar.webp"
  },
  {
    "id": "serpente-de-cobre",
    "category": "ring",
    "name": "Serpente de cobre",
    "icon": "assets/items/serpente-de-cobre.webp"
  },
  {
    "id": "selo-da-brasa",
    "category": "ring",
    "name": "Selo da brasa",
    "icon": "assets/items/selo-da-brasa.webp"
  },
  {
    "id": "anel-prismatico",
    "category": "ring",
    "name": "Anel prismático",
    "icon": "assets/items/anel-prismatico.webp"
  },
  {
    "id": "selo-do-alquimista",
    "category": "ring",
    "name": "Selo do alquimista",
    "icon": "assets/items/selo-do-alquimista.webp"
  }
];
const itemCatalog = [...Object.values(gameItems), ...equipmentItems];
