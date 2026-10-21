# Release notes

[Italiano](#italiano) · [English](#english)

## Italiano

### v0.70.0 — Arabo, ebraico, cinese, giapponese e coreano

L'editor ora gestisce bene le lingue scritte da destra a sinistra e le lingue asiatiche, in tutti i pannelli, in stampa e nell'export RTF. Il file Markdown resta pulito: non vengono aggiunti codici di impaginazione.

#### Arabo ed ebraico

- Ogni paragrafo, titolo, elenco, citazione e tabella segue la direzione del proprio testo: l'arabo e l'ebraico vanno da destra a sinistra, con puntini, numeri, caselle di spunta e bordo delle citazioni sul lato destro. Il resto del documento resta da sinistra a destra.
- Anche nel pannello Markdown ogni riga si allinea secondo la propria lingua.
- Codice, formule e diagrammi restano sempre da sinistra a destra.
- I titoli in arabo non hanno più lettere staccate.
- **Trova/Sostituisci** trova le parole anche senza vocali: cercando `محمد` trova anche `مُحَمَّد`, e lo stesso vale per l'ebraico.
- Stampa ed export RTF mantengono la direzione dei paragrafi.

#### Cinese, giapponese e coreano

- L'editor riconosce la lingua del documento e usa i caratteri adatti: lo stesso ideogramma si disegna in modo diverso in cinese e in giapponese. Anche un singolo paragrafo cinese, giapponese o coreano dentro un documento in italiano usa i caratteri della propria lingua.
- Andare a capo nel testo tra due caratteri cinesi o giapponesi non aggiunge più uno spazio.
- Il **grassetto** e il *corsivo* funzionano anche vicino alla punteggiatura asiatica, per esempio `**「強調」**です`.
- In coreano le parole non vengono spezzate quando la riga va a capo.
- **Metodi di inserimento (IME):** confermare una parola con Invio non crea più una nuova voce di elenco, e Annulla non torna al testo a metà composizione.

#### Documento di benvenuto

Il documento di benvenuto ha una nuova sezione con un esempio in ogni lingua: un paragrafo, un elenco e una tabella in arabo, una citazione in ebraico, e un paragrafo in cinese, giapponese e coreano.

#### Lingua e direzione di tutto il documento

Per indicarle esplicitamente, aggiungi all'inizio del file:

```yaml
---
lang: ar
dir: rtl
---
```

#### Correzioni

- **Trova/Sostituisci** senza "Maiuscole/minuscole" poteva sostituire il punto sbagliato in testi con lettere come la `İ` turca; trova anche il testo con accenti scritti in forma scomposta (frequente nei file creati su macOS).
- I link interni ai titoli in giapponese, coreano e hindi ora funzionano.
- Il cursore resta al posto giusto passando tra pannello Markdown ed editor visuale nei paragrafi cinesi e giapponesi scritti su più righe.

#### Aggiornare l'app installata

Chiudi e riapri l'app dopo la pubblicazione; l'etichetta in basso deve indicare **v0.70.0**.

### v0.66.2 — Anteprima delle nuove versioni

Da questa versione ogni novità si può provare prima che arrivi nell'app pubblicata.

#### Anteprima

- L'app pubblicata resta all'indirizzo di sempre: **giuseppelevibo.github.io/MD_Editor/**.
- La versione in sviluppo è su **giuseppelevibo.github.io/MD_Editor/dev/** e si aggiorna da sola a ogni modifica.
- Nell'anteprima l'etichetta in basso indica **anteprima** e il codice della modifica, per esempio `v0.66.2 · anteprima · 1a2b3c4`; il titolo della finestra termina con "(preview)".
- L'anteprima si può installare come app separata, **MD Preview**, accanto all'app normale.

#### Le due versioni non si disturbano

- L'anteprima ha impostazioni, bozze e memoria **Ricorda** separate: provarla non cambia nulla nell'app pubblicata.
- Le due versioni funzionano anche offline, ognuna con la propria copia dei file.
- **Pulisci dati locali** nell'app pubblicata cancella anche i dati dell'anteprima, utile sui computer condivisi; nell'anteprima cancella solo i dati dell'anteprima.

#### Correzione

- Con l'app aperta in più finestre, cambiare lingua in una finestra e ricaricare l'altra traduceva i menu ma non il documento di benvenuto, che risultava anche "modificato". Ora la lingua cambia subito in tutte le finestre dell'app, menu e documento di benvenuto compresi. Un documento di benvenuto modificato da te resta com'è.

#### Aggiornare l'app installata

Chiudi e riapri l'app dopo la pubblicazione; l'etichetta in basso deve indicare **v0.66.2**.

### v0.66.1 — Torna il documento di benvenuto

#### Correzione

- Il **documento di benvenuto** compare di nuovo a ogni avvio dell'app, con la tabella delle scorciatoie aggiornata e la spiegazione del sottolineato. Dalla v0.65.0 compariva solo al primissimo avvio, quindi chi aveva già usato l'app non vedeva le nuove scorciatoie.
- **Chiudi documento** continua a portare a un foglio vuoto, che resta vuoto anche se aggiorni la pagina.

#### Aggiornare l'app installata

Chiudi e riapri l'app dopo la pubblicazione; l'etichetta in basso deve indicare **v0.66.1**.

### v0.66.0 — Scorciatoie da word processor

Le scorciatoie da tastiera ora sono quelle di Word e Google Docs, così chi è abituato a un word processor le trova dove se le aspetta.

#### Cosa cambia

| Comando | Prima | Ora |
| --- | --- | --- |
| Apri file | — | **Ctrl/Cmd + O** |
| Sottolineato | — | **Ctrl/Cmd + U** |
| Link | — | **Ctrl/Cmd + K** |
| Barrato | Ctrl/Cmd + Shift + E | **Alt/Option + Shift + 5** (oppure Ctrl/Cmd + Shift + X) |
| Elenco puntato / numerato / attività | Ctrl/Cmd + U / Ctrl/Cmd + O / — | **Ctrl/Cmd + Shift + 8 / 7 / 9** |
| Testo normale | Ctrl/Cmd + 0 | **Ctrl/Cmd + Alt/Option + 0** |
| Titoli | Ctrl/Cmd + 1–3 | **Ctrl/Cmd + Alt/Option + 1–6** |
| Citazione / blocco di codice | Ctrl/Cmd + 9 / — | **Ctrl/Cmd + Alt/Option + 7 / 8** |
| Elenco delle scorciatoie | — | **Ctrl/Cmd + /** |

Salva, Salva con nome, Stampa, Trova/Sostituisci, Annulla e Ripeti restano invariati.

- **Ctrl/Cmd + /** (o il nuovo pulsante ⌨ Scorciatoie) mostra l'elenco completo in qualsiasi momento.
- Le scorciatoie funzionano anche nel **pannello Markdown**: ad esempio Ctrl/Cmd + B racchiude la selezione tra `**`, Ctrl/Cmd + Alt + 2 trasforma la riga in un titolo di secondo livello.
- Funzionano con **qualsiasi tastiera**, anche araba, ebraica o russa, perché conta il tasto premuto e non la lettera stampata.
- I vecchi tasti Ctrl + 1, 2, 3 e 9 in molti browser cambiano scheda: per questo i titoli ora usano Ctrl + Alt, come in Google Docs.

#### Sottolineato

Il Markdown non ha il sottolineato. **Ctrl/Cmd + U** (o il nuovo pulsante U) lo salva come `<u>testo</u>`: questo editor lo mostra correttamente, anche in stampa e nell'export RTF, ma altri programmi o siti (per esempio GitHub) possono mostrarlo come testo normale. Il documento di benvenuto lo spiega insieme alla tabella delle scorciatoie aggiornata.

#### Aggiornare l'app installata

Chiudi e riapri l'app dopo la pubblicazione; l'etichetta in basso deve indicare **v0.66.0**.

### v0.65.0 — File più chiari e memoria opzionale

Questa versione rende prevedibile il lavoro con i file: un solo modo di salvare, messaggi che dicono cosa è successo davvero e nessuna perdita silenziosa del collegamento al file. Aggiunge una memoria tra le sessioni pensata per il computer di casa, spenta di default per proteggere chi usa computer condivisi.

#### Salvare, aprire e chiudere

- **Salva** (💾, Ctrl/Cmd + S) scrive sul file aperto. Se il documento non ha ancora un file, chiede dove salvarlo una sola volta; da quel momento resta collegato e Ctrl/Cmd + S sovrascrive senza altre domande.
- **Salva con nome…** (Ctrl/Cmd + Shift + S) prende il posto di "Salva copia…": salva in un nuovo file, che diventa il documento su cui stai lavorando.
- **Protezione dalle modifiche esterne**: se un altro programma (o un collega su una cartella condivisa) ha modificato il file dopo che l'hai aperto, l'editor chiede prima di sovrascriverlo.
- **Messaggi chiari** nella barra di stato: "Salvato su disco: nome.md", "Scaricato: nome.md (cartella Download del browser)", permesso negato, salvataggio annullato.
- **Chiudi documento** porta sempre a un foglio vuoto. La pagina di benvenuto compare solo al primo avvio.
- **Aggiornare la pagina** (F5) mantiene il nome del documento e lo stato salvato/modificato nel titolo della finestra.
- **Trascinare un file** nella finestra (Chrome/Edge) lo collega al disco come "Apri": Salva e Ricarica file funzionano allo stesso modo.

#### Memoria tra le sessioni (opzionale)

- Il nuovo pulsante **🔒 Ricorda** attiva la memoria su questo dispositivo. È **spento di default**.
- Quando lo accendi, l'editor ti avvisa: attivalo solo su un computer tuo. Su un computer di scuola, biblioteca o sala studio chi usa il browser dopo di te vedrebbe i nomi dei file e le bozze.
- Con la memoria accesa (🔓):
  - il pulsante **🕘 Recenti** elenca fino a 8 file usati di recente, con la cartella collegata, e li riapre con un clic;
  - se chiudi l'app con modifiche non salvate, al riavvio la bozza viene ripristinata e un pulsante la ricollega al file per salvarla sul disco.
- I dati più vecchi di 30 giorni si cancellano da soli.
- **Spegnere la memoria** o usare **🧼 Pulisci dati locali** cancella file recenti, cartelle ricordate e bozze da questo browser. I file sul disco o sulla chiavetta non vengono mai toccati.
- Su un computer condiviso conviene comunque una finestra in incognito o ospite: download e cronologia del browser non dipendono dall'editor.

#### Correzioni

- Nei browser senza accesso diretto ai file (Firefox, Safari) la richiesta "modifiche non salvate" compariva due volte quando si apriva un file.
- Annullare la scelta in **Collega cartella** apriva un secondo selettore di cartelle.
- Se l'apertura di un file non riusciva (ad esempio un file binario), il documento corrente perdeva il collegamento al proprio file.

#### Aggiornare l'app installata

L'app installata (PWA) si aggiorna da sola: dopo la pubblicazione chiudila e riaprila; se serve, ripeti una seconda volta. L'etichetta in basso deve indicare **v0.65.0**.

## English

### v0.70.0 — Arabic, Hebrew, Chinese, Japanese, and Korean

The editor now handles right-to-left and East Asian languages in every panel, in print, and in RTF export. The Markdown file stays clean: no layout codes are added.

#### Arabic and Hebrew

- Every paragraph, heading, list, quote, and table follows the direction of its own text: Arabic and Hebrew run right to left, with bullets, numbers, checkboxes, and the quote border on the right. The rest of the document stays left to right.
- In the Markdown panel, too, each line is aligned according to its own language.
- Code, formulas, and diagrams always run left to right.
- Arabic headings no longer show detached letters.
- **Find/Replace** finds words even without vowel marks: searching for `محمد` also finds `مُحَمَّد`, and the same goes for Hebrew.
- Print and RTF export keep the direction of each paragraph.

#### Chinese, Japanese, and Korean

- The editor recognizes the document language and uses suitable characters: the same ideograph is drawn differently in Chinese and in Japanese. Even a single Chinese, Japanese, or Korean paragraph inside an English document uses the characters of its own language.
- A line break in the text between two Chinese or Japanese characters no longer adds a space.
- **Bold** and *italic* also work next to East Asian punctuation, for example `**「強調」**です`.
- In Korean, words are not split when a line wraps.
- **Input methods (IME):** confirming a word with Enter no longer creates a new list item, and undo does not go back to half-composed text.

#### Welcome document

The welcome document has a new section with an example in every language: a paragraph, a list, and a table in Arabic, a quote in Hebrew, and a paragraph in Chinese, Japanese, and Korean.

#### Language and direction of the whole document

To set them explicitly, add at the top of the file:

```yaml
---
lang: ar
dir: rtl
---
```

#### Fixes

- **Find/Replace** without "Match case" could replace the wrong spot in text with letters such as the Turkish `İ`; it now also finds text with accents stored in decomposed form (common in files created on macOS).
- Internal links to headings in Japanese, Korean, and Hindi now work.
- The caret keeps its place when moving between the Markdown panel and the visual editor in Chinese and Japanese paragraphs written on several lines.

#### Updating the installed app

Close and reopen the app after the release is published; the label at the bottom should read **v0.70.0**.

### v0.66.2 — Preview of upcoming versions

From this version on, every change can be tried before it reaches the published app.

#### Preview

- The published app stays at its usual address: **giuseppelevibo.github.io/MD_Editor/**.
- The version in development is at **giuseppelevibo.github.io/MD_Editor/dev/** and updates by itself with every change.
- In the preview, the label at the bottom reads **preview** and the change code, for example `v0.66.2 · preview · 1a2b3c4`; the window title ends with "(preview)".
- The preview can be installed as a separate app, **MD Preview**, next to the regular one.

#### The two versions do not interfere

- The preview has its own settings, drafts, and **Remember** memory: trying it changes nothing in the published app.
- Both versions work offline, each with its own copy of the files.
- **Clear local data** in the published app also deletes the preview's data, which helps on shared computers; in the preview it deletes only the preview's data.

#### Fix

- With the app open in several windows, changing the language in one window and reloading another translated the menus but not the welcome document, which was also marked as modified. The language now changes at once in every window of the app, menus and welcome document included. A welcome document you edited stays as it is.

#### Updating the installed app

Close and reopen the app after the release is published; the label at the bottom should read **v0.66.2**.

### v0.66.1 — The welcome document is back

#### Fix

- The **welcome document** appears again every time the app starts, with the updated shortcut table and the note on underline. Since v0.65.0 it appeared only on the very first launch, so people who had already used the app did not see the new shortcuts.
- **Close document** still leaves a blank sheet, which stays blank if you refresh the page.

#### Updating the installed app

Close and reopen the app after the release is published; the label at the bottom should read **v0.66.1**.

### v0.66.0 — Word-processor shortcuts

Keyboard shortcuts now follow Word and Google Docs, so people used to a word processor find them where they expect.

#### What changes

| Command | Before | Now |
| --- | --- | --- |
| Open file | — | **Ctrl/Cmd + O** |
| Underline | — | **Ctrl/Cmd + U** |
| Link | — | **Ctrl/Cmd + K** |
| Strikethrough | Ctrl/Cmd + Shift + E | **Alt/Option + Shift + 5** (or Ctrl/Cmd + Shift + X) |
| Bulleted / numbered / task list | Ctrl/Cmd + U / Ctrl/Cmd + O / — | **Ctrl/Cmd + Shift + 8 / 7 / 9** |
| Normal text | Ctrl/Cmd + 0 | **Ctrl/Cmd + Alt/Option + 0** |
| Headings | Ctrl/Cmd + 1–3 | **Ctrl/Cmd + Alt/Option + 1–6** |
| Quote / code block | Ctrl/Cmd + 9 / — | **Ctrl/Cmd + Alt/Option + 7 / 8** |
| Shortcut list | — | **Ctrl/Cmd + /** |

Save, Save as, Print, Find/Replace, Undo, and Redo are unchanged.

- **Ctrl/Cmd + /** (or the new ⌨ Shortcuts button) shows the full list at any time.
- Shortcuts also work in the **Markdown panel**: for example Ctrl/Cmd + B wraps the selection in `**`, Ctrl/Cmd + Alt + 2 turns the line into a level-2 heading.
- They work with **any keyboard**, including Arabic, Hebrew, or Russian layouts, because the physical key counts, not the printed letter.
- The old Ctrl + 1, 2, 3, and 9 switch tabs in many browsers; headings now use Ctrl + Alt, as in Google Docs.

#### Underline

Markdown has no underline. **Ctrl/Cmd + U** (or the new U button) saves it as `<u>text</u>`: this editor shows it correctly, also in print and in RTF export, but other programs or sites (for example GitHub) may show it as plain text. The welcome document explains this next to the updated shortcut table.

#### Updating the installed app

Close and reopen the app after the release is published; the label at the bottom should read **v0.66.0**.

### v0.65.0 — Clearer file handling and optional memory

This release makes working with files predictable: one way to save, status messages that say what actually happened, and no silent loss of the link to the file on disk. It also adds memory across sessions for your own computer, off by default to protect people using shared computers.

#### Saving, opening, and closing

- **Save** (💾, Ctrl/Cmd + S) writes to the open file. If the document has no file yet, it asks where to save once; from then on the document stays connected and Ctrl/Cmd + S overwrites without further questions.
- **Save as…** (Ctrl/Cmd + Shift + S) replaces "Save copy…": it saves to a new file, which becomes the document you are working on.
- **Protection from outside changes**: if another program (or a colleague on a shared folder) changed the file after you opened it, the editor asks before overwriting it.
- **Clear status messages**: "Saved to disk: name.md", "Downloaded: name.md (browser Downloads folder)", permission denied, save canceled.
- **Close document** always leaves a blank sheet. The welcome page appears only on the first launch.
- **Refreshing the page** (F5) keeps the document name and its saved/modified state in the window title.
- **Dropping a file** on the window (Chrome/Edge) connects it to the disk just like Open: Save and Reload file work the same way.

#### Memory across sessions (optional)

- The new **🔒 Remember** button turns memory on for this device. It is **off by default**.
- When you turn it on, the editor warns you: enable it only on a computer that is yours. On a school, library, or study-room computer, the next person using the browser would see your file names and drafts.
- With memory on (🔓):
  - the **🕘 Recent** button lists up to 8 recently used files, with their linked folder, and reopens them with one click;
  - if you close the app with unsaved changes, the draft comes back at the next start, with a button to reconnect it to its file and save to disk.
- Entries older than 30 days are deleted automatically.
- **Turning memory off** or using **🧼 Clear local data** deletes recent files, remembered folders, and drafts from this browser. Files on disk or on a USB drive are never touched.
- On a shared computer a private or guest window is still the safest choice: downloads and browser history are not controlled by the editor.

#### Fixes

- In browsers without direct file access (Firefox, Safari), the "unsaved changes" question appeared twice when opening a file.
- Canceling **Link folder** opened a second folder picker.
- When opening a file failed (for example a binary file), the current document lost its link to its own file.

#### Updating the installed app

The installed app (PWA) updates itself: after the release is published, close it and open it again, repeating once if needed. The label at the bottom should read **v0.65.0**.
