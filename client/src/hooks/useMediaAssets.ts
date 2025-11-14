import { useEffect, useState } from 'react';
import { apiFetch } from '../lib/api';
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
        const response = await apiFetch(`/api/${type}s/${id}/${mediaType}`);
        if (cancelled) return;
        
        // Если 404 - просто нет данных, это не ошибка
        if (response.status === 404) {
          setItems([]);
          setLoading(false);
          return;
        }
        
        // Если другой статус ошибки - обрабатываем как ошибку
        if (!response.ok) {
          const error = await response.json().catch(() => ({}));
          const message = typeof error?.error === 'string' ? error.error : 'Неизвестная ошибка';
          if (!cancelled) {
            setItems([]);
            setError(message);
          }
          return;
        }
        
        // Успешный ответ
        const payload = await response.json() as MediaAssetsApiResponse;
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
        // Игнорируем ошибки сети/таймаута только если не отменено
        if (!cancelled) {
          setItems([]);
          // Не устанавливаем ошибку для сетевых проблем, чтобы не показывать пользователю
          // setError(`Не удалось загрузить ${mediaType === 'concept-art' ? 'концепт-арты' : 'постеры'}`);
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

