/*
 * Platzhalter-Illustrationen (eigene SVGs im flachen Stil, keine unDraw-Kopien).
 * Sobald die After-Effects-Renderings vorliegen, wird pro Szene einfach das Feld
 * "video" in data/inhalte.js gesetzt – dann ersetzt das Video diese Grafik.
 * Alle Grafiken: viewBox 0 0 240 180, Akzentfarbe über CSS-Variable --accent.
 */
(function () {
  const S = (inner) =>
    '<svg viewBox="0 0 240 180" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false">' +
    '<ellipse cx="120" cy="166" rx="88" ry="6" class="i-soft"/>' + inner + '</svg>';

  window.LERN_ICONS = {
    mail: S(
      '<rect x="55" y="42" width="130" height="90" rx="8" class="i-wht i-st"/>' +
      '<path d="M59 48 L120 94 L181 48" class="i-no i-st"/>' +
      '<circle cx="184" cy="42" r="14" class="i-acc"/>' +
      '<text x="184" y="48" text-anchor="middle" class="i-txt-w" font-size="16" font-weight="700">1</text>'
    ),
    hook: S(
      '<path d="M150 4 V78" class="i-no i-st-thin"/>' +
      '<rect x="48" y="78" width="120" height="78" rx="8" class="i-wht i-st"/>' +
      '<path d="M52 84 L108 124 L164 84" class="i-no i-st"/>' +
      '<path d="M150 78 V112 a14 14 0 1 1 -28 0 l6 -6" class="i-no i-sta"/>' +
      '<circle cx="190" cy="60" r="16" class="i-acc"/>' +
      '<text x="190" y="67" text-anchor="middle" class="i-txt-w" font-size="20" font-weight="800">!</text>'
    ),
    magnifier: S(
      '<rect x="22" y="34" width="196" height="30" rx="15" class="i-wht i-st"/>' +
      '<text x="40" y="54" class="i-txt" font-size="12">https://login-sicher.example.biz</text>' +
      '<circle cx="150" cy="104" r="34" class="i-wht i-st-thick"/>' +
      '<path d="M174 128 L204 156" class="i-no i-st-thick"/>' +
      '<text x="150" y="112" text-anchor="middle" class="i-txt-a" font-size="22" font-weight="800">?</text>'
    ),
    report: S(
      '<path d="M120 22 L172 42 V88 C172 122 150 146 120 158 C90 146 68 122 68 88 V42 Z" class="i-acc"/>' +
      '<path d="M96 90 L113 107 L146 72" class="i-no i-stw"/>'
    ),
    key: S(
      '<rect x="62" y="22" width="116" height="28" rx="14" class="i-wht i-st"/>' +
      '<circle cx="82" cy="36" r="4" class="i-ink"/><circle cx="96" cy="36" r="4" class="i-ink"/>' +
      '<circle cx="110" cy="36" r="4" class="i-ink"/><circle cx="124" cy="36" r="4" class="i-ink"/>' +
      '<circle cx="138" cy="36" r="4" class="i-ink"/><circle cx="152" cy="36" r="4" class="i-ink"/>' +
      '<circle cx="80" cy="110" r="30" class="i-acc"/><circle cx="72" cy="110" r="10" class="i-wht"/>' +
      '<rect x="104" y="103" width="96" height="14" rx="4" class="i-acc"/>' +
      '<rect x="172" y="117" width="10" height="18" rx="2" class="i-acc"/>' +
      '<rect x="188" y="117" width="10" height="12" rx="2" class="i-acc"/>'
    ),
    lock: S(
      '<path d="M92 82 V60 a28 28 0 0 1 56 0 V82" class="i-no i-st-thick"/>' +
      '<rect x="74" y="80" width="92" height="76" rx="12" class="i-acc"/>' +
      '<circle cx="120" cy="112" r="10" class="i-wht"/>' +
      '<rect x="116" y="114" width="8" height="22" rx="3" class="i-wht"/>'
    ),
    'phone-code': S(
      '<rect x="84" y="14" width="72" height="146" rx="12" class="i-ink"/>' +
      '<rect x="91" y="28" width="58" height="116" rx="4" class="i-wht"/>' +
      '<text x="120" y="80" text-anchor="middle" class="i-txt" font-size="9">Ihr Code</text>' +
      '<text x="120" y="100" text-anchor="middle" class="i-txt-a" font-size="12.5" font-weight="800">482 913</text>' +
      '<circle cx="168" cy="40" r="15" class="i-acc"/>' +
      '<path d="M161 40 L166 45 L176 34" class="i-no i-stw-thin"/>'
    ),
    'screen-lock': S(
      '<rect x="38" y="26" width="164" height="104" rx="8" class="i-ink"/>' +
      '<rect x="46" y="34" width="148" height="86" rx="3" class="i-soft2"/>' +
      '<rect x="110" y="130" width="20" height="16" class="i-ink"/>' +
      '<rect x="84" y="146" width="72" height="8" rx="4" class="i-ink"/>' +
      '<path d="M108 76 V66 a12 12 0 0 1 24 0 V76" class="i-no i-st"/>' +
      '<rect x="100" y="75" width="40" height="32" rx="6" class="i-acc"/>' +
      '<circle cx="120" cy="91" r="4" class="i-wht"/>'
    ),
    desk: S(
      '<rect x="86" y="58" width="68" height="44" rx="4" class="i-ink"/>' +
      '<rect x="91" y="63" width="58" height="34" rx="2" class="i-soft2"/>' +
      '<rect x="114" y="102" width="12" height="10" class="i-ink"/>' +
      '<rect x="28" y="112" width="184" height="9" rx="3" class="i-ink"/>' +
      '<rect x="38" y="121" width="8" height="40" class="i-ink"/><rect x="194" y="121" width="8" height="40" class="i-ink"/>' +
      '<rect x="44" y="94" width="20" height="18" rx="3" class="i-acc"/>' +
      '<path d="M54 94 C46 80 48 70 54 64 C60 70 62 80 54 94Z" class="i-acc2"/>' +
      '<circle cx="186" cy="74" r="16" class="i-acc"/>' +
      '<path d="M178 74 L184 80 L195 68" class="i-no i-stw-thin"/>'
    ),
    shred: S(
      '<g class="i-float"><rect x="98" y="22" width="44" height="58" rx="3" class="i-wht i-st-thin"/>' +
      '<path d="M106 36 H134 M106 46 H134 M106 56 H126" class="i-no i-st-thin"/></g>' +
      '<rect x="78" y="88" width="84" height="12" rx="4" class="i-ink"/>' +
      '<rect x="102" y="92" width="36" height="4" rx="2" class="i-wht"/>' +
      '<path d="M84 100 H156 L150 160 H90 Z" class="i-acc"/>' +
      '<path d="M112 124 V118 a8 8 0 0 1 16 0 V124" class="i-no i-stw-thin"/>' +
      '<rect x="107" y="123" width="26" height="20" rx="4" class="i-wht"/>'
    ),
    phone112: S(
      '<rect x="84" y="14" width="72" height="146" rx="12" class="i-ink"/>' +
      '<rect x="91" y="28" width="58" height="116" rx="4" class="i-wht"/>' +
      '<text x="120" y="98" text-anchor="middle" class="i-txt-a" font-size="30" font-weight="800">112</text>' +
      '<path d="M170 60 a22 22 0 0 1 0 40 M182 50 a36 36 0 0 1 0 60" class="i-no i-sta-thin"/>' +
      '<path d="M70 60 a22 22 0 0 0 0 40 M58 50 a36 36 0 0 0 0 60" class="i-no i-sta-thin"/>'
    ),
    location: S(
      '<path d="M30 60 L84 44 L156 62 L210 46 V150 L156 166 L84 148 L30 164 Z" class="i-soft2"/>' +
      '<path d="M84 44 V148 M156 62 V166" class="i-no i-st-thin"/>' +
      '<path d="M120 18 a32 32 0 0 1 32 32 c0 26 -32 64 -32 64 c0 0 -32 -38 -32 -64 a32 32 0 0 1 32 -32z" class="i-acc"/>' +
      '<circle cx="120" cy="50" r="12" class="i-wht"/>'
    ),
    firstaid: S(
      '<path d="M100 58 V46 a8 8 0 0 1 8 -8 H132 a8 8 0 0 1 8 8 V58" class="i-no i-st-thick"/>' +
      '<rect x="56" y="56" width="128" height="94" rx="12" class="i-acc"/>' +
      '<rect x="110" y="76" width="20" height="54" rx="3" class="i-wht"/>' +
      '<rect x="93" y="93" width="54" height="20" rx="3" class="i-wht"/>'
    ),
    chat: S(
      '<rect x="30" y="28" width="112" height="60" rx="16" class="i-soft2"/>' +
      '<path d="M52 86 L46 104 L70 88 Z" class="i-soft2"/>' +
      '<path d="M50 50 H120 M50 66 H104" class="i-no i-st"/>' +
      '<rect x="98" y="82" width="112" height="60" rx="16" class="i-acc"/>' +
      '<path d="M188 140 L194 158 L170 142 Z" class="i-acc"/>' +
      '<path d="M118 104 H188 M118 120 H170" class="i-no i-stw"/>'
    ),
    listen: S(
      '<rect x="46" y="26" width="148" height="100" rx="22" class="i-soft2"/>' +
      '<path d="M78 124 L70 152 L104 126 Z" class="i-soft2"/>' +
      '<path d="M120 108 C88 86 84 66 96 56 C106 48 116 52 120 62 C124 52 134 48 144 56 C156 66 152 86 120 108Z" class="i-acc"/>'
    ),
    clipboard: S(
      '<rect x="72" y="26" width="96" height="134" rx="8" class="i-ink"/>' +
      '<rect x="80" y="40" width="80" height="112" rx="3" class="i-wht"/>' +
      '<rect x="98" y="18" width="44" height="18" rx="5" class="i-acc"/>' +
      '<path d="M90 64 l6 6 l10 -12 M90 94 l6 6 l10 -12 M90 124 l6 6 l10 -12" class="i-no i-sta-thin"/>' +
      '<path d="M114 66 H148 M114 96 H148 M114 126 H140" class="i-no i-st-thin"/>'
    ),
    weight: S(
      '<path d="M100 76 a20 20 0 0 1 40 0" class="i-no i-st-thick"/>' +
      '<path d="M74 156 L92 76 H148 L166 156 Z" class="i-ink"/>' +
      '<text x="120" y="130" text-anchor="middle" class="i-txt-w" font-size="22" font-weight="800">kg</text>' +
      '<circle cx="182" cy="52" r="18" class="i-acc"/>' +
      '<text x="182" y="60" text-anchor="middle" class="i-txt-w" font-size="22" font-weight="800">?</text>'
    ),
    lift: S(
      '<path d="M40 160 H200" class="i-no i-st-thin"/>' +
      '<circle cx="92" cy="50" r="13" class="i-ink"/>' +
      '<path d="M94 64 L100 104" class="i-no i-st-thick"/>' +
      '<path d="M100 104 L128 110 L122 156 L136 156" class="i-no i-st-thick"/>' +
      '<path d="M96 76 L122 112" class="i-no i-st"/>' +
      '<rect x="120" y="104" width="50" height="42" rx="4" class="i-acc"/>' +
      '<path d="M134 118 H156" class="i-no i-stw-thin"/>' +
      '<path d="M60 140 V96 M50 106 L60 94 L70 106" class="i-no i-sta"/>'
    ),
    carry: S(
      '<circle cx="104" cy="36" r="13" class="i-ink"/>' +
      '<path d="M104 50 V108 L94 158 M104 108 L114 158" class="i-no i-st-thick"/>' +
      '<rect x="110" y="64" width="44" height="40" rx="4" class="i-acc"/>' +
      '<path d="M104 64 L124 86" class="i-no i-st"/>' +
      '<path d="M186 84 H164 M172 76 L164 84 L172 92" class="i-no i-sta"/>'
    ),
    trolley: S(
      '<path d="M70 26 L82 30 V146 H150" class="i-no i-st-thick"/>' +
      '<circle cx="92" cy="150" r="13" class="i-ink"/><circle cx="92" cy="150" r="5" class="i-wht"/>' +
      '<rect x="90" y="100" width="54" height="42" rx="4" class="i-acc"/>' +
      '<rect x="94" y="62" width="46" height="36" rx="4" class="i-wht i-st-thin"/>' +
      '<path d="M104 120 H130" class="i-no i-stw-thin"/>'
    )
  };
})();
