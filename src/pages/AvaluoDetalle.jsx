import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { createClient } from '@supabase/supabase-js';
import Step3Results from '../components/avaluo/Step3Results';
import Step4Contact from '../components/avaluo/Step4Contact';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Loader2 } from 'lucide-react';

export default function AvaluoDetalle() {
    const { id } = useParams();
    const navigate = useNavigate();

    // Detección robusta del parámetro download usando URLSearchParams
    const autoDownload = new URLSearchParams(window.location.search).get('download') === 'pdf';


    const [avaluo, setAvaluo] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [showContact, setShowContact] = useState(false);

    useEffect(() => {
        fetchAvaluo();
    }, [id]);

    const fetchAvaluo = async () => {
        try {
            const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
            const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

            if (!supabaseUrl || !supabaseAnonKey) {
                throw new Error('Credenciales de Supabase no encontradas');
            }

            const supabase = createClient(supabaseUrl, supabaseAnonKey);

            const { data, error } = await supabase
                .from('avaluos')
                .select('*')
                .eq('id', id)
                .single();

            if (error) throw error;
            if (!data) throw new Error('Avalúo no encontrado');

            setAvaluo(data);
        } catch (err) {
            console.error('Error fetching avaluo:', err);
            setError('No pudimos cargar el avalúo. Puede que no exista o haya sido eliminado.');
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh]">
                <Loader2 className="w-12 h-12 text-[#2C3D37] animate-spin mb-4" />
                <p className="text-[#4F5B55]">Cargando avalúo...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="max-w-4xl mx-auto px-4 py-12 text-center">
                <div className="bg-red-50 text-red-800 p-6 rounded-lg mb-6 inline-block">
                    {error}
                </div>
                <br />
                <Button onClick={() => navigate('/mis-avaluos')} variant="outline">
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Volver a Mis Avalúos
                </Button>
            </div>
        );
    }

    // Prepare data for Step3Results
    const formData = {
        ...avaluo,
        // Ensure comparables_data is populated from payload_json
        comparables_data: avaluo.payload_json || {},
        // Map top-level fields if needed
        tipo_inmueble: avaluo.tipo_inmueble,
        barrio: avaluo.barrio,
        municipio: avaluo.municipio || avaluo.ciudad,
        area_construida: avaluo.area_construida || avaluo.payload_json?.area_construida,
        habitaciones: avaluo.habitaciones || avaluo.payload_json?.habitaciones,
        banos: avaluo.banos || avaluo.payload_json?.banos,
        estrato: avaluo.estrato || avaluo.payload_json?.estrato,
        edad_inmueble: avaluo.edad_inmueble,
        estado_inmueble: avaluo.estado_inmueble || avaluo.payload_json?.estado_inmueble || avaluo.payload_json?.estado,
        uso_lote: avaluo.uso_lote || avaluo.payload_json?.uso_lote,  // ✅ AGREGADO
        // Contact info for direct resend
        email: avaluo.email,
        nombre_contacto: avaluo.nombre_contacto || avaluo.contacto_nombre,
        contacto_telefono: avaluo.contacto_telefono || avaluo.telefono
    };

    // DEBUG: Log Estado/Estrato values
    console.log('🔍 DEBUG AvaluoDetalle:', {
        'avaluo.estrato': avaluo.estrato,
        'avaluo.estado_inmueble': avaluo.estado_inmueble,
        'payload_json.estrato': avaluo.payload_json?.estrato,
        'payload_json.estado_inmueble': avaluo.payload_json?.estado_inmueble,
        'formData.estrato': formData.estrato,
        'formData.estado_inmueble': formData.estado_inmueble
    });
    console.log('🔍 FULL payload_json:', avaluo.payload_json);
    console.log('🔍 FULL avaluo object keys:', Object.keys(avaluo));

    // Si mostramos la vista de contacto (Finalizar Informe)
    if (showContact) {
        return (
            <div className="container mx-auto px-4 py-8 max-w-4xl">
                <Button onClick={() => setShowContact(false)} variant="ghost" className="mb-6 pl-0 hover:bg-transparent hover:text-[#2C3D37]/70 text-[#2C3D37]">
                    <ArrowLeft className="w-5 h-5 mr-2" />
                    Volver al reporte
                </Button>
                <Step4Contact formData={formData} />
            </div>
        );
    }

    return (
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8" >
            <div className="mb-6 flex items-center justify-between">
                <Button
                    variant="ghost"
                    onClick={() => navigate('/mis-avaluos')}
                    className="text-[#4F5B55] hover:text-[#2C3D37]"
                >
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Volver a Mis Avalúos
                </Button>
                <div className="text-sm text-[#7A8C85]">
                    Código: <span className="font-medium text-[#2C3D37]">{avaluo.codigo_avaluo}</span>
                </div>
            </div>

            <Step3Results
                formData={formData}
                onBack={() => navigate('/mis-avaluos')}
                onReset={() => navigate('/AvaluoInmobiliario')}
                onNext={() => setShowContact(true)}
                onUpdate={() => { }}
                autoDownloadPDF={autoDownload}
            />
        </div >
    );
}