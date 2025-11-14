import { useEffect, useState } from 'react';
import { apiJson } from '../lib/api';
import type { ConceptArtItem } from '../components/ConceptArtCarousel';

interface UseMediaAssetsResult {
  items: ConceptArtItem[];
  loading: boolean;
  error: string | null;
}

interface MediaAssetApiItem {
  previewUrl?: string;
  imageUrl?: string;
  [key: string]: unknown;
}

interface MediaAssetsApiResponse {
  items?: MediaAssetApiItem[];
}

export function useMediaAssets(
  id: string | undefined,
  type: 'film' | 'series',
  mediaType: 'concept-art' | 'posters',
): UseMediaAssetsResult {
  const [items, setItems] = useState<ConceptArtItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) {
      setItems([]);
      setLoading(false);
      setError(null);
      return;
    }
    let cancelled = false;

    async function loadMedia() {
      setLoading(true);
      setError(null);
      try {
        const payload = await apiJson<MediaAssetsApiResponse>(`/api/${type}s/${id}/${mediaType}`);
        if (cancelled) return;
        const loadedItems: ConceptArtItem[] = Array.isArray(payload?.items)
          ? payload.items
              .filter((item): item is MediaAssetApiItem => 
                typeof item === 'object' && 
                item !== null && 
                typeof item.previewUrl === 'string' && 
                typeof item.imageUrl === 'string'
              )
              .map((item) => ({
                previewUrl: item.previewUrl,
                imageUrl: item.imageUrl,
              }))
          : [];
        setItems(loadedItems);
      } catch {
        if (!cancelled) {
          setItems([]);
          setError(`Не удалось загрузить ${mediaType === 'concept-art' ? 'концепт-арты' : 'постеры'}`);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadMedia();
    return () => {
      cancelled = true;
    };
  }, [id, type, mediaType]);

  return { items, loading, error };
}

