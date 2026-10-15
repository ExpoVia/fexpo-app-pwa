# Mapa interior y GPS relativo

## Representación

En modos local/demo, Mapa muestra cada planta de los planos originales. 2D utiliza directamente PLAN_GEOMETRY y PLAN_LOTS en SVG; 3D extruye esos mismos contornos y utiliza las mismas coordenadas, tamaños y códigos de los lotes. También conserva baños, accesos, rampas y ascensores del plano. No incluye árboles, jardines ni pabellones exteriores inventados. El modo live conserva su mapa conectado existente.

La barra compacta permite buscar, elegir pabellón y planta, abrir la lista accesible de stands y consultar ayuda. El visor ocupa el resto de la pantalla, con controles de cámara, 2D/3D y Mi ubicación. En escritorio se amplía hasta 820 px. Los espacios sin expositor tienen selección propia. Los perfiles, NFC, audio, vibración y saldo existente permanecen integrados; mover el avatar no acredita puntos.

Los datos geométricos de origen siguen siendo esquemas simplificados, no un relevamiento físico. La correspondencia exacta entre 2D y 3D no convierte esos esquemas en coordenadas geográficas verificadas.

## GPS

Mi ubicación inicia navigator.geolocation.watchPosition con enableHighAccuracy, maximumAge 0 y timeout 15 s. Requiere permiso del visitante y un contexto seguro. La primera lectura precisa inicia el recorrido en la posición actual del avatar. Las siguientes lecturas desplazan el avatar respecto a ella: longitud hacia el este, latitud hacia el norte; escala provisional de 10 unidades SVG por metro y norte hacia arriba. El usuario pidió probar solamente movimiento relativo y posponer la georreferenciación y ajuste de escala/orientación.

La interfaz indica GPS relativo y la precisión informada. No presenta esa posición como ubicación absoluta del recinto ni detecta plantas por GPS. Se ignoran lecturas antiguas, repetidas, inválidas, saltos superiores a 500 m y pequeñas variaciones inferiores a un umbral de 1.5–5 m según precisión. Una precisión peor a 35 m pausa actualizaciones de posición y muestra señal débil. No es posible garantizar que GPS detecte cada paso dentro de un edificio.

Detener GPS conserva la última posición representada. Reiniciar toma esa posición como nuevo origen. Cambiar de planta reinicia el recorrido y cancela el watch; salir de Mapa o esconder la pestaña también lo cancela. Después de ocultar la pestaña, Mi ubicación reanuda explícitamente. Coordenadas, anclas y trayectoria no se guardan ni se envían al backend. El avatar interpola desplazamientos, anima piernas y brazos, y puede seguirse con la cámara. Movimiento reducido desactiva la transición animada.

## NFC

Una lectura identifica un stand del catálogo y lo ubica en su lote original. Se conservan el sonido 7, vibración y preferencias existentes. No escribe etiquetas ni acredita puntos. Las tarjetas desconocidas, ambiguas o de otra feria no cambian la ubicación. Check-in también actualiza la última etiqueta del mapa.

Texto NDEF de ejemplo:

```text
FIPAZ:2026:STAND:stand-altura-labs
```

## Verificación

Build local y TypeScript. 28 pruebas unitarias, incluyendo conversión de desplazamientos GPS y centros de lotes. Recorridos Playwright verifican siete plantas, igualdad de contornos y conteos, cámara, búsqueda, planos, fallback WebGL, NFC, GPS, cancelación, permiso rechazado, ruido y señal débil. El GPS se probó con callbacks de posiciones controladas; falta verificar desplazamientos físicos en el celular.

Capturas claras y oscuras en 390/1440 px y reporte a 320/390/768/1440 px: docs/screenshots/campus. Script: node scripts/check-campus.mjs, con preview local en 4174 y Chrome disponible para Playwright.
