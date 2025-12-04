import React from 'react';
import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';

const steps = [
  { number: 1, title: 'Datos del Inmueble' },
  { number: 2, title: 'Análisis de Mercado' },
  { number: 3, title: 'Resultados' },
  { number: 4, title: 'Entrega del Reporte' }
];

export default function StepIndicator({ currentStep }) {
  return (
    <div className="w-full py-8">
      <div className="max-w-4xl mx-auto px-4">
        <div className="flex items-center justify-between">
          {steps.map((step, index) => (
            <React.Fragment key={step.number}>
              <div className="flex flex-col items-center flex-1">
                <div className="relative">
                  <div
                    className={cn(
                      "w-12 h-12 rounded-full flex items-center justify-center transition-all duration-300",
                      currentStep > step.number
                        ? "bg-[#2C3D37] text-white"
                        : currentStep === step.number
                        ? "bg-[#2C3D37] text-white ring-4 ring-[#B0BDB4] ring-opacity-50"
                        : "bg-[#DAD7D0] text-[#2C3D37]"
                    )}
                  >
                    {currentStep > step.number ? (
                      <Check className="w-6 h-6" />
                    ) : (
                      <span className="font-semibold text-lg">{step.number}</span>
                    )}
                  </div>
                </div>
                <p
                  className={cn(
                    "mt-3 text-sm font-medium text-center transition-colors hidden sm:block",
                    currentStep >= step.number ? "text-[#2C3D37]" : "text-gray-400"
                  )}
                >
                  {step.title}
                </p>
              </div>
              
              {index < steps.length - 1 && (
                <div className="flex-1 h-1 mx-2 -mt-8 hidden sm:block">
                  <div
                    className={cn(
                      "h-full rounded-full transition-all duration-300",
                      currentStep > step.number ? "bg-[#2C3D37]" : "bg-[#DAD7D0]"
                    )}
                  />
                </div>
              )}
            </React.Fragment>
          ))}
        </div>
      </div>
    </div>
  );
}