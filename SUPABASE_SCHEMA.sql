-- Tabla: avaluos
-- Descripción: Almacena los avalúos generados por el sistema

CREATE TABLE public.avaluos (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  created_at timestamp with time zone NULL DEFAULT now(),
  ciudad text NULL,
  valor_final numeric NULL,
  payload_json jsonb NULL,
  tipo_inmueble text NULL,
  barrio text NULL,
  codigo_avaluo text NULL,
  email text NULL,
  CONSTRAINT avaluos_pkey PRIMARY KEY (id)
) TABLESPACE pg_default;

-- Notas:
-- 1. payload_json contiene TODOS los datos del avalúo, incluyendo:
--    - comparables_data
--    - estrato
--    - estado_inmueble
--    - habitaciones
--    - banos
--    - area_construida
--    - y todos los demás campos del formulario
--
-- 2. Los campos en el nivel raíz (barrio, ciudad, etc.) son para 
--    facilitar búsquedas y consultas rápidas
--
-- 3. NO existen columnas separadas para estrato o estado_inmueble
