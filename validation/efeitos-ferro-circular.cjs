const assert=require("node:assert/strict");
const fs=require("node:fs"),path=require("node:path"),cp=require("node:child_process");
const sharp=require(require.resolve("sharp",{paths:[path.dirname(process.execPath)]}));
const {setup}=require("./harness.cjs");

async function main(){
  const {run,elements,inventory,bag,weaponSlot,drag,calls,raster}=await setup();
  inventory.close();
  const room=elements.get("room"),ink=room.getContext("2d");
  function fresh(race="goblin",characterClass="adventurer"){
    run(`abilities.reset();inventoryView.reset();clearPlayerOrder();clearSwings();doubleUntil=0;
      floor.tiles.fill(1);floor.enemies=[];floor.drops=[];gameTime=0;previous=null;stride=0;lastDirection=0;
      Object.assign(player,{race:'${race}',characterClass:'${characterClass}',x:160,y:160,health:100,maxHealth:100,
        energy:100,maxEnergy:100,strength:20,intellect:10,armor:10,finished:false,flashUntil:0});
      playerMoved=false;idleStarted=null;`);
  }
  function cast(id){run(`abilities.assign(0,'${id}');abilities.activate(0)`);}
  function render(time,withWorld=false){
    run(`gameTime=${time};ctx.resetTransform();ctx.filter='none';ctx.globalAlpha=1;
      ctx.clearRect(0,0,canvas.width,canvas.height);ctx.setTransform(6,0,0,6,120-player.x*6,180-player.y*6);`);
    if(withWorld)run(`drawRoom(${time},player.x-20,player.y-30)`);
    run(`drawPlayer(${time});abilities.draw(ctx,{x:180,y:160})`);
    assert.equal(ink.filter,"none","Player filtering does not leak into later drawings");
    assert.equal(ink.globalAlpha,1,"Effects restore opacity");
    return Buffer.from(ink.getImageData(0,0,240,210).data);
  }
  const chroma=data=>{
    let sum=0,count=0;
    for(let i=0;i<data.length;i+=4)if(data[i+3]>180&&Math.max(data[i],data[i+1],data[i+2])>40){
      sum+=Math.max(data[i],data[i+1],data[i+2])-Math.min(data[i],data[i+1],data[i+2]);count++;
    }
    assert(count>100);return sum/count;
  };
  fresh();cast("iron");
  assert.equal(run("player.armor"),20);assert.equal(run("player.strength"),20);assert.equal(run("player.energy"),85);
  assert.equal(run("abilities.inspect().effects.length"),0,"Iron has no activation ring");
  assert.equal(run("abilities.ironTone()"),0);
  run("gameTime=50");assert.equal(run("abilities.ironTone()"),.5);
  run("gameTime=100");assert.equal(run("abilities.ironTone()"),1);
  run("gameTime=5990");assert(run("abilities.ironTone()")>0&&run("abilities.ironTone()")<.1);
  run("gameTime=6000");assert.equal(run("abilities.ironTone()"),0);run("abilities.tick(.05)");
  assert.equal(run("player.armor"),10,"Armor bonus still expires after six seconds");

  const comparisons=raster.createCanvas(960,760),comparisonInk=comparisons.getContext("2d");
  comparisonInk.fillStyle="#18282c";comparisonInk.fillRect(0,0,960,760);
  let cases=0,cell=0;
  for(const race of ["human","goblin","skeleton","draconic"])for(const characterClass of ["adventurer","guardian","elementalist","alchemist"]){
    for(const motion of ["idle","run","hit"]){
      fresh(race,characterClass);
      const movement=motion==="run"?"playerMoved=true;stride=18;lastDirection=-Math.PI/4;":
        motion==="hit"?"swing={direction:0,started:100,checked:0,hit:false,x:160,y:160};":"";
      run(movement);
      const normal=render(250);
      run("gameTime=0;idleStarted=null");cast("iron");run(movement);
      const metal=render(250);
      assert(chroma(metal)<chroma(normal)*.12,`${race}/${characterClass}/${motion} is desaturated`);
      let addedPixels=0,maxAddedAlpha=0;
      for(let i=3;i<normal.length;i+=4)if(metal[i]>0&&normal[i]===0){addedPixels++;maxAddedAlpha=Math.max(maxAddedAlpha,metal[i]);}
      // Color filters can round a fully transparent antialiased edge to alpha 1/255.
      assert(maxAddedAlpha<=1,`${race}/${characterClass}/${motion}: added pixels ${addedPixels}, max alpha ${maxAddedAlpha}`);
      if(motion==="idle"){
        const x=cell%4*240,y=Math.floor(cell/4)*190;
        comparisonInk.fillStyle="#e9cfa0";comparisonInk.font="12px sans-serif";comparisonInk.fillText(race+" / "+characterClass,x+5,y+15);
        comparisonInk.drawImage(room.surface,0,0,240,210,x+55,y+20,165,145);
        comparisonInk.fillStyle="#9cafae";comparisonInk.font="10px sans-serif";comparisonInk.fillText("Pele de Ferro",x+70,y+181);
        cell++;
      }
      cases++;
    }
  }
  // The circular strike deals the same one-time damage; its rendering is a separate animation.
  fresh();run("floor.enemies=[{...enemySpawn,x:180,y:160,health:100,armor:3}]");cast("circle");
  assert.equal(run("floor.enemies[0].health"),79);assert.equal(run("player.energy"),82);
  const first=run("abilities.circularPose()");
  run("gameTime=308");const last=run("abilities.circularPose()");
  assert(Math.abs(last.angle-first.angle-Math.PI*2)<1e-9,"Weapon covers one full revolution");
  assert.equal(run("abilities.inspect().effects[0].end"),350);
  for(const time of [50,100,150,200,250,300]){render(time);run("abilities.tick(.05)");}
  assert.equal(run("floor.enemies[0].health"),79,"Rendering and animation ticks cannot repeat the damage");
  run("gameTime=350");assert.equal(run("abilities.circularPose()"),null);

  // One equipped weapon, with rear/front layering, across all 16 full-body appearances.
  let spins=0;
  for(const race of ["human","goblin","skeleton","draconic"])for(const characterClass of ["adventurer","guardian","elementalist","alchemist"]){
    fresh(race,characterClass);cast("circle");
    for(const time of [90,180]){
      calls.length=0;render(time);
      const weapon=run("inventoryView.getEquipped('weapon').weaponSprite");
      const weapons=calls.map((call,index)=>({call,index})).filter(entry=>entry.call.src===weapon);
      assert.equal(weapons.length,1,"No idle weapon remains while the circular weapon is drawn");
      const body=calls.findIndex(call=>call.src!==weapon);
      assert(body>=0);
      const front=run("Math.sin(abilities.circularPose().angle)>=0");
      assert.equal(weapons[0].index>body,front,"Weapon passes behind and in front of the body");spins++;
    }
  }
  const weapons=run("itemCatalog.filter(item=>item.category==='weapon')");
  for(const item of weapons){
    fresh();run(`inventoryView.addItem(itemCatalog.find(item=>item.id===${JSON.stringify(item.id)}))`);
    inventory.show();drag(bag[0],weaponSlot);inventory.close();
    cast("circle");calls.length=0;render(180);
    assert.equal(calls.filter(call=>call.src===item.weaponSprite).length,1,item.name+" uses its equipped art");
  }
  fresh();cast("circle");run("abilities.clearFloor()");assert.equal(run("abilities.circularPose()"),null);
  fresh();cast("iron");run("abilities.reset()");assert.equal(run("abilities.ironTone()"),0);

  // Capture the actual renderer: left changes to iron, right performs one circular strike.
  const evidenceDir=cp.execFileSync("git",["rev-parse","--git-path","codex-evidence/ferro-circular-20261127"],{encoding:"utf8"}).trim();
  fs.mkdirSync(evidenceDir,{recursive:true});
  const preview=raster.createCanvas(640,300),out=preview.getContext("2d"),frames=[];
  const phases=raster.createCanvas(1000,230),phaseInk=phases.getContext("2d");
  for(let frame=0;frame<80;frame++){
    const time=frame*20;
    out.fillStyle="#152329";out.fillRect(0,0,640,300);
    for(const [index,id]of ["iron","circle"].entries()){
      fresh(index===0?"goblin":"human","adventurer");
      if(time>=250){run("gameTime=250");cast(id);}
      render(time,true);
      out.drawImage(room.surface,0,0,240,210,index*320+16,42,288,252);
      out.fillStyle="#efd6a5";out.font="bold 18px Georgia";out.fillText(index===0?"Pele de Ferro":"Golpe Circular",index*320+20,27);
      if(id==="circle"&&[260,320,400,480,560].includes(time)){
        const x=[260,320,400,480,560].indexOf(time)*200;
        phaseInk.fillStyle="#152329";phaseInk.fillRect(x,0,200,230);
        phaseInk.drawImage(room.surface,0,0,240,210,x,25,200,175);
        phaseInk.fillStyle="#efd6a5";phaseInk.font="13px sans-serif";phaseInk.fillText((time-250)+" ms",x+10,18);
      }
    }
    frames.push(Buffer.from(out.getImageData(0,0,640,300).data));
  }
  const gif=path.resolve(evidenceDir,"ferro-circular.gif");
  await sharp(Buffer.concat(frames),{raw:{width:640,height:300*frames.length,channels:4,pageHeight:300}})
    .gif({delay:Array(80).fill(20),loop:0,effort:2}).toFile(gif);
  const metadata=await sharp(gif,{animated:true}).metadata();
  assert(metadata.pages>1);assert.equal(metadata.delay.reduce((a,b)=>a+b,0),1600);
  const sheet=path.resolve(evidenceDir,"dezesseis-combinacoes.png"),phasesPath=path.resolve(evidenceDir,"fases-circular.png");
  fs.writeFileSync(sheet,comparisons.toBuffer("image/png"));fs.writeFileSync(phasesPath,phases.toBuffer("image/png"));
  console.log(JSON.stringify({result:"passed",ironPoses:cases,circularPoses:spins,weapons:weapons.length,
    cases:"Iron follows all silhouettes, idle/run/attack, filter restoration, unchanged armor/duration, full weapon revolution, single equipped weapon, depth layers, unchanged one-time damage, expiry/reset",
    preview:gif,sheet,phases:phasesPath,limitation:"Local Canvas render; real browser verification remains pending"},null,2));
}
main().catch(error=>{console.error(error);process.exitCode=1;});
