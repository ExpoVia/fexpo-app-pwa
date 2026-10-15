# Integración PWA · revisión del 15 de octubre de 2026

## Resultado

Implementación de la siguiente fase en `fexpo-app-pwa`, con contratos del backend Nest de Expo, sin modificar los otros proyectos. Se conservan las superficies claras y los colores oscuros `#101012`, `#1C1C1D`, `#262626`.

- `npm run typecheck`: correcto.
- `npm test`: **22 pruebas unitarias**, todas correctas.
- `npm run build:live` y `npm run build:demo`: correctos. Se dejó `dist` en **modo live**.
- Playwright conectado: **14 pruebas**, todas correctas; API, identidad Google, eventos NDEF, reproducción y pulsos de vibración controlados por fixtures.
- Playwright demo: **13 pruebas**, todas correctas.
- Total: **49 pruebas aprobadas**. Formato Prettier y revisión `git diff --check` correctos.
- Precache: 39 recursos, aproximadamente 3.7 MiB, incluidos los cuatro MP3. Decodificación MP3 real y lectura de archivos con el contexto del navegador sin red verificadas. No se encontraron endpoints `/api/` en CacheStorage.

## Contratos y estados cubiertos

Google web → `POST /auth/google`, sesión restaurada con cookie de refresh HttpOnly, rotación agrupada, reintento 401 sin cambiar el requestKey, protección contra respuestas tardías tras salir de una cuenta, cierre sin red que impide restauración automática de la sesión al recargar, eliminación de cachés privadas al cerrar sesión.

Catálogo paginado, stand, actividades, favoritos, mapa publicado con coordenadas normalizadas; QR personal del backend, gamificación, visitas y racha. El saldo y el nivel proceden del servidor, también cuando difieren de los premios devueltos por un check-in. Se corrigió una carrera observada: si una consulta anterior al check-in estaba en curso al recuperar red, se hace una nueva consulta después de confirmar la visita.

NFC con NDEF simulado: UID normalizado, stand por URL/contexto, rechazo de varios stands, feria incorrecta o UID ausente. Abrir el enlace nunca acredita puntos. Cancelación y retiro de listeners; sin Web NFC se ofrece Mi QR. Lecturas sin conexión se persisten por cuenta/evento con clave estable, sin sumar puntos; reintentos, errores definitivos y fallo de almacenamiento cubiertos.

Audio: un único canal, NFC interrumpe voz, bienvenida/ayuda una vez por sesión de la app, aviso después del comprobante, cancelación al ocultar/salir de pantalla. En navegador se verificaron las llamadas a reproducción y dos pulsos de 80 ms para lectura y aviso; no se afirma que eso compruebe un motor físico de vibración. Sonidos, guía de voz y vibración tienen preferencias persistidas.

## Revisión visual

Modo conectado: 10 rutas a 320, 390 y 1440 px, claro y oscuro (60 combinaciones). Demo: 11 rutas a 320, 390, 768 y 1440 px en ambos temas (88 combinaciones). Sin desbordamiento horizontal ni errores de ejecución del navegador en esas revisiones.

Se inspeccionaron visualmente capturas de perfil móvil claro, mapa oscuro, check-in claro, escritorio claro/oscuro y la pantalla real de conexión pendiente. Se corrigió el pasaporte conectado, que inicialmente heredaba texto claro sobre una superficie clara; ahora usa la superficie de marca correspondiente al tema. Se mantuvieron las imágenes aprobadas y la barra de búsqueda solo en Mapa.

Las capturas `screenshots/integration/light-*` y `dark-*` usan **respuestas controladas**, no datos obtenidos del backend desplegado. El plano simple contiene un stand intencionadamente. La barra inferior fija queda en la posición del viewport dentro de las capturas de página completa; al desplazarse en la app, las opciones inferiores siguen siendo accesibles.

- [Perfil claro](screenshots/integration/light-profile.png)
- [Mapa oscuro](screenshots/integration/dark-map.png)
- [Check-in claro](screenshots/integration/light-scan.png)
- [Escritorio oscuro](screenshots/integration/dark-desktop.png)
- [Vista real sin interceptar API](screenshots/integration/actual-backend-home.png)
- [Resultado de la vista real](screenshots/integration/actual-preview.json)

## Disponibilidad externa y pruebas pendientes

El usuario proporcionó primero `https://fexpo-backend.onrender.com/`, y después la configuración local de Expo con `http://192.168.1.9:3000` y el evento local `e0000000-0000-4000-8000-000000000001`. Se guardó esa última configuración en `.env.local`, ignorado por Git. El OAuth client ID es público y coincide con el compartido para Expo.

Durante esta sesión:

- Render respondió inicialmente 503; la segunda consulta expiró por timeout.
- `http://127.0.0.1:3000` rechazó la conexión.
- `http://192.168.1.9:3000` no respondió dentro del tiempo de espera.
- La vista real en 4174 mostró correctamente «Conexión pendiente», sin sustituir el catálogo por fixtures, sin errores JS y sin desbordamiento.

Por ello **no se verificó una sesión Google real, un check-in contra la base real ni NFC/vibración en un celular físico**. Falta levantar o indicar un backend accesible, comprobar que contiene el evento correspondiente y autorizar el origen de la PWA en Google Cloud. Para Render se requiere su propio UUID de evento; el UUID local no garantiza que exista allí.

Las tarjetas deben admitir NDEF y tener su UID registrado. La API de navegador no equivale a la lectura nativa de cualquier tarjeta NFC. La PWA no escribe etiquetas. Para NFC en el celular se necesita HTTPS; localhost es válido para la revisión de escritorio, una IP LAN HTTP no valida el flujo de hardware.

Misiones/canjes reales, catálogo de productos con precios, logos/redes y notificaciones push quedan sujetos a sus endpoints y publicación. La fase implementada usa los endpoints disponibles; los juegos y premios ficticios están limitados a demo. No se regeneraron voces ni se llamó a ElevenLabs; los hashes de los cuatro audios coinciden con Expo. Procedencia: `audio-sources.json`.

## Referencias de implementación

- [Web NFC en Chrome](https://developer.chrome.com/docs/capabilities/nfc)
- [Botón oficial de Google Identity Services](https://developers.google.com/identity/gsi/web/guides/display-button)
- [Vibration API](https://developer.mozilla.org/en-US/docs/Web/API/Vibration_API)
