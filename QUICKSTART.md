# 🚀 Inicio Rápido - Probar tu App

## Paso 1: Configurar Variables de Entorno

Crea un archivo `.env` en la raíz del proyecto:

```bash
# Copia este contenido y reemplaza con tus valores reales
SUPABASE_URL=https://tu-proyecto.supabase.co
SUPABASE_ANON_KEY=tu_supabase_anon_key
PERPLEXITY_API_KEY=tu_perplexity_key
DEEPSEEK_API_KEY=tu_deepseek_key
RESEND_API_KEY=tu_resend_key
```

## Paso 2: Crear Bucket en Supabase

1. Ve a https://app.supabase.com
2. Selecciona tu proyecto
3. **Storage** → **Create bucket**
4. Nombre: `avaluo-documents`
5. Público: ✅ **SÍ**

## Paso 3: Ejecutar la App

```bash
npm run dev:netlify
```

La app se abrirá en: **http://localhost:8888**

## 🧪 Probar Funcionalidades

### ✅ Upload de Archivos
1. Ve al formulario de avalúo
2. Sube un PDF o imagen
3. Verifica que aparezca en la lista
4. Revisa Supabase Storage → `avaluo-documents`

### ✅ Análisis de Mercado
1. Completa el formulario hasta Step 2
2. Haz clic en "Analizar Mercado"
3. Espera los resultados

### ✅ Envío de Email
1. Completa todo el formulario
2. Envía el avalúo
3. Verifica tu email

## 🐛 Si algo falla

Revisa la consola del navegador (F12) y la terminal donde corre `npm run dev:netlify`

Para más detalles: **SETUP_LOCAL.md**
