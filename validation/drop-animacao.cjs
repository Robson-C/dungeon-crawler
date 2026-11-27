const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const cp = require("node:child_process");
const sharp = require(require.resolve("sharp",{paths:[path.dirname(process.execPath)]}));
const {setup,itemName}=require("./harness.cjs");

async function main() {
  const {run,bag,equipment,weaponSlot,elements,inventory,clickWorld,drag,raster,calls}=await setup();
  const bagEmpty=()=>bag.length===24&&bag.every(slot=>itemName(slot)==="vazio");
  assert(bagEmpty(),"A new run has 24 empty bag slots");
  assert.equal(equipment.filter(slot=>itemName(slot)!=="vazio").length,1);
  assert.equal(itemName(weaponSlot),"Espada de guarda reta");

  // Fill the bag through the existing test catalog, then equip and restart.
  const catalogButtons=elements.get("catalog-groups").children.flatMap(group=>group.children[1].children);
  assert.equal(catalogButtons.length,65);
  const armorButton=catalogButtons.find(button=>button.children[1].textContent==="Peitoral de placas");
  armorButton.dispatch("click");
  assert.equal(itemName(bag[0]),"Peitoral de placas");
  drag(bag[0],equipment.find(slot=>slot.dataset.equipment==="armor"));
  const sabreButton=catalogButtons.find(button=>button.children[1].textContent==="Sabre de lâmina curva");
  sabreButton.dispatch("click");drag(bag[0],weaponSlot);
  assert.equal(itemName(weaponSlot),"Sabre de lâmina curva");
  run("enterFloor(depth+1)");
  assert.equal(itemName(weaponSlot),"Sabre de lâmina curva","Changing floor preserves equipment");
  elements.get("reset").dispatch("click");
  assert(bagEmpty(),"Restart removes the test items and the replaced sword");
  assert.equal(equipment.filter(slot=>itemName(slot)!=="vazio").length,1);
  assert.equal(itemName(weaponSlot),"Espada de guarda reta");
  inventory.close();

  run(`const savedAnimationRandom=Math.random;
    floor.tiles.fill(1);floor.enemies=[{...enemySpawn,x:178,y:160}];floor.drops=[];
    Object.assign(player,{x:160,y:160,strength:10,health:100,finished:false});
    clearPlayerOrder();clearSwings();stride=0;Math.random=()=>0;
    swing={direction:0,started:0,checked:0,hit:false,x:160,y:160};checkSwordHit(150);`);
  assert.equal(run("floor.enemies[0].diedAt"),150);
  assert.equal(run("floor.drops[0].startedAt"),150);
  const pose=time=>run(`dropPose(floor.drops[0],${time})`);
  const first=pose(150),apex=pose(360),contact=pose(570),bounce=pose(660),settled=pose(750);
  assert.equal(first.x,178);assert.equal(first.y,160);
  assert.equal(first.height,10,"The item starts at the enemy's torso");
  assert(apex.height>first.height,"The item rises before falling");
  assert(apex.x>first.x,"The item travels away from the player");
  assert.equal(contact.height,0,"First contact reaches the floor");
  assert(bounce.height>0&&bounce.height<first.height,"Landing is followed by a small bounce");
  assert.equal(settled.height,0);assert.equal(settled.tilt,0);assert.equal(settled.airborne,false);
  assert.equal(settled.x,run("floor.drops[0].x"));assert.equal(settled.y,run("floor.drops[0].y"));
  assert.deepEqual(pose(4000),settled,"Settled position remains stable");
  const fixed=pose(420);
  for(const time of [150,180,215,280,330,375,415])run(`drawDrops(${time})`);
  assert.deepEqual(pose(420),fixed,"Trajectory depends on elapsed time, not the number of frames");
  run("globalThis.animationRandomCalls=0;Math.random=()=>{animationRandomCalls++;return .2;}");
  for(const time of [150,360,570,660,750])run(`drawDrops(${time})`);
  assert.equal(run("animationRandomCalls"),0,"Drawing never rerolls loot");

  const icon=run("floor.drops[0].item.icon");
  calls.length=0;run("drawDrops(360,'ground')");
  assert(!calls.some(call=>call.src===icon),"Ground pass leaves airborne icons for the upper pass");
  calls.length=0;run("drawDrops(360,'air')");
  assert(calls.some(call=>call.src===icon));
  calls.length=0;run("drawDrops(750,'air')");
  assert(!calls.some(call=>call.src===icon));
  calls.length=0;run("drawDrops(750,'ground')");
  assert(calls.some(call=>call.src===icon));

  const context=elements.get("room").getContext("2d"),paint=context.drawImage;
  const opacity=[];
  context.drawImage=function(source,...args) {
    if(source.assetPath==="assets/gameplay-actors.png")opacity.push(this.globalAlpha);
    return paint(source,...args);
  };
  try {
    for(const time of [150,240,329]) {
      run(`ctx.resetTransform();ctx.globalAlpha=1;drawTarget(floor.enemies[0],${time})`);
      assert.equal(run("ctx.globalAlpha"),1,"Death drawing restores opacity");
    }
    assert.equal(opacity.length,3);
    assert(Math.abs(opacity[0]-1)<.001);
    assert(opacity[1]>.45&&opacity[1]<.55);
    assert(opacity[2]<.02);
    opacity.length=0;run("drawTarget(floor.enemies[0],330)");
    assert.equal(opacity.length,0,"The corpse disappears only after the short fade");
  } finally { context.drawImage=paint; }
  const oldX=run("floor.enemies[0].x");
  run("updateEnemy(floor.enemies[0],250,.05)");
  assert.equal(run("floor.enemies[0].x"),oldX,"Fading enemies no longer move or attack");

  // A blocked one-tile space keeps the landing in place, while retaining the jump.
  run(`floor.tiles.fill(0);floor.tiles[tileAt(168,168)]=1;floor.drops=[];
    Object.assign(player,{x:150,y:168});Math.random=()=>0;
    dropEnemyItem({health:0,x:168,y:168},100);`);
  assert.equal(run("floor.drops[0].x"),168);assert.equal(run("floor.drops[0].y"),168);
  assert(run("dropPose(floor.drops[0],310).height>10"));
  run("Math.random=savedAnimationRandom");

  // Capture a complete real mouse attack and its drop at the usual Canvas scale.
  const evidenceDir=cp.execFileSync("git",["rev-parse","--git-path","codex-evidence/drop-animado-20261127"],{encoding:"utf8"}).trim();
  fs.mkdirSync(evidenceDir,{recursive:true});
  run(`floor=generateFloor(19061,1);floor.tiles.fill(1);floor.drops=[];
    Object.assign(player,{race:'human',characterClass:'adventurer',x:412,y:246,strength:10,health:100,finished:false});
    floor.enemies=[{...enemySpawn,x:430,y:246,state:'recovery',remaining:1000}];
    floor.stairs={left:800,right:832,top:400,bottom:432};
    globalThis.previewRolls=[0,.1,.9];Math.random=()=>previewRolls.shift()??.999999;
    clearPlayerOrder();clearSwings();gameTime=0;previous=null;stride=0;lastDirection=0;`);
  const raw=[],frame=raster.createCanvas(480,300),ink=frame.getContext("2d");
  const phases=raster.createCanvas(1000,220),phaseInk=phases.getContext("2d");
  const samples=[280,400,520,760,1040];
  for(let index=0;index<40;index++) {
    const timestamp=index*40;
    if(timestamp===240)clickWorld(430,238);
    run(`frame(${timestamp})`);
    const room=elements.get("room").surface;
    ink.drawImage(room,room.width/2-360,room.height/2-225,720,450,0,0,480,300);
    raw.push(Buffer.from(ink.getImageData(0,0,480,300).data));
    if(samples.includes(timestamp)) {
      const x=samples.indexOf(timestamp)*200;
      phaseInk.drawImage(frame,100,20,300,280,x,20,200,187);
      phaseInk.fillStyle="#142025";phaseInk.fillRect(x,0,200,20);
      phaseInk.fillStyle="#eed7a8";phaseInk.font="12px sans-serif";phaseInk.fillText(timestamp+" ms",x+8,14);
    }
  }
  assert.equal(run("floor.drops.length"),1);
  assert.equal(run("dropPose(floor.drops[0],gameTime).airborne"),false);
  const preview=path.resolve(evidenceDir,"drop-animado.gif");
  await sharp(Buffer.concat(raw),{raw:{width:480,height:300*40,channels:4,pageHeight:300}})
    .gif({delay:Array(40).fill(40),loop:0,effort:2}).toFile(preview);
  const metadata=await sharp(preview,{animated:true}).metadata();
  assert(metadata.pages>1&&metadata.pages<=40,"GIF encoder may merge identical frames");
  assert.equal(metadata.delay.reduce((a,b)=>a+b,0),1600);
  const phasesPath=path.resolve(evidenceDir,"fases.png");
  fs.writeFileSync(phasesPath,phases.toBuffer("image/png"));
  run("Math.random=savedAnimationRandom");
  console.log(JSON.stringify({result:"passed",preview,phases:phasesPath,durationMs:1600,
    cases:"Empty starting/restarted inventory, catalog, equipment between floors, arc, bounce, no frame dependence, layers, fade, blocked landing, real mouse attack",
    limitation:"Preview rendered with local Canvas; browser playback remains unverified"},null,2));
}
main().catch(error=>{console.error(error);process.exitCode=1;});
