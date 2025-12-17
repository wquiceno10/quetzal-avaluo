import React, { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import StepIndicator from '../components/avaluo/StepIndicator';
import Step1Form from '../components/avaluo/Step1Form';
import Step2Analysis from '../components/avaluo/Step2Analysis';
import Step3Results from '../components/avaluo/Step3Results';
import Step4Contact from '../components/avaluo/Step4Contact';
import { createClient } from '@supabase/supabase-js';
import { guardarAvaluoEnSupabase } from '@/lib/avaluos';
import { DEV_USER_EMAIL } from '../utils/devAuth';

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
  uso_lote: '',
  informacion_complementaria: '',
  documentos_urls: [],
  comparables_data: null,
  status: 'iniciado'
};

export default function AvaluoInmobiliario() {
  const [currentStep, setCurrentStep] = useState(1);
  const contentRef = useRef(null);
  const workAreaRef = useRef(null);

  useEffect(() => {
    // Scroll to the work area (Step Indicator) when step changes,
    // to keep user context but avoid jumping to the global hero header.
    if (workAreaRef.current) {
      workAreaRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [currentStep]);

  const location = useLocation();
  const [avaluoData, setAvaluoData] = useState(initialState);

  // Hydrate from location state if available (Editing mode)
  useEffect(() => {
    if (location.state && location.state.avaluoData) {
      // Ensure we deep copy to avoid reference issues
      setAvaluoData({ ...initialState, ...location.state.avaluoData });
      // Clean up state to prevent persistent reload on refresh? (Optional, but good practice)
      // window.history.replaceState({}, document.title)
    }
  }, [location.state]);
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

    // AUTO-SAVE LOGIC: If moving to Step 3 (Results)
    // We explicitly check the session here to ensure we save even if the currentUser state is stale.
    // Wrapped in try/catch to ensure we don't crash the flow if session check fails.
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
    const supabase = createClient(supabaseUrl, supabaseKey);

    let activeUser = currentUser;
    try {
      const { data } = await supabase.auth.getSession();
      if (data?.session?.user) {
        activeUser = data.session.user;
      }
    } catch (err) {
      console.warn("[AUTO-SAVE] Session check warning (using fallback):", err);
    }

    if (currentStep === 2 && nextStep === 3) {
      // DEV MODE FALLBACK: If we are in dev mode and have no user, create a mock one to allow saving
      if (!activeUser && isDevMode) {
        console.warn("[AUTO-SAVE] Dev Mode: using mock user for auto-save");
        activeUser = { email: DEV_USER_EMAIL || 'wquiceno10@gmail.com', id: 'dev-id' };
      }

      console.log("[DEBUG] Auto-save condition check. ActiveUser:", activeUser ? 'YES' : 'NO');

      if (activeUser) {
        try {
          console.log("[AUTO-SAVE] Starting auto-save...", { user: activeUser.email, tipo_inmueble: effectiveAvaluoData.tipo_inmueble });

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
            estrato: effectiveAvaluoData.estrato,
            estado_inmueble: effectiveAvaluoData.estado_inmueble,
            uso_lote: effectiveAvaluoData.uso_lote,
          };

          console.log("[AUTO-SAVE] Payload prepared:", {
            email: activeUser.email,
            tipoInmueble: effectiveAvaluoData.tipo_inmueble,
            barrio: effectiveAvaluoData.barrio,
            ciudad: effectiveAvaluoData.municipio,
            valorFinal: valFinal,
            codigoAvaluo: cod,
            payloadKeys: Object.keys(payload)
          });

          const savedId = await guardarAvaluoEnSupabase({
            email: activeUser.email,
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
          console.log("[AUTO-SAVE] ✅ Success! Avaluo ID:", savedId);
          setHasAvaluos(true);

        } catch (err) {
          console.error("[AUTO-SAVE] ❌ Failed:", {
            error: err,
            message: err.message,
            details: err.details,
            hint: err.hint,
            code: err.code
          });
          // Even if auto-save fails, allow user to continue to results
          // They can still save manually via email in Step 4
        }
      }
    }

    setCurrentStep(nextStep);

    // If moving to step 3 (Resultados) or 4, mark that we have content for "Mis Avaluos"
    if (nextStep >= 3) {
      setHasAvaluos(true);
    }
  };

  const handleBack = () => {
    // Step 4 (Contact) → Step 3 (Results)
    // Step 3 (Results) → Step 1 (Form) to allow editing
    // Step 2 (Analysis) → Step 1 (Form)
    if (currentStep === 4) {
      setCurrentStep(3); // From Contact back to Results
    } else if (currentStep === 3) {
      setCurrentStep(1); // From Results back to Form (preserves data via avaluoData state)
    } else {
      setCurrentStep(prev => Math.max(prev - 1, 1));
    }
  };

  const handleReset = () => {
    setAvaluoData(initialState);
    setCurrentStep(1);
  };



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
      <div ref={workAreaRef} className="bg-white shadow-sm">
        <StepIndicator currentStep={currentStep} />
      </div>






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
      <div ref={contentRef} className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pt-12 pb-4">
        {currentStep === 1 && (
          <Step1Form
            formData={avaluoData}
            onUpdate={handleUpdateData}
            onNext={handleNext}
            hasAvaluos={hasAvaluos}
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