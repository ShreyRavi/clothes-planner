import { useState } from 'react';
import { usePhotoUrl } from '../hooks';
import { hostOf, safeUrl } from '../../domain/safeUrl';
import type { Item, PhotoSize } from '../../domain/types';

/** Local photo, remote image, or the fallback tile with title and domain. */
export function ItemImage({ item, size = 'thumb', label = true }: { item: Item | undefined; size?: PhotoSize; label?: boolean }) {
  const photoUrl = usePhotoUrl(item?.photoId ?? '', size);
  const remote = safeUrl(item?.imageUrl);
  const [broken, setBroken] = useState(false);
  if (!item) return null;
  if (item.photoId && photoUrl) return <img src={photoUrl} alt="" draggable={false} />;
  if (item.photoId && photoUrl === undefined) return <span className="fallback-tile skeleton" aria-hidden="true" />;
  if (remote && !broken) return <img src={remote} alt="" referrerPolicy="no-referrer" loading="lazy" onError={() => setBroken(true)} draggable={false} />;
  return (
    <span className="fallback-tile">
      {label && <span className="label">{remote || item.photoId ? "Image didn't load" : hostOf(item.link) || 'No image'}</span>}
      <span className="t">{item.title}</span>
    </span>
  );
}
