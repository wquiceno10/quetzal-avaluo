import React, { useState, useEffect, useRef } from 'react';
import StepIndicator from '../components/avaluo/StepIndicator';
import Step1Form from '../components/avaluo/Step1Form';
import Step2Analysis from '../components/avaluo/Step2Analysis';
import Step3Results from '../components/avaluo/Step3Results';
import Step4Contact from '../components/avaluo/Step4Contact';

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

  // Detectar modo desarrollo
  const href = window.location.href;
  const isDevMode =
    href.includes('/editor/preview/') ||
    href.includes('/sandbox/preview-url') ||
    href.includes('server_url=') ||
    window.location.hostname === 'localhost' ||
    window.location.hostname === '127.0.0.1';

  const handleUpdateData = (newData) => {
    setAvaluoData(prev => ({ ...prev, ...newData }));
  };

  const handleNext = () => {
    setCurrentStep(prev => Math.min(prev + 1, 4));
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
        {/* Botón Mis Avalúos - Absolute Top Right */}
        <div className="absolute top-6 right-6 z-10">
          <a
            href="/mis-avaluos"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-white/10 hover:bg-white/20 backdrop-blur-sm border border-white/20 text-white rounded-full text-sm font-medium transition-all shadow-lg"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Mis Avalúos
          </a>
        </div>

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

      {/* Dev Navigation - Solo visible en modo desarrollo */}
      {isDevMode && (
        <div className="bg-yellow-100 border-b border-yellow-300 py-2">
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