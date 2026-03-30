# CuadernoLaboral — Resumen del Proyecto

Sistema de registro laboral para gestión de personas, construido con Next.js, Prisma y PostgreSQL.

---

## Stack tecnológico

| Tecnología | Versión | Uso |
|---|---|---|
| Next.js | 16.2.1 | Framework principal (App Router) |
| React | 19.2.4 | UI |
| Prisma | 7.6.0 | ORM |
| PostgreSQL | Neon (cloud) | Base de datos |
| Tailwind CSS | v4 | Estilos |
| shadcn/ui | base-nova | Componentes UI |
| GSAP 3 + @gsap/react | — | Animaciones |
| Cloudinary | — | Almacenamiento de archivos |
| react-hook-form + Zod | — | Formularios y validación |
| @dnd-kit | — | Drag & Drop |
| ExcelJS | — | Exportación Excel |
| @react-pdf/renderer | — | Exportación PDF |

---

## Módulos implementados

### Autenticación (Fase 0)
- Sistema propio con cookies HTTP-only (sin NextAuth/Clerk)
- Sesiones almacenadas en BD con expiración de 7 días
- Dos roles: **ADMIN** (acceso completo) y **VIEWER** (solo lectura)
- Login con GSAP animado, protección contra open redirect
- Proxy de Edge (`proxy.ts`) para redirigir rutas protegidas
- Usuarios por defecto: `admin / Admin2024!` y `viewer / Viewer2024!`

### Layout y Diseño (Fase 2)
- Sidebar fijo en desktop, drawer en móvil (`MobileHeader`)
- Paleta oficial: morado `#6B3FA0` (primario) + teal `#31827C` (acento)
- Tokens semánticos en Tailwind v4 con OKLCH
- Fuentes: Plus Jakarta Sans (headings) + Geist Mono (códigos/DNI)
- Toggle Dark/Light mode persistido en cookie (sin flash FOUC)
- Dashboard home con StatsGrid animada y tabla de personas recientes

### Registro de Personas (Fase 3)
- Formulario en Accordion con 4 secciones: Datos Personales, Información Laboral, Familiar Designado, Documentos
- Campos base: Nombre, DNI, Teléfono, Correo, Edad, Profesión (multi-valor con tags)
- DNI hondureño formato `0801-1995-033990` (con guiones)
- Cálculo automático de edad desde DNI (posiciones 4-7 = año de nacimiento)
- Subida de CV (PDF/DOC) y Fotografía a Cloudinary
- **Sección "Familiar Designado"**: aparece con animación GSAP cuando se activa "Tiene demanda al Estado"
- Validación Zod en cliente y servidor

### Listado de Personas (Fase 4)
- Tabla con búsqueda, filtros (demanda / plaza) y paginación
- Estado de filtros en URL (searchParams) — sin estado en cliente
- Filas de tabla con animación GSAP al cargar (stagger)
- Clic en fila navega al detalle de la persona
- Acciones por registro: ver, editar, asignar plaza, eliminar (solo ADMIN)

### Detalle de Persona
- Vista completa con secciones: Datos Personales, Información Laboral, Detalle del Perfil, Campos Adicionales, Estado de Plaza, Fotografía, Currículum, Familiar Designado, Fechas
- Botones "Ver CV" (abre en navegador) y "Descargar" (descarga con nombre de la persona)
- Sección "Detalle del Perfil" separada del resto de campos adicionales

### Exportación (Fase 4 + mejoras)
**Excel (`/api/export/excel`)**
- Columnas: N°, Nombre Completo, DNI, Teléfono, Profesión/Oficio, Currículum Vitae, Demanda, Detalle del Perfil
- Diseño profesional: título morado, franja teal, cabeceras con auto-filtro, filas alternas
- Celda CV: hipervínculo azul "Ver CV →" / gris "Sin CV"
- Celda Demanda: fondo rojo "Con demanda" / verde "Sin demanda"
- Footer con total de registros
- Paneles congelados en fila 4

**PDF (`/api/export/pdf`)**
- A4 horizontal con cabecera y pie de página fijos
- Resumen estadístico: total, con demanda, con plaza
- CV como enlace clicable dentro del documento
- Demanda en color rojo/verde según estado

### Upload directo a Cloudinary
- Los archivos (CV, fotos) se suben **directamente del navegador a Cloudinary**, sin pasar por el servidor
- Endpoint `/api/upload/sign` genera una firma criptográfica (signature + timestamp) para autorizar el upload
- Esto evita el límite de **4.5 MB** en el body de las Serverless Functions de Vercel
- Soporta archivos de hasta **10 MB** (validación cliente + Cloudinary)
- Progress bar funcional con XHR directo a `api.cloudinary.com`
- El endpoint legacy `/api/upload` se mantiene pero ya no se usa desde el frontend

### Proxy de descarga (`/api/download`)
- Descarga archivos de Cloudinary con nombre de la persona (`NombrePersona.pdf`)
- URLs firmadas (signed) para seguridad
- Parámetro `inline=1` para abrir en navegador sin forzar descarga
- Validación de origen: solo acepta `res.cloudinary.com`

### Configuración de Campos Dinámicos (Fase 5)
- Panel en `/configuracion` para gestionar campos personalizados del formulario
- Drag & Drop para reordenar (dnd-kit), con fallback ↑↓ en móvil
- Tipos de campo: TEXT, NUMBER, DATE, BOOLEAN (switch), SELECT (con opciones), TEXTAREA, EMAIL, PHONE
- Campos core protegidos (no se pueden eliminar ni cambiar de tipo)
- Animaciones GSAP en hover de cards y al montar el editor

### Campos dinámicos existentes en BD
| Campo | Tipo | Descripción |
|---|---|---|
| municipio | TEXT | Municipio de residencia |
| nivelEducativo | SELECT | Nivel educativo (Primaria→Doctorado) |
| completoNivel | BOOLEAN | Si completó el nivel educativo |
| fechaNacimiento | DATE | Fecha de nacimiento |
| detallePerfil | TEXTAREA | Descripción del perfil profesional |

### Polish y Producción (Fase 7)
- Loading skeletons con animación GSAP pulse para todas las rutas
- Transición de página animada (fade + slide) al navegar
- Error boundary con animación GSAP (shake + fade)
- Página 404 personalizada para persona no encontrada
- Build limpio: 0 errores TSC, 0 warnings ESLint

---

## Modelo de datos principal

```
Person
  id, fullName, dni (único), phone, email?, age?, profession[]
  workedForState (bool) — "Tiene demanda al Estado"
  hasDemand (bool) — sincronizado desde workedForState
  observations?, workPlace?, contractType?, contractDate?
  cvUrl?, cvPublicId?, photoUrl?, photoPublicId?
  relatedPerson? → RelatedPerson (familiar designado)
  dynamicValues → DynamicFieldValue[]

FormFieldConfig
  fieldKey (único), label, type, required, active, isCore
  placeholder?, options[], order

User / Session → autenticación
```

---

## Lógica de demanda

El campo **"Tiene demanda al Estado"** (`workedForState`) controla:
1. La visibilidad de la sección "Familiar Designado" en el formulario (animación GSAP)
2. La validación de los campos del familiar (requeridos cuando está activo)
3. El color del badge en listados y exportaciones
4. El filtro "Con demanda / Sin demanda" en el listado

El campo `hasDemand` en BD se sincroniza automáticamente con `workedForState` al guardar.

---

## Cloudinary — Configuración requerida

En **Settings → Security** de la cuenta Cloudinary debe estar habilitado:
- ✅ **PDF and ZIP files delivery** — necesario para servir CVs en PDF

---

## Historial de commits

```
e98dd76  fix: direct Cloudinary upload to bypass Vercel 4.5 MB body limit
0f75928  feat: add conciliando mode to demanda
109befc  fix: rename workedForState label to 'Tiene demanda al Estado'
d52a607  feat: wire 'Tuvo cargo público previo' como trigger de sección familiar
035ac98  feat: columnas de exportación — profesión, demanda, detalle de perfil
3dac783  feat: filas de tabla reciente son clicables
3b5c423  design: rediseño Excel con layout profesional
40f617c  fix: signed CDN URL para Cloudinary (PDF delivery habilitado)
5b0df02  feat: columnas de exportación iniciales
0d1f616  feat: sección propia para detallePerfil + descarga CV con nombre
3dba15d  fix: extensión en upload Cloudinary + campo detallePerfil
fc77f27  fix: DNI regex acepta guiones (0801-1995-033990)
11e8641  feat: profesión multi-valor + cálculo edad desde DNI
ebb9c22  feat: CuadernoLaboral v1.0 — sistema completo
```

---

## URLs del sistema

| Ruta | Descripción |
|---|---|
| `/login` | Inicio de sesión |
| `/` | Dashboard — estadísticas + últimas personas |
| `/personas` | Listado de personas con filtros y exportación |
| `/personas/nueva` | Registrar nueva persona |
| `/personas/[id]` | Detalle de persona |
| `/personas/[id]/editar` | Editar registro |
| `/configuracion` | Gestión de campos dinámicos |
| `/api/export/excel` | Descarga Excel |
| `/api/export/pdf` | Descarga PDF |
| `/api/download` | Proxy de descarga Cloudinary |
| `/api/upload` | Subida de archivos a Cloudinary (legacy) |
| `/api/upload/sign` | Genera firma para upload directo a Cloudinary |
