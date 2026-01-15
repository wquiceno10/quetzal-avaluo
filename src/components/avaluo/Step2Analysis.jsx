import React, { useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Search, AlertCircle } from 'lucide-react';
import { useMutation } from '@tanstack/react-query';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import loaderGif from '@/assets/loader.gif';

export default function Step2Analysis({ formData, onUpdate, onNext, onBack }) {

  // Detectar si es móvil para mostrar advertencia
  const [isMobile, setIsMobile] = React.useState(false);

  // Ref para controlar cancelación del análisis
  const cancelledRef = useRef(false);
  const abortControllerRef = useRef(null);

  useEffect(() => {
    const checkMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    setIsMobile(checkMobile);
  }, []);

  // Función para cancelar el análisis y volver atrás
  const handleCancelAndGoBack = () => {
    console.log('🛑 Usuario canceló el análisis');
    cancelledRef.current = true;

    // Cancelar cualquier petición HTTP en curso
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      console.log('🛑 Peticiones HTTP abortadas');
    }

    searchMutation.reset(); // Resetear el estado de la mutación
    onBack();
  };

  const searchMutation = useMutation({
    mutationFn: async (data) => {
      // Resetear flag de cancelación al iniciar
      cancelledRef.current = false;

      // Crear nuevo AbortController para esta petición
      abortControllerRef.current = new AbortController();
      const signal = abortControllerRef.current.signal;

      const workerUrl = import.meta.env.VITE_WORKER_ANALYSIS_URL;

      // 1. INICIAR EL JOB (POST)
      const startResponse = await fetch(workerUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ formData: data }),
        signal // Permite cancelar esta petición
      });

      if (!startResponse.ok) {
        const text = await startResponse.text();
        throw new Error(`Error iniciando análisis: ${text}`);
      }

      const startData = await startResponse.json();
      if (startData.error) throw new Error(startData.error);

      const { jobId } = startData;
      if (!jobId) throw new Error('No se recibió ID de trabajo del servidor.');

      // 2. POLLING DE ESTADO (GET)
      const MAX_RETRIES = 300; // 300 intentos * 3s = 900s (15 minutos)
      let attempts = 0;

      while (attempts < MAX_RETRIES) {
        // Verificar si el usuario canceló
        if (cancelledRef.current) {
          console.log('🛑 Polling cancelado por el usuario');
          throw new Error('Análisis cancelado por el usuario');
        }

        await new Promise(resolve => setTimeout(resolve, 3000)); // Esperar 3 segundos
        attempts++;

        // Verificar nuevamente después de esperar
        if (cancelledRef.current) {
          console.log('🛑 Polling cancelado por el usuario');
          throw new Error('Análisis cancelado por el usuario');
        }

        try {
          console.log(`🔍 Polling intento ${attempts} para Job: ${jobId}`);
          const statusRes = await fetch(`${workerUrl}?jobId=${jobId}`, { signal });

          if (!statusRes.ok) {
            console.warn(`[POLL] Respuesta no OK del servidor (${statusRes.status}). Reintentando...`);
            continue;
          }

          const statusData = await statusRes.json();
          console.log(`📊 Job Status:`, statusData.status);

          if (statusData.status === 'completed') {
            console.log('✅ Análisis completado con éxito');
            if (!statusData.result || !statusData.result.comparables) {
              throw new Error('El análisis finalizó pero no trajo datos válidos.');
            }
            return statusData.result;
          }

          if (statusData.status === 'failed') {
            console.error('❌ El análisis falló en el servidor:', statusData.error);
            throw new Error(statusData.error || 'El análisis falló en el servidor.');
          }

          // Si sigue 'processing', continuamos el loop
        } catch (pollErr) {
          // Ignorar error de cancelación para que no se muestre como error
          if (pollErr.name === 'AbortError' || pollErr.message === 'Análisis cancelado por el usuario') {
            throw pollErr;
          }
          console.warn("⚠️ Error temporal en polling:", pollErr);
          // Ignorar errores de red transitorios y seguir intentando
        }
      }

      throw new Error('Tiempo de espera agotado. El análisis tardó demasiado.');
    },
    onSuccess: (data) => {
      onUpdate({ comparables_data: data });
      onNext({ comparables_data: data });
    },
    onError: (error) => {
      // Si el error es por cancelación, no mostrarlo como error
      if (error.message === 'Análisis cancelado por el usuario') {
        console.log('✅ Cancelación manejada correctamente');
      }
    }
  });

  // Ejecutar búsqueda al montar
  useEffect(() => {
    if (!searchMutation.isPending && !searchMutation.isSuccess) {
      searchMutation.mutate(formData);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Wake Lock SOLO en móviles - con manejo de cambio de pestaña
  useEffect(() => {
    if (!isMobile) return;

    let wakeLock = null;

    const requestWakeLock = async () => {
      if ('wakeLock' in navigator) {
        try {
          wakeLock = await navigator.wakeLock.request('screen');
          console.log('🔒 Wake Lock activado');
        } catch (err) {
          console.warn('Wake Lock error:', err);
        }
      }
    };

    // Manejar cuando el usuario vuelve a la pestaña
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && searchMutation.isPending) {
        console.log('📱 Pestaña visible de nuevo, re-solicitando Wake Lock...');
        requestWakeLock();
      }
    };

    if (searchMutation.isPending) {
      requestWakeLock();
      document.addEventListener('visibilitychange', handleVisibilityChange);
    }

    return () => {
      if (wakeLock) {
        wakeLock.release();
        console.log('🔓 Wake Lock liberado');
      }
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [searchMutation.isPending, isMobile]);

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <Card className="border-[#B0BDB4]">
        <CardHeader>
          <CardTitle className="text-2xl text-[#2C3D37] flex items-center gap-2">
            <Search className="w-6 h-6 text-[#C9C19D]" />
            Análisis de Mercado
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">

          {/* ESTADO: CARGANDO (Incluye idle para asegurar que se vea algo al iniciar) */}
          {(searchMutation.isPending || searchMutation.status === 'idle') && (
            <div className="text-center py-12">
              <img src={loaderGif} alt="Cargando..." className="w-[75px] h-auto mx-auto mb-1" />
              <p className="text-lg text-[#2C3D37] font-medium mb-2">
                Buscando propiedades comparables...
              </p>

              <p className="text-sm text-[#2C3D37]">
                Recopilando información y ejecutando el modelo de valoración para obtener el precio estimado.
                <br />
                <strong>El cálculo toma aproximadamente 3 a 5 minutos.</strong>
              </p>

              <Button
                onClick={handleCancelAndGoBack}
                variant="outline"
                className="mt-6 border-[#2C3D37] text-[#2C3D37] bg-transparent hover:bg-[#2C3D37]/5 rounded-full px-6"
              >
                ← Editar datos
              </Button>
            </div>
          )}

          {/* ESTADO: ÉXITO */}
          {searchMutation.isSuccess && (
            <div className="text-center py-12 animate-in zoom-in duration-300">
              <div className="w-16 h-16 mx-auto mb-4 bg-green-100 rounded-full flex items-center justify-center">
                <Search className="w-8 h-8 text-green-600" />
              </div>
              <p className="text-lg text-[#2C3D37] font-medium">¡Análisis completado!</p>
              <p className="text-sm text-gray-500">Generando reporte final...</p>
            </div>
          )}

          {/* ESTADO: ERROR */}
          {searchMutation.isError && (
            <div className="space-y-4">
              <Alert className="border-red-300 bg-red-50">
                <AlertCircle className="w-4 h-4 text-red-600" />
                <AlertDescription className="text-red-800">
                  <p className="font-medium">Ocurrió un error al buscar comparables.</p>
                  <p className="text-sm mt-1">{searchMutation.error?.message || 'Error desconocido'}</p>
                </AlertDescription>
              </Alert>
              <div className="flex gap-4">
                <Button
                  onClick={onBack}
                  variant="outline"
                  className="flex-1 border-[#B0BDB4] text-[#2C3D37] rounded-full"
                >
                  Volver
                </Button>
                <Button
                  onClick={() => searchMutation.mutate(formData)}
                  className="flex-1 bg-[#2C3D37] hover:bg-[#1a2620] text-white rounded-full"
                >
                  Reintentar Búsqueda
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}