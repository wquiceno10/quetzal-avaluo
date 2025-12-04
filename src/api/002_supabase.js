import { createClient } from 'npm:@supabase/supabase-js@2';

const supabaseUrl = Deno.env.get('SUPABASE_URL');
const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');

Deno.serve(async (req) => {
  try {
    const { action, email } = await req.json();

    if (!supabaseUrl || !supabaseAnonKey) {
      return Response.json({ error: 'Supabase not configured' }, { status: 500 });
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey);

    if (action === 'getConfig') {
      return Response.json({ 
        supabaseUrl, 
        supabaseAnonKey 
      });
    }

    if (action === 'sendMagicLink') {
      if (!email) {
        return Response.json({ error: 'Email is required' }, { status: 400 });
      }

      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: 'https://quetzal-avaluo.base44.app/AvaluoInmobiliario'
        }
      });

      if (error) {
        return Response.json({ error: error.message }, { status: 400 });
      }

      return Response.json({ success: true });
    }

    return Response.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});