import { motion } from 'motion/react';
import { 
  Zap, 
  Users, 
  Shield, 
  BarChart3, 
  Cloud, 
  Smartphone,
  CheckCircle,
  ArrowRight
} from 'lucide-react';
import { useState } from 'react';
import { ImageWithFallback } from './figma/ImageWithFallback';
import { Button } from './ui/button';

const features = [
  {
    icon: Zap,
    title: 'Lightning Fast',
    description: 'Built for speed with real-time updates and instant synchronization across all devices.',
    color: 'bg-yellow-100 text-yellow-600',
    image: 'https://images.unsplash.com/photo-1695067438561-75492f7b6a9c?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxtb2Rlcm4lMjBhcmNoaXRlY3R1cmUlMjBidWlsZGluZ3xlbnwxfHx8fDE3NjMwNjU2ODh8MA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral'
  },
  {
    icon: Users,
    title: 'Team Collaboration',
    description: 'Work together seamlessly with real-time chat, file sharing, and task management.',
    color: 'bg-blue-100 text-blue-600',
    image: 'https://images.unsplash.com/photo-1759922378222-47ad736a174d?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxjb25zdHJ1Y3Rpb24lMjBwcm9qZWN0JTIwdGVhbXxlbnwxfHx8fDE3NjMxMDgwNDR8MA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral'
  },
  {
    icon: Shield,
    title: 'Enterprise Security',
    description: 'Bank-level encryption and compliance with industry standards to keep your data safe.',
    color: 'bg-green-100 text-green-600',
    image: 'https://images.unsplash.com/photo-1742415106160-594d07f6cc23?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxibHVlcHJpbnQlMjBwbGFubmluZ3xlbnwxfHx8fDE3NjMxMDgwNDR8MA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral'
  },
  {
    icon: BarChart3,
    title: 'Advanced Analytics',
    description: 'Make data-driven decisions with comprehensive reports and predictive insights.',
    color: 'bg-purple-100 text-purple-600',
    image: 'https://images.unsplash.com/photo-1695067438561-75492f7b6a9c?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxtb2Rlcm4lMjBhcmNoaXRlY3R1cmUlMjBidWlsZGluZ3xlbnwxfHx8fDE3NjMwNjU2ODh8MA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral'
  },
  {
    icon: Cloud,
    title: 'Cloud Storage',
    description: 'Access your projects anywhere with unlimited cloud storage and automatic backups.',
    color: 'bg-sky-100 text-sky-600',
    image: 'https://images.unsplash.com/photo-1759922378222-47ad736a174d?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxjb25zdHJ1Y3Rpb24lMjBwcm9qZWN0JTIwdGVhbXxlbnwxfHx8fDE3NjMxMDgwNDR8MA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral'
  },
  {
    icon: Smartphone,
    title: 'Mobile First',
    description: 'Native mobile apps for iOS and Android with full offline functionality.',
    color: 'bg-pink-100 text-pink-600',
    image: 'https://images.unsplash.com/photo-1742415106160-594d07f6cc23?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxibHVlcHJpbnQlMjBwbGFubmluZ3xlbnwxfHx8fDE3NjMxMDgwNDR8MA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral'
  },
];

export function Features() {
  const [activeFeature, setActiveFeature] = useState(0);

  return (
    <div id="features" className="py-20 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="text-slate-900 mb-4">Everything You Need to Succeed</h2>
          <p className="text-slate-600 max-w-2xl mx-auto">
            Powerful features designed to streamline your workflow and boost productivity
          </p>
        </motion.div>

        {/* Interactive Feature Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 mb-20">
          {features.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                whileHover={{ y: -8, scale: 1.02 }}
                onHoverStart={() => setActiveFeature(index)}
                className="group p-6 bg-gradient-to-br from-slate-50 to-white rounded-2xl border border-slate-200 hover:border-blue-300 hover:shadow-xl transition-all cursor-pointer"
              >
                <div className={`w-12 h-12 rounded-xl ${feature.color} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                  <Icon className="w-6 h-6" />
                </div>
                <h3 className="text-slate-900 mb-2">{feature.title}</h3>
                <p className="text-slate-600 mb-4">{feature.description}</p>
                <div className="flex items-center text-blue-600 opacity-0 group-hover:opacity-100 transition-opacity">
                  Learn more <ArrowRight className="ml-2 w-4 h-4" />
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Featured Section with Image */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="bg-gradient-to-br from-blue-600 to-purple-600 rounded-3xl p-8 lg:p-12 text-white"
        >
          <div className="grid lg:grid-cols-2 gap-8 items-center">
            <div>
              <h2 className="text-white mb-4">
                {features[activeFeature].title}
              </h2>
              <p className="text-blue-100 mb-6">
                {features[activeFeature].description}
              </p>
              <ul className="space-y-3 mb-8">
                <li className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 mt-0.5 flex-shrink-0" />
                  <span>Easy integration with existing workflows</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 mt-0.5 flex-shrink-0" />
                  <span>24/7 customer support and onboarding assistance</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 mt-0.5 flex-shrink-0" />
                  <span>Regular updates and new features</span>
                </li>
              </ul>
              <Button size="lg" variant="secondary">
                Explore All Features
              </Button>
            </div>
            <motion.div
              key={activeFeature}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3 }}
              className="relative"
            >
              <div className="absolute inset-0 bg-white/10 rounded-2xl blur-2xl" />
              <ImageWithFallback
                src={features[activeFeature].image}
                alt={features[activeFeature].title}
                className="relative rounded-2xl shadow-2xl w-full h-auto"
              />
            </motion.div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
