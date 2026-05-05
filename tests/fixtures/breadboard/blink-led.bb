breadboard
board: half
title: "Blink LED — Arduino Uno hello-world"

parts
  uno: mcu uno @beside-left
  r1:  resistor 220 @5e..9e
  d1:  led red @10e..10f

wires
  uno:5V  --red--    @+t1
  uno:GND --black--  @-t1
  @+t1    --red--    @5a
  uno:D13 --yellow-- @9a
  @10j    --black--  @-t1
