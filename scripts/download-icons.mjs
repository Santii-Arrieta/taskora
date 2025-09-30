// Script simple para descargar iconos de Leaflet
import https from 'https';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const publicDir = path.join(__dirname, '..', 'public');

console.log('🚀 Descargando iconos de Leaflet...');

// Función para descargar un archivo
function downloadFile(url, filename) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(path.join(publicDir, filename));
    
    https.get(url, (response) => {
      response.pipe(file);
      
      file.on('finish', () => {
        file.close();
        console.log(`✅ Descargado: ${filename}`);
        resolve();
      });
      
      file.on('error', (err) => {
        fs.unlink(path.join(publicDir, filename), () => {});
        reject(err);
      });
    }).on('error', (err) => {
      reject(err);
    });
  });
}

// Descargar iconos
async function main() {
  try {
    await downloadFile(
      'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
      'marker-icon.png'
    );
    
    await downloadFile(
      'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
      'marker-shadow.png'
    );
    
    console.log('✅ Todos los iconos descargados exitosamente');
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

main();
