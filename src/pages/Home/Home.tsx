import React from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Calendar, Plus } from 'lucide-react';

interface AppCardProps {
  title: string;
  description: string;
  icon: React.ReactNode;
  onClick: () => void;
  delay?: number;
}

const AppCard: React.FC<AppCardProps> = ({ title, description, icon, onClick, delay = 0 }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay }}
      whileHover={{ 
        scale: 1.02, 
        boxShadow: '0 8px 25px rgba(118, 171, 174, 0.3)'
      }}
      whileTap={{ scale: 0.98 }}
      className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-xl p-6 cursor-pointer border border-gray-700 hover:border-teal-400 transition-all duration-300"
      onClick={onClick}
    >
      <div className="flex items-center space-x-4">
        <div className="p-3 bg-teal-500 rounded-lg text-white">
          {icon}
        </div>
        <div className="flex-1">
          <h3 className="text-xl font-semibold text-gray-100 mb-1">{title}</h3>
          <p className="text-gray-400 text-sm">{description}</p>
        </div>
        <div className="text-teal-400">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </div>
      </div>
    </motion.div>
  );
};

const ComingSoonCard: React.FC<{ delay?: number }> = ({ delay = 0 }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay }}
      className="bg-gradient-to-br from-gray-800/50 to-gray-900/50 rounded-xl p-6 border border-gray-700 border-dashed"
    >
      <div className="flex items-center space-x-4">
        <div className="p-3 bg-gray-600 rounded-lg text-gray-400">
          <Plus size={24} />
        </div>
        <div className="flex-1">
          <h3 className="text-xl font-semibold text-gray-400 mb-1">Aplikasi Baru</h3>
          <p className="text-gray-500 text-sm">Segera hadir...</p>
        </div>
      </div>
    </motion.div>
  );
};

export const Home: React.FC = () => {
  const navigate = useNavigate();

  const handleNavigateToAbsensi = (): void => {
    navigate('/absensi');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900" style={{ backgroundColor: '#222831' }}>
      {/* Header */}
      <motion.header 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="bg-gray-800/80 backdrop-blur-sm border-b border-gray-700"
        style={{ backgroundColor: '#31363F' }}
      >
        <div className="max-w-6xl mx-auto px-6 py-6">
          <div className="flex items-center space-x-4">
            <motion.div 
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="w-12 h-12 bg-teal-500 rounded-xl flex items-center justify-center text-white font-bold text-xl"
              style={{ backgroundColor: '#76ABAE' }}
            >
              KMM
            </motion.div>
            <div>
              <h1 className="text-2xl font-bold text-gray-100">Utilitas Internal</h1>
              <p className="text-gray-400">KMM B9 Infinite Learning</p>
            </div>
          </div>
        </div>
      </motion.header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-6 py-12">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="mb-8"
        >
          <h2 className="text-3xl font-bold text-gray-100 mb-2">Dashboard Aplikasi</h2>
          <p className="text-gray-400">Pilih aplikasi yang ingin Anda gunakan</p>
        </motion.div>

        {/* Apps Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <AppCard
            title="Absensi"
            description="Kelola kehadiran dan absensi mentee"
            icon={<Calendar size={24} />}
            onClick={handleNavigateToAbsensi}
            delay={0.4}
          />
          
          <ComingSoonCard delay={0.5} />
          <ComingSoonCard delay={0.6} />
        </div>
      </main>
    </div>
  );
};
