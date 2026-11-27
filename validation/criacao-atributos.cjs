const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const {setup} = require("./harness.cjs");

async function main() {
  const {run,elements,races,classes,stats,inventory} = await setup();
  const base = {health:100,energy:100,armor:10,strength:10,stamina:10,willpower:10,intellect:10,
    fireResistance:0,iceResistance:0,poisonResistance:0,lightningResistance:0};
  const racial = {human:{},goblin:{health:-20,stamina:5},skeleton:{armor:-5,willpower:5},
    draconic:{health:20,stamina:5,intellect:-5,willpower:-5}};
  const professional = {
    adventurer:{stamina:5,fireResistance:10,iceResistance:10,poisonResistance:10,lightningResistance:10},
    guardian:{health:20,armor:5},
    elementalist:{fireResistance:20,iceResistance:20,poisonResistance:20,lightningResistance:20},
    alchemist:{poisonResistance:30,lightningResistance:30}
  };
  const names = {human:"Humano",goblin:"Goblin",skeleton:"Esqueleto",draconic:"Dracônico",
    adventurer:"Aventureiro",guardian:"Guardião",elementalist:"Elementalista",alchemist:"Alquimista"};
  const selected = list => list.find(option=>option.checked).value;
  const choose = (list,value) => list.forEach(option=>option.checked=option.value===value);
  let combinations = 0;
  for (const race of Object.keys(racial)) for (const characterClass of Object.keys(professional)) {
    choose(races,race);choose(classes,characterClass);
    run("updateCharacter()");
    const expected = {...base};
    for (const changes of [racial[race],professional[characterClass]]) {
      for (const [key,amount] of Object.entries(changes)) expected[key]+=amount;
    }
    for (const [key,value] of Object.entries(expected)) {
      assert.equal(String(elements.get("creation-"+key).textContent),String(value),`${race}/${characterClass} ${key}`);
    }
    assert.equal(elements.get("preview").dataset.appearance,`${race}-${characterClass}`);
    assert.equal(elements.get("inventory-portrait").dataset.appearance,`${race}-${characterClass}`);
    assert.equal(elements.get("race-current").textContent,names[race]);
    assert.equal(elements.get("class-current").textContent,names[characterClass]);
    assert.equal(elements.get("race-trait-name").textContent,names[race]);
    assert.equal(elements.get("class-trait-name").textContent,names[characterClass]);
    assert(elements.get("race-trait-description").textContent.length>10);
    assert(elements.get("class-trait-description").textContent.length>10);
    elements.get("start").dispatch("click");
    const player = run("player");
    for (const [key,value] of Object.entries(expected)) assert.equal(player[key],value,`Run ${race}/${characterClass} ${key}`);
    assert.equal(player.maxHealth,expected.health);
    assert.equal(player.maxEnergy,100);
    assert.equal(elements.get("health").textContent,`Vida ${expected.health}/${expected.health}`);
    assert.equal(elements.get("inventory-health").textContent,`${expected.health}/${expected.health}`);
    run("showCharacterSheet()");
    for (const field of stats) {
      if (Object.hasOwn(expected,field.dataset.stat)) assert.equal(String(field.textContent),
        field.dataset.stat==="energy"?"100/100":String(expected[field.dataset.stat]));
    }
    assert(!Object.hasOwn(player,"magic"),"Energy is the actual player resource");
    assert.equal(player.spells.length,0,"Future skills remain descriptions");
    combinations++;
  }

  run("const savedCreationRandom = Math.random;");
  for (const [type,list,other] of [["race",races,classes],["class",classes,races]]) {
    const otherBefore=selected(other);
    choose(list,list[0].value);run("updateCharacter()");
    elements.get(type+"-previous").dispatch("click");
    assert.equal(selected(list),list.at(-1).value,"Previous wraps to last");
    elements.get(type+"-next").dispatch("click");
    assert.equal(selected(list),list[0].value,"Next wraps to first");
    for (let i=0;i<list.length*2;i++) {
      elements.get(type+"-next").dispatch("click");
      const index=(i+1)%list.length;
      assert.equal(selected(list),list[index].value);
      assert.equal(elements.get(type+"-neighbor-previous").textContent,names[list[(index+3)%4].value]);
      assert.equal(elements.get(type+"-neighbor-next").textContent,names[list[(index+1)%4].value]);
      assert.equal(list.filter(option=>option.checked).length,1);
    }
    for (const roll of [0,.249999,.25,.499999,.5,.749999,.75,.999999]) {
      run(`Math.random=()=>${roll}`);
      elements.get(type+"-random").dispatch("click");
      assert.equal(selected(list),list[Math.floor(roll*4)].value,"Dice uses all four equal intervals");
      assert.equal(selected(other),otherBefore,"Dice changes only its own row");
      assert.equal(elements.get(type+"-current").textContent,names[selected(list)]);
    }
    run("Math.random=savedCreationRandom");
  }

  // Entry rolls exactly once for each selector, even after returning from a run.
  for (const [a,b] of [[0,.999999],[.5,.25],[.75,0]]) {
    inventory.close();
    run(`showMenu();globalThis.entryRolls=[${a},${b}];globalThis.entryRollCount=0;
      Math.random=()=>{entryRollCount++;return entryRolls.shift();};`);
    elements.get("play").dispatch("click");
    assert.equal(selected(races),races[Math.floor(a*4)].value);
    assert.equal(selected(classes),classes[Math.floor(b*4)].value);
    assert.equal(run("entryRollCount"),2);
    assert.equal(elements.get("menu").hidden,true);
    assert.equal(elements.get("character-create").hidden,false);
    assert.equal(elements.get("game").hidden,true);
  }
  run("Math.random=savedCreationRandom");
  choose(races,"goblin");choose(classes,"guardian");run("updateCharacter()");
  elements.get("start").dispatch("click");
  run("player.health=1;player.energy=2;player.finished=true;showHealth()");
  assert.equal(elements.get("health").textContent,"Vida 1/100");
  elements.get("reset").dispatch("click");
  assert.equal(run("player.health"),100);
  assert.equal(run("player.energy"),100);
  assert.equal(run("player.race"),"goblin");
  assert.equal(run("player.characterClass"),"guardian");
  assert.equal(run("player.finished"),false);
  assert.equal(run("calculateDamage(10,{damage:{min:1,max:1}},5)"),6);
  assert.equal(run("calculateDamage(enemySpawn.strength,null,player.armor)"),0,
    "Current enemy balance is explicitly unchanged");

  const root=path.resolve(__dirname,"..");
  const html=fs.readFileSync(path.join(root,"index.html"),"utf8");
  const css=fs.readFileSync(path.join(root,"style.css"),"utf8");
  assert(!html.includes("data-stat=\"magic\""));
  assert(!html.includes("<dt>Magia</dt>"));
  assert.equal([...html.matchAll(/class="selector-dice"/g)].length,2);
  assert.equal([...html.matchAll(/class="selector-arrow"/g)].length,4);
  assert(css.includes(".creation-stat-panel"));
  assert(css.includes(".creation-traits"));
  console.log(JSON.stringify({result:"passed",combinations,
    cases:"Visible stats, traits, preview and run agree; arrows wrap; dice are independent and uniform; entry rolls twice; energy, restart and combat regression",
    limitation:"No browser layout or pointer hit-area verification"},null,2));
}
main().catch(error=>{console.error(error);process.exitCode=1;});
