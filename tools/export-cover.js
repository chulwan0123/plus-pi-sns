/* 표지(대지1) 1장을 최종상태로 캡처 → "<제목>_표지.png"  (2160x2700 → 별도 다운스케일)
 * 사용: GUIDE=02 node export-cover.js  |  GUIDE=03 POSTER=.pen.png node export-cover.js */
const { chromium } = require("playwright");
const fs = require("fs"), path = require("path");
const BASE="http://localhost:8778/index.html", OUT=path.resolve(__dirname,"../exports");
const G={ "02":{t:"파이 이용가이드 02_파이 간편신고 알아보기",panel:"tab2",hash:"#guide"},
          "03":{t:"파이 이용가이드 03_증여세 신고하기",panel:"tab1",hash:"#filing"},
          "05":{t:"파이 이용가이드 05_세금 없이 물려주기",panel:"tab4",hash:"#guide4"} }[process.env.GUIDE];
const PF=process.env.POSTER?path.resolve(__dirname,process.env.POSTER):null;
const POSTER=PF?"data:image/png;base64,"+fs.readFileSync(PF).toString("base64"):null;
(async()=>{
  const b=await chromium.launch();
  const ctx=await b.newContext({viewport:{width:1080,height:1350},deviceScaleFactor:2});
  const p=await ctx.newPage();
  await p.goto(BASE+G.hash,{waitUntil:"load"});
  await p.evaluate(()=>document.fonts.ready);
  await p.evaluate(({panel})=>{
    document.querySelectorAll(".tab-panel").forEach(x=>x.classList.toggle("is-active",x.id===panel));
    const s=document.createElement("style");s.textContent=".tabbar{display:none!important}body{background:#fff!important}#"+panel+"{padding:0!important;gap:0!important}";document.head.appendChild(s);
    const cards=[...document.querySelectorAll("#"+panel+" > .canvas")];
    cards.forEach((c,i)=>c.style.display=(i===0?"":"none"));
    cards[0].id="__shot";
    cards[0].querySelectorAll(".etf-motion,.g4-card,.type-block").forEach(el=>el.classList.add("is-playing"));
  },{panel:G.panel});
  await p.evaluate((poster)=>{
    const card=document.getElementById("__shot");
    card.getAnimations({subtree:true}).forEach(a=>{try{if(a.effect.getComputedTiming().iterations!==Infinity)a.finish();}catch(e){}});
    card.querySelectorAll("video").forEach(v=>{ if(poster){const im=document.createElement("img");im.className=v.className;im.src=poster;v.replaceWith(im);} });
  },POSTER);
  await p.evaluate(()=>Promise.all([...document.querySelectorAll("#__shot img")].map(im=>im.decode?im.decode().catch(()=>{}):0)));
  await p.waitForTimeout(500);
  await (await p.$("#__shot")).screenshot({path:path.join(OUT,`${G.t}_표지.png`)});
  await b.close(); console.log("COVER OK "+G.t);
})();
