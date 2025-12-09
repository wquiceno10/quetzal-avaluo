import React, { useState, useEffect, useRef } from 'react';
import StepIndicator from '../components/avaluo/StepIndicator';
import Step1Form from '../components/avaluo/Step1Form';
import Step2Analysis from '../components/avaluo/Step2Analysis';
import Step3Results from '../components/avaluo/Step3Results';
import Step4Contact from '../components/avaluo/Step4Contact';
import { createClient } from '@supabase/supabase-js';
import { guardarAvaluoEnSupabase } from '@/lib/avaluos';

const initialState = {
  tipo_inmueble: '',
  barrio: '',
  contexto_zona: '',
  nombre_conjunto: '',
  municipio: '',
  departamento: '',
  area_construida: null,
  habitaciones: null,
  banos: null,
  tipo_parqueadero: '',
  estado_inmueble: '',
  tipo_remodelacion: '',
  informacion_complementaria: '',
  documentos_urls: [],
  comparables_data: null,
  status: 'iniciado'
};

export default function AvaluoInmobiliario() {
  const [currentStep, setCurrentStep] = useState(1);
  const contentRef = useRef(null);
  const [avaluoData, setAvaluoData] = useState(initialState);
  const [hasAvaluos, setHasAvaluos] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);

  const isDevMode = import.meta.env.MODE === 'development';

  // Check if user has avalúos
  useEffect(() => {
    const checkAvaluos = async () => {
      try {
        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
        const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

        if (supabaseUrl && supabaseAnonKey) {
          const supabase = createClient(supabaseUrl, supabaseAnonKey);
          const { data: { user } } = await supabase.auth.getUser();

          if (user) {
            setCurrentUser(user);
            const { count } = await supabase
              .from('avaluos')
              .select('*', { count: 'exact', head: true })
              .eq('email', user.email);

            setHasAvaluos(count > 0);
          }
        }
      } catch (error) {
        console.error('Error checking avalúos:', error);
      }
    };

    checkAvaluos();
  }, []);

  const handleUpdateData = (newData) => {
    setAvaluoData(prev => ({ ...prev, ...newData }));
  };

  const handleNext = async (incomingData) => {
    const nextStep = Math.min(currentStep + 1, 4);

    // Determine effective data (handle race condition from Step 2)
    // If incomingData is an Event (click), ignore it. If it's an object with data, use it.
    const isEvent = incomingData && incomingData.preventDefault;
    const dataOverride = (incomingData && !isEvent) ? incomingData : {};

    const effectiveAvaluoData = { ...avaluoData, ...dataOverride };

    // AUTO-SAVE LOGIC: If moving to Step 3 (Results) and user is logged in
    if (currentStep === 2 && nextStep === 3 && currentUser) {
      try {
        const data = effectiveAvaluoData.comparables_data || {};

        // Generate Code if missing
        const cod = effectiveAvaluoData.codigo_avaluo || `QZ-${new Date().getFullYear()}${String(new Date().getMonth() + 1).padStart(2, '0')}-${Math.floor(Math.random() * 10000)}`;

        // Calculate Value (Simple logic mirror)
        let valFinal = data.valor_final;
        if (!valFinal) {
          const v1 = data.valor_estimado_venta_directa;
          const v2 = data.valor_estimado_rentabilidad;
          const min = data.rango_valor_min;
          const max = data.rango_valor_max;

          if (min && max) valFinal = (min + max) / 2;
          else if (v1 && v2) valFinal = (v1 * 0.8 + v2 * 0.2);
          else valFinal = v1 || v2 || 0;
        }

        const payload = {
          ...data,
          codigo_avaluo: cod,
          valor_final: valFinal,
          tipo_inmueble: effectiveAvaluoData.tipo_inmueble,
          barrio: effectiveAvaluoData.barrio,
          municipio: effectiveAvaluoData.municipio,
          area_construida: effectiveAvaluoData.area_construida,
          habitaciones: effectiveAvaluoData.habitaciones,
          banos: effectiveAvaluoData.banos,
        };

        const savedId = await guardarAvaluoEnSupabase({
          email: currentUser.email,
          tipoInmueble: effectiveAvaluoData.tipo_inmueble,
          barrio: effectiveAvaluoData.barrio,
          ciudad: effectiveAvaluoData.municipio,
          valorFinal: valFinal,
          codigoAvaluo: cod,
          payloadJson: payload,
        });

        // Update local state with saved ID and Code AND the payload (to ensure Step 3 renders with data)
        handleUpdateData({
          id: savedId,
          codigo_avaluo: cod,
          comparables_data: payload
        });
        console.log("Auto-saved avaluo:", savedId);
        setHasAvaluos(true);

      } catch (err) {
        console.error("Auto-save failed", err);
      }
    }

    setCurrentStep(nextStep);

    // If moving to step 3 (Resultados) or 4, mark that we have content for "Mis Avaluos"
    if (nextStep >= 3) {
      setHasAvaluos(true);
    }
  };

  const handleBack = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1));
  };

  const handleReset = () => {
    setAvaluoData(initialState);
    setCurrentStep(1);
  };

  useEffect(() => {
    if (currentStep > 1 && contentRef.current) {
      contentRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } else if (currentStep === 1) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [currentStep]);

  return (
    <div className="min-h-screen bg-[#F5F4F0]">
      {/* Hero Section */}
      <div className="relative bg-gradient-to-br from-[#2C3D37] to-[#1a2620] text-white py-16">


        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            Avalúo Comercial Inmobiliario
          </h1>
          <p className="text-xl text-[#DEE8E9] max-w-3xl mx-auto">
            Descubre el valor real de tu propiedad con nuestro sistema de análisis de mercado impulsado por IA
          </p>
        </div>
      </div>

      {/* Step Indicator - siempre visible */}
      <div className="bg-white shadow-sm">
        <StepIndicator currentStep={currentStep} />
      </div>

      {/* Botón Mis Avalúos - Debajo del StepIndicator (solo si tiene avalúos) */}
      {hasAvaluos && (
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex justify-end">
          <a
            href="/mis-avaluos"
            className="inline-flex items-center gap-2 px-5 py-2 bg-[#2C3D37] hover:bg-[#1a2620] text-white rounded-full text-sm font-medium transition-all shadow-md hover:shadow-lg"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Mis Avalúos
          </a>
        </div>
      )}





      {/* Dev Navigation - Solo visible en modo desarrollo */}
      {isDevMode && (
        <div className="bg-yellow-100 border-b border-yellow-300 py-2 mt-4">
          <div className="max-w-5xl mx-auto px-4 flex items-center justify-center gap-2 flex-wrap">
            <span className="text-yellow-800 text-sm font-medium mr-2">🛠️ Dev:</span>
            {[1, 2, 3, 4].map((step) => (
              <button
                key={step}
                onClick={() => setCurrentStep(step)}
                className={`px-3 py-1 text-sm rounded ${currentStep === step
                  ? 'bg-yellow-600 text-white'
                  : 'bg-white text-yellow-800 hover:bg-yellow-200'
                  }`}
              >
                Paso {step}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Main Content */}
      <div ref={contentRef} className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {currentStep === 1 && (
          <Step1Form
            formData={avaluoData}
            onUpdate={handleUpdateData}
            onNext={handleNext}
          />
        )}

        {currentStep === 2 && (
          <Step2Analysis
            formData={avaluoData}
            onUpdate={handleUpdateData}
            onNext={handleNext}
            onBack={handleBack}
          />
        )}

        {currentStep === 3 && (
          <Step3Results
            formData={avaluoData}
            onUpdate={handleUpdateData}
            onNext={handleNext}
            onBack={handleBack}
            onReset={handleReset}
          />
        )}

        {currentStep === 4 && (
          <Step4Contact
            formData={avaluoData}
            onUpdate={handleUpdateData}
            onReset={handleReset}
            onBack={handleBack}
          />
        )}
      </div>
    </div>
  );
}