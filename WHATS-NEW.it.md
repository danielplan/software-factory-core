# Novità in Kobble

Cosa ha cambiato ogni versione di Kobble per te, in parole semplici. Le
nuove versioni arrivano da sole. Scritto dai creatori di Kobble a ogni
rilascio.

## 0.15.0 (2026-11-22)

- New: **Crea le tue estensioni.** Il Marketplace mostra cosa sa fare la tua fabbrica e con cosa lavora: lì installi e togli le estensioni, e a Sprocket chiedi quelle del tuo team. Componi la Home con i blocchi che portano le tue estensioni.
- New: **Doodle pensa su una lavagna, Tinker costruisce.** Doodle pensa prima di rispondere e tiene un unico disegno vivo dell'idea; Tinker, l'aiutante di Doodle, fa i prototipi con il tuo design system.
- New: **Sprocket ti porta dal kobold giusto.** Di' a Sprocket cosa vuoi: passa un'idea a Doodle, una missione al tester o un segnale al costruttore, e ti porta lì.
- New: **Chiedi di una scheda bloccata.** Chiedi a Sprocket su una scheda bloccata: guarda cosa ha fatto il costruttore, ti aiuta a decidere e manda avanti la tua risposta.
- Changed: **Continua quando il costruttore ha finito le sessioni.** Una scheda che ha solo bisogno di più tempo lo dice, con un pulsante Continua.
- Changed: **Si carica solo il lavoro che passa.** Il costruttore fa commit e push attraverso i controlli del tuo repository e apre una pull request solo quando tutto passa; il lavoro non finito resta su questo computer, senza pull request in bozza.
- Changed: **La tua base di conoscenza tiene la sua forma.** I controlli prima di una pull request includono la base di conoscenza, e l'aggiornamento aggiunge le sezioni che le mancano.

## 0.14.0 (2026-11-22)

- New: **Rilasci dei tuoi prodotti.** Una pagina Rilasci trasforma ciò che è stato unito in un rilascio numerato, con note scritte per te; il kobold suggerisce il numero solo quando premi Prepara.
- New: **Novità in Kobble.** Impostazioni › Aggiornamenti dice cosa ha cambiato ogni versione, nella tua lingua.
- New: **Prototipi in ogni stato, e approfondisci.** Ogni variante si può mostrare vuota, in caricamento, con un problema o con molti elementi, con i pulsanti sotto di essa. Scegli una variante per affinarla con nuove varianti.
- Changed: **Costruito dal prototipo concordato.** Un prototipo sulla lavagna si consegna solo dopo che vi siete accordati su di esso e sulla sua variante, e la fabbrica costruisce dalle sue schermate, mantenendone l'aspetto.
- Changed: **Una consegna più breve.** La scheda dice ciò che avete pianificato e deciso, niente di più; Doodle mostra a che passo è mentre la scrive.
- Changed: **Una libreria per ogni compito.** Ogni tipo di prodotto indica la libreria da usare per ogni compito, e la fabbrica controlla che il nuovo lavoro la rispetti.
- Changed: **Il costruttore chiede invece di andare avanti all'infinito.** Dopo tre sessioni su una scheda si ferma con una pull request in bozza e ti chiede di dividere la scheda o di lasciarlo continuare.
- Fixed: **Il costruttore ripara la sua copia di lavoro** quando il collegamento a git si rompe, tenendo la vecchia cartella.
- Fixed: **Risolvi resta risolto.** Una scheda rimandata indietro per un conflitto con main non chiede più Risolvi mentre il costruttore ci lavora.
- Fixed: **Chi crea i prototipi ricorda.** Continua la stessa conversazione su un prototipo, anche dopo un riavvio di Kobble.

## 0.13.2 (2026-11-21)

- New: **Invia un parere da qualsiasi punto.** Chiedi a Sprocket o scegli "Invia un parere" e racconta ai creatori cosa non va o cosa desideri, in un'unica finestra. Poi vedi se è stato letto, pianificato o fatto.
- Changed: **Le conoscenze restano allineate al codice.** Prima che una modifica vada in revisione, il costruttore controlla che anche le note sul prodotto siano state riviste.
- Fixed: **Italiano e tedesco ovunque.** Le parole rimaste solo in inglese ora parlano la tua lingua, comprese le etichette per i lettori di schermo.
- Fixed: **Niente più pagina bianca** quando Kobble veniva ricostruito a pagina aperta. Si ricarica da sola.
