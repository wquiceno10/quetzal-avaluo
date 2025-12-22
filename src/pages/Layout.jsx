

import React, { useState, useEffect } from 'react';
import { Mail, Phone, MapPin, Loader2 } from 'lucide-react';
import { createClient } from '@supabase/supabase-js';
// import { api } from '@/api/client'; // Removed legacy import
import { createPageUrl } from '@/utils';


export default function Layout({ children, currentPageName }) {
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    console.log('Layout useEffect - página:', currentPageName);

    // Permitir AccesoClientes siempre
    if (currentPageName === 'AccesoClientes') {
      console.log('Permitido AccesoClientes, saltando auth');
      setCheckingAuth(false);
      return;
    }

    // Detectar modo desarrollo ANTES de verificar auth
    const href = window.location.href;
    const hostname = window.location.hostname;
    const isDevMode =
      href.includes('/editor/preview/') ||
      href.includes('/sandbox/preview-url') ||
      href.includes('server_url=') ||
      hostname === 'localhost' ||
      hostname === '127.0.0.1';

    console.log('isDevMode:', isDevMode, 'href:', href, 'hostname:', hostname);

    // Solo requerir autenticación para avaluos.quetzalhabitats.com
    // Otros subdominios (casamosquera, agendar, etc.) tienen acceso público
    const requiresAuth = hostname === 'avaluos.quetzalhabitats.com';

    if (!requiresAuth) {
      console.log('Subdominio público detectado, saltando auth:', hostname);
      setIsAuthenticated(true);
      setCheckingAuth(false);
      return;
    }

    // En modo desarrollo, permitir acceso sin autenticación
    if (isDevMode) {
      console.log('Modo dev detectado, saltando auth');
      setIsAuthenticated(true); // ✅ Forzar autenticación en dev para mostrar "Mis Avalúos"
      setCheckingAuth(false);
      return;
    }

    console.log('Iniciando verificación Supabase...');
    // Solo en producción verificar Supabase auth
    const checkSupabaseAuth = async () => {
      try {
        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
        const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

        if (supabaseUrl && supabaseAnonKey) {
          const supabase = createClient(supabaseUrl, supabaseAnonKey);
          const { data: { session } } = await supabase.auth.getSession();

          if (session) {
            setIsAuthenticated(true);
          } else {
            window.location.href = createPageUrl('AccesoClientes');
            return;
          }
        } else {
          console.warn('Supabase credentials not found in environment variables');
        }
      } catch (error) {
        console.error('Error checking auth:', error);
      }
      setCheckingAuth(false);
    };

    checkSupabaseAuth();
  }, [currentPageName]);

  if (checkingAuth && currentPageName !== 'AccesoClientes') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F5F4F0]">
        <Loader2 className="w-8 h-8 animate-spin text-[#2C3D37]" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#F5F4F0]">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700&family=Raleway:wght@300;400;500;600;700&display=swap');
        
        :root {
          --quetzal-dark: #2C3D37;
          --quetzal-beige: #DAD7D0;
          --quetzal-blue: #D8DCE5;
          --quetzal-gold: #C9C19D;
          --quetzal-sage: #B0BDB4;
          --quetzal-mint: #DEE8E9;
        }
        
        body {
          font-family: 'Raleway', sans-serif;
        }
        
        h1, h2, h3, h4, h5, h6 {
          font-family: 'Outfit', sans-serif;
        }
      `}</style>

      <header className="bg-[#2C3D37] text-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <img
                src="https://assets.zyrosite.com/YNqM51Nez6URyK5d/quetzal_4-Yan0WNJQLLHKrEom.png"
                alt="Quetzal Hábitats"
                className="w-[200px]"
              />
              <div className="border-l border-[#B0BDB4] pl-4 hidden sm:block">
                <h1 className="text-lg sm:text-xl font-semibold tracking-wide">
                  Avalúo Comercial Inmobiliario
                </h1>
                <p className="text-sm text-[#DEE8E9] mt-1">
                  Conoce el valor real de tu propiedad
                </p>
              </div>
            </div>

            {/* Navigation Menu */}
            <div className="flex items-center space-x-6">

            </div>
          </div>
        </div>
      </header>

      <main className={currentPageName === 'AccesoClientes' ? 'py-[75px]' : 'flex-grow'}>
        {children}
      </main>

      <footer className={`bg-[#2C3D37] text-white ${currentPageName === 'AccesoClientes' ? 'mt-0' : 'mt-20'}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div>
              <img
                src="https://assets.zyrosite.com/YNqM51Nez6URyK5d/quetzal_4-Yan0WNJQLLHKrEom.png"
                alt="Quetzal Hábitats"
                className="w-[200px] mb-4"
              />
              <p className="text-[#DEE8E9] text-sm leading-relaxed">
                Casas en zonas campestres, conjuntos cerrados, condominios y zonas residenciales de alta seguridad y confort.
              </p>
            </div>

            <div>
              <h3 className="font-semibold text-lg mb-4 text-[#C9C19D]">Contacto</h3>
              <div className="space-y-3 text-sm">
                <div className="flex items-center space-x-3">
                  <Phone className="w-4 h-4 text-[#B0BDB4]" />
                  <span>+57 318 638 3809</span>
                </div>
                <div className="flex items-center space-x-3">
                  <Mail className="w-4 h-4 text-[#B0BDB4]" />
                  <span>contacto@quetzalhabitats.com</span>
                </div>
                <div className="flex items-center space-x-3">
                  <MapPin className="w-4 h-4 text-[#B0BDB4]" />
                  <span>Mosquera, Cundinamarca</span>
                </div>
              </div>
            </div>

            <div>
              <h3 className="font-semibold text-lg mb-4 text-[#C9C19D]">Servicios</h3>
              <ul className="space-y-2 text-sm text-[#DEE8E9]">
                <li>• Compra y venta de propiedades</li>
                <li>• Asesoría inmobiliaria</li>
                <li>• Remodelaciones</li>
                <li>• Avalúos comerciales</li>
              </ul>
            </div>
          </div>

          <div className="border-t border-[#B0BDB4] mt-8 pt-8 text-center text-sm text-[#DEE8E9]">
            <p>&copy; 2025 Quetzal Hábitats - Todos los derechos reservados</p>
          </div>
        </div>
      </footer>
    </div >
  );
}
