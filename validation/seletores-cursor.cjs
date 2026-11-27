const fs = require("node:fs");
const path = require("node:path");
const assert = require("node:assert/strict");
const sharp = require(require.resolve("sharp",{paths:[path.dirname(process.execPath)]}));
const {setup,itemName} = require("./harness.cjs");

async function main() {
  const {run,elements,races,classes,document,window,bag,equipment,inventory,drag,weaponSlot,raster,loaded}=await setup();
  assert(bag.every(slot=>itemName(slot)==="vazio"),"A new character has no test items");
  assert.equal(equipment.filter(slot=>itemName(slot)!=="vazio").length,1);
  run("inventoryView.addItem(itemCatalog.find(item=>item.category==='head'));inventoryView.addItem(gameItems.curvedSabre)");
  let clicks=0;
  for(const [type,list,other] of [["race",races,classes],["class",classes,races]]) {
    const otherBefore=other.find(option=>option.checked).value;
    for(const start of list) for(const [suffix,offset] of [["neighbor-previous",-1],["current",0],["neighbor-next",1]]) {
      list.forEach(option=>option.checked=option===start);
      run("updateCharacter()");
      const index=list.indexOf(start),expected=list[(index+offset+4)%4].value;
      const button=elements.get(type+"-"+suffix);
      const visibleName=button.textContent;
      button.dispatch("click",{detail:clicks%2});
      assert.equal(list.find(option=>option.checked).value,expected,"Click selects the visible option");
      assert.equal(elements.get(type+"-current").textContent,visibleName);
      assert.equal(elements.get(type+"-trait-name").textContent,visibleName);
      assert.equal(other.find(option=>option.checked).value,otherBefore,"Other selector stays unchanged");
      const selectedRace=races.find(option=>option.checked).value;
      const selectedClass=classes.find(option=>option.checked).value;
      assert.equal(elements.get("preview").dataset.appearance,selectedRace+"-"+selectedClass);
      assert.equal(list.filter(option=>option.checked).length,1);
      for(const part of ["neighbor-previous","current","neighbor-next"]) {
        assert.equal(elements.get(type+"-"+part).getAttribute("aria-pressed"),part==="current"?"true":"false");
      }
      clicks++;
    }
  }
  const held=()=>document.documentElement.classList.contains("holding-item");
  const press=(slot,pointerId=17,extra={})=>slot.dispatch("pointerdown",{
    pointerId,isPrimary:true,button:0,clientX:100,clientY:100,...extra
  });
  const release=(slot,pointerId=17)=>{
    document.hit=slot;
    inventory.dispatch("pointerup",{pointerId,clientX:100,clientY:100});
  };
  const empty=bag.find(slot=>itemName(slot)==="vazio");
  assert(empty);assert(!held());
  press(empty);assert(!held(),"Empty slots do not close the glove");
  press(weaponSlot,17,{button:2});assert(!held(),"Right button does not grab");
  press(weaponSlot,17,{isPrimary:false});assert(!held(),"Secondary pointer does not grab");
  press(weaponSlot);assert(held(),"Glove closes on press before any movement");
  release(weaponSlot,99);assert(held(),"Unrelated pointer cannot release another drag");
  release(weaponSlot);assert(!held(),"A stationary click releases the glove");
  assert.equal(itemName(weaponSlot),"Espada de guarda reta");

  // A real drag still uses category restrictions and the existing swap rules.
  const head=bag.find(slot=>itemName(slot)!=="vazio"&&slot!==weaponSlot);
  const sourceName=itemName(head);
  drag(head,weaponSlot);
  assert(!held());assert.equal(itemName(head),sourceName);
  assert.equal(itemName(weaponSlot),"Espada de guarda reta","Invalid category keeps equipped weapon");
  drag(weaponSlot,empty);assert(!held());assert.equal(itemName(empty),"Espada de guarda reta");
  drag(empty,weaponSlot);assert(!held());
  const sabre=bag.find(slot=>itemName(slot)==="Sabre de lâmina curva");
  drag(sabre,weaponSlot);assert(!held());
  assert.equal(itemName(weaponSlot),"Sabre de lâmina curva");

  let cleanupCases=0;
  for(const end of ["pointercancel","lostpointercapture","blur","close","reset","clearBag","outside"]) {
    inventory.show();press(weaponSlot);assert(held());
    if(end==="blur")window.dispatch("blur");
    else if(end==="close")inventory.close();
    else if(end==="reset")run("inventoryView.reset()");
    else if(end==="clearBag")run("inventoryView.clearBag()");
    else if(end==="outside")release(undefined);
    else inventory.dispatch(end,{pointerId:17});
    assert(!held(),end+" releases cursor");
    assert.equal(weaponSlot.capture,null,end+" releases pointer capture");
    cleanupCases++;
  }
  inventory.close();press(weaponSlot);assert(!held(),"Closed inventory cannot grab");

  const root=path.resolve(__dirname,"..");
  const css=fs.readFileSync(path.join(root,"style.css"),"utf8");
  // Delegated capture guards apply even while the game/menu is hidden or a dialog is open.
  let nativeGuardCases=0;
  const surfaces=[document.body,...["menu","play","character-create","preview","race-current","class-current",
    "instructions","game","room","inventory","ability-picker","ability-choices","item-catalog","item-tooltip","end"]
    .map(id=>elements.get(id)),weaponSlot,bag[0],elements.get("ability-choices").children[0]];
  for(const target of surfaces)for(const type of ["contextmenu","selectstart","dragstart"]){
    let prevented=false;
    document.dispatch(type,{target,preventDefault(){prevented=true;}});
    assert(prevented,type+" is blocked on "+(target.id||target.tagName));nativeGuardCases++;
  }
  for(const modifier of ["ctrlKey","metaKey"]){
    let prevented=false;
    document.dispatch("keydown",{code:"KeyA",[modifier]:true,preventDefault(){prevented=true;}});
    assert(prevented,"Select all is blocked with "+modifier);nativeGuardCases++;
  }
  for(const values of [{code:"Tab"},{code:"Enter"},{code:"Space"},{code:"Digit1"},{code:"KeyR"},
    {code:"KeyA"},{code:"KeyC",ctrlKey:true}]){
    let prevented=false;
    document.dispatch("keydown",{...values,preventDefault(){prevented=true;}});
    assert(!prevented,"The native selection guard leaves other controls alone: "+values.code);
  }
  assert(/\*\s*\{[^}]*-webkit-user-select:\s*none;[^}]*user-select:\s*none;/s.test(css));
  assert(/img\s*\{[^}]*-webkit-user-drag:\s*none;/s.test(css));
  inventory.close();
  run("abilities.assign(0,'fire')");window.dispatch("keydown",{code:"Digit1"});assert(run("abilities.isAiming()"));
  elements.get("room").dispatch("pointerdown",{button:2});assert(!run("abilities.isAiming()"),"Right click still cancels aiming");
  assert(css.includes("html.holding-item * { cursor: var(--cursor-closed) !important; }"));
  assert(css.includes("cursor: var(--cursor-open)"));
  assert(css.includes("border-image: url(\"assets/creation-selector-plaque.png\")"));
  for(const state of ["point","open","closed"]) {
    const file=path.join(root,"assets/cursors/glove-"+state+".png");
    const {data,info}=await sharp(file).ensureAlpha().raw().toBuffer({resolveWithObject:true});
    assert.equal(info.width,48);assert.equal(info.height,48);
    let clear=0,drawn=0;
    for(let i=3;i<data.length;i+=4){if(data[i]===0)clear++;if(data[i]>128)drawn++;}
    assert(clear>48*48*.4,"Transparent margin");
    assert(drawn>48*48*.2,"Readable glove content");
    for(let x=0;x<48;x++){assert.equal(data[x*4+3],0);assert.equal(data[(47*48+x)*4+3],0);}
    assert(css.includes("assets/cursors/glove-"+state+".png"));
  }
  const point=await sharp(path.join(root,"assets/cursors/glove-point.png")).raw().toBuffer();
  assert(point[(7*48+8)*4+3]>16,"Point hotspot is on the fingertip");
  for(const state of ["open","closed"]) {
    const pixels=await sharp(path.join(root,"assets/cursors/glove-"+state+".png")).raw().toBuffer();
    assert(pixels[(23*48+23)*4+3]>128,"Grasp hotspot is inside glove");
  }
  // Readability checks use the bundled creation font without a browser.
  raster.GlobalFonts.registerFromPath(path.join(root,"assets/fonts/lora-variable.ttf"),"Game Lora");
  const fontCss=fs.readFileSync(path.join(root,"assets/fonts/lora.css"),"utf8");
  const embedded=fontCss.match(/data:font\/ttf;base64,([A-Za-z0-9+/=]+)/)[1];
  assert.deepEqual(Buffer.from(embedded,"base64"),fs.readFileSync(path.join(root,"assets/fonts/lora-variable.ttf")),
    "Local-file font matches its bundled source");
  const ink=raster.createCanvas(1,1).getContext("2d");
  for(const width of [375,600,700,900,1160]) {
    const u=width/100;
    const lineWidth=.545*width-3*u;
    const nameWidth=(lineWidth*(1-.14-.05-.05-.07-.02))*1.5/3.5;
    ink.font=`700 ${Math.max(5,Math.min(15,1.26*u))*1.06}px "Game Lora"`;
    assert(ink.measureText("Elementalista").width<nameWidth,"Selected name fits at "+width);
    ink.font=`700 ${Math.max(6,Math.min(19,1.6*u))}px "Game Lora"`;
    assert(ink.measureText("Classe").width<lineWidth*.14,"Larger selector label fits at "+width);
    const creationHeight=(width-12)*4/7+12;
    const innerHeight=.055*creationHeight-1.1*u;
    assert(2*u<=innerHeight,"Dice stays within the centered content at "+width);
    const textWidth=.23*width-2*(.65+.85)*u;
    const font=Math.max(1,Math.min(14,1.16*u)),lineHeight=font*1.27;
    ink.font=`500 ${font}px "Game Lora"`;
    let maxBottom=0;
    for(const race of races) for(const cls of classes) {
      const descriptions=run(`[raceDefinitions['${race.value}'].description,classDefinitions['${cls.value}'].description]`);
      let lines=0;
      for(const text of descriptions) {
        let line="";lines++;
        for(const word of text.split(" ")) {
          const next=line?line+" "+word:word;
          if(ink.measureText(next).width>textWidth){lines++;line=word;}else line=next;
        }
      }
      const cardHeight=lines*lineHeight+2*font*1.16*1.27+(2*.65+2*.65+.5+.6+.55)*u+1;
      const bottom=.14*creationHeight+cardHeight;
      maxBottom=Math.max(maxBottom,bottom);
      assert(bottom<.44*creationHeight,"Longest traits fit above selectors at "+width);
    }
  }
  console.log(JSON.stringify({result:"passed",clicks,cleanupCases,nativeGuardCases,
    cases:"Direct-name clicks, dynamic selection, untouched other row, press/release, invalid and valid swap, all cancellation paths, global context/selection/native drag guards, right-click aim cancel, cursor alpha/hotspots, measured text fit",
    limitation:"Text fit calculated in local rasterizer; browser visual test remains unavailable"},null,2));
}
main().catch(error=>{console.error(error);process.exitCode=1;});
