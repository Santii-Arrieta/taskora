export function getUserTypeLabel(userType) {
  const map = {
    provider: 'Proveedor',
    client: 'Cliente',
    ngo: 'ONG',
    admin: 'Admin',
  };
  return map[userType] || 'Usuario';
} 