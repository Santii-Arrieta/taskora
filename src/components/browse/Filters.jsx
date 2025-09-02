
import React, { lazy, Suspense } from 'react';
import { motion } from 'framer-motion';
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { SlidersHorizontal, Search, Star } from 'lucide-react';

const LocationPicker = lazy(() => import('@/components/LocationPicker'));

const StarRating = ({ rating }) => (
    <div className="flex items-center">
      {[...Array(5)].map((_, i) => (
        <Star key={i} className={`w-4 h-4 ${i < rating ? 'text-yellow-400 fill-current' : 'text-gray-300'}`} />
      ))}
    </div>
);

const Filters = ({ filters, setFilters, onUseMyPosition }) => {
  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="bg-white rounded-lg shadow-sm border p-4 mb-8">
       <div className="flex flex-wrap items-center gap-4">
        <div className="relative flex-grow"><Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" /><Input placeholder="Buscar por título o descripción..." value={filters.searchTerm} onChange={(e) => setFilters({...filters, searchTerm: e.target.value})} className="pl-10" /></div>
        
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline"><SlidersHorizontal className="w-4 h-4 mr-2" />Filtros</Button>
          </PopoverTrigger>
          <PopoverContent className="w-96 z-20">
            <div className="grid gap-4">
              <div className="space-y-2">
                <h4 className="font-medium leading-none">Filtros Avanzados</h4>
                <p className="text-sm text-muted-foreground">Ajusta tu búsqueda.</p>
              </div>
              <div className="grid gap-4">
                <div className="grid grid-cols-3 items-center gap-4"><Label>Tipo Servicio</Label>
                  <Select value={filters.serviceType} onValueChange={(v) => setFilters({...filters, serviceType: v})}>
                    <SelectTrigger className="col-span-2 h-8"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos</SelectItem>
                      <SelectItem value="online">Online</SelectItem>
                      <SelectItem value="presencial">Presencial</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {filters.serviceType === 'presencial' && (
                  <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4 p-4 border rounded-md">
                    <Label>Ubicación y Radio de Búsqueda</Label>
                    <Button variant="link" className="p-0 h-auto" onClick={onUseMyPosition}>Usar mi ubicación guardada</Button>
                    <Suspense fallback={<div>Cargando mapa...</div>}>
                      <LocationPicker
                        value={filters.searchLocation}
                        onChange={(location) => setFilters(prev => ({ ...prev, searchLocation: location }))}
                        radius={filters.searchRadius}
                      />
                    </Suspense>
                    <div className="space-y-2">
                      <Label>Radio de Búsqueda: {filters.searchRadius} km</Label>
                      <Slider
                        min={1} max={200} step={1}
                        value={[filters.searchRadius]}
                        onValueChange={(value) => setFilters(prev => ({ ...prev, searchRadius: value[0] }))}
                      />
                    </div>
                  </motion.div>
                )}
                <div className="grid grid-cols-3 items-center gap-4"><Label htmlFor="duration">Duración</Label><Select value={filters.duration} onValueChange={(v) => setFilters({...filters, duration: v})}><SelectTrigger className="col-span-2 h-8"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">Cualquiera</SelectItem><SelectItem value="7">7 días o menos</SelectItem><SelectItem value="15">15 días o menos</SelectItem><SelectItem value="30">30 días o menos</SelectItem></SelectContent></Select></div>
                <div className="space-y-2">
                  <Label>Rango de Precio: ${filters.priceRange[0]} - ${filters.priceRange[1]}</Label>
                  <Slider min="0" max="5000" step="10" value={[filters.priceRange[1]]} onValueChange={(v) => setFilters({...filters, priceRange: [filters.priceRange[0], v[0]]})} />
                </div>
                <div className="space-y-2">
                    <Label>Reputación Mínima</Label>
                    <Select value={String(filters.rating)} onValueChange={(v) => setFilters({...filters, rating: Number(v)})}>
                        <SelectTrigger><SelectValue/></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="0">Cualquiera</SelectItem>
                            <SelectItem value="1"><StarRating rating={1} /></SelectItem>
                            <SelectItem value="2"><StarRating rating={2} /></SelectItem>
                            <SelectItem value="3"><StarRating rating={3} /></SelectItem>
                            <SelectItem value="4"><StarRating rating={4} /></SelectItem>
                            <SelectItem value="5"><StarRating rating={5} /></SelectItem>
                        </SelectContent>
                    </Select>
                </div>
              </div>
            </div>
          </PopoverContent>
        </Popover>
      </div>
    </motion.div>
  );
};

export default Filters;