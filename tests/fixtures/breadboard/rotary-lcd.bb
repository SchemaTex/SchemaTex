breadboard
board: half
title: "Rotary encoder + 16×2 LCD I²C + Arduino Uno"

parts
  uno:  mcu uno @beside-left
  enc:  module rotary-ky040 @4a
  lcd:  display lcd-1602-i2c @14a

wires
  enc:VCC --red--    @+t4
  enc:GND --black--  @-t4
  enc:CLK --yellow-- @5c
  enc:DT  --orange-- @6c
  enc:SW  --purple-- @7c
  lcd:VCC --red--    @+t14
  lcd:GND --black--  @-t14
  lcd:SDA --green--  @17c
  lcd:SCL --white--  @18c
  uno:5V  --red--    @+t1
  uno:GND --black--  @-t1
  uno:D2  --yellow-- @5c
  uno:D3  --orange-- @6c
  uno:D4  --purple-- @7c
  uno:A4  --green--  @17c
  uno:A5  --white--  @18c
