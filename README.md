# Fexpo App PWA

## Mapa del recinto

En modo local/demo, Mapa ofrece los planos originales en 2D y una vista interior 3D construida con los mismos contornos y lotes. Incluye selector de pabellón/planta, búsqueda, fichas de stands, NFC y GPS relativo para mover el avatar al caminar. Escala y orientación GPS provisionales, pendientes de georreferenciación. Detalles y prueba: [docs/CAMPUS_MAP.md](docs/CAMPUS_MAP.md).

App de visitantes en React + Vite + TypeScript, con modo local independiente del backend y un modo conectado preparado para retomarlo. Conserva la interfaz clara/oscura de los bocetos.

## Modo actual: sin backend de Fexpo

**Entrada actual de prueba:** «Continuar con Google» permanece como mock deshabilitado, marcado «Próximamente». «Entrar y probar la app» crea un visitante de prueba local sin Google ni backend; la sesión se recuerda en este dispositivo y se limpia desde Perfil. El lector NFC real continúa disponible. El acceso Google descrito abajo queda preparado para reactivarlo después, pero ya no se ejecuta desde la bienvenida.

`VITE_DATA_MODE=local` muestra primero la bienvenida de FIPAZ con su imagen de fondo y el botón de Google. El acceso usa Google Identity Services y consulta el perfil directamente a Google con `openid profile`; **no llama a la API de Fexpo**. Requiere internet para conectar Google por primera vez. Se guarda únicamente el perfil de presentación en este dispositivo, no tokens OAuth ni credenciales para el backend. La identidad guardada permite volver a explorar sin red; no es una sesión privilegiada del servidor.

El catálogo, el mapa, favoritos, juegos y progreso usan los datos locales de demostración. NFC hace una lectura **real**, disponible también desde «Probar mi NFC» antes de Google. Muestra UID si el navegador lo expone, tipos NDEF y contenido. Acepta una etiqueta legible aunque no contenga un stand de Fexpo. No escribe la tarjeta, no envía su contenido y no convierte esta prueba en puntos o visitas oficiales. Check-in usa este lector real en modo local; las simulaciones siguen solo en modo demo.

```powershell
npm run build:local
npm run preview
npm run test:e2e:local
```

El modo conectado permanece disponible mediante `VITE_DATA_MODE=live` y `npm run build:live` para retomarlo cuando regrese el backend. El informe anterior de integración corresponde a esa fase; esta fase tiene su propio informe en [docs/LOCAL_MODE_QA.md](docs/LOCAL_MODE_QA.md).

### Google: error 400 origin_mismatch

Confirmado en Chrome del celular: falta autorizar el origen. En Google Cloud Console, seleccionar el proyecto **492704011109**, abrir **Google Auth Platform → Clients** (o **APIs y servicios → Credenciales**) y editar el cliente **Aplicación web** usado en `.env.local`:

```text
492704011109-3479bq36uucvnqlsjrlfatur1fb3kjhu.apps.googleusercontent.com
```

En **Orígenes de JavaScript autorizados**, agregar sin rutas ni barra final:

```text
http://localhost
http://localhost:4174
http://127.0.0.1
http://127.0.0.1:4174
```

Para usar desarrollo agregar también `http://localhost:5174` y `http://127.0.0.1:5174`. Guardar. Estos valores van en orígenes JavaScript; este flujo popup no requiere configurar un callback propio en URI de redirección. Si la app es externa y está en modo Testing, agregar el Gmail de prueba en **Audience → Test users**. Completar nombre Fexpo, correo de soporte y contacto en Branding si se solicita. No hace falta un secreto OAuth en el frontend.

Después cerrar la ventana de error, recargar Fexpo y pulsar Google otra vez. La aplicación ya está configurada con ese Client ID; si se usa otro cliente web, cambiar `VITE_GOOGLE_CLIENT_ID` y volver a compilar. Guía oficial: https://developers.google.com/identity/oauth2/web/guides/get-google-api-clientid

### Prueba NFC en el Android conectado por USB

Se preparó `adb reverse tcp:4174 tcp:4174` y se abrió **http://localhost:4174/** en Chrome del celular. Chrome lo reconoció como contexto seguro, con Web NFC disponible. ADB confirmó NFC encendido y pantalla desbloqueada. El usuario y el DOM de la PWA confirmaron la lectura real de su tarjeta, con UID expuesto y cero solicitudes a `/api/`.

Para repetir, mantener el preview encendido y ejecutar desde este proyecto:

```powershell
.\.local-tools\platform-tools\adb.exe reverse tcp:4174 tcp:4174
.\.local-tools\platform-tools\adb.exe shell am start -a android.intent.action.VIEW -d http://localhost:4174/ -p com.android.chrome
```

Pulsar **Probar mi NFC → Leer mi tarjeta NFC**, conceder permiso y después acercar la tarjeta. Las herramientas Android se descargaron de Google en `.local-tools`, que está ignorado por Git. Mantener el USB conectado para este acceso. Fuera de USB, usar un despliegue HTTPS; una dirección LAN HTTP no habilita Web NFC.

## Ejecutar

Node.js 22.12 o posterior compatible con Vite 7.

```powershell
npm install
Copy-Item .env.example .env.local
# Modo local: confirmar VITE_GOOGLE_CLIENT_ID. Backend y evento solo para live.
npm run dev
```

Desarrollo: http://localhost:5174. Producción local:

```powershell
npm run build:live
npm run preview
```

Vista previa: http://127.0.0.1:4174. Reiniciar Vite después de cambiar variables. `VITE_DATA_MODE=demo` mantiene una demostración aislada; `live` usa exclusivamente el servidor. Sin configuración no se conectan datos reales automáticamente.

## Configuración

- `BACKEND_URL`: URL raíz del backend, solo en el servidor. Admite terminar en `/api/v1`; el bridge la normaliza.
- `VITE_EVENT_ID`: UUID del evento, no su slug.
- `VITE_GOOGLE_CLIENT_ID`: cliente OAuth de tipo aplicación web. Debe coincidir con `GOOGLE_CLIENT_ID` del backend.
- `VITE_DATA_MODE`: `local`, `live` o `demo`.

En Google Cloud, autorizar exactamente los orígenes que se usen: `http://localhost:5174`, `http://127.0.0.1:4174` y el dominio HTTPS de producción. Configurar también los usuarios de prueba si el consentimiento OAuth está en modo prueba. No se necesita un secreto OAuth en el frontend.

El evento `e0000000-0000-4000-8000-000000000001` pertenece a `fexpo_database/local-dev/init/90_seed_test.sql`. **No asumir que existe en Render**: para producción se necesita el UUID publicado allí.

`.env.local` está ignorado por Git. No agregar claves de ElevenLabs, JWT secretos o credenciales de base de datos a variables `VITE_*`.

## Funciones conectadas

- Google Identity Services → login del backend con `platform: web`.
- Access token en memoria; refresh token en cookie `HttpOnly`, `SameSite=Strict`, `Secure` en producción. Rotación y reintento de un 401; el refresh nunca se entrega al JavaScript del navegador.
- Catálogo paginado, perfiles, actividades y promociones publicadas; favoritos autenticados.
- Mapas publicados: pisos, geometría, zonas, estructuras, POI y ubicaciones normalizadas. Lista accesible y búsqueda solo en Mapa.
- Saldo, score, nivel, visitas y racha del servidor. Sin sumar puntos o calcular niveles localmente en modo real.
- QR personal emitido por el backend. Consulta del progreso cada 4 segundos al mostrarlo; cada 15 segundos en otras pantallas y al volver al primer plano.
- Lectura Web NFC, validación de contexto y envío del UID al endpoint de check-in. Abrir un enlace del stand nunca acredita una visita.
- Cola offline en IndexedDB por usuario y evento, con `requestKey` estable, reintentos al recuperar conexión y estados de error definitivos. No se acreditan puntos pendientes. Si no se puede persistir, no se afirma haber guardado la lectura.
- Caché del catálogo/mapa y perfiles públicos. Datos privados separados por cuenta; cierre de sesión borra su QR, progreso local y pendientes. La sesión requiere red para restaurarse al recargar: el QR offline está disponible mientras la sesión validada siga abierta; tras recargar sin conexión hay que volver a iniciar sesión al recuperar red.
- Avisos dentro de la app por nuevas visitas confirmadas, incluidas las registradas por el staff con QR. No son notificaciones push del sistema.

El backend actual no tiene endpoints de misiones/canje estables implementados. En modo real esas pantallas muestran el progreso confirmado y un estado de próxima publicación; los juegos y canjes simulados permanecen exclusivamente en demo. Logo, redes y catálogo de productos se muestran solo cuando exista un contrato publicado; los tags actuales son información del expositor, no productos con precio inventado.

## Audio y vibración

Se reutilizan exactamente cuatro archivos aprobados de Expo, sin regenerar voces ni consumir API:

| Uso                                     | Archivo               |
| --------------------------------------- | --------------------- |
| Bienvenida, voz femenina Matilda        | `matilda-welcome.mp3` |
| Instrucciones NFC, voz femenina Matilda | `matilda-nfc.mp3`     |
| Avisos                                  | `sonido-05.mp3`       |
| Lectura NFC                             | `sonido-07.mp3`       |

Una sola reproducción a la vez; el NFC interrumpe voz y tiene prioridad. El aviso espera a cerrar el comprobante. La voz se reproduce una vez por sesión de la app y se detiene al salir de su pantalla. Al ocultar la app se cancela el audio. El navegador necesita primero una interacción del usuario para permitir reproducción. Perfil permite activar/desactivar sonidos, guía de voz y vibración; no incluye laboratorio de pruebas.

Se solicita un pulso de 80 ms al empezar cada efecto de sonido. Si el dispositivo no implementa Vibration API, se conserva el audio. Las preferencias no se mezclan con las credenciales. Los cuatro MP3 se incluyen en la caché offline del service worker.

## NFC y dispositivos

Web NFC requiere HTTPS, Android/navegador compatible, hardware habilitado, permiso concedido, pantalla visible y desbloqueada. Las etiquetas deben admitir NDEF; una tarjeta sin formato NDEF que puede leerse en la app nativa no necesariamente es legible por Web NFC. Preparar un registro como:

```text
https://DOMINIO/e/UUID_EVENTO/s/UUID_STAND
```

También se acepta `/stands/UUID_STAND`, JSON con `standId`, o el contexto `/scan?stand=UUID_STAND`. Debe existir un UID real y registrado en el backend. La PWA no escribe ni modifica tarjetas.

iPhone y navegadores sin Web NFC usan **Mi QR**, que el personal del stand escanea con el flujo de check-in manual del backend. Una etiqueta URL puede abrir la PWA, pero no proporciona el UID. Una IP LAN con HTTP sirve para revisar la interfaz; para instalar y probar NFC en el celular se necesita HTTPS. No hay lectura en segundo plano.

## Desplegar en Vercel

Configurar el proyecto con React/Vite, build `npm run build:live`, output `dist`, y las variables anteriores. `api/backend.ts` y `api/session/[action].ts` usan el bridge Node del mismo origen; la reescritura SPA excluye `/api/`. Así no depende de habilitar CORS en Nest. En desarrollo y preview el mismo bridge se monta en Vite.

El bridge permite solo rutas necesarias y evita caché de API. El service worker precachea recursos estáticos; excluye `/api/` del fallback de navegación y no cachea solicitudes privadas. No desplegar únicamente `dist` en un hosting estático sin implementar también el bridge.

## Verificar

```powershell
npm run typecheck
npm test
npx playwright install chromium
npm run build:live
npm run test:e2e:live
npm run build:demo
npm run test:e2e:demo
# Restaurar la versión local actual al terminar:
npm run build:local
```

Para un Chromium existente: `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH`. Las pruebas conectadas interceptan la API y simulan NDEF y vibración: verifican contratos e interacciones, no hardware ni Google real. Las pruebas de demo cubren sus flujos de forma independiente.

Evidencia y límites de la revisión: [docs/INTEGRATION_QA.md](docs/INTEGRATION_QA.md). No se modifican Expo ni el backend al trabajar en este proyecto.
