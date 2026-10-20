#!/usr/bin/env bash
# make-demo.sh: cut the recordings in /tmp/rec into the demo video, timed to the voice-over.
set -e
R=/tmp/rec; W=$R/edit; mkdir -p $W; cd $W
VO=/mnt/d/Corpus/RoomRiddle/Assets/recordings/vo/voiceover.m4a
OUT=/mnt/d/Corpus/RoomRiddle/Assets/recordings/room-riddle-demo.mp4
ENC="-c:v libx264 -preset medium -crf 19 -pix_fmt yuv420p -r 30 -c:a aac -ar 48000 -ac 2 -b:a 160k"

# clip <out> <src> <start> <dur> [speed]  — TV shot, 1920x1080, game audio kept.
clip() {
  local sp=${5:-1}
  ffmpeg -v error -y -ss "$3" -t "$(python3 -c "print($4*$sp)")" -i "$2" \
    -filter_complex "[0:v]setpts=PTS/$sp,scale=1920:1080,fps=30[v];[0:a]atempo=$sp,aresample=48000[a]" \
    -map "[v]" -map "[a]" -t "$4" $ENC "$1"
}
# withphone <out> <tvsrc> <start> <dur> <phonesrc> <phonestart> — TV and phone side by side (nothing covered).
withphone() {
  ffmpeg -v error -y -ss "$3" -t "$4" -i "$2" -ss "$6" -t "$4" -i "$5" -filter_complex \
    "[0:v]scale=1408:792,fps=30[tv];[1:v]crop=390:844:0:0,scale=-2:1000,fps=30,pad=iw+8:ih+8:4:4:color=0xC9A45C[ph];color=c=0x0b0d12:s=1920x1080:r=30[bg];[bg][tv]overlay=16:(H-h)/2:shortest=1[b1];[b1][ph]overlay=W-w-16:(H-h)/2[v];[0:a]aresample=48000[a]" \
    -map "[v]" -map "[a]" -t "$4" $ENC "$1"
}

clip s0.mp4 $R/tvA.webm 0 15 0.7333
clip s1a.mp4 $R/tvA.webm 16 10
clip s1b.mp4 $R/tvA.webm 34 10
clip s2a.mp4 $R/tvA.webm 49 10
withphone s2b.mp4 $R/tvB.webm 24 10 $R/phone/phone.webm 24.7
clip s3a.mp4 $R/tvB.webm 72 15
clip s3b.mp4 $R/tvB.webm 122 15
withphone s4.mp4 $R/tvC.webm 0 30 $R/phone/phone.webm 190.1
withphone s5a.mp4 $R/tvC.webm 96 12 $R/phone/phone.webm 286.1
withphone s5b.mp4 $R/tvE.webm 68 13 $R/phone2/phone.webm 110.5
clip s6a.mp4 $R/tvD.webm 42 6
clip s6b.mp4 $R/tvD.webm 53 9

# Title card: the README banner, with the repo link, silent audio, gentle fade.
ffmpeg -v error -y -loop 1 -t 13 -i /mnt/d/RoomRiddle/docs/images/banner.jpg -f lavfi -t 13 -i anullsrc=r=48000:cl=stereo -filter_complex \
  "[0:v]scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih)/2:color=0x0b0d12,drawtext=fontfile=/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf:text='github.com/perhaps-aksh/RoomRiddle':fontcolor=0xE8D9B0:fontsize=40:x=(w-tw)/2:y=h-120,fade=t=in:st=0:d=0.8,fade=t=out:st=12:d=1,fps=30[v]" \
  -map "[v]" -map 1:a $ENC s7.mp4

printf "file '%s'\n" s0.mp4 s1a.mp4 s1b.mp4 s2a.mp4 s2b.mp4 s3a.mp4 s3b.mp4 s4.mp4 s5a.mp4 s5b.mp4 s6a.mp4 s6b.mp4 s7.mp4 > list.txt
ffmpeg -v error -y -f concat -safe 0 -i list.txt -c copy body.mp4
# Game audio under the voice-over (ducked), voice-over on top.
ffmpeg -v error -y -i body.mp4 -i "$VO" -filter_complex \
  "[0:a]volume=0.35[g];[1:a]volume=1.6[vo];[g][vo]amix=inputs=2:duration=first:normalize=0,alimiter=limit=0.95[a]" \
  -map 0:v -map "[a]" -c:v copy -c:a aac -b:a 192k -movflags +faststart "$OUT"
for f in s*.mp4; do printf '%s %s\n' "$f" "$(ffprobe -v error -show_entries format=duration -of csv=p=0 $f)"; done
echo "OUT $(ffprobe -v error -show_entries format=duration -of csv=p=0 "$OUT") $OUT"
