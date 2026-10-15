# Fexpo App PWA

Prototipo visual independiente de la app de visitantes. React + Vite + TypeScript, con los recorridos de `fexpo-expo-app` y la dirección visual de los bocetos claro/oscuro.

## Ejecutar

Requiere Node.js 22.12 o posterior compatible con Vite 7.

```powershell
npm install
npm run dev
```

Desarrollo: `http://localhost:5174`. El servidor escucha en la red local para probar la interfaz desde otro dispositivo. La instalación PWA y el service worker requieren HTTPS o localhost; una IP LAN con HTTP sirve para revisar la interfaz, pero no para comprobar instalación/offline.

## Producción local e instalación

```powershell
npm run build
npm run preview
```

Abrir `http://localhost:4174`. El service worker solo se genera en producción. Tras la primera carga y activación se pueden abrir las rutas de la app sin red. La instalación aparece cuando el navegador considera la app instalable; en iOS usar Compartir → Añadir a pantalla de inicio. La prueba física de instalación en Android/iOS queda pendiente de publicar una vista previa HTTPS.

Vercel: proyecto Vite, build `npm run build`, output `dist`. `vercel.json` incluye fallback para las rutas de React Router y evita cachear indefinidamente `sw.js`. No se ha publicado ni conectado un dominio.

## Alcance de esta etapa

- Inicio: ferias en orden HuaynaFEX, FIPAZ, FEIPOBOL; seis accesos, progreso y destacados.
- Mapa: búsqueda, tres bloques, siete planos vectoriales compartidos con Expo, cambio de planta, zoom, selección y acceso al stand.
- Check-in: pase animado, lectura simulada cancelable, comprobante y duplicados.
- Misiones y premios: progreso local vinculado a las visitas, detalle y canje simulado cuando hay saldo suficiente.
- Perfil: identidad editable, pasaporte que gira, QR, avisos, temas Sistema/Claro/Oscuro, historial y reinicio.
- Stand: catálogo de ejemplo, guardar, compartir, ubicación, opciones del producto, ruleta, raspadita y oferta reversible.
- Ferias, QR ilustrativo, avisos y pantalla de ruta inexistente.

Solo datos ficticios. La primera apertura muestra una visita de ejemplo a Altura Labs y 50 puntos para coincidir con el boceto. Perfil → Reiniciar recorrido demo permite comenzar en cero. La sesión es una sesión local de demostración, sin Google real. Los datos se guardan en IndexedDB; el tema se guarda en localStorage.

**No hay backend, Web NFC, lectura de cámara, credenciales reales, envío de datos, notificaciones push ni premios reales.** Las redes sociales aparecen deshabilitadas si no existen enlaces. No se copiaron `.env`, claves, tokens ni dependencias nativas.

## Estructura

```text
src/
  App.tsx              Rutas React Router
  pages/               Pantallas e interacciones visuales
  ui/                  Componentes, shell y tema
  state/demo.ts        Estado aislado de demostración
  data/                Catálogos y geometría de Expo
  types/               Tipos de contenido
  styles.css           Tokens semánticos y sistema visual
public/
  assets/              Imágenes locales de Fexpo
  fonts/               Fuentes locales y licencia
  icons/               Iconos PWA
```

Los colores oscuros base son `#101012`, `#1C1C1D` y `#262626`. Azul para navegación/acciones, dorado para puntos, verde para confirmaciones. Las superficies usan las mismas variables en todas las pantallas. Se respeta `prefers-reduced-motion`; los modales usan `<dialog>` y devuelven el foco al cerrar.

## Verificaciones

```powershell
npm run typecheck
npm test
npx playwright install chromium
npm run test:e2e
```

Playwright usa la compilación de producción, por lo que requiere `npm run build` previo. Se puede usar un Chromium existente con `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH`. Las pruebas cubren rutas y recursos en ambos temas a 320, 390, 768 y 1440 px, visitas persistidas, duplicados, cancelación, mapa/perfil, juegos y apertura offline.

`node scripts/capture.mjs` captura las cinco pantallas a 390 × 844 en ambos temas y escritorio a 1440 × 900. Evidencia en `docs/screenshots/`.

## Próxima etapa

Conectar adaptadores reales de autenticación, catálogo y progreso, manteniendo `state/demo.ts` fuera del flujo de producción. Acordar con el backend cómo validar una visita que llega por un enlace NFC/QR: ese enlace no entrega el UID del chip. Después integrar Web NFC como capacidad opcional, credencial QR real y políticas de offline/actualización de datos del evento.

## Recursos

Ilustraciones, banners, fuentes, icono y planos reutilizados desde `../fexpo-expo-app`; fechas y empresas heredadas de sus fixtures y no confirmadas por la organización. No se generaron imágenes nuevas ni se modificaron los otros proyectos.
