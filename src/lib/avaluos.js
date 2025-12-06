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
    // La tabla 'avaluos' no tiene columna user_id, solo usamos email para identificar
    const { data, error } = await supabase
        .from("avaluos")
        .insert({
            email,
            tipo_inmueble: tipoInmueble,
            barrio,
            ciudad,
            valor_final: valorFinal,
            codigo_avaluo: codigoAvaluo,
            payload_json: payloadJson
        })
        .select("id")
        .single();

    if (error) {
        console.error("Error guardando avalúo en Supabase:", error);
        throw error;
    }

    return data.id;
}
