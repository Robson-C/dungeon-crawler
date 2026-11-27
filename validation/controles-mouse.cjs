const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const {setup,itemName} = require("./harness.cjs");

async function main() {
  const {run,bag,inventory,clickWorld,elements,window} = await setup();
  const room=elements.get("room"),button=elements.get("open-inventory");
  let elapsed=0;
  function scene(extra="") {
    inventory.close();
    run(`floor=generateFloor(19061,1);floor.tiles.fill(0);
      for(let y=1;y<rows-1;y++)for(let x=1;x<columns-1;x++)floor.tiles[y*columns+x]=1;
      floor.enemies=[];floor.drops=[];floor.stairs={left:800,right:832,top:400,bottom:432};
      Object.assign(player,{x:160,y:80,health:100,maxHealth:100,energy:100,maxEnergy:100,strength:10,armor:10,finished:false});
      clearPlayerOrder();clearSwings();inventoryView.reset();gameTime=0;previous=null;stride=0;
      ${extra};updateCamera();frame(0);`);
    elapsed=0;
  }
  function step(count=1) {
    for(let i=0;i<count;i++) {
      elapsed+=50;
      run(`gameTime=${elapsed};updatePlayerOrder(gameTime,.05)`);
      assert(run("clearFloor(player.x,player.y,radius)"),"Every movement step stays on the floor");
      assert(run("canStand(player.x,player.y)"),"Every movement step avoids live enemies");
    }
  }
  function arrive(limit=400) {
    for(let i=0;i<limit&&run("playerOrder!==null");i++)step();
    assert.equal(run("playerOrder"),null,"The order must complete instead of oscillating at a waypoint");
  }

  // Actual event coordinates respect the canvas size and the last rendered camera.
  scene();clickWorld(230,100);assert.equal(run("playerOrder.type"),"move");
  assert(Math.abs(run("playerOrder.target.x")-230)<.001);
  arrive();assert(Math.hypot(run("player.x")-230,run("player.y")-100)<=.35);
  scene("player.x=500;player.y=300");
  room.bounds={left:230,top:40,right:678,bottom:296,width:448,height:256};
  clickWorld(560,330);arrive();
  assert(Math.hypot(run("player.x")-560,run("player.y")-330)<=.35);
  room.bounds={left:100,top:80,right:996,bottom:592,width:896,height:512};

  // A wall requires a detour through its opening, not sliding into the wall.
  scene("player.x=80;for(let y=1;y<=9;y++)floor.tiles[y*columns+9]=0");
  clickWorld(230,80);
  let lowest=80;
  for(let i=0;i<400&&run("playerOrder!==null");i++){step();lowest=Math.max(lowest,run("player.y"));}
  assert.equal(run("playerOrder"),null);assert(lowest>=165,"The route goes around the wall's bottom");
  assert(Math.hypot(run("player.x")-230,run("player.y")-80)<=.35);
  scene("player.x=80;for(let y=1;y<rows-1;y++)floor.tiles[y*columns+9]=0");
  clickWorld(230,80);step();
  assert.equal(run("playerOrder"),null);assert.equal(run("player.x"),80);
  assert.equal(elements.get("game-feedback").textContent,"Caminho bloqueado.");

  // Live actors are obstacles for both route planning and smoothing.
  scene("floor.enemies=[{...enemySpawn,x:194,y:80,state:'recovery',remaining:1000}]");
  clickWorld(240,80);arrive();assert(Math.abs(run("player.x")-240)<=.35);
  scene();clickWorld(250,80);step(2);
  run("floor.enemies=[{...enemySpawn,x:204,y:80,state:'recovery',remaining:1000}]");
  arrive();assert(Math.abs(run("player.x")-250)<=.35);
  scene();clickWorld(240,80);step();
  run("updateCamera()");clickWorld(160,120);arrive();
  assert(Math.hypot(run("player.x")-160,run("player.y")-120)<=.35,"A new click replaces the destination");
  clickWorld(160,140,2);assert.equal(run("playerOrder"),null,"A secondary click does not issue an order");
  room.dispatch("click",{button:0,clientX:0,clientY:0});assert.equal(run("playerOrder"),null);

  // Click the upper body: approach, face the target and repeat the common swing.
  scene("floor.enemies=[{...enemySpawn,x:245,y:80,health:30,state:'recovery',remaining:1000}]");
  clickWorld(245,62);assert.equal(run("playerOrder.type"),"attack");
  for(let i=0;i<100&&run("pendingSwingDirection===null");i++)step();
  assert(run("Math.hypot(player.x-245,player.y-80)<=attackDistance"));
  assert.equal(run("swing"),null,"Approaching queues rather than bypasses the animation");
  scene(`floor.enemies=[{...enemySpawn,x:178,y:80,health:30,state:'recovery',remaining:1000}];
    globalThis.originalMouseRandom=Math.random;Math.random=()=>.999999;`);
  clickWorld(178,62);
  const health=[];
  for(let time=50;time<=1100;time+=50){run(`frame(${time})`);health.push(run("floor.enemies[0].health"));}
  assert(health.includes(18)&&health.includes(6)&&health.includes(0),"One click produces three separate hits");
  assert.equal(run("playerOrder"),null,"A dead target ends the attack order");
  scene("floor.enemies=[{...enemySpawn,x:178,y:80,health:100,state:'recovery',remaining:1000}]");
  clickWorld(178,62);run("frame(50);frame(200)");
  const afterHit=run("floor.enemies[0].health");
  clickWorld(160,120);run("frame(350);frame(400);frame(550);frame(700)");
  assert.equal(run("floor.enemies[0].health"),afterHit,"A ground click stops repeated attacks");
  scene("player.x=80;for(let y=1;y<=9;y++)floor.tiles[y*columns+9]=0;floor.enemies=[{...enemySpawn,x:170,y:80,health:100}]");
  clickWorld(170,62);step(10);
  assert.equal(run("pendingSwingDirection"),null,"No attacks are queued through a wall");
  scene("floor.enemies=[{...enemySpawn,x:230,y:80,health:100,state:'recovery',remaining:1000}]");
  clickWorld(230,62);step(4);
  run("floor.enemies[0].x=250;floor.enemies[0].y=110");
  for(let i=0;i<100&&run("pendingSwingDirection===null");i++)step();
  assert(run("Math.hypot(player.x-250,player.y-110)<=attackDistance"),"The approach follows a moving target");

  // Selecting an item during its flight waits until it lands; collection happens once.
  scene("Math.random=()=>0;dropEnemyItem({health:0,x:190,y:80},0)");
  clickWorld(190,68);assert.equal(run("playerOrder.type"),"pickup");
  step(10);assert.equal(run("floor.drops.length"),1);assert(bag.every(slot=>itemName(slot)==="vazio"));
  step(4);assert.equal(run("floor.drops.length"),0);
  assert.equal(bag.filter(slot=>itemName(slot)!=="vazio").length,1);
  step(10);assert.equal(bag.filter(slot=>itemName(slot)!=="vazio").length,1,"No duplicate collection");
  scene("Math.random=()=>0;dropEnemyItem({health:0,x:160,y:80},-1000)");
  step(15);assert.equal(run("floor.drops.length"),1,"Standing on an item does not collect it");
  run("for(let i=0;i<24;i++)inventoryView.addItem(itemCatalog[0]);updateCamera()");
  clickWorld(run("floor.drops[0].x"),run("floor.drops[0].y-2"));step(5);
  assert.equal(run("floor.drops.length"),1);assert.equal(run("playerOrder"),null);
  assert.equal(elements.get("game-feedback").textContent,"Mochila cheia.");
  run("inventoryView.clearBag();updateCamera()");
  clickWorld(run("floor.drops[0].x"),run("floor.drops[0].y-2"));arrive();
  assert.equal(run("floor.drops.length"),0);

  // Inventory controls, dismissal without a movement click-through, and cancellation.
  scene();clickWorld(240,80);button.dispatch("click");
  assert(inventory.open);assert.equal(run("playerOrder"),null);
  assert.equal(button.getAttribute("aria-expanded"),"true");
  clickWorld(230,80);assert(!inventory.open);assert.equal(run("playerOrder"),null);
  clickWorld(230,80);assert.equal(run("playerOrder.type"),"move");
  button.dispatch("click");button.dispatch("click");assert(!inventory.open);
  assert.equal(button.getAttribute("aria-expanded"),"false");
  clickWorld(230,80);window.dispatch("keydown",{code:"Escape"});assert.equal(run("playerOrder"),null);
  clickWorld(230,80);window.dispatch("blur");assert.equal(run("playerOrder"),null);
  for(const code of ["KeyW","KeyA","KeyS","KeyD","ArrowRight","Space","KeyI"])window.dispatch("keydown",{code});
  const position=run("JSON.stringify({x:player.x,y:player.y})");run("frame(1500);frame(1550)");
  assert.equal(run("JSON.stringify({x:player.x,y:player.y})"),position);
  assert.equal(run("swing"),null);assert(!inventory.open,"Legacy keyboard controls are removed");
  clickWorld(230,80);run("enterFloor(depth+1)");assert.equal(run("playerOrder"),null);
  run("player.finished=true");clickWorld(run("player.x+20"),run("player.y"));assert.equal(run("playerOrder"),null);
  elements.get("reset").dispatch("click");assert.equal(run("playerOrder"),null);assert(!button.disabled);

  // Resource bars carry accessible values; the visible HUD contains no resource numbers.
  run("Object.assign(player,{health:25,maxHealth:100,energy:60,maxEnergy:120});showHealth()");
  assert.equal(elements.get("health-fill").style.transform,"scaleX(0.25)");
  assert.equal(elements.get("energy-fill").style.transform,"scaleX(0.5)");
  assert.equal(elements.get("health").getAttribute("aria-valuenow"),"25");
  assert.equal(elements.get("energy").getAttribute("aria-valuemax"),"120");
  assert.equal(elements.get("health").textContent,"");assert.equal(elements.get("energy").textContent,"");
  run("player.health=-5;player.energy=150;showHealth()");
  assert.equal(elements.get("health-fill").style.transform,"scaleX(0)");
  assert.equal(elements.get("energy-fill").style.transform,"scaleX(1)");
  run("Math.random=originalMouseRandom");
  const html=fs.readFileSync(path.join(__dirname,"..","index.html"),"utf8");
  assert(!html.includes("WASD")&&!html.includes("<kbd>Espaço</kbd>"),"Instructions describe mouse controls");
  assert(html.indexOf('id="open-inventory"')<html.indexOf('class="ability-panel"'));
  console.log(JSON.stringify({result:"passed",cases:"Scaled pointer/camera, exact arrival, wall detour, unreachable goal, live obstacles/replan, target approach, repeated hits/cancel/death, item landing/collection/full bag, inventory dismissal, legacy controls, floor/restart, accessible resource bars",
    limitation:"Real browser layout and pointer behavior remain unverified"},null,2));
}
main().catch(error=>{console.error(error);process.exitCode=1;});
