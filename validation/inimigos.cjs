const fs = require("node:fs");
const path = require("node:path");
const assert = require("node:assert/strict");
const sharp = require(require.resolve("sharp",{paths:[path.dirname(process.execPath)]}));
const {setup} = require("./harness.cjs");
const root=path.resolve(__dirname,"..");

async function main() {
  const {run,calls,loaded,elements,raster}=await setup();
  const definitions=run("enemyArtData");
  const ids=Object.keys(definitions);
  assert.equal(ids.length,5);
  let sourceFrames=0,draws=0;
  for(const [id,definition] of Object.entries(definitions)) {
    const sheet=loaded.get(definition.image);
    assert(sheet,definition.image);
    assert.equal(sheet.width,1536);assert.equal(sheet.height,960);
    assert.equal(definition.frames.length,40);
    const {data,info}=await sharp(path.join(root,definition.image)).ensureAlpha().raw().toBuffer({resolveWithObject:true});
    for(const [index,frame]of definition.frames.entries()) {
      assert(frame.visiblePixels>150);
      assert.equal(frame.x,index%8*192);assert.equal(frame.y,Math.floor(index/8)*192);
      assert(frame.ground>=1&&frame.ground<=192);
      assert(frame.bounds.right<192&&frame.bounds.bottom<192);
      let clear=0;
      for(let y=0;y<192;y++)for(let x=0;x<192;x++)if(data[((frame.y+y)*info.width+frame.x+x)*4+3]<16)clear++;
      assert(clear>192*192*.1,"Real transparency in "+id+" frame "+index);
      sourceFrames++;
    }
  }
  const directions=[0,Math.PI/4,Math.PI/2,3*Math.PI/4,Math.PI,-3*Math.PI/4,-Math.PI/2,-Math.PI/4];
  const expectedRows=[0,3,1,3,0,4,2,4];
  const poses=[{state:"idle",moving:false,stride:0,pose:0},
    ...[0,3.5,7,10.5].map(stride=>({state:"chase",moving:true,stride,pose:1+Math.floor(stride/3.5)})),
    {state:"windup",remaining:.3,pose:5},
    {state:"recovery",remaining:.7,pose:6},
    {state:"recovery",remaining:.4,pose:7},
    {state:"recovery",remaining:.1,pose:0}];
  for(const id of ids)for(const [octant,direction]of directions.entries())for(const test of poses)for(const hit of [false,true]) {
    run(`globalThis.poseEnemy={...enemySpawn,type:'${id}',x:100,y:100,direction:${direction},lookDirection:${direction},
      recoveryDuration:.75,flashUntil:${hit?200:0},moving:false,...${JSON.stringify(test)}};
      ctx.resetTransform();ctx.clearRect(0,0,canvas.width,canvas.height);`);
    calls.length=0;run("drawTarget(poseEnemy,100)");
    const sprite=calls.find(call=>call.src===definitions[id].image);
    assert(sprite,"Chosen enemy sheet drawn");
    assert.equal(sprite.args[0],test.pose*192);
    assert.equal(sprite.args[1],expectedRows[octant]*192);
    assert.equal(sprite.matrix[0],octant>=3&&octant<=5?-1:1,"Left views mirror");
    assert(!calls.some(call=>call.src==="assets/gameplay-props.png"),"New types never receive the old spear");
    draws++;
  }
  run("globalThis.poseEnemy.health=0");calls.length=0;run("drawTarget(poseEnemy,100)");
  assert.equal(calls.length,0,"Dead enemies disappear");
  // A missing atlas still draws the existing fallback rather than crashing.
  const missing=loaded.get(definitions.rat.image);loaded.delete(definitions.rat.image);
  run("globalThis.fallbackArt=createGameplayArt();globalThis.fallbackEnemy={...enemySpawn,type:'rat',x:100,y:100};");
  assert.equal(run("fallbackArt.enemy(ctx,fallbackEnemy,0)"),false);
  loaded.set(definitions.rat.image,missing);

  // The integrated baseline doubles enemy counts; the test has no dependency on local backups.
  const seen=new Set();
  for(let seed=0;seed<100;seed++) {
    run(`globalThis.actualFloor=generateFloor(${seed},${seed%12+1});`);
    assert([4,6,8,10].includes(run("actualFloor.enemies.length")));
    assert(run("actualFloor.enemies.every(e=>e.health===3&&e.strength===1&&e.armor===0&&actualFloor.tiles[tileAt(e.x,e.y)])"));
    const types=run("actualFloor.enemies.map(e=>e.type)");types.forEach(id=>{assert(ids.includes(id));seen.add(id);});
    assert.equal(run(`JSON.stringify(generateFloor(${seed},${seed%12+1}))`),run("JSON.stringify(actualFloor)"),"Seed reproduces the map, positions and variants");
  }
  assert.equal(seen.size,5,"All families reachable");

  run("floor.tiles.fill(1);player.finished=false;player.x=200;player.y=200;clearPlayerOrder();clearSwings();");
  for(const id of ids)for(const direction of directions) {
    run(`globalThis.motionEnemy={...enemySpawn,type:'${id}',x:200-Math.cos(${direction})*30,y:200-Math.sin(${direction})*30,
      moving:false,stride:0,lookDirection:0};floor.enemies=[motionEnemy];updateEnemy(motionEnemy,10,.02);`);
    assert(run("motionEnemy.moving"));
    assert(Math.abs(run("motionEnemy.stride")-.98)<1e-6,"Distance controls cycle");
    assert(Math.abs(run("motionEnemy.lookDirection")-direction)<1e-6,"Actual motion faces correct direction");
    run("motionEnemy.x=500;motionEnemy.y=400;updateEnemy(motionEnemy,20,.02)");
    assert.equal(run("motionEnemy.moving"),false);
    assert.equal(run("gameplayArt.enemyPose(motionEnemy)"),0,"Idle does not walk in place");

    run(`globalThis.hitEnemy={...enemySpawn,type:'${id}',x:200-Math.cos(${direction})*16,y:200-Math.sin(${direction})*16,
      strength:7,direction:${direction},state:'idle'};floor.enemies=[hitEnemy];player.health=100;player.armor=2;
      updateEnemy(hitEnemy,0,.01);`);
    assert.equal(run("hitEnemy.state"),"windup");assert.equal(run("player.health"),100);
    run("updateEnemy(hitEnemy,100,.2)");assert.equal(run("player.health"),100,"Preparation does not damage early");
    const locked=run("hitEnemy.direction");
    run("updateEnemy(hitEnemy,560,.4)");
    assert.equal(run("player.health"),95,"Impact uses existing strength minus armor");
    assert.equal(run("hitEnemy.state"),"recovery");
    assert.equal(run("gameplayArt.enemyPose(hitEnemy)"),6);
    run("updateEnemy(hitEnemy,600,.04)");assert.equal(run("player.health"),95,"One hit per attack");
    assert.equal(run("hitEnemy.direction"),locked,"Attack direction stays locked");
    run("hitEnemy.remaining=.4");assert.equal(run("gameplayArt.enemyPose(hitEnemy)"),7);
    run("hitEnemy.remaining=.1");assert.equal(run("gameplayArt.enemyPose(hitEnemy)"),0);

    // Moving out of the locked strike direction dodges the attack.
    run(`player.x=200;player.y=200;player.health=100;hitEnemy.x=200-Math.cos(${direction})*16;
      hitEnemy.y=200-Math.sin(${direction})*16;hitEnemy.state='windup';hitEnemy.remaining=.01;
      player.x=hitEnemy.x+Math.cos(${direction}+Math.PI/2)*30;
      player.y=hitEnemy.y+Math.sin(${direction}+Math.PI/2)*30;updateEnemy(hitEnemy,900,.02);`);
    assert.equal(run("player.health"),100,"Dodge misses");
    run("player.x=200;player.y=200");
  }
  // Blocked chase freezes the stride; walls and enemy separation remain enforced.
  run(`player.x=250;player.y=200;globalThis.blockedEnemy={...enemySpawn,type:'rat',x:225,y:200,stride:7,state:'chase'};
    floor.enemies=[blockedEnemy];floor.tiles.fill(0);updateEnemy(blockedEnemy,0,.02);`);
  assert.equal(run("blockedEnemy.moving"),false);assert.equal(run("blockedEnemy.stride"),7);
  assert.equal(run("gameplayArt.enemyPose(blockedEnemy)"),0);
  run(`floor.tiles.fill(1);player.x=200;player.y=200;globalThis.wallEnemy={...enemySpawn,type:'armor',x:216,y:200,
    direction:Math.PI,state:'windup',remaining:.01,strength:99};floor.enemies=[wallEnemy];player.health=100;
    floor.tiles[tileAt(208,200)]=0;updateEnemy(wallEnemy,0,.02);`);
  assert.equal(run("player.health"),100,"No hit through wall");
  // All types can be killed by the real player sword hit routine.
  for(const id of ids) {
    run(`floor.tiles.fill(1);player.x=160;player.y=160;player.strength=10;player.finished=false;
      floor.enemies=[{...enemySpawn,type:'${id}',x:178,y:160}];
      swing={direction:0,started:0,checked:0,hit:false,x:160,y:160};checkSwordHit(150);`);
    assert.equal(run("floor.enemies[0].health"),0,id+" receives sword damage");
  }
  // Real frame loop includes all five families without repeating source updates.
  run(`player.x=400;player.y=240;player.finished=false;player.health=100;floor.tiles.fill(1);clearSwings();
    floor.enemies=enemyFamilies.map((type,i)=>({...enemySpawn,type,x:350+i*22,y:270,stride:0}));
    floor.stairs={left:800,right:830,top:400,bottom:430};gameTime=0;previous=null;clearPlayerOrder();frame(0);frame(50);`);
  assert.equal(run("floor.enemies.length"),5);
  const result={result:"passed",sourceFrames,draws,seedComparisons:100,directions:8,families:5,
    cases:"Directional sprites, mirrored left views, stride/stop, impact/recovery, single hit, dodge, walls, sword kills, deterministic cosmetic pool and unchanged map/count/stats",
    limitation:"Local Canvas/DOM tests; browser visual verification pending"};
  fs.writeFileSync(path.join(root,"docs/inimigos/validacao-animacoes.json"),JSON.stringify(result,null,2)+"\n");
  console.log(JSON.stringify(result,null,2));
}
main().catch(error=>{console.error(error);process.exitCode=1;});
