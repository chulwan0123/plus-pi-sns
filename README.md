# plus-sns

PLUS 브랜드 SNS(인스타그램 등) 콘텐츠 제작용 저장소.
디자인 시스템 저장소(`plus-design-system`)와 분리해 SNS 카드/영상 결과물을 관리합니다.

## 콘텐츠

### 증여세 간편신고 카드 시리즈
- **[index.html](index.html)** — 1080×1350(4:5) 8장 카드 시리즈. 인스타그램 캐러셀용.
  - 표지 + 본문 카드 (타이틀 LIFEPLUS Bold 80 / 본문 Pretendard Medium 50)
  - 카드 3·5·6·7에 `plus-market-cap-mobile`의 실제 앱 화면 목업을 이식(스케일 ×2.6269)
    - 카드3: 증여금 입금 알림톡 → 증여 정보
    - 카드5: 증여 관계 확인 → 신고 금액 (동영상 export용 1회 재생)
    - 카드6: 신고 서류 제출 → 접수 완료
    - 카드7: 신고 접수 완료 → 접수증
- **[exports/card5-tax-info.mp4](exports/card5-tax-info.mp4)** — 카드5 샘플 영상(1080×1350, H.264, 30fps).

## 폴더 구조
```
index.html        카드 시리즈 (단일 HTML)
assets/           목업 에셋 (커서/로고/파이 로고/펜 애니메이션 영상)
fonts/            LIFEPLUS, Pretendard(subset) 웹폰트
exports/          내보낸 MP4
```

## 미리보기
브라우저에서 `index.html`을 열면 됩니다. 각 대지는 1080×1350이며, 창이 작으면 스크롤/축소해서 봅니다.

## MP4 내보내기
Playwright로 특정 대지만 1080×1350 뷰포트로 녹화(WebM) → ffmpeg로 H.264 MP4 변환.
대지 선택은 스크립트의 `nth-of-type(n)` 값을 바꿔 지정합니다.
