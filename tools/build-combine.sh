#!/usr/bin/env bash
# 합본 + 9:16 유튜브 + BGM 생성 (동영상_제작_워크플로우.md 기준)
# 사용: bash tools/build-combine.sh "<제목>" <표지초> <내용 대지 마지막번호> <BGM경로> [커버이미지] [첫 내용대지번호]
# 예(브랜드표지가 _01인 04/05): build-combine.sh "…04…" 3.0 09 ~/…/bgm.mp3
# 예(별도 커버 이미지가 있는 02/03): build-combine.sh "…02…" 3.0 06 ~/…/bgm.m4a "exports/…02…_표지.png"
#   - 커버이미지 지정 시: 커버=그 이미지 정지 COVER_S초, 내용=_01.._0LAST 전부(첫 내용대지 기본 1)
#   - 미지정 시: 커버=_01 앞 COVER_S초, 내용=_02.._0LAST(첫 내용대지 기본 2)
set -euo pipefail
FF=ffmpeg
T="$1"; COVER_S="${2:-2.0}"; LAST="${3:-09}"; BGM="${4:-}"; COVER_IMG="${5:-}"; FIRST="${6:-}"
if [ -z "$FIRST" ]; then [ -n "$COVER_IMG" ] && FIRST=1 || FIRST=2; fi
cd "$(dirname "$0")/../exports"
# 커버이미지 경로가 프로젝트 루트 기준이면 exports 기준으로 보정
if [ -n "$COVER_IMG" ] && [ ! -f "$COVER_IMG" ] && [ -f "../$COVER_IMG" ]; then COVER_IMG="../$COVER_IMG"; fi

# (a) 표지 COVER_S초 세그먼트
if [ -n "$COVER_IMG" ]; then
  # 별도 커버 이미지 정지 COVER_S초
  "$FF" -y -loop 1 -t "$COVER_S" -i "$COVER_IMG" \
    -vf "scale=1080:1350,fps=30,format=yuv420p" \
    -c:v libx264 -crf 20 -preset veryfast -movflags +faststart cover_seg.mp4
else
  # _01 앞부분을 쓰되, _01이 COVER_S보다 짧으면 마지막 프레임 클론 패딩(tpad)해 정확히 COVER_S초 보장
  "$FF" -y -i "${T}_01.mp4" \
    -vf "tpad=stop_mode=clone:stop_duration=${COVER_S},fps=30,format=yuv420p" -t "$COVER_S" \
    -c:v libx264 -crf 20 -preset veryfast -pix_fmt yuv420p -movflags +faststart cover_seg.mp4
fi

# (b) concat 리스트: 표지세그 + _0FIRST.._0LAST
printf "file '%s'\n" "$PWD/cover_seg.mp4" > list.txt
for i in $(seq "$((10#$FIRST))" "$((10#$LAST))"); do
  n=$(printf "%02d" "$i")
  [ -f "${T}_${n}.mp4" ] && printf "file '%s'\n" "$PWD/${T}_${n}.mp4" >> list.txt
done

# (c) 합본
"$FF" -y -f concat -safe 0 -i list.txt \
  -c:v libx264 -crf 20 -preset veryfast -pix_fmt yuv420p -vf fps=30 -movflags +faststart "${T}.mp4"
echo "OK 합본: ${T}.mp4"

# (d) 9:16 유튜브 (1080x1920, 상하 285 흰 패딩, 무음)
"$FF" -y -i "${T}.mp4" \
  -vf "pad=1080:1920:0:285:color=white,format=yuv420p" \
  -c:v libx264 -crf 20 -preset veryfast -movflags +faststart -an "${T}_9x16(youtube).mp4"
echo "OK 9:16: ${T}_9x16(youtube).mp4"

# (e) BGM 버전 (끝 2.5초 페이드아웃, BGM 짧으면 루프)
if [ -n "$BGM" ]; then
  SEC=$(ffprobe -v error -show_entries format=duration -of csv=p=0 "${T}_9x16(youtube).mp4")
  ST=$(python3 -c "print(round($SEC-2.5,2))")
  "$FF" -y -i "${T}_9x16(youtube).mp4" -stream_loop -1 -i "$BGM" \
    -filter_complex "[1:a]afade=t=out:st=${ST}:d=2.5[a]" \
    -map 0:v -map "[a]" -c:v copy -c:a aac -b:a 192k -shortest -movflags +faststart \
    "${T}_9x16(youtube)_bgm.mp4"
  echo "OK BGM(${SEC}s, fade@${ST}s): ${T}_9x16(youtube)_bgm.mp4"
fi

rm -f cover_seg.mp4 list.txt
echo "DONE"
