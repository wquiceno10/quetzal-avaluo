# 🚀 Configuración Local - Quetzal Avalúo

Esta guía te ayudará a configurar y probar tu aplicación localmente con las Netlify Functions.

## 📋 Prerequisitos

- Node.js instalado
- Cuenta de Supabase configurada
- API Keys de los servicios necesarios

## 🔧 Configuración Paso a Paso

### 1. Crear archivo `.env` local

Crea un archivo `.env` en la raíz del proyecto con el siguiente contenido:

```env
# SUPABASE
SUPABASE_URL=https://tu-proyecto.supabase.co
SUPABASE_ANON_KEY=tu_supabase_anon_key_aqui

# API KEYS
PERPLEXITY_API_KEY=tu_perplexity_api_key_aqui
DEEPSEEK_API_KEY=tu_deepseek_api_key_aqui
RESEND_API_KEY=tu_resend_api_key_aqui
```

**⚠️ IMPORTANTE:** Reemplaza los valores de ejemplo con tus credenciales reales.

### 2. Configurar Supabase Storage

Crea el bucket para almacenar documentos:

1. Ve a [Supabase Dashboard](https://app.supabase.com)
2. Selecciona tu proyecto
3. Navega a **Storage** → **Create a new bucket**
4. Nombre: `avaluo-documents`
5. **Público**: ✅ Sí (para URLs accesibles)
6. Haz clic en **Create bucket**

### 3. Instalar dependencias

```bash
npm install
```

### 4. Ejecutar en modo desarrollo

Para probar con las Netlify Functions localmente:

```bash
npm run dev:netlify
```

Este comando:
- ✅ Inicia Vite en modo desarrollo
- ✅ Ejecuta las Netlify Functions localmente en `http://localhost:8888`
- ✅ Permite probar las APIs sin desplegar

### 5. Probar las APIs

Una vez ejecutando `npm run dev:netlify`, las funciones estarán disponibles en:

- **Upload File**: `http://localhost:8888/api/uploadFile`
- **Supabase Auth**: `http://localhost:8888/api/supabaseAuth`
- **Perplexity Analysis**: `http://localhost:8888/api/perplexityAnalysis`
- **Send Email**: `http://localhost:8888/api/sendReportEmail`

## 🧪 Cómo Probar

### Probar Upload de Archivos

1. Ejecuta `npm run dev:netlify`
2. Abre la app en el navegador (normalmente `http://localhost:8888`)
3. Ve al formulario de avalúo (Step 1)
4. Intenta subir un archivo PDF o imagen
5. Verifica en la consola del navegador que no haya errores
6. Verifica en Supabase Storage que el archivo se haya subido

### Probar Análisis de Mercado

1. Completa el formulario hasta el Step 2
2. Haz clic en "Analizar Mercado"
3. Verifica en la consola que la función se ejecute correctamente
4. Revisa que los resultados se muestren en la UI

### Probar Envío de Email

1. Completa todo el formulario hasta el Step 4
2. Envía el avalúo
3. Verifica que recibas el email con el reporte

## 🐛 Troubleshooting

### Error: "Supabase not configured"
- Verifica que tu archivo `.env` tenga las variables correctas
- Asegúrate de que `SUPABASE_URL` y `SUPABASE_ANON_KEY` estén configuradas

### Error al subir archivos
- Verifica que el bucket `avaluo-documents` exista en Supabase
- Verifica que el bucket sea **público**
- Revisa los logs de la función en la terminal

### Las funciones no responden
- Asegúrate de estar usando `npm run dev:netlify` (no solo `npm run dev`)
- Verifica que el puerto 8888 no esté ocupado
- Revisa los logs en la terminal

## 📦 Build para Producción

```bash
npm run build
```

## 🚀 Deploy a Netlify

1. Configura las variables de entorno en Netlify Dashboard:
   - Settings → Environment variables → Add variables
2. Agrega todas las variables del archivo `.env`
3. Haz push a tu repositorio
4. Netlify desplegará automáticamente

## 📝 Notas

- El archivo `.env` está en `.gitignore` y **NO se subirá a Git**
- Las variables de producción deben configurarse en Netlify Dashboard
- Nunca compartas tus API keys en el código fuente
