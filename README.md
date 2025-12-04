# Quetzal Avalúo - Sistema de Avalúo Comercial Inmobiliario

Aplicación web independiente para avalúos comerciales de propiedades inmobiliarias usando IA.

## 🏗️ Tecnologías

- **Frontend**: React + Vite + TailwindCSS + shadcn/ui
- **Backend**: Netlify Functions (Serverless)
- **Autenticación**: Supabase Auth (Magic Links)
- **Email**: Resend
- **IA**: 
  - Perplexity (análisis de mercado inmobiliario en texto)
  - DeepSeek v3 (extracción estructurada JSON)

## 🔑 Variables de Entorno (Netlify)

Configura las siguientes variables de entorno en Netlify Dashboard:

```bash
PERPLEXITY_API_KEY=tu_api_key_de_perplexity
DEEPSEEK_API_KEY=tu_api_key_de_deepseek
RESEND_API_KEY=tu_api_key_de_resend
SUPABASE_URL=tu_url_de_supabase
SUPABASE_ANON_KEY=tu_anon_key_de_supabase
```

## 📊 Configuración de Supabase

Para guardar los avalúos, crea una tabla `avaluos` en tu proyecto de Supabase:

```sql
CREATE TABLE avaluos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  codigo_avaluo TEXT UNIQUE NOT NULL,
  nombre_contacto TEXT,
  email TEXT,
  whatsapp TEXT,
  tipo_inmueble TEXT,
  barrio TEXT,
  municipio TEXT,
  departamento TEXT,
  area_construida NUMERIC,
  habitaciones INTEGER,
  banos INTEGER,
  comparables_data JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Opcional: Índices para búsquedas rápidas
CREATE INDEX idx_avaluos_codigo ON avaluos(codigo_avaluo);
CREATE INDEX idx_avaluos_email ON avaluos(email);
CREATE INDEX idx_avaluos_created_at ON avaluos(created_at DESC);
```

## 💻 Desarrollo Local

```bash
# Instalar dependencias
npm install

# Iniciar servidor de desarrollo (solo frontend)
npm run dev

# Iniciar con Netlify Functions (recomendado para testing completo)
netlify dev
```

El servidor de desarrollo estará disponible en:
- Frontend: `http://localhost:8888` (con netlify dev)
- Frontend: `http://localhost:5173` (solo con npm run dev)
- Functions: `http://localhost:8888/.netlify/functions/`

## 🚀 Deploy en Netlify

### Primera vez:

1. Conecta tu repositorio Git a Netlify
2. Configuración de build:
   - **Build command**: `npm run build`
   - **Publish directory**: `dist`
   - **Functions directory**: `netlify/functions`

3. Agrega las variables de entorno en Netlify Dashboard

4. Deploy!

### Actualizaciones:

```bash
# Commit y push a tu repositorio
git add .
git commit -m "Descripción de cambios"
git push origin main

# Netlify desplegará automáticamente
```

O deploy manual:

```bash
# Build local
npm run build

# Deploy
netlify deploy --prod
```

## 📁 Estructura del Proyecto

```
quetzal-avaluo/
├── netlify/
│   └── functions/           # Netlify Functions (backend serverless)
│       ├── perplexityAnalysis.js   # Análisis con Perplexity + DeepSeek
│       ├── sendReportEmail.js      # Envío de emails con Resend
│       └── supabaseAuth.js         # Autenticación con Supabase
├── src/
│   ├── api/
│   │   └── client.js        # Cliente API personalizado
│   ├── components/
│   │   ├── avaluo/          # Componentes del flujo de avalúo
│   │   └── ui/              # Componentes UI de shadcn
│   ├── pages/               # Páginas de la aplicación
│   └── utils/               # Utilidades
├── netlify.toml             # Configuración de Netlify
└── package.json
```

## 🔄 Flujo de la Aplicación

1. **Autenticación** (`/AccesoClientes`): Magic link por email vía Supabase
2. **Paso 1** - Formulario: Usuario ingresa datos del inmueble
3. **Paso 2** - Análisis: 
   - Perplexity busca comparables en el mercado
   - DeepSeek extrae datos estructurados
4. **Paso 3** - Resultados: Muestra valor estimado y comparables
5. **Paso 4** - Contacto: Envía reporte por email y guarda en Supabase

## 🛠️ Scripts Disponibles

```bash
npm run dev          # Desarrollo con Vite
npm run build        # Build para producción
npm run preview      # Preview del build
npm run lint         # Linter ESLint
netlify dev          # Desarrollo con Functions locales
netlify deploy       # Deploy a Netlify
```

## 📝 Notas Importantes

- **Modo Desarrollo**: La autenticación se desactiva automáticamente en `localhost` para facilitar el desarrollo
- **Producción**: Requiere autenticación completa con Supabase
- **Email Redirect**: Configurado para `https://avaluos.quetzalhabitats.com`
- **Persistencia**: Los avalúos se guardan en tabla `avaluos` de Supabase

## 🆘 Soporte

Para consultas técnicas o soporte:
- Email: contacto@quetzalhabitats.com
- WhatsApp: +57 318 638 3809

---

© 2025 Quetzal Hábitats - Sistema de Avalúo Comercial Inmobiliario