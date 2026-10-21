import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Tropas Tunuyán — Equipamiento Táctico e Indumentaria',
  description:
    'Tropas Tunuyán: equipamiento e indumentaria para fuerzas armadas, seguridad privada y uso táctico. ' +
    'Catálogo completo con precios, talles y disponibilidad.',
  keywords: [
    'equipamiento táctico',
    'indumentaria militar',
    'fuerzas armadas',
    'seguridad privada',
    'Tunuyán',
    'Mendoza',
    'uniformes tácticos',
    'borceguíes',
    'chalecos antibalas',
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es" className="dark" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              try {
                const theme = localStorage.getItem('tropas-theme');
                if (theme === 'light') {
                  document.documentElement.classList.remove('dark');
                  document.documentElement.classList.add('light');
                } else {
                  document.documentElement.classList.add('dark');
                }
              } catch (e) {}
            `,
          }}
        />
      </head>
      <body className="min-h-screen transition-colors duration-200">
        {children}
      </body>
    </html>
  );
}
