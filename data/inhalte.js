window.LERN_DATA = {
  "meta": {
    "titel": "Lernnuggets",
    "untertitel": "Kurze Erklärformate mit animierten Icons",
    "version": "Prototyp 0.3",
    "akzentfarbe": "#0b6fb8",
    "hintergrund": {
      "farbe": "#ffffff"
    }
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
          "animation": "slide-left",
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
      ]
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
      ],
      "hintergrund": {
        "farbe": "#eef4fa"
      }
    }
  ]
};
