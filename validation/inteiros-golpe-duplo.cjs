const assert=require("node:assert/strict");
const {setup}=require("./harness.cjs");

async function main(){
  const {run,elements,stats,inventory,window,clickWorld,races,classes}=await setup();
  inventory.close();
  run("globalThis.savedIntegerRandom=Math.random;Math.random=()=>0");
  function fresh(){
    inventory.close();
    run(`abilities.reset();inventoryView.reset();clearPlayerOrder();clearSwings();
      regenerationElapsedMs=0;gameTime=0;previous=null;doubleUntil=0;stride=0;
      Object.assign(player,{x:160,y:160,health:100,maxHealth:100,energy:100,maxEnergy:100,
        strength:20,stamina:0,willpower:0,armor:10,finished:false});
      floor.tiles.fill(1);floor.drops=[];
      floor.enemies=[{...enemySpawn,x:178,y:160,health:100,state:'recovery',remaining:1000}];
      floor.stairs={left:800,right:832,top:400,bottom:432};updateCamera();`);
  }
  function confirmDouble(slot=0,detail=1){
    run(`abilities.assign(${slot},'double')`);
    window.dispatch("keydown",{code:"Digit"+(slot+1)});
    assert(run("abilities.isAiming()"));clickWorld(178,150,0,detail);
    assert.equal(run("abilities.isAiming()"),false);
    assert.equal(run("floor.enemies[0].health"),84);
    assert.equal(run("player.energy"),88);
    assert.equal(run("abilities.inspect().scheduled.length"),1);
  }
  function finish(from=0,to=900){for(let time=from;time<=to;time+=20)run(`frame(${time})`);}

  // The browser marks consecutive clicks in the same gesture with detail 2/3.
  let doubleClickCases=0;
  for(const delay of [0,60,180,320,400]){
    fresh();confirmDouble();run("frame(0)");
    if(delay)run(`frame(${delay})`);
    clickWorld(178,150,0,2);clickWorld(178,150,0,3);
    assert.equal(run("playerOrder"),null,"Repeated confirmation cannot queue an auto-attack");
    finish(delay+20);
    assert.equal(run("floor.enemies[0].health"),68,"Only the two intended 16-damage cuts occur");
    assert.equal(run("player.energy"),88,"One energy cost");
    assert.equal(run("abilities.inspect().cooldowns.get('double')"),3000,"One cooldown");
    assert.equal(run("abilities.inspect().scheduled.length"),0);
    doubleClickCases++;
  }
  for(let slot=0;slot<5;slot++){
    fresh();confirmDouble(slot,2);clickWorld(178,150,0,3);finish();
    assert.equal(run("floor.enemies[0].health"),68,"All five slots protect their confirmation gesture");
    doubleClickCases++;
  }
  // A separate click is a new order; it is never locked for the cooldown duration.
  fresh();confirmDouble();clickWorld(178,150,0,2);finish();
  clickWorld(178,150,0,1);assert.equal(run("playerOrder.type"),"attack");
  finish(920,1160);assert.equal(run("floor.enemies[0].health"),47,"A fresh deliberate click attacks normally");
  fresh();confirmDouble();clickWorld(220,190,0,2);
  assert.equal(run("playerOrder.type"),"move","A new destination is accepted during the animation");
  assert(Math.abs(run("playerOrder.target.x")-220)<1e-9);
  fresh();confirmDouble();window.dispatch("keydown",{code:"Escape"});
  assert.equal(run("doubleConfirmationClick"),null);
  clickWorld(178,150,0,2);assert.equal(run("playerOrder.type"),"attack");
  fresh();confirmDouble();window.dispatch("blur");assert.equal(run("doubleConfirmationClick"),null);
  fresh();confirmDouble();run("enterFloor(depth+1)");assert.equal(run("doubleConfirmationClick"),null);
  fresh();confirmDouble();elements.get("reset").dispatch("click");assert.equal(run("doubleConfirmationClick"),null);

  for(const [value,expected]of [[7.75,"7"],[.9999,"0"],[100.9999,"100"],[-1.2,"-2"],[120,"120"]]){
    assert.equal(run(`formatResource(${value})`),expected);
  }
  fresh();
  run(`Object.assign(player,{health:73.75,maxHealth:120.9,energy:7.75,maxEnergy:100.9,
    level:1.9,xp:3.99,manaPearls:8.7,armor:16.125,strength:10.75,stamina:15.5,willpower:5.5,
    intellect:10.25,fireResistance:10.9,iceResistance:20.75,poisonResistance:30.1,lightningResistance:40.5});
    showHealth();showCharacterSheet();`);
  assert.equal(elements.get("inventory-health").textContent,"73/120");
  assert.equal(stats.find(field=>field.dataset.stat==="energy").textContent,"7/100");
  for(const field of stats){
    if(field.dataset.stat==="energy")continue;
    const actual=run(`player[${JSON.stringify(field.dataset.stat)}]`);
    if(typeof actual==="number")assert.equal(String(field.textContent),String(Math.floor(actual)));
  }
  assert.equal(run("player.energy"),7.75);assert.equal(run("player.health"),73.75);
  assert.equal(elements.get("energy-fill").style.transform,`scaleX(${7.75/100.9})`);
  assert.equal(run("calculateDamage(player.strength,{damage:{min:1,max:1}},0)"),11.75,
    "The display formatter does not floor combat calculations");
  run("regenerateResources(500)");
  assert.equal(run("player.health"),74.525);assert.equal(run("player.energy"),8.025);
  run("showCharacterSheet()");assert.equal(elements.get("inventory-health").textContent,"74/120");
  assert.equal(stats.find(field=>field.dataset.stat==="energy").textContent,"8/100");

  // Creation applies the same display rule, preserving fractional definitions internally.
  races.forEach(option=>option.checked=option.value==="human");
  classes.forEach(option=>option.checked=option.value==="adventurer");
  run(`globalThis.savedHumanModifiers=raceDefinitions.human.modifiers;
    raceDefinitions.human.modifiers=Object.fromEntries(Object.keys(baseCharacterStats).map(stat=>[stat,.75]));
    updateCharacter();`);
  for(const stat of run("Object.keys(baseCharacterStats)")){
    const value=run(`initialCharacterStats('human','adventurer')[${JSON.stringify(stat)}]`);
    assert.equal(String(elements.get("creation-"+stat).textContent),String(Math.floor(value)));
    assert.equal(value%1,.75);
  }
  run("raceDefinitions.human.modifiers=savedHumanModifiers;updateCharacter();Math.random=savedIntegerRandom");
  console.log(JSON.stringify({result:"passed",doubleClickCases,
    cases:"Double/triple confirmation, delayed second click, all slots, one cost/cooldown and two cuts, fresh attack/move accepted, cleanup, floored sheet/creation, precise regeneration and combat retained",
    limitation:"Local DOM/event and Canvas tests; no real browser interaction"},null,2));
}
main().catch(error=>{console.error(error);process.exitCode=1;});
