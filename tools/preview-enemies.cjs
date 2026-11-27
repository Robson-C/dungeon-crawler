const fs = require("node:fs");
const path = require("node:path");
const sharp = require(require.resolve("sharp",{paths:[path.dirname(process.execPath)]}));
const {setup}=require("../validation/harness.cjs");
const root=path.resolve(__dirname,"..");

async function main() {
  const {run,elements,raster}=await setup();
  const definitions=run("enemyArtData"),ids=Object.keys(definitions);
  const directions=[0,Math.PI/4,Math.PI/2,3*Math.PI/4,Math.PI,-3*Math.PI/4,-Math.PI/2,-Math.PI/4];
  const names=["Direita","Baixo/direita","Baixo","Baixo/esquerda","Esquerda","Cima/esquerda","Cima","Cima/direita"];
  const scene=elements.get("room").surface;
  // Small captured crops avoid retaining full 1792 × 1024 buffers for every sprite.
  const preview=raster.createCanvas(1040,700),ink=preview.getContext("2d");
  const frames=[];
  for(let t=0;t<40;t++) {
    ink.fillStyle="#17272b";ink.fillRect(0,0,1040,700);
    ink.fillStyle="#eed6ac";ink.font="bold 22px Georgia";
    ink.fillText("Chaos Crawl — cinco inimigos / oito direções",16,28);
    const phase=t<16?"Movimento":t<24?"Preparação":t<27?"Impacto":t<33?"Recuperação":"Repouso";
    ink.font="14px sans-serif";ink.fillStyle="#b9c9c5";ink.fillText(phase,16,49);
    for(let d=0;d<8;d++) {
      ink.textAlign="center";ink.fillStyle="#dfc79d";ink.font="12px sans-serif";ink.fillText(names[d],d*130+65,75);
    }
    for(const [r,id]of ids.entries())for(const [d,direction]of directions.entries()) {
      const state=t<16?"chase":t<24?"windup":t<33?"recovery":"idle";
      const remaining=t<24?.55-(t-16)*.06:t<27?.75-(t-24)*.05:t<33?.5-(t-27)*.05:0;
      run(`ctx.resetTransform();ctx.clearRect(0,0,canvas.width,canvas.height);
        ctx.setTransform(3.5,0,0,3.5,64,100);
        globalThis.previewEnemy={...enemySpawn,type:'${id}',x:0,y:0,direction:${direction},lookDirection:${direction},
          state:'${state}',moving:${t<16},stride:${t*1.75},remaining:${remaining},recoveryDuration:.75};
        drawTarget(previewEnemy,${t*100});`);
      const x=d*130,y=90+r*120;
      ink.fillStyle=r%2?"#20353a":"#1c3034";ink.fillRect(x+2,y,126,115);
      ink.strokeStyle="#647069";ink.beginPath();ink.moveTo(x+12,y+100);ink.lineTo(x+118,y+100);ink.stroke();
      ink.drawImage(scene,0,0,128,110,x+1,y,128,110);
      if(d===0){ink.textAlign="left";ink.font="11px sans-serif";ink.fillStyle="#f1d9ad";ink.fillText(definitions[id].name,x+6,y+113);}
    }
    if(t===0)fs.writeFileSync(path.join(root,"docs/inimigos/oito-direcoes.png"),preview.toBuffer("image/png"));
    frames.push(Buffer.from(ink.getImageData(0,0,1040,700).data));
  }
  await sharp(Buffer.concat(frames),{raw:{width:1040,height:700*frames.length,channels:4,pageHeight:700}})
    .webp({delay:Array(40).fill(100),loop:0,quality:82,effort:2})
    .toFile(path.join(root,"docs/inimigos/animacoes-oito-direcoes.webp"));
  console.log(JSON.stringify({result:"passed",frames:40,durationMs:4000,width:1040,height:700,source:"drawTarget from the game"}));
}
main().catch(error=>{console.error(error);process.exitCode=1;});
