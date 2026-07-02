+++
title = "Homebrew TNC: first packets decoded"
date = 2026-12-17T22:03:00-04:00
author = "K2MCK"
callsign = "K2MCK"
board = "TECH"
subject = "HOMEBREW"
summary = "The breadboard modem finally heard its first clean AX.25 frames."
tags = ["homebrew", "ax25", "build-log"]
+++

After a week of chasing clock noise, the homebrew modem decoded its first clean
AX.25 UI frame tonight. The fix was gloriously unexciting: shorter jumpers,
better bypassing, and moving the audio ground.

```text
N0SYS>APRS,WIDE1-1:>BBS ONLINE 145.070
```

Next step is transmit testing into a dummy load, then a proper board layout.

