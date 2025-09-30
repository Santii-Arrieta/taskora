import React, { useState, useEffect } from 'react';
import { useOptimizedData } from '@/contexts/OptimizedDataContext';
import { useBriefs, useUsers, useStats } from '@/hooks/useOptimizedQueries';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, RefreshCw, Database, Zap } from 'lucide-react';

const OptimizedDataExample = () => {
  const { getCacheStats, clearCache } = useOptimizedData();
  const [cacheStats, setCacheStats] = useState(null);

  // Usar hooks optimizados
  const { 
    data: briefs, 
    loading: briefsLoading, 
    error: briefsError, 
    refetch: refetchBriefs 
  } = useBriefs({
    limit: 10,
    filters: { type: 'service' },
    useCache: true
  });

  const { 
    data: users, 
    loading: usersLoading, 
    error: usersError, 
    refetch: refetchUsers 
  } = useUsers({
    limit: 5,
    useCache: true
  });

  const { 
    data: stats, 
    loading: statsLoading, 
    error: statsError, 
    refetch: refetchStats 
  } = useStats();

  // Actualizar estadísticas del cache
  const updateCacheStats = () => {
    const stats = getCacheStats();
    setCacheStats(stats);
  };

  useEffect(() => {
    updateCacheStats();
  }, []);

  const handleClearCache = () => {
    clearCache();
    updateCacheStats();
    // Refrescar datos
    refetchBriefs();
    refetchUsers();
    refetchStats();
  };

  return (
    <div className="space-y-6">
      {/* Estadísticas del cache */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="w-5 h-5" />
            Estadísticas del Cache
          </CardTitle>
        </CardHeader>
        <CardContent>
          {cacheStats ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-primary">{cacheStats.size}</div>
                <div className="text-sm text-muted-foreground">Entradas en cache</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">{cacheStats.keys.length}</div>
                <div className="text-sm text-muted-foreground">Consultas cacheadas</div>
              </div>
              <div className="text-center">
                <Button onClick={handleClearCache} variant="outline" size="sm">
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Limpiar Cache
                </Button>
              </div>
            </div>
          ) : (
            <div className="text-center text-muted-foreground">
              Cargando estadísticas del cache...
            </div>
          )}
        </CardContent>
      </Card>

      {/* Estadísticas generales */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="w-5 h-5" />
            Estadísticas Generales
          </CardTitle>
        </CardHeader>
        <CardContent>
          {statsLoading ? (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="w-6 h-6 animate-spin" />
            </div>
          ) : statsError ? (
            <div className="text-center text-red-600">
              Error: {statsError}
            </div>
          ) : stats ? (
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold">{stats.totalUsers}</div>
                <div className="text-sm text-muted-foreground">Usuarios</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold">{stats.totalBriefs}</div>
                <div className="text-sm text-muted-foreground">Servicios</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold">{stats.totalConversations}</div>
                <div className="text-sm text-muted-foreground">Conversaciones</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold">{stats.totalTickets}</div>
                <div className="text-sm text-muted-foreground">Tickets</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold">{stats.totalSubscribers}</div>
                <div className="text-sm text-muted-foreground">Newsletter</div>
              </div>
            </div>
          ) : null}
        </CardContent>
      </Card>

      {/* Servicios recientes */}
      <Card>
        <CardHeader>
          <CardTitle>Servicios Recientes (Optimizados)</CardTitle>
        </CardHeader>
        <CardContent>
          {briefsLoading ? (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="w-6 h-6 animate-spin" />
            </div>
          ) : briefsError ? (
            <div className="text-center text-red-600">
              Error: {briefsError}
            </div>
          ) : briefs ? (
            <div className="space-y-3">
              {briefs.map((brief) => (
                <div key={brief.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <h4 className="font-medium">{brief.title}</h4>
                    <p className="text-sm text-muted-foreground">
                      por {brief.author?.name || 'Usuario'}
                    </p>
                  </div>
                  <Badge variant="outline">
                    ${brief.price}
                  </Badge>
                </div>
              ))}
            </div>
          ) : null}
        </CardContent>
      </Card>

      {/* Usuarios recientes */}
      <Card>
        <CardHeader>
          <CardTitle>Usuarios Recientes (Optimizados)</CardTitle>
        </CardHeader>
        <CardContent>
          {usersLoading ? (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="w-6 h-6 animate-spin" />
            </div>
          ) : usersError ? (
            <div className="text-center text-red-600">
              Error: {usersError}
            </div>
          ) : users ? (
            <div className="space-y-3">
              {users.map((user) => (
                <div key={user.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <h4 className="font-medium">{user.name}</h4>
                    <p className="text-sm text-muted-foreground">{user.email}</p>
                  </div>
                  <Badge variant="outline">
                    {user.userType}
                  </Badge>
                </div>
              ))}
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
};

export default OptimizedDataExample;
