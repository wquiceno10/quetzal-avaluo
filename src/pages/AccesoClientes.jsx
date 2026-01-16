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
  const [googleLoading, setGoogleLoading] = useState(false);
  const [enviado, setEnviado] = useState(false);
  const [error, setError] = useState(null);
  const [supabase, setSupabase] = useState(null);
  const [checkingSession, setCheckingSession] = useState(true);

  useEffect(() => {
    const initSupabase = async () => {
      // BYPASS DESACTIVADO para poder ver la página de login en desarrollo
      // if (isDevelopmentMode()) {
      //   console.log('🔧 Modo desarrollo detectado - bypass de autenticación activado');
      //   window.location.href = createPageUrl('AvaluoInmobiliario');
      //   return;
      // }

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

  const handleGoogleLogin = async () => {
    if (!supabase) return;
    setGoogleLoading(true);
    setError(null);

    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin + '/AvaluoInmobiliario'
      }
    });

    if (error) {
      setError('Error al iniciar con Google. Intenta con email.');
      setGoogleLoading(false);
    }
  };

  const handleEnviarEnlace = async (e) => {
    e.preventDefault();
    if (!supabase || !email) return;

    setLoading(true);
    setError(null);

    const { error } = await supabase.auth.signInWithOtp({
      email: email,
      options: {
        emailRedirectTo: window.location.origin + '/AvaluoInmobiliario'
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

  // Detectar modo desarrollo
  const isDevMode = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 bg-[#F5F4F0]">

      {/* Dev Navigation - Solo visible en localhost */}
      {isDevMode && (
        <div className="fixed bottom-0 left-0 right-0 bg-yellow-100 border-t border-yellow-300 py-2 z-50">
          <div className="max-w-5xl mx-auto px-4 flex items-center justify-center gap-2 flex-wrap">
            <span className="text-yellow-800 text-sm font-medium mr-2">🛠️ Dev:</span>
            <a
              href="/AvaluoInmobiliario"
              className="px-3 py-1 text-sm rounded bg-white text-yellow-800 hover:bg-yellow-200"
            >
              Avalúo (Paso 1)
            </a>
            <a
              href="/mis-avaluos"
              className="px-3 py-1 text-sm rounded bg-white text-yellow-800 hover:bg-yellow-200"
            >
              Mis Avalúos
            </a>
            <span className="px-3 py-1 text-sm rounded bg-purple-500 text-white">
              Login (aquí)
            </span>
          </div>
        </div>
      )}

      <div className="w-full max-w-md">

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
              Inicia sesión para acceder a la herramienta
            </p>

            {/* Google OAuth Button */}
            <Button
              onClick={handleGoogleLogin}
              disabled={googleLoading || !supabase}
              className="w-full bg-white hover:bg-gray-50 text-gray-700 border border-gray-300 rounded-full py-6 text-base font-medium shadow-sm mb-6"
            >
              {googleLoading ? (
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
              ) : (
                <svg className="w-5 h-5 mr-3" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                </svg>
              )}
              Continuar con Google
            </Button>

            {/* Separator */}
            <div className="relative mb-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-4 bg-[#F5F4F0] text-gray-500">o con tu correo</span>
              </div>
            </div>

            {/* Email Form */}
            <form onSubmit={handleEnviarEnlace} className="space-y-4">
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="ejemplo@correo.com"
                required
                className="border-[#B0BDB4] focus:border-[#2C3D37] py-6"
              />

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
                className="w-full bg-[#2C3D37] hover:bg-[#1a2620] text-white rounded-full py-6 text-base font-medium"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    Enviando...
                  </>
                ) : (
                  <>
                    <Mail className="w-5 h-5 mr-2" />
                    Enviar enlace de acceso
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