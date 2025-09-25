## Supabase deployment (Storage + DB)

1) Abre el editor SQL de tu proyecto Supabase y pega el contenido de `tools/supabase-setup.sql`. Ejecuta todo.

   - Crea el bucket `portfolio` (público lectura) y políticas de inserción/actualización/borrado para usuarios autenticados.
   - Agrega las columnas `priceType` a `public.briefs` y `public.contracts` con default `'total'`.

2) Verifica Storage
   - Storage → Buckets → `portfolio` debe existir.
   - No hace falta carpeta previa; subimos a rutas como `avatars/<userId>-<ts>.png`.

3) Variables de entorno (si corresponde)
   - VITE_SUPABASE_URL
   - VITE_SUPABASE_ANON_KEY

4) Deploy frontend
   - Construye con `npm run build` y publica en tu hosting.

Listo: el cambio de avatar y el nuevo `priceType` quedan operativos y seguros.


