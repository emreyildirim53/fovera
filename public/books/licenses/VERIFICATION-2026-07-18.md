# Project Gutenberg Verification Log

Checked on: July 18, 2026

Method:

- Open each `*-source.md` file in this folder.
- Request the `Source` URL and the `Plain text` URL.
- Confirm both return `HTTP 200`.
- Confirm the catalog page contains the string `Public domain in the USA.`.

Result:

- `22 / 22` books passed the check.
- `0` failures.

Verified entries:

- `alice-adventures-in-wonderland` — https://www.gutenberg.org/ebooks/11
- `pinocchio-the-tale-of-a-puppet` — https://www.gutenberg.org/ebooks/16865
- `treasure-island` — https://www.gutenberg.org/ebooks/120
- `the-wonderful-wizard-of-oz` — https://www.gutenberg.org/ebooks/55
- `the-secret-garden` — https://www.gutenberg.org/ebooks/113
- `a-little-princess` — https://www.gutenberg.org/ebooks/146
- `anne-of-green-gables` — https://www.gutenberg.org/ebooks/45
- `peter-pan` — https://www.gutenberg.org/ebooks/16
- `the-adventures-of-tom-sawyer` — https://www.gutenberg.org/ebooks/74
- `little-women` — https://www.gutenberg.org/ebooks/514
- `black-beauty` — https://www.gutenberg.org/ebooks/271
- `heidi` — https://www.gutenberg.org/ebooks/20781
- `the-wind-in-the-willows` — https://www.gutenberg.org/ebooks/289
- `around-the-world-in-eighty-days` — https://www.gutenberg.org/ebooks/103
- `the-adventures-of-sherlock-holmes` — https://www.gutenberg.org/ebooks/1661
- `the-jungle-book` — https://www.gutenberg.org/ebooks/236
- `the-time-machine` — https://www.gutenberg.org/ebooks/35
- `the-hound-of-the-baskervilles` — https://www.gutenberg.org/ebooks/2852
- `kidnapped` — https://www.gutenberg.org/ebooks/421
- `the-call-of-the-wild` — https://www.gutenberg.org/ebooks/215
- `the-lost-world` — https://www.gutenberg.org/ebooks/139
- `the-island-of-doctor-moreau` — https://www.gutenberg.org/ebooks/159

Interpretation note:

- This log confirms the upstream English source set that Fovera ships in `public/books/`.
- It does not claim that Project Gutenberg is the source of the Turkish localizations in `public/books-tr/`; those files are documented separately in `public/books-tr/README.md`.
