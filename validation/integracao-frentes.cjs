const assert=require("node:assert/strict");
const {setup,itemName}=require("./harness.cjs");

async function main(){
  const {run,elements,inventory,window,clickWorld,bag}=await setup();
  run("globalThis.integrationRandom=Math.random;Math.random=()=>0");
  function fresh(type="skeleton"){
    inventory.close();
    run(`abilities.reset();clearPlayerOrder();clearSwings();doubleUntil=0;
      floor.tiles.fill(1);floor.drops=[];
      floor.enemies=[{...enemySpawn,type:'${type}',x:178,y:160,health:1,state:'recovery',remaining:1000}];
      Object.assign(player,{x:160,y:160,health:100,maxHealth:100,energy:100,maxEnergy:100,strength:10,intellect:10,armor:10,finished:false});
      gameTime=0;previous=null;stride=0;game.hidden=false;inventoryView.reset();updateCamera();showHealth();`);
  }
  function cast(id){
    run(`abilities.assign(0,'${id}');abilities.activate(0);
      if(abilities.isAiming())abilities.confirm({x:178,y:150});`);
  }
  const families=run("enemyFamilies");
  let defeats=0;
  for(const type of families)for(const mode of ["basic","double","hook","circle","fire","poison","chain","orbs","ice"]){
    fresh(type);
    if(mode==="basic")run("swing={direction:0,started:0,checked:0,hit:false,x:160,y:160};checkSwordHit(150)");
    else{
      cast(mode);
      if(mode==="hook")run("gameTime=50;abilities.tick(.05)");
      if(mode==="poison")run("gameTime=1350;abilities.tick(.05)");
      if(mode==="orbs")run("abilities.tick(0)");
      if(mode==="ice")run("abilities.breakIce(floor.enemies[0])");
    }
    assert.equal(run("floor.enemies[0].health"),0,type+" defeated by "+mode);
    assert.equal(run("floor.drops.length"),1,type+" drops after "+mode);
    assert.equal(run("floor.enemies[0].dropRolled"),true);
    assert.equal(run("floor.drops[0].originX"),178);
    assert.equal(run("floor.drops[0].originY"),160);
    assert.equal(run("floor.drops[0].startedAt"),run("floor.enemies[0].diedAt"));
    run("gameTime+=1000;abilities.tick(.05);dropEnemyItem(floor.enemies[0]);drawDrops();");
    assert.equal(run("floor.drops.length"),1,"Later ticks cannot duplicate the drop");
    defeats++;
  }
  // Ice and the same basic hit may both kill; the death roll must still occur once.
  fresh();cast("ice");
  run("globalThis.integrationRolls=0;Math.random=()=>{integrationRolls++;return 0};swing={direction:0,started:0,checked:0,hit:false,x:160,y:160};checkSwordHit(150)");
  assert.equal(run("integrationRolls"),3,"Weapon damage, chance and item are each rolled once");
  assert.equal(run("floor.drops.length"),1);
  fresh();run("Math.random=()=>.999999");cast("fire");
  assert.equal(run("floor.drops.length"),0,"Skills use the same 50% threshold");
  run("Math.random=()=>0");

  // Every new enemy atlas retains the death fade instead of overwriting its opacity with a hit flash.
  const ctx=elements.get("room").getContext("2d"),paint=ctx.drawImage;
  for(const type of families){
    fresh(type);run("gameTime=100");cast("fire");
    const icon=run(`enemyArtData['${type}'].image`),opacity=[];
    ctx.drawImage=function(source,...args){
      if(source.assetPath===icon)opacity.push(this.globalAlpha);
      return paint(source,...args);
    };
    try{
      run("ctx.globalAlpha=1;drawTarget(floor.enemies[0],100);drawTarget(floor.enemies[0],190);drawTarget(floor.enemies[0],280)");
      assert.equal(opacity.length,2);assert(opacity[0]>.99);assert(opacity[1]>.49&&opacity[1]<.51);
      assert.equal(run("ctx.globalAlpha"),1);
    }finally{ctx.drawImage=paint;}
  }

  // A selected skill consumes the world click, updates the gold bar, and cancels the basic order.
  fresh("slime");run("floor.enemies[0].health=100");
  clickWorld(178,155);assert.equal(run("playerOrder.type"),"attack");
  run("abilities.assign(0,'fire')");window.dispatch("keydown",{code:"Digit1"});
  assert.equal(run("playerOrder"),null);assert(run("abilities.isAiming()"));
  clickWorld(190,160);
  assert.equal(run("playerOrder"),null);assert(!run("abilities.isAiming()"));
  assert.equal(run("player.energy"),82);assert.equal(elements.get("energy-fill").style.transform,"scaleX(0.82)");
  assert.equal(elements.get("energy").textContent,"");assert(!elements.has("ability-energy"));
  window.dispatch("keydown",{code:"KeyR"});assert.equal(elements.get("energy-fill").style.transform,"scaleX(1)");
  run("abilities.assign(0,'ice')");window.dispatch("keydown",{code:"Digit1"});
  elements.get("open-inventory").dispatch("click");assert(inventory.open);assert(!run("abilities.isAiming()"));
  inventory.close();

  // A skill's drop is the same collectable object used by the mouse inventory flow.
  fresh("armor");cast("fire");
  run("gameTime=700;updateCamera()");
  clickWorld(run("floor.drops[0].x"),run("floor.drops[0].y-2"));
  for(let i=0;i<20;i++)run("gameTime+=50;updatePlayerOrder(gameTime,.05)");
  assert.equal(run("floor.drops.length"),0);
  assert.equal(bag.filter(slot=>itemName(slot)!=="vazio").length,1);
  run("enterFloor(depth+1)");assert.equal(run("abilities.inspect().effects.length"),0);
  assert.equal(run("playerOrder"),null);assert([4,6,8,10].includes(run("floor.enemies.length")));
  assert(run("floor.enemies.every(e=>enemyFamilies.includes(e.type))"));
  elements.get("reset").dispatch("click");assert(bag.every(slot=>itemName(slot)==="vazio"));
  assert.equal(run("inventoryView.getEquipped('weapon').id"),"short-sword");
  run("Math.random=integrationRandom");
  console.log(JSON.stringify({result:"passed",families:families.length,defeatPaths:defeats,
    cases:"All families and damage paths share one death/drop, ice/basic double death, no-drop threshold, atlas fade/opacity, targeting consumes clicks, gold energy bar/refill, inventory cancellation, skill loot collection, floor and restart",
    limitation:"Local integration tests; browser visual/interactive verification remains pending"},null,2));
}
main().catch(error=>{console.error(error);process.exitCode=1;});
