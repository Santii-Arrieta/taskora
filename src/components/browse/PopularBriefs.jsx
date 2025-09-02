import React from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Card, CardTitle } from '@/components/ui/card';
import { Star } from 'lucide-react';

const PopularBriefs = ({ briefs }) => {
  if (briefs.length === 0) return null;

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="mb-12">
      <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center"><Star className="w-6 h-6 mr-2 text-primary"/> Populares</h2>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {briefs.map(brief => (
          <Link to={`/brief/${brief.id}`} key={brief.id}>
            <Card className="h-full overflow-hidden group">
              <div className="relative">
                <img  alt={brief.title} className="w-full h-32 object-cover transition-transform duration-300 group-hover:scale-110" src={brief.images?.[0] || "https://images.unsplash.com/photo-1612959669877-32bea046cf0d"} />
                <div className="absolute inset-0 bg-black/40"></div>
                <CardTitle className="absolute bottom-2 left-2 text-white text-md line-clamp-2">{brief.title}</CardTitle>
              </div>
            </Card>
          </Link>
        ))}
      </div>
    </motion.div>
  );
};

export default PopularBriefs;