# Tropas Tunuyán — Equipamiento e Indumentaria Táctica

Aplicación web para el comercio **Tropas Tunuyán**, especializado en equipamiento e indumentaria para fuerzas armadas y seguridad privada.

## Stack Tecnológico
- **Framework:** Next.js 14 (App Router)
- **Lenguaje:** TypeScript (strict)
- **Estilos:** Tailwind CSS
- **Base de datos:** Supabase (PostgreSQL)

## Estructura del Proyecto
```
src/
├── app/
│   ├── (public)/         # Vistas públicas (catálogo)
│   │   └── catalogo/
│   └── admin/            # Panel de administración
│       └── inventario/
├── components/           # Componentes reutilizables
├── lib/                  # Utilidades y cliente de Supabase
└── types/                # Tipos TypeScript
```

## Configuración
1. Copiar `.env.local.example` a `.env.local` y completar las credenciales de Supabase.
2. Ejecutar `npm install` para instalar dependencias.
3. Ejecutar `npm run dev` para iniciar el servidor de desarrollo.

## Esquema de Base de Datos
Ver `database/schema.sql` para el esquema completo de PostgreSQL.
