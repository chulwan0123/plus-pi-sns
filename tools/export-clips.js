/*
 * tools/export-clips.js
 * 대지(1080x1350 캔버스)별 개별 MP4 클립을 "애니메이션 0프레임부터" 캡처한다.
 *
 * 준비:
 *   cd tools
 *   npm i playwright ffmpeg-static
 *   npx playwright install chromium
 *   # 프로젝트 루트에서 로컬 서버: python3 -m http.server 8778
 *
 * 실행:
 *   node export-clips.js         # JOBS 전체
 *   node export-clips.js 2       # idx=2 대지 하나만 재생성
 *
 * 핵심 원칙:
 *   1) 잘리지 않음 — 진입 애니메이션을 로드 중 "홀드"(is-playing 제거)했다가
 *      정확한 시점에 "릴리즈"(is-playing 부여, video는 0부터 play)해 0프레임부터 캡처.
 *      릴리즈 후 유한 애니메이션/영상이 끝나는 시점을 감지해 컷.
 *   2) 최소 초 보장 — minMs 미만이면 최종 프레임을 minMs까지 홀드(빨리감기 없음).
 */
const { chromium } = require("playwright");
const ffmpeg = require("ffmpeg-static");
const { execFileSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const BASE = "http://localhost:8778/index.html";
const OUTDIR = path.resolve(__dirname, "../exports");
const TMP = path.resolve(__dirname, ".rec");
const W = 1080, H = 1350;
const PREROLL = 0.25;       // 릴리즈 직전 정지프레임 노출(초)
const SETTLE = 450;         // 로드 후 릴리즈 전 안정화 대기(ms)
const CONTENT_MIN = 3500;   // 내용 페이지 최소 길이(ms)

// 대상 탭/대지 설정 (탭마다 이 부분만 바꿔 재사용)
// panel = 패널 id, hash = 라우팅 해시, idx = 패널 내 .canvas 순서(0-base)
// name = 출력 파일명(확장자 제외), minMs = 최소 길이(ms)
const G = "파이 이용가이드 04_우리아이 첫 투자 미국 ETF 입문 가이드";
const JOBS = [
  { panel: "tab4", hash: "#guide4", idx: 0, name: `${G}_01`, minMs: CONTENT_MIN }, // 표지(영상/정적)
  { panel: "tab4", hash: "#guide4", idx: 1, name: `${G}_02`, minMs: CONTENT_MIN }, // 공식1
  { panel: "tab4", hash: "#guide4", idx: 2, name: `${G}_03`, minMs: CONTENT_MIN }, // 공식2
  { panel: "tab4", hash: "#guide4", idx: 3, name: `${G}_04`, minMs: CONTENT_MIN }, // 공식3
  { panel: "tab4", hash: "#guide4", idx: 4, name: `${G}_05`, minMs: 0 },           // 마무리(영상 자연길이)
];
const FILTER = process.argv[2]; // idx 하나만 재생성하려면 인자로 전달

// 대지 격리: 대상 캔버스만 표시, 탭바 숨김
const isoScript = ({ panelId, idx }) => {
  const apply = () => {
    const panel = document.getElementById(panelId);
    if (!panel) return false;
    document.querySelectorAll(".tab-panel").forEach(p => p.classList.toggle("is-active", p.id === panelId));
    if (!document.getElementById("__iso")) {
      const s = document.createElement("style"); s.id = "__iso";
      s.textContent = ".tabbar{display:none!important}body{background:#fff!important}#" + panelId + "{padding:0!important;gap:0!important}";
      (document.head || document.documentElement).appendChild(s);
    }
    const cards = [...panel.querySelectorAll(":scope > .canvas")];
    cards.forEach((c, i) => { c.style.display = (i === idx ? "" : "none"); });
    return true;
  };
  if (document.readyState !== "loading") apply();
  else document.addEventListener("DOMContentLoaded", apply, { once: true });
  const mo = new MutationObserver(() => apply());
  mo.observe(document.documentElement, { childList: true, subtree: true });
  setTimeout(() => mo.disconnect(), 1800);
};

// HOLD: 로드 중 진입 애니메이션 트리거(is-playing) 제거·영상 0으로 되감아 정지 유지
const holdScript = () => {
  const strip = () => {
    if (window.__released) return;
    document.querySelectorAll(".is-playing").forEach(s => s.classList.remove("is-playing"));
    document.querySelectorAll("video").forEach(v => { try { v.pause(); if (v.currentTime > 0.02) v.currentTime = 0; } catch (e) {} });
  };
  strip();
  const iv = setInterval(() => { if (window.__released) { clearInterval(iv); return; } strip(); }, 16);
};

(async () => {
  fs.mkdirSync(TMP, { recursive: true });
  fs.mkdirSync(OUTDIR, { recursive: true });
  const browser = await chromium.launch();
  for (const job of JOBS) {
    if (FILTER !== undefined && String(job.idx) !== FILTER) continue;
    fs.readdirSync(TMP).filter(f => f.endsWith(".webm")).forEach(f => fs.unlinkSync(path.join(TMP, f)));
    const ctx = await browser.newContext({
      viewport: { width: W, height: H }, deviceScaleFactor: 2,
      recordVideo: { dir: TMP, size: { width: W, height: H } },
    });
    await ctx.addInitScript(holdScript);
    await ctx.addInitScript(isoScript, { panelId: job.panel, idx: job.idx });
    const page = await ctx.newPage();
    const recStart = Date.now();
    await page.goto(BASE + job.hash, { waitUntil: "load" });
    await page.evaluate(() => document.fonts.ready);
    await page.evaluate(() => Promise.all([...document.querySelectorAll("video")].filter(v => v.offsetParent !== null)
      .map(v => v.readyState >= 1 ? 0 : new Promise(r => v.addEventListener("loadedmetadata", r, { once: true })))));
    await page.waitForTimeout(SETTLE);

    // RELEASE: 진입 애니메이션 0프레임부터 재생, 영상도 0부터
    const releaseWall = Date.now();
    const releasedAt = await page.evaluate(() => {
      window.__released = true;
      document.querySelectorAll(".has-motion, .result-motion").forEach(s => s.classList.add("is-playing"));
      document.querySelectorAll("video").forEach(v => { try { v.currentTime = 0; const p = v.play(); if (p && p.catch) p.catch(() => {}); } catch (e) {} });
      return performance.now();
    });

    // 완료 감지: 유한 애니메이션/영상이 끝나는 시점(디바운스). 무한 애니메이션(마퀴)은 제외.
    const completeMs = await page.evaluate((releasedAt) => new Promise(res => {
      const vids = [...document.querySelectorAll("video")].filter(v => v.offsetParent !== null);
      const videoEndPt = Math.max(releasedAt, ...vids.map(v => releasedAt + (v.duration || 0) * 1000));
      const STABLE = 850, MINPT = releasedAt + 1000;
      let lastBusy = releasedAt;
      const tick = () => {
        const t = performance.now();
        const running = document.getAnimations().filter(a => {
          if (a.playState !== "running") return false;
          let it; try { it = a.effect.getComputedTiming().iterations; } catch (e) { it = 1; }
          return it !== Infinity;
        });
        const vidBusy = t < videoEndPt;
        if (running.length > 0 || vidBusy) lastBusy = t;
        if (t > MINPT && (t - lastBusy) > STABLE) { res(Math.ceil(Math.max(lastBusy, videoEndPt, MINPT))); return; }
        if (t > releasedAt + 12000) { res(Math.max(videoEndPt, releasedAt + 4000)); return; }
        requestAnimationFrame(tick);
      };
      tick();
    }), releasedAt);

    const finalMs = Math.max(completeMs, releasedAt + (job.minMs || 0));
    const nowPt = await page.evaluate(() => performance.now());
    if (finalMs > nowPt) await page.waitForTimeout(finalMs - nowPt + 120);
    await page.waitForTimeout(200);
    await ctx.close();

    const webm = fs.readdirSync(TMP).filter(f => f.endsWith(".webm")).map(f => path.join(TMP, f)).pop();
    const out = path.join(OUTDIR, job.name + ".mp4");
    const trimSec = Math.max(0, (releaseWall - recStart) / 1000 - PREROLL);
    const outDur = Math.max(0.5, (finalMs - releasedAt) / 1000 + PREROLL + 0.05);
    execFileSync(ffmpeg, ["-y", "-ss", String(trimSec), "-i", webm, "-t", String(outDur),
      "-vf", "fps=30,format=yuv420p", "-c:v", "libx264", "-crf", "20", "-preset", "veryfast",
      "-movflags", "+faststart", out], { stdio: "ignore" });
    console.log(`OK ${job.name}  anim=${((completeMs - releasedAt) / 1000).toFixed(2)}s  min=${(job.minMs/1000)||0}s`);
  }
  await browser.close();
  console.log("DONE");
})().catch(e => { console.error(e); process.exit(1); });
