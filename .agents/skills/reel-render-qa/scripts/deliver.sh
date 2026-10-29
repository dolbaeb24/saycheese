#!/bin/sh
# Copy a finished film to the deliverables folder: master, small copy if >15 MB, srt, poster, credits.
# Usage: sh deliver.sh <project> <name> <poster_time_s> [dest=./deliverables]
set -e
P=$1; N=$2; PT=$3; D=${4:-./deliverables}
mkdir -p "$D"
cp "$P/out/$N.mp4" "$D/$N.mp4"
[ -f "$P/out/$N.srt" ] && cp "$P/out/$N.srt" "$D/$N.srt"
for c in CREDITS.txt CREDITS; do [ -f "$P/$c" ] && cp "$P/$c" "$D/$N-credits.txt" && break; done
size=$(wc -c < "$D/$N.mp4")
if [ "$size" -gt 15000000 ]; then
  ffmpeg -v error -y -i "$D/$N.mp4" -c:v libx264 -preset slow -crf 31 -c:a copy -movflags +faststart "$D/$N-small.mp4"
fi
ffmpeg -v error -y -ss "$PT" -i "$D/$N.mp4" -frames:v 1 -q:v 3 "$D/$N-poster.jpg"
ls -la "$D"/"$N"*
