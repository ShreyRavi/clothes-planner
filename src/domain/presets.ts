import type { Preset, PresetId } from './types';

const s = (name: string, hint = '', optional = false) => ({ name, hint, optional });

export const DEFAULT_PRESETS: Record<PresetId, Preset> = {
  women: {
    id: 'women',
    label: "Women's",
    slots: [
      s('Main outfit', 'lehenga, saree, anarkali, suit'),
      s('Blouse or top', 'stitched blouse, crop top'),
      s('Dupatta or drape', 'dupatta, cape, pallu'),
      s('Footwear', 'juttis, block heels'),
      s('Necklace', 'choker, rani haar'),
      s('Earrings', 'jhumkas, chandbalis'),
      s('Bangles and hand jewelry', 'kadas, haathphool'),
      s('Hair jewelry', 'maang tikka, passa'),
      s('Bag or clutch', 'potli, clutch'),
      s('Hair', '', true),
      s('Makeup', '', true),
      s('Innerwear and shapewear', '', true),
      s('Tailoring and alterations', '', true),
    ],
  },
  men: {
    id: 'men',
    label: "Men's",
    slots: [
      s('Main outfit', 'sherwani, kurta, bandhgala, suit'),
      s('Bottoms', 'churidar, pajama, dhoti, trousers'),
      s('Jacket or layer', 'Nehru jacket, waistcoat'),
      s('Footwear', 'mojaris, juttis, dress shoes'),
      s('Safa or turban', 'safa, pagdi'),
      s('Stole or dupatta', 'silk stole'),
      s('Accessories', 'brooch, mala, pocket square, watch'),
      s('Grooming', '', true),
      s('Innerwear', '', true),
      s('Tailoring and alterations', '', true),
    ],
  },
  custom: {
    id: 'custom',
    label: 'Custom',
    slots: [s('Outfit', 'dress, suit, set'), s('Layer', 'jacket, wrap'), s('Footwear', 'shoes, sandals'), s('Accessories', '', true)],
  },
};

export const PRESET_IDS: PresetId[] = ['women', 'men', 'custom'];
