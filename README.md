# iCUE-Widget für CORSAIR XENEON EDGE

Dieser zusätzliche Projektteil bildet die Termin- und Alarmfunktionen des AION-2-Termin-Overlays als offizielles iCUE-HTML-Widget ab. Die Windows-WPF-Anwendung im Projektroot bleibt davon unabhängig.

## Voraussetzungen

- CORSAIR iCUE 5.52 oder neuer
- CORSAIR XENEON EDGE
- Node.js nur zum Prüfen und Paketieren des Quellcodes

## Enthaltene Funktionen

- dieselben neun EU-Terminregeln wie die Windows-App
- drei unabhängig konfigurierbare Alarmstufen je Termin
- Vorwarnzeit, Farbe, Blinken und Ton je Alarm
- Touch-Einstellungen direkt auf dem Display
- Countdown und Vorschau der nächsten fünf aktivierten Termine
- lokale Speicherung je Widget-Instanz über iCUE/Local Storage
- keine Netzwerkzugriffe und keine Cloud-Anmeldung

Die Töne werden im Widget erzeugt. iCUE fragt dafür bei der Installation nach der Lautsprecherberechtigung. Wegen der Browser-Sicherheitsregeln wird Audio erst nach der ersten Berührung des Widgets zuverlässig freigeschaltet.

## Entwickeln und prüfen

```powershell
cd .\icue-widget
npm install
npm test
npm run validate
npm run package
```

Das fertige Paket wird in `icue-widget\dist` erzeugt und bewusst nicht in Git eingecheckt.

## Installation

1. In iCUE den Widget-Bereich des XENEON EDGE öffnen.
2. Über **+** die erzeugte Datei `AION-2-Termin-Overlay-v1.0.0.icuewidget` auswählen.
3. Die Lautsprecherberechtigung freigeben, wenn Alarmtöne gewünscht sind.
4. Das Widget einmal berühren und anschließend Termine und Alarme einstellen.

Die Ingame-Anzeige bleibt für Terminzeiten maßgeblich.
