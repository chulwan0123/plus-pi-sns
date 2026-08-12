#!/usr/bin/env bash
# 합본 + 9:16 유튜브 + BGM 생성 (동영상_제작_워크플로우.md 기준)
# 사용: bash tools/build-combine.sh "<제목(확장자 제외)>" <표지초> <내용 대지 마지막번호> <BGM경로>
# 예:   bash tools/build-combine.sh "파이 이용가이드 04_우리아이 첫 투자 미국 ETF 입문 가이드" 2.0 09 ~/Downloads/음원/digital_hopeful_corporate_instrumental_free.mp3
set -euo pipefail
FF=ffmpeg
T="$1"; COVER_S="${2:-2.0}"; LAST="${3:-09}"; BGM="${4:-}"
cd "$(dirname "$0")/../exports"

# (a) 표지 COVER_S초 세그먼트 (_01 앞부분 트림)
"$FF" -y -t "$COVER_S" -i "${T}_01.mp4" \
  -c:v libx264 -crf 20 -preset veryfast -pix_fmt yuv420p -vf fps=30 -movflags +faststart cover_seg.mp4

# (b) concat 리스트: 표지세그 + _02.._0LAST
printf "file '%s'\n" "$PWD/cover_seg.mp4" > list.txt
for i in $(seq 2 "$((10#$LAST))"); do
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
