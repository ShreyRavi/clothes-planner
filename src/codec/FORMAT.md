# Share link format

A share link is `<origin><base>s/#<data>`. The fragment is never sent to a server.

`data` is base64url (no padding) of bytes: `[version][deflate-raw(JSON payload)]`.

## Version 1

The JSON payload is a positional array. Every record is an array whose trailing default values (`""`, `0`, `null`, `false`, `[]`) are dropped. References are indexes into the lists, and there are no ids: imports always create fresh ids.

```
[
  plan:       [title, owner, presetIndex(0 women,1 men,2 custom), place, startDate, endDate, notes],
  functions:  [[name, date, timeOfDay, dressCode, colorTheme, venueNotes, note], ...]   // in display order
  slots:      [[name, optional(0|1), hint, hiddenInFunctionIndexes[]], ...]              // in display order
  items:      [[title, link, imageUrl, note, price, currency('' = INR), statusIndex], ...]
  placements: [[itemIndex, functionIndex, slotIndex, picked(0|1)], ...]
  sharedOn:   "YYYY-MM-DD"
]
```

Status indexes: 0 Idea, 1 To buy, 2 Ordered, 3 At tailor, 4 Ready, 5 Packed.

Only items placed in a shared function travel (Inbox items do not). Local photos never travel; remote image URLs do.

Decoding rejects unknown versions, data that decompresses past 2 MB, and records that refer to missing indexes. Every link and image URL is reduced to http or https only.

Changing this format means a new version byte, a decoder branch for the old version, and a golden fixture in `src/codec/fixtures/`.
