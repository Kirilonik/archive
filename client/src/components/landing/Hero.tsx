import { motion } from 'framer-motion';
import { VectorGraphics } from './VectorGraphics';

export function Hero() {
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden pt-20">
      {/* Векторная графика на фоне */}
      <VectorGraphics />

      <div className="relative z-10 max-w-7xl mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="text-center"
        >
          <motion.h1
            className="text-6xl md:text-7xl lg:text-8xl font-bold text-white mb-12 leading-[1.1] tracking-tight"
            style={{
              letterSpacing: '-0.03em',
              textShadow: '0 2px 20px rgba(0, 0, 0, 0.3), 0 0 40px rgba(6, 182, 212, 0.2)',
              WebkitTextStroke: '1px rgba(255, 255, 255, 0.3)',
            }}
          >
            <motion.span
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="block"
            >
              Ваша коллекция
            </motion.span>
            <motion.span
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.5 }}
              className="block"
            >
              в одном месте
            </motion.span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.7 }}
            className="text-lg md:text-xl text-text-muted mb-16 max-w-2xl mx-auto leading-relaxed font-light"
          >
            это платформа, на которой собрано все, что нужно для управления личной библиотекой
            фильмов и сериалов, отслеживания прогресса и анализа статистики
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.9 }}
          >
            <motion.a
              href="/app/login"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="inline-block px-12 py-4 rounded-full text-white font-medium text-lg"
              style={{
                background: 'linear-gradient(135deg, #06B6D4 0%, #22D3EE 100%)',
                boxShadow: '0 4px 20px rgba(6, 182, 212, 0.3)',
              }}
            >
              Начать бесплатно
            </motion.a>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}
