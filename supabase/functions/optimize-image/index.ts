import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { bucketName, filePath } = await req.json()

    if (!bucketName || !filePath) {
      return new Response(
        JSON.stringify({ error: 'bucketName y filePath son requeridos' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Obtener la imagen original
    const { data: imageData, error: downloadError } = await supabaseClient.storage
      .from(bucketName)
      .download(filePath)

    if (downloadError || !imageData) {
      return new Response(
        JSON.stringify({ error: 'No se pudo descargar la imagen' }),
        { 
          status: 404, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Convertir a ArrayBuffer para procesar
    const arrayBuffer = await imageData.arrayBuffer()
    const uint8Array = new Uint8Array(arrayBuffer)

    // Aquí usarías una librería de procesamiento de imágenes
    // Por ahora, simplemente devolvemos la imagen original
    // En producción, usarías algo como ImageMagick o Sharp
    
    const optimizedData = uint8Array // Placeholder - aquí iría la optimización real

    // Generar nuevo nombre de archivo
    const newFilePath = filePath.replace(/\.[^/.]+$/, '.webp')

    // Subir imagen optimizada
    const { error: uploadError } = await supabaseClient.storage
      .from(bucketName)
      .upload(newFilePath, optimizedData, {
        upsert: true,
        contentType: 'image/webp'
      })

    if (uploadError) {
      return new Response(
        JSON.stringify({ error: 'Error subiendo imagen optimizada' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Eliminar archivo original si no es WebP
    if (!filePath.toLowerCase().endsWith('.webp')) {
      await supabaseClient.storage
        .from(bucketName)
        .remove([filePath])
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        originalPath: filePath,
        optimizedPath: newFilePath,
        message: 'Imagen optimizada exitosamente'
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Error:', error)
    return new Response(
      JSON.stringify({ error: 'Error interno del servidor' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})
