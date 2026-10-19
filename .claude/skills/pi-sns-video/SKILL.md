---
name: pi-sns-video
description: PLUS 파이 SNS 가이드(plus-pi-sns 저장소)의 대지 HTML을 인스타·유튜브용 애니메이션 영상/이미지로 만들 때 사용. 새 가이드 추가, 클립·합본·9:16·BGM·표지 내보내기, 규격 확인 요청에 적용.
---

# 파이 SNS 애니메이션 영상 만들기

`index.html`의 카드(대지)를 **1080×1350 애니메이션 영상**으로 녹화해 인스타(4:5)·유튜브 쇼츠(9:16)용 결과물을 만드는 표준 절차.
**모든 가이드는 이 규격 그대로 만든다. 임의로 바꾸지 않는다.**

---

## 1. 고정 규격 (한눈에)

| 항목 | 값 |
|---|---|
| 대지 크기 | 1080 × 1350 (4:5) |
| 코덱 | H.264 `libx264`, `-crf 20 -preset veryfast -pix_fmt yuv420p -movflags +faststart` |
| 프레임 | 30fps |
| 캡처 | Playwright Chromium, `deviceScaleFactor: 2` |
| 내용 대지 길이 | 애니메이션 완료 후 **+6초 홀드**(읽기용), 최소 3.5초 |
| 브랜드표지·표지·마무리 | **정확히 3초** 고정 |
| 합본 | 맨 앞 표지 **3초** + 나머지 클립 순서대로 |
| 9:16 | 1080×1920, 위아래 흰 여백 285px, 무음 |
| BGM 버전 | 9:16 + BGM, 짧으면 루프, **끝 2.5초 페이드아웃** |
| 이미지 | 대지별 PNG = 각 클립 **마지막 프레임**, 표지 `_표지.png` 별도 |

### 절대 원칙
1. **안 잘림** — 애니메이션은 0프레임부터 녹화. 배속·중간 컷 금지.
2. **읽을 시간** — 인스타 자동반복에서 너무 빨리 넘어가지 않게 끝 화면을 홀드.
3. **상단 타이틀 고정** — 각 대지의 맨 위 제목/설명(`.title/.body`)은 애니메이션 없이 처음부터 보이고, 그 아래 그래픽만 순차 등장.

---

## 2. 애니메이션 대지 만드는 법 (HTML 규칙)

녹화 스크립트가 자동으로 인식하려면 이 구조를 지킨다.

```html
<button class="tab-btn" data-target="tabN" type="button">파이 이용가이드 0N_<제목></button>
...
<div class="tab-panel" id="tabN">
  <div class="canvas">                 <!-- 대지 1장 = .canvas 1개 (패널 직계 자식) -->
    <div class="type-block">
      <div class="title"><p>제목 1줄</p><p>제목 2줄</p></div>
      <div class="body"><p>설명</p></div>
    </div>
    <div class="gN-card"> … 그래픽 … </div>   <!-- 순차 등장할 요소 -->
  </div>
</div>
```

- **애니메이션 트리거**: 등장 요소에 JS가 `.has-motion`을 붙이고, 화면 진입 시 `.is-playing`을 붙인다. CSS는 반드시 `.has-motion.is-playing …` 아래에 `animation`을 건다(기존 `initG4Motion()`/`initG6Motion()` 복사해 `#tabN .gN-card`로 바꾸면 됨).
- 순서는 `animation-delay`로 준다(예: 0.24s, 0.46s …). `animation-fill-mode: both`.
- **무한 반복 애니메이션**(마퀴 등)은 완료 감지에서 제외되므로 괜찮지만, 유한 애니메이션은 반드시 끝나야 한다(12초 넘으면 강제 컷).
- `<video>`(표지·마무리 영상)는 `autoplay muted playsinline` — 녹화 시 0초부터 재생됨.
- 라우팅: `initTabs()`의 `slugToTarget`/`targetToSlug`에 `#해시` 추가.
- 폰트: 타이틀 LIFEPLUS Bold, 본문 Pretendard. 색상은 `:root` 토큰(`--gray90` 제목, `--gray80` 본문, `--orange-60` 강조) 사용.

---

## 3. 내보내기 절차

### 0) 준비 (최초 1회)
```bash
python3 -m http.server 8778          # 프로젝트 루트에서, 계속 켜둠
cd tools && npm i playwright ffmpeg-static && npx playwright install chromium
# ffmpeg/ffprobe도 시스템에 설치 (brew install ffmpeg)
```

### 1) 새 가이드 등록 — `tools/export-clips.js`의 `GUIDES`에 한 줄
```js
"06": { G: "파이 이용가이드 06_<제목>", panel: "tab5", hash: "#guide5",
        hold: READ_HOLD,                       // 내용 대지 +6초
        fixed: { 0: 3.0, 6: 3.0 },             // 0-base idx: 브랜드표지·마무리 = 3초
        mins: [COVER_MIN, HOOK_MIN, CONTENT_MIN, CONTENT_MIN, CONTENT_MIN, CONTENT_MIN, 0] },
```
- `mins` 길이 = 대지 수. 마지막 `0` = 마무리 영상 자연 길이.
- 표지 PNG가 필요하면 `tools/export-cover.js`의 `G` 객체에도 같은 키 추가.

### 2) 개별 클립
```bash
cd tools
GUIDE=06 node export-clips.js        # 전체
GUIDE=06 node export-clips.js 3      # idx 3(=_04) 하나만 다시
```
→ `exports/파이 이용가이드 06_<제목>_01.mp4 …`

### 3) 표지 + 대지별 이미지
```bash
GUIDE=06 node export-cover.js        # 2160×2700으로 저장됨 → 아래로 축소
cd ../exports; T="파이 이용가이드 06_<제목>"
ffmpeg -y -i "${T}_표지.png" -vf "scale=1080:1350:flags=lanczos" "${T}_표지.sc.png" && mv "${T}_표지.sc.png" "${T}_표지.png"
for n in 01 02 03 04 05 06 07 08 09; do
  [ -f "${T}_${n}.mp4" ] && ffmpeg -y -sseof -0.3 -i "${T}_${n}.mp4" -update 1 "${T}_${n}.png"
done
```
- 표지에 영상이 있으면 정지프레임을 뽑아 `POSTER=.pen.png`로 치환해 캡처.

### 4) 합본 + 9:16 + BGM (한 번에)
```bash
# 브랜드표지(_01)가 있는 가이드(04·05·06): 커버이미지 생략
bash tools/build-combine.sh "파이 이용가이드 06_<제목>" 3.0 07 ~/Downloads/음원/<bgm>.mp3
# 별도 커버 PNG를 쓰는 가이드(02·03): 5번째 인자로 _표지.png
bash tools/build-combine.sh "파이 이용가이드 02_파이 간편신고 알아보기" 3.0 06 ~/Downloads/음원/warm_fintech_product_instagram_30s_free.m4a "파이 이용가이드 02_파이 간편신고 알아보기_표지.png"
```
→ `<제목>.mp4`, `<제목>_9x16(youtube).mp4`, `<제목>_9x16(youtube)_bgm.mp4`

**BGM 배분(가이드별 고정, 겹치지 않게)**: 02 warm_fintech · 03 youthful_nudisco · 04 digital_hopeful · 05 hopeful_open_road. 새 가이드는 안 쓴 음원을 고르고 이 목록과 README에 추가.

### 5) 검증 (필수)
```bash
for f in exports/"$T"*.mp4; do echo "$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$f")  $f"; done
```
- 표지·마무리 클립 = 3.00초, 내용 클립 = 애니메이션 + 6초 근처인지
- 합본 길이 ≈ 3초 + 나머지 클립 합, 9:16·BGM 길이 = 합본 길이
- PNG 1080×1350, 마지막 프레임이 애니메이션 완료 상태인지 눈으로 확인

---

## 4. 파일명 규칙
```
파이 이용가이드 0N_<제목>.mp4                     합본
파이 이용가이드 0N_<제목>_0M.mp4 / _0M.png        대지별 클립 / 이미지
파이 이용가이드 0N_<제목>_표지.png                표지
파이 이용가이드 0N_<제목>_9x16(youtube).mp4       9:16 무음
파이 이용가이드 0N_<제목>_9x16(youtube)_bgm.mp4   9:16 + BGM
```
`<제목>`은 탭 라벨 = 구글드라이브 폴더명과 글자 하나까지 동일하게.

---

## 5. 업로드·캡션 (마무리)
- 드라이브: `구글드라이브_업로드_가이드.md` — rclone, **미러는 `rm` 후 `cp`**(한글 NFD/NFC 덮어쓰기 실패 방지), 업로드 후 `rclone check --checksum` 0 differences.
- 캡션: `인스타그램_캡션_가이드.md` — 대지에 있는 내용만, "~해요" 톤, 이모지 3~4개, 태그 `#파이 #플러스파이 #한화생명파이` + 관련 2개.
- 끝나면 README 가이드 표·BGM 표, 드라이브 상태표, 캡션 상태표를 갱신하고 커밋.

## 자주 나는 실수
- macOS `seq -w`는 제로패딩 안 됨 → `printf "%02d"` 사용(스크립트 반영됨).
- 길이 측정은 `ffprobe`로(`ffmpeg -i`는 exit 1).
- 탭 라벨 번호 ≠ panel id(02→tab2, 03→tab1). 스크립트의 `panel`/`hash`를 README 표대로.
- 서버(8778)가 꺼져 있으면 빈 화면이 녹화됨.
