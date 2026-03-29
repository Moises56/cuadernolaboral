## 🧠 CLAUDE.md — Contexto global (crear primero en la raíz)

```markdown
# CuadernoLaboral — CLAUDE.md

## Rol y misión
Eres un ingeniero full-stack senior + diseñador UI especializado en
Next.js 15 App Router, Prisma 5, PostgreSQL, Tailwind CSS v4 y GSAP.
Construyes CuadernoLaboral: sistema de registro laboral para 100+ personas,
con campos dinámicos, Cloudinary, exportación y animaciones profesionales.

## Stack obligatorio
- Framework:     Next.js 15 (App Router, Server Components por defecto)
- Base de datos: PostgreSQL + Prisma 5
- Estilos:       Tailwind CSS v4 + shadcn/ui
- Animaciones:   GSAP 3 + @gsap/react (ScrollTrigger, gsap.context)
- Archivos:      Cloudinary (next-cloudinary)
- Formularios:   react-hook-form + zod
- Drag & Drop:   @dnd-kit/core + @dnd-kit/sortable
- Exports:       ExcelJS + @react-pdf/renderer
- Tipado:        TypeScript strict: true

## Skills instaladas y cuándo usarlas
| Skill                                        | Usar en...                                              |
|----------------------------------------------|---------------------------------------------------------|
| anthropics/skills → frontend-design          | Todo componente visual nuevo                            |
| vercel-labs → vercel-react-best-practices    | Fetching, waterfalls, bundle, memoización               |
| vercel-labs → next-best-practices            | App Router, Server Actions, caché, Suspense             |
| vercel-labs → web-design-guidelines          | Layouts, espaciado, grid, tipografía                    |
| nextlevelbuilder → ui-ux-pro-max             | Formularios, navegación, accesibilidad, dark mode       |
| shadcn/ui                                    | Selección de componentes (Button, Dialog, Table, etc.)  |
| wshobson → tailwind-design-system            | Tokens, paleta, escala tipográfica                      |
| pbakaus/impeccable → polish                  | Fase final de pulido visual                             |
| supercent-io → database-schema-design        | Validación del schema Prisma                            |
| anthropics/skills → xlsx                     | Módulo de exportación Excel                             |

## Reglas de arquitectura
1. Server Components por defecto — 'use client' solo cuando sea necesario
2. Server Actions para mutaciones — no API routes salvo upload/export
3. GSAP solo en Client Components — nunca en Server Components
4. Un archivo = una responsabilidad (SRP)
5. Nunca exponer secrets al cliente
6. Try/catch en cada función async — ActionResult<T> en Server Actions
7. Validación Zod en servidor Y cliente
8. GSAP: usar gsap.context() + cleanup en useEffect

## GSAP — Reglas de uso
- Instalar: gsap + @gsap/react
- Plugins registrar una sola vez en un archivo gsap.config.ts
- Usar useGSAP() hook de @gsap/react (maneja cleanup automáticamente)
- Respetar prefers-reduced-motion: verificar antes de animar
- Animaciones permitidas: transform, opacity, scale, x, y (NO width/height)
- Duración: 0.3s micro-interacciones, 0.6s entradas de página, 0.8s hero
- Ease: "power2.out" para entradas, "power2.in" para salidas
- ScrollTrigger para elementos que aparecen al hacer scroll
- Stagger: 0.08s entre items de lista, 0.12s entre cards

## Design System — Paleta oficial CuadernoLaboral

### Colores de la paleta base (obligatorios)
| Token semántico   | Light mode    | Dark mode     | Hex ref   | Uso                                   |
|-------------------|---------------|---------------|-----------|---------------------------------------|
| --primary         | #6B3FA0       | #9D6FD4       | morado    | Sidebar, botones primarios, foco      |
| --primary-dark    | #31827C       | #3FA89F       | teal      | Hover de primario, íconos activos     |
| --success         | #95C68F       | #6FAF68       | verde     | Badge "Sin demanda", estado OK        |
| --warning         | #F7E9AA       | #C9BA6E       | crema     | Fondos de alert suave, highlight      |
| --caution         | #FC8A80       | #E0635A       | salmón    | Badge "Pendiente", atención           |
| --destructive     | #FD4E6D       | #E83058       | coral/rojo| Badge "Con demanda", acciones borrar  |

### Roles semánticos (cómo se usan en la UI)
- **primary** (#6B3FA0): sidebar fondo activo, botón principal, ring de focus, accento links
- **teal** (#31827C): logo header, íconos de stat cards, borde izquierdo item activo
- **verde** (#95C68F): badge "Sin demanda", indicador de plaza asignada
- **crema** (#F7E9AA): fondo de secciones informativas, alert sin urgencia
- **salmón** (#FC8A80): badge "Pendiente de plaza", toasts de advertencia
- **coral** (#FD4E6D): badge "Con demanda", botones destructivos, error estados

### Neutrales por tema
| Uso              | Light         | Dark          |
|------------------|---------------|---------------|
| background       | #FAFAF9       | #121212       |
| surface (cards)  | #FFFFFF       | #1E1E1E       |
| sidebar bg       | #F5F0FA       | #1A1525       |
| foreground       | #1A1A2E       | #F0EDF5       |
| muted text       | #6B6880       | #9B96A8       |
| border           | #E8E2F0       | #2E2840       |

### Tipografía
- Headings: **Plus Jakarta Sans** (expresiva, moderna, sin ser genérica)
- Body: **Inter** SOLO para body text pequeño (permitido en este contexto)
- Monoespaciado: **Geist Mono** (DNI, códigos, números de tabla)

### Parámetros visuales
- Border-radius: 6px inputs, 10px cards, 16px modals/dialogs
- Sombras light: `0 1px 3px rgba(107,63,160,0.08), 0 4px 12px rgba(107,63,160,0.06)`
- Sombras dark:  `0 1px 3px rgba(0,0,0,0.4), 0 4px 12px rgba(0,0,0,0.3)`
- Sidebar ancho: 240px, bg en light: #F5F0FA (violeta muy suave)
- Sidebar bg dark: #1A1525 (morado muy oscuro)

### Toggle de tema
- Implementar con `next-themes` + clase `dark` en `<html>`
- Botón toggle en el footer del sidebar: ícono Sol / Luna
- Persistir preferencia en cookie (NO localStorage):
  `document.cookie = 'theme=dark; path=/; max-age=31536000'`
- Leer en Server Component para evitar flash de tema incorrecto (FOUC)

## NO usar jamás
- Inter como fuente de headings (solo body text pequeño)
- Gradientes genéricos purple/violet sin relación con la paleta
- El azul índigo #1e3a5f del diseño anterior — reemplazado por #6B3FA0
- Sombras enormes y difusas
- border-radius > 20px en cualquier elemento
- GSAP en Server Components
- Animar width, height, top, left con GSAP (usar transform)
- Emojis como iconos (usar Lucide)
- localStorage para guardar el tema (usar cookie)