# 🚴‍♂️ Tómbola & Sorteos - Apodaca Riders Club 🎱✨

Aplicación web interactiva para sorteos ciclistas 1 a 1 en vivo, con soporte para listas de WhatsApp y motor de físicas rígidas 2D en tiempo real.

---

## 🌟 Características Principales

- **🎱 Gran Tómbola con Motor de Físicas 2D**:
  - Simulación rígida con **8 sub-pasos por fotograma** (PBD - *Position-Based Dynamics*).
  - Cero penetración entre esferas: las bolas rebotan y se empujan como esferas sólidas de billar/lotería.
  - **5 Cucharones Elevadores en "L"**: Recogen bolas del fondo y las arrojan en una cascada dinámica de caída libre.
  - Fricción de rodadura real: los números giran según el desplazamiento angular de cada bola ($\omega = v/r$).
  - Zoom cinemático 3D de 350px para revelar al ganador con iluminación Fresnel y aura de victoria.
- **🎰 Ruleta de Nombres Vertical (Modo Reel)**:
  - Tarjetas animadas a 60 FPS con desaceleración gradual y sonido de trinquete de bicicleta.
- **⚡ Sorteo 100% al Azar**:
  - Aleatoriedad criptográfica con `window.crypto.getRandomValues()`.
  - Mecánica 1 a 1: al salir un ganador se elimina del bombo activo y su premio se descuenta automáticamente.
- **📋 Integración Nativa con WhatsApp**:
  - Pega listas directamente desde WhatsApp (`1. Yaare 👸`, `30. Poncho Denigris`, etc.) reconociendo número y nombre con emojis.
  - Botón de exportación para copiar los resultados en formato listo para compartir en el grupo de ciclistas.
- **📱 Optimizado para Móvil**:
  - La tómbola y el sorteo se sitúan automáticamente arriba en celulares y tablets.
  - Diseño responsivo con estética moderna ciclista (asfalto oscuro, acentos neón magenta, cian y dorado).
- **🔊 Motor de Audio Web Audio API**:
  - Sonidos de esferas huecas de acrílico/celuloide modulados por la fuerza del impacto.
  - Campana de bicicleta clásica (*ding-ding*), efectos de aceleración y fanfarria triunfal.

---

## 🚀 Cómo Ejecutar Localmente

No requiere Node.js ni instalación de dependencias externas. Puedes abrir `index.html` directamente en tu navegador o usar cualquier servidor estático:

```bash
# Con Python
python3 -m http.server 8080

# O con npx
npx serve .
```

Abre en tu navegador:
`http://localhost:8080/`

---

## 🛠️ Tecnologías

- **HTML5 & CSS3** (Vanilla, Grid, Flexbox, variables CSS, Dark theme)
- **JavaScript Moderno** (ES6+, Canvas API, Web Audio API, Web Cryptography API)

---

Creado para **Apodaca Riders** 🚴‍♂️🌙 — Rodadas Nocturnas en Apodaca, Nuevo León, México.
