
import React from 'react';
import { motion } from 'framer-motion';

const FloatingShapes: React.FC = () => {
  const shapes = [
    { id: 1, size: 60, x: '10%', y: '20%', delay: 0 },
    { id: 2, size: 80, x: '80%', y: '10%', delay: 1 },
    { id: 3, size: 40, x: '70%', y: '60%', delay: 2 },
    { id: 4, size: 100, x: '20%', y: '70%', delay: 0.5 },
    { id: 5, size: 50, x: '90%', y: '80%', delay: 1.5 },
    { id: 6, size: 70, x: '5%', y: '50%', delay: 2.5 },
  ];

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {shapes.map((shape) => (
        <motion.div
          key={shape.id}
          className="absolute rounded-full bg-gradient-to-br from-white/20 to-white/5 backdrop-blur-sm"
          style={{
            width: shape.size,
            height: shape.size,
            left: shape.x,
            top: shape.y,
          }}
          animate={{
            y: [0, -30, 0],
            rotate: [0, 180, 360],
            scale: [1, 1.1, 1],
          }}
          transition={{
            duration: 8 + shape.delay,
            repeat: Infinity,
            ease: "easeInOut",
            delay: shape.delay,
          }}
        />
      ))}
    </div>
  );
};

export default FloatingShapes;
