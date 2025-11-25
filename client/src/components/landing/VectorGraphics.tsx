import { motion } from 'framer-motion';

export function VectorGraphics() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {/* Анимированные линии */}
      <svg className="absolute inset-0 w-full h-full" style={{ opacity: 0.1 }}>
        <defs>
          <linearGradient id="lineGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#22D3EE" stopOpacity="0.5" />
            <stop offset="100%" stopColor="#06B6D4" stopOpacity="0.2" />
          </linearGradient>
        </defs>

        {/* Горизонтальные линии */}
        {Array.from({ length: 8 }).map((_, i) => (
          <motion.line
            key={`h-${i}`}
            x1="0"
            y1={`${(i + 1) * 12.5}%`}
            x2="100%"
            y2={`${(i + 1) * 12.5}%`}
            stroke="url(#lineGradient)"
            strokeWidth="1"
            initial={{ pathLength: 0, opacity: 0 }}
            animate={{ pathLength: 1, opacity: 0.3 }}
            transition={{
              duration: 2,
              delay: i * 0.2,
              repeat: Infinity,
              repeatType: 'reverse',
            }}
          />
        ))}

        {/* Вертикальные линии */}
        {Array.from({ length: 10 }).map((_, i) => (
          <motion.line
            key={`v-${i}`}
            x1={`${(i + 1) * 10}%`}
            y1="0"
            x2={`${(i + 1) * 10}%`}
            y2="100%"
            stroke="url(#lineGradient)"
            strokeWidth="1"
            initial={{ pathLength: 0, opacity: 0 }}
            animate={{ pathLength: 1, opacity: 0.2 }}
            transition={{
              duration: 2.5,
              delay: i * 0.15,
              repeat: Infinity,
              repeatType: 'reverse',
            }}
          />
        ))}
      </svg>

      {/* Геометрические фигуры */}
      <div className="absolute top-20 left-10 w-32 h-32">
        <motion.div
          className="w-full h-full border-2 rounded-full"
          style={{ borderColor: 'rgba(34, 211, 238, 0.2)' }}
          animate={{
            rotate: 360,
            scale: [1, 1.2, 1],
          }}
          transition={{
            rotate: { duration: 20, repeat: Infinity, ease: 'linear' },
            scale: { duration: 4, repeat: Infinity, ease: 'easeInOut' },
          }}
        />
      </div>

      <div className="absolute bottom-32 right-20 w-24 h-24">
        <motion.div
          className="w-full h-full border-2"
          style={{
            clipPath: 'polygon(50% 0%, 0% 100%, 100% 100%)',
            borderColor: 'rgba(6, 182, 212, 0.15)',
          }}
          animate={{
            rotate: -360,
            scale: [1, 1.3, 1],
          }}
          transition={{
            rotate: { duration: 15, repeat: Infinity, ease: 'linear' },
            scale: { duration: 5, repeat: Infinity, ease: 'easeInOut' },
          }}
        />
      </div>

      <div className="absolute top-1/2 left-1/4 w-16 h-16">
        <motion.div
          className="w-full h-full border-2"
          style={{ borderColor: 'rgba(103, 232, 249, 0.2)' }}
          animate={{
            rotate: 360,
            borderRadius: ['0%', '50%', '0%'],
          }}
          transition={{
            rotate: { duration: 10, repeat: Infinity, ease: 'linear' },
            borderRadius: { duration: 3, repeat: Infinity, ease: 'easeInOut' },
          }}
        />
      </div>

      {/* Плавающие точки */}
      {Array.from({ length: 20 }).map((_, i) => (
        <motion.div
          key={`dot-${i}`}
          className="absolute w-2 h-2 rounded-full"
          style={{
            left: `${(i * 7) % 100}%`,
            top: `${(i * 11) % 100}%`,
            backgroundColor: 'rgba(34, 211, 238, 0.3)',
          }}
          animate={{
            y: [0, -30, 0],
            opacity: [0.3, 0.6, 0.3],
            scale: [1, 1.5, 1],
          }}
          transition={{
            duration: 3 + (i % 3),
            delay: i * 0.2,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />
      ))}
    </div>
  );
}
