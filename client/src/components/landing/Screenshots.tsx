import { motion, useInView } from 'framer-motion';
import { useRef } from 'react';

const screenshots = [
  {
    src: '/screenshots/home.png',
    alt: 'Главная страница',
    title: 'Главная страница',
    description: 'Ваша коллекция фильмов и сериалов в удобном виде',
  },
  {
    src: '/screenshots/movie.png',
    alt: 'Карточка фильма',
    title: 'Детальная информация',
    description: 'Подробная информация о каждом фильме с рейтингами и заметками',
  },
  {
    src: '/screenshots/stats.png',
    alt: 'Статистика',
    title: 'Аналитика',
    description: 'Визуализация вашей коллекции с помощью графиков и диаграмм',
  },
  {
    src: '/screenshots/add_movie.png',
    alt: 'Добавление фильма',
    title: 'Простое добавление',
    description: 'Быстрое добавление фильмов с автоматическим заполнением данных',
  },
];

export function Screenshots() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: '-100px' });

  return (
    <section id="screenshots" ref={ref} className="py-24 md:py-32 relative">
      <div className="max-w-7xl mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="mb-20"
        >
          <h2 className="text-5xl md:text-6xl lg:text-7xl font-light text-text mb-8 leading-tight tracking-tight">
            <span className="block">Посмотрите</span>
            <span className="block" style={{ color: '#06B6D4' }}>
              как это работает
            </span>
          </h2>
        </motion.div>

        <div className="space-y-32">
          {screenshots.map((screenshot, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 30 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.6, delay: index * 0.1 }}
              className="w-full"
            >
              {/* Текст над скриншотом */}
              <div className="mb-8 max-w-3xl">
                <div className="text-sm font-medium mb-4" style={{ color: '#06B6D4' }}>
                  {String(index + 1).padStart(2, '0')}
                </div>
                <h3 className="text-3xl md:text-4xl lg:text-5xl font-light text-text mb-4">
                  {screenshot.title}
                </h3>
                <p className="text-lg md:text-xl text-text-muted leading-relaxed font-light">
                  {screenshot.description}
                </p>
              </div>

              {/* Скриншот на всю ширину */}
              <div className="w-full">
                <div className="rounded-2xl overflow-hidden bg-gradient-to-br from-cyan-50 to-blue-50 p-3 md:p-4">
                  <img
                    src={screenshot.src}
                    alt={screenshot.alt}
                    className="w-full h-auto rounded-lg shadow-2xl"
                  />
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* <motion.div
          initial={{ opacity: 0 }}
          animate={isInView ? { opacity: 1 } : {}}
          transition={{ duration: 0.6, delay: 0.8 }}
          className="mt-12 text-center text-sm text-text-muted"
        >
          <p>
            <strong>Совет:</strong> Чтобы заменить скриншоты, поместите свои изображения в папку{' '}
            <code className="px-2 py-1 rounded bg-text/5 text-text">landing/public/screenshots/</code>
            <br />
            с именами: <code className="px-2 py-1 rounded bg-text/5 text-text">home.png</code>,{' '}
            <code className="px-2 py-1 rounded bg-text/5 text-text">movie.png</code>,{' '}
            <code className="px-2 py-1 rounded bg-text/5 text-text">stats.png</code>,{' '}
            <code className="px-2 py-1 rounded bg-text/5 text-text">add_movie.png</code>
          </p>
        </motion.div> */}
      </div>
    </section>
  );
}
