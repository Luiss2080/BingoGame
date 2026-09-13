"""Servicio de procesamiento de PDF.
Genera cartones portrait: logo_superior.jpeg como header +
grilla renderizada directamente desde el PDF (con su diseño original).
"""
import os
import re
import threading
from concurrent.futures import ThreadPoolExecutor, as_completed
from typing import Callable, Optional

import fitz  # PyMuPDF
from PIL import Image, ImageDraw, ImageFont

# ── rutas ─────────────────────────────────────────────────────────────────────

# En el worker, static/ vive junto a este archivo (en Flask estaba un nivel arriba)
_STATIC_DIR = os.path.join(os.path.dirname(__file__), 'static')
_LOGO_PATH  = os.path.join(_STATIC_DIR, 'logo_superior.jpeg')

# ── posición del círculo dorado dentro del logo (fracciones del logo) ─────────
CIRCULO_X = 0.805   # centro X del círculo como fracción del ancho del logo
CIRCULO_Y = 0.430   # centro Y del círculo como fracción del alto del logo

# ── parámetros del cartón ─────────────────────────────────────────────────────
CARD_WIDTH      = 520
LOGO_HEADER_H   = 210        # altura fija del banner logo_superior.jpeg en píxeles
LOGO_PADDING    = 10         # margen horizontal del banner (cada lado)
RENDER_SCALE    = 150 / 72   # renderiza el PDF a ~150 DPI
HEADER_FRACTION = 0.20       # fracción del alto de página que ocupa el header del PDF
                              # (usada si la detección automática falla)

# ── fuentes candidatas (Linux / Docker) ───────────────────────────────────────
_FONT_CANDIDATOS = [
    '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf',
    '/usr/share/fonts/dejavu/DejaVuSans-Bold.ttf',
    '/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf',
    '/usr/share/fonts/truetype/freefont/FreeSansBold.ttf',
    '/usr/share/fonts/truetype/ubuntu/Ubuntu-B.ttf',
]


def _encontrar_fuente() -> Optional[str]:
    for p in _FONT_CANDIDATOS:
        if os.path.isfile(p):
            return p
    return None


FONT_PATH = _encontrar_fuente()

# ── cache thread-safe del logo ────────────────────────────────────────────────
_logo_cache: Optional[Image.Image] = None
_logo_lock  = threading.Lock()


def _cargar_logo() -> Optional[Image.Image]:
    global _logo_cache
    with _logo_lock:
        if _logo_cache is None:
            if os.path.isfile(_LOGO_PATH):
                _logo_cache = Image.open(_LOGO_PATH).convert('RGB')
                print(f'[BINGO] Logo cargado: {_LOGO_PATH} {_logo_cache.size}', flush=True)
            else:
                print(f'[BINGO] AVISO: logo no encontrado en {_LOGO_PATH}', flush=True)
    return _logo_cache


# ── clases ────────────────────────────────────────────────────────────────────

class PDFProcessorError(Exception):
    pass


class PDFProcessor:
    REGEX_NUMERO        = re.compile(r'^\s*(\d{3,8})\s*$')
    REGEX_NUMERO_INLINE = re.compile(r'\b(\d{3,8})\b')

    # Sentinel que indica "usa el logo por defecto"
    _USE_DEFAULT = object()

    def __init__(self, dpi: int = 72, formato: str = 'jpeg',
                 banner_path=_USE_DEFAULT):
        self.dpi     = dpi
        self.formato = formato.lower()
        if self.formato not in ('jpeg', 'png'):
            raise ValueError("formato debe ser 'jpeg' o 'png'")
        # banner_path: ruta str = usa ese banner | None = sin banner (PDF original)
        # _USE_DEFAULT = usa logo_superior.jpeg (comportamiento previo)
        if banner_path is PDFProcessor._USE_DEFAULT:
            self.banner_path: Optional[str] = _LOGO_PATH
        else:
            self.banner_path = banner_path
        print(
            f'[BINGO] PDFProcessor init: dpi={dpi} fuente={FONT_PATH} '
            f'banner={"<sin banner>" if self.banner_path is None else self.banner_path}',
            flush=True,
        )

    # ── carga del banner ──────────────────────────────────────────────────────

    def _cargar_banner(self) -> Optional[Image.Image]:
        """Carga la imagen del banner para esta instancia."""
        if self.banner_path is None:
            return None
        if self.banner_path == _LOGO_PATH:
            return _cargar_logo()  # versión cacheada del logo por defecto
        if os.path.isfile(self.banner_path):
            return Image.open(self.banner_path).convert('RGB')
        raise PDFProcessorError(f'Banner no encontrado: {self.banner_path}')

    # ── utilidades de fuente ──────────────────────────────────────────────────

    def _fuente(self, size: int) -> ImageFont.ImageFont:
        if FONT_PATH:
            try:
                return ImageFont.truetype(FONT_PATH, size)
            except Exception:
                pass
        return ImageFont.load_default()

    # ── extracción del número de cartón del texto del PDF ─────────────────────

    def _extraer_numero_carton(self, texto: str) -> Optional[str]:
        lines = [l.strip() for l in texto.split('\n') if l.strip()]
        if not lines:
            return None
        m = self.REGEX_NUMERO.match(lines[-1])
        if m:
            return m.group(1)
        for line in reversed(lines[-3:]):
            m = self.REGEX_NUMERO_INLINE.search(line)
            if m:
                return m.group(1)
        return None

    # ── superposición del número en el círculo del logo ───────────────────────

    def _superponer_numero(self, canvas: Image.Image, numero: str,
                           header_h: int, logo_padding: int = 0) -> Image.Image:
        draw    = ImageDraw.Draw(canvas)
        logo_w  = canvas.width - 2 * logo_padding

        cx = int(logo_padding + logo_w * CIRCULO_X)
        cy = int(header_h * CIRCULO_Y)

        max_ancho = int(logo_w * 0.28)

        font_num   = None
        font_label = None
        size_num   = 10

        if FONT_PATH:
            size_num = int(logo_w * 0.10)
            while size_num >= 10:
                try:
                    f    = ImageFont.truetype(FONT_PATH, size_num)
                    bbox = draw.textbbox((0, 0), numero, font=f)
                    if (bbox[2] - bbox[0]) <= max_ancho:
                        font_num = f
                        break
                except Exception:
                    pass
                size_num -= 1

            size_label = max(8, size_num // 3)
            try:
                font_label = ImageFont.truetype(FONT_PATH, size_label)
            except Exception:
                font_label = None

        if font_num   is None: font_num   = ImageFont.load_default()
        if font_label is None: font_label = ImageFont.load_default()

        bl = draw.textbbox((0, 0), 'Nro #', font=font_label)
        lw = bl[2] - bl[0];  lh = bl[3] - bl[1]
        bn = draw.textbbox((0, 0), numero,  font=font_num)
        nw = bn[2] - bn[0];  nh = bn[3] - bn[1]

        gap       = max(2, int(header_h * 0.008))
        total_h   = lh + gap + nh
        block_top = cy - total_h // 2

        lx = cx - lw // 2
        ly = block_top
        nx = cx - nw // 2
        ny = block_top + lh + gap

        draw.text((lx + 1, ly + 1), 'Nro #', fill='#888888', font=font_label)
        draw.text((lx,     ly    ), 'Nro #', fill='#555555', font=font_label)

        sombra = max(1, size_num // 20) if FONT_PATH else 1
        draw.text((nx + sombra, ny + sombra), numero, fill='#444444', font=font_num)
        draw.text((nx,          ny          ), numero, fill='#0d0d0d', font=font_num)

        return canvas

    # ── composición del cartón desde render del PDF ───────────────────────────

    def _componer_carton_desde_render(self, pdf_img: Image.Image,
                                      numero: str,
                                      header_fraction: float) -> Image.Image:
        """
        Crea el cartón portrait.
        - Con banner: banner como header + grilla del PDF abajo + número en círculo.
        - Sin banner (banner_path=None): página PDF escalada tal cual (diseño original).
        """
        pdf_w, pdf_h = pdf_img.size
        pdf_scaled   = pdf_img.resize(
            (CARD_WIDTH, int(pdf_h * CARD_WIDTH / pdf_w)), Image.LANCZOS
        )

        if self.banner_path is None:
            # Modo PDF original: devolver la página entera sin modificar
            return pdf_scaled

        banner = self._cargar_banner()
        if banner is None:
            raise PDFProcessorError(
                f'Banner no encontrado: {self.banner_path}. '
                'Verifica que el archivo exista en el servidor.'
            )

        # Recortar la sección de la grilla (debajo del header del PDF)
        cut_y     = int(pdf_scaled.height * header_fraction)
        grid_crop = pdf_scaled.crop((0, cut_y, CARD_WIDTH, pdf_scaled.height))

        # Escalar banner a ancho reducido (con padding lateral) y altura fija
        logo_w      = CARD_WIDTH - 2 * LOGO_PADDING
        logo_h      = LOGO_HEADER_H
        logo_scaled = banner.resize((logo_w, logo_h), Image.LANCZOS)

        # Canvas portrait: banner centrado arriba + grilla del PDF abajo
        canvas = Image.new('RGB', (CARD_WIDTH, logo_h + grid_crop.height), 'white')
        canvas.paste(logo_scaled, (LOGO_PADDING, 0))
        canvas.paste(grid_crop,   (0, logo_h))

        # Escribir número en el círculo dorado del banner
        canvas = self._superponer_numero(canvas, numero, logo_h, logo_padding=LOGO_PADDING)

        return canvas

    # ── procesamiento de página del PDF ──────────────────────────────────────

    def _procesar_pagina(self, pdf_path: str, indice: int,
                         carpeta_salida: str, ext: str,
                         ruta_destino_override: Optional[str] = None) -> dict:
        try:
            doc = fitz.open(pdf_path)
            try:
                page       = doc.load_page(indice)
                texto      = page.get_text()
                page_h_pts = page.rect.height

                # Detectar el header: buscar el bloque de imagen que empieza
                # más arriba en la página (el banner decorativo, no el fondo)
                top_block_bb = None
                min_y0 = float('inf')
                for block in page.get_text('dict').get('blocks', []):
                    if block.get('type') == 1:  # bloque de imagen
                        bb = block.get('bbox', [])
                        if len(bb) >= 4 and float(bb[1]) < min_y0:
                            min_y0 = float(bb[1])
                            top_block_bb = bb

                if top_block_bb is not None:
                    fraction = float(top_block_bb[3]) / page_h_pts
                    # Sanidad: si cubre más del 40% es probablemente el fondo, usar default
                    header_fraction = fraction if fraction <= 0.40 else HEADER_FRACTION
                else:
                    header_fraction = HEADER_FRACTION

                # Renderizar página como imagen
                mat = fitz.Matrix(RENDER_SCALE, RENDER_SCALE)
                pix = page.get_pixmap(matrix=mat)
                pdf_img = Image.frombytes('RGB', [pix.width, pix.height], pix.samples)
            finally:
                doc.close()

            numero = self._extraer_numero_carton(texto)
            if not numero:
                numero = f'sin_numero_pagina_{indice + 1}'

            img = self._componer_carton_desde_render(pdf_img, numero, header_fraction)

            if ruta_destino_override:
                ruta_destino = ruta_destino_override
                os.makedirs(os.path.dirname(ruta_destino), exist_ok=True)
            else:
                os.makedirs(carpeta_salida, exist_ok=True)
                ruta_destino = os.path.join(carpeta_salida, f'{numero}.{ext}')
                if os.path.exists(ruta_destino):
                    contador = 2
                    while True:
                        alt = os.path.join(carpeta_salida, f'{numero}_{contador}.{ext}')
                        if not os.path.exists(alt):
                            ruta_destino = alt
                            break
                        contador += 1

            img.save(ruta_destino, 'JPEG', quality=90)

            return {
                'ok':    {'indice': indice, 'numero': numero,
                          'pagina': indice + 1, 'ruta': ruta_destino},
                'error': None,
            }
        except Exception as ex:
            import traceback
            print(f'[BINGO] ERROR pagina {indice}: {ex}\n{traceback.format_exc()}', flush=True)
            return {
                'ok':    None,
                'error': {'indice': indice, 'numero': None, 'razon': str(ex)},
            }

    # ── regeneración de cartón existente ─────────────────────────────────────

    def regenerar_desde_pdf(self, pdf_path: str, pagina_origen: int,
                            ruta_imagen: str, numero: str) -> None:
        """Regenera la imagen re-procesando la página original del PDF."""
        if not os.path.isfile(pdf_path):
            raise PDFProcessorError(f'PDF no encontrado: {pdf_path}')
        ext = 'jpg' if self.formato == 'jpeg' else 'png'
        resultado = self._procesar_pagina(
            pdf_path, pagina_origen - 1,
            os.path.dirname(ruta_imagen), ext,
            ruta_destino_override=ruta_imagen,
        )
        if resultado['error']:
            raise PDFProcessorError(resultado['error']['razon'])

    def superponer_numero_en_archivo(self, ruta_imagen: str, numero: str) -> None:
        """Fallback: reescribe solo el número sobre el cartón ya generado."""
        logo = _cargar_logo()
        if logo is None:
            return
        img = Image.open(ruta_imagen).convert('RGB')
        img = self._superponer_numero(img, numero, LOGO_HEADER_H)
        img.save(ruta_imagen, 'JPEG', quality=90)

    # ── procesamiento completo del PDF ────────────────────────────────────────

    def procesar(self, pdf_path: str, carpeta_salida: str,
                 carton_cb:   Optional[Callable] = None,
                 error_cb:    Optional[Callable] = None,
                 progreso_cb: Optional[Callable] = None) -> dict:
        if not os.path.isfile(pdf_path):
            raise PDFProcessorError(f'PDF no encontrado: {pdf_path}')
        os.makedirs(carpeta_salida, exist_ok=True)
        ext = 'jpg' if self.formato == 'jpeg' else 'png'

        try:
            doc   = fitz.open(pdf_path)
            total = doc.page_count
            doc.close()
        except Exception as e:
            raise PDFProcessorError(f'No se pudo abrir el PDF: {e}')

        ok, error = [], []

        with ThreadPoolExecutor(max_workers=3) as executor:
            futuros = {
                executor.submit(
                    self._procesar_pagina, pdf_path, i, carpeta_salida, ext
                ): i
                for i in range(total)
            }
            for futuro in as_completed(futuros):
                resultado = futuro.result()
                if resultado['ok']:
                    ok.append(resultado['ok'])
                    if carton_cb:
                        try:   carton_cb(resultado['ok'])
                        except Exception: pass
                else:
                    error.append(resultado['error'])
                    if error_cb:
                        try:   error_cb(resultado['error'])
                        except Exception: pass
                if progreso_cb:
                    try:   progreso_cb(len(ok) + len(error), total)
                    except Exception: pass

        ok.sort(key=lambda x: x['indice'])
        return {'ok': ok, 'error': error, 'total': total}
