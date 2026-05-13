'use client';

export default function GlobalError({
  error: _error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="fr">
      <body style={{ fontFamily: 'system-ui, sans-serif', margin: 0, padding: '2rem' }}>
        <div style={{ maxWidth: 480, margin: '10vh auto', textAlign: 'center' }}>
          <h2 style={{ fontSize: '1.125rem', fontWeight: 600 }}>Erreur critique</h2>
          <p style={{ color: '#64748b', fontSize: '0.875rem', marginTop: '0.75rem' }}>
            L&apos;application n&apos;a pas pu charger correctement. Réessayez ou rechargez la page.
          </p>
          <button
            type="button"
            onClick={() => reset()}
            style={{
              marginTop: '1.25rem',
              padding: '0.5rem 1rem',
              borderRadius: '0.5rem',
              border: 'none',
              background: '#2563eb',
              color: '#fff',
              fontWeight: 500,
              cursor: 'pointer',
            }}
          >
            Réessayer
          </button>
        </div>
      </body>
    </html>
  );
}
