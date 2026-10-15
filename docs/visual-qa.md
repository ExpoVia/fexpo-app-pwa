# Verificación de la base visual

Revisión del 15 de octubre de 2026. Referencia: bocetos claro y oscuro proporcionados por Omar, con las pantallas y recursos de `fexpo-expo-app`.

## Resultado

- Compilación de producción y generación del service worker correctas.
- TypeScript correcto.
- Tres pruebas de estado local aprobadas: visita/duplicado, sesión demo/stand inválido y saldo/canje.
- Trece pruebas de navegador aprobadas: ocho combinaciones de tema y ancho, más cinco recorridos funcionales.
- 88 comprobaciones de rutas (11 rutas × 4 anchos × 2 temas), sin desbordamiento horizontal ni imágenes rotas detectadas, y sin errores JavaScript capturados.
- Visita simulada, comprobante, duplicado sin puntos adicionales y persistencia tras recarga comprobados.
- Cancelación de lectura sin registrar visita comprobada.
- Búsqueda de Altura Labs, apertura del Pabellón Bolivia, perfil, favorito y giro de oferta comprobados.
- Ruleta y revelado accesible de raspadita comprobados; no cambian el saldo.
- Apertura directa de `/map` sin red después de activar el service worker comprobada en Chromium.

## Revisión visual

Capturas reales a 390 × 844 px de Inicio, Mapa, Check-in, Misiones y Perfil en ambos temas. Capturas de escritorio a 1440 × 900 px de Inicio y perfil del stand. Se revisaron las imágenes renderizadas, no solo el código.

Se ajustó la densidad de filas de Misiones y de la vista general del Mapa para acercar las secciones inferiores al boceto. La navegación permanece visible y las páginas tienen espacio inferior para alcanzar todo el contenido mediante scroll. Las ilustraciones no se recortan; las superficies oscuras usan los tres neutros solicitados. El tema se comparte entre Perfil y la navegación de escritorio.

- [Tema claro](screenshots/tema-claro.png)
- [Tema oscuro](screenshots/tema-oscuro.png)
- [Escritorio](screenshots/desktop.png)

## Rendimiento y actualización

Portadas convertidas a WebP, sin modificar los archivos de Expo. Se excluyeron recursos copiados que no usa esta interfaz. El precache pasó de aproximadamente 9.7 MiB a 3.35 MiB. Los recursos públicos con nombres estables reciben revisiones de contenido para que cambien al actualizar la app. La actualización se ofrece mediante un aviso y no fuerza una recarga durante una interacción.

## Límites de esta verificación

No se ha publicado el proyecto. No se comprobó instalación física en Android/iOS ni funcionamiento en Safari móvil. No se probó NFC, cámara, Google real, backend, push ni sincronización de visitas reales porque no forman parte de esta etapa. El test de raspadita ejercita su alternativa accesible; el gesto táctil físico queda pendiente de prueba en dispositivo.

Las empresas, promociones, fechas y cantidades son fixtures heredados y se identifican como demostración. La tarjeta de puntos y el QR no son credenciales válidas.
