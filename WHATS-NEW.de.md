# Neu in Kobble

Was jede Version von Kobble für dich geändert hat, in einfachen Worten.
Neue Versionen kommen von selbst. Von Kobbles Machern bei jeder Version
geschrieben.

## 0.15.0 (2026-11-22)

- New: **Eigene Erweiterungen.** Der Marketplace zeigt, was deine Fabrik kann und womit sie arbeitet: Dort installierst und entfernst du Erweiterungen, und Sprocket fragst du nach einer eigenen für dein Team. Stell die Startseite aus den Blöcken deiner Erweiterungen zusammen.
- New: **Doodle denkt auf einem Whiteboard, Tinker baut.** Doodle denkt nach, bevor er antwortet, und hält ein einziges lebendiges Bild der Idee; Tinker, Doodles Macher, baut die Prototypen mit deinem Design-System.
- New: **Sprocket bringt dich zum richtigen Kobold.** Sag Sprocket, was du willst: Er gibt eine Idee an Doodle, eine Mission an den Tester oder ein Signal an den Baumeister und bringt dich dorthin.
- New: **Frag nach einer festgefahrenen Karte.** Frag Sprocket bei einer festgefahrenen Karte: Er schaut, was der Baumeister gemacht hat, hilft dir entscheiden und gibt deine Antwort weiter.
- Changed: **Weiter, wenn dem Baumeister die Sitzungen ausgehen.** Eine Karte, die nur mehr Zeit braucht, sagt das, mit einem Weiter-Knopf.
- Changed: **Nur was besteht, wird hochgeladen.** Der Baumeister committet und pusht durch die Prüfungen deines Repositorys und öffnet einen Pull Request erst, wenn alles besteht; Unfertiges bleibt auf diesem Computer, ohne Pull Requests als Entwurf.
- Changed: **Deine Wissensbasis behält ihre Form.** Die Prüfungen vor einem Pull Request umfassen die Wissensbasis, und das Update ergänzt die Abschnitte, die ihr fehlen.

## 0.14.0 (2026-11-22)

- New: **Releases eurer Produkte.** Eine Seite Releases macht aus dem Zusammengeführten ein nummeriertes Release, mit Notizen, die für euch geschrieben werden; der Kobold schlägt die Nummer erst vor, wenn du auf Vorbereiten drückst.
- New: **Neu in Kobble.** Einstellungen › Updates sagt, was jede Version geändert hat, in deiner Sprache.
- New: **Prototypen in jedem Zustand, und tiefer gehen.** Jede Variante lässt sich leer, beim Laden, mit einem Problem oder mit vielen Einträgen zeigen, über die Chips darunter. Wähle eine Variante, um sie mit neuen zu verfeinern.
- Changed: **Gebaut aus dem vereinbarten Prototyp.** Ein Prototyp auf dem Board wird erst übergeben, wenn ihr euch auf ihn und seine Variante geeinigt habt, und die Fabrik baut aus seinen Bildschirmen und behält ihr Aussehen.
- Changed: **Eine kürzere Übergabe.** Die Karte sagt, was ihr geplant und entschieden habt, nicht mehr; Doodle zeigt, bei welchem Schritt es beim Schreiben ist.
- Changed: **Eine Bibliothek pro Aufgabe.** Jede Art von Produkt nennt die Bibliothek für jede Aufgabe, und die Fabrik prüft, dass neue Arbeit dabei bleibt.
- Changed: **Der Baumeister fragt, statt endlos weiterzumachen.** Nach drei Sitzungen an einer Karte hält er mit einem Pull-Request-Entwurf an und fragt, ob ihr die Karte teilt oder er weitermacht.
- Fixed: **Der Baumeister repariert seine Arbeitskopie**, wenn die Verbindung zu git bricht, und behält den alten Ordner.
- Fixed: **Lösen bleibt gelöst.** Eine Karte, die wegen eines Konflikts mit main zurückgeschickt wurde, fragt nicht mehr nach Lösen, während der Baumeister daran arbeitet.
- Fixed: **Der Prototyp-Macher erinnert sich.** Er setzt dasselbe Gespräch über einen Prototyp fort, auch nach einem Neustart von Kobble.

## 0.13.2 (2026-11-21)

- New: **Feedback von überall senden.** Frag Sprocket oder wähle „Feedback senden“ und sag den Machern in einem Fenster, was nicht stimmt oder was du dir wünschst. Danach siehst du, ob es gesehen, geplant oder erledigt wurde.
- Changed: **Das Wissen bleibt auf dem Stand des Codes.** Bevor eine Änderung zur Prüfung geht, achtet der Builder darauf, dass auch die Notizen zum Produkt angeschaut wurden.
- Fixed: **Italienisch und Deutsch überall.** Texte, die nur auf Englisch waren, sprechen jetzt deine Sprache, auch die Beschriftungen für Screenreader.
- Fixed: **Keine leere Seite mehr,** wenn Kobble neu gebaut wurde, während die Seite offen war. Sie lädt sich selbst neu.
