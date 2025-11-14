import { motion } from 'motion/react';
import { useEffect, useState, useRef } from 'react';

function Counter({ end, duration = 2 }: { end: number; duration?: number }) {
  const [count, setCount] = useState(0);
  const [hasAnimated, setHasAnimated] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !hasAnimated) {
          setHasAnimated(true);
          let startTime: number;
          const animate = (currentTime: number) => {
            if (!startTime) startTime = currentTime;
            const progress = Math.min((currentTime - startTime) / (duration * 1000), 1);
            
            setCount(Math.floor(progress * end));
            
            if (progress < 1) {
              requestAnimationFrame(animate);
            }
          };
          requestAnimationFrame(animate);
        }
      },
      { threshold: 0.5 }
    );

    if (ref.current) {
      observer.observe(ref.current);
    }

    return () => observer.disconnect();
  }, [end, duration, hasAnimated]);

  return <div ref={ref}>{count.toLocaleString()}</div>;
}

export function Stats() {
  const stats = [
    { value: 50000, label: 'Active Users', suffix: '+' },
    { value: 1000000, label: 'Projects Managed', suffix: '+' },
    { value: 150, label: 'Countries', suffix: '+' },
    { value: 99, label: 'Uptime', suffix: '%' },
  ];

  return (
    <div className="py-20 bg-gradient-to-b from-white to-slate-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-12"
        >
          <h2 className="text-slate-900 mb-4">Trusted by Industry Leaders</h2>
          <p className="text-slate-600 max-w-2xl mx-auto">
            Join thousands of construction professionals who trust SkyBuild Pro for their projects
          </p>
        </motion.div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
          {stats.map((stat, index) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
              whileHover={{ scale: 1.05 }}
              className="text-center p-6 bg-white rounded-xl shadow-sm border border-slate-100 hover:shadow-lg transition-shadow"
            >
              <div className="text-blue-600 mb-2">
                <Counter end={stat.value} />
                {stat.suffix}
              </div>
              <div className="text-slate-600">{stat.label}</div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}
