import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp } from 'lucide-react';

const AnalyticsTab = ({ stats }) => {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <TrendingUp className="w-5 h-5 mr-2" />
            Estadísticas Generales
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">Usuarios totales</span>
            <span className="font-medium">{stats.totalUsers}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">Proveedores verificados</span>
            <span className="font-medium">{stats.verifiedProviders}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">Servicios publicados</span>
            <span className="font-medium">{stats.totalBriefs}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">Conversaciones activas</span>
            <span className="font-medium">{stats.totalConversations}</span>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Distribución de Usuarios</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="w-3 h-3 provider-gradient rounded mr-2"></div>
                <span className="text-sm">Proveedores</span>
              </div>
              <span className="font-medium">{stats.totalProviders}</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="w-3 h-3 client-gradient rounded mr-2"></div>
                <span className="text-sm">Clientes</span>
              </div>
              <span className="font-medium">{stats.totalClients}</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="w-3 h-3 ngo-gradient rounded mr-2"></div>
                <span className="text-sm">ONGs</span>
              </div>
              <span className="font-medium">{stats.totalNGOs}</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AnalyticsTab;