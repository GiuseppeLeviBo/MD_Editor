# Release notes

[Italiano](#italiano) · [English](#english)

## Italiano

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
