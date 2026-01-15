import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { createClient } from '@supabase/supabase-js';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { ArrowRight, Upload, X, FileText, Loader2 } from 'lucide-react';
import { isDevelopmentMode, getDevUser } from '@/utils/devAuth';

const DEPARTAMENTOS_COLOMBIA = [
  "Amazonas", "Antioquia", "Arauca", "Atlántico", "Bolívar", "Boyacá", "Caldas",
  "Caquetá", "Casanare", "Cauca", "Cesar", "Chocó", "Córdoba", "Cundinamarca",
  "Guainía", "Guaviare", "Huila", "La Guajira", "Magdalena", "Meta", "Nariño",
  "Norte de Santander", "Putumayo", "Quindío", "Risaralda", "San Andrés y Providencia",
  "Santander", "Sucre", "Tolima", "Valle del Cauca", "Vaupés", "Vichada"
];

export default function Step1Form({ formData, onUpdate, onNext }) {
  const [localData, setLocalData] = useState(formData);
  const [uploadingFiles, setUploadingFiles] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [hasAvaluos, setHasAvaluos] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    // Sincronizar localData si formData cambia (ej: al volver de resultados)
    if (formData) {
      setLocalData(formData);
    }
  }, [formData]);

  useEffect(() => {
    const checkAvaluos = async () => {
      try {
        // En modo desarrollo, usar usuario mock
        if (isDevelopmentMode()) {
          const devUser = getDevUser();
          if (devUser) {
            console.log('🔧 Usando usuario de desarrollo:', devUser.email);
            // Simular que tiene avalúos para mostrar el botón
            setHasAvaluos(true);
          }
          return;
        }

        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
        const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
        if (!supabaseUrl || !supabaseAnonKey) return;
        const supabase = createClient(supabaseUrl, supabaseAnonKey);
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { count } = await supabase
          .from('avaluos')
          .select('*', { count: 'exact', head: true })
          .eq('email', user.email);

        if (count && count > 0) setHasAvaluos(true);
      } catch (e) {
        console.error("Error checking avaluos:", e);
      }
    };
    checkAvaluos();
  }, []);

  const handleChange = (field, value) => {
    const updated = { ...localData, [field]: value };
    setLocalData(updated);
    onUpdate(updated);
  };

  const handleFileUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    setUploadingFiles(true);
    const newUploadedFiles = [];

    try {
      for (const file of files) {
        const formData = new FormData();
        formData.append('file', file);

        const response = await fetch(import.meta.env.VITE_WORKER_UPLOAD_URL, {
          method: 'POST',
          body: formData
        });

        if (!response.ok) {
          const error = await response.json();
          console.error('Upload failed:', error);
          alert(`Error al subir ${file.name}: ${error.error || 'Error desconocido'}`);
          continue;
        }

        const { file_url } = await response.json();
        newUploadedFiles.push({ name: file.name, url: file_url });
      }

      const allFiles = [...uploadedFiles, ...newUploadedFiles];
      setUploadedFiles(allFiles);

      const updated = { ...localData, documentos_urls: allFiles.map(f => f.url) };
      setLocalData(updated);
      onUpdate(updated);
    } catch (error) {
      console.error('Upload error:', error);
      alert('Error al subir archivos. Por favor, intenta de nuevo.');
    } finally {
      setUploadingFiles(false);
    }
  };

  const removeFile = (index) => {
    const newFiles = uploadedFiles.filter((_, i) => i !== index);
    setUploadedFiles(newFiles);

    const updated = { ...localData, documentos_urls: newFiles.map(f => f.url) };
    setLocalData(updated);
    onUpdate(updated);
  };

  const isLote = localData.tipo_inmueble === 'lote';

  const isRemodelacionValid = localData.estado_inmueble !== 'remodelado' || (
    localData.tipo_remodelacion &&
    localData.descripcion_mejoras?.trim()
  );

  const isValid = (() => {
    // Campos comunes
    if (!localData.tipo_inmueble || !localData.municipio ||
      !localData.departamento || !localData.area_construida) return false;

    if (isLote) {
      // Validaciones específicas para Lote
      if (!localData.uso_lote || !localData.clasificacion_suelo || !localData.contexto_zona) return false;
      // Nombre del conjunto y estrato son OPCIONALES para lotes (incluso en conjuntos)
      return true;
    } else {
      // Validaciones para Casa/Apartamento
      if (!localData.barrio || !localData.contexto_zona || !localData.estado_inmueble ||
        !localData.antiguedad || !localData.estrato ||
        !localData.habitaciones || !localData.banos || !localData.tipo_parqueadero) return false;

      // Validaciones específicas Apartamento
      if (localData.tipo_inmueble === 'apartamento') {
        if (!localData.piso || !localData.ascensor) return false;
      }

      // Validaciones específicas Casa
      if (localData.tipo_inmueble === 'casa') {
        if (!localData.numeropisos) return false;
      }

      if (!isRemodelacionValid) return false;

      if (localData.contexto_zona === 'conjunto_cerrado') {
        if (!localData.nombre_conjunto || localData.nombre_conjunto.trim().length < 3) return false;
      }
    }
    return true;
  })();

  return (
    <div className="space-y-6">
      <Card className="border-[#B0BDB4]">
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <CardTitle className="text-2xl text-[#2C3D37]">
                Datos del Inmueble
              </CardTitle>
              <CardDescription className="text-base">
                Completa la información de tu propiedad para realizar el avalúo comercial.
              </CardDescription>
            </div>
            {hasAvaluos && (
              <Button
                onClick={() => navigate('/mis-avaluos')}
                variant="outline"
                className="border-[#2C3D37] text-[#2C3D37] hover:bg-[#F0F2F1] rounded-full"
              >
                <FileText className="w-4 h-4 mr-2" />
                Mis Avalúos
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-6">

          {/* Tipo de Propiedad y Ubicación */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label className="text-[#2C3D37] font-medium">Tipo de Propiedad *</Label>
              <Select value={localData.tipo_inmueble || ''} onValueChange={(value) => handleChange('tipo_inmueble', value)}>
                <SelectTrigger className="border-[#B0BDB4] focus:border-[#2C3D37]">
                  <SelectValue placeholder="Selecciona" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="casa">Casa</SelectItem>
                  <SelectItem value="apartamento">Apartamento</SelectItem>
                  {/* <SelectItem value="lote">Lote</SelectItem> */}
                </SelectContent>
              </Select>
            </div>


            {isLote && (
              <>
                <div className="space-y-2">
                  <Label className="text-[#2C3D37] font-medium">Uso del Lote *</Label>
                  <Select value={localData.uso_lote || ''} onValueChange={(value) => handleChange('uso_lote', value)}>
                    <SelectTrigger className="border-[#B0BDB4] focus:border-[#2C3D37]">
                      <SelectValue placeholder="Selecciona" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="residencial">Residencial</SelectItem>
                      <SelectItem value="comercial">Comercial</SelectItem>
                      <SelectItem value="mixto">Mixto</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-[#2C3D37] font-medium">Clasificación del Suelo *</Label>
                  <Select value={localData.clasificacion_suelo || ''} onValueChange={(value) => handleChange('clasificacion_suelo', value)}>
                    <SelectTrigger className="border-[#B0BDB4] focus:border-[#2C3D37]">
                      <SelectValue placeholder="Selecciona" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="urbano">Urbano</SelectItem>
                      <SelectItem value="suburbano">Suburbano</SelectItem>
                      <SelectItem value="rural">Rural</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-[#2C3D37] font-medium">Ubicación del Terreno *</Label>
                  <Select value={localData.contexto_zona || ''} onValueChange={(value) => handleChange('contexto_zona', value)}>
                    <SelectTrigger className="border-[#B0BDB4] focus:border-[#2C3D37]">
                      <SelectValue placeholder="Selecciona" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="barrio_abierto">Lote Abierto / Independiente</SelectItem>
                      <SelectItem value="conjunto_cerrado">En Parcelación / Conjunto Cerrado</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}

            {!isLote && (
              <>
                <div className="space-y-2">
                  <Label className="text-[#2C3D37] font-medium">Barrio *</Label>
                  <Input
                    value={localData.barrio || ''}
                    onChange={(e) => handleChange('barrio', e.target.value)}
                    placeholder="Ej: Ciudad Verde"
                    className="border-[#B0BDB4] focus:border-[#2C3D37]"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-[#2C3D37] font-medium">Tipo de Urbanización *</Label>
                  <Select value={localData.contexto_zona || ''} onValueChange={(value) => handleChange('contexto_zona', value)}>
                    <SelectTrigger className="border-[#B0BDB4] focus:border-[#2C3D37]">
                      <SelectValue placeholder="Selecciona" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="barrio_abierto">Barrio</SelectItem>
                      <SelectItem value="conjunto_cerrado">Conjunto Cerrado</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}

            {localData.contexto_zona === 'conjunto_cerrado' && (
              <div className="space-y-2">
                <Label className="text-[#2C3D37] font-medium">Nombre del Conjunto {isLote ? <span className="text-[#6B7280] font-normal">(Opcional)</span> : '*'}</Label>
                <Input
                  value={localData.nombre_conjunto || ''}
                  onChange={(e) => handleChange('nombre_conjunto', e.target.value)}
                  placeholder="Ej: Conjunto Residencial Los Robles"
                  className="border-[#B0BDB4] focus:border-[#2C3D37]"
                />
              </div>
            )}

            <div className="space-y-2">
              <Label className="text-[#2C3D37] font-medium">Ciudad / Municipio *</Label>
              <Input
                value={localData.municipio || ''}
                onChange={(e) => handleChange('municipio', e.target.value)}
                placeholder="Ej: Pereira"
                className="border-[#B0BDB4] focus:border-[#2C3D37]"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-[#2C3D37] font-medium">Departamento *</Label>
              <Select value={localData.departamento || ''} onValueChange={(value) => handleChange('departamento', value)}>
                <SelectTrigger className="border-[#B0BDB4] focus:border-[#2C3D37]">
                  <SelectValue placeholder="Selecciona" />
                </SelectTrigger>
                <SelectContent>
                  {DEPARTAMENTOS_COLOMBIA.map(dep => (
                    <SelectItem key={dep} value={dep}>{dep}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Características */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label className="text-[#2C3D37] font-medium">Área (m²) *</Label>
              <Input
                type="number"
                value={localData.area_construida || ''}
                onChange={(e) => handleChange('area_construida', parseFloat(e.target.value))}
                placeholder="120"
                className="border-[#B0BDB4] focus:border-[#2C3D37]"
              />
            </div>

            {!isLote && (
              <>
                <div className="space-y-2">
                  <Label className="text-[#2C3D37] font-medium"># Habitaciones *</Label>
                  <Input
                    type="number"
                    value={localData.habitaciones || ''}
                    onChange={(e) => handleChange('habitaciones', parseInt(e.target.value))}
                    placeholder="3"
                    className="border-[#B0BDB4] focus:border-[#2C3D37]"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-[#2C3D37] font-medium"># Baños *</Label>
                  <Input
                    type="number"
                    value={localData.banos || ''}
                    onChange={(e) => handleChange('banos', parseInt(e.target.value))}
                    placeholder="2"
                    className="border-[#B0BDB4] focus:border-[#2C3D37]"
                  />
                </div>

                {/* Número de Piso - Solo Apartamentos */}
                {localData.tipo_inmueble === 'apartamento' && (
                  <div className="space-y-2">
                    <Label className="text-[#2C3D37] font-medium">Número de Piso *</Label>
                    <Input
                      type="number"
                      value={localData.piso || ''}
                      onChange={(e) => handleChange('piso', parseInt(e.target.value))}
                      placeholder="Ej: 5"
                      className="border-[#B0BDB4] focus:border-[#2C3D37]"
                    />
                  </div>
                )}

                {/* Ascensor - Solo Apartamentos */}
                {localData.tipo_inmueble === 'apartamento' && (
                  <div className="space-y-2">
                    <Label className="text-[#2C3D37] font-medium">¿Tiene Ascensor? *</Label>
                    <Select value={localData.ascensor || ''} onValueChange={(value) => handleChange('ascensor', value)}>
                      <SelectTrigger className="border-[#B0BDB4] focus:border-[#2C3D37]">
                        <SelectValue placeholder="Selecciona" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="si">Sí</SelectItem>
                        <SelectItem value="no">No</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {/* Niveles de la Casa - Solo Casas */}
                {localData.tipo_inmueble === 'casa' && (
                  <div className="space-y-2">
                    <Label className="text-[#2C3D37] font-medium">Niveles de la Casa *</Label>
                    <Select value={localData.numeropisos || ''} onValueChange={(value) => handleChange('numeropisos', value)}>
                      <SelectTrigger className="border-[#B0BDB4] focus:border-[#2C3D37]">
                        <SelectValue placeholder="Selecciona" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">1 nivel</SelectItem>
                        <SelectItem value="2">2 niveles</SelectItem>
                        <SelectItem value="3">3 o más niveles</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <div className="space-y-2">
                  <Label className="text-[#2C3D37] font-medium">Parqueadero *</Label>
                  <Select value={localData.tipo_parqueadero || ''} onValueChange={(value) => handleChange('tipo_parqueadero', value)}>
                    <SelectTrigger className="border-[#B0BDB4] focus:border-[#2C3D37]">
                      <SelectValue placeholder="Selecciona" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="comunal">Comunal</SelectItem>
                      <SelectItem value="sin_parqueadero">Sin Parqueadero</SelectItem>
                      <SelectItem value="privado_1">Privado 1</SelectItem>
                      <SelectItem value="privado_2">Privado 2</SelectItem>
                      <SelectItem value="privado_mas_2">Privado + 2</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-[#2C3D37] font-medium">Antigüedad *</Label>
                  <Select value={localData.antiguedad || ''} onValueChange={(value) => handleChange('antiguedad', value)}>
                    <SelectTrigger className="border-[#B0BDB4] focus:border-[#2C3D37]">
                      <SelectValue placeholder="Selecciona" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="0 a 5 años">0 a 5 años</SelectItem>
                      <SelectItem value="6 a 10 años">6 a 10 años</SelectItem>
                      <SelectItem value="11 a 15 años">11 a 15 años</SelectItem>
                      <SelectItem value="15 a 20 años">15 a 20 años</SelectItem>
                      <SelectItem value="Más de 20 años">Más de 20 años</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

              </>
            )}

            {/* Estrato - Para Propiedades (Obligatorio) o Lotes en Conjunto (Opcional) */}
            {(!isLote || localData.contexto_zona === 'conjunto_cerrado') && (
              <div className="space-y-2">
                <Label className="text-[#2C3D37] font-medium">Estrato {isLote ? <span className="text-[#6B7280] font-normal">(Opcional)</span> : '*'}</Label>
                <Select value={localData.estrato || ''} onValueChange={(value) => handleChange('estrato', value)}>
                  <SelectTrigger className="border-[#B0BDB4] focus:border-[#2C3D37]">
                    <SelectValue placeholder="Selecciona" />
                  </SelectTrigger>
                  <SelectContent>
                    {[1, 2, 3, 4, 5, 6].map((est) => (
                      <SelectItem key={est} value={est.toString()}>{est}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          {/* Estado del Inmueble */}
          {!isLote && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label className="text-[#2C3D37] font-medium">Estado del Inmueble *</Label>
                <Select value={localData.estado_inmueble || ''} onValueChange={(value) => handleChange('estado_inmueble', value)}>
                  <SelectTrigger className="border-[#B0BDB4] focus:border-[#2C3D37]">
                    <SelectValue placeholder="Selecciona" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="nuevo">Nuevo</SelectItem>
                    <SelectItem value="remodelado">Remodelado</SelectItem>
                    <SelectItem value="buen_estado">Buen Estado</SelectItem>
                    <SelectItem value="requiere_reformas_ligeras">Reformas Ligeras</SelectItem>
                    <SelectItem value="requiere_reformas_moderadas">Reformas Moderadas</SelectItem>
                    <SelectItem value="requiere_reformas_amplias">Reformas Amplias</SelectItem>
                    <SelectItem value="requiere_reformas_superiores">Reformas Superiores</SelectItem>
                    <SelectItem value="obra_gris">Obra Gris</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {localData.estado_inmueble === 'remodelado' && (
                <>
                  <div className="space-y-2">
                    <Label className="text-[#2C3D37] font-medium">Tipo de Remodelación *</Label>
                    <Select value={localData.tipo_remodelacion || ''} onValueChange={(value) => {
                      const updated = { ...localData, tipo_remodelacion: value, descripcion_mejoras: '', valor_remodelacion: '' };
                      setLocalData(updated);
                      onUpdate(updated);
                    }}>
                      <SelectTrigger className="border-[#B0BDB4] focus:border-[#2C3D37]">
                        <SelectValue placeholder="Selecciona" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ligera">Reforma Ligera</SelectItem>
                        <SelectItem value="moderada">Reforma Moderada</SelectItem>
                        <SelectItem value="amplia">Remodelación Amplia</SelectItem>
                        <SelectItem value="premium">Remodelación Superior</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {localData.tipo_remodelacion && (
                    <div className="space-y-2 md:col-span-2">
                      <Label className="text-[#2C3D37] font-medium">Describe las mejoras *</Label>
                      <Input
                        value={localData.descripcion_mejoras || ''}
                        onChange={(e) => handleChange('descripcion_mejoras', e.target.value)}
                        placeholder="Ej: Cocina nueva, baños remodelados, pisos en porcelanato..."
                        className="border-[#B0BDB4] focus:border-[#2C3D37]"
                      />
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* Información Complementaria */}
          <div className="space-y-2">
            <Label className="text-[#2C3D37] font-medium">Información Complementaria</Label>
            <div className="bg-[#FFFDF5] border border-[#C9C19D]/30 p-3 rounded-md mb-2">
              <p className="text-xs text-[#4F5B55] leading-relaxed">
                <strong>Importante:</strong> Para evitar penalizaciones por "hallazgos ocultos" en futuras promesas de compraventa, por favor detalla: situación legal (herencias, sucesiones, hipotecas), si el inmueble tiene licencia de construcción (especialmente lotes), si está libre de patrimonio familiar o si requiere ajustes puntuales. <strong>También puedes agregar características especiales que no encuentres en el formulario.</strong>
              </p>
            </div>
            <Textarea
              value={localData.informacion_complementaria || ''}
              onChange={(e) => handleChange('informacion_complementaria', e.target.value)}
              placeholder="Ej: El inmueble tiene una hipoteca vigente con Davivienda. Es una sucesión en trámite..."
              className="min-h-[200px] border-[#B0BDB4] focus:border-[#2C3D37]"
            />
          </div>

          {/* Carga de Documentos Eliminada */}

          <Button
            onClick={onNext}
            disabled={!isValid}
            className="w-full bg-[#2C3D37] hover:bg-[#1a2620] text-white rounded-full py-6 text-lg font-medium"
          >
            Empezar Análisis
            <ArrowRight className="w-5 h-5 ml-2" />
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}