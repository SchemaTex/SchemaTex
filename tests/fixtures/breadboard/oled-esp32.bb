breadboard
board: half
title: "ESP32 + SSD1306 OLED I²C"

parts
  esp: mcu esp32 @beside-left
  oled: display oled-ssd1306 @8a

wires
  oled:GND --black--  @-t1
  oled:VCC --red--    @+t1
  oled:SCL --white--  @10c
  oled:SDA --green--  @11c
  esp:3V3  --red--    @+t1
  esp:GND  --black--  @-t1
  esp:GPIO22 --white-- @10c
  esp:GPIO21 --green-- @11c
