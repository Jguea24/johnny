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

El envío público de contacto requiere configurar `NEXT_PUBLIC_TURNSTILE_SITE_KEY`,
`TURNSTILE_SECRET_KEY`, `UPSTASH_REDIS_REST_URL`,
`UPSTASH_REDIS_REST_TOKEN` y `SUPABASE_SERVICE_ROLE_KEY`. La clave de servicio
se utiliza únicamente en el servidor para insertar el mensaje después de
verificar Turnstile y aplicar el límite distribuido de Upstash; nunca debe
exponerse al navegador. Configura el widget Turnstile para los dominios usados
y `NEXT_PUBLIC_SITE_URL` debe coincidir con el hostname verificado. Sin estas
variables el formulario no acepta envíos.

## Base de datos

`supabase/migrations/20261008000000_initial_schema.sql` crea las tablas,
índices, restricciones, triggers, buckets y políticas RLS para perfiles,
categorías, servicios, proyectos, solicitudes, mensajes, testimonios y
configuración. Si ya se aplicó en el proyecto, no la vuelvas a ejecutar.

La migración `20261009160414_contact_guard_and_public_settings.sql` es una
propuesta local, aún no aplicada. Retira la inserción directa de visitantes en
`contact_messages`, conserva la inserción de servidor autorizada por la clave
de servicio y restringe la lectura pública de `site_settings` a las nueve
claves aprobadas. Solo debe aplicarse después de desplegar y configurar las
protecciones del formulario y revisar la política con el propietario de la base.
Antes de aplicarla, inspecciona las filas existentes de `site_settings` y
confirma que los valores de las claves permitidas sean exclusivamente públicos;
las políticas restringen claves y columnas, pero no detectan secretos dentro
del valor JSON de una clave marcada como pública. La política restrictiva
también oculta por Data API cualquier otra clave incluso a roles autenticados;
configuración privada, si se necesita, debe almacenarse en otra tabla no
expuesta al cliente.

El primer usuario se registra mediante Supabase Auth y recibe el rol `USER`.
El trigger `profiles_prevent_role_escalation` impide el cambio inicial del rol
desde una sesión normal porque aún no existe un administrador. Para bootstrap,
el propietario debe verificar primero la cuenta en Supabase Auth y su UUID. En
SQL Editor del proyecto, ejecuta una transacción privilegiada corta, sustituyendo
el UUID verificado:

```sql
begin;

alter table public.profiles
  disable trigger profiles_prevent_role_escalation;

update public.profiles
set role = 'ADMIN'
where id = 'UUID-verificado-del-usuario';

do $$
begin
  if not exists (
    select 1 from public.profiles
    where id = 'UUID-verificado-del-usuario' and role = 'ADMIN'
  ) then
    raise exception 'No se encontró el perfil elegido con rol ADMIN';
  end if;
end;
$$;

alter table public.profiles
  enable trigger profiles_prevent_role_escalation;

commit;
```

Antes de ejecutar la sentencia, el propietario debe verificar la identidad y
el UUID y comprobar que corresponde al perfil correcto. Ejecuta este bloque
solo desde SQL Editor con permisos de propietario del proyecto; si algún paso
falla, ejecuta `ROLLBACK` y confirma que la transacción terminó antes de
reintentar. La transacción desactiva únicamente el trigger de protección durante
el cambio exacto y lo vuelve a habilitar antes de confirmar. No desactiva RLS.
Nunca expongas este procedimiento como formulario, endpoint ni Server Action.

No expongas credenciales de administración al navegador. Las políticas RLS
verifican el rol almacenado en `profiles`; ocultar una ruta en la interfaz no
concede ni reemplaza permisos.

## Comandos

- `npm run dev`: desarrollo
- `npm run lint`: ESLint
- `npx tsc --noEmit`: verificación TypeScript
- `npm run build`: compilación de producción

## Estado de implementación

La aplicación incluye catálogos dinámicos, Auth SSR, perfil, contacto,
solicitudes y administración sujetas a autorización de servidor y RLS. La
propuesta local de endurecimiento de RLS para contacto y configuración aún no
se ha aplicado. Las variables de Turnstile, Upstash y la clave de servidor se
deben configurar antes de habilitar envíos públicos. Las operaciones contra
Supabase, los permisos remotos, las cargas de archivos y los flujos de
administración requieren pruebas manuales en un proyecto configurado antes de
considerar el despliegue de producción.

## Carrusel multimedia del Hero

La migración local `supabase/migrations/20261009190421_hero_carousel.sql`
crea `hero_slides` y `hero_carousel_settings`; no se aplica automáticamente a
ningún proyecto remoto. Revísala y aplícala primero al proyecto Supabase de
desarrollo. Las diapositivas activas son las únicas visibles con la API pública.
La configuración del autoplay se guarda en una tabla dedicada y no expone
valores de `site_settings`.

La migración inicial ya crea el bucket público `site-media` y las políticas que
permiten lectura pública y administración de objetos solo a administradores.
La migración del carrusel conserva esas políticas y limita el bucket a imágenes
JPEG, PNG, WebP o AVIF de hasta 8 MB y videos MP4 o WebM de hasta 30 MB. Las
cargas usan la sesión SSR autenticada, nombres aleatorios y validación del lado
del servidor de MIME, extensión y firma; no requieren ni exponen una clave
`service_role`. Next.js limita las Server Actions a 40 MB para admitir una carga
de video junto con su portada opcional.
La comprobación de firma valida el contenedor, pero no decodifica todo el
archivo ni garantiza que el códec sea compatible con cada navegador; si la
reproducción falla, el Hero muestra una alternativa visual.

En `/admin/carrusel`, crea o edita diapositivas, carga medios, previsualiza el
resultado, marca el contenido como publicado/borrador y ajusta el orden o la
configuración global. El autoplay viene activado cada 3.000 ms y puede
desactivarse o configurarse desde 3.000 ms hasta el límite seguro de `setInterval`
(2.147.483.647 ms); también pueden ocultarse las flechas y los indicadores. La
presentación pública pausa el autoplay al interactuar, al ocultar la pestaña o
con `prefers-reduced-motion`; solo monta el video de la diapositiva actual.

Supabase recomienda cargas TUS reanudables para archivos mayores de 6 MB. Esta
implementación usa la carga estándar existente de `supabase-js` para evitar
añadir dependencias; los videos de hasta 30 MB funcionan, pero una conexión
inestable puede requerir volver a seleccionar y cargar el archivo. Prueba el
tamaño máximo en el entorno de desarrollo antes de publicar.

Antes de publicar, revisa y aplica la migración con el flujo de cambios de
esquema de tu proyecto, verifica que `site-media` sea público y comprueba con
cuentas anónimas, `USER` y `ADMIN` que solo `ADMIN` puede modificar filas,
subir o eliminar medios. Como no hay un runner de pruebas SQL configurado en
este repositorio, quedan pendientes estas verificaciones manuales:

- `anon` solo consulta diapositivas activas y no puede escribir en las dos
  tablas ni subir o borrar objetos; `USER` tampoco puede alterar diapositivas,
  ajustes o medios.
- `ADMIN` puede crear, editar, activar, desactivar, reordenar incluso filas con
  el mismo orden, y eliminar; las imágenes/vídeos y portadas antiguas se limpian
  al reemplazar o borrar.
- Se aceptan solo MIME, extensión y firmas correspondientes; se rechazan
  imágenes mayores de 8 MB, videos mayores de 30 MB y destinos que no sean
  rutas internas o HTTPS.
- El Hero muestra solo contenido activo y conserva su presentación anterior si
  no hay diapositivas o falla Supabase. Prueba los controles, el intervalo,
  pestaña oculta, movimiento reducido, ahorro de datos y un video con códec no
  compatible.

No se ha aplicado ninguna migración ni política a un proyecto remoto desde
este repositorio.

## Progressive Web App (PWA)

La aplicación incluye `app/manifest.ts`, un service worker de mismo origen y
una página genérica de respaldo en `public/offline.html`. Para habilitar la
instalación y el funcionamiento del service worker, sirve el sitio por HTTPS
(localhost también es válido para desarrollo). El worker se registra solo en
producción, no almacena HTML, datos de Supabase, formularios, sesiones ni
respuestas de autenticación; únicamente mantiene recursos estáticos versionados
y la página offline. Formularios, inicio de sesión y datos actualizados siguen
requiriendo conexión.

Los iconos actuales se generaron desde `public/icons/johnny-mark.svg` como
marca provisional, ya que el repositorio no incluye un logotipo rasterizado
adecuado para una PWA. Al disponer del logotipo autorizado, reemplaza el SVG y
regenera `icon-192.png`, `icon-512.png`, `icon-maskable-192.png`,
`icon-maskable-512.png` y `apple-touch-icon.png`. Mantén el símbolo importante
dentro del 80% central del lienzo en las variantes maskable.

En Android y navegadores Chromium compatibles, el botón discreto aparece solo
cuando el navegador emite `beforeinstallprompt`; también se muestran
instrucciones de instalación manual apropiadas al navegador. En iPhone y iPad,
abre el sitio en Safari y elige **Compartir → Añadir a pantalla de inicio**.
Para comprobar instalación y modo offline localmente usa una compilación de
producción (`npm run build` y `npm run start`), ya que el worker no se registra
en modo desarrollo. La primera visita online debe completar la instalación del
worker antes de que esté disponible la página genérica sin conexión.
