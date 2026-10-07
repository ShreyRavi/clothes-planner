# PRD: Trousseau, a multi-day event clothes planner

Oct 5, 2026 · @S

> Source of truth for scope. Decisions made after this PRD (office hours, eng review, design review) are recorded in [docs/designs/trousseau.md](designs/trousseau.md) and take precedence where they differ: the share image is a P0 share path (SH-0), backup moved into Phase 1, there is no bottom tab bar, and theme lives in Settings only.

## Summary

Trousseau (working title) is a no-login web app for planning every piece of every outfit across a multi-day event. The prototypical case is an Indian wedding with five or more functions, each with its own dress code.

A user picks a template, gets one card per function, and fills each outfit by pasting links or dropping in images. Everything saves in the browser. Each person plans their own outfits, and one tap produces a permalink to that plan with no server involved, and one tap exports a backup file.

The core bet: people already plan this in screenshots, WhatsApp threads, and Pinterest boards. A tool wins only if saving an item is faster than taking a screenshot, and if it never asks for an account.

## Problem and users

A multi-day wedding guest needs 4 to 8 complete outfits, each with 6 to 12 parts, sourced from different shops, tailors, and closets. Today that plan lives in scattered places, and three things go wrong:

- **Missing pieces.** The lehenga is ordered but nobody planned the blouse stitching, the dupatta, or shoes that work on a lawn.
- **No single view.** Nobody can see all functions side by side to spot repeated colors, gaps, or one pair of juttis doing three jobs.
- **Painful sharing.** Sending a plan to a mother, a tailor, or a stylist means forwarding dozens of screenshots with no structure.

| User | Situation | What they need most |
|---|---|---|
| Guest (primary) | Attending 3 to 6 functions, often flying in | Fast capture, a complete checklist per outfit, a packing list |
| Coordinator | Collecting plans from a spouse, kids, or parents | One link per person, all in the same layout |
| Bride or groom | Highest stakes, most pieces, fittings and deadlines | Status tracking, tailor dates, candidates to compare |
| Reviewer | Mother, friend, tailor, or stylist who receives a link | A clean read-only page that opens on a phone with no install |

The same shape fits other multi-day events: destination weddings of any tradition, festivals, conferences, cruises, and pilgrimages.

## Goals, non-goals, principles

### Goals

1. A new user saves a first item within 60 seconds of landing, with no signup, tutorial, or modal.
2. Every part of an outfit has a visible slot, so a missing piece is obvious at a glance.
3. A plan is shareable as one link that opens anywhere and needs no server.
4. No plan is ever lost silently: autosave, one-tap file backup, and clear restore.

### Non-goals for v1

- Accounts, sync across devices, or real-time collaboration.
- Multiple people inside one plan. Each person keeps their own plan and shares their own link.
- Any backend, including image hosting and link previews fetched by a server.
- Shopping, affiliate links, price tracking, or outfit recommendations.
- A native app. The web app installs to the home screen as a PWA.

### Principles

- **Phone first.** Every flow works one-handed on a 375 px screen. Desktop is the same layout with more columns.
- **Capture beats organization.** Saving an item takes one paste or one photo. Sorting it into the right slot can happen later.
- **Local by default.** Data stays on the device unless the user shares a link or exports a file.
- **Opinionated defaults, everything editable.** Templates supply functions and slots. Users can rename, add, reorder, or delete any of them.

## Core concepts and data model

A plan belongs to one person and contains functions; each function holds one outfit made of slots; each slot holds items. A device can hold several plans, for example one per wedding.

| Concept | What it is | Key fields |
|---|---|---|
| Plan | One person's wardrobe for one event | Title, owner name, slot preset (women's, men's, custom), date range, notes |
| Function | One occasion inside the event, such as Mehendi or Reception | Name, date, time of day, dress code, color theme, venue notes, order |
| Outfit | The look for one function | One per function, optional overall note and hero image |
| Slot | A category of piece, such as Blouse or Footwear | Name, order, optional flag; fully customizable per plan |
| Item | A candidate piece saved into a slot | Title, link, image (remote URL or local file), note, price, status, picked flag |
| Inbox | Items captured but not yet placed | Same fields as Item, no slot |

Rules that shape the product:

- A slot can hold several candidate items. Marking one as picked makes it the outfit's choice; the rest stay as alternatives.
- An item can be reused across functions, such as one pair of juttis for three events. Reuse is a reference, not a copy.
- Item status is one of: Idea, To buy, Ordered, At tailor, Ready, Packed.
- An image is either a remote URL, which travels in a share link, or a local file, which travels only in a backup file.

## Key user flows

### 1. Start a plan (under 30 seconds)

1. Land on the home screen and tap Start a plan. No signup step exists.
2. Pick a template: Indian wedding, Wedding weekend, Conference, Festival, or Blank.
3. Enter a name and pick a slot preset: Women's, Men's, or Custom.
4. Arrive on the plan screen with functions and empty slots already laid out.

### 2. Capture an item (one action)

1. Tap the persistent + button, or paste anywhere on the screen.
2. Paste a link, paste an image, take a photo, or choose from the photo library.
3. The item saves immediately. A bottom sheet offers a function and slot, with the last used one preselected.
4. Skipping the sheet sends the item to the Inbox.

### 3. Plan an outfit

1. Open a function to see its slots as a vertical checklist with thumbnails.
2. Add candidates to a slot, then tap one to mark it picked.
3. Set status on each picked item as it moves from idea to packed.
4. Reuse an item from another function with Use existing.

### 4. Review the whole event

1. The overview shows one row per function with picked thumbnails and a completeness count, such as 6 of 9.
2. Empty required slots are flagged, so gaps are obvious.
3. Shopping and packing views list items by status across all functions.

### 5. Share

1. Tap Share to generate a link that contains the whole plan in the URL itself.
2. The share sheet warns if local photos will not appear and names how many.
3. The recipient opens a read-only page with no install and can tap Save a copy to keep it on their device.

### 6. Back up and restore

1. Tap Back up to download one file containing everything, local photos included.
2. Open that file on any device to restore, with a choice to replace or keep both.

## Functional requirements

P0 ships in v1, P1 follows fast, P2 is later. IDs are for reference in design and build.

| ID | Area | Requirement | Priority |
|---|---|---|---|
| PL-1 | Plans | Create a plan from a template or blank, with no account | P0 |
| PL-2 | Plans | Hold several plans on one device, with a plan switcher | P0 |
| PL-3 | Plans | Duplicate, rename, and delete a plan, with undo on delete | P0 |
| FN-1 | Functions | Add, rename, reorder, and delete functions | P0 |
| FN-2 | Functions | Per function: date, time of day, dress code, color theme, venue notes | P0 |
| SL-1 | Slots | Default slots from the Women's or Men's preset | P0 |
| SL-2 | Slots | Add custom slots; rename, reorder, hide, or delete any slot | P0 |
| SL-3 | Slots | Change slots for one function without affecting the others | P1 |
| IT-1 | Items | Add by pasting a link; title defaults to the site name and is editable | P0 |
| IT-2 | Items | Add an image by paste, camera, photo library, or drag and drop | P0 |
| IT-3 | Items | Add an image by remote URL, so it travels in the share link | P0 |
| IT-4 | Items | Note, price, and status on each item | P0 |
| IT-5 | Items | Several candidates per slot, with one marked picked | P0 |
| IT-6 | Items | Reuse one item across functions as a reference | P1 |
| IT-7 | Items | Inbox for unplaced items, with move to function and slot | P0 |
| IT-8 | Items | Receive links and images from the phone share sheet (Android PWA) | P1 |
| VW-1 | Views | Overview with picked thumbnails and completeness per function | P0 |
| VW-2 | Views | Shopping list and packing list grouped by status | P1 |
| VW-3 | Views | Budget total across picked items | P2 |
| SH-1 | Sharing | Generate a permalink that encodes the plan in the URL fragment | P0 |
| SH-2 | Sharing | Read-only shared view, with Save a copy to import | P0 |
| SH-3 | Sharing | Warn before sharing when local photos will be left out | P0 |
| SH-4 | Sharing | Share a single function instead of the whole plan | P1 |
| ST-1 | Storage | Autosave every change locally, with no save button | P0 |
| ST-2 | Storage | Export one backup file, including local photos | P0 |
| ST-3 | Storage | Import a backup file, with replace or keep both | P0 |
| ST-4 | Storage | Gentle backup reminder after meaningful changes | P1 |
| PW-1 | Platform | Installable PWA that works fully offline after first load | P1 |
| PW-2 | Platform | Print-friendly view of the whole plan | P2 |

## Storage, backup, and sharing

The app is a static site with no backend: plans live in the browser, share links carry the plan inside the URL, and backup is a file.

### Local storage

- Plan data and local photos live in IndexedDB. localStorage holds only small settings, because its limit is about 5 MB.
- Local photos are resized on capture to a long edge of about 1,600 px and stored as compressed blobs.
- The app requests persistent storage on first save, to reduce the chance the browser clears data.
- Every write goes through a versioned schema with migrations, so old plans and old backups keep opening.

### Share permalink

- The plan is serialized to compact JSON, compressed, and placed in the URL fragment: `app.example/s#<data>`.
- The fragment is never sent to any server, so the host cannot see plan contents.
- The link carries text, product links, remote image URLs, statuses, and notes. It does not carry local photos.
- A link is a snapshot. Editing the plan later means sharing a new link; the old link keeps showing the old version.
- Tracking parameters are stripped from saved URLs to keep links short.
- Target: a typical plan of 6 functions and 60 items stays under about 6,000 characters. The share sheet shows a warning past 8,000.
- If a plan is too large for a link, the share sheet offers the backup file instead.

### Backup file

- One file with a `.trousseau` extension, which is a zip of the plan JSON and its photos.
- Sharing the backup file through the phone share sheet is the way to send a plan with local photos.
- Importing never overwrites silently. The user chooses replace or keep both.

### Consequences to accept

| Decision | What the user gives up | Mitigation |
|---|---|---|
| No server | Local photos are absent from share links | Encourage pasting image URLs; warn at share time; offer the backup file |
| No server | No automatic link previews for pasted product links | Title from the domain, plus a quick step to add an image |
| Snapshot links | Recipients do not see later edits | Show a shared-on date on the read-only view |
| Local only | Clearing browser data deletes plans | Persistent storage request and backup reminders |

## UX, templates, and defaults

### Screens

| Screen | Purpose | Notes |
|---|---|---|
| Home | Start a plan, or reopen an existing one | Returning users land on their last plan |
| Plan overview | All functions as stacked cards with picked thumbnails | Completeness count per card; the default screen |
| Function detail | Slots as a checklist, candidates as a horizontal strip per slot | Tap a candidate to pick it |
| Item sheet | View and edit one item | Bottom sheet on phone, side panel on desktop |
| Capture sheet | Paste, camera, library, or link | Opens from the persistent + button |
| Inbox | Unplaced items | Badge count on the tab |
| Lists | Shopping and packing | P1 |
| Shared view | Read-only plan from a link | Save a copy, shared-on date |
| Settings | Back up, restore, slot presets, delete data | Storage usage shown plainly |

### UX requirements

- Touch targets of at least 44 px, primary actions within thumb reach, no hover-only controls.
- No onboarding carousel. Empty slots teach the product by showing what belongs there.
- Every destructive action has undo for at least 5 seconds.
- First load under 2 seconds on a mid-range phone on 4G; the app shell under 200 KB compressed.
- WCAG 2.1 AA contrast, full keyboard use on desktop, and labels for screen readers.
- Visual tone: warm and editorial, so photos of clothes are the color on the page.

### Indian wedding template: default functions

Mehendi, Haldi, Sangeet, Wedding ceremony, Reception. Optional functions offered at setup: Roka or engagement, Welcome dinner, Cocktail night, Baraat, Vidaai, Travel days.

### Default slots

| Women's preset | Men's preset |
|---|---|
| Main outfit (lehenga, saree, anarkali, suit) | Main outfit (sherwani, kurta, bandhgala, suit) |
| Blouse or top | Bottoms (churidar, pajama, dhoti, trousers) |
| Dupatta or drape | Jacket or layer (Nehru jacket, waistcoat) |
| Footwear | Footwear (mojari, juttis, dress shoes) |
| Necklace | Safa or turban |
| Earrings | Stole or dupatta |
| Bangles and hand jewelry | Accessories (brooch, mala, pocket square, watch) |
| Hair jewelry (maang tikka, passa) | Grooming |
| Bag or clutch | Innerwear |
| Hair | Tailoring and alterations |
| Makeup | |
| Innerwear and shapewear | |
| Tailoring and alterations | |

Other templates reuse the same structure with different functions and slots, such as Welcome drinks, Ceremony, and Brunch for a wedding weekend.

## Metrics, phases, risks, open questions

### Success metrics

| Metric | Target |
|---|---|
| Time from landing to first saved item | Median under 60 seconds |
| Plans with 10 or more items within 7 days of creation | 40% |
| Plans that generate at least one share link | 30% |
| Shared-view visitors who tap Save a copy or Start a plan | 15% |
| Reported data loss | Zero |

Measurement uses cookieless, aggregate page analytics only. Plan contents and URL fragments are never collected.

### Phases

1. **Phase 1, core loop.** Templates, functions, slots, items, capture, overview, autosave. Gate: a full 5-function plan built on a phone in under 15 minutes.
2. **Phase 2, share and backup.** Permalink, read-only view, Save a copy, backup and restore. Gate: a link round-trips on iOS Safari, Android Chrome, and through WhatsApp.
3. **Phase 3, polish.** PWA install, offline, Inbox share target, shopping and packing lists, item reuse. Gate: Lighthouse scores of 90 or higher on mobile.

### Risks

| Risk | Impact | Response |
|---|---|---|
| Browser clears site data, notably Safari after a period of disuse | Plan lost | Persistent storage request, backup reminders, home screen install prompt |
| Share link too long for a messaging app | Link breaks or truncates | Compact schema, compression, length warning, backup file fallback |
| Remote image URLs expire or block hotlinking | Broken thumbnails in shared view | Fallback tile with the item title and link; offer to save a local copy |
| Users expect photos in shared links | Disappointment at share time | Clear count of excluded photos before sending |
| Schema changes break old links | Old shares stop opening | Version byte in every link and backup; migrations tested in CI |

### Open questions

- [ ] Final product name and domain.
- [ ] Should a tiny stateless preview fetcher be allowed later, to pull titles and images from pasted links?
- [ ] Is cookieless analytics acceptable, or should v1 ship with none?
- [ ] Should the shared view offer a comment or reaction path, or stay strictly read-only?
