import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

export interface ConceptArtItem {
  imageUrl: string;
  previewUrl: string;
}

interface ConceptArtCarouselProps {
  items: ConceptArtItem[];
}

const SCROLL_STEP = 360;

export function ConceptArtCarousel({ items }: ConceptArtCarouselProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [viewerOpen, setViewerOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);

  const handleScroll = useCallback((direction: 'prev' | 'next') => {
    const node = scrollRef.current;
    if (!node) return;
    const value = direction === 'prev' ? -SCROLL_STEP : SCROLL_STEP;
    node.scrollBy({ left: value, behavior: 'smooth' });
  }, []);

  const openViewer = useCallback(
    (index: number) => {
      if (items.length === 0) return;
      setActiveIndex(index);
      setViewerOpen(true);
    },
    [items.length],
  );

  const closeViewer = useCallback(() => setViewerOpen(false), []);

  const showPrev = useCallback(() => {
    setActiveIndex((prev) => {
      if (items.length === 0) return prev;
      return prev === 0 ? items.length - 1 : prev - 1;
    });
  }, [items.length]);

  const showNext = useCallback(() => {
    setActiveIndex((prev) => {
      if (items.length === 0) return prev;
      return prev === items.length - 1 ? 0 : prev + 1;
    });
  }, [items.length]);

  useEffect(() => {
    if (!viewerOpen) return;

    const handleKeydown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        closeViewer();
      } else if (event.key === 'ArrowLeft') {
        event.preventDefault();
        showPrev();
      } else if (event.key === 'ArrowRight') {
        event.preventDefault();
        showNext();
      }
    };

    document.addEventListener('keydown', handleKeydown);

    const { body } = document;
    const previousOverflow = body.style.overflow;
    body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', handleKeydown);
      body.style.overflow = previousOverflow;
    };
  }, [viewerOpen, closeViewer, showPrev, showNext]);

  if (items.length === 0) {
    return null;
  }

  const modal =
    viewerOpen && items[activeIndex]
      ? createPortal(
          <div
            className="fixed inset-0 z-[1000] flex flex-col bg-black/50 backdrop-blur-lg"
            role="dialog"
            aria-modal="true"
            onClick={closeViewer}
          >
            <div className="flex items-center justify-between px-6 py-4 text-white">
              <div className="text-sm text-white/70">
                Изображение {activeIndex + 1} из {items.length}
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  className="rounded-full bg-white/10 px-3 py-1 text-sm text-white transition hover:bg-white/20 focus:outline-none focus:ring-2 focus:ring-white/60"
                  onClick={(event) => {
                    event.stopPropagation();
                    showPrev();
                  }}
                >
                  Назад
                </button>
                <button
                  type="button"
                  className="rounded-full bg-white/10 px-3 py-1 text-sm text-white transition hover:bg-white/20 focus:outline-none focus:ring-2 focus:ring-white/60"
                  onClick={(event) => {
                    event.stopPropagation();
                    showNext();
                  }}
                >
                  Далее
                </button>
                <button
                  type="button"
                  className="rounded-full bg-white/10 p-2 text-white transition hover:bg-white/20 focus:outline-none focus:ring-2 focus:ring-white/60"
                  onClick={(event) => {
                    event.stopPropagation();
                    closeViewer();
                  }}
                  aria-label="Закрыть просмотр"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5">
                    <path
                      fillRule="evenodd"
                      d="M5.47 5.47a.75.75 0 0 1 1.06 0L12 10.94l5.47-5.47a.75.75 0 1 1 1.06 1.06L13.06 12l5.47 5.47a.75.75 0 0 1-1.06 1.06L12 13.06l-5.47 5.47a.75.75 0 0 1-1.06-1.06L10.94 12 5.47 6.53a.75.75 0 0 1 0-1.06Z"
                      clipRule="evenodd"
                    />
                  </svg>
                </button>
              </div>
            </div>
            <div className="flex flex-1 items-center justify-center px-4 pb-6">
              <img
                src={items[activeIndex].imageUrl}
                alt="Концепт-арт"
                className="max-h-[85vh] max-w-[95vw] object-contain"
                onClick={(event) => event.stopPropagation()}
              />
            </div>
          </div>,
          document.body,
        )
      : null;

  return (
    <>
      <div className="relative">
        <div ref={scrollRef} className="flex gap-4 overflow-x-auto pb-2 pr-6 snap-x snap-mandatory">
          {items.map((item, index) => (
            <button
              key={`${item.previewUrl}-${index}`}
              type="button"
              onClick={() => openViewer(index)}
              className="group relative h-48 w-80 flex-none overflow-hidden rounded-soft border border-white/10 bg-black/40 shadow-inner snap-start"
            >
              <img
                src={item.previewUrl}
                alt="Концепт-арт"
                className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                loading="lazy"
              />
              <div className="absolute inset-0 bg-black/20 opacity-0 transition-opacity duration-200 group-hover:opacity-100" />
            </button>
          ))}
        </div>
        {items.length > 1 && (
          <>
            <button
              type="button"
              className="absolute left-0 top-1/2 -translate-y-1/2 rounded-full bg-black/60 p-2 text-white shadow-lg transition hover:bg-black/80 focus:outline-none focus:ring-2 focus:ring-white/70"
              onClick={() => handleScroll('prev')}
              aria-label="Предыдущие изображения"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5">
                <path
                  fillRule="evenodd"
                  d="M15.53 4.47a.75.75 0 0 1 0 1.06L9.31 11.75l6.22 6.22a.75.75 0 0 1-1.06 1.06l-6.75-6.75a.75.75 0 0 1 0-1.06l6.75-6.75a.75.75 0 0 1 1.06 0Z"
                  clipRule="evenodd"
                />
              </svg>
            </button>
            <button
              type="button"
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-black/60 p-2 text-white shadow-lg transition hover:bg-black/80 focus:outline-none focus:ring-2 focus:ring-white/70"
              onClick={() => handleScroll('next')}
              aria-label="Следующие изображения"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5">
                <path
                  fillRule="evenodd"
                  d="M8.47 4.47a.75.75 0 0 1 1.06 0l6.75 6.75a.75.75 0 0 1 0 1.06l-6.75 6.75a.75.75 0 0 1-1.06-1.06l6.22-6.22-6.22-6.22a.75.75 0 0 1 0-1.06Z"
                  clipRule="evenodd"
                />
              </svg>
            </button>
          </>
        )}
      </div>
      {modal}
    </>
  );
}

