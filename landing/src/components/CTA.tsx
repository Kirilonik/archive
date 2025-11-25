import { motion } from 'framer-motion';

export function CTA() {
  return (
    <section className="py-24 md:py-32 relative">
      <div className="max-w-4xl mx-auto px-6 text-center">
        <motion.h2
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="text-5xl md:text-6xl lg:text-7xl font-light text-text mb-12 leading-tight tracking-tight"
        >
          <span className="block">Готовы</span>
          <span className="block" style={{ color: '#06B6D4' }}>
            начать?
          </span>
        </motion.h2>

        <motion.p
          className="text-lg md:text-xl text-text-muted mb-12 max-w-2xl mx-auto leading-relaxed font-light"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          Присоединяйтесь к сообществу ценителей кино и начните управлять своей коллекцией уже
          сегодня
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.4 }}
        >
          <motion.a
            href="https://мой-архив.рф"
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

        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, delay: 0.6 }}
          className="mt-12 text-text-muted text-sm font-light"
        >
          <p>Бесплатно навсегда • Без ограничений</p>
        </motion.div>
      </div>
    </section>
  );
}
