# 🛠️ Guía para Correr Workers en Local

He configurado scripts automáticos en `package.json` para facilitar esto. Sigue estos pasos:

## 1. Configurar Entorno Frontend (.env.local)

Edita tu archivo `.env.local` en la raíz del proyecto (`d:\Desktop\Diseño\Quetzal Habitats\01_Marketing\quetzal-avaluo\.env.local`) y asegura que las URLs apunten a los puertos locales que definí:

```ini
# .env.local
VITE_WORKER_ANALYSIS_URL=http://localhost:8787
VITE_WORKER_EMAIL_URL=http://localhost:8788
VITE_WORKER_UPLOAD_URL=http://localhost:8789

# Tus otras variables (Supabase) déjalas igual
```

## 2. Configurar Secretos de Workers (.dev.vars)

Asegúrate de que cada worker tenga su archivo `.dev.vars` con las claves necesarias.

**Analysis (`cloudflare/avaluos-api-analysis/.dev.vars`):**
```ini
PERPLEXITY_API_KEY=tu_clave_perplexity
DEEPSEEK_API_KEY=tu_clave_deepseek
```

**Email (`cloudflare/avaluos-api-email/.dev.vars`):**
```ini
RESEND_API_KEY=tu_clave_resend
```

**Upload (`cloudflare/avaluos-api-upload/.dev.vars`):**
```ini
# (Si usa Supabase o R2, pon las claves aquí)
SUPABASE_URL=...
SUPABASE_ANON_KEY=...
```

## 3. Ejecutar los Workers

Necesitas abrir **3 terminales nuevas** (una para cada worker) y correr:

**Terminal 1 (Analysis):**
```bash
npm run worker:analysis
```

**Terminal 2 (Email):**
```bash
npm run worker:email
```

**Terminal 3 (Upload):**
```bash
npm run worker:upload
```

Una vez corran, verás en la consola que están escuchando en `http://localhost:8787`, `8788`, y `8789`.

## 4. Probar

Con el frontend corriendo (`npm run dev`), ahora todas las peticiones irán a tus workers locales. Podrás debuggear los logs directamente en las terminales de los workers.
