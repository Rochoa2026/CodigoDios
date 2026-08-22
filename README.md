# Código de Dios — Versión 4

Aplicación PWA tipo libro bíblico temático con 16 capítulos y 4,800 estudios (300 por capítulo).

## Novedades de la versión 4
- Índice navegable de subtemas dentro de cada capítulo.
- Botón “Todos” para regresar al capítulo completo.
- Contador de estudios por subtema.
- Opción “PDF A5” independiente de “Imprimir”.
- PDF descargable del capítulo actual o del subtema seleccionado.
- Diseño del PDF preparado en tamaño A5 vertical con encabezados y numeración de páginas.
- Carga del texto bíblico disponible antes de generar el PDF; si no hay conexión, conserva interpretación y aplicación.
- Fallback: la impresión del navegador también está configurada a A5 mediante CSS.
- Caché PWA actualizado a v4.

## Archivos
Todos los archivos deben subirse a la raíz del repositorio de GitHub Pages.

## Nota sobre PDF
La generación directa usa jsPDF desde cdnjs. Si esa librería no puede cargarse, la app indica usar “Imprimir” y elegir “Guardar como PDF”; el tamaño de página queda preconfigurado como A5.
