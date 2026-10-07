// Core data model (schema v1). Items are the pieces themselves; placements put
// an item into a function's slot. Reuse across functions = several placements.

export type PresetId = 'women' | 'men' | 'custom';

export const STATUSES = ['Idea', 'To buy', 'Ordered', 'At tailor', 'Ready', 'Packed'] as const;
export type Status = (typeof STATUSES)[number];

export interface Plan {
  id: string;
  title: string;
  owner: string;
  preset: PresetId;
  templateId: string;
  place: string;
  startDate: string; // ISO date or ''
  endDate: string;
  notes: string;
  sharedOn?: string; // set on copies saved from a share link
  createdAt: number;
  updatedAt: number;
}

export interface Fn {
  id: string;
  planId: string;
  name: string;
  date: string;
  timeOfDay: string;
  dressCode: string;
  colorTheme: string;
  venueNotes: string;
  note: string;
  order: number;
}

export interface Slot {
  id: string;
  planId: string;
  name: string;
  hint: string;
  optional: boolean;
  order: number;
  hiddenIn: string[]; // function ids where this slot is hidden (SL-3)
}

export interface Item {
  id: string;
  planId: string;
  title: string;
  link: string;
  imageUrl: string; // remote image, travels in share links
  photoId: string; // local photo, travels only in backups
  note: string;
  price: number | null;
  currency: string;
  status: Status;
  createdAt: number;
}

export interface Placement {
  id: string;
  planId: string;
  itemId: string;
  functionId: string;
  slotId: string;
  picked: boolean;
  order: number;
}

export type PhotoSize = 'full' | 'thumb';
// Stored as bytes, not Blob: Safari private browsing and some WebKit builds
// refuse Blob values in IndexedDB.
export interface PhotoRow {
  photoId: string;
  size: PhotoSize;
  type: string;
  data: ArrayBuffer;
}

export interface PresetSlot {
  name: string;
  hint: string;
  optional: boolean;
}
export interface Preset {
  id: PresetId;
  label: string;
  slots: PresetSlot[];
}

export interface MetaRow {
  key: string;
  value: unknown;
}

/** Everything that belongs to one plan, as plain records. */
export interface PlanBundle {
  plan: Plan;
  functions: Fn[];
  slots: Slot[];
  items: Item[];
  placements: Placement[];
}
