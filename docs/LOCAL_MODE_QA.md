# Modo local · 15 de octubre de 2026

## Actualización: acceso directo de prueba

Por pedido del usuario, Google queda como mock deshabilitado con «Próximamente» y se agrega «Entrar y probar la app». Crea un perfil «Visitante de prueba», claramente identificado en Perfil. No se carga Google Identity Services ni se consulta UserInfo desde la bienvenida. Las pruebas locales se adaptaron a entrada, persistencia y cierre del visitante de prueba. El lector NFC real permanece sin cambios. La descripción OAuth y su bloqueo posterior documentan la fase anterior, que se conserva para una reactivación futura.

## Implementado anteriormente

Primera pantalla de FIPAZ a pantalla completa con la imagen local existente, Google y acceso directo al lector. Google obtiene perfil mediante OAuth `openid profile` + UserInfo directamente contra Google; no usa el backend Nest. Solo se persiste la identidad para presentación local. No se almacenan tokens Google ni se trata ese perfil como autorización para endpoints del backend.

Exploración, mapa y favoritos locales; identidad Google en Perfil y cierre de sesión que limpia el recorrido. La pantalla Check-in usa el lector real en este modo. La prueba admite cualquier NDEF legible, muestra UID si está disponible y contenido como texto, cancela al salir/ocultar la app, libera la antena al terminar, y mantiene el sonido 7 con vibración de 80 ms. No escribe etiquetas ni suma puntos por esta prueba. Las voces aprobadas permanecen sin regeneración.

## Verificado

- Build local y TypeScript correctos.
- 22 pruebas unitarias existentes correctas tras adaptar el mock de configuración.
- 11 pruebas Playwright locales correctas: Google UserInfo controlado, rechazo sin falsa identidad, ausencia total de llamadas a `/api/`, tokens sin persistencia, lector antes de Google, contenido escapado, UID ausente, cancelación, NDEF incompatible, permiso rechazado, offline tras primera carga y 320/390/768/1440 px.
- Revisión visual de la bienvenida en escritorio y de la bienvenida en Chrome del Android real; resultado de lectura con fixture inspeccionado en móvil. El resultado de fixture está identificado como tal y no se usa como evidencia del hardware.

## Android físico

ADB detectó un Xiaomi M2101K6G autorizado. Capacidades NFC presentes, `mState=on`, pantalla `ON_UNLOCKED`. Se configuró reverse del puerto 4174 y se abrió Chrome en `http://localhost:4174/`. La página confirmó `isSecureContext=true` y `NDEFReader` disponible.

El usuario realizó una lectura con su tarjeta y confirmó que se leyó. Se verificó por CDP, solo en la pestaña de Fexpo: ruta `/nfc-test`, éxito visible «Tarjeta detectada», UID expuesto, cero solicitudes de recursos a `/api/`. No se imprimió ni guardó el valor del UID o el contenido. La captura del resultado físico mediante CDP expiró; la confirmación se basa en la interacción del usuario y la comprobación del DOM, no en una captura inexistente.

La bienvenida real está en `screenshots/local/phone-initial.png`. Las capturas `welcome-390.png`, `welcome-1440.png` y `nfc-reading-fixture.png` proceden del navegador automatizado con respuestas controladas.

## Bloqueo Google identificado

El usuario vio el bloqueo OAuth. Se reprodujo y se leyó únicamente el código de error en la ventana de Google: **origin_mismatch**, no redirect_uri_mismatch. El origen usado por USB, `http://localhost:4174`, debe añadirse en los orígenes JavaScript del cliente web existente. Las instrucciones precisas están en README. No se verificó un acceso Google real exitoso mientras falta esa configuración; los tests de Google usan fixtures.

La compilación final queda en modo `local`, y `.env.local` está ignorado por Git. La integración live se conserva y las herramientas `.local-tools` no se versionan. No se modificó el backend, Expo ni ninguna tarjeta NFC.
