// Bypass de autenticación solo para desarrollo local
// Este archivo permite autenticarse automáticamente en localhost sin magic links

export const isDevelopmentMode = () => {
    const href = window.location.href;
    return (
        href.includes('/editor/preview/') ||
        href.includes('/sandbox/preview-url') ||
        href.includes('server_url=') ||
        window.location.hostname === 'localhost' ||
        window.location.hostname === '127.0.0.1'
    );
};

// Usuario de desarrollo - cambiar este email si necesitas otro
export const DEV_USER_EMAIL = 'wquiceno10@gmail.com';

// Crear sesión mock para desarrollo
export const createDevSession = () => {
    if (!isDevelopmentMode()) return null;

    const mockSession = {
        user: {
            id: 'dev-user-id',
            email: DEV_USER_EMAIL,
            email_confirmed_at: new Date().toISOString(),
            created_at: new Date().toISOString(),
            role: 'authenticated',
        },
        access_token: 'dev-mock-token',
        refresh_token: 'dev-mock-refresh',
        expires_at: Date.now() + 86400000, // 24 horas
    };

    // Guardar en localStorage para que persista
    localStorage.setItem('dev_session', JSON.stringify(mockSession));
    return mockSession;
};

// Obtener usuario de desarrollo
export const getDevUser = () => {
    if (!isDevelopmentMode()) return null;

    let session = null;
    try {
        const stored = localStorage.getItem('dev_session');
        if (stored) {
            session = JSON.parse(stored);
        }
    } catch (e) {
        console.log('No dev session found, creating new one');
    }

    if (!session) {
        session = createDevSession();
    }

    return session?.user || null;
};
