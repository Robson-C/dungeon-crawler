const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const cp = require("node:child_process");
const {setup,itemName} = require("./harness.cjs");

async function main() {
  const {run,bag,equipment,elements,inventory,clickWorld,calls,loaded,raster}=await setup();
  const initialBag=bag.map(itemName),initialEquipment=equipment.map(itemName);
  assert(initialBag.every(name=>name==="vazio"),"All 24 starting bag slots are empty");
  assert.equal(initialEquipment.filter(name=>name!=="vazio").length,1);
  assert.equal(run("inventoryView.getEquipped('weapon').id"),"short-sword");
  run("const savedDropRandom = Math.random;");
  function strike({health=3,strength=10,armor=0,roll=.1,pool=0}={}) {
    run(`clearPlayerOrder();clearSwings();floor.tiles.fill(1);floor.drops=[];
      floor.enemies=[{...enemySpawn,x:178,y:160,health:${health},armor:${armor}}];
      Object.assign(player,{x:160,y:160,strength:${strength},health:100,finished:false});
      stride=0;globalThis.dropRolls=[0,${roll},${pool}];globalThis.dropRandomCalls=0;
      Math.random=()=>{dropRandomCalls++;return dropRolls.shift()??.999999;};
      swing={direction:0,started:0,checked:0,hit:false,x:160,y:160};checkSwordHit(150);`);
  }
  strike({health:100});
  assert.equal(run("floor.drops.length"),0,"A non-lethal hit cannot drop an item");
  assert.equal(run("dropRandomCalls"),1,"Only weapon damage rolls while enemy lives");
  assert.equal(run("floor.enemies[0].dropRolled"),undefined);
  strike({strength:0,armor:50});
  assert.equal(run("floor.enemies[0].health"),3,"Armor still blocks damage");
  assert.equal(run("floor.drops.length"),0);
  for(const roll of [0,.499999999,.5,.999999999]) {
    strike({roll});
    const expected=roll<.5?1:0;
    assert.equal(run("floor.enemies[0].health"),0);
    assert.equal(run("floor.drops.length"),expected,"50% boundary at "+roll);
    assert.equal(run("dropRandomCalls"),expected?3:2);
    assert.equal(run("floor.enemies[0].dropRolled"),true);
    run(`checkSwordHit(180);dropEnemyItem(floor.enemies[0]);clearSwings();
      swing={direction:0,started:0,checked:0,hit:false,x:160,y:160};checkSwordHit(150);
      updateEnemy(floor.enemies[0],200,.05);`);
    assert.equal(run("floor.drops.length"),expected,"Dead enemy never rerolls or duplicates");
    assert.equal(run("dropRandomCalls"),expected?3:2);
  }
  strike({health:1,strength:100});
  assert.equal(run("floor.drops.length"),1,"Overkill produces one item");
  assert.equal(run("floor.drops[0].originX"),178);
  assert.equal(run("floor.drops[0].originY"),160);
  assert(run("Math.hypot(floor.drops[0].x-178,floor.drops[0].y-160)<=9.000001"));
  assert(run("clearFloor(floor.drops[0].x,floor.drops[0].y,3)"));
  assert.deepEqual(bag.map(itemName),initialBag,"Drops do not change the starting bag");
  assert.deepEqual(equipment.map(itemName),initialEquipment);

  const catalog=run("itemCatalog");
  assert.equal(catalog.length,65);
  const selected=new Set();
  for(let index=0;index<catalog.length;index++) {
    strike({pool:(index+.5)/catalog.length});
    assert.equal(run("floor.drops.length"),1);
    const drop=run("floor.drops[0]");
    assert.equal(drop.item.id,catalog[index].id,"Every catalog entry can drop");
    assert.deepEqual(Object.keys(drop.item).sort(),Object.keys(catalog[index]).sort(),"No rarity or level added");
    selected.add(drop.item.id);
    calls.length=0;
    run("ctx.resetTransform();ctx.clearRect(0,0,canvas.width,canvas.height);drawDrops()");
    assert(calls.some(call=>call.src===catalog[index].icon),"Uses existing item icon");
  }
  assert.equal(selected.size,65);
  strike({pool:0});assert.equal(run("floor.drops[0].item.id"),catalog[0].id);
  strike({pool:.999999999});assert.equal(run("floor.drops[0].item.id"),catalog.at(-1).id);

  let drops=0;
  for(let step=0;step<100;step++) {
    strike({roll:(step+.5)/100,pool:.2});
    drops+=run("floor.drops.length");
  }
  assert.equal(drops,50,"Exactly half of equal intervals pass the configured threshold");
  // This is a threshold test, not an assertion that a random sample must be 50/50.

  // Normal mouse combat creates a drop; walking over it does not collect it.
  run(`inventoryView.clearBag();floor.drops=[];floor.tiles.fill(1);
    floor.enemies=[{...enemySpawn,x:178,y:160,state:'recovery',remaining:10}];
    Object.assign(player,{x:160,y:160,strength:10,health:100,finished:false});
    floor.stairs={left:800,right:832,top:400,bottom:432};
    clearPlayerOrder();clearSwings();gameTime=0;previous=null;
    globalThis.normalRolls=[0,.2,.4];Math.random=()=>normalRolls.shift()??.999999;frame(0);`);
  inventory.close();
  clickWorld(178,152);
  run("frame(20);frame(170)");
  assert.equal(run("floor.enemies[0].health"),0);
  assert.equal(run("floor.drops.length"),1);
  assert(bag.every(slot=>itemName(slot)==="vazio"));
  const icon=run("floor.drops[0].item.icon");
  calls.length=0;
  run("frame(220);frame(330)");
  assert(calls.some(call=>call.src===icon),"Normal frame draws the drop after the terrain");
  run("player.x=178;player.y=160;frame(360);frame(400)");
  assert.equal(run("floor.drops.length"),1,"Walking over a drop does not collect it without a pickup order");
  assert(bag.every(slot=>itemName(slot)==="vazio"));
  const initialTransform=run("JSON.stringify(ctx.getTransform())");
  run("drawDrops()");
  assert.equal(run("JSON.stringify(ctx.getTransform())"),initialTransform,"Drawing restores the canvas transform");
  run("dropImages.get(floor.drops[0].item.icon).surface=null;drawDrops()");
  assert.equal(run("floor.drops.length"),1,"Loading fallback does not remove the item");
  run("dropImages.get(floor.drops[0].item.icon).surface=undefined");
  // Restore the simulated image and inspect the actual game drawing locally.
  const currentImage=run("dropImages.get(floor.drops[0].item.icon)");
  currentImage.surface=loaded.get(icon);

  run("Math.random=()=>.999999;enterFloor(depth+1)");
  assert.equal(run("floor.drops.length"),0,"Drops belong to the current floor");
  assert(run("floor.enemies.every(enemy=>!enemy.dropRolled)"),"New enemies can each roll once");
  run("floor.enemies[0].health=0;Math.random=()=>0;dropEnemyItem(floor.enemies[0])");
  assert.equal(run("floor.drops.length"),1);
  elements.get("reset").dispatch("click");
  assert.equal(run("floor.drops.length"),0,"A new run resets floor drops");
  assert.deepEqual(bag.map(itemName),initialBag,"Starting inventory remains unchanged");

  // Full bags do not prevent the death roll.
  run("inventoryView.clearBag();for(let n=0;n<24;n++)inventoryView.addItem(itemCatalog[0])");
  strike();assert.equal(run("floor.drops.length"),1);
  assert(bag.every(slot=>itemName(slot)===catalog[0].name));

  const evidenceDir=cp.execFileSync("git",["rev-parse","--git-path","codex-evidence/drop50-20261127"],{encoding:"utf8"}).trim();
  fs.mkdirSync(evidenceDir,{recursive:true});
  // A fixed seed and separated positions make the existing icons easy to inspect.
  run(`Math.random=savedDropRandom;clearPlayerOrder();clearSwings();
    Object.assign(player,{x:430,y:246,finished:false});floor=generateFloor(19061,1);
    floor.tiles.fill(1);floor.enemies=[];
    for(const[index,item]of itemCatalog.filter(item=>['short-sword','crystal-sword','peitoral-de-placas','botas-de-montaria','medalhao-solar','anel-de-jade'].includes(item.id)).entries()){
      const target={health:0,x:400+(index%3)*28,y:250+Math.floor(index/3)*24};
      Math.random=()=>0;dropEnemyItem(target);floor.drops.at(-1).item=item;
      if(!dropImages.has(item.icon)){const image=new Image();image.src=item.icon;dropImages.set(item.icon,image);}
    }
    Math.random=savedDropRandom;
    ctx.setTransform(pixelsPerUnit,0,0,pixelsPerUnit,-(430-view.width/2)*pixelsPerUnit,-(260-view.height/2)*pixelsPerUnit);
    drawRoom(0,430-view.width/2,260-view.height/2);drawDrops(gameTime+1000);
    playerMoved=false;stride=0;lastDirection=0;drawPlayer(0);`);
  const source=elements.get("room").surface;
  const preview=raster.createCanvas(640,360);
  preview.getContext("2d").drawImage(source,source.width/2-480,source.height/2-270,960,540,0,0,640,360);
  const previewPath=path.resolve(evidenceDir,"drops.png");
  fs.writeFileSync(previewPath,preview.toBuffer("image/png"));
  console.log(JSON.stringify({result:"passed",chance:.5,pool:selected.size,thresholdIntervals:100,
    cases:"Lethal/non-lethal hit, overkill, no duplicate, no reroll after miss, all catalog entries, mouse combat, current-floor lifetime, restart, full bag and drawing",
    preview:previewPath,limitation:"Canvas local; no browser visual verification"},null,2));
}
main().catch(error=>{console.error(error);process.exitCode=1;});
