/**
 * avaluos-api-upload
 * Cloudflare Worker para upload de archivos a Supabase Storage
 */

export default {
    async fetch(request, env) {
        // CORS headers
        const corsHeaders = {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type',
        };

        // Handle OPTIONS preflight
        if (request.method === 'OPTIONS') {
            return new Response(null, { headers: corsHeaders });
        }

        if (request.method !== 'POST') {
            return new Response(
                JSON.stringify({ error: 'Method not allowed' }),
                { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        try {
            const supabaseUrl = env.SUPABASE_URL;
            const supabaseAnonKey = env.SUPABASE_ANON_KEY;

            if (!supabaseUrl || !supabaseAnonKey) {
                return new Response(
                    JSON.stringify({ error: 'Supabase not configured' }),
                    { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
                );
            }

            // Parse multipart form data
            const formData = await request.formData();
            const file = formData.get('file');

            if (!file) {
                return new Response(
                    JSON.stringify({ error: 'No file uploaded' }),
                    { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
                );
            }

            // Generate unique filename
            const timestamp = Date.now();
            const uniqueFileName = `${timestamp}-${file.name}`;

            // Upload to Supabase Storage
            const fileBuffer = await file.arrayBuffer();
            const uploadResponse = await fetch(
                `${supabaseUrl}/storage/v1/object/avaluo-documents/${uniqueFileName}`,
                {
                    method: 'POST',
                    headers: {
                        'apikey': supabaseAnonKey,
                        'Authorization': `Bearer ${supabaseAnonKey}`,
                        'Content-Type': file.type || 'application/octet-stream',
                        'x-upsert': 'false'
                    },
                    body: fileBuffer
                }
            );

            if (!uploadResponse.ok) {
                const errorText = await uploadResponse.text();
                console.error('Upload error details:', errorText);
                return new Response(
                    JSON.stringify({
                        error: 'Failed to upload file',
                        details: errorText,
                        hint: 'Check if bucket "avaluo-documents" exists and is public'
                    }),
                    { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
                );
            }

            // Get public URL
            const file_url = `${supabaseUrl}/storage/v1/object/public/avaluo-documents/${uniqueFileName}`;

            return new Response(
                JSON.stringify({
                    file_url,
                    fileName: uniqueFileName,
                    originalName: file.name
                }),
                { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );

        } catch (error) {
            console.error('Function error:', error);
            return new Response(
                JSON.stringify({
                    error: 'Internal server error',
                    details: error.message
                }),
                { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }
    }
};
