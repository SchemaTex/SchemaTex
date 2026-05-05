breadboard
board: half
title: "DHT11 temperature/humidity + 10kΩ pull-up"

parts
  uno: mcu uno @beside-left
  s1:  sensor dht11 @6a
  r1:  resistor 10000 @8e..14e

wires
  s1:VCC  --red--    @+t1
  s1:GND  --black--  @-t1
  s1:DATA --yellow-- @8e
  @14e    --red--    @+t14
  uno:5V  --red--    @+t1
  uno:GND --black--  @-t1
  uno:D2  --yellow-- @8a
