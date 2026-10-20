#!/usr/bin/env bash
# sheet.sh <video> <out.jpg> t1 t2 ... : a contact sheet (4 per row, 480 px wide each) of frames at the given seconds.
V="$1"; OUT="$2"; shift 2
D=$(mktemp -d); i=0; ins=(); lay=()
for t in "$@"; do
  ffmpeg -v error -y -ss "$t" -i "$V" -frames:v 1 -vf "scale=480:270:force_original_aspect_ratio=decrease,pad=480:270,drawtext=text='$t':x=6:y=6:fontcolor=magenta:fontsize=22" "$D/$i.jpg" 2>/dev/null \
    || ffmpeg -v error -y -ss "$t" -i "$V" -frames:v 1 -vf "scale=480:270:force_original_aspect_ratio=decrease,pad=480:270" "$D/$i.jpg"
  ins+=(-i "$D/$i.jpg"); lay+=("$(( (i % 4) * 480 ))_$(( (i / 4) * 270 ))"); i=$((i+1))
done
L=$(IFS='|'; echo "${lay[*]}")
ffmpeg -v error -y "${ins[@]}" -filter_complex "xstack=inputs=$i:layout=$L:fill=black" "$OUT"
rm -rf "$D"; echo "sheet $OUT ($i frames)"
