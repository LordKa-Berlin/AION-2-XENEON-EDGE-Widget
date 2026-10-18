# AION 2 Termin-Overlay für CORSAIR XENEON EDGE

Ein interaktives iCUE-Widget für lokale AION-2-Event- und Boss-Erinnerungen auf dem CORSAIR XENEON EDGE. Alle Berechnungen und Einstellungen bleiben lokal; das Widget benötigt keine Anmeldung, keine Cloud und keinen Netzwerkzugriff.

## Eigenschaften

- neun hinterlegte Event- und Bosspläne für Europa/Berlin
- drei unabhängig konfigurierbare Alarmstufen je Termin
- frei wählbare Vorwarnzeit, Farbe, Blinken und Ton je Alarm
- großer Countdown zum nächsten relevanten Termin
- zwei frei einstellbare Touch-Timer unterhalb des Event-Countdowns
- Start und Stopp durch Antippen des jeweiligen Timers; separate Zeitwahl je Timer
- ausklappbare Vorschau der nächsten fünf aktivierten Termine
- Touch-Einstellungen direkt auf dem XENEON EDGE
- integrierter Alarmtest
- lokale Speicherung je Widget-Instanz
- responsive Darstellung für kleine und extragroße XENEON-EDGE-Widgetflächen
- keine externen Dienste und keine Netzwerkberechtigung

## Enthaltene Termine

- Beritra-Luftangriff
- Accursed Sword
- Incursion of the Spirits
- Raum-Zeit-Riss
- Shugofesta
- Abyss-Eroberung
- Nahma-Zeitfenster
- Belagerungsboss-Zeitfenster
- Kaira-Zeitfenster

## Voraussetzungen

- CORSAIR iCUE 5.52 oder neuer
- CORSAIR XENEON EDGE
- Node.js nur zum Prüfen und Paketieren des Quellcodes

Die Töne werden im Widget erzeugt. iCUE fragt dafür bei der Installation nach der Lautsprecherberechtigung. Wegen der Browser-Sicherheitsregeln wird Audio erst nach der ersten Berührung des Widgets zuverlässig freigeschaltet.

## Entwickeln und prüfen

```powershell
npm install
npm test
npm run validate
npm run package
```

Das fertige Paket wird in `dist` erzeugt und bewusst nicht in Git eingecheckt.

## Installation

1. In iCUE den Widget-Bereich des XENEON EDGE öffnen.
2. Über **+** die erzeugte Datei `AION-2-Termin-Overlay-v1.0.0.icuewidget` auswählen.
3. Die Lautsprecherberechtigung freigeben, wenn Alarmtöne gewünscht sind.
4. Das Widget einmal berühren und anschließend Termine und Alarme einstellen.

Die Ingame-Anzeige bleibt für Terminzeiten maßgeblich.

## Datenschutz und Berechtigungen

Das Manifest fordert ausschließlich die iCUE-Berechtigung `speaker` für die Alarmtöne an. Es werden keine Dateien außerhalb des Widgets gelesen und keine Daten übertragen.

## Hinweis

Dieses Community-Werkzeug ist kein offizielles Produkt von CORSAIR, NCSOFT oder den Betreibern von AION 2. Produkt- und Markennamen gehören ihren jeweiligen Rechteinhabern.
