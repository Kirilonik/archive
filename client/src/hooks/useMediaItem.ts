import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { apiFetch } from '../lib/api';
import type { Film, Series } from '../types';

type MediaType = 'film' | 'series';
type MediaItem = Film | Series;

interface UseMediaItemOptions {
  id: string | undefined;
  type: MediaType;
  onDeleted?: () => void;
}

interface UseMediaItemReturn<T extends MediaItem> {
  data: T | null;
  saving: boolean;
  deleting: boolean;
  showDeleteConfirm: boolean;
  setShowDeleteConfirm: (show: boolean) => void;
  ratingEditMode: boolean;
  setRatingEditMode: (show: boolean) => void;
  ratingDraft: string;
  setRatingDraft: (value: string) => void;
  opinionEditMode: boolean;
  setOpinionEditMode: (show: boolean) => void;
  opinionDraft: string;
  setOpinionDraft: (value: string) => void;
  handleSaveRating: () => Promise<void>;
  handleSaveOpinion: () => Promise<void>;
  handleDelete: () => Promise<void>;
  refreshData: () => Promise<void>;
}

export function useMediaItem<T extends MediaItem>({
  id,
  type,
  onDeleted,
}: UseMediaItemOptions): UseMediaItemReturn<T> {
  const navigate = useNavigate();
  const [data, setData] = useState<T | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [ratingEditMode, setRatingEditMode] = useState(false);
  const [ratingDraft, setRatingDraft] = useState<string>('');
  const [opinionEditMode, setOpinionEditMode] = useState(false);
  const [opinionDraft, setOpinionDraft] = useState<string>('');

  const apiEndpoint = type === 'film' ? '/api/films' : '/api/series';
  const itemName = type === 'film' ? 'фильма' : 'сериала';

  async function loadData() {
    if (!id) return;
    try {
      const resp = await apiFetch(`${apiEndpoint}/${id}`);
      if (!resp.ok) throw new Error();
      const payload: T = await resp.json();
      setData(payload);
      setRatingDraft(payload?.my_rating != null ? String(payload.my_rating) : '');
      setOpinionDraft(payload?.opinion ?? '');
    } catch {
      setData(null);
    }
  }

  useEffect(() => {
    if (!id) return;
    let cancelled = false;

    async function load() {
      try {
        const resp = await apiFetch(`${apiEndpoint}/${id}`);
        if (!resp.ok) throw new Error();
        const payload: T = await resp.json();
        if (cancelled) return;
        setData(payload);
        setRatingDraft(payload?.my_rating != null ? String(payload.my_rating) : '');
        setOpinionDraft(payload?.opinion ?? '');
      } catch {
        if (!cancelled) setData(null);
      }
    }

    load();

    return () => {
      cancelled = true;
    };
  }, [id, apiEndpoint]);

  async function refreshData() {
    await loadData();
  }

  async function handleSaveRating() {
    if (!id) return;
    try {
      setSaving(true);
      const body: { my_rating: number | null } = {
        my_rating: ratingDraft === '' ? null : Number(ratingDraft),
      };
      const resp = await apiFetch(`${apiEndpoint}/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!resp.ok) {
        let errorMessage = 'Ошибка при сохранении оценки';
        try {
          const errorData = await resp.json();
          if (errorData?.error && typeof errorData.error === 'string') {
            errorMessage = errorData.error;
          } else if (errorData?.message && typeof errorData.message === 'string') {
            errorMessage = errorData.message;
          }
        } catch {
          // Если не удалось распарсить JSON, используем дефолтное сообщение
        }
        toast.error(errorMessage);
        return;
      }
      await refreshData();
      setRatingEditMode(false);
      toast.success('Оценка сохранена');
    } catch (error: any) {
      const errorMessage = error?.message || 'Ошибка при сохранении оценки';
      toast.error(errorMessage);
    } finally {
      setSaving(false);
    }
  }

  async function handleSaveOpinion() {
    if (!id) return;
    try {
      setSaving(true);
      const body: { opinion: string } = { opinion: opinionDraft };
      const resp = await apiFetch(`${apiEndpoint}/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!resp.ok) {
        let errorMessage = 'Ошибка при сохранении мнения';
        try {
          const errorData = await resp.json();
          if (errorData?.error && typeof errorData.error === 'string') {
            errorMessage = errorData.error;
          } else if (errorData?.message && typeof errorData.message === 'string') {
            errorMessage = errorData.message;
          }
        } catch {
          // Если не удалось распарсить JSON, используем дефолтное сообщение
        }
        toast.error(errorMessage);
        return;
      }
      await refreshData();
      setOpinionEditMode(false);
      toast.success('Мнение сохранено');
    } catch (error: any) {
      const errorMessage = error?.message || 'Ошибка при сохранении мнения';
      toast.error(errorMessage);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!id) return;
    try {
      setDeleting(true);
      const resp = await apiFetch(`${apiEndpoint}/${id}`, { method: 'DELETE' });
      if (!resp.ok) {
        let errorMessage = `Ошибка при удалении ${itemName}`;
        try {
          const errorData = await resp.json();
          if (errorData?.error && typeof errorData.error === 'string') {
            errorMessage = errorData.error;
          } else if (errorData?.message && typeof errorData.message === 'string') {
            errorMessage = errorData.message;
          }
        } catch {
          // Если не удалось распарсить JSON, используем дефолтное сообщение
        }
        toast.error(errorMessage);
        return;
      }
      toast.success(`${itemName === 'фильма' ? 'Фильм' : 'Сериал'} удален из библиотеки`);
      setShowDeleteConfirm(false);
      if (onDeleted) {
        onDeleted();
      } else {
        navigate('/');
      }
    } catch (error: any) {
      const errorMessage = error?.message || `Ошибка при удалении ${itemName}`;
      toast.error(errorMessage);
    } finally {
      setDeleting(false);
    }
  }

  return {
    data,
    saving,
    deleting,
    showDeleteConfirm,
    setShowDeleteConfirm,
    ratingEditMode,
    setRatingEditMode,
    ratingDraft,
    setRatingDraft,
    opinionEditMode,
    setOpinionEditMode,
    opinionDraft,
    setOpinionDraft,
    handleSaveRating,
    handleSaveOpinion,
    handleDelete,
    refreshData,
  };
}
