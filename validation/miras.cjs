const assert=require("node:assert/strict");
const fs=require("node:fs"),path=require("node:path");
const {setup}=require("./harness.cjs");

async function main(){
  const {run,elements,window,raster}=await setup();
  const fresh=()=>run(`abilities.reset();Object.assign(player,{x:160,y:160,health:100,maxHealth:100,energy:100,maxEnergy:100,strength:20,intellect:10,stamina:0,willpower:0,finished:false});
    floor.tiles.fill(1);floor.enemies=[];gameTime=0;previous=null;regenerationElapsedMs=0;inventory.close();game.hidden=false;
    clearPlayerOrder();clearSwings();doubleUntil=0;playerMoved=false;stride=0;lastDirection=0;`);
  const aim=id=>{run(`abilities.assign(0,'${id}')`);window.dispatch("keydown",{code:"Digit1"});};
  const confirm=point=>run(`abilities.confirm(${JSON.stringify(point)})`);
  const image=raster.createCanvas(1000,600),ink=image.getContext("2d");
  const ctx=elements.get("room").getContext("2d");
  const log=[];const original=new Map();
  for(const name of ["arc","moveTo","lineTo","translate","ellipse","setLineDash"]){
    original.set(name,ctx[name].bind(ctx));
    ctx[name]=(...args)=>{log.push({name,args});return original.get(name)(...args);};
  }
  function draw(point){log.length=0;run(`abilities.draw(ctx,${JSON.stringify(point)})`);return [...log];}
  function capture(index,label,point){
    run(`ctx.resetTransform();ctx.clearRect(0,0,canvas.width,canvas.height);ctx.setTransform(3,0,0,3,-160*3+canvas.width/2,-150*3+canvas.height/2);drawRoom(gameTime,160-view.width/2,150-view.height/2);drawPlayer(gameTime);`);
    draw(point);const x=index%2*500,y=Math.floor(index/2)*200;
    ink.drawImage(elements.get("room").surface,896-140,512-100,500,200,x,y,500,200);
    ink.fillStyle="#14242b";ink.fillRect(x,y,500,22);ink.fillStyle="#f3dfb8";ink.font="14px sans-serif";ink.fillText(label,x+8,y+16);
  }
  // Body-centered aiming and cast effects must share the same projection.
  for(const id of ["double","fire"]){
    fresh();aim(id);const point={x:210,y:150},calls=draw(point);
    assert(!calls.some(call=>call.name==="setLineDash"),"No dashed range circle");
    const arc=calls.find(call=>call.name==="arc"),start=calls.find(call=>call.name==="moveTo");
    assert.deepEqual(start.args,[160,150]);assert.equal(arc.args[0],160);assert.equal(arc.args[1],150);
    assert(arc.args[4]-arc.args[3]<Math.PI,"Only the frontal cone is shown");
    assert(confirm(point));const effect=run("abilities.inspect().effects[0]");
    assert.equal(effect.x,160);assert.equal(effect.y,150);assert.equal(effect.angle,0);
    const effectCalls=draw(point);assert(effectCalls.some(call=>call.name==="moveTo"&&call.args[0]===160&&call.args[1]===150));
  }
  // Each cardinal aim agrees with projected enemy centers while retaining
  // the original floor coordinates for collision and line of sight.
  for(const angle of [0,Math.PI/2,Math.PI,-Math.PI/2]){
    fresh();run(`floor.enemies=[{...enemySpawn,x:160+Math.cos(${angle})*40,y:160+Math.sin(${angle})*40,health:100}];`);
    aim("fire");assert(confirm({x:160+Math.cos(angle)*60,y:150+Math.sin(angle)*60}));
    assert.equal(run("floor.enemies[0].health"),85,"Cone faces selected direction");
  }
  fresh();aim("fire");capture(0,"Cone — origem no centro do corpo",{x:215,y:150});
  // Hook preview is a filled trajectory strip, clipped before a wall.
  fresh();aim("hook");let calls=draw({x:250,y:150});
  assert(!calls.some(call=>call.name==="setLineDash"));assert(!calls.some(call=>call.name==="arc"),"Hook has no range circle");
  assert(calls.filter(call=>call.name==="lineTo").length>=3,"Hook shows an area rather than one beam");
  capture(1,"Gancho — faixa de trajetória",{x:250,y:150});
  run("floor.tiles[tileAt(184,160)]=0");calls=draw({x:250,y:150});
  const maximumX=Math.max(...calls.filter(call=>call.name==="lineTo").map(call=>call.args[0]));assert(maximumX<=22,"Preview ends before obstructing wall");
  fresh();aim("hook");assert(confirm({x:250,y:150}));run("gameTime=250;abilities.tick(.25)");
  calls=draw({x:250,y:150});assert(calls.some(call=>call.name==="translate"&&call.args[0]===160&&call.args[1]===150));
  assert(calls.filter(call=>call.name==="ellipse").length>=10,"Visible individual chain links");
  capture(2,"Gancho lançado — elos e ponta metálica",{x:250,y:150});
  // Ground casts have no distance cap; existing wall and floor constraints stay.
  for(const id of ["poison","decoy"]){
    fresh();aim(id);const point={x:700,y:320},calls=draw(point);
    assert(!calls.some(call=>call.name==="setLineDash"));
    const arcs=calls.filter(call=>call.name==="arc");assert.equal(arcs.length,1);assert.deepEqual(arcs[0].args.slice(0,2),[700,320]);
    assert(confirm(point),"Ground cast beyond previous range succeeds");
    assert.equal(run("player.energy"),id==="poison"?78:84);
    if(id==="poison"){
      run("gameTime=350;abilities.tick(.05)");const pool=run("abilities.inspect().effects.find(e=>e.kind==='poison')");assert.equal(pool.x,700);assert.equal(pool.y,320);
    }else assert.equal(run("abilities.inspect().decoy.x"),700);
    fresh();run("for(let y=0;y<rows;y++)floor.tiles[y*columns+20]=0");aim(id);
    assert.equal(confirm(point),false,"Distant point behind wall rejected");assert.equal(run("player.energy"),100);assert(run("abilities.isAiming()"));
    assert(elements.get("ability-feedback").textContent.includes("visão direta"));
    fresh();run("floor.tiles[tileAt(500,200)]=0");aim(id);assert.equal(confirm({x:500,y:200}),false,"Solid destination rejected");
    assert.equal(run("player.energy"),100);assert.equal(confirm({x:-10,y:100}),false);
  }
  // Target-based skills retain their original ranges.
  fresh();run("floor.enemies=[{...enemySpawn,x:310,y:160,health:100}];");aim("ice");assert.equal(confirm({x:310,y:150}),false);
  fresh();aim("poison");capture(3,"Frasco — só a área de efeito no chão",{x:200,y:165});
  fresh();aim("fire");assert(confirm({x:220,y:150}));run("gameTime=100");capture(4,"Sopro lançado — centro do corpo",{x:220,y:150});
  fresh();aim("decoy");capture(5,"Isca — só o local selecionado",{x:205,y:160});
  for(const[name,method]of original)ctx[name]=method;
  const out=path.join(__dirname,"output");fs.mkdirSync(out,{recursive:true});fs.writeFileSync(path.join(out,"miras-centrais.png"),image.toBuffer("image/png"));
  console.log(JSON.stringify({result:"passed",cases:"No range circles; body-centered aim and effect in four directions; hook strip and chain links; distant ground casts; wall/floor validation; target ranges preserved",preview:"validation/output/miras-centrais.png"},null,2));
}
main().catch(error=>{console.error(error);process.exitCode=1;});
