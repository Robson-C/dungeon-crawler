const assert = require("node:assert/strict");
const {setup} = require("./harness.cjs");

async function main() {
  const {run,elements,window,inventory,stats} = await setup();
  const near=(value,expected,message)=>assert(Math.abs(value-expected)<1e-8,message||`${value} expected ${expected}`);
  function fresh(vigor=10,vontade=10) {
    run(`abilities.reset();Object.assign(player,{health:20,energy:30,maxHealth:100,maxEnergy:100,
      stamina:${vigor},willpower:${vontade},finished:false});game.hidden=false;gameTime=0;
      previous=null;regenerationElapsedMs=0;floor.enemies=[];clearPlayerOrder();clearSwings();`);
  }
  fresh();
  run("regenerateResources(499)");near(run("player.health"),20);near(run("player.energy"),30);
  run("regenerateResources(1)");near(run("player.health"),20.5);near(run("player.energy"),30.5);
  run("regenerateResources(500)");near(run("player.health"),21);near(run("player.energy"),31);
  run("regenerateResources(9000)");near(run("player.health"),30);near(run("player.energy"),40);
  near(run("regenerationElapsedMs"),0);
  for(const [vigor,vontade] of [[15,5],[0,0],[7.5,12.5],[-10,-10]]) {
    fresh(vigor,vontade);run("regenerateResources(10000)");
    near(run("player.health"),20+Math.max(0,vigor));near(run("player.energy"),30+Math.max(0,vontade));
  }
  // Results depend on elapsed time, not FPS, and preserve a partial tick.
  for(const step of [10,20,50,100,250,500,1000]) {
    fresh(15,5);for(let time=0;time<10000;time+=step)run(`regenerateResources(${step})`);
    near(run("player.health"),35);near(run("player.energy"),35);
  }
  fresh();run("regenerateResources(1250)");near(run("player.health"),21);near(run("regenerationElapsedMs"),250);
  run("player.stamina=20;player.willpower=5;regenerateResources(250)");
  near(run("player.health"),22);near(run("player.energy"),31.25);
  fresh();run("player.health=99.9;player.energy=99.8;regenerateResources(10000)");
  near(run("player.health"),100);near(run("player.energy"),100);
  // A full bar doesn't accumulate extra healing that can be withdrawn later.
  run("player.health=90;player.energy=80;regenerateResources(499)");near(run("player.health"),90);
  run("regenerateResources(1)");near(run("player.health"),90.5);near(run("player.energy"),80.5);
  fresh();run("player.finished=true;regenerateResources(10000)");near(run("player.health"),20);near(run("player.energy"),30);
  fresh();run("player.health=0;regenerateResources(10000)");near(run("player.health"),0);near(run("player.energy"),30);
  fresh();run("game.hidden=true;regenerateResources(10000)");near(run("player.health"),20);
  fresh();run("regenerateResources(-500);regenerateResources(NaN);regenerateResources(Infinity)");near(run("regenerationElapsedMs"),0);
  // Inventory floors displayed values; bars and simulation retain the fractions.
  fresh(15,5);inventory.show();run("regenerateResources(500)");
  assert.equal(elements.get("health").textContent,"");
  assert.equal(elements.get("health").getAttribute("aria-valuenow"),"20.75");
  assert.equal(elements.get("health-fill").style.transform,"scaleX(0.2075)");
  assert.equal(elements.get("inventory-health").textContent,"20/100");
  assert.equal(elements.get("energy").textContent,"");
  assert.equal(elements.get("energy").getAttribute("aria-valuenow"),"30.25");
  assert.equal(elements.get("energy-fill").style.transform,"scaleX(0.3025)");
  assert.equal(stats.find(field=>field.dataset.stat==="energy").textContent,"30/100");
  inventory.close();
  // Test real frame timing and a skill expenditure followed by regeneration.
  fresh();run("frame(0);frame(250)");near(run("player.energy"),30);
  run("frame(500)");near(run("player.energy"),30.5);
  run("abilities.assign(0,'iron')");window.dispatch("keydown",{code:"Digit1"});near(run("player.energy"),15.5);
  run("frame(1000)");near(run("player.energy"),16);
  // The imported regeneration and Principal's aim energy guard work together.
  fresh(10,10);inventory.close();
  run("player.energy=11.75;abilities.assign(0,'double')");
  window.dispatch("keydown",{code:"Digit1"});assert(!run("abilities.isAiming()"));
  run("regenerateResources(499)");window.dispatch("keydown",{code:"Digit1"});
  assert(!run("abilities.isAiming()"));near(run("player.energy"),11.75);
  run("regenerateResources(1)");near(run("player.energy"),12.25);
  window.dispatch("keydown",{code:"Digit1"});assert(run("abilities.isAiming()"));
  assert.equal(run("abilities.confirm({x:200,y:150})"),true);near(run("player.energy"),.25);
  assert.equal(elements.get("energy").textContent,"");
  assert.equal(elements.get("energy-fill").style.transform,"scaleX(0.0025)");
  // Changing floor doesn't restart a partially elapsed tick.
  fresh();run("regenerateResources(300);enterFloor(2);floor.enemies=[];regenerateResources(200)");near(run("player.health"),20.5);
  // Focus loss does not award off-screen wall-clock catch-up.
  fresh();run("frame(0);frame(300)");window.dispatch("blur");run("frame(90000)");near(run("player.health"),20);
  run("frame(90200)");near(run("player.health"),20.5);
  // New run clears the remainder and starts with the selected full resources.
  fresh();run("regenerateResources(499);startRun();floor.enemies=[];");near(run("regenerationElapsedMs"),0);
  near(run("player.health"),run("player.maxHealth"));near(run("player.energy"),100);
  run("player.health=50;regenerateResources(1)");near(run("player.health"),50);
  // Lethal damage cannot be healed by the tick later in the same frame.
  fresh();run(`Object.assign(player,{x:160,y:160,health:1,armor:0});
    floor.enemies=[{...enemySpawn,x:178,y:160,strength:100,state:'windup',remaining:.01,direction:Math.PI}];
    frame(0);regenerationElapsedMs=490;frame(20);`);
  near(run("player.health"),0);assert(run("player.finished"));
  console.log(JSON.stringify({result:"passed",periodSeconds:10,tickSeconds:.5,
    cases:"20 ticks per period; Vigor and Vontade; fractions; FPS independence; maxima; no banking; UI; actual frame and skill cost; energy guard before/after regen tick; floor/focus/restart/death"},null,2));
}
main().catch(error=>{console.error(error);process.exitCode=1;});
