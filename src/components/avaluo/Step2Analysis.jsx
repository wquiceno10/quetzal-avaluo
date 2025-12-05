import React, { useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Search, AlertCircle } from 'lucide-react';
// import { api } from '@/api/client'; // Removed legacy import
import { useMutation } from '@tanstack/react-query';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';

export default function Step2Analysis({ formData, onUpdate, onNext, onBack }) {

  const searchMutation = useMutation({
    mutationFn: async (data) => {
      // 1. Llamada al Backend (Cloudflare Worker)
      const response = await fetch(import.meta.env.VITE_WORKER_ANALYSIS_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ formData: data })
      });

      // Check if response is OK before parsing JSON
      if (!response.ok) {
        const text = await response.text();
        let errorMsg = `Error del servidor: ${response.status} ${response.statusText}`;
        try {
          const json = JSON.parse(text);
          if (json.error) errorMsg = json.error;
        } catch (e) {
          // If not JSON, use the text body if short, or generic message
          if (text.length < 200) errorMsg += ` - ${text}`;
        }
        throw new Error(errorMsg);
      }

      let responseData;
      try {
        responseData = await response.json();
      } catch (e) {
        throw new Error('La respuesta del servidor no es un JSON válido. Es posible que el análisis haya fallado o excedido el tiempo de espera.');
      }

      if (responseData.error) {
        throw new Error(responseData.error || (responseData.details ? `: ${responseData.details}` : 'Error desconocido del servidor'));
      }

      // Validar que la respuesta tenga la estructura esperada
      if (!responseData || !responseData.comparables) {
        throw new Error('La respuesta del servidor no contiene datos válidos.');
      }

      return responseData;
    },
    onSuccess: (data) => {
      // 2. Guardar datos y AVANZAR AUTOMÁTICAMENTE
      onUpdate({ comparables_data: data });
      onNext();
    }
  });

  // Ejecutar búsqueda al montar
  useEffect(() => {
    if (!searchMutation.isPending && !searchMutation.isSuccess) {
      searchMutation.mutate(formData);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

          {/* ESTADO: CARGANDO */}
          {searchMutation.isPending && (
            <div className="text-center py-12">
              <Loader2 className="w-16 h-16 mx-auto mb-4 text-[#2C3D37] animate-spin" />
              <p className="text-lg text-[#2C3D37] font-medium mb-2">
                Buscando propiedades comparables...
              </p>
              <p className="text-sm text-[#2C3D37]">
                Recopilando información y ejecutando el modelo de valoración para obtener el precio estimado.
                <br />
                <strong>El cálculo tarda 2 minutos aproximadamente.</strong>
              </p>
            </div>
          )}

          {/* ESTADO: ÉXITO (Transición rápida, mostramos mensaje breve) */}
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