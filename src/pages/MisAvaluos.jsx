import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2, ArrowRight, Download, Mail, Calendar, MapPin, Building2, Ruler, DollarSign, ExternalLink } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { createClient } from '@supabase/supabase-js';
import BotonPDF from '../components/avaluo/BotonPDF';

export default function MisAvaluos() {
    const navigate = useNavigate();
    const [avaluos, setAvaluos] = useState([]);
    const [loading, setLoading] = useState(true);
    const [sendingEmail, setSendingEmail] = useState(null);

    useEffect(() => {
        fetchAvaluos();
    }, []);

    const fetchAvaluos = async () => {
        try {
            const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
            const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

            if (!supabaseUrl || !supabaseAnonKey) throw new Error('Credenciales faltantes');

            const supabase = createClient(supabaseUrl, supabaseAnonKey);

            // Intentar obtener el email del localStorage si existe (simulación de sesión)
            // O simplemente traer todos (o los del usuario si tuviéramos auth real)
            // Por ahora traemos los últimos 20 generados
            const { data, error } = await supabase
                .from('avaluos')
                .select('*')
                .order('created_at', { ascending: false })
                .limit(20);

            if (error) throw error;
            setAvaluos(data || []);
        } catch (error) {
            console.error('Error:', error);
        } finally {
            setLoading(false);
        }
    };

    const generateEmailHtml = (avaluo) => {
        // --- LÓGICA DE VALORES Y FORMATO (HERO DESIGN) ---
        const comparablesData = avaluo.payload_json || {};
        const valorFormateado = avaluo.valor_final
            ? '$ ' + Math.round(avaluo.valor_final).toLocaleString('es-CO')
            : '$ —';

        // Fallback de "Estado"
        const estadoInmuebleRaw = avaluo.estado_inmueble || avaluo.estrato || '—';
        const estadoInmueble = String(estadoInmuebleRaw).replace(/_/g, ' ');

        // Rango
        const rangoMin = comparablesData.rango_valor_min
            ? '$ ' + Math.round(comparablesData.rango_valor_min).toLocaleString('es-CO')
            : '—';
        const rangoMax = comparablesData.rango_valor_max
            ? '$ ' + Math.round(comparablesData.rango_valor_max).toLocaleString('es-CO')
            : '—';

        // Comparables
        const totalComparables = comparablesData.total_comparables || 0;

        // Yield
        const yieldVal = comparablesData.yield_mensual_mercado
            ? (comparablesData.yield_mensual_mercado * 100).toFixed(2) + '%'
            : 'N/A';

        const esLote = (avaluo.tipo_inmueble || '').toLowerCase().includes('lote');

        return `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: 'Helvetica', 'Arial', sans-serif; margin: 0; padding: 0; background-color: #F4F4F4; color: #333; }
          .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; overflow: hidden; }
          
          /* HERO HEADER */
          .hero {
             background-color: #2C3D37;
             color: white;
             padding: 40px 30px;
             text-align: left;
             position: relative;
          }
          .hero-label {
             display: flex;
             align-items: center;
             gap: 10px;
             font-size: 18px;
             font-weight: bold;
             margin-bottom: 10px;
          }
          .hero-label img { height: 24px; }
          .hero-badge {
             background-color: #C9C19D;
             color: #2C3D37;
             padding: 4px 12px;
             border-radius: 20px;
             font-size: 11px;
             font-weight: bold;
             text-transform: uppercase;
             display: inline-block;
             margin-left: auto;
          }
          .hero-price {
             font-size: 42px;
             font-weight: bold;
             margin: 15px 0 5px 0;
             letter-spacing: -1px;
          }
          .hero-sub {
             font-size: 14px;
             opacity: 0.8;
             margin-bottom: 25px;
          }
          
          .stats-box {
             background-color: rgba(255,255,255,0.1);
             border: 1px solid rgba(255,255,255,0.2);
             border-radius: 8px;
             padding: 15px;
             display: flex;
             justify-content: space-between;
             font-size: 12px;
          }
          .stat-item strong { display: block; font-size: 14px; margin-bottom: 2px; }
          .stat-item span { opacity: 0.8; }
          .stat-right { text-align: right; }

          /* CONTENT */
          .content { padding: 30px; }
          .intro-text { font-size: 14px; line-height: 1.6; color: #555; margin-bottom: 30px; }
          .intro-text strong { color: #2C3D37; }

          .section-title {
             font-size: 16px;
             font-weight: bold;
             color: #2C3D37;
             border-bottom: 2px solid #E8ECE9;
             padding-bottom: 10px;
             margin-bottom: 20px;
             margin-top: 10px;
          }

          /* TABLE */
          .details-table { width: 100%; border-collapse: collapse; }
          .details-table td {
             padding: 12px 0;
             border-bottom: 1px border-color: #f0f0f0; /* Fallback */
             border-bottom: 1px solid #eee;
             font-size: 14px;
          }
          .label { font-weight: bold; color: #888; text-transform: uppercase; font-size: 11px; width: 40%; }
          .value { text-align: right; font-weight: bold; color: #333; }

          /* CTA */
          .cta-block {
             background-color: #2C3D37;
             color: white;
             padding: 30px;
             text-align: center;
             border-radius: 12px;
             margin-top: 40px;
          }
          .cta-btn {
             background-color: #C9C19D;
             color: #2C3D37;
             text-decoration: none;
             padding: 14px 28px;
             border-radius: 6px;
             font-weight: bold;
             display: inline-block;
             margin-top: 15px;
          }
          
          /* FOOTER */
          .footer {
             background-color: #1a2620;
             color: #8FA396;
             text-align: center;
             padding: 30px;
             font-size: 12px;
          }
          .footer p { margin: 5px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <!-- HERO -->
          <div class="hero">
            <div class="hero-label">
              <span>🏠 Valor Comercial</span>
              <span class="hero-badge">⚡ Estimación IA</span>
            </div>
            <div class="hero-sub">Estimación de Inteligencia Inmobiliaria</div>
            
            <div class="hero-price">${valorFormateado}</div>
            <div class="hero-sub">COP (Pesos Colombianos)</div>
            
            <div class="stats-box">
               <div class="stat-item">
                  <span>Rango Sugerido</span>
                  <strong>${rangoMin} - ${rangoMax}</strong>
               </div>
               <div class="stat-item stat-right">
                  <span>Muestra de Mercado</span>
                  <strong>${totalComparables} inmuebles</strong>
               </div>
            </div>
          </div>

          <div class="content">
             <p class="intro-text">
               Hola,<br><br>
               Aquí tienes el detalle de la valoración para tu inmueble ubicado en <strong>${avaluo.barrio}, ${avaluo.municipio}</strong>. 
               Este reporte refleja el comportamiento real del mercado local.
             </p>

             <div class="section-title">Información Detallada</div>
             <table class="details-table">
               <tr><td class="label">TIPO INMUEBLE</td><td class="value">${avaluo.tipo_inmueble}</td></tr>
               <tr><td class="label">UBICACIÓN</td><td class="value">${avaluo.barrio}, ${avaluo.municipio}</td></tr>
               <tr><td class="label">ÁREA CONSTRUIDA</td><td class="value">${avaluo.area_construida} m²</td></tr>
               ${!esLote ? `
               <tr><td class="label">HABITACIONES</td><td class="value">${avaluo.habitaciones}</td></tr>
               <tr><td class="label">BAÑOS</td><td class="value">${avaluo.banos}</td></tr>
               ` : ''}
               <tr><td class="label">ESTADO</td><td class="value">${estadoInmueble}</td></tr>
               ${!esLote ? `<tr><td class="label">RENTABILIDAD ESTIMADA</td><td class="value">${yieldVal}</td></tr>` : ''}
             </table>

             <div class="section-title" style="margin-top: 40px;">Comparables Destacados (Top 3)</div>
             <table class="details-table">
                ${(comparablesData.comparables_usados_en_calculo || []).slice(0, 3).map(comp => `
                  <tr>
                    <td style="text-align:left;">
                      <div style="font-weight:bold; font-size:13px; color:#2C3D37;">${comp.barrio || 'Zona'}</div>
                      <div style="font-size:11px; color:#888;">${comp.area_construida} m²</div>
                    </td>
                    <td class="value">${comp.precio_publicado ? '$ ' + Math.round(comp.precio_publicado).toLocaleString('es-CO') : 'Consultar'}</td>
                  </tr>
                `).join('')}
             </table>

             <!-- FULL REPORT CTA -->
             <div style="background-color: #2C3D37; border-radius: 8px; padding: 30px; text-align: center; margin-top: 40px; color: white;">
                <div style="font-size: 20px; font-weight: bold; margin-bottom: 10px;">📄 Reporte Completo</div>
                <div style="font-size: 13px; opacity: 0.8; margin-bottom: 20px;">
                  Para ver todas las gráficas y guardar el informe oficial, descarga el PDF.
                </div>
                <a href="${window.location.origin}/resultados/${avaluo.id}" 
                   style="background-color: #C9C19D; color: #2C3D37; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold; font-size: 14px;">
                   Ver y Descargar PDF
                </a>
             </div>

             <!-- CONTACT AGENT -->
             <div style="background-color: #F8F9FA; border-radius: 8px; padding: 30px; text-align: center; margin-top: 30px;">
                <h3 style="margin: 0 0 10px 0; color: #2C3D37;">¿Necesitas vender este inmueble?</h3>
                <p style="font-size: 13px; color: #666; margin-bottom: 20px;">
                   En Quetzal Hábitats conectamos tu propiedad con los clientes adecuados.
                </p>
                <a href="https://wa.me/573186383809" 
                   style="background-color: #2C3D37; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold; font-size: 14px;">
                   Contactar Asesor
                </a>
             </div>

          </div>

          <div class="footer">
             <img src="https://assets.zyrosite.com/YNqM51Nez6URyK5d/quetzal_4-Yan0WNJQLLHKrEom.png" alt="Quetzal" style="filter: brightness(0) invert(1); opacity: 0.5; height: 30px; margin-bottom: 10px;">
             <p>© 2025 Quetzal Hábitats - Todos los derechos reservados</p>
             <p>Código: ${avaluo.codigo_avaluo || 'QZ-GEN'}</p>
          </div>
        </div>
      </body>
      </html>
    `;
    };

    const handleResendEmail = async (avaluo) => {
        if (!avaluo.email) {
            alert("No hay un email registrado para este avalúo.");
            return;
        }

        setSendingEmail(avaluo.id);
        try {
            const emailHtml = generateEmailHtml(avaluo);

            const response = await fetch(`${import.meta.env.VITE_WORKER_EMAIL_URL}/send-email`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    to: avaluo.email,
                    subject: `Reporte de Avalúo: ${avaluo.tipo_inmueble} en ${avaluo.barrio}`,
                    htmlBody: emailHtml
                }),
            });

            if (!response.ok) throw new Error('Error enviando email');
            alert(`Correo reenviado exitosamente a ${avaluo.email}`);
        } catch (err) {
            console.error(err);
            alert("Error al reenviar el correo.");
        } finally {
            setSendingEmail(null);
        }
    };

    if (loading) {
        return <div className="flex justify-center py-20"><Loader2 className="animate-spin text-[#2C3D37]" /></div>;
    }

    return (
        <div className="container mx-auto px-4 py-8 max-w-7xl">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-[#2C3D37] font-outfit">Mis Avalúos</h1>
                    <p className="text-[#4F5B55] mt-1">Historial de valoraciones generadas</p>
                </div>
                <Button onClick={() => navigate('/AvaluoInmobiliario')} className="bg-[#2C3D37] hover:bg-[#1a2620]">
                    Nuevo Avalúo
                </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {avaluos.map((avaluo) => (
                    <Card key={avaluo.id} className="hover:shadow-lg transition-shadow border-0 shadow-md overflow-hidden flex flex-col h-full">
                        <div className="h-2 bg-[#2C3D37]" />
                        <CardContent className="p-6 flex-1 flex flex-col">
                            <div className="flex justify-between items-start mb-4">
                                <div className="bg-[#E8ECE9] text-[#2C3D37] text-xs font-bold px-3 py-1 rounded-full uppercase">
                                    {avaluo.tipo_inmueble}
                                </div>
                                <div className="text-xs text-gray-500 flex items-center">
                                    <Calendar className="w-3 h-3 mr-1" />
                                    {new Date(avaluo.created_at).toLocaleDateString()}
                                </div>
                            </div>

                            <h3 className="text-xl font-bold text-[#2C3D37] mb-1 line-clamp-1">
                                {avaluo.barrio}, {avaluo.municipio}
                            </h3>
                            <div className="text-2xl font-bold text-[#2C3D37] mb-4">
                                {avaluo.valor_final ? '$ ' + Math.round(avaluo.valor_final).toLocaleString('es-CO') : 'Por definir'}
                            </div>

                            <div className="space-y-2 mb-6 text-sm text-gray-600 flex-1">
                                <div className="flex items-center"><Ruler className="w-4 h-4 mr-2 opacity-70" /> {avaluo.area_construida || avaluo.payload_json?.area_construida || '-'} m²</div>
                                {!avaluo.tipo_inmueble.toLowerCase().includes('lote') && (
                                    <div className="flex items-center"><Building2 className="w-4 h-4 mr-2 opacity-70" /> {avaluo.habitaciones || avaluo.payload_json?.habitaciones || '-'} hab • {avaluo.banos || avaluo.payload_json?.banos || '-'} baños</div>
                                )}
                            </div>

                            <div className="pt-4 border-t border-gray-100 grid grid-cols-2 gap-2">
                                <Button variant="outline" className="w-full text-xs" onClick={() => navigate(`/resultados/${avaluo.id}`)}>
                                    <ExternalLink className="w-3 h-3 mr-1" /> Ver Detalles
                                </Button>

                                {/* Botón de PDF */}
                                <div>
                                    <BotonPDF
                                        targetId={`reporte-${avaluo.id}`}
                                        filename={`Avaluo_${avaluo.codigo_avaluo}.pdf`}
                                        variant="ghost"
                                        className="w-full text-xs"
                                    />
                                </div>

                                <Button
                                    variant="ghost"
                                    className="w-full text-xs text-[#2C3D37] hover:bg-[#E8ECE9]"
                                    onClick={() => handleResendEmail(avaluo)}
                                    disabled={sendingEmail === avaluo.id}
                                >
                                    {sendingEmail === avaluo.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Mail className="w-3 h-3 mr-1" />}
                                    {sendingEmail === avaluo.id ? 'Enviando...' : 'Reenviar'}
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>
        </div>
    );
}
