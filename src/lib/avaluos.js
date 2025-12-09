import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
    import.meta.env.VITE_SUPABASE_URL,
    import.meta.env.VITE_SUPABASE_ANON_KEY
);

/**
 * Guarda un avalúo en la base de datos de Supabase.
 * @param {Object} params - Parámetros del avalúo
 * @param {string} params.email - Email del usuario
 * @param {string} params.tipoInmueble - Tipo de inmueble (casa, apartamento, lote)
 * @param {string} params.barrio - Barrio
 * @param {string} params.ciudad - Ciudad/Municipio
 * @param {number} params.valorFinal - Valor comercial estimado final
 * @param {string} params.codigoAvaluo - Código único del avalúo
 * @param {Object} params.payloadJson - Objeto JSON completo con el análisis y resultados
 * @returns {Promise<string>} - ID del avalúo insertado
 */
export async function guardarAvaluoEnSupabase({
    email,
    tipoInmueble,
    barrio,
    ciudad,
    valorFinal,
    codigoAvaluo,
    payloadJson,
}) {
    const insertData = {
        email,
        tipo_inmueble: tipoInmueble,
        barrio,
        ciudad,
        valor_final: valorFinal,
        codigo_avaluo: codigoAvaluo,
        payload_json: payloadJson,
        // estrato y estado_inmueble ya están incluidos en payload_json
        // No se insertan como columnas separadas porque no existen en la tabla
    };

    console.log("[SUPABASE] Inserting avalúo:", {
        email,
        tipo_inmueble: tipoInmueble,
        barrio,
        ciudad,
        codigo_avaluo: codigoAvaluo,
        valor_final: valorFinal
    });

    const { data, error } = await supabase
        .from("avaluos")
        .insert(insertData)
        .select("id")
        .single();

    if (error) {
        console.error("[SUPABASE] ❌ Error guardando avalúo:", {
            error,
            message: error.message,
            details: error.details,
            hint: error.hint,
            code: error.code,
            insertData
        });
        throw error;
    }

    console.log("[SUPABASE] ✅ Avalúo guardado con ID:", data.id);
    return data.id;
}

// Force rebuild - 2025-12-09
