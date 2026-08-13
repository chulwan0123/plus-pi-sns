# PLUS · Pi 파이 이용가이드 (SNS 카드·영상)

한화생명 **PLUS / Pi(파이)** 브랜드의 SNS 가이드 콘텐츠 저장소입니다.
각 "가이드"는 1080×1350(4:5) 세로 **카드(대지)** 묶음이며, 이를 **개별 클립 / 합본 / 9:16 유튜브 / BGM / 표지 이미지**로 내보내 **구글드라이브**에 올리고, **인스타그램 캡션**을 함께 작성합니다.

> **이 폴더를 처음 보는 에이전트/사람은 이 README부터 읽으세요.** 세부 절차는 아래 3개 문서로 연결됩니다.
> - 🎬 [동영상·이미지 제작 워크플로우](동영상_제작_워크플로우.md) — 클립/합본/9:16/BGM/표지 만드는 법
> - ☁️ [구글드라이브 업로드 가이드](구글드라이브_업로드_가이드.md) — 어디에·어떻게 올리는지(rclone)
> - 📝 [인스타그램 캡션 작성 가이드](인스타그램_캡션_가이드.md) — 캡션 규칙·톤·태그

---

## 1. 결과물이 무엇인가 (한 장 요약)

- **소스**: 단일 파일 [`index.html`](index.html). 상단 탭 4개 = 가이드 4종. 각 탭 안의 `.canvas` 1장 = 대지 1장(1080×1350).
- **산출물**(`exports/`): 가이드별로 아래 세트를 만든다.
  - 개별 클립 `…_01.mp4 … _0N.mp4`
  - 합본 `….mp4` (표지 2초 + 내용)
  - 9:16 유튜브 `…_9x16(youtube).mp4` (무음)
  - 9:16 + BGM `…_9x16(youtube)_bgm.mp4`
  - **표지 이미지 `…_표지.png`** (커버 1장만. 대지별 PNG는 만들지 않음)
- **배포처**: 구글드라이브(가이드별 폴더) + 각 폴더에 `인스타그램_캡션.md`.
- **미러**: `구글드라이브_최종본/<가이드명>/` = 드라이브에 올리는 것과 동일한 로컬 사본(캡션 포함). `.gitignore` 처리(원본은 `exports/`).

## 2. 가이드 4종 · 탭/패널/드라이브 매핑

| 표기(번호) | 탭 라벨 | HTML panel id | 라우팅 해시 | 대지 수 | 마무리 영상 |
|---|---|---|---|---|---|
| 02 | 파이 이용가이드 02_파이 간편신고 알아보기 | `#tab2` | `#guide` | 6 | guide-closing.mp4 |
| 03 | 파이 이용가이드 03_증여세 신고하기 | `#tab1` | `#filing` | 8 | closing-anim.mp4 (표지엔 pen-anim.mp4) |
| 04 | 파이 이용가이드 04_우리아이 첫 투자 미국 ETF 입문 가이드 | `#tab3` | `#etf` | 9 | etf-closing.mp4 |
| 05 | 파이 이용가이드 05_세금 없이 물려주기 | `#tab4` | `#guide4` | 6 | guide4-closing.mp4 |

> ⚠️ **탭 라벨 순서와 panel id가 어긋납니다**(역사적 이유). 라벨 "02"는 `tab2`, 라벨 "03"은 `tab1`입니다. 스크립트는 위 표의 panel/해시를 그대로 씁니다.
> **파일·폴더·탭 라벨 이름은 구글드라이브 폴더명 기준으로 통일**합니다(위 표의 "탭 라벨").

### 가이드별 BGM (고정 배분)
| 가이드 | BGM 파일(`~/Downloads/음원/`) |
|---|---|
| 02 | `warm_fintech_product_instagram_30s_free.m4a` |
| 03 | `youthful_fintech_nudisco_instagram_30s_free.m4a` |
| 04 | `digital_hopeful_corporate_instrumental_free.mp3` |

## 3. 폴더 구조

```
index.html                     소스 (탭 4개 = 가이드 4종, 단일 HTML)
assets/                        목업·로고·아이콘·SVG·영상 에셋
fonts/                         LIFEPLUS, Pretendard(subset) 등 웹폰트
exports/                       내보낸 최종 산출물(가이드별 mp4/png) — git 추적
구글드라이브_최종본/            드라이브 업로드용 미러(가이드별 폴더 + 캡션 md) — .gitignore
tools/
  export-clips.js              개별 클립(hold/release, GUIDE=02|03|04 env로 선택)
  export-cover.js              표지 PNG(GUIDE=02|03, 영상 표지는 POSTER 치환)
  export-images.js             (구) 대지별 PNG — 현재 표준은 표지만이라 상시 사용 안 함
  build-combine.sh             합본 + 9:16 + BGM 자동화
동영상_제작_워크플로우.md       🎬 제작 절차(고정 규격)
구글드라이브_업로드_가이드.md    ☁️ 드라이브 연결·업로드 절차(rclone)
인스타그램_캡션_가이드.md        📝 캡션 규칙
새탭_미국ETF입문가이드_대지정리.md  (작업 노트) 04 가이드 대지 기획 정리
```

## 4. 빠른 시작

```bash
# 1) 로컬 서버(프로젝트 루트)
python3 -m http.server 8778

# 2) 도구 설치(최초 1회)
cd tools && npm i playwright ffmpeg-static && npx playwright install chromium

# 3) 특정 가이드 산출물 만들기 (예: 04)
GUIDE=04 node export-clips.js                 # 개별 클립
GUIDE=04 node export-cover.js                 # 표지 PNG (03은 POSTER=.pen.png 지정)
bash tools/build-combine.sh "파이 이용가이드 04_우리아이 첫 투자 미국 ETF 입문 가이드" 2.0 09 ~/Downloads/음원/digital_hopeful_corporate_instrumental_free.mp3
```

세부 절차·주의사항은 상단 3개 문서를 참고하세요. **모든 가이드 영상은 항상 이 방식으로 만듭니다.**

- **배포(GitHub Pages)**: https://chulwan0123.github.io/plus-pi-sns/
