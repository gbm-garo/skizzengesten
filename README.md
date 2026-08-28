# Skizzengesten

Erkennung handgezeichneter Symbole für die GBM Montageskizze. Testseite: https://gbm-garo.github.io/skizzengesten/

- `src/gesten.ts` — der Erkenner ($P Point-Cloud Recognizer), ohne Abhängigkeiten. Diese Datei wird in die Montageskizze kopiert (`src/utils/gesten.ts`).
- `src/main.ts` — Testseite: Symbole anlernen, erkennen, Trefferquote prüfen, Vorlagen als JSON exportieren/importieren.
- `src/symbols.ts` — Kopie der Symbolzeichnung aus der Montageskizze (nur für die Vorschau).

Vorlagen liegen im Browser (localStorage). Für die Skizze: «Export» → `vorlagen.json` ins Skizzen-Repo.
