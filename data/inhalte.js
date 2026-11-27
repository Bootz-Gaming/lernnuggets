window.LERN_DATA = {
  "meta": {
    "titel": "Lernnuggets",
    "untertitel": "Kurze Erklärformate mit animierten Icons",
    "version": "Prototyp 0.8",
    "akzentfarbe": "#0b6fb8",
    "hintergrund": {
      "farbe": "#ffffff"
    },
    "stimme": "thorsten",
    "stimme_en": "ryan"
  },
  "kategorien": [
    {
      "id": "it-sicherheit",
      "name": "IT-Sicherheit"
    },
    {
      "id": "datenschutz",
      "name": "Datenschutz"
    },
    {
      "id": "arbeitsschutz",
      "name": "Arbeitsschutz"
    },
    {
      "id": "kundenservice",
      "name": "Kundenservice"
    },
    {
      "id": "wh40k",
      "name": "Warhammer 40,000"
    }
  ],
  "nuggets": [
    {
      "id": "phishing",
      "titel": "Phishing-Mails erkennen",
      "kategorie": "it-sicherheit",
      "schlagwoerter": [
        "E-Mail",
        "Phishing",
        "Betrug",
        "Link",
        "Anhang",
        "Outlook",
        "Spam"
      ],
      "kurztext": "In vier Schritten verdächtige E-Mails erkennen und richtig reagieren.",
      "lernziel": "Sie erkennen typische Merkmale von Phishing-Mails und wissen, wie Sie verdächtige Nachrichten melden.",
      "langtext": "Phishing-Mails sollen Sie dazu bringen, Zugangsdaten preiszugeben, einen schädlichen Anhang zu öffnen oder auf einen manipulierten Link zu klicken. Typisch sind Zeitdruck, Drohungen oder ungewöhnliche Belohnungen. Ein kurzer Blick auf Absenderadresse und Linkziel entlarvt viele Versuche. Im Zweifel gilt: nicht klicken, sondern melden.",
      "quelle": "Entwurf auf Basis allgemeiner Empfehlungen zur IT-Sicherheit",
      "freigabestatus": "entwurf",
      "szenen": [
        {
          "icon": "mail",
          "animation": "slide-right",
          "stichwort": "Eine ganz normale Mail?",
          "text": "Eine E-Mail fordert Sie auf, Ihr Passwort dringend zu bestätigen. Sie sieht offiziell aus. Aber ist sie es auch?"
        },
        {
          "icon": "hook",
          "animation": "pop",
          "stichwort": "Druck und Dringlichkeit",
          "text": "Phishing arbeitet mit Zeitdruck, Drohungen oder verlockenden Angeboten. Genau das soll Sie zu einem schnellen Klick verleiten."
        },
        {
          "icon": "magnifier",
          "animation": "slide-right",
          "stichwort": "Absender und Link prüfen",
          "text": "Prüfen Sie die Absenderadresse genau. Fahren Sie mit der Maus über den Link, ohne zu klicken, und schauen Sie, wohin er wirklich führt."
        },
        {
          "icon": "report",
          "animation": "fade",
          "stichwort": "Melden statt klicken",
          "text": "Im Zweifel gilt: nicht klicken, keine Anhänge öffnen und die Mail über den intern vorgesehenen Weg an die IT melden."
        }
      ],
      "quiz": [
        {
          "frage": "Woran erkennen Sie eine Phishing-Mail häufig?",
          "antworten": [
            "An künstlichem Zeitdruck oder Drohungen",
            "An einer freundlichen Grußformel",
            "An einem Logo in der Signatur"
          ],
          "richtig": 0,
          "erklaerung": "Zeitdruck und Drohungen sollen verhindern, dass Sie in Ruhe prüfen. Logos und Grußformeln lassen sich leicht fälschen."
        },
        {
          "frage": "Wie prüfen Sie einen Link gefahrlos?",
          "antworten": [
            "Kurz anklicken und gleich wieder schließen",
            "Mit der Maus darüberfahren, ohne zu klicken",
            "Den Link an Kolleginnen und Kollegen weiterleiten"
          ],
          "richtig": 1,
          "erklaerung": "Beim Darüberfahren zeigt das Mailprogramm das echte Linkziel an, ohne die Seite zu öffnen."
        },
        {
          "frage": "Was tun Sie mit einer verdächtigen Mail?",
          "antworten": [
            "Antworten und nachfragen, ob sie echt ist",
            "Den Anhang öffnen, um sicherzugehen",
            "Über den internen Meldeweg an die IT melden"
          ],
          "richtig": 2,
          "erklaerung": "Die Meldung hilft der IT, andere Beschäftigte zu warnen. Antworten oder Öffnen kann den Angriff erst auslösen."
        }
      ],
      "sprache": "en",
      "stimme": "ryan"
    },
    {
      "id": "passwort-mfa",
      "titel": "Starke Passwörter und Zwei-Faktor",
      "kategorie": "it-sicherheit",
      "schlagwoerter": [
        "Passwort",
        "Kennwort",
        "MFA",
        "2FA",
        "Authenticator",
        "Anmeldung",
        "Konto"
      ],
      "kurztext": "Warum lange Passwörter und ein zweiter Faktor Ihr Konto schützen.",
      "lernziel": "Sie können ein sicheres Passwort bilden und wissen, wie Sie mit Anmeldeanfragen umgehen.",
      "langtext": "Die Länge eines Passworts ist wichtiger als komplizierte Sonderzeichen. Jedes Passwort sollte nur für ein Konto verwendet werden. Der zweite Faktor, zum Beispiel ein Code oder eine Bestätigung in einer App, schützt das Konto zusätzlich. Anmeldeanfragen, die Sie nicht selbst ausgelöst haben, bestätigen Sie nie.",
      "quelle": "Entwurf auf Basis allgemeiner Empfehlungen zur IT-Sicherheit",
      "freigabestatus": "entwurf",
      "szenen": [
        {
          "icon": "key",
          "animation": "slide-left",
          "stichwort": "Lang schlägt kompliziert",
          "text": "Ein gutes Passwort ist vor allem lang. Ein Satz aus mehreren Wörtern ist leichter zu merken und schwerer zu knacken."
        },
        {
          "icon": "lock",
          "animation": "pop",
          "stichwort": "Ein Konto, ein Passwort",
          "text": "Verwenden Sie jedes Passwort nur einmal. Wird ein Dienst gehackt, bleiben Ihre anderen Konten trotzdem sicher."
        },
        {
          "icon": "phone-code",
          "animation": "slide-right",
          "stichwort": "Der zweite Faktor",
          "text": "Mit einem zweiten Faktor, etwa einem Code in einer App auf dem Smartphone, bleibt Ihr Konto geschützt, selbst wenn jemand Ihr Passwort kennt."
        },
        {
          "icon": "report",
          "animation": "fade",
          "stichwort": "Unerwartete Anfrage?",
          "text": "Bestätigen Sie niemals eine Anmeldung, die Sie nicht selbst ausgelöst haben. Melden Sie solche Anfragen sofort der IT."
        }
      ],
      "quiz": [
        {
          "frage": "Was macht ein Passwort vor allem sicher?",
          "antworten": [
            "Seine Länge",
            "Ein Geburtsdatum am Ende",
            "Ein einzelnes Sonderzeichen"
          ],
          "richtig": 0,
          "erklaerung": "Mit jeder zusätzlichen Stelle steigt die Zahl der Möglichkeiten stark an. Persönliche Daten sind leicht zu erraten."
        },
        {
          "frage": "Sie erhalten eine Anmeldeanfrage in der App, ohne sich angemeldet zu haben. Was tun Sie?",
          "antworten": [
            "Bestätigen, damit die Meldung verschwindet",
            "Ablehnen und der IT melden",
            "Ignorieren und später bestätigen"
          ],
          "richtig": 1,
          "erklaerung": "Eine unerwartete Anfrage kann bedeuten, dass jemand Ihr Passwort kennt. Ablehnen und melden schützt Ihr Konto."
        },
        {
          "frage": "Darf ein Passwort für mehrere Konten genutzt werden?",
          "antworten": [
            "Ja, wenn es lang genug ist",
            "Ja, aber nur für private Konten",
            "Nein, jedes Konto bekommt ein eigenes Passwort"
          ],
          "richtig": 2,
          "erklaerung": "Wird ein Dienst gehackt, probieren Angreifer die erbeuteten Daten auch bei anderen Diensten aus."
        }
      ]
    },
    {
      "id": "clean-desk",
      "titel": "Clean Desk: Arbeitsplatz sicher verlassen",
      "kategorie": "datenschutz",
      "schlagwoerter": [
        "Bildschirmsperre",
        "Windows + L",
        "Unterlagen",
        "Akten",
        "Ausdrucke",
        "Entsorgung",
        "Büro"
      ],
      "kurztext": "Drei Handgriffe, bevor Sie Ihren Platz verlassen.",
      "lernziel": "Sie sichern Bildschirm und Unterlagen, bevor Sie den Arbeitsplatz verlassen, und entsorgen vertrauliche Ausdrucke richtig.",
      "langtext": "Ein ungesperrter Bildschirm oder offen liegende Unterlagen reichen aus, damit Unbefugte vertrauliche Informationen sehen. Mit einer Bildschirmsperre, einem aufgeräumten Schreibtisch und der richtigen Entsorgung von Ausdrucken schützen Sie personenbezogene und betriebliche Daten.",
      "quelle": "Entwurf auf Basis allgemeiner Datenschutz-Empfehlungen",
      "freigabestatus": "entwurf",
      "szenen": [
        {
          "icon": "screen-lock",
          "animation": "pop",
          "stichwort": "Bildschirm sperren",
          "text": "Bevor Sie aufstehen: Bildschirm sperren. Unter Windows geht das schnell mit der Windows-Taste und L."
        },
        {
          "icon": "desk",
          "animation": "slide-left",
          "stichwort": "Schreibtisch frei",
          "text": "Vertrauliche Unterlagen liegen nicht offen auf dem Tisch, sondern werden verschlossen aufbewahrt."
        },
        {
          "icon": "shred",
          "animation": "fade",
          "stichwort": "Richtig entsorgen",
          "text": "Ausdrucke mit personenbezogenen Daten gehören nicht in den Papierkorb, sondern in die dafür vorgesehenen Datenschutzbehälter."
        }
      ],
      "quiz": [
        {
          "frage": "Mit welcher Tastenkombination sperren Sie unter Windows den Bildschirm?",
          "antworten": [
            "Strg + Alt + S",
            "Windows-Taste + L",
            "Alt + F4"
          ],
          "richtig": 1,
          "erklaerung": "Windows-Taste + L sperrt den Bildschirm sofort. Alt + F4 schließt nur das aktive Fenster."
        },
        {
          "frage": "Wohin gehört ein Ausdruck mit Namen und Adressen, wenn er nicht mehr gebraucht wird?",
          "antworten": [
            "In den Datenschutzbehälter",
            "In den Papierkorb unter dem Schreibtisch",
            "In das Altpapier in der Küche"
          ],
          "richtig": 0,
          "erklaerung": "Nur Datenschutzbehälter stellen sicher, dass die Unterlagen sicher vernichtet werden."
        },
        {
          "frage": "Sie gehen kurz zum Drucker. Was tun Sie vorher?",
          "antworten": [
            "Nichts, es dauert ja nur kurz",
            "Den Monitor ausschalten",
            "Den Bildschirm sperren"
          ],
          "richtig": 2,
          "erklaerung": "Auch kurze Abwesenheiten reichen für einen Blick auf den Bildschirm. Ein ausgeschalteter Monitor sperrt den Rechner nicht."
        }
      ]
    },
    {
      "id": "notruf",
      "titel": "Notruf richtig absetzen",
      "kategorie": "arbeitsschutz",
      "schlagwoerter": [
        "112",
        "Notfall",
        "Erste Hilfe",
        "Rettungsdienst",
        "Unfall",
        "Leitstelle"
      ],
      "kurztext": "Wer, wo, was: So erreicht die Hilfe Sie schnell.",
      "lernziel": "Sie können im Notfall einen Notruf strukturiert absetzen.",
      "langtext": "Die 112 erreicht europaweit kostenlos Rettungsdienst und Feuerwehr. Wichtig sind vor allem der genaue Ort und eine kurze Beschreibung der Lage. Die Leitstelle führt das Gespräch und stellt Rückfragen, deshalb legen Sie nicht selbst auf. Betriebliche Meldewege ergänzen den Notruf und werden hier separat ergänzt.",
      "quelle": "Entwurf auf Basis allgemeiner Erste-Hilfe-Empfehlungen",
      "freigabestatus": "entwurf",
      "szenen": [
        {
          "icon": "phone112",
          "animation": "pop",
          "stichwort": "112 wählen",
          "text": "Im Notfall wählen Sie die 112. Die Nummer ist europaweit kostenlos erreichbar.",
          "sprechtext": "Im Notfall wählen Sie die eins, eins, zwei. Die Nummer ist europaweit kostenlos erreichbar."
        },
        {
          "icon": "location",
          "animation": "slide-left",
          "stichwort": "Wo ist es passiert?",
          "text": "Nennen Sie zuerst den genauen Ort. So findet die Hilfe Sie am schnellsten."
        },
        {
          "icon": "firstaid",
          "animation": "slide-right",
          "stichwort": "Was ist passiert?",
          "text": "Beschreiben Sie kurz, was passiert ist und wie viele Personen betroffen sind."
        },
        {
          "icon": "chat",
          "animation": "fade",
          "stichwort": "Auf Rückfragen warten",
          "text": "Legen Sie nicht sofort auf. Die Leitstelle stellt Rückfragen und beendet das Gespräch."
        }
      ],
      "quiz": [
        {
          "frage": "Welche Angabe ist beim Notruf besonders wichtig?",
          "antworten": [
            "Der genaue Ort",
            "Ihre Personalnummer",
            "Die Uhrzeit"
          ],
          "richtig": 0,
          "erklaerung": "Ohne genauen Ort kann die Hilfe nicht losfahren. Die übrigen Angaben fragt die Leitstelle bei Bedarf ab."
        },
        {
          "frage": "Wer beendet das Notrufgespräch?",
          "antworten": [
            "Sie selbst, sobald alles gesagt ist",
            "Die Leitstelle",
            "Die erste Person, die eintrifft"
          ],
          "richtig": 1,
          "erklaerung": "Die Leitstelle hat oft noch Rückfragen oder gibt Anweisungen zur Ersten Hilfe."
        },
        {
          "frage": "Welche Nummer wählen Sie für den Rettungsdienst?",
          "antworten": [
            "110",
            "116 117",
            "112"
          ],
          "richtig": 2,
          "erklaerung": "112 erreicht Rettungsdienst und Feuerwehr. 110 ist die Polizei, 116 117 der ärztliche Bereitschaftsdienst."
        }
      ]
    },
    {
      "id": "heben-tragen",
      "titel": "Rückenschonend heben und tragen",
      "kategorie": "arbeitsschutz",
      "schlagwoerter": [
        "Rücken",
        "Heben",
        "Tragen",
        "Lasten",
        "Ergonomie",
        "Sackkarre",
        "Gepäck"
      ],
      "kurztext": "Vier Regeln, die Ihren Rücken beim Heben entlasten.",
      "lernziel": "Sie heben und tragen Lasten rückenschonend und nutzen Hilfsmittel.",
      "langtext": "Falsches Heben gehört zu den häufigsten Ursachen für Rückenbeschwerden. Schätzen Sie die Last vorher ein, heben Sie aus den Beinen mit geradem Rücken, tragen Sie nah am Körper und vermeiden Sie Drehungen. Wo Hilfsmittel vorhanden sind, werden sie genutzt.",
      "quelle": "Entwurf auf Basis allgemeiner Arbeitsschutz-Empfehlungen",
      "freigabestatus": "entwurf",
      "szenen": [
        {
          "icon": "weight",
          "animation": "pop",
          "stichwort": "Last einschätzen",
          "text": "Prüfen Sie vor dem Anheben, wie schwer und sperrig die Last ist. Holen Sie sich bei Bedarf Unterstützung."
        },
        {
          "icon": "lift",
          "animation": "slide-left",
          "stichwort": "Aus den Beinen heben",
          "text": "Gehen Sie in die Knie, halten Sie den Rücken gerade und heben Sie die Last aus der Kraft der Beine."
        },
        {
          "icon": "carry",
          "animation": "slide-right",
          "stichwort": "Nah am Körper",
          "text": "Tragen Sie die Last dicht am Körper und vermeiden Sie Drehbewegungen mit dem Oberkörper."
        },
        {
          "icon": "trolley",
          "animation": "fade",
          "stichwort": "Hilfsmittel nutzen",
          "text": "Sackkarre, Rollwagen oder Hubhilfe: Wo es Hilfsmittel gibt, nutzen Sie sie."
        }
      ],
      "quiz": [
        {
          "frage": "Wie heben Sie eine schwere Kiste vom Boden?",
          "antworten": [
            "Mit gestreckten Beinen und rundem Rücken",
            "In die Knie gehen, Rücken gerade",
            "Schwungvoll aus dem Oberkörper"
          ],
          "richtig": 1,
          "erklaerung": "Die Beinmuskulatur ist deutlich stärker als die Rückenmuskulatur und entlastet die Bandscheiben."
        },
        {
          "frage": "Wie tragen Sie eine Last am besten?",
          "antworten": [
            "Dicht am Körper",
            "Mit ausgestreckten Armen",
            "Einseitig auf einer Schulter"
          ],
          "richtig": 0,
          "erklaerung": "Je weiter die Last vom Körper entfernt ist, desto stärker wird der Rücken belastet."
        },
        {
          "frage": "Was vermeiden Sie beim Tragen?",
          "antworten": [
            "Kurze Pausen",
            "Kleine Schritte",
            "Drehungen mit dem Oberkörper"
          ],
          "richtig": 2,
          "erklaerung": "Drehen unter Last belastet die Wirbelsäule besonders. Drehen Sie sich besser mit den Füßen."
        }
      ]
    },
    {
      "id": "deeskalation",
      "titel": "Ruhig bleiben im Kundengespräch",
      "kategorie": "kundenservice",
      "schlagwoerter": [
        "Fahrgast",
        "Beschwerde",
        "Konflikt",
        "Deeskalation",
        "Kommunikation",
        "Verspätung"
      ],
      "kurztext": "Mit Zuhören, Verständnis und klaren Infos Konflikte entschärfen.",
      "lernziel": "Sie wenden einfache Gesprächstechniken an, um aufgebrachte Fahrgäste zu beruhigen, und wissen, wann Sie Unterstützung holen.",
      "langtext": "Verärgerte Fahrgäste möchten vor allem ernst genommen werden. Aktives Zuhören und ehrliches Verständnis nehmen oft schon den Druck aus der Situation. Klare Aussagen darüber, was möglich ist und was nicht, schaffen Vertrauen. Ihre eigene Sicherheit geht immer vor.",
      "quelle": "Entwurf auf Basis allgemeiner Kommunikationsgrundlagen",
      "freigabestatus": "entwurf",
      "szenen": [
        {
          "icon": "chat",
          "animation": "slide-left",
          "stichwort": "Zuhören",
          "text": "Ein verärgerter Fahrgast möchte vor allem gehört werden. Lassen Sie ihn ausreden und hören Sie aufmerksam zu."
        },
        {
          "icon": "listen",
          "animation": "pop",
          "stichwort": "Verständnis zeigen",
          "text": "Zeigen Sie Verständnis für die Situation, zum Beispiel mit dem Satz: Ich verstehe, dass die Verspätung ärgerlich für Sie ist."
        },
        {
          "icon": "clipboard",
          "animation": "slide-right",
          "stichwort": "Lösung anbieten",
          "text": "Sagen Sie, was Sie konkret tun können und was nicht. Klare Informationen schaffen Vertrauen."
        },
        {
          "icon": "report",
          "animation": "fade",
          "stichwort": "Sicherheit geht vor",
          "text": "Wird die Situation bedrohlich, bringen Sie sich in Sicherheit und holen Sie Unterstützung über die vorgesehenen Wege."
        }
      ],
      "quiz": [
        {
          "frage": "Was hilft zu Beginn eines angespannten Gesprächs am meisten?",
          "antworten": [
            "Sofort die Regeln erklären",
            "Ausreden lassen und zuhören",
            "Das Gespräch an Kollegen abgeben"
          ],
          "richtig": 1,
          "erklaerung": "Wer sich gehört fühlt, beruhigt sich schneller. Regeln wirken erst, wenn die Emotion nachlässt."
        },
        {
          "frage": "Welcher Satz zeigt Verständnis?",
          "antworten": [
            "Da kann ich auch nichts machen.",
            "Beruhigen Sie sich erst einmal.",
            "Ich verstehe, dass das ärgerlich für Sie ist."
          ],
          "richtig": 2,
          "erklaerung": "Der Satz erkennt das Gefühl an, ohne Schuld zuzuweisen. Aufforderungen wie „Beruhigen Sie sich“ verschärfen oft die Lage."
        },
        {
          "frage": "Die Situation wird bedrohlich. Was hat Vorrang?",
          "antworten": [
            "Ihre eigene Sicherheit",
            "Das Gespräch zu Ende führen",
            "Die Fahrkarte zu kontrollieren"
          ],
          "richtig": 0,
          "erklaerung": "Bringen Sie sich in Sicherheit und holen Sie Unterstützung über die betrieblich vorgesehenen Wege."
        }
      ]
    },
    {
      "id": "phishing-en",
      "titel": "Spotting phishing emails",
      "kategorie": "it-sicherheit",
      "sprache": "en",
      "schlagwoerter": [
        "email",
        "phishing",
        "fraud",
        "link",
        "attachment",
        "English",
        "Englisch"
      ],
      "kurztext": "Recognise suspicious emails in four steps and respond the right way.",
      "lernziel": "You can recognise typical signs of phishing emails and know how to report them.",
      "langtext": "Phishing emails try to make you reveal passwords, open a harmful attachment or click a manipulated link. Typical signs are time pressure, threats or unusual rewards. A quick look at the sender address and the real link target exposes many attempts. If in doubt: do not click, report it instead.",
      "quelle": "Draft based on general IT security recommendations",
      "freigabestatus": "entwurf",
      "szenen": [
        {
          "icon": "mail",
          "animation": "slide-left",
          "stichwort": "Just a normal email?",
          "text": "An email asks you to confirm your password urgently. It looks official. But is it?"
        },
        {
          "icon": "hook",
          "animation": "pop",
          "stichwort": "Pressure and urgency",
          "text": "Phishing relies on time pressure, threats or tempting offers. That is exactly what should make you click without thinking."
        },
        {
          "icon": "magnifier",
          "animation": "slide-right",
          "stichwort": "Check sender and link",
          "text": "Check the sender address carefully. Hover over the link without clicking and see where it really leads."
        },
        {
          "icon": "report",
          "animation": "fade",
          "stichwort": "Report, don't click",
          "text": "If in doubt: do not click, do not open attachments, and report the email to IT through the official channel."
        }
      ],
      "quiz": [
        {
          "frage": "What is a common sign of a phishing email?",
          "antworten": [
            "Artificial time pressure or threats",
            "A friendly greeting",
            "A logo in the signature"
          ],
          "richtig": 0,
          "erklaerung": "Time pressure and threats are meant to stop you from checking calmly. Logos and greetings are easy to fake."
        },
        {
          "frage": "How do you check a link safely?",
          "antworten": [
            "Click it briefly and close it again",
            "Hover over it without clicking",
            "Forward it to colleagues"
          ],
          "richtig": 1,
          "erklaerung": "Hovering shows the real link target without opening the page."
        },
        {
          "frage": "What do you do with a suspicious email?",
          "antworten": [
            "Reply and ask whether it is genuine",
            "Open the attachment to be sure",
            "Report it to IT through the official channel"
          ],
          "richtig": 2,
          "erklaerung": "Reporting helps IT warn others. Replying or opening attachments can trigger the attack."
        }
      ]
    },
    {
      "id": "wh40k-core-rules",
      "titel": "Warhammer 40,000: The core rules",
      "kategorie": "wh40k",
      "sprache": "en",
      "hintergrund": {
        "farbe": "#f6f4ef"
      },
      "schlagwoerter": [
        "Warhammer",
        "40k",
        "Warhammer 40,000",
        "tabletop",
        "rules",
        "dice",
        "datasheet",
        "charge",
        "objectives",
        "stratagems",
        "English",
        "Englisch"
      ],
      "kurztext": "From dice and datasheets to charges, cover and stratagems: the core rules in 17 short scenes.",
      "lernziel": "You can explain how a battle round works, read a datasheet, resolve attacks, charges and fights, and know how cover, objectives and stratagems work.",
      "langtext": "Warhammer 40,000 is played in battle rounds in which each player takes a turn with five phases: Command, Movement, Shooting, Charge and Fight. Attacks always follow the same sequence of hit roll, wound roll, save roll and damage. Terrain gives cover or hides units, objectives are held by the higher Objective Control, and Command Points pay for stratagems. This is an unofficial summary in our own words; the official Core Rules always take precedence.",
      "quelle": "Unofficial fan summary, paraphrased from the Warhammer 40,000 Core Rules (Games Workshop). Diagrams: own illustrations.",
      "freigabestatus": "entwurf",
      "szenen": [
        {
          "icon": "report",
          "animation": "fade",
          "grafik": "media/wh40k-01-army-unit-model.png",
          "darstellung": "vollbild",
          "mindestdauer": 8,
          "text": "Warhammer 40,000 is a battle game for two players. Your army is made up of units, and each unit has one or more models that move and fight together. A model's base counts as part of the model. The mission you pick decides the army size, the battlefield and how you win. A battle usually lasts five battle rounds."
        },
        {
          "icon": "report",
          "animation": "fade",
          "grafik": "media/wh40k-02-dice-notation.png",
          "darstellung": "vollbild",
          "mindestdauer": 8,
          "text": "The game uses six-sided dice, written D6. 3+ means you need a 3 or more. 2D6 means roll two dice and add them. D3 means roll a D6 and halve it, rounding up. D6+1 means roll a D6 and add one.",
          "sprechtext": "The game uses six-sided dice, written D six. Three plus means you need a three or more. Two D six means roll two dice and add them. D three means roll a D six and halve it, rounding up. D six plus one means roll a D six and add one."
        },
        {
          "icon": "report",
          "animation": "fade",
          "grafik": "media/wh40k-02-measuring.png",
          "darstellung": "vollbild",
          "mindestdauer": 8,
          "text": "Distances are measured in inches, and you can measure at any time. Always measure from the closest part of one base to the closest part of the other, never from the centre."
        },
        {
          "icon": "report",
          "animation": "fade",
          "grafik": "media/wh40k-03-datasheet.png",
          "darstellung": "vollbild",
          "mindestdauer": 8,
          "text": "Every unit has a datasheet. M is Move, T is Toughness, Sv is the armour Save, W is Wounds, Ld is Leadership and OC is Objective Control. Each weapon lists its Range, Attacks, the BS or WS needed to hit, Strength, Armour Penetration and Damage. Keywords such as INFANTRY decide which rules apply.",
          "sprechtext": "Every unit has a datasheet. M is Move, T is Toughness, S v is the armour save, W is Wounds, L d is Leadership and O C is Objective Control. Each weapon lists its range, attacks, the ballistic or weapon skill needed to hit, strength, armour penetration and damage. Keywords such as infantry decide which rules apply."
        },
        {
          "icon": "report",
          "animation": "fade",
          "grafik": "media/wh40k-04-turn-structure.png",
          "darstellung": "vollbild",
          "mindestdauer": 8,
          "text": "In each battle round, both players take one turn. Every turn starts with the Start of Turn step, followed by five phases: Command, Movement, Shooting, Charge and Fight. In the Fight phase, units of both players attack. The End of Turn step closes the turn."
        },
        {
          "icon": "report",
          "animation": "fade",
          "grafik": "media/wh40k-05-battle-shock.png",
          "darstellung": "vollbild",
          "mindestdauer": 8,
          "text": "In the Command phase, both players gain one Command Point. Then you roll for every unit that is battle-shocked or at or below half its starting strength: roll 2D6. Equal to or above its Leadership, it holds. Below, it is battle-shocked: its OC drops to nothing, it can't be targeted by stratagems and it can't start actions.",
          "sprechtext": "In the Command phase, both players gain one command point. Then you roll for every unit that is battle-shocked or at or below half its starting strength: roll two D six. Equal to or above its leadership, it holds. Below, it is battle-shocked: its objective control drops to nothing, it can't be targeted by stratagems and it can't start actions."
        },
        {
          "icon": "report",
          "animation": "fade",
          "grafik": "media/wh40k-06-move-types.png",
          "darstellung": "vollbild",
          "mindestdauer": 8,
          "text": "In the Movement phase, every unit is selected once. A normal move goes up to the unit's Move. An advance adds a D6, but then the unit can't charge or start an action, and only assault weapons can shoot. Engaged units can fall back, but then they can't shoot, charge or start an action.",
          "sprechtext": "In the Movement phase, every unit is selected once. A normal move goes up to the unit's move characteristic. An advance adds a D six, but then the unit can't charge or start an action, and only assault weapons can shoot. Engaged units can fall back, but then they can't shoot, charge or start an action."
        },
        {
          "icon": "report",
          "animation": "fade",
          "grafik": "media/wh40k-06-coherency-engagement.png",
          "darstellung": "vollbild",
          "mindestdauer": 8,
          "text": "Two distances matter all the time. Coherency: every model must be within 2 inches of another model in its unit and within 9 inches of every model in it. Engagement range: within 2 inches horizontally and 5 inches vertically of an enemy model, your unit is engaged."
        },
        {
          "icon": "report",
          "animation": "fade",
          "grafik": "media/wh40k-07-shooting-targets.png",
          "darstellung": "vollbild",
          "mindestdauer": 8,
          "text": "In the Shooting phase, each weapon picks one enemy unit. The target must be visible, within range and not engaged. Units that advanced can still use assault weapons, close-quarters shooting lets engaged units fire, and indirect fire hits targets out of sight, but with worse odds."
        },
        {
          "icon": "report",
          "animation": "fade",
          "grafik": "media/wh40k-08-attack-sequence.png",
          "darstellung": "vollbild",
          "mindestdauer": 8,
          "text": "Every attack runs through four steps. Hit roll: match the BS or WS. Wound roll: compare Strength with Toughness. Save roll: the defender rolls, and AP makes armour saves worse. Damage: each failed save removes wounds equal to the weapon's Damage. An unmodified 1 always fails, a 6 to hit or wound is critical.",
          "sprechtext": "Every attack runs through four steps. Hit roll: match the ballistic or weapon skill. Wound roll: compare strength with toughness. Save roll: the defender rolls, and armour penetration makes armour saves worse. Damage: each failed save removes wounds equal to the weapon's damage. An unmodified one always fails, a six to hit or wound is critical."
        },
        {
          "icon": "report",
          "animation": "fade",
          "grafik": "media/wh40k-08-wound-table.png",
          "darstellung": "vollbild",
          "mindestdauer": 8,
          "text": "To wound, compare Strength with Toughness. Double or more needs a 2+. Greater needs a 3+. Equal needs a 4+. Lower needs a 5+. Half or less needs a 6+.",
          "sprechtext": "To wound, compare strength with toughness. Double or more needs a two plus. Greater needs a three plus. Equal needs a four plus. Lower needs a five plus. Half or less needs a six plus."
        },
        {
          "icon": "report",
          "animation": "fade",
          "grafik": "media/wh40k-09-charge.png",
          "darstellung": "vollbild",
          "mindestdauer": 8,
          "text": "To charge, a unit must be within 12 inches of an enemy, not engaged, and must not have advanced or fallen back. Roll 2D6: that is the maximum distance. The unit must end engaged with every unit it targeted. If it makes it, it fights first this turn.",
          "sprechtext": "To charge, a unit must be within twelve inches of an enemy, not engaged, and must not have advanced or fallen back. Roll two D six: that is the maximum distance. The unit must end engaged with every unit it targeted. If it makes it, it fights first this turn."
        },
        {
          "icon": "report",
          "animation": "fade",
          "grafik": "media/wh40k-09-fight-order.png",
          "darstellung": "vollbild",
          "mindestdauer": 8,
          "text": "The Fight phase has four steps. Pile in up to 3 inches. Then Fights First units attack, players alternating, starting with the player whose turn it is. Then all remaining engaged units fight, again alternating. Finally, consolidate up to 3 inches towards the enemy or an objective."
        },
        {
          "icon": "report",
          "animation": "fade",
          "grafik": "media/wh40k-10-terrain-categories.png",
          "darstellung": "vollbild",
          "mindestdauer": 8,
          "text": "Terrain comes in three categories. Exposed terrain, like craters or debris, barely protects. Light terrain, like barricades or low walls, can give cover. Dense terrain, like ruins or woods, blocks sight and movement."
        },
        {
          "icon": "report",
          "animation": "fade",
          "grafik": "media/wh40k-10-cover-hidden.png",
          "darstellung": "vollbild",
          "mindestdauer": 8,
          "text": "A unit has the benefit of cover if every model is infantry, beasts or swarm inside a terrain area, or not fully visible because of terrain. Cover worsens the attacker's BS by one, so a 3+ becomes a 4+. Infantry in dense terrain that did not shoot this turn or last turn are hidden and can only be seen from within 15 inches.",
          "sprechtext": "A unit has the benefit of cover if every model is infantry, beasts or swarm inside a terrain area, or not fully visible because of terrain. Cover worsens the attacker's ballistic skill by one, so a three plus becomes a four plus. Infantry in dense terrain that did not shoot this turn or last turn are hidden and can only be seen from within fifteen inches."
        },
        {
          "icon": "report",
          "animation": "fade",
          "grafik": "media/wh40k-11-objective-control.png",
          "darstellung": "vollbild",
          "mindestdauer": 8,
          "text": "At the end of every phase and turn, each player adds up the OC of their models on an objective. The higher total controls it. On a tie, nobody does, unless one player has secured it. Battle-shocked models count as zero, so morale can cost you objectives.",
          "sprechtext": "At the end of every phase and turn, each player adds up the objective control of their models on an objective. The higher total controls it. On a tie, nobody does, unless one player has secured it. Battle-shocked models count as zero, so morale can cost you objectives."
        },
        {
          "icon": "report",
          "animation": "fade",
          "grafik": "media/wh40k-12-stratagem-card.png",
          "darstellung": "vollbild",
          "mindestdauer": 8,
          "text": "Command Points pay for stratagems. Each one lists when to use it, its target and its effect. You can't use the same stratagem twice in one phase, and a unit can normally only be targeted by one stratagem per phase. Command Re-roll lets you re-roll a single roll. That's the core rules. Now test yourself in the quiz!",
          "sprechtext": "Command points pay for stratagems. Each one lists when to use it, its target and its effect. You can't use the same stratagem twice in one phase, and a unit can normally only be targeted by one stratagem per phase. Command re-roll lets you re-roll a single roll. That's the core rules. Now test yourself in the quiz!"
        }
      ],
      "quiz": [
        {
          "frage": "What tells you how to win a game of Warhammer 40,000?",
          "antworten": [
            "The number of models left",
            "The mission",
            "The player who goes first",
            "The Codex"
          ],
          "richtig": 1,
          "erklaerung": "Every game is played using a mission, and the mission states what each player must do to win."
        },
        {
          "frage": "You roll a D3 and the die shows a 5. What is the result?",
          "antworten": [
            "1",
            "2",
            "3",
            "5"
          ],
          "richtig": 2,
          "erklaerung": "D3 means halving the D6 result and rounding up: 5 ÷ 2 = 2.5, rounded up to 3."
        },
        {
          "frage": "Which characteristic shows how well a model holds objectives?",
          "antworten": [
            "Ld",
            "W",
            "OC",
            "Sv"
          ],
          "richtig": 2,
          "erklaerung": "OC stands for Objective Control. Models with an OC of '-' cannot control objectives at all."
        },
        {
          "frage": "Which phase comes directly after the Shooting phase?",
          "antworten": [
            "Charge phase",
            "Fight phase",
            "Movement phase",
            "Command phase"
          ],
          "richtig": 0,
          "erklaerung": "The order is Command, Movement, Shooting, Charge, Fight."
        },
        {
          "frage": "A unit started with 10 models and now has 5. What must you do in your Command phase?",
          "antworten": [
            "Remove it from the battle",
            "Gain an extra CP",
            "Nothing, it is still above half-strength",
            "Make a battle-shock roll for it"
          ],
          "richtig": 3,
          "erklaerung": "5 of 10 models is exactly half-strength, and units at or below half-strength must make a battle-shock roll."
        },
        {
          "frage": "Your unit advanced this turn. What can it still do?",
          "antworten": [
            "Shoot with all its weapons",
            "Shoot with assault weapons",
            "Start an action",
            "Declare a charge"
          ],
          "richtig": 1,
          "erklaerung": "After an advance, a unit can't charge or start an action, and it can only use assault shooting with [ASSAULT] weapons."
        },
        {
          "frage": "Which of these enemy units can be targeted with normal shooting?",
          "antworten": [
            "A unit that is engaged in combat with your infantry",
            "A unit out of the weapon's range",
            "A unit hidden behind a solid wall",
            "A visible unit in range that is not engaged"
          ],
          "richtig": 3,
          "erklaerung": "A target must be visible, within range and unengaged."
        },
        {
          "frage": "A Strength 4 weapon attacks a Toughness 8 target. What do you need to wound?",
          "antworten": [
            "4+",
            "6+",
            "3+",
            "5+"
          ],
          "richtig": 1,
          "erklaerung": "Strength 4 is half of Toughness 8, so you need a 6+."
        },
        {
          "frage": "Your unit is 10\" away from the enemy and you roll a 7 for the charge. What happens?",
          "antworten": [
            "The charge fails – 7\" is not enough to reach",
            "The unit advances instead",
            "The charge succeeds automatically",
            "You can re-roll for free"
          ],
          "richtig": 0,
          "erklaerung": "The 2D6 roll is the maximum distance. Without a re-roll (for example the Command Re-roll stratagem), 7\" is not enough to reach a unit 10\" away."
        },
        {
          "frage": "Your infantry unit is in cover. The attacker's weapon normally hits on a 3+. What does it need now?",
          "antworten": [
            "4+",
            "5+",
            "2+",
            "3+"
          ],
          "richtig": 0,
          "erklaerung": "The benefit of cover worsens the attack's BS by 1, so 3+ becomes 4+."
        },
        {
          "frage": "Blue has OC 5 on an objective, Red has OC 5. Nobody has secured it. Who controls it?",
          "antworten": [
            "Nobody",
            "Blue",
            "Red",
            "The player whose turn it is"
          ],
          "richtig": 0,
          "erklaerung": "With equal levels of control and no secured objective, neither player controls it."
        },
        {
          "frage": "When shooting with Fire Overwatch, what do you need to hit?",
          "antworten": [
            "An unmodified 6",
            "A 4+",
            "BS worsened by 1",
            "The weapon's normal BS"
          ],
          "richtig": 0,
          "erklaerung": "Snap shooting only hits on an unmodified hit roll of 6, regardless of BS or modifiers."
        }
      ],
      "stimme": "ryan"
    }
  ]
};
