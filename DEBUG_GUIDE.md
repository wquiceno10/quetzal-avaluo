# 🔍 Guía de Diagnóstico - APIs no responden

## Problema
Cuando haces clic en "Calcular", la página se queda en blanco y las APIs no responden.

## Pasos para Diagnosticar

### 1. Verificar que el servidor esté corriendo

Abre la terminal donde ejecutaste `npm run dev:netlify` y busca:

```
✔ Vite dev server ready on port 5173
✔ Functions server is listening on 8888
```

**Si NO ves estos mensajes:**
- Detén el servidor (Ctrl+C)
- Vuelve a ejecutar: `npm run dev:netlify`

### 2. Verificar el puerto correcto

El servidor debería estar en: **http://localhost:8888**

Abre tu navegador y ve a:
- http://localhost:8888 (debería mostrar tu app)

### 3. Revisar la consola del navegador

1. Abre tu app en el navegador
2. Presiona **F12** para abrir DevTools
3. Ve a la pestaña **Console**
4. Haz clic en "Calcular"
5. Busca errores en rojo

**Errores comunes:**
- `Failed to fetch` → El servidor no está corriendo
- `404 Not Found` → La ruta de la API es incorrecta
- `500 Internal Server Error` → Error en la función (revisa variables de entorno)

### 4. Revisar la pestaña Network

1. En DevTools, ve a **Network**
2. Haz clic en "Calcular"
3. Busca la petición a `/api/perplexityAnalysis`
4. Haz clic en ella para ver:
   - **Status**: ¿200 OK o error?
   - **Response**: ¿Qué devolvió el servidor?
   - **Headers**: ¿Se envió correctamente?

### 5. Verificar variables de entorno

Abre tu archivo `.env` y verifica que tengas:

```env
SUPABASE_URL=https://tu-proyecto.supabase.co
SUPABASE_ANON_KEY=eyJ... (tu clave real)
PERPLEXITY_API_KEY=pplx-... (tu clave real)
DEEPSEEK_API_KEY=sk-... (tu clave real)
RESEND_API_KEY=re_... (tu clave real)
```

**⚠️ IMPORTANTE:**
- NO uses valores de ejemplo
- NO incluyas comillas
- Verifica que no haya espacios extra

### 6. Revisar logs del servidor

En la terminal donde corre `npm run dev:netlify`, cuando hagas clic en "Calcular" deberías ver:

```
Request from ::1: POST /api/perplexityAnalysis
```

**Si ves errores:**
- Copia el error completo
- Busca líneas que digan "Error:", "Failed:", o "undefined"

### 7. Probar manualmente con curl

Abre una nueva terminal y ejecuta:

```bash
curl -X POST http://localhost:8888/api/supabaseAuth \
  -H "Content-Type: application/json" \
  -d "{\"action\":\"getConfig\"}"
```

**Debería devolver:**
```json
{"supabaseUrl":"https://...","supabaseAnonKey":"eyJ..."}
```

### 8. Verificar que las funciones se cargaron

En la terminal de `npm run dev:netlify`, al inicio deberías ver:

```
◈ Functions server is listening on 8888

◈ Loaded function perplexityAnalysis
◈ Loaded function sendReportEmail
◈ Loaded function supabaseAuth
◈ Loaded function uploadFile
```

**Si NO aparecen:**
- Hay un error de sintaxis en las funciones
- Revisa que todas usen `export const handler`

## Soluciones Rápidas

### Si el servidor no arranca:
```bash
# Detener todo
Ctrl+C

# Limpiar y reinstalar
npm install

# Volver a ejecutar
npm run dev:netlify
```

### Si las funciones no se cargan:
```bash
# Verificar sintaxis
npm run build
```

### Si las variables de entorno no se leen:
1. Verifica que el archivo se llame exactamente `.env` (no `.env.txt`)
2. Reinicia el servidor después de editar `.env`

## Información para compartir

Si sigues teniendo problemas, comparte:

1. **Logs de la terminal** (donde corre npm run dev:netlify)
2. **Errores de la consola** del navegador (F12 → Console)
3. **Respuesta de Network** (F12 → Network → clic en la petición)
4. **Contenido de .env** (SIN las claves reales, solo los nombres)

---

**Próximo paso:** Abre DevTools (F12) y comparte qué ves en Console y Network cuando haces clic en "Calcular".
