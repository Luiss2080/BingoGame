import { useEffect, useState } from 'react';
import { Boton, Dialogo } from './ui';

// Evento `beforeinstallprompt` (no está en los tipos estándar del DOM).
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

declare global {
  interface Window {
    __deferredInstallPrompt: BeforeInstallPromptEvent | null;
  }
}

// Guardamos un "snooze" (no volver a mostrar hasta cierta fecha) en vez de un
// descarte permanente, para que el banner reaparezca si el usuario no instaló.
const SNOOZE_KEY = 'pwa_install_snooze';
const DIAS_SNOOZE = 3;

function snoozeActivo() {
  const v = localStorage.getItem(SNOOZE_KEY);
  return v !== null && Date.now() < Number(v);
}
function snooze(dias: number) {
  localStorage.setItem(SNOOZE_KEY, String(Date.now() + dias * 86_400_000));
}

function esStandalone() {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (navigator as unknown as { standalone?: boolean }).standalone === true
  );
}

function esIOS() {
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}

// Safari de iOS define `navigator.standalone` (en false si no está instalada);
// los navegadores embebidos (WKWebView de WhatsApp, Instagram…) lo dejan en
// undefined. Es la forma fiable de distinguirlos: sus user-agents son iguales.
function esWebViewIOS() {
  return (navigator as unknown as { standalone?: boolean }).standalone === undefined;
}

// Navegador embebido de Android (WhatsApp, Instagram, Facebook…): no instalan PWAs.
function esWebViewAndroid() {
  return /; wv\)|FBAN|FBAV|Instagram|Line\/|GSA\//.test(navigator.userAgent);
}

type Modo =
  | 'instalar' // Chrome con evento nativo: un toque instala
  | 'manual' //   Chrome/Firefox sin evento: instrucción del menú ⋮
  | 'ios' //      Safari de iOS: Compartir → Agregar a inicio
  | 'safari' //   WebView de iOS: hay que salir a Safari
  | 'chrome'; //  WebView de Android: hay que salir a Chrome

function detectarModo(): Modo {
  // iOS primero: sus WebViews casi nunca coinciden con el patrón de Android, y
  // mandarlos a un intent:// de Chrome no hace nada en un iPhone.
  if (esIOS()) return esWebViewIOS() ? 'safari' : 'ios';
  if (esWebViewAndroid()) return 'chrome';
  return window.__deferredInstallPrompt ? 'instalar' : 'manual';
}

const TEXTOS: Record<Modo, string> = {
  instalar: 'Úsala como una app en tu celular, sin abrir el navegador.',
  manual: 'Toca el menú ⋮ (arriba a la derecha) y elige “Instalar aplicación”.',
  ios: 'Toca Compartir y luego “Agregar a inicio” para usarla como app.',
  safari: 'Toca ⋯ (arriba a la derecha) y elige “Abrir en Safari”. Desde ahí: Compartir → “Agregar a inicio”.',
  chrome: 'Para instalar la app, ábrela en Chrome.',
};

/**
 * Estado de instalación de la PWA, compartido por el banner automático y por la
 * opción fija "Instalar app" del panel.
 */
export function useInstalacion() {
  const [modo, setModo] = useState<Modo>(detectarModo);
  const [instalada, setInstalada] = useState(esStandalone);

  useEffect(() => {
    // El evento puede llegar después del primer render (conexión lenta).
    const alPoderInstalar = () => setModo(detectarModo());
    const alInstalar = () => setInstalada(true);
    window.addEventListener('pwa-installable', alPoderInstalar);
    window.addEventListener('pwa-installed', alInstalar);
    return () => {
      window.removeEventListener('pwa-installable', alPoderInstalar);
      window.removeEventListener('pwa-installed', alInstalar);
    };
  }, []);

  /** Lanza el diálogo nativo. Devuelve false si no está disponible. */
  async function instalar() {
    const prompt = window.__deferredInstallPrompt;
    if (!prompt) {
      setModo('manual');
      return false;
    }
    await prompt.prompt();
    const { outcome } = await prompt.userChoice;
    window.__deferredInstallPrompt = null;
    if (outcome === 'accepted') {
      setInstalada(true);
      snooze(3650);
    }
    return outcome === 'accepted';
  }

  return { modo, instalada, instalar };
}

// Link intent:// para saltar del WebView de Android a Chrome.
function urlIntentChrome() {
  return (
    'intent://' +
    window.location.href.replace(/^https?:\/\//, '') +
    '#Intent;scheme=https;package=com.android.chrome;end'
  );
}

/** Banner de instalación que aparece solo, unos segundos tras abrir la app. */
export function InstallPrompt() {
  const { modo, instalada, instalar } = useInstalacion();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (instalada || snoozeActivo()) return;
    // Damos margen a que llegue `beforeinstallprompt` antes de decidir el texto.
    const timer = setTimeout(() => setVisible(true), 2000);
    return () => clearTimeout(timer);
  }, [instalada]);

  function cerrar() {
    snooze(DIAS_SNOOZE);
    setVisible(false);
  }

  if (!visible || instalada) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-50 flex justify-center px-3 pb-3">
      <div className="w-full max-w-md rounded-2xl border border-line bg-surface p-4 shadow-2xl shadow-black/50">
        <div className="flex items-start gap-3">
          <img src="/icons/icon-192.png" alt="" className="h-11 w-11 shrink-0 rounded-xl" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold text-white">Instalar Recorte Bingo</p>
            <p className="mt-0.5 text-xs text-muted">{TEXTOS[modo]}</p>
          </div>
          <button
            onClick={cerrar}
            aria-label="Cerrar"
            className="-mr-1 -mt-1 rounded-full p-1 text-xl leading-none text-muted active:bg-white/10"
          >
            ×
          </button>
        </div>

        {modo === 'instalar' && (
          <div className="mt-3 flex justify-end gap-2">
            <button
              onClick={cerrar}
              className="rounded-xl px-4 py-2 text-sm font-semibold text-muted active:bg-white/10"
            >
              Ahora no
            </button>
            <button
              onClick={async () => {
                if (await instalar()) setVisible(false);
              }}
              className="rounded-xl bg-brand px-4 py-2 text-sm font-semibold text-[#04241f] active:bg-brand-dark"
            >
              Instalar
            </button>
          </div>
        )}

        {(modo === 'manual' || modo === 'ios' || modo === 'safari') && (
          <div className="mt-3 flex justify-end">
            <button
              onClick={cerrar}
              className="rounded-xl bg-brand px-4 py-2 text-sm font-semibold text-[#04241f] active:bg-brand-dark"
            >
              Entendido
            </button>
          </div>
        )}

        {modo === 'chrome' && (
          <div className="mt-3 flex justify-end">
            <a
              href={urlIntentChrome()}
              className="rounded-xl bg-brand px-4 py-2 text-sm font-semibold text-[#04241f] active:bg-brand-dark"
            >
              Abrir en Chrome
            </a>
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Opción fija "Instalar app" para el panel. Sin esto, quien cierra el banner
 * se queda 3 días sin ninguna forma de instalar la PWA.
 */
export function BotonInstalarApp() {
  const { modo, instalada, instalar } = useInstalacion();
  const [ayuda, setAyuda] = useState(false);

  if (instalada) return null;

  async function alTocar() {
    if (modo === 'instalar' && (await instalar())) return;
    setAyuda(true);
  }

  return (
    <>
      <button
        onClick={alTocar}
        className="flex w-full items-center gap-3 rounded-2xl border border-line bg-surface p-4 text-left shadow-sm shadow-black/20 active:border-brand/50 active:bg-surface2"
      >
        <span className="h-2 w-2 shrink-0 rounded-full bg-brand" />
        <span className="font-medium text-white">Instalar app en el celular</span>
        <span className="ml-auto text-lg leading-none text-muted">›</span>
      </button>

      <Dialogo abierto={ayuda} titulo="Instalar Recorte Bingo" onCerrar={() => setAyuda(false)}>
        <p className="mb-4 text-sm text-muted">{TEXTOS[modo]}</p>
        <div className="flex gap-2">
          {modo === 'chrome' && (
            <a
              href={urlIntentChrome()}
              className="flex-1 rounded-xl bg-brand px-4 py-3 text-center text-sm font-semibold text-[#04241f] active:bg-brand-dark"
            >
              Abrir en Chrome
            </a>
          )}
          <Boton variante="secundario" className="flex-1" onClick={() => setAyuda(false)}>
            Entendido
          </Boton>
        </div>
      </Dialogo>
    </>
  );
}
