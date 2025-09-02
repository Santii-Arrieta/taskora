
import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { useNotification } from '@/contexts/NotificationContext';
import { useChat } from '@/contexts/ChatContext';
import { useTheme } from '@/contexts/ThemeContext';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { MessageCircle, User, LogOut, Settings, Bell, Briefcase, ShieldCheck, Wallet, Search, LayoutDashboard, UserPlus, LifeBuoy, Copy, Heart, Rss } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';

const Navbar = () => {
  const { user, logout, switchProfile } = useAuth();
  const { notifications, allNotifications, markAllAsRead } = useNotification();
  const { unreadCount } = useChat();
  const { theme } = useTheme();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isNotificationPopoverOpen, setIsNotificationPopoverOpen] = useState(false);
  const [isSearchPopoverOpen, setIsSearchPopoverOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [isInviteDialogOpen, setIsInviteDialogOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/');
    toast({
      title: "Sesión cerrada",
      description: "Has cerrado sesión exitosamente"
    });
  };

  const handleSwitchProfile = newUserType => {
    const isVerifiedProvider = newUserType === 'provider' ? user.verified : true;
    switchProfile(newUserType);
    toast({
      title: "Perfil cambiado",
      description: `Ahora eres un ${getUserTypeLabel(newUserType)}.`
    });
    if (!isVerifiedProvider && newUserType === 'provider') {
      navigate('/verification');
    } else {
      navigate('/dashboard');
    }
  };

  const handleNotificationPopoverOpenChange = (open) => {
    setIsNotificationPopoverOpen(open);
    if (!open && notifications.length > 0) {
      markAllAsRead();
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchTerm.trim()) {
      navigate(`/browse?search=${searchTerm.trim()}`);
      setIsSearchPopoverOpen(false);
    }
  };

  const getUserTypeColor = userType => {
    switch (userType) {
      case 'provider': return 'bg-blue-700';
      case 'client': return 'bg-green-600';
      case 'ngo': return 'bg-red-600';
      case 'admin': return 'bg-purple-600';
      default: return 'bg-gray-500';
    }
  };

  const getUserTypeLabel = userType => {
    const labels = {
      provider: 'Proveedor',
      client: 'Cliente',
      ngo: 'ONG',
      admin: 'Admin'
    };
    return labels[userType] || 'Usuario';
  };

  const navLinks = () => {
    const baseLinks = [
      { to: "/community", label: "Comunidad", icon: <Rss className="w-4 h-4 mr-2" /> }
    ];

    if (!user) {
      return [
        { to: "/browse?type=service", label: "Servicios" },
        ...baseLinks,
        { to: "/support", label: "Ayuda y Soporte" }
      ];
    }

    if (user.userType === 'admin') {
      return [];
    }
    
    if (user.userType !== 'ngo') {
        baseLinks.unshift({ to: "/favorites", label: "Favoritos" });
    }
    baseLinks.unshift({ to: "/dashboard", label: "Dashboard" });

    if (user.userType === 'client') {
      return [ { to: "/browse?type=service", label: "Servicios" }, ...baseLinks ];
    }
    if (user.userType === 'provider') {
      return [ { to: "/browse?type=opportunity", label: "Oportunidades" }, ...baseLinks ];
    }
    if (user.userType === 'ngo') {
      return [
        { to: "/dashboard?tab=publications", label: "Mis Oportunidades", icon: <Heart className="w-4 h-4 mr-2" /> },
        ...baseLinks
      ];
    }
    return [];
  }

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    toast({ title: "Copiado", description: "Enlace de invitación copiado al portapapeles." });
  };

  return (
    <>
      <motion.nav initial={{ y: -100 }} animate={{ y: 0 }} className={`bg-background/80 backdrop-blur-sm border-b border-border sticky top-0 z-50 ${theme}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <Link to={user ? (user.userType === 'admin' ? '/admin' : '/') : '/'} className="flex items-center space-x-3">
              <img src="https://horizons-cdn.hostinger.com/1f74fd1e-187f-4699-b213-a769a144b63a/b86e64ebac812444b0ac97fbfe35b651.png" alt="Taskora Logo" className="h-8 object-contain logo-light-mode" />
              <img src="https://horizons-cdn.hostinger.com/1f74fd1e-187f-4699-b213-a769a144b63a/b86e64ebac812444b0ac97fbfe35b651.png" alt="Taskora Logo Dark" className="h-8 object-contain logo-dark-mode" />
            </Link>
            
            <div className="hidden md:flex items-center space-x-6 text-sm font-medium text-foreground/80">
              {navLinks().map(link => (
                <Link key={link.to} to={link.to} className="hover:text-primary transition-colors flex items-center">
                  {link.icon}
                  {link.label}
                </Link>
              ))}
            </div>

            {user ? (
              <div className="flex items-center space-x-2 md:space-x-4">
                {user.userType !== 'admin' && user.userType !== 'ngo' && (
                  <Popover open={isSearchPopoverOpen} onOpenChange={setIsSearchPopoverOpen}>
                    <PopoverTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <Search className="w-5 h-5" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-80">
                      <form onSubmit={handleSearch}>
                        <div className="grid gap-4">
                          <div className="space-y-2">
                            <h4 className="font-medium leading-none">Buscar</h4>
                            <p className="text-sm text-muted-foreground">Encuentra servicios o profesionales.</p>
                          </div>
                          <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground h-4 w-4" />
                            <Input
                              placeholder="Buscar servicios..."
                              className="pl-9"
                              value={searchTerm}
                              onChange={(e) => setSearchTerm(e.target.value)}
                            />
                          </div>
                          <Button type="submit">Buscar</Button>
                        </div>
                      </form>
                    </PopoverContent>
                  </Popover>
                )}

                {user.userType !== 'admin' && (
                  <>
                  <Popover open={isNotificationPopoverOpen} onOpenChange={handleNotificationPopoverOpenChange}>
                    <PopoverTrigger asChild>
                      <Button variant="ghost" size="icon" className="relative">
                        <Bell className="w-5 h-5" />
                        {notifications.length > 0 && <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-red-500"></span>}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-80">
                      <div className="grid gap-4">
                        <div className="space-y-2">
                          <h4 className="font-medium leading-none">Notificaciones</h4>
                          <p className="text-sm text-muted-foreground">
                            {notifications.length > 0 ? `Tienes ${notifications.length} notificaciones no leídas.` : 'No tienes notificaciones nuevas.'}
                          </p>
                        </div>
                        <div className="grid gap-2">
                          {allNotifications.length > 0 ? (
                            allNotifications.slice(0, 5).map(notif => (
                              <div key={notif.id} className="grid grid-cols-[25px_1fr] items-start pb-4 last:mb-0 last:pb-0">
                                {!notif.read && <span className="flex h-2 w-2 translate-y-1 rounded-full bg-sky-500" />}
                                <div className={`grid gap-1 ${notif.read ? 'col-start-2' : ''}`}>
                                  <p className="text-sm font-medium">{notif.title}</p>
                                  <p className="text-sm text-muted-foreground">{notif.description}</p>
                                </div>
                              </div>
                            ))
                          ) : (
                            <p className="text-sm text-muted-foreground text-center">No hay notificaciones.</p>
                          )}
                        </div>
                      </div>
                    </PopoverContent>
                  </Popover>

                  <Button variant="ghost" size="icon" onClick={() => navigate('/chat')} className="relative">
                    <MessageCircle className="w-5 h-5" />
                    {unreadCount > 0 && <Badge className="absolute -top-2 -right-2 h-5 w-5 p-0 flex items-center justify-center text-xs">{unreadCount}</Badge>}
                  </Button>
                  </>
                )}

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="flex items-center space-x-3 cursor-pointer p-1 rounded-full hover:bg-accent">
                      <Avatar>
                        <AvatarImage src={user.avatar} />
                        <AvatarFallback className={`${getUserTypeColor(user.userType)} text-white`}>
                          {user.name ? user.name.charAt(0).toUpperCase() : <User className="h-4 w-4" />}
                        </AvatarFallback>
                      </Avatar>
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="w-56">
                    <DropdownMenuLabel className="truncate">{user.name || user.email}</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    {user.userType === 'admin' ? (
                      <DropdownMenuItem onSelect={() => navigate('/admin')}><ShieldCheck className="mr-2 h-4 w-4" />Panel Admin</DropdownMenuItem>
                    ) : (
                      <>
                        <DropdownMenuItem onSelect={() => navigate('/dashboard')}><LayoutDashboard className="mr-2 h-4 w-4" />Dashboard</DropdownMenuItem>
                        <DropdownMenuItem onSelect={() => navigate('/profile')}><Settings className="mr-2 h-4 w-4" />Perfil</DropdownMenuItem>
                      </>
                    )}

                    {user.userType !== 'admin' && user.userType !== 'ngo' && (
                        <DropdownMenuItem onSelect={() => navigate('/wallet')}><Wallet className="mr-2 h-4 w-4" />Billetera</DropdownMenuItem>
                    )}
                    
                    {user.userType !== 'admin' && user.userType !== 'ngo' && (
                      <>
                        <DropdownMenuSeparator />
                        <DropdownMenuLabel>Cambiar Perfil</DropdownMenuLabel>
                        {user.userType !== 'client' && <DropdownMenuItem onSelect={() => handleSwitchProfile('client')}><User className="mr-2 h-4 w-4" />Cambiar a Cliente</DropdownMenuItem>}
                        {user.userType !== 'provider' && <DropdownMenuItem onSelect={() => handleSwitchProfile('provider')}><Briefcase className="mr-2 h-4 w-4" />Cambiar a Proveedor</DropdownMenuItem>}
                      </>
                    )}
                    
                    {user.userType !== 'admin' && (
                        <>
                        <DropdownMenuSeparator />
                        {user.userType !== 'ngo' && (
                            <DropdownMenuItem onSelect={() => setIsInviteDialogOpen(true)}><UserPlus className="mr-2 h-4 w-4" />Invita a un amigo</DropdownMenuItem>
                        )}
                        <DropdownMenuItem onSelect={() => navigate('/support')}><LifeBuoy className="mr-2 h-4 w-4" />Ayuda y Soporte</DropdownMenuItem>
                        </>
                    )}
                    
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onSelect={handleLogout} className="text-red-600 focus:text-red-600">
                      <LogOut className="mr-2 h-4 w-4" />
                      <span>Cerrar Sesión</span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            ) : (
              <div className="flex items-center space-x-2">
                <Link to="/login">
                  <Button variant="ghost">Iniciar Sesión</Button>
                </Link>
                <Link to="/register">
                  <Button>Registrarse</Button>
                </Link>
              </div>
            )}
          </div>
        </div>
      </motion.nav>
      
      <Dialog open={isInviteDialogOpen} onOpenChange={setIsInviteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Invita a un Amigo</DialogTitle>
            <DialogDescription>Comparte tu enlace de invitación y ayúdanos a crecer.</DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label htmlFor="invite-link">Tu enlace de invitación</Label>
            <div className="flex items-center space-x-2 mt-2">
              <Input id="invite-link" value={`https://taskora.com/register?ref=${user?.id}`} readOnly />
              <Button size="icon" onClick={() => copyToClipboard(`https://taskora.com/register?ref=${user?.id}`)}>
                <Copy className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsInviteDialogOpen(false)}>Cerrar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default Navbar;