// Home page — schematex.dev landing
const { useState, useEffect, useRef } = React;

// ---------- Tiny SVG diagram stubs (monoline, on-brand) ----------
// All render to currentColor so they inherit accent/text.

function StubGenogram() {
  return (
    <svg viewBox="0 0 320 220" style={{width:'100%',height:'100%'}} fill="none" stroke="currentColor" strokeWidth="1.6">
      {/* gen I */}
      <rect x="30" y="20" width="28" height="28"/>
      <line x1="32" y1="22" x2="56" y2="46" strokeWidth="1.2"/>
      <circle cx="100" cy="34" r="14"/>
      <line x1="58" y1="34" x2="86" y2="34"/>
      <rect x="220" y="20" width="28" height="28"/>
      <line x1="222" y1="22" x2="246" y2="46" strokeWidth="1.2"/>
      <circle cx="290" cy="34" r="14"/>
      <line x1="248" y1="34" x2="276" y2="34"/>
      {/* drop */}
      <line x1="65" y1="48" x2="65" y2="108"/>
      <line x1="255" y1="48" x2="255" y2="108"/>
      {/* gen II */}
      <rect x="52" y="108" width="26" height="26"/>
      <line x1="54" y1="110" x2="76" y2="132" strokeWidth="1.2"/>
      <circle cx="242" cy="121" r="13"/>
      <line x1="242" y1="110" x2="254" y2="132" strokeWidth="1.2"/>
      <circle cx="286" cy="121" r="13"/>
      {/* marriage */}
      <line x1="78" y1="121" x2="229" y2="121"/>
      <line x1="153" y1="121" x2="153" y2="170"/>
      {/* proband */}
      <rect x="140" y="170" width="26" height="26" strokeWidth="2.4"/>
      <line x1="120" y1="204" x2="138" y2="188" strokeWidth="1.2"/>
      <polygon points="138,188 132,189 135,194" fill="currentColor" stroke="none"/>
      {/* close-relationship triple */}
      <g stroke="var(--accent)" strokeWidth="1.2">
        <line x1="165" y1="180" x2="232" y2="130"/>
        <line x1="168" y1="183" x2="235" y2="133"/>
        <line x1="171" y1="186" x2="238" y2="136"/>
      </g>
      <g fontFamily="var(--mono)" fontSize="9" stroke="none" fill="var(--text-muted)">
        <text x="30" y="62">fleamont</text>
        <text x="84" y="62">euphemia</text>
        <text x="216" y="62">mr_evans</text>
        <text x="270" y="62">mrs_evans</text>
        <text x="52" y="146">james</text>
        <text x="226" y="146">lily</text>
        <text x="272" y="146">petunia</text>
        <text x="138" y="210" fill="var(--text)">harry · index</text>
      </g>
    </svg>
  );
}

function StubLadder() {
  return (
    <svg viewBox="0 0 340 220" style={{width:'100%',height:'100%'}} fill="none" stroke="currentColor" strokeWidth="1.4">
      <line x1="20" y1="14" x2="20" y2="206" strokeWidth="2.2"/>
      <line x1="320" y1="14" x2="320" y2="206" strokeWidth="2.2"/>
      {/* rung 1 XIC */}
      <g transform="translate(55,56)">
        <line x1="-35" y1="0" x2="0" y2="0"/>
        <line x1="0" y1="-12" x2="0" y2="12"/>
        <line x1="16" y1="-12" x2="16" y2="12"/>
        <line x1="16" y1="0" x2="70" y2="0"/>
        <text x="-30" y="-18" fontFamily="var(--mono)" fontSize="8" fill="var(--text)" stroke="none">XIC</text>
        <text x="-30" y="24" fontFamily="var(--mono)" fontSize="7" fill="var(--text-muted)" stroke="none">AUTO_HMIPB</text>
        <text x="-30" y="32" fontFamily="var(--mono)" fontSize="7" fill="var(--text-subtle)" stroke="none">BIT 5.10</text>
      </g>
      {/* XIO */}
      <g transform="translate(155,56)">
        <line x1="-30" y1="0" x2="0" y2="0"/>
        <line x1="0" y1="-12" x2="0" y2="12"/>
        <line x1="16" y1="-12" x2="16" y2="12"/>
        <line x1="0" y1="-12" x2="16" y2="12"/>
        <line x1="16" y1="0" x2="70" y2="0"/>
        <text x="-26" y="-18" fontFamily="var(--mono)" fontSize="8" fill="var(--text)" stroke="none">XIO</text>
        <text x="-30" y="24" fontFamily="var(--mono)" fontSize="7" fill="var(--text-muted)" stroke="none">MANL_HMIPB</text>
        <text x="-30" y="32" fontFamily="var(--mono)" fontSize="7" fill="var(--text-subtle)" stroke="none">BIT 5.11</text>
      </g>
      <circle cx="245" cy="56" r="3" fill="currentColor"/>
      <line x1="245" y1="56" x2="245" y2="130"/>
      {/* OTL */}
      <g transform="translate(245,100)">
        <circle cx="34" cy="0" r="14"/>
        <text x="28" y="3" fontFamily="var(--mono)" fontSize="10" fill="var(--accent)" stroke="none" fontWeight="500">L</text>
        <line x1="48" y1="0" x2="75" y2="0"/>
        <text x="16" y="-22" fontFamily="var(--mono)" fontSize="8" fill="var(--text)" stroke="none">OTL</text>
        <text x="16" y="22" fontFamily="var(--mono)" fontSize="7" fill="var(--text-muted)" stroke="none">SYS_AUTO</text>
      </g>
      {/* OTU */}
      <g transform="translate(245,160)">
        <circle cx="34" cy="0" r="14"/>
        <text x="28" y="3" fontFamily="var(--mono)" fontSize="10" fill="var(--accent)" stroke="none" fontWeight="500">U</text>
        <line x1="48" y1="0" x2="75" y2="0"/>
        <text x="16" y="-22" fontFamily="var(--mono)" fontSize="8" fill="var(--text)" stroke="none">OTU</text>
        <text x="16" y="22" fontFamily="var(--mono)" fontSize="7" fill="var(--text-muted)" stroke="none">SYS_MANL</text>
      </g>
    </svg>
  );
}

function StubEntity() {
  return (
    <svg viewBox="0 0 320 220" style={{width:'100%',height:'100%'}} fill="none" stroke="currentColor" strokeWidth="1.5">
      <rect x="120" y="12" width="80" height="36"/>
      <text x="134" y="35" fontFamily="var(--mono)" fontSize="11" fill="var(--text)" stroke="none">Trust A</text>
      <text x="134" y="46" fontFamily="var(--mono)" fontSize="7" fill="var(--text-subtle)" stroke="none">SD · trust</text>
      <line x1="160" y1="48" x2="160" y2="88"/>
      <text x="168" y="72" fontFamily="var(--mono)" fontSize="10" fill="var(--accent)" stroke="none">100%</text>
      <rect x="120" y="88" width="80" height="36"/>
      <text x="130" y="111" fontFamily="var(--mono)" fontSize="11" fill="var(--text)" stroke="none">Acme Inc.</text>
      <text x="130" y="122" fontFamily="var(--mono)" fontSize="7" fill="var(--text-subtle)" stroke="none">DE · corp</text>
      <path d="M160 124 L60 170"/>
      <path d="M160 124 L260 170"/>
      <text x="90" y="152" fontFamily="var(--mono)" fontSize="10" fill="var(--accent)" stroke="none">100%</text>
      <text x="210" y="152" fontFamily="var(--mono)" fontSize="10" fill="var(--accent)" stroke="none">60%</text>
      <rect x="20" y="170" width="80" height="34"/>
      <text x="32" y="192" fontFamily="var(--mono)" fontSize="10" fill="var(--text)" stroke="none">Acme UK</text>
      <text x="32" y="202" fontFamily="var(--mono)" fontSize="7" fill="var(--text-subtle)" stroke="none">UK · ltd</text>
      <rect x="220" y="170" width="80" height="34"/>
      <text x="232" y="192" fontFamily="var(--mono)" fontSize="10" fill="var(--text)" stroke="none">Acme Fund</text>
      <text x="232" y="202" fontFamily="var(--mono)" fontSize="7" fill="var(--text-subtle)" stroke="none">KY · fund</text>
    </svg>
  );
}

function StubPedigree() {
  return (
    <svg viewBox="0 0 320 220" fill="none" stroke="currentColor" strokeWidth="1.5" style={{width:'100%',height:'100%'}}>
      <rect x="60" y="20" width="24" height="24"/>
      <circle cx="220" cy="32" r="12" fill="currentColor"/>
      <line x1="84" y1="32" x2="208" y2="32"/>
      <line x1="146" y1="32" x2="146" y2="85"/>
      <rect x="40" y="85" width="24" height="24" fill="currentColor"/>
      <circle cx="140" cy="97" r="12"/>
      <line x1="130" y1="91" x2="150" y2="111"/>
      <rect x="200" y="85" width="24" height="24"/>
      <circle cx="270" cy="97" r="12" fill="currentColor"/>
      <line x1="64" y1="97" x2="128" y2="97"/>
      <line x1="152" y1="97" x2="200" y2="97"/>
      <line x1="224" y1="97" x2="258" y2="97"/>
      <line x1="176" y1="97" x2="176" y2="150"/>
      <circle cx="176" cy="165" r="14" fill="currentColor"/>
      <g stroke="var(--accent)" strokeWidth="1.5">
        <line x1="130" y1="190" x2="164" y2="170"/>
        <polygon points="164,170 158,170 161,176" fill="var(--accent)" stroke="none"/>
      </g>
      <text x="118" y="202" fontFamily="var(--mono)" fontSize="9" fill="var(--accent)" stroke="none">proband</text>
    </svg>
  );
}

function StubPhylo() {
  return (
    <svg viewBox="0 0 320 220" fill="none" stroke="currentColor" strokeWidth="1.5" style={{width:'100%',height:'100%'}}>
      <path d="M20 110 L80 110 L80 40 L200 40 L200 20 L280 20"/>
      <path d="M200 40 L200 60 L280 60"/>
      <path d="M80 110 L140 110 L140 95 L280 95"/>
      <path d="M140 110 L140 130 L280 130"/>
      <path d="M80 110 L80 170 L180 170 L180 165 L280 165"/>
      <path d="M180 170 L180 190 L280 190"/>
      <g stroke="none" fontFamily="var(--mono)" fontSize="9">
        <text x="285" y="23" fill="var(--text)">Ecoli</text>
        <text x="285" y="63" fill="var(--text)">Salmonella</text>
        <text x="285" y="98" fill="var(--text)">Bacillus</text>
        <text x="285" y="133" fill="var(--text)">Staph</text>
        <text x="285" y="168" fill="var(--text)">Myco_tb</text>
        <text x="285" y="193" fill="var(--text)">Strepto</text>
      </g>
      <g stroke="none">
        <circle cx="80" cy="110" r="8" fill="var(--accent-soft)"/>
        <text x="72" y="113" fontFamily="var(--mono)" fontSize="7" fill="var(--accent-ink)">98</text>
      </g>
    </svg>
  );
}

function StubSLD() {
  return (
    <svg viewBox="0 0 320 220" fill="none" stroke="currentColor" strokeWidth="1.5" style={{width:'100%',height:'100%'}}>
      <line x1="160" y1="10" x2="160" y2="30"/>
      <text x="170" y="20" fontFamily="var(--mono)" fontSize="9" fill="var(--text-muted)" stroke="none">138 kV</text>
      {/* transformer coils */}
      <g transform="translate(160,50)">
        <circle r="10"/>
        <circle cy="16" r="10"/>
      </g>
      <line x1="160" y1="76" x2="160" y2="100"/>
      <text x="170" y="90" fontFamily="var(--mono)" fontSize="9" fill="var(--text-muted)" stroke="none">XFMR 15 MVA</text>
      {/* MV bus */}
      <line x1="30" y1="110" x2="290" y2="110" strokeWidth="3"/>
      <text x="30" y="103" fontFamily="var(--mono)" fontSize="9" fill="var(--text-muted)" stroke="none">13.8 kV BUS</text>
      {/* feeders */}
      <line x1="70" y1="110" x2="70" y2="140"/>
      <rect x="62" y="140" width="16" height="16"/>
      <line x1="70" y1="156" x2="70" y2="180"/>
      <line x1="160" y1="110" x2="160" y2="140"/>
      <rect x="152" y="140" width="16" height="16"/>
      <line x1="160" y1="156" x2="160" y2="180"/>
      <line x1="250" y1="110" x2="250" y2="140"/>
      <rect x="242" y="140" width="16" height="16"/>
      <line x1="250" y1="156" x2="250" y2="180"/>
      <g stroke="none" fontFamily="var(--mono)" fontSize="8" fill="var(--text-subtle)">
        <text x="58" y="195">F-01</text>
        <text x="148" y="195">F-02</text>
        <text x="238" y="195">F-03</text>
      </g>
    </svg>
  );
}

function StubCircuit() {
  return (
    <svg viewBox="0 0 320 220" fill="none" stroke="currentColor" strokeWidth="1.5" style={{width:'100%',height:'100%'}}>
      {/* Vcc rail */}
      <line x1="20" y1="30" x2="300" y2="30" strokeWidth="2"/>
      <text x="302" y="33" fontFamily="var(--mono)" fontSize="9" fill="var(--accent)" stroke="none">Vcc</text>
      {/* GND rail */}
      <line x1="20" y1="190" x2="300" y2="190" strokeWidth="2"/>
      {/* Rc */}
      <line x1="180" y1="30" x2="180" y2="60"/>
      <path d="M175 60 L185 60 L185 65 L175 70 L185 75 L175 80 L185 85 L180 90"/>
      <line x1="180" y1="90" x2="180" y2="110"/>
      {/* Q1 */}
      <circle cx="180" cy="125" r="14"/>
      <line x1="180" y1="111" x2="180" y2="115"/>
      <line x1="166" y1="125" x2="140" y2="125"/>
      <line x1="180" y1="139" x2="180" y2="150"/>
      {/* Rb */}
      <path d="M80 30 L80 70 L90 70 L70 75 L90 80 L70 85 L90 90 L80 95 L80 125"/>
      <line x1="80" y1="125" x2="140" y2="125"/>
      {/* Re */}
      <path d="M180 150 L185 155 L175 160 L185 165 L175 170 L180 175 L180 190"/>
      <text x="60" y="50" fontFamily="var(--mono)" fontSize="9" fill="var(--text-muted)" stroke="none">Rb 100k</text>
      <text x="190" y="70" fontFamily="var(--mono)" fontSize="9" fill="var(--text-muted)" stroke="none">Rc 2.2k</text>
      <text x="190" y="125" fontFamily="var(--mono)" fontSize="9" fill="var(--text)" stroke="none">Q1</text>
      <text x="190" y="170" fontFamily="var(--mono)" fontSize="9" fill="var(--text-muted)" stroke="none">Re 1k</text>
    </svg>
  );
}

function StubLogic() {
  return (
    <svg viewBox="0 0 320 220" fill="none" stroke="currentColor" strokeWidth="1.5" style={{width:'100%',height:'100%'}}>
      {/* XOR */}
      <g transform="translate(60,50)">
        <path d="M0 0 Q8 15 0 30"/>
        <path d="M6 0 Q22 15 6 30 L26 30 Q46 15 26 0 Z"/>
        <line x1="-20" y1="8" x2="6" y2="8"/>
        <line x1="-20" y1="22" x2="6" y2="22"/>
        <line x1="46" y1="15" x2="70" y2="15"/>
        <text x="12" y="19" fontFamily="var(--mono)" fontSize="8" fill="var(--text)" stroke="none">XOR</text>
      </g>
      {/* AND */}
      <g transform="translate(60,130)">
        <path d="M0 0 L15 0 Q32 0 32 15 Q32 30 15 30 L0 30 Z"/>
        <line x1="-20" y1="8" x2="0" y2="8"/>
        <line x1="-20" y1="22" x2="0" y2="22"/>
        <line x1="32" y1="15" x2="70" y2="15"/>
        <text x="8" y="19" fontFamily="var(--mono)" fontSize="8" fill="var(--text)" stroke="none">AND</text>
      </g>
      {/* final OR */}
      <g transform="translate(200,90)">
        <path d="M0 0 Q6 20 0 40 Q22 40 42 20 Q22 0 0 0 Z"/>
        <line x1="-60" y1="10" x2="0" y2="10"/>
        <line x1="-60" y1="30" x2="0" y2="30"/>
        <line x1="42" y1="20" x2="80" y2="20"/>
        <text x="8" y="25" fontFamily="var(--mono)" fontSize="8" fill="var(--text)" stroke="none">OR</text>
      </g>
      <g stroke="none" fontFamily="var(--mono)" fontSize="9" fill="var(--text-muted)">
        <text x="20" y="62">A</text>
        <text x="20" y="76">B</text>
        <text x="20" y="142">A</text>
        <text x="20" y="156">Cin</text>
        <text x="286" y="115">Sum</text>
        <text x="286" y="130" fill="var(--accent)">Cout</text>
      </g>
    </svg>
  );
}

function StubTiming() {
  return (
    <svg viewBox="0 0 320 220" fill="none" stroke="currentColor" strokeWidth="1.6" style={{width:'100%',height:'100%'}}>
      <g stroke="none" fontFamily="var(--mono)" fontSize="10" fill="var(--text)">
        <text x="10" y="40">CLK</text>
        <text x="10" y="100">CS_N</text>
        <text x="10" y="160">MOSI</text>
      </g>
      {/* CLK — clock ticks */}
      <path d="M60 40 L70 40 L70 25 L85 25 L85 40 L100 40 L100 25 L115 25 L115 40 L130 40 L130 25 L145 25 L145 40 L160 40 L160 25 L175 25 L175 40 L190 40 L190 25 L205 25 L205 40 L220 40 L220 25 L235 25 L235 40 L250 40 L250 25 L265 25 L265 40 L300 40"/>
      {/* CS_N */}
      <path d="M60 85 L70 85 L70 100 L280 100 L280 85 L300 85"/>
      {/* MOSI — bus segments */}
      <g stroke="var(--accent)">
        <path d="M60 145 L66 155 L100 155 L106 145 L112 155 L145 155 L151 145 L157 155 L190 155 L196 145 L202 155 L235 155 L241 145 L247 155 L280 155 L286 145 L300 145"/>
        <path d="M60 165 L66 155 L100 155 L106 165 L112 155 L145 155 L151 165 L157 155 L190 155 L196 165 L202 155 L235 155 L241 165 L247 155 L280 155 L286 165 L300 165"/>
      </g>
      <g stroke="none" fontFamily="var(--mono)" fontSize="8" fill="var(--text-muted)">
        <text x="78" y="159">0xAB</text>
        <text x="122" y="159">0xCD</text>
        <text x="166" y="159">0xEF</text>
        <text x="213" y="159">0x01</text>
        <text x="258" y="159">0x02</text>
      </g>
    </svg>
  );
}

function StubEcomap() {
  return (
    <svg viewBox="0 0 320 220" fill="none" stroke="currentColor" strokeWidth="1.5" style={{width:'100%',height:'100%'}}>
      <circle cx="160" cy="110" r="28"/>
      <text x="138" y="114" fontFamily="var(--mono)" fontSize="9" fill="var(--text)" stroke="none">Family</text>
      {/* outer nodes */}
      <circle cx="40" cy="40" r="16"/>
      <circle cx="280" cy="40" r="16"/>
      <circle cx="40" cy="180" r="16"/>
      <circle cx="280" cy="180" r="16"/>
      <circle cx="160" cy="20" r="12"/>
      <circle cx="160" cy="200" r="12"/>
      {/* strong = triple */}
      <g strokeWidth="1.2">
        <line x1="138" y1="95" x2="55" y2="52"/>
        <line x1="141" y1="92" x2="58" y2="49"/>
        <line x1="144" y1="89" x2="61" y2="46"/>
      </g>
      {/* weak = dashed */}
      <line x1="182" y1="95" x2="264" y2="52" strokeDasharray="3,3"/>
      {/* arrow flow in */}
      <line x1="55" y1="168" x2="140" y2="125"/>
      <polygon points="140,125 134,127 137,131" fill="currentColor" stroke="none"/>
      {/* stress — zigzag */}
      <path d="M265 168 L258 160 L252 168 L246 160 L240 168 L234 160 L228 168 L222 160 L182 125" stroke="var(--accent)"/>
      <line x1="160" y1="32" x2="160" y2="82"/>
      <line x1="160" y1="138" x2="160" y2="188"/>
      <g stroke="none" fontFamily="var(--mono)" fontSize="8" fill="var(--text-subtle)">
        <text x="20" y="30">IRC</text>
        <text x="262" y="30">School</text>
        <text x="18" y="170">Clinic</text>
        <text x="258" y="170">Temple</text>
      </g>
    </svg>
  );
}

function StubSociogram() {
  return (
    <svg viewBox="0 0 320 220" fill="none" stroke="currentColor" strokeWidth="1.4" style={{width:'100%',height:'100%'}}>
      {/* group boys — blue */}
      <g stroke="var(--accent)">
        <circle cx="80" cy="60" r="12"/>
        <circle cx="140" cy="50" r="12"/>
        <circle cx="130" cy="110" r="12"/>
        <circle cx="70" cy="120" r="12"/>
      </g>
      {/* group girls */}
      <g>
        <circle cx="220" cy="70" r="12"/>
        <circle cx="260" cy="120" r="12"/>
        <circle cx="200" cy="160" r="12"/>
        <circle cx="150" cy="170" r="12"/>
      </g>
      {/* mutual */}
      <line x1="92" y1="60" x2="128" y2="52" strokeWidth="2"/>
      <line x1="142" y1="62" x2="132" y2="98" strokeWidth="2"/>
      <line x1="82" y1="72" x2="130" y2="162" strokeWidth="2"/>
      {/* rejection — crossed */}
      <g stroke="var(--accent)">
        <line x1="152" y1="52" x2="208" y2="72"/>
        <line x1="178" y1="58" x2="184" y2="70"/>
        <line x1="184" y1="58" x2="178" y2="70"/>
      </g>
      {/* other */}
      <line x1="232" y1="78" x2="252" y2="112" strokeDasharray="2,2"/>
      <line x1="210" y1="152" x2="162" y2="168"/>
      <g stroke="none" fontFamily="var(--mono)" fontSize="8" fill="var(--text-subtle)">
        <text x="70" y="44">tom</text>
        <text x="132" y="34">jack</text>
        <text x="122" y="94">mike</text>
        <text x="62" y="140">leo</text>
        <text x="212" y="54">anna</text>
        <text x="252" y="104">beth</text>
        <text x="190" y="180">chloe</text>
        <text x="140" y="190">diana</text>
      </g>
    </svg>
  );
}

function StubBlock() {
  return (
    <svg viewBox="0 0 320 220" fill="none" stroke="currentColor" strokeWidth="1.5" style={{width:'100%',height:'100%'}}>
      <line x1="10" y1="110" x2="44" y2="110"/>
      {/* summing junction */}
      <circle cx="55" cy="110" r="10"/>
      <line x1="45" y1="110" x2="65" y2="110"/>
      <line x1="55" y1="100" x2="55" y2="120"/>
      <line x1="65" y1="110" x2="100" y2="110"/>
      <rect x="100" y="95" width="60" height="30"/>
      <text x="116" y="115" fontFamily="var(--mono)" fontSize="10" fill="var(--text)" stroke="none">K(s)</text>
      <line x1="160" y1="110" x2="200" y2="110"/>
      <rect x="200" y="95" width="70" height="30"/>
      <text x="210" y="115" fontFamily="var(--mono)" fontSize="10" fill="var(--text)" stroke="none">G(s)</text>
      <line x1="270" y1="110" x2="310" y2="110"/>
      <polygon points="310,110 303,106 303,114" fill="currentColor" stroke="none"/>
      {/* feedback */}
      <path d="M280 125 L280 170 L55 170 L55 120" stroke="var(--accent)" strokeDasharray="4,3"/>
      <rect x="160" y="155" width="60" height="30" stroke="var(--accent)"/>
      <text x="175" y="175" fontFamily="var(--mono)" fontSize="10" fill="var(--accent)" stroke="none">H(s)</text>
      <text x="40" y="100" fontFamily="var(--mono)" fontSize="10" fill="var(--text-muted)" stroke="none">−</text>
      <text x="15" y="102" fontFamily="var(--mono)" fontSize="9" fill="var(--text-muted)" stroke="none">r</text>
      <text x="296" y="102" fontFamily="var(--mono)" fontSize="9" fill="var(--text-muted)" stroke="none">y</text>
    </svg>
  );
}

function StubFishbone() {
  return (
    <svg viewBox="0 0 320 220" fill="none" stroke="currentColor" strokeWidth="1.5" style={{width:'100%',height:'100%'}}>
      <line x1="20" y1="110" x2="270" y2="110" strokeWidth="2"/>
      <polygon points="270,110 280,104 280,116" fill="currentColor" stroke="none"/>
      <text x="286" y="115" fontFamily="var(--mono)" fontSize="10" fill="var(--accent)" stroke="none">effect</text>
      {/* upper branches */}
      <line x1="70" y1="110" x2="50" y2="40"/>
      <line x1="150" y1="110" x2="130" y2="40"/>
      <line x1="220" y1="110" x2="200" y2="40"/>
      {/* lower */}
      <line x1="70" y1="110" x2="50" y2="180"/>
      <line x1="150" y1="110" x2="130" y2="180"/>
      <line x1="220" y1="110" x2="200" y2="180"/>
      {/* sub branches */}
      <g strokeWidth="1">
        <line x1="62" y1="82" x2="44" y2="78"/>
        <line x1="56" y1="62" x2="38" y2="58"/>
        <line x1="142" y1="82" x2="124" y2="78"/>
        <line x1="136" y1="62" x2="118" y2="58"/>
        <line x1="62" y1="140" x2="44" y2="144"/>
        <line x1="142" y1="140" x2="124" y2="144"/>
      </g>
      <g stroke="none" fontFamily="var(--mono)" fontSize="8" fill="var(--text-subtle)">
        <text x="26" y="38">Method</text>
        <text x="108" y="38">Machine</text>
        <text x="180" y="38">Material</text>
        <text x="26" y="196">Measurement</text>
        <text x="110" y="196">Milieu</text>
        <text x="188" y="196">Man</text>
      </g>
    </svg>
  );
}

// ---------- Diagram registry ----------
const DIAGRAMS = [
  { id: 'genogram',  name: 'Genogram',           std: 'McGoldrick 2020',  dom: 'relations', Stub: StubGenogram },
  { id: 'ladder',    name: 'Ladder logic',       std: 'IEC 61131-3',       dom: 'electrical', Stub: StubLadder },
  { id: 'entity',    name: 'Entity structure',   std: 'Cap table',          dom: 'corporate', Stub: StubEntity },
  { id: 'pedigree',  name: 'Pedigree',           std: 'NSGC',               dom: 'relations', Stub: StubPedigree },
  { id: 'phylo',     name: 'Phylo tree',         std: 'Newick + NHX',       dom: 'relations', Stub: StubPhylo },
  { id: 'sld',       name: 'Single-line diag.',  std: 'IEEE 315',           dom: 'electrical', Stub: StubSLD },
  { id: 'circuit',   name: 'Circuit schematic',  std: 'SPICE netlist',      dom: 'electrical', Stub: StubCircuit },
  { id: 'logic',     name: 'Logic gate',         std: 'IEEE 91',            dom: 'electrical', Stub: StubLogic },
  { id: 'timing',    name: 'Timing diagram',     std: 'WaveDrom',           dom: 'electrical', Stub: StubTiming },
  { id: 'ecomap',    name: 'Ecomap',             std: 'Hartman 1978',       dom: 'relations', Stub: StubEcomap },
  { id: 'sociogram', name: 'Sociogram',          std: 'Moreno',             dom: 'relations', Stub: StubSociogram },
  { id: 'block',     name: 'Block diagram',      std: 'Signal-flow',        dom: 'electrical', Stub: StubBlock },
  { id: 'fishbone',  name: 'Fishbone',           std: 'Ishikawa',           dom: 'causality', Stub: StubFishbone }
];

// Cluster colors map to the 8-color category palette positions.
// These positions are stable across light/dark; theme changes hue, not semantic.
const DOMAINS = {
  relations:  { label: 'Relationships',           blurb: 'Human & biological kinship',      color: 'var(--cat-0)' }, // blue
  electrical: { label: 'Electrical & Industrial', blurb: 'Circuits, PLCs, power, timing',    color: 'var(--cat-2)' }, // amber
  corporate:  { label: 'Corporate & Legal',       blurb: 'Ownership and entity trees',       color: 'var(--cat-3)' }, // violet
  causality:  { label: 'Causality & Analysis',    blurb: 'Cause-and-effect decomposition',   color: 'var(--cat-1)' }  // emerald
};

// ---------- DSL samples (pre-tokenized) ----------
const DSL_SAMPLES = {
  genogram: [
    ['kw','genogram'], ['tx',' '], ['str','"The Potter Family"'], ['br','\n'],
    ['tx','  fleamont '], ['op','['], ['tx','male, '], ['num','1909'], ['tx',', '], ['kw','deceased'], ['op',']'], ['br','\n'],
    ['tx','  euphemia '], ['op','['], ['tx','female, '], ['num','1920'], ['tx',', '], ['kw','deceased'], ['op',']'], ['br','\n'],
    ['tx','  fleamont '], ['op','--'], ['tx',' euphemia'], ['br','\n'],
    ['tx','    james '], ['op','['], ['tx','male, '], ['num','1960'], ['tx',', '], ['kw','deceased'], ['op',']'], ['br','\n'],
    ['tx','  james '], ['op','--'], ['tx',' lily '], ['str','"m. 1978"'], ['br','\n'],
    ['tx','    harry '], ['op','['], ['tx','male, '], ['num','1980'], ['tx',', '], ['kw','index'], ['op',']'], ['br','\n'],
    ['tx','  harry '], ['op','-close-'], ['tx',' lily']
  ],
  ladder: [
    ['kw','ladder'], ['tx',' '], ['str','"Mode Select"'], ['br','\n'],
    ['kw','rung'], ['tx',' '], ['num','1'], ['tx',' '], ['str','"Set Auto"'], ['tx',':'], ['br','\n'],
    ['tx','  '], ['kw','XIC'], ['op','('], ['tx','AUTO_HMIPB, '], ['str','"BIT 5.10"'], ['op',')'], ['br','\n'],
    ['tx','  '], ['kw','XIO'], ['op','('], ['tx','MANL_HMIPB, '], ['str','"BIT 5.11"'], ['op',')'], ['br','\n'],
    ['tx','  '], ['kw','XIO'], ['op','('], ['tx','SYS_FAULT, '], ['str','"BIT 3.0"'], ['op',')'], ['br','\n'],
    ['tx','  '], ['kw','parallel'], ['tx',':'], ['br','\n'],
    ['tx','    '], ['kw','OTL'], ['op','('], ['tx','SYS_AUTO, '], ['str','"BIT 3.1"'], ['op',')'], ['br','\n'],
    ['tx','    '], ['kw','OTU'], ['op','('], ['tx','SYS_MANUAL, '], ['str','"BIT 3.2"'], ['op',')']
  ],
  entity: [
    ['kw','entity'], ['tx',' '], ['str','"Acme Holdings"'], ['br','\n'],
    ['tx','  acme_inc '], ['op','['], ['tx','type: corp, jurisdiction: DE'], ['op',']'], ['br','\n'],
    ['tx','  acme_uk  '], ['op','['], ['tx','type: ltd,  jurisdiction: UK'], ['op',']'], ['br','\n'],
    ['tx','  acme_fund'], ['op','['], ['tx','type: fund, jurisdiction: KY'], ['op',']'], ['br','\n'],
    ['tx','  trust_a  '], ['op','['], ['tx','type: trust, jurisdiction: SD'], ['op',']'], ['br','\n'],
    ['tx','  trust_a --'], ['num','100%'], ['tx','--> acme_inc'], ['br','\n'],
    ['tx','  acme_inc --'], ['num','100%'], ['tx','--> acme_uk'], ['br','\n'],
    ['tx','  acme_inc --'], ['num','60%'], ['tx','--> acme_fund']
  ],
  pedigree: [
    ['kw','pedigree'], ['tx',' '], ['str','"BRCA1 Family"'], ['br','\n'],
    ['tx','  I-1 '], ['op','['], ['tx','male, unaffected'], ['op',']'], ['br','\n'],
    ['tx','  I-2 '], ['op','['], ['tx','female, '], ['kw','affected'], ['tx',', deceased'], ['op',']'], ['br','\n'],
    ['tx','  I-1 '], ['op','--'], ['tx',' I-2'], ['br','\n'],
    ['tx','    II-1 '], ['op','['], ['tx','female, '], ['kw','affected'], ['op',']'], ['br','\n'],
    ['tx','    II-3 '], ['op','['], ['tx','female, carrier'], ['op',']'], ['br','\n'],
    ['tx','  II-1 '], ['op','--'], ['tx',' II-4'], ['br','\n'],
    ['tx','    III-1 '], ['op','['], ['tx','female, affected, '], ['kw','proband'], ['op',']']
  ],
  sld: [
    ['kw','sld'], ['tx',' '], ['str','"13.8 kV Substation"'], ['br','\n'],
    ['tx','  utility  '], ['op','['], ['tx','label: '], ['str','"Grid 138 kV"'], ['op',']'], ['br','\n'],
    ['tx','  xfmr1    '], ['op','['], ['tx','type: transformer, kva: '], ['num','15000'], ['op',']'], ['br','\n'],
    ['tx','  bus_hv   '], ['op','['], ['tx','type: bus, voltage: '], ['num','138'], ['op',']'], ['br','\n'],
    ['tx','  bus_mv   '], ['op','['], ['tx','type: bus, voltage: '], ['num','13.8'], ['op',']'], ['br','\n'],
    ['tx','  brk1     '], ['op','['], ['tx','type: breaker, amps: '], ['num','1200'], ['op',']'], ['br','\n'],
    ['tx','  utility -> bus_hv'], ['br','\n'],
    ['tx','  bus_hv -> xfmr1 -> bus_mv -> brk1']
  ]
};
function tokenToClass(t) {
  return { kw: 'tok-kw', str: 'tok-str', num: 'tok-num', op: 'tok-op', tx: '', br: '' }[t] || '';
}
function renderTokens(tokens) {
  return tokens.map((tk, i) => {
    const [type, text] = tk;
    if (type === 'br') return <br key={i}/>;
    const cls = tokenToClass(type);
    return cls ? <span key={i} className={cls}>{text}</span> : <React.Fragment key={i}>{text}</React.Fragment>;
  });
}

// ---------- NAV ----------
function TopNav({ route, setRoute, theme, setTheme }) {
  const links = [
    { id: 'home', name: 'home' },
    { id: 'playground', name: 'playground' },
    { id: 'gallery', name: 'gallery' },
    { id: 'examples', name: 'examples' }
  ];
  const themes = [
    { id: 'default', label: 'default' },
    { id: 'mono', label: 'mono' },
    { id: 'dark', label: 'dark' }
  ];
  return (
    <header className="site-nav">
      <div className="nav-inner">
        <a className="wm" onClick={() => setRoute('home')}>
          schematex<span className="ver">v0.1.0</span>
        </a>
        <nav className="primary">
          {links.map(l => (
            <a key={l.id}
               className={route === l.id ? 'active' : ''}
               onClick={() => setRoute(l.id)}>
              {l.name}
            </a>
          ))}
          <a>docs</a>
        </nav>
        <div className="right">
          <div className="theme-switch" role="tablist" aria-label="theme">
            {themes.map(t => (
              <button key={t.id}
                      className={theme === t.id ? 'active' : ''}
                      onClick={() => setTheme(t.id)}
                      title={`theme: ${t.label}`}>{t.label}</button>
            ))}
          </div>
          <a className="gh-badge">
            <span className="gh-l">github</span>
            <span className="gh-r">★ 42</span>
          </a>
        </div>
      </div>
    </header>
  );
}

Object.assign(window, {
  DIAGRAMS, DOMAINS, DSL_SAMPLES,
  StubGenogram, StubLadder, StubEntity, StubPedigree, StubPhylo, StubSLD,
  StubCircuit, StubLogic, StubTiming, StubEcomap, StubSociogram, StubBlock, StubFishbone,
  renderTokens, TopNav
});
