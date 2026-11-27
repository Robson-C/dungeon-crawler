"use strict";

const abilityCatalog = [
  {id:"double",name:"Golpe Duplo",mode:"direction",cost:12,cooldown:3,range:25,stat:"strength",factor:.8,color:"#ffe2a0",description:"Dois cortes à frente, cada um com 80% da Força."},
  {id:"hook",name:"Gancho de Guerra",mode:"direction",cost:15,cooldown:5,range:100,stat:"strength",factor:1,color:"#dfbb88",description:"Projétil atinge o primeiro inimigo e o puxa. Dano igual à Força."},
  {id:"circle",name:"Ataque Circular",mode:"instant",cost:18,cooldown:4,range:30,stat:"strength",factor:1.2,color:"#ffdd89",description:"Atinge todos ao redor com 120% da Força."},
  {id:"iron",name:"Pele de Ferro",mode:"instant",cost:15,cooldown:8,range:0,color:"#bdccd0",description:"Armadura adicional igual a 50% da Força por 6s. Não acumula."},
  {id:"fire",name:"Sopro de Fogo",mode:"direction",cost:18,cooldown:4,range:65,stat:"intellect",factor:1.5,element:"fireResistance",color:"#ff8a32",description:"Cone de fogo causa 150% do Intelecto em cada inimigo."},
  {id:"poison",name:"Frasco Venenoso",mode:"ground",cost:22,cooldown:6,range:null,radius:28,stat:"intellect",factor:.4,element:"poisonResistance",color:"#96d852",description:"Sem limite de distância, exige visão direta. Poça de 5s causa 40% do Intelecto por segundo dentro dela."},
  {id:"ice",name:"Prisão de Gelo",mode:"target",cost:20,cooldown:7,range:100,stat:"intellect",factor:1,element:"iceResistance",color:"#8cdefb",description:"Prende um alvo por 3s. Próximo dano quebra o gelo e acrescenta dano igual ao Intelecto."},
  {id:"chain",name:"Corrente Elétrica",mode:"target",cost:20,cooldown:5,range:110,stat:"intellect",factor:1.2,element:"lightningResistance",color:"#8dbeff",description:"120% do Intelecto em até 4 alvos, com saltos de até 50 unidades."},
  {id:"orbs",name:"Orbes Sentinelas",mode:"instant",cost:24,cooldown:8,range:0,stat:"intellect",factor:1,color:"#d09bff",description:"Três orbes por até 10s. Cada uma causa dano mágico igual ao Intelecto ao tocar um inimigo."},
  {id:"decoy",name:"Isca Ilusória",mode:"ground",cost:16,cooldown:7,range:null,radius:9,color:"#78eadb",description:"Sem limite de distância, exige visão direta. Ilusão com 3 pontos de vida por 6s. Atrai inimigos em até 90 unidades."}
];

function createAbilitySystem(api) {
  const bar=document.getElementById("ability-slots"), picker=document.getElementById("ability-picker");
  const choices=document.getElementById("ability-choices"), feedback=document.getElementById("ability-feedback");
  const modes={instant:"Imediata",direction:"Direção",ground:"Local",target:"Alvo"};
  let slots=[], aiming=null, editing=null, cooldowns=new Map(), effects=[], missiles=[], scheduled=[];
  let iron=null, orbs=[], decoy=null;
  const buttons=[];
  const now=()=>api.time();
  // Project effects from the body while retaining foot coordinates for collision.
  const bodyOffset=10;
  const bodyOrigin=()=>({x:api.player().x,y:api.player().y-bodyOffset});
  function directionAngle(point){const origin=bodyOrigin();return Math.atan2(point.y-origin.y,point.x-origin.x);}
  const say=text=>{feedback.textContent=text;};
  const lookup=id=>abilityCatalog.find(skill=>skill.id===id);
  const alive=()=>api.enemies().filter(enemy=>enemy.health>0);
  function closePicker(){picker.hidden=true;editing=null;buttons.forEach(button=>button.setAttribute("aria-expanded","false"));}
  function cancel(){aiming=null;closePicker();render();}
  function usable(){return api.player()&&!api.player().finished&&api.active();}
  function render(){
    buttons.forEach((button,index)=>{
      const skill=lookup(slots[index]),remaining=Math.max(0,(cooldowns.get(skill?.id)||0)-now());
      button.style.setProperty("--skill-image",skill?`url("assets/abilities/${skill.id}.webp")`:"none");
      button.dataset.aiming=String(aiming?.id===skill?.id);
      button.dataset.cooling=String(remaining>0);
      button.setAttribute("aria-label",`${index+1}. ${skill?.name||"Escolher habilidade"}. Clique para trocar.`);
      button.title=skill?`${skill.name} · ${modes[skill.mode]} · ${skill.cost} Energia · ${skill.cooldown}s\n${skill.description}`:"Escolher habilidade";
      button.children[1].textContent=remaining>0?Math.ceil(remaining/1000):"";
    });
  }
  function assign(index,id){
    if(!lookup(id)||index<0||index>4)return;
    slots[index]=id;aiming=null;closePicker();render();
    say(`${index+1}: ${lookup(id).name}. Use a tecla ${index+1}.`);
  }
  for(let i=0;i<5;i++){
    const button=document.createElement("button"),key=document.createElement("b"),timer=document.createElement("small");
    button.type="button";button.className="ability-slot";key.textContent=i+1;
    button.setAttribute("aria-haspopup","true");button.setAttribute("aria-controls","ability-picker");
    button.append(key,timer);bar.append(button);buttons.push(button);
    button.addEventListener("click",()=>{
      if(!usable())return;
      if(editing===i&&!picker.hidden){closePicker();return;}
      aiming=null;editing=i;picker.hidden=false;
      buttons.forEach((b,j)=>b.setAttribute("aria-expanded",j===i?"true":"false"));
      document.getElementById("ability-picker-title").textContent=`Escolher habilidade · Slot ${i+1}`;
      choices.children[0]?.focus();api.stop();render();
    });
  }
  for(const skill of abilityCatalog){
    const choice=document.createElement("button"),icon=document.createElement("img"),text=document.createElement("span"),name=document.createElement("strong"),description=document.createElement("small");
    choice.type="button";choice.className="ability-choice";choice.dataset.ability=skill.id;
    icon.src=`assets/abilities/${skill.id}.webp`;icon.alt="";name.textContent=skill.name;
    description.textContent=`${modes[skill.mode]} · ${skill.cost} Energia · ${skill.cooldown}s — ${skill.description}`;
    text.append(name,description);choice.append(icon,text);choices.append(choice);
    choice.addEventListener("click",()=>{if(editing!==null){assign(editing,skill.id);api.focus();}});
  }
  document.getElementById("ability-picker-close").addEventListener("click",()=>{closePicker();api.focus();});
  function flash(x,y,r,color,kind="ring",angle=0){effects.push({x,y,r,color,kind,angle,start:now(),end:now()+350});}
  function amount(skill,target,factor=skill.factor){
    const raw=Math.max(0,api.player()[skill.stat]||0)*factor;
    return skill.stat==="strength"?Math.max(0,raw-(target.armor||0)):
      raw*(1-Math.max(0,Math.min(100,target[skill.element]||0))/100);
  }
  function breakIce(target){
    if(!target.prison)return;
    const prison=target.prison;target.prison=null;
    if(prison.until>now()&&target.health>0){
      const damage=prison.power*(1-Math.max(0,Math.min(100,target.iceResistance||0))/100);
      dealDamage(target,damage);flash(target.x,target.y,12,"#adf0ff");
    }
  }
  function dealDamage(target,damage){
    const living=target.health>0;
    target.health=Math.max(0,target.health-damage);
    if(living&&target.health===0)api.defeat(target);
  }
  function hurt(target,skill,factor){
    if(!target.health)return;
    const damage=amount(skill,target,factor);if(damage>0)breakIce(target);
    dealDamage(target,damage);target.flashUntil=now()+150;
  }
  function cone(skill,angle,range,halfAngle,factor){
    const p=api.player();
    for(const enemy of alive()){
      const d=Math.hypot(enemy.x-p.x,enemy.y-p.y),a=Math.atan2(enemy.y-p.y,enemy.x-p.x);
      if(d<=range+enemy.radius&&Math.abs(Math.atan2(Math.sin(a-angle),Math.cos(a-angle)))<=halfAngle&&api.line(p,enemy,0))hurt(enemy,skill,factor);
    }
    effects.push({...bodyOrigin(),r:range,color:skill.color,kind:skill.id==="fire"?"fire":"slash",angle,halfAngle,start:now(),end:now()+350});
  }
  function valid(skill,point){
    const p=api.player();
    if(skill.mode==="instant")return true;
    if(skill.mode==="direction"){const origin=bodyOrigin();return Math.hypot(point.x-origin.x,point.y-origin.y)>1;}
    const enemy=skill.mode==="target"?targetAt(point):null;
    const destination=enemy||point;
    return (skill.mode!=="target"||!!enemy)&&(skill.mode==="ground"||Math.hypot(destination.x-p.x,destination.y-p.y)<=skill.range)&&
      api.floorClear(destination.x,destination.y,skill.mode==="ground"?2:0)&&api.line(p,destination,0);
  }
  function targetAt(point){return api.targetAt(point);}
  function cast(skill,point){
    if(!usable())return false;
    const p=api.player();
    if((cooldowns.get(skill.id)||0)>now()){say("Habilidade em recarga.");return false;}
    if(p.energy<skill.cost){say("Energia insuficiente.");return false;}
    if(!valid(skill,point)){say(skill.mode==="ground"?"Escolha um ponto com piso válido e visão direta, sem parede no caminho.":"Escolha um alvo válido dentro do alcance e sem parede no caminho.");return false;}
    p.energy-=skill.cost;cooldowns.set(skill.id,now()+skill.cooldown*1000);aiming=null;api.stop();
    const angle=skill.mode==="direction"?directionAngle(point):Math.atan2(point.y-p.y,point.x-p.x);if(skill.mode==="direction"||skill.mode==="target")api.face(angle);
    if(skill.id==="double"){
      api.beginDouble(angle);cone(skill,angle,25,.85,.8);
      scheduled.push({at:now()+170,id:"double",angle});
    }else if(skill.id==="circle"){
      for(const enemy of alive())if(Math.hypot(enemy.x-p.x,enemy.y-p.y)<=30+enemy.radius&&api.line(p,enemy,0))hurt(enemy,skill);
      effects.push({kind:"circular",start:now(),end:now()+350,angle:api.heading()});
    }else if(skill.id==="iron"){
      if(iron)p.armor-=iron.bonus;
      const bonus=p.strength*.5;p.armor+=bonus;iron={bonus,start:now(),end:now()+6000};
    }else if(skill.id==="fire")cone(skill,angle,65,Math.PI/6);
    else if(skill.id==="hook")missiles.push({x:p.x,y:p.y,origin:{x:p.x,y:p.y},angle,traveled:0,skill});
    else if(skill.id==="poison")effects.push({x:p.x,y:p.y,to:{x:point.x,y:point.y},color:skill.color,kind:"flask",start:now(),end:now()+350});
    else if(skill.id==="ice"){
      const enemy=targetAt(point);enemy.prison={until:now()+3000,power:p.intellect};enemy.state="idle";enemy.remaining=0;
    }else if(skill.id==="chain"){
      let target=targetAt(point),from=p;const hit=new Set();
      for(let i=0;i<4&&target;i++){
        hit.add(target);hurt(target,skill);effects.push({x:from.x,y:from.y,to:{x:target.x,y:target.y},kind:"bolt",color:skill.color,start:now(),end:now()+400});
        from=target;target=alive().filter(e=>!hit.has(e)&&Math.hypot(e.x-from.x,e.y-from.y)<=50&&api.line(from,e,0)).sort((a,b)=>Math.hypot(a.x-from.x,a.y-from.y)-Math.hypot(b.x-from.x,b.y-from.y))[0];
      }
    }else if(skill.id==="orbs")orbs=[0,1,2].map(i=>({phase:i*Math.PI*2/3,end:now()+10000}));
    else if(skill.id==="decoy")decoy={x:point.x,y:point.y,health:3,end:now()+6000};
    say(`${skill.name} utilizada.`);api.refresh();render();return true;
  }
  function activate(index){
    if(!usable())return;
    const skill=lookup(slots[index]);if(!skill)return;
    closePicker();aiming=null;
    if(api.player().energy<skill.cost){say("Energia insuficiente.");render();return;}
    if(skill.mode==="instant")cast(skill,api.player());
    else{aiming=skill;api.stop();say(`${skill.name} — ${modes[skill.mode]}. Clique para confirmar; botão direito ou Esc cancela.`);render();}
  }
  function reset(){
    if(iron&&api.player())api.player().armor-=iron.bonus;
    iron=null;orbs=[];decoy=null;effects=[];missiles=[];scheduled=[];cooldowns.clear();aiming=null;closePicker();
    slots=["double","circle","iron","hook","orbs"];render();say("Clique nos ícones para escolher. Teclas 1–5 ativam. R recupera Energia para teste.");
  }
  function clearFloor(){
    effects=[];missiles=[];scheduled=[];orbs=[];decoy=null;aiming=null;closePicker();
  }
  function tick(dt){
    const p=api.player();if(!p||p.finished)return;
    if(iron&&now()>=iron.end){p.armor-=iron.bonus;iron=null;api.refresh();}
    for(const event of scheduled.filter(event=>event.at<=now()))cone(lookup("double"),event.angle,25,.85,.8);
    scheduled=scheduled.filter(event=>event.at>now());
    for(const effect of effects){
      if(effect.kind==="flask"&&effect.end<=now()&&!effect.landed){
        effect.landed=true;effects.push({x:effect.to.x,y:effect.to.y,r:28,color:effect.color,kind:"poison",start:effect.end,end:effect.end+5000,tick:effect.end+1000});
      }
      if(effect.kind==="poison")while(effect.tick<=Math.min(now(),effect.end)){
        for(const enemy of alive())if(Math.hypot(enemy.x-effect.x,enemy.y-effect.y)<=effect.r&&api.line(effect,enemy,0))hurt(enemy,lookup("poison"));
        effect.tick+=1000;
      }
    }
    effects=effects.filter(effect=>effect.end>now());
    for(const missile of missiles){
      let remaining=Math.min(dt*220,missile.skill.range-missile.traveled);
      while(remaining>0&&!missile.done){
        const step=Math.min(remaining,3),x=missile.x+Math.cos(missile.angle)*step,y=missile.y+Math.sin(missile.angle)*step;
        remaining-=step;missile.traveled+=step;
        if(!api.floorClear(x,y,1)){missile.done=true;break;}
        missile.x=x;missile.y=y;
        const enemy=alive().find(e=>Math.hypot(e.x-x,e.y-y)<=e.radius+2);
        if(enemy){
          hurt(enemy,missile.skill);missile.done=true;
          if(enemy.health){
            const distance=Math.hypot(enemy.x-p.x,enemy.y-p.y),stop=14;
            for(let d=3;d<distance-stop;d+=3){
              const nx=enemy.x+(p.x-enemy.x)*3/Math.hypot(p.x-enemy.x,p.y-enemy.y),ny=enemy.y+(p.y-enemy.y)*3/Math.hypot(p.x-enemy.x,p.y-enemy.y);
              if(!api.enemyCanStand(enemy,nx,ny))break;enemy.x=nx;enemy.y=ny;
            }
          }
        }
        if(missile.traveled>=missile.skill.range)missile.done=true;
      }
    }
    missiles=missiles.filter(missile=>!missile.done);
    orbs=orbs.filter(orb=>{
      if(orb.end<=now())return false;
      const a=now()/450+orb.phase,x=p.x+Math.cos(a)*19,y=p.y+Math.sin(a)*19;
      const enemy=alive().find(e=>Math.hypot(e.x-x,e.y-y)<=e.radius+4&&api.line(p,e,0));
      if(enemy){hurt(enemy,lookup("orbs"));flash(x,y,8,"#d09bff");return false;}return true;
    });
    if(decoy&&(decoy.end<=now()||decoy.health<=0))decoy=null;
    for(const enemy of alive())if(enemy.prison?.until<=now())enemy.prison=null;
    render();
  }
  function ironTone(){
    return iron?Math.max(0,Math.min(1,(now()-iron.start)/100,(iron.end-now())/180)):0;
  }
  function circularPose(){
    const effect=effects.find(effect=>effect.kind==="circular"&&effect.start<=now()&&effect.end>now());
    if(!effect)return null;
    const phase=(now()-effect.start)/(effect.end-effect.start);
    const travel=Math.min(1,phase/.88),sweep=travel*travel*(3-2*travel);
    return {phase,sweep,angle:effect.angle-Math.PI/2+Math.PI*2*sweep};
  }
  function drawCircular(ctx,layer){
    const pose=circularPose(),p=api.player();
    if(!pose||!p)return;
    const fade=Math.max(0,Math.min(1,pose.phase/.08,(1-pose.phase)/.18));
    const tail=Math.min(2.1,pose.sweep*Math.PI*2)*Math.min(1,(1-pose.phase)/.18);
    const front=angle=>Math.sin(angle)>=0;
    const belongs=angle=>(layer==="front")===front(angle);
    const point=(angle,r)=>({x:p.x+Math.cos(angle)*r,y:p.y-9+Math.sin(angle)*r*.56});
    if(fade<=0)return;
    ctx.save();
    ctx.beginPath();ctx.rect(p.x-40,layer==="front"?p.y-9:p.y-49,80,40);ctx.clip();
    const tip=point(pose.angle,25),end=point(pose.angle-tail,25);
    const fill=ctx.createLinearGradient(end.x,end.y,tip.x,tip.y);
    fill.addColorStop(0,"#c8dad300");fill.addColorStop(.45,"#c8dad35c");
    fill.addColorStop(.8,"#e7efe5bf");fill.addColorStop(1,"#fff1ce22");
    const outer=[],inner=[];
    for(let index=0;index<=36;index++){
      const fraction=index/36,angle=pose.angle-tail*fraction;
      const width=Math.pow(Math.sin(Math.PI*fraction),.7);
      outer.push(point(angle,25+width));inner.push(point(angle,25-5*width));
    }
    ctx.globalAlpha=fade;ctx.fillStyle=fill;
    ctx.beginPath();ctx.moveTo(outer[0].x,outer[0].y);
    for(const vertex of outer.slice(1))ctx.lineTo(vertex.x,vertex.y);
    for(const vertex of inner.reverse())ctx.lineTo(vertex.x,vertex.y);
    ctx.closePath();ctx.fill();
    ctx.strokeStyle=fill;ctx.lineWidth=.7;
    ctx.beginPath();ctx.moveTo(outer[0].x,outer[0].y);
    for(const vertex of outer.slice(1))ctx.lineTo(vertex.x,vertex.y);
    ctx.stroke();ctx.restore();
    if(belongs(pose.angle)){
      const grip=point(pose.angle,5.5);
      ctx.save();
      ctx.globalAlpha=fade;
      ctx.translate(grip.x,grip.y);
      ctx.rotate(Math.atan2(Math.sin(pose.angle)*.56,Math.cos(pose.angle)));
      ctx.scale(1.65,1.3);
      api.drawWeapon(ctx,0,0,0);
      ctx.restore();
    }
  }
  function draw(ctx,point){
    const p=api.player();if(!p)return;
    ctx.save();ctx.lineWidth=1.2;
    for(const effect of effects){
      if(effect.kind==="circular")continue;
      ctx.strokeStyle=effect.color;ctx.fillStyle=effect.color+"30";
      const phase=(now()-effect.start)/(effect.end-effect.start);
      ctx.beginPath();
      if(effect.kind==="flask"){
        const x=effect.x+(effect.to.x-effect.x)*phase,y=effect.y+(effect.to.y-effect.y)*phase-7-Math.sin(phase*Math.PI)*17;
        ctx.save();ctx.translate(x,y);ctx.rotate(phase*8);ctx.fillStyle="#94df57";ctx.strokeStyle="#d2f0b5";ctx.beginPath();ctx.arc(0,0,3,0,Math.PI*2);ctx.fill();ctx.stroke();ctx.fillStyle="#b5864d";ctx.fillRect(-1,-5,2,3);ctx.restore();continue;
      }else if(effect.kind==="bolt"){ctx.moveTo(effect.x,effect.y-7);ctx.lineTo((effect.x+effect.to.x)/2+3,(effect.y+effect.to.y)/2-11);ctx.lineTo(effect.to.x,effect.to.y-7);}
      else if(effect.kind==="fire"||effect.kind==="slash"){ctx.moveTo(effect.x,effect.y);ctx.arc(effect.x,effect.y,effect.r,effect.angle-effect.halfAngle,effect.angle+effect.halfAngle);ctx.closePath();}
      else ctx.arc(effect.x,effect.y,effect.r*(effect.kind==="poison"?1:.5+phase*.5),0,Math.PI*2);
      ctx.fill();ctx.stroke();
      if(effect.kind==="fire"){
        for(let i=0;i<24;i++){
          const spread=Math.sin(i*8.3)*effect.halfAngle,a=effect.angle+spread,d=effect.r*((i%7)/10+.25+phase*.35);
          ctx.fillStyle=i%2?"#ffd978b0":"#ff721c90";ctx.beginPath();ctx.arc(effect.x+Math.cos(a)*d,effect.y+Math.sin(a)*d,2+(1-phase)*2,0,Math.PI*2);ctx.fill();
        }
      }
      if(effect.kind==="poison")for(let i=0;i<6;i++){const a=i*2.4+now()/1200;ctx.beginPath();ctx.arc(effect.x+Math.cos(a)*18,effect.y+Math.sin(a)*18,1.5,0,Math.PI*2);ctx.fillStyle="#a9eb7280";ctx.fill();}
    }
    for(const missile of missiles){
      const origin=bodyOrigin(),tip={x:missile.x,y:missile.y-bodyOffset};
      const dx=tip.x-origin.x,dy=tip.y-origin.y,length=Math.hypot(dx,dy),angle=Math.atan2(dy,dx);
      ctx.save();ctx.translate(origin.x,origin.y);ctx.rotate(angle);
      // Alternating iron links, rather than a single straight beam.
      for(let d=2,index=0;d<length-4;d+=3.1,index++){
        ctx.beginPath();ctx.ellipse(d,Math.sin(d*.12+now()/130)*.35,2,index%2?.55:1,0,0,Math.PI*2);
        ctx.lineWidth=.9;ctx.strokeStyle="#182126";ctx.stroke();
        ctx.lineWidth=.45;ctx.strokeStyle=index%2?"#a5b2ad":"#d2c19a";ctx.stroke();
      }
      ctx.translate(length,0);drawHook(ctx);ctx.restore();
    }
    for(const enemy of alive())if(enemy.prison){ctx.fillStyle="#9de5ff50";ctx.strokeStyle="#9de5ff";ctx.beginPath();ctx.moveTo(enemy.x,enemy.y-26);ctx.lineTo(enemy.x+9,enemy.y-9);ctx.lineTo(enemy.x+6,enemy.y+3);ctx.lineTo(enemy.x-7,enemy.y+3);ctx.lineTo(enemy.x-9,enemy.y-9);ctx.closePath();ctx.fill();ctx.stroke();}
    for(const orb of orbs){const a=now()/450+orb.phase;ctx.fillStyle="#d09bff";ctx.shadowColor="#b77dff";ctx.shadowBlur=5;ctx.beginPath();ctx.arc(p.x+Math.cos(a)*19,p.y-7+Math.sin(a)*19,3,0,Math.PI*2);ctx.fill();}ctx.shadowBlur=0;
    if(decoy){ctx.fillStyle="#83f1dc70";ctx.strokeStyle="#adfff1";ctx.beginPath();ctx.arc(decoy.x,decoy.y-19,4,0,Math.PI*2);ctx.fill();ctx.beginPath();ctx.moveTo(decoy.x,decoy.y-15);ctx.lineTo(decoy.x+8,decoy.y);ctx.lineTo(decoy.x-8,decoy.y);ctx.closePath();ctx.fill();ctx.stroke();}
    if(aiming){
      const validPoint=valid(aiming,point);
      ctx.lineWidth=.65;ctx.strokeStyle=validPoint?aiming.color+"c0":"#ed847ec0";ctx.fillStyle=validPoint?aiming.color+"20":"#ed847e20";
      ctx.beginPath();
      if(aiming.mode==="ground")ctx.arc(point.x,point.y,aiming.radius,0,Math.PI*2);
      else if(aiming.mode==="target"){const enemy=targetAt(point);ctx.arc(enemy?.x??point.x,enemy?.y??point.y,enemy?enemy.radius+5:7,0,Math.PI*2);}
      else{
        const origin=bodyOrigin(),a=directionAngle(point);
        if(aiming.id==="hook"){
          let length=0;
          for(let d=2;d<=aiming.range;d+=2){if(!api.floorClear(p.x+Math.cos(a)*d,p.y+Math.sin(a)*d,1))break;length=d;}
          ctx.save();ctx.translate(origin.x,origin.y);ctx.rotate(a);
          ctx.beginPath();ctx.moveTo(0,-2);ctx.lineTo(length,-2);ctx.lineTo(length,2);ctx.lineTo(0,2);ctx.closePath();ctx.fill();ctx.stroke();
          ctx.globalAlpha=.65;ctx.translate(length,0);drawHook(ctx);ctx.restore();
          ctx.beginPath();
        }else{
          const half=aiming.id==="double"?.85:Math.PI/6;
          ctx.moveTo(origin.x,origin.y);ctx.arc(origin.x,origin.y,aiming.range,a-half,a+half);ctx.closePath();
        }
      }
      ctx.fill();ctx.stroke();
    }
    ctx.restore();
  }
  function drawHook(ctx){
    ctx.lineJoin="round";ctx.fillStyle="#83918d";ctx.strokeStyle="#172327";ctx.lineWidth=.65;
    ctx.beginPath();ctx.moveTo(-5,-1);ctx.lineTo(0,-1);ctx.lineTo(1,-5);ctx.lineTo(5,-4);ctx.lineTo(6,-1);ctx.lineTo(3,-2);ctx.lineTo(3,2);ctx.lineTo(6,1);ctx.lineTo(5,4);ctx.lineTo(1,5);ctx.lineTo(0,1);ctx.lineTo(-5,1);ctx.closePath();ctx.fill();ctx.stroke();
    ctx.strokeStyle="#e5d4a6";ctx.lineWidth=.45;ctx.beginPath();ctx.moveTo(-4,-.5);ctx.lineTo(1,-.5);ctx.lineTo(2,-4);ctx.lineTo(4,-3);ctx.stroke();
  }
  return {activate,assign,reset,cancel,clearFloor,tick,draw,breakIce,targetAt,ironTone,circularPose,drawCircular,
    confirm(point){return aiming?cast(aiming,point):false;},
    isAiming:()=>!!aiming,isPicking:()=>!picker.hidden,
    frozen:enemy=>!!enemy.prison&&enemy.prison.until>now(),
    lure(enemy){return decoy&&decoy.health>0&&Math.hypot(enemy.x-decoy.x,enemy.y-decoy.y)<=90&&api.line(enemy,decoy,0)?decoy:null;},
    hitDecoy(){if(decoy)decoy.health--;},
    refresh:render,testingRefill(){if(usable()){api.player().energy=api.player().maxEnergy;api.refresh();render();say("Energia recuperada para teste.");}},
    inspect:()=>({slots:[...slots],aiming:aiming?.id,editing,iron,orbs:orbs.length,decoy,effects,missiles,cooldowns,scheduled})};
}
