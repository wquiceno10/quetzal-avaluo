// API Client para Cloudflare Workers
// Reemplaza las Netlify Functions con Cloudflare Workers dedicados

// Mapeo de funciones a URLs de Workers
const WORKER_URLS = {
    perplexityAnalysis: import.meta.env.VITE_WORKER_ANALYSIS_URL,
    sendReportEmail: import.meta.env.VITE_WORKER_EMAIL_URL,
    uploadFile: import.meta.env.VITE_WORKER_UPLOAD_URL
};

export const api = {
    functions: {
        /**
         * Invoca un Cloudflare Worker
         * @param {string} functionName - Nombre del worker (perplexityAnalysis, sendReportEmail, supabaseAuth, uploadFile)
         * @param {object} payload - Datos a enviar al worker
         * @returns {Promise<{data: any}>} - Respuesta del worker
         */
        async invoke(functionName, payload = {}) {
            const workerUrl = WORKER_URLS[functionName];

            if (!workerUrl) {
                throw new Error(`Worker URL no configurada para: ${functionName}`);
            }

            const response = await fetch(workerUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
            });

            const data = await response.json();
            return { data };
        }
    }
};
