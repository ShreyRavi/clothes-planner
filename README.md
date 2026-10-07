# Trousseau

Plan every outfit for every function of a multi-day event, like a five-function Indian wedding. No account, no server: plans live on your device, share as images or a single link, and back up to one file.

**Live:** https://shreyravi.github.io/clothes-planner/

## What it does

- **Start in seconds** from a template (Indian wedding, wedding weekend, conference, festival, blank) with women's, men's or custom slots.
- **Capture fast:** photo library, camera, paste a link or image anywhere, or an image address. Items save at once to the last used slot, or the Inbox.
- **See gaps:** every function shows "6 of 9" and which slots are missing. Pick one candidate per slot, track status from Idea to Packed, and reuse one item across functions.
- **Share the way people already share:** one tap makes clean 1080×1920 images (an overview contact sheet and one per function) with your own photos included, ready for WhatsApp. Or send a link whose fragment holds the whole plan; it never touches a server.
- **Never lose a plan:** autosave, persistent storage request, a backup reminder, a `.trousseau` backup file with photos, and restore with replace or keep both. Every delete has undo.
- Shopping and packing lists, budget totals, a print view, light and dark themes, and an installable offline PWA with an Android share target.

## Develop

```bash
npm install
npm run dev            # http://localhost:5173/clothes-planner/
npm test               # unit tests (Vitest, fake IndexedDB)
npm run build          # typecheck, build, PWA
npx playwright install chromium webkit
npm run e2e            # end-to-end at 375 px in WebKit and Chromium
npm run check:bundle   # initial route must stay under 200 KB gzip
```

Set `BASE_PATH` to deploy somewhere other than `/clothes-planner/`, and `VITE_APP_NAME` / `VITE_APP_URL` to change the name and URL printed on share images.

## Project map

| Path | What lives there |
|---|---|
| `docs/PRD.md` | Product requirements (source of truth for scope) |
| `docs/designs/trousseau.md` | Design doc, eng review and design review decisions |
| `DESIGN.md` | Design tokens and component rules |
| `src/domain` | Types, presets, templates, URL safety, stats |
| `src/db` | Dexie schema, single write path, undo, data operations |
| `src/codec` | Share link format ([FORMAT.md](src/codec/FORMAT.md)) |
| `src/backup` | Backup file export and restore |
| `src/photos`, `src/render`, `src/share` | Photo processing, share image layout and drawing, sending |
| `src/ui` | Screens, sheets and components |
| `src/templates/*.json` | Event templates (contributions welcome) |

## Privacy

Everything stays in your browser's storage. Nothing is sent anywhere unless you share an image, a link or a backup file yourself. There are no analytics.

## License

MIT
