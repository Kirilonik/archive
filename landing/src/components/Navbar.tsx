import { motion } from 'framer-motion';

export function Navbar() {
  return (
    <motion.nav
      initial={{ y: -100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.6 }}
      className="fixed top-0 left-0 right-0 z-50"
      style={{
        background: 'rgba(255, 255, 255, 0.8)',
        backdropFilter: 'blur(20px) saturate(180%)',
        WebkitBackdropFilter: 'blur(20px) saturate(180%)',
        borderBottom: '1px solid rgba(0, 0, 0, 0.05)',
      }}
    >
      <div className="max-w-7xl mx-auto px-6 py-5 flex items-center justify-between">
        <motion.div className="text-xl font-medium text-text">Медиа-Архив</motion.div>
        <motion.a
          href="https://мой-архив.рф"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className="px-6 py-2 rounded-full text-white font-medium text-sm"
          style={{
            background: 'linear-gradient(135deg, #06B6D4 0%, #22D3EE 100%)',
            boxShadow: '0 2px 10px rgba(6, 182, 212, 0.25)',
          }}
        >
          Войти
        </motion.a>
      </div>
    </motion.nav>
  );
}
