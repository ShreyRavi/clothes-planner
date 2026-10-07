import type { PlanBundle } from '../domain/types';

// A realistic 6-function, 60-item plan built from real-looking shop URLs,
// used for the link size budget (design doc Open Question 1, eng D7).
const SHOPS = [
  'https://www.myntra.com/lehenga-choli/kalki-fashion/kalki-fashion-mint-green-embroidered-lehenga/24581937/buy',
  'https://www.azafashions.com/products/ritu-kumar-mint-chikankari-anarkali/123456',
  'https://www.amazon.in/Fizzy-Goblet-Womens-Gold-Juttis/dp/B0C1K2L3M4',
  'https://www.tanishq.co.in/product/kundan-jhumka-earrings-503012ABCD.html',
  'https://www.pernia.com/products/organza-dupatta-ivory-gold-border-p12345',
  'https://www.nykaafashion.com/potli-bag-embellished-gold/p/7788990',
  'https://www.manyavar.com/en-in/sherwani/cream-silk-sherwani-with-zari/MSW1234.html',
  'https://www.tarunmtahiliani.com/products/nehru-jacket-ivory-silk',
  'https://www.etsy.com/listing/1234567890/handmade-maang-tikka-polki',
  'https://www.ajio.com/glass-bangles-set-of-24/p/469012345_gold',
];
const IMG = [
  'https://assets.myntassets.com/h_720,q_90,w_540/v1/assets/images/24581937/2023/9/1/abcd1234-5678.jpg',
  'https://cdn.azafashions.com/media/catalog/product/r/k/rk-anarkali-mint-1.jpg',
  'https://m.media-amazon.com/images/I/71abcDEFgh._UY695_.jpg',
];
const TITLES = ['Mint chikankari anarkali', 'Gold juttis', 'Kundan jhumkas', 'Organza dupatta', 'Potli bag', 'Cream sherwani', 'Nehru jacket', 'Polki maang tikka', 'Glass bangles', 'Embroidered blouse'];

export function bigPlan(functions = 6, items = 60): PlanBundle {
  const planId = 'p1';
  const fns = Array.from({ length: functions }, (_, i) => ({
    id: `f${i}`, planId, name: ['Mehendi', 'Haldi', 'Sangeet', 'Wedding ceremony', 'Reception', 'Welcome dinner'][i % 6], date: `2026-06-${23 + i}`,
    timeOfDay: i % 2 ? 'Evening' : 'Morning', dressCode: 'Jewel tones', colorTheme: '', venueNotes: 'Villa garden, on grass', note: '', order: i,
  }));
  const slots = Array.from({ length: 13 }, (_, i) => ({ id: `s${i}`, planId, name: `Slot ${i}`, hint: '', optional: i > 8, order: i, hiddenIn: [] as string[] }));
  const its = Array.from({ length: items }, (_, i) => ({
    id: `i${i}`, planId, title: `${TITLES[i % 10]} ${i}`, link: `${SHOPS[i % 10]}?variant=${i}`, imageUrl: i % 3 === 0 ? IMG[i % 3] : '',
    photoId: i % 3 === 1 ? `ph${i}` : '', note: i % 4 === 0 ? 'Ask tailor for 2 cm extra' : '', price: i % 2 ? 4500 + i * 100 : null,
    currency: 'INR', status: (['Idea', 'To buy', 'Ordered', 'At tailor', 'Ready', 'Packed'] as const)[i % 6], createdAt: 0,
  }));
  const placements = its.map((it, i) => ({
    id: `pl${i}`, planId, itemId: it.id, functionId: `f${i % functions}`, slotId: `s${Math.floor(i / functions) % 13}`, picked: i % 2 === 0, order: i,
  }));
  return {
    plan: { id: planId, title: "Ananya's wedding", owner: 'Priya', preset: 'women', templateId: 'indian-wedding', place: 'Udaipur', startDate: '2026-06-23', endDate: '2026-06-28', notes: '', createdAt: 0, updatedAt: 0 },
    functions: fns, slots, items: its, placements,
  };
}
