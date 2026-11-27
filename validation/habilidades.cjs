const assert=require("node:assert/strict");
const fs=require("node:fs"),path=require("node:path");
const {setup}=require("./harness.cjs");
async function main(){
 const {run,elements,window,clickWorld,raster}=await setup();
 const room=elements.get("room"),choices=elements.get("ability-choices"),bar=elements.get("ability-slots");
 assert.equal(choices.children.length,10);assert.equal(bar.children.length,5);
 const fresh=()=>run(`abilities.reset();floor.tiles.fill(1);floor.enemies=[];gameTime=0;previous=null;
  Object.assign(player,{x:160,y:160,health:100,maxHealth:100,energy:100,maxEnergy:100,strength:20,intellect:10,stamina:0,willpower:0,armor:10,finished:false});
  floor.stairs={left:800,right:830,top:400,bottom:430};game.hidden=false;inventory.close();itemCatalogDialog.close();clearSwings();clearPlayerOrder();doubleUntil=0;regenerationElapsedMs=0;floor.drops=[];updateCamera();`);
 const enemies=data=>run(`floor.enemies=${JSON.stringify(data)}.map(e=>({...enemySpawn,x:180,y:160,health:100,armor:0,...e}));`);
 const equip=(id,slot=0)=>run(`abilities.assign(${slot},'${id}')`);
 const key=(n=1)=>window.dispatch("keydown",{code:"Digit"+n});
 const selectCast=(id,point={x:180,y:160})=>{equip(id);key();return run(`abilities.confirm(${JSON.stringify(point)})`);};
 const hp=i=>run(`floor.enemies[${i}].health`);

 // All dropdown choices are selectable through real handlers.
 fresh();for(let slot=0;slot<5;slot++)for(const choice of choices.children){
  bar.children[slot].dispatch("click");assert.equal(elements.get("ability-picker").hidden,false);
  choice.dispatch("click");assert.equal(run(`abilities.inspect().slots[${slot}]`),choice.dataset.ability);
  assert.equal(elements.get("ability-picker").hidden,true);
 }
 fresh();enemies([{x:180,y:160,armor:3},{x:160,y:190}]);
 run("gameItems.shortSword.damage={min:900,max:900}");
 assert(selectCast("double"));assert.equal(hp(0),87);assert.equal(hp(1),100);
 assert.equal(run("player.energy"),88);assert.equal(run("pendingSwingDirection"),null);
 run("gameTime=170;abilities.tick(.05)");assert.equal(hp(0),74);
 run("abilities.tick(.05)");assert.equal(hp(0),74,"Double second hit executes once");
 key();assert.equal(run("abilities.confirm({x:180,y:160})"),false,"Cooldown blocks recast");assert.equal(run("player.energy"),88);
 fresh();enemies([{x:180,y:160},{x:140,y:160},{x:160,y:185},{x:210,y:160}]);equip("circle");key();
 assert.deepEqual([hp(0),hp(1),hp(2),hp(3)],[76,76,76,100]);
 // All five numeric shortcuts reach their slot; duplicate skills share cooldown.
 fresh();for(let i=0;i<5;i++)equip("iron",i);key(5);assert.equal(run("player.armor"),20);
 key(2);assert.equal(run("player.armor"),20);assert.equal(run("player.energy"),85);
 run("gameTime=6000;abilities.tick(.05)");assert.equal(run("player.armor"),10);
 run("gameTime=8000");key(3);assert.equal(run("player.armor"),20);
 run("abilities.inspect().cooldowns.clear()");key(1);assert.equal(run("player.armor"),20,"Reapplication refreshes armor without stacking");
 run("abilities.reset()");assert.equal(run("player.armor"),10,"Reset removes temporary armor");
 fresh();enemies([{x:190,y:160,fireResistance:50},{x:190,y:190},{x:150,y:160},{x:240,y:160}]);
 assert(selectCast("fire",{x:210,y:160}));assert.equal(hp(0),92.5);assert.equal(hp(1),100);assert.equal(hp(2),100);assert.equal(hp(3),100);
 fresh();enemies([{x:200,y:160,poisonResistance:25},{x:230,y:160}]);
 assert(selectCast("poison",{x:200,y:160}));assert.equal(hp(0),100);
 run("gameTime=350;abilities.tick(.05)");assert.equal(hp(0),100,"Flask lands before damage over time");
 run("gameTime=1350;abilities.tick(.05)");assert.equal(hp(0),97);assert.equal(hp(1),100);
 run("floor.enemies[0].x=240;gameTime=2350;abilities.tick(.05)");assert.equal(hp(0),97,"Poison ends immediately outside pool");
 run("floor.enemies[0].x=200;gameTime=5350;abilities.tick(.05)");assert.equal(hp(0),88,"Exactly five ticks including expiration");
 run("gameTime=7000;abilities.tick(.05)");assert.equal(hp(0),88);
 fresh();enemies([{x:190,y:160,iceResistance:50}]);assert(selectCast("ice",{x:190,y:160}));
 assert.equal(run("abilities.frozen(floor.enemies[0])"),true);
 run("floor.enemies[0].state='windup';floor.enemies[0].remaining=.01;updateEnemy(floor.enemies[0],100,.02)");assert.equal(run("player.health"),100);
 run("abilities.breakIce(floor.enemies[0])");assert.equal(hp(0),95);assert.equal(run("abilities.frozen(floor.enemies[0])"),false);
 run("abilities.breakIce(floor.enemies[0])");assert.equal(hp(0),95);
 fresh();enemies([{x:180,y:160},{x:220,y:160},{x:260,y:160},{x:300,y:160},{x:340,y:160}]);
 assert(selectCast("chain",{x:180,y:160}));assert.deepEqual([0,1,2,3,4].map(hp),[88,88,88,88,100]);
 fresh();enemies([{x:200,y:160}]);assert(selectCast("hook",{x:250,y:160}));
 for(let i=1;i<12;i++)run(`gameTime=${i*50};abilities.tick(.05)`);
 assert.equal(hp(0),80);assert(run("floor.enemies[0].x")<190,"Hook pulls enemy");assert(run("floor.enemies[0].x")>=174,"Hook respects player collision");
 fresh();enemies([{x:179,y:160}]);equip("orbs");key();assert.equal(run("abilities.inspect().orbs"),3);
 run("abilities.tick(0)");assert.equal(hp(0),90);assert.equal(run("abilities.inspect().orbs"),2);
 run("gameTime=10000;abilities.tick(.05)");assert.equal(run("abilities.inspect().orbs"),0);
 fresh();enemies([{x:200,y:160,strength:99}]);assert(selectCast("decoy",{x:210,y:160}));
 assert(run("abilities.lure(floor.enemies[0])"));
 run("floor.enemies[0].state='windup';floor.enemies[0].remaining=.01;floor.enemies[0].direction=0;updateEnemy(floor.enemies[0],100,.02)");
 assert.equal(run("player.health"),100);assert.equal(run("abilities.inspect().decoy.health"),2);
 run("gameTime=6000;abilities.tick(.05)");assert.equal(run("abilities.inspect().decoy"),null);

 // Invalid targets, walls, range, cancellation and resource failures spend nothing.
 fresh();equip("ice");key();assert.equal(run("abilities.confirm({x:180,y:160})"),false);
 assert.equal(run("player.energy"),100);assert.equal(run("abilities.isAiming()"),true);
 window.dispatch("keydown",{code:"Escape"});assert.equal(run("abilities.isAiming()"),false);
 fresh();enemies([{x:290,y:160}]);assert.equal(selectCast("ice",{x:290,y:160}),false);assert.equal(run("player.energy"),100);
 fresh();enemies([{x:200,y:160}]);run("floor.tiles[tileAt(184,160)]=0");assert.equal(selectCast("chain",{x:200,y:160}),false);
 fresh();run("player.energy=0");equip("iron");key();assert.equal(run("player.armor"),10);assert.equal(run("player.energy"),0);
 window.dispatch("keydown",{code:"KeyR"});assert.equal(run("player.energy"),100);
 // Every aiming mode checks energy before entering the aiming state or stopping movement.
 let energyAimCases=0;
 for(const skill of run("abilityCatalog.filter(skill=>skill.mode!=='instant')")){
   for(const energy of [0,skill.cost-1]){
     fresh();equip(skill.id);
     run(`player.energy=${energy};playerOrder={type:'move',target:{x:210,y:160}}`);
     key();
     assert.equal(run("abilities.isAiming()"),false,skill.name+" cannot aim without enough energy");
     assert.equal(elements.get("ability-feedback").textContent,"Energia insuficiente.");
     assert.equal(run("player.energy"),energy);assert.equal(run("playerOrder.type"),"move");
     assert.equal(run("abilities.inspect().cooldowns.size"),0);assert.equal(run("abilities.inspect().effects.length"),0);
     assert.equal(bar.children[0].dataset.aiming,"false");energyAimCases++;
   }
   fresh();enemies([{x:180,y:160}]);equip(skill.id);run(`player.energy=${skill.cost}`);
   key();assert.equal(run("abilities.isAiming()"),true,skill.name+" accepts the exact cost");
   assert.equal(run("player.energy"),skill.cost,"Opening the aim does not spend energy");
   assert.equal(run("abilities.confirm({x:180,y:160})"),true);
   assert.equal(run("player.energy"),0);assert.equal(run("abilities.isAiming()"),false);
   assert.equal(run(`abilities.inspect().cooldowns.get('${skill.id}')`),skill.cooldown*1000);energyAimCases++;
   fresh();enemies([{x:180,y:160}]);equip(skill.id);key();run(`player.energy=${skill.cost-1}`);
   assert.equal(run("abilities.confirm({x:180,y:160})"),false,"Confirmation rechecks energy after aiming");
   assert.equal(run("player.energy"),skill.cost-1);assert.equal(run("abilities.inspect().cooldowns.size"),0);energyAimCases++;
 }
 fresh();equip("double",0);equip("poison",1);key();assert(run("abilities.isAiming()"));
 run("player.energy=0");key(2);assert(!run("abilities.isAiming()"),"A failed selection does not leave a stale aim");
 assert(bar.children.every(button=>button.dataset.aiming==="false"));
 fresh();equip("ice",4);run("player.energy=0");window.dispatch("keydown",{code:"Numpad5"});
 assert(!run("abilities.isAiming()"));assert.equal(elements.get("ability-feedback").textContent,"Energia insuficiente.");
 // A canceled aiming click never issues a move.
 room.bounds={left:0,top:0,width:1792,height:1024};
 fresh();equip("poison");key();room.dispatch("click",{button:0,clientX:-500,clientY:-500});
 assert.equal(run("playerOrder"),null);assert(run("abilities.isAiming()"));
 room.dispatch("pointerdown",{button:2});assert(!run("abilities.isAiming()"));
 // Click-to-move uses camera coordinates and stops on arrival.
 fresh();run("playerOrder={type:'move',target:{x:210,y:160}};frame(0)");
 for(let t=50;t<=1000;t+=50)run(`frame(${t})`);
 assert(Math.abs(run("player.x")-210)<2);assert.equal(run("playerOrder"),null);
 // Wall routing uses walkable tile centers, not a straight blocked segment.
 fresh();run("for(let row=8;row<=12;row++)floor.tiles[row*columns+12]=0;playerOrder={type:'move',target:{x:240,y:160}};frame(0)");
 for(let t=50;t<=4000;t+=50)run(`frame(${t})`);
 assert(Math.hypot(run("player.x")-240,run("player.y")-160)<3,"Routes around wall");
 fresh();enemies([{x:205,y:160,state:"recovery",remaining:100}]);run("playerOrder={type:'attack',target:floor.enemies[0]};player.strength=1;gameItems.shortSword.damage={min:1,max:1};frame(0)");
 for(let t=50;t<=1000;t+=50)run(`frame(${t})`);
 assert(hp(0)<100,"Enemy click pursues and attacks");
 window.dispatch("keydown",{code:"Escape"});assert.equal(run("playerOrder"),null);
 // Room change and death cannot retain pending effects or commands.
 fresh();selectCast("poison",{x:180,y:160});run("enterFloor(2)");assert.equal(run("abilities.inspect().effects.length"),0);assert.equal(run("playerOrder"),null);
 fresh();equip("poison");key();run("finishRun()");assert(!run("abilities.isAiming()"));assert.equal(elements.get("ability-picker").hidden,true);
 // Real pointer events use the Canvas rectangle and camera, including edge cameras.
 room.bounds={left:20,top:30,width:896,height:512,right:916,bottom:542};
 function pointer(point,button=0){
   if(button===2)room.dispatch("pointerdown",{button,isPrimary:true});
   else clickWorld(point.x,point.y);
 }

 fresh();pointer({x:200,y:160});assert(run("playerOrder"));
 for(let i=0;i<30;i++)run(`frame(${i*25})`);
 assert(Math.abs(run("player.x")-200)<2);assert.equal(run("playerOrder"),null,"Arrives and stops at clicked floor");
 assert.equal(run("facing"),1,"Mouse displacement cannot stretch the actor");
 // A solid vertical wall with a gap below forces a detour.
 fresh();run("for(let y=0;y<13;y++)floor.tiles[y*columns+12]=0;player.x=160;player.y=160;");
 pointer({x:240,y:160});let deepest=0;
 for(let i=0;i<400;i++){
   run("updatePlayerOrder(gameTime,.025);gameTime+=25");
   deepest=Math.max(deepest,run("player.y"));
   assert(run("clearFloor(player.x,player.y,radius)"),"Path stays on walkable floor");
   if(!run("playerOrder"))break;
 }
 assert(Math.hypot(run("player.x")-240,run("player.y")-160)<2,"Routes around wall and reaches destination");
 assert(deepest>208,"Detour uses the opening");
 fresh();enemies([{x:205,y:160,state:"recovery",remaining:100,health:1000}]);pointer({x:205,y:160});
 for(let i=0;i<55;i++)run(`frame(${i*25})`);
 assert(run("player.x")>160,"Mouse attack follows enemy into range");assert(hp(0)<1000,"Mouse attack executes basic swing");
 pointer({x:150,y:180});assert.equal(run("playerOrder.type==='attack'"),false,"New floor command cancels pursuit");
 // Targeting intercepts the mouse order and cancellation spends nothing.
 fresh();equip("poison");key();pointer({x:200,y:160});assert.equal(run("playerOrder"),null);assert.equal(run("player.energy"),78);
 fresh();equip("ice");key();pointer({x:200,y:160});assert(run("abilities.isAiming()"));assert.equal(run("player.energy"),100);
 pointer({x:200,y:160},2);assert(!run("abilities.isAiming()"));assert.equal(run("player.energy"),100);
 fresh();equip("fire");key();window.dispatch("keydown",{code:"Escape"});assert(!run("abilities.isAiming()"));
 bar.children[0].dispatch("click");window.dispatch("keydown",{code:"Escape"});assert.equal(elements.get("ability-picker").hidden,true);
 fresh();run("player.energy=0");window.dispatch("keydown",{code:"KeyR"});assert.equal(run("player.energy"),100);
 // Frozen target expires without bonus damage when no hit breaks it.
 fresh();enemies([{x:180,y:160}]);selectCast("ice");run("gameTime=3000;abilities.tick(.05)");assert(!run("abilities.frozen(floor.enemies[0])"));assert.equal(hp(0),100);
 // Areas and projectiles respect walls, even with a large tick.
 fresh();enemies([{x:200,y:160}]);run("floor.tiles[tileAt(184,160)]=0");selectCast("fire",{x:220,y:160});assert.equal(hp(0),100);
 fresh();enemies([{x:200,y:160}]);run("floor.tiles[tileAt(184,160)]=0");selectCast("hook",{x:220,y:160});run("gameTime=1000;abilities.tick(1)");assert.equal(hp(0),100);assert.equal(run("abilities.inspect().missiles.length"),0);
 for(const skill of run("abilityCatalog")){
   const filename=path.join(__dirname,"../assets/abilities",skill.id+".webp");assert(fs.existsSync(filename),skill.name+" has its icon");
   const icon=await raster.loadImage(filename);assert.equal(icon.width,128);assert.equal(icon.height,128);
 }
 // Render every ability effect and targeting shape through the real Canvas.
 const output=raster.createCanvas(1000,400),ink=output.getContext("2d");let draws=0;
 for(const [index,id]of ["double","hook","circle","iron","fire","poison","ice","chain","orbs","decoy"].entries()){
   fresh();enemies([{x:185,y:160},{x:205,y:170}]);equip(id);key();run("if(abilities.isAiming())abilities.confirm({x:185,y:160});gameTime=100;abilities.tick(.05);ctx.resetTransform();ctx.clearRect(0,0,canvas.width,canvas.height);ctx.setTransform(6,0,0,6,-160*6+canvas.width/2,-160*6+canvas.height/2);drawRoom(gameTime,160-view.width/2,160-view.height/2);drawPlayer(gameTime);abilities.draw(ctx,{x:185,y:160});");
   const x=index%5*200,y=Math.floor(index/5)*200;ink.drawImage(room.surface,room.width/2-110,room.height/2-110,220,220,x,y+20,200,180);ink.fillStyle="#f4dab0";ink.font="13px sans-serif";ink.fillText(id,x+6,y+15);draws++;
 }
 const out=path.join(__dirname,"output");fs.mkdirSync(out,{recursive:true});fs.writeFileSync(path.join(out,"habilidades.png"),output.toBuffer("image/png"));
 console.log(JSON.stringify({result:"passed",skills:10,dropdownChoices:50,draws,energyAimCases,cases:"Physical and magical scaling, no weapon damage, armor/resists, costs/cooldowns, aim energy threshold/exact cost/recheck, freeze/break, poison ticks, chain, hook, orbs, decoy, iron expiry, cancel, mouse arrival/routing/chase, reset/death",browser:"not tested"},null,2));
}
main().catch(error=>{console.error(error);process.exitCode=1;});
