# Johnny — soluciones tecnológicas

Aplicación Next.js con App Router, React, TypeScript estricto y Tailwind CSS.
La capa inicial de Supabase usa SSR con cookies, tipos de base de datos y una
migración PostgreSQL con RLS.

## Requisitos

- Node.js compatible con Next.js 16
- Un proyecto Supabase

## Desarrollo local

```bash
npm install
Copy-Item .env.example .env.local
npm run dev
```

Configura en `.env.local` el URL y la publishable key del proyecto Supabase.
No agregues claves `service_role` a variables `NEXT_PUBLIC_*` ni al cliente.
La aplicación no incluye credenciales; las funciones que requieren Supabase
indican explícitamente cuándo falta la configuración.

## Base de datos

Aplica `supabase/migrations/20261008000000_initial_schema.sql` en el SQL Editor
de Supabase o con Supabase CLI. La migración crea las tablas, índices,
restricciones, triggers, buckets y políticas RLS para perfiles, categorías,
servicios, proyectos, solicitudes, mensajes, testimonios y configuración.

El primer usuario se registra mediante Supabase Auth y recibe el rol `USER`.
Para otorgar acceso administrativo, verifica la identidad del usuario y cambia
su rol manualmente desde el entorno confiable de administración de Supabase:

```sql
update public.profiles
set role = 'ADMIN'
where email = 'correo-verificado@example.com';
```

No expongas credenciales de administración al navegador. Las políticas RLS
verifican el rol almacenado en `profiles`; ocultar una ruta en la interfaz no
concede ni reemplaza permisos.

## Comandos

- `npm run dev`: desarrollo
- `npm run lint`: ESLint
- `npx tsc --noEmit`: verificación TypeScript
- `npm run build`: compilación de producción

## Estado de implementación

Se conservaron los componentes originales de la página y se añadió el
fundamento Supabase: clientes browser/servidor, sincronización de cookies en
`proxy.ts`, tipos y migración inicial. Las rutas Auth, el panel administrativo,
los CRUD, los formularios conectados y la carga dinámica de contenido quedan
como siguientes fases; todavía no se debe considerar una entrega completa de
producción hasta implementar y probar esas superficies con un proyecto
Supabase configurado.
