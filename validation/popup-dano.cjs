const assert = require("node:assert/strict");
const {setup, itemName} = require("./harness.cjs");

async function main() {
  const {run,bag,weaponSlot,inventory,drag,clickWorld,elements,document,window} = await setup();
  const popup = elements.get("item-tooltip");
  const name = elements.get("item-tooltip-name");
  const stats = elements.get("item-tooltip-stats");
  const art = elements.get("item-tooltip-art");

  assert(bag.every(slot=>itemName(slot)==="vazio"),"A new run starts with an empty bag");
  run(`for(const category of ['head','weapon','armor','necklace','boots','ring']) {
    for(const item of itemCatalog.filter(item=>item.category===category).slice(0,3)) {
      if(item!==gameItems.shortSword)inventoryView.addItem(item);
    }
  }inventoryView.addItem(gameItems.spear);`);
  assert(popup.hidden);
  weaponSlot.dispatch("pointerenter");
  assert.equal(popup.hidden,false);
  assert.equal(name.textContent,"Espada de guarda reta");
  assert.equal(stats.textContent,"Dano 1–2");
  assert.equal(stats.hidden,false);
  assert.equal(weaponSlot.getAttribute("aria-describedby"),popup.id);
  assert.equal(weaponSlot.title,"","Custom popup replaces browser title");
  weaponSlot.dispatch("pointerleave");
  assert(popup.hidden);
  assert.equal(weaponSlot.getAttribute("aria-describedby"),undefined);

  for (const slot of bag.filter(slot=>itemName(slot)!=="vazio")) {
    slot.dispatch("pointerenter");
    assert.equal(name.textContent,itemName(slot));
    assert.equal(popup.hidden,false);
    assert.equal(stats.hidden,!["Espada de guarda reta","Sabre de lâmina curva","Espada de cristal","Lança"].includes(itemName(slot)));
    assert.equal(art.children[0].className,"item-tooltip-icon");
    assert.equal(art.children[0].style.rotate,"");
    slot.dispatch("pointerleave");
  }
  const empty = bag.find(slot=>itemName(slot)==="vazio");
  empty.dispatch("pointerenter");
  assert(popup.hidden,"Empty slot does not open a popup");
  weaponSlot.focus();
  assert(!popup.hidden,"Keyboard focus opens popup");
  weaponSlot.dispatch("pointerleave");
  assert(!popup.hidden,"Popup stays available to keyboard focus");
  weaponSlot.dispatch("blur");
  assert(popup.hidden);
  document.activeElement = null;

  weaponSlot.bounds = {left:1180,right:1240,top:690,width:60,height:50,bottom:740};
  weaponSlot.dispatch("pointerenter");
  assert.equal(popup.style.left,"928px","Popup flips left at right screen edge");
  assert.equal(popup.style.top,"522px","Popup is lifted above bottom screen edge");
  Object.assign(document.documentElement, {clientWidth:210,clientHeight:280});
  popup.bounds = {width:194,height:210};
  window.dispatch("resize");
  assert.equal(popup.style.left,"8px");
  assert.equal(popup.style.top,"62px");
  window.dispatch("scroll");
  assert(popup.hidden);
  Object.assign(document.documentElement, {clientWidth:1280,clientHeight:720});
  popup.bounds = {width:240,height:190};

  const sabre = bag.find(slot=>itemName(slot)==="Sabre de lâmina curva");
  sabre.dispatch("pointerenter");
  sabre.dispatch("pointerdown",{pointerId:1,isPrimary:true,button:0,clientX:0,clientY:0});
  assert(popup.hidden,"Beginning drag hides popup");
  weaponSlot.dispatch("pointerenter");
  assert(popup.hidden,"Dragging suppresses hover");
  inventory.dispatch("pointercancel",{pointerId:1});
  drag(sabre,weaponSlot);
  weaponSlot.dispatch("pointerenter");
  assert.equal(name.textContent,"Sabre de lâmina curva","Popup refreshes after swap");
  assert(art.children[0].style.background.includes("sabre-curved.png"));
  inventory.close();
  assert(popup.hidden);
  weaponSlot.dispatch("pointerenter");
  assert(popup.hidden,"Closed inventory suppresses popup");
  inventory.show();
  weaponSlot.dispatch("pointerenter");
  window.dispatch("blur");
  assert(popup.hidden);
  run("inventoryView.reset()");
  assert(bag.every(slot=>itemName(slot)==="vazio"),"Reset clears added test items");
  run("inventoryView.addItem(gameItems.curvedSabre)");

  run("const originalRandom=Math.random;let damageRolls=0;Math.random=()=>{damageRolls++;return 0;}");
  for (const key of ["shortSword","curvedSabre","crystalSword","spear"]) {
    assert.equal(run(`calculateDamage(0,gameItems.${key},0)`),1);
    run("Math.random=()=>.999999");
    assert.equal(run(`calculateDamage(0,gameItems.${key},0)`),2);
    run("Math.random=()=>0");
  }
  assert.equal(run("calculateDamage(3,gameItems.shortSword,1)"),3);
  run("Math.random=()=>.999999");
  assert.equal(run("calculateDamage(3,gameItems.shortSword,1)"),4);
  assert.equal(run("calculateDamage(0,gameItems.shortSword,50)"),0);
  assert.equal(run("calculateDamage(5,null,2)"),3);
  assert.equal(run("calculateDamage(5,{id:'older-item'},2)"),3);
  assert.equal(run("calculateDamage()"),0);

  function strike({strength=0,armor=0,health=10,random=0} = {}) {
    run(`floor.tiles.fill(1);floor.enemies=[{...enemySpawn,x:178,y:160,health:${health},armor:${armor}}];
      Object.assign(player,{x:160,y:160,strength:${strength},health:3,finished:false});
      stride=0;damageRolls=0;Math.random=()=>{damageRolls++;return ${random};};
      swing={direction:0,started:0,checked:0,hit:false,x:160,y:160};checkSwordHit(150);`);
    return run("floor.enemies[0].health");
  }
  assert.equal(strike({strength:3,armor:1,random:.999999}),6);
  assert.equal(run("damageRolls"),1,"Roll once when contact occurs");
  run("checkSwordHit(180)");
  assert.equal(run("floor.enemies[0].health"),6,"Same cut does not damage twice");
  assert.equal(run("damageRolls"),1);
  assert.equal(strike({strength:100,health:1}),0,"Overkill clamps enemy health");
  assert.equal(strike({armor:20}),10,"Full armor prevents damage without healing");
  assert.equal(run("swing.hit"),true,"Blocked contact still consumes hit");
  const free = bag.find(slot=>itemName(slot)==="vazio");
  drag(weaponSlot,free);
  assert.equal(strike(),10,"Unarmed strength zero inflicts zero damage");
  assert.equal(run("damageRolls"),0,"Unarmed strike has no weapon roll");
  assert.equal(strike({strength:3,armor:1}),8,"Unarmed strike uses strength");
  drag(free,weaponSlot);
  const sabreInBag = bag.find(slot=>itemName(slot)==="Sabre de lâmina curva");
  drag(sabreInBag,weaponSlot);
  run("gameItems.curvedSabre.damage={min:4,max:4}");
  assert.equal(strike(),6,"Hit reads current weapon after swapping");
  run("gameItems.curvedSabre.damage={min:1,max:2}");
  drag(sabreInBag,weaponSlot);

  inventory.close();
  // Exercise a clicked target through the real frame loop, including a missed cut.
  run(`clearPlayerOrder();floor.tiles.fill(1);floor.enemies=[{...enemySpawn,x:178,y:160,state:'recovery',remaining:10,health:10,armor:1}];
    Object.assign(player,{x:160,y:160,strength:3,armor:0,health:3,finished:false});
    Math.random=()=>.999999;clearSwings();gameTime=0;previous=null;frame(0);`);
  clickWorld(178,152);
  run("frame(20);frame(170)");
  assert.equal(run("floor.enemies[0].health"),6);
  run("frame(220);frame(330)");
  assert.equal(run("floor.enemies[0].health"),6);
  assert.equal(run("swing"),null);
  run("floor.enemies[0].x=178;damageRolls=0;Math.random=()=>{damageRolls++;return 0;}");
  clickWorld(178,152);
  run("frame(350);floor.enemies[0].x=500;frame(500);clearPlayerOrder()");
  assert.equal(run("damageRolls"),0,"Missed cut does not roll damage");

  function enemyHit(strength,armor,health=3) {
    run(`clearPlayerOrder();clearSwings();Object.assign(player,{x:160,y:160,armor:${armor},health:${health},finished:false});
      floor.enemies=[{...enemySpawn,x:178,y:160,strength:${strength},state:'windup',remaining:.01,direction:Math.PI}];
      updateEnemy(floor.enemies[0],1000,.02);`);
    return run("player.health");
  }
  assert.equal(enemyHit(1,0),2);
  assert.equal(enemyHit(1,1),3,"Player armor blocks incoming damage");
  assert.equal(enemyHit(1,20),3);
  assert.equal(enemyHit(9,1),0,"Enemy overkill triggers death at zero");
  assert.equal(run("player.finished"),true);
  assert.equal(run("end.hidden"),false);
  assert.equal(inventory.open,false);
  assert(popup.hidden);
  elements.get("reset").dispatch("click");
  assert.equal(run("player.health"),run("initialCharacterStats(player.race,player.characterClass).maxHealth"));
  assert.equal(run("player.finished"),false);
  assert.equal(run("inventoryView.getEquipped('weapon').id"),"short-sword");
  assert(bag.every(slot=>itemName(slot)==="vazio"),"Restart keeps only the equipped starting sword");
  run("Math.random=originalRandom");
  console.log(JSON.stringify({
    result:"passed",
    tooltip:"All occupied slots, name/icon/damage, empty slot, keyboard, edge positioning, resize, scroll, drag, swap, close, blur",
    combat:"Inclusive damage 1–2, strength, armor for both sides, unarmed, older item, one hit per cut, mouse input, miss, overkill, death and restart"
  },null,2));
}
main().catch(error=>{console.error(error);process.exitCode=1;});
