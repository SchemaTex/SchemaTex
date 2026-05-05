breadboard
board: half
title: "HC-SR04 distance sensor + Arduino Uno"

parts
  uno: mcu uno @beside-left
  s1:  sensor hcsr04 @8a

wires
  s1:VCC  --red--    @+t1
  s1:GND  --black--  @-t1
  s1:TRIG --yellow-- @9c
  s1:ECHO --green--  @10c
  uno:5V  --red--    @+t1
  uno:GND --black--  @-t1
  uno:D9  --yellow-- @9c
  uno:D10 --green--  @10c
