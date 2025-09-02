import React from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { 
  Users, 
  AlertTriangle,
  Briefcase,
  MessageCircle
} from 'lucide-react';

const AdminStats = ({ stats }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 }}
      className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8"
    >
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Usuarios</p>
              <p className="text-2xl font-bold text-gray-900">{stats.totalUsers}</p>
            </div>
            <Users className="w-8 h-8 text-blue-600" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Verificaciones Pendientes</p>
              <p className="text-2xl font-bold text-orange-600">{stats.pendingVerifications}</p>
            </div>
            <AlertTriangle className="w-8 h-8 text-orange-600" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Servicios Publicados</p>
              <p className="text-2xl font-bold text-green-600">{stats.totalBriefs}</p>
            </div>
            <Briefcase className="w-8 h-8 text-green-600" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Conversaciones</p>
              <p className="text-2xl font-bold text-purple-600">{stats.totalConversations}</p>
            </div>
            <MessageCircle className="w-8 h-8 text-purple-600" />
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};

export default AdminStats;