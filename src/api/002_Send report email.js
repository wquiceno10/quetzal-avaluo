import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';
import { Resend } from 'npm:resend@2.0.0';

const resend = new Resend(Deno.env.get('RESEND_API_KEY'));

Deno.serve(async (req) => {
    // Función pública - no requiere autenticación de usuario

    let body;
    try {
        body = await req.json();
    } catch (e) {
        return Response.json({ error: 'JSON inválido', details: e.message }, { status: 400 });
    }

    const { to, subject, htmlBody } = body;

    if (!to || !subject || !htmlBody) {
        return Response.json({ error: 'Faltan campos requeridos: to, subject, htmlBody' }, { status: 400 });
    }

    // Validar formato de email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(to)) {
        return Response.json({ error: 'Formato de correo electrónico inválido' }, { status: 400 });
    }

    try {
        const { data, error } = await resend.emails.send({
            from: 'Quetzal Hábitats <contacto@quetzalhabitats.com>',
            to: [to],
            subject: subject,
            html: htmlBody
        });

        if (error) {
            console.error('Resend error:', error);
            return Response.json({ error: 'Error al enviar el correo', details: error.message || JSON.stringify(error) }, { status: 500 });
        }

        return Response.json({ success: true, message: 'Correo enviado exitosamente', id: data.id });
    } catch (error) {
        console.error('Error enviando email:', error);
        return Response.json({ error: 'Error al enviar el correo', details: error.message }, { status: 500 });
    }
});