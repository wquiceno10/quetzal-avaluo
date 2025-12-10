import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Mail, CheckCircle } from 'lucide-react';
import { createPageUrl } from '@/utils';
import { isDevelopmentMode } from '@/utils/devAuth';

export default function AccesoClientes() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [enviado, setEnviado] = useState(false);
  const [error, setError] = useState(null);
  const [supabase, setSupabase] = useState(null);
  const [checkingSession, setCheckingSession] = useState(true);

  useEffect(() => {
    const initSupabase = async () => {
      // En modo desarrollo, redirigir directo a la app
      if (isDevelopmentMode()) {
        console.log('🔧 Modo desarrollo detectado - bypass de autenticación activado');
        window.location.href = createPageUrl('AvaluoInmobiliario');
        return;
      }

      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

      if (supabaseUrl && supabaseAnonKey) {
        const client = createClient(supabaseUrl, supabaseAnonKey);
        setSupabase(client);

        // Verificar si ya hay sesión activa
        const { data: { session } } = await client.auth.getSession();
        if (session) {
          window.location.href = createPageUrl('AvaluoInmobiliario');
          return;
        }

        // Escuchar cambios de autenticación
        const { data: { subscription } } = client.auth.onAuthStateChange((event, session) => {
          if (event === 'SIGNED_IN' && session) {
            localStorage.setItem('supabase_session', JSON.stringify(session));
            window.location.href = createPageUrl('AvaluoInmobiliario');
          }
        });

        setCheckingSession(false);
        return () => subscription.unsubscribe();
      } else {
        console.error('Faltan variables de entorno de Supabase (VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY)');
        setCheckingSession(false);
      }
    };
    initSupabase();
  }, []);

  const handleEnviarEnlace = async (e) => {
    e.preventDefault();
    if (!supabase || !email) return;

    setLoading(true);
    setError(null);

    const { error } = await supabase.auth.signInWithOtp({
      email: email,
      options: {
        emailRedirectTo: 'https://avaluos.quetzalhabitats.com/AvaluoInmobiliario'
      }
    });

    setLoading(false);

    if (error) {
      setError('Hubo un error al enviar el correo.');
    } else {
      setEnviado(true);
    }
  };

  if (checkingSession) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F5F4F0]">
        <Loader2 className="w-8 h-8 animate-spin text-[#2C3D37]" />
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center px-4 bg-[#F5F4F0]">
      <div className="w-full max-w-md p-25px">

        <div className="text-center mb-8">
          <img
            src="https://assets.zyrosite.com/YNqM51Nez6URyK5d/logo_solo_dorado-HZA3j5xtzbpEap4C.png"
            alt="Quetzal Hábitats"
            className="w-[100px] mx-auto mb-6"
          />
        </div>

        {enviado ? (
          <div className="text-center space-y-6">
            <div className="flex justify-center">
              <div className="bg-green-100 rounded-full p-5">
                <CheckCircle className="w-14 h-14 text-green-600" />
              </div>
            </div>
            <h1 className="text-2xl font-bold text-[#2C3D37]">
              ¡Enlace enviado!
            </h1>
            <p className="text-gray-600 text-lg">
              Revisa tu bandeja de entrada.
            </p>
          </div>
        ) : (
          <>
            <h1 className="text-3xl font-bold text-[#2C3D37] text-center mb-3">
              Bienvenido a Quetzal
            </h1>
            <p className="text-gray-600 text-center mb-8">
              Ingresa tu correo para acceder a la herramienta
            </p>

            <form onSubmit={handleEnviarEnlace} className="space-y-6">
              <div className="space-y-2">
                <label className="text-[#2C3D37] font-medium text-sm">
                  Correo Electrónico
                </label>
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="ejemplo@correo.com"
                  required
                  className="border-[#B0BDB4] focus:border-[#2C3D37] py-6"
                />
              </div>

              {error && (
                <Alert className="border-red-300 bg-red-50">
                  <AlertDescription className="text-red-800">
                    {error}
                  </AlertDescription>
                </Alert>
              )}

              <Button
                type="submit"
                disabled={loading || !email || !supabase}
                className="w-full bg-[#2C3D37] hover:bg-[#1a2620] text-white rounded-full py-6 text-lg font-medium"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    Enviando...
                  </>
                ) : (
                  <>
                    <Mail className="w-5 h-5 mr-2" />
                    Enviar Enlace Mágico
                  </>
                )}
              </Button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}