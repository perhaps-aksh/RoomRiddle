#!/usr/bin/env bash
# vvd-load.sh <label> <samples>: system-wide CPU busy % and memory on the VVD (the dev shell can't see app processes).
source ~/vega/env >/dev/null 2>&1
N=${2:-5}
CMD='for i in $(seq 1 '"$N"'); do a=$(head -1 /proc/stat); sleep 1; b=$(head -1 /proc/stat); echo "$a|$b"; done; free -m | sed -n 2p'
printf '%s\nexit\n' "$CMD" | vega device shell -d VirtualDevice 2>&1 | awk -v L="$1" -F'|' '
  /^cpu /{ split($1,a," "); split($2,b," "); ta=0; tb=0; for(i=2;i<=9;i++){ta+=a[i]; tb+=b[i]}
           idle=(b[5]+b[6])-(a[5]+a[6]); busy=100*(1-idle/(tb-ta)); s+=busy; n++; if(busy>m)m=busy }
  /^Mem:/{ mem=$0 }
  END{ printf "%s: cpu busy avg %.0f%% max %.0f%% (%d s, 4 vCPU); %s\n", L, s/n, m, n, mem }'
