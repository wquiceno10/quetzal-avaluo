# Quetzal Avalúo - Sistema de Avalúo Comercial Inmobiliario

Aplicación web profesional para avalúos comerciales de propiedades inmobiliarias usando Inteligencia Artificial.

## 🏗️ Arquitectura y Tecnologías (V16)

- **Frontend**: React + Vite + TailwindCSS + shadcn/ui
  - Hosting: Cloudflare Pages
- **Backend**: Cloudflare Workers (Microservicios)
  - `avaluos-api-analysis`: Motor principal de análisis
  - `avaluos-api-email`: Servicio de emails transaccionales
  - `avaluos-api-upload`: Gestión de subida de archivos
- **Búsqueda y Datos**: Firecrawl (Búsqueda y extracción estructurada)
- **Inteligencia Artificial**: OpenAI GPT-4o (Analista Inmobiliario)
- **Base de Datos y Auth**: Supabase

## 📁 Estructura del Proyecto

```
quetzal-avaluo/
├── cloudflare/                  # Backend 100% Serverless
│   ├── avaluos-api-analysis/    # WORKER PRINCIPAL: Firecrawl + Análisis
│   ├── avaluos-api-email/       # WORKER: Envío de emails (Resend)
│   └── avaluos-api-upload/      # WORKER: Subida a R2/Storage
├── src/
│   ├── components/              # Componentes React
│   ├── pages/                   # Rutas de la App
│   └── lib/                     # Utilidades compartidas (Email Generator, etc)
├── docs/                        # Documentación
│   └── changelog/               # Historial de actualizaciones
└── README.md
```

## 🔐 Configuración de Entorno (Cloudflare)

Configura los siguientes **Secrets** en tus Workers via `wrangler secret put` o Dashboard:

### `avaluos-api-analysis`
```bash
FIRECRAWL_API_KEY=fc-tus_credenciales...    # Búsqueda
OPENAI_API_KEY=sk-tus_credenciales...       # Análisis
SUPABASE_URL=...
SUPABASE_ANON_KEY=...
WORKER_EMAIL_URL=https://avaluos-api-email.quetzalhabitats.workers.dev
```

### `avaluos-api-email`
```bash
RESEND_API_KEY=re_tus_credenciales...
```

## 🔄 Flujo de Análisis V2 (Firecrawl)

1. **Input**: Usuario ingresa datos en `Step1Form`.
2. **Search**: El worker invoca a **Firecrawl** con un prompt geo-localizado inteligente:
   - *"Prioriza el barrio X o conjunto Y, pero incluye zonas aledañas..."*
3. **Extraction**: Firecrawl extrae datos estructurados (Precio, Área, Ubicación) directamente del HTML.
4. **Analysis**: OpenAI analiza los comparables, aplica normalización y calcula el valor de mercado.
5. **Auto-Email**: Al finalizar, el worker genera el reporte HTML (idéntico a la web) y lo envía automáticamente al usuario.

## 💻 Desarrollo Local

Para correr todo el sistema localmente, necesitas 4 terminales:

```bash
# 1. Frontend
npm run dev

# 2. Worker Análisis
npm run worker:analysis

# 3. Worker Email
npm run worker:email

# 4. Worker Upload (opcional)
npm run worker:upload
```

> **Nota:** En desarrollo, el sistema usa `DEV_EMAIL` (definido en `.dev.vars`) como fallback para enviar correos de prueba.

## 🚀 Deploy

El despliegue se maneja separadamente para Frontend y Workers:

**Frontend (Pages):**
```bash
git push origin main  # Dispara GitHub Actions
```

**Workers:**
```bash
cd cloudflare/avaluos-api-analysis
npx wrangler deploy
```

## 📝 Changelog
Consulta `docs/changelog/` para ver el historial detallado de actualizaciones y mejoras por versión.

---

© 2026 Quetzal Hábitats - Sistema de Avalúo Comercial Inmobiliario