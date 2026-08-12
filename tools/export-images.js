/*
 * tools/export-images.js
 * 대지별 PNG(1080x1350)를 최종 상태(애니메이션 완료·강조 포함)로 저장한다.
 * 2배(2160x2700)로 캡처 후 lanczos 다운스케일해 선명도 확보.
 *
 * 준비/서버는 export-clips.js 와 동일.
 * 실행:  node export-images.js        # 전체
 *        node export-images.js 4      # idx=4 하나만
 *
 * 영상이 있는 대지는 렌더 정지프레임이 불안정하므로,
 * 미리 추출한 정지프레임 PNG(POSTER)로 <video>를 치환해 캡처한다.
 * (정지프레임 추출:  ffmpeg -ss 1.8 -i assets/xxx.mp4 -frames:v 1 pose.png)
 */
const { chromium } = require("playwright");
const fs = require("fs");
const path = require("path");

const BASE = "http://localhost:8778/index.html";
const OUT = path.resolve(__dirname, "../exports");
const W = 1080, H = 1350;
const PANEL = "tab4";
const HASH = "#guide4";
const COUNT = 5; // 패널 내 대지 수
const TITLE = "파이 이용가이드 04_미국 ETF 입문 가이드";
// 영상 치환용 정지프레임(없으면 null → 영상 그대로 캡처 시도)
const POSTER_FILE = null; // 예: path.resolve(__dirname, ".pose.png")
const POSTER = POSTER_FILE ? "data:image/png;base64," + fs.readFileSync(POSTER_FILE).toString("base64") : null;

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch();
  const ONLY = process.argv[2];
  for (let idx = 0; idx < COUNT; idx++) {
    if (ONLY !== undefined && String(idx) !== ONLY) continue;
    const ctx = await browser.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 2 });
    const page = await ctx.newPage();
    await page.goto(BASE + HASH, { waitUntil: "load" });
    await page.evaluate(() => document.fonts.ready);
    await page.evaluate(({ idx, panelId }) => {
      document.querySelectorAll(".tab-panel").forEach(p => p.classList.toggle("is-active", p.id === panelId));
      const panel = document.getElementById(panelId);
      if (!document.getElementById("__iso")) {
        const s = document.createElement("style"); s.id = "__iso";
        s.textContent = ".tabbar{display:none!important}body{background:#fff!important}#" + panelId + "{padding:0!important;gap:0!important}";
        document.head.appendChild(s);
      }
      const cards = [...panel.querySelectorAll(":scope > .canvas")];
      cards.forEach((c, i) => { c.style.display = (i === idx ? "" : "none"); });
      cards[idx].id = "__shot";
      const block = cards[idx].querySelector(".etf-motion, .g4-card, .type-block");
      if (block) block.classList.add("is-playing");
    }, { idx, panelId: PANEL });
    // 애니메이션 최종 프레임으로 점프 + 영상 치환
    await page.evaluate((poster) => {
      const card = document.getElementById("__shot");
      card.getAnimations({ subtree: true }).forEach(a => {
        try { const it = a.effect.getComputedTiming().iterations; if (it !== Infinity) a.finish(); } catch (e) {}
      });
      card.querySelectorAll("video").forEach(v => {
        if (poster) { const img = document.createElement("img"); img.className = v.className; img.src = poster; v.replaceWith(img); }
      });
    }, POSTER);
    await page.evaluate(() => Promise.all([...document.querySelectorAll("#__shot img")].map(im => im.decode ? im.decode().catch(() => {}) : 0)));
    await page.waitForTimeout(500);
    const el = await page.$("#__shot");
    const n = String(idx + 1).padStart(2, "0");
    await el.screenshot({ path: path.join(OUT, `${TITLE}_${n}.png`) }); // 2160x2700
    await ctx.close();
    console.log("OK " + n);
  }
  await browser.close();
  console.log("DONE");
  // 다운스케일:  for f in exports/*.png; do ffmpeg -y -i "$f" -vf "scale=1080:1350:flags=lanczos" "$f.tmp" && mv "$f.tmp" "$f"; done
})().catch(e => { console.error(e); process.exit(1); });
