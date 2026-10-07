# Real-device checklist

Run on an iPhone (Safari) and a mid-range Android phone (Chrome) before calling a phase done. Automated tests run WebKit and Chromium at 375 px, but these need real hardware.

## Phase 1 gate: build a plan

- [ ] Tester other than the builder, items collected in advance (30+ links and photos).
- [ ] Create a 5-function plan with the Women's or Men's preset; at least 6 picked items per function; at least half the images are screenshots or camera photos.
- [ ] Under 15 minutes per device, timed from landing.
- [ ] Capture from the photo library takes 2 app taps (+, Photo library) and lands in the last used slot.

## Share images (SH-0)

- [ ] Share whole plan: previews render, "Send 6 images" opens the system share sheet, WhatsApp receives every image.
- [ ] Images are legible in WhatsApp after its downscale (captions readable on a phone).
- [ ] Cancel the system share sheet: nothing else happens.
- [ ] iOS fallback: with file sharing unavailable, the pager shows "Press and hold the image, then Save to Photos" and Save to Photos works on each image.

## Links and backup (Phase 2 gate)

- [ ] A share link sent through WhatsApp opens on iOS Safari and Android Chrome; Save a copy works.
- [ ] A link with local photos warns how many are left out.
- [ ] Back up downloads a `.trousseau` file; restoring it on the other device with Keep both gives an independent plan with photos.

## Storage and offline

- [ ] Settings shows storage used and whether the device will keep plans.
- [ ] Add to home screen, go offline, reopen: plans and photos load.
- [ ] Android: share a product link from a shop app to Trousseau; it lands in the plan.
