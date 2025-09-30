// Script para descargar iconos de Leaflet localmente
// Esto reduce las requests externas y mejora el rendimiento

import https from 'https';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const publicDir = path.join(__dirname, 'public');

// URLs de los iconos de Leaflet
const icons = [
  {
    url: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
    filename: 'marker-icon.png'
  },
  {
    url: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
    filename: 'marker-shadow.png'
  },
  {
    url: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
    filename: 'marker-icon-2x.png'
  }
];

function downloadIcon(icon) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(path.join(publicDir, icon.filename));
    
    https.get(icon.url, (response) => {
      response.pipe(file);
      
      file.on('finish', () => {
        file.close();
        console.log(`✅ Descargado: ${icon.filename}`);
        resolve();
      });
      
      file.on('error', (err) => {
        fs.unlink(path.join(publicDir, icon.filename), () => {});
        reject(err);
      });
    }).on('error', (err) => {
      reject(err);
    });
  });
}

async function downloadAllIcons() {
  console.log('🚀 Descargando iconos de Leaflet...');
  
  try {
    for (const icon of icons) {
      await downloadIcon(icon);
    }
    
    console.log('✅ Todos los iconos descargados exitosamente');
    console.log('📍 Los iconos están disponibles en /public/');
    
  } catch (error) {
    console.error('❌ Error descargando iconos:', error);
  }
}

// Ejecutar si se llama directamente
if (import.meta.url === `file://${process.argv[1]}`) {
  downloadAllIcons();
}

export { downloadAllIcons };
