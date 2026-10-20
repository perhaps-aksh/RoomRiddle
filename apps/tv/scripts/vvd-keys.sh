#!/usr/bin/env bash
# vvd-keys.sh KEY_... [N secs] ... : press remote keys on the VVD (a bare number = sleep N s), no screenshot.
source ~/vega/env >/dev/null 2>&1
CMDS=""
for k in "$@"; do
  if [[ "$k" =~ ^[0-9.]+$ ]]; then CMDS+="sleep $k; "; else CMDS+="inputd-cli button_press $k >/dev/null 2>&1; sleep 0.5; "; fi
done
printf '%s\nexit\n' "$CMDS echo KEYS_DONE" | timeout 280 vega device shell -d VirtualDevice 2>&1 | grep -E "KEYS_DONE|rror" | tail -1
