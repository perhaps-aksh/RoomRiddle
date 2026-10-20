#!/usr/bin/env bash
# rec-info.sh: durations and start times of the demo recordings in /tmp/rec
cd /tmp/rec
for f in tvA tvB tvC tvD; do echo "$f start=$(cat $f.start) dur=$(ffprobe -v error -show_entries format=duration -of csv=p=0 $f.webm)"; done
echo "phone t0=$(cat phone/t0.txt) dur=$(ffprobe -v error -show_entries format=duration -of csv=p=0 phone/phone.webm)"
ls -la phone
