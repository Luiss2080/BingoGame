import { FormEvent, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, mensajeError } from '../api/client';
import { Pantalla } from '../components/Layout';
import { Boton, Campo, Dialogo, EstadoChip, Spinner, inputCls } from '../components/ui';
import { dinero, fechaHora } from '../lib/format';
import { useAuth } from '../stores/auth.store';

interface Carton {
  id: number;
  numero: string;
  estado: string;
  comprador: string | null;
  telefono_comprador: string | null;
  fecha_venta: string | null;
  precio: number | null;
  notas: string | null;
}

export default function CartonDetalle() {
  const { id } = useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { esAdmin, tienePermiso } = useAuth();
  const [dialogo, setDialogo] = useState<null | 'vender' | 'reservar' | 'liberar' | 'eliminar'>(null);
  const [error, setError] = useState('');

  const { data: carton, isLoading } = useQuery<Carton>({
    queryKey: ['carton', id],
    queryFn: async () => (await api.get(`/cartones/${id}`)).data,
  });

  const invalidar = () => {
    qc.invalidateQueries({ queryKey: ['carton', id] });
    qc.invalidateQueries({ queryKey: ['cartones'] });
    qc.invalidateQueries({ queryKey: ['dashboard'] });
  };

  const accion = useMutation({
    mutationFn: async ({ ruta, body }: { ruta: string; body?: unknown }) =>
      (await api.post(`/cartones/${id}/${ruta}`, body ?? {})).data,
    onSuccess: () => {
      invalidar();
      setDialogo(null);
      setError('');
    },
    onError: (e) => setError(mensajeError(e)),
  });

  const eliminar = useMutation({
    mutationFn: async () => (await api.delete(`/cartones/${id}`)).data,
    onSuccess: () => {
      invalidar();
      navigate(-1);
    },
    onError: (e) => setError(mensajeError(e)),
  });

  async function compartir() {
    const url = `${window.location.origin}/api/cartones/${id}/imagen`;
    try {
      const res = await fetch(url);
      const blob = await res.blob();
      const file = new File([blob], `carton_${carton?.numero}.jpg`, { type: 'image/jpeg' });
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: `Cartón ${carton?.numero}` });
        return;
      }
      // Fallback: descargar
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `carton_${carton?.numero}.jpg`;
      a.click();
      URL.revokeObjectURL(a.href);
    } catch {
      setError('No se pudo compartir la imagen');
    }
  }

  if (isLoading || !carton) {
    return (
      <Pantalla titulo="Cartón">
        <Spinner />
      </Pantalla>
    );
  }

  const esDisponible = carton.estado === 'disponible';
  const esReservado = carton.estado === 'reservado';
  const esVendido = carton.estado === 'vendido';

  return (
    <Pantalla titulo={`Cartón #${carton.numero}`}>
      <div className="overflow-hidden rounded-2xl border border-line bg-surface shadow-sm shadow-black/20">
        <img
          src={`/api/cartones/${carton.id}/imagen?v=${carton.estado}`}
          alt={`Cartón ${carton.numero}`}
          className="w-full"
        />
      </div>

      <div className="mt-4 rounded-2xl border border-line bg-surface p-4 shadow-sm shadow-black/20">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-xl font-bold text-white">#{carton.numero}</span>
          <EstadoChip estado={carton.estado} />
        </div>
        {carton.comprador && (
          <dl className="space-y-1 text-sm text-white/90">
            <div className="flex justify-between"><dt className="text-muted">Comprador</dt><dd className="font-medium">{carton.comprador}</dd></div>
            {carton.telefono_comprador && (
              <div className="flex justify-between"><dt className="text-muted">Teléfono</dt><dd>{carton.telefono_comprador}</dd></div>
            )}
            {carton.precio != null && (
              <div className="flex justify-between"><dt className="text-muted">Precio</dt><dd className="font-semibold text-brand">{dinero(carton.precio)}</dd></div>
            )}
            {carton.fecha_venta && (
              <div className="flex justify-between"><dt className="text-muted">Fecha</dt><dd>{fechaHora(carton.fecha_venta)}</dd></div>
            )}
            {carton.notas && (
              <div><dt className="text-muted">Notas</dt><dd>{carton.notas}</dd></div>
            )}
          </dl>
        )}
      </div>

      {error && <p className="mt-3 text-sm font-medium text-bad">{error}</p>}

      <div className="mt-4 grid grid-cols-2 gap-2.5">
        {(esDisponible || esReservado) && tienePermiso('vender') && (
          <Boton variante="verde" onClick={() => setDialogo('vender')}>💰 Vender</Boton>
        )}
        {esDisponible && tienePermiso('reservar') && (
          <Boton variante="ambar" onClick={() => setDialogo('reservar')}>📌 Reservar</Boton>
        )}
        {(esReservado || esVendido) && tienePermiso('liberar') && (
          <Boton variante="secundario" onClick={() => setDialogo('liberar')}>
            ↩️ {esVendido ? 'Liberar (devolver)' : 'Liberar'}
          </Boton>
        )}
        <Boton variante="secundario" onClick={compartir}>📤 Compartir</Boton>
        {esAdmin() && (
          <Boton variante="peligro" onClick={() => setDialogo('eliminar')}>🗑 Eliminar</Boton>
        )}
      </div>

      <DialogoVender
        abierto={dialogo === 'vender'}
        carton={carton}
        onCerrar={() => setDialogo(null)}
        onConfirmar={(body) => accion.mutate({ ruta: 'vender', body })}
        cargando={accion.isPending}
      />
      <DialogoReservar
        abierto={dialogo === 'reservar'}
        onCerrar={() => setDialogo(null)}
        onConfirmar={(body) => accion.mutate({ ruta: 'reservar', body })}
        cargando={accion.isPending}
      />
      <Dialogo abierto={dialogo === 'liberar'} titulo="¿Liberar este cartón?" onCerrar={() => setDialogo(null)}>
        <p className="mb-4 text-sm text-muted">Volverá a estar disponible y se borrarán los datos del comprador.</p>
        <div className="flex gap-2">
          <Boton variante="secundario" className="flex-1" onClick={() => setDialogo(null)}>Cancelar</Boton>
          <Boton className="flex-1" disabled={accion.isPending} onClick={() => accion.mutate({ ruta: 'liberar' })}>Liberar</Boton>
        </div>
      </Dialogo>
      <Dialogo abierto={dialogo === 'eliminar'} titulo="¿Eliminar este cartón?" onCerrar={() => setDialogo(null)}>
        <p className="mb-4 text-sm text-muted">Se borra el cartón y su imagen. No se puede deshacer.</p>
        <div className="flex gap-2">
          <Boton variante="secundario" className="flex-1" onClick={() => setDialogo(null)}>Cancelar</Boton>
          <Boton variante="peligro" className="flex-1" disabled={eliminar.isPending} onClick={() => eliminar.mutate()}>Eliminar</Boton>
        </div>
      </Dialogo>
    </Pantalla>
  );
}

function DialogoVender({ abierto, carton, onCerrar, onConfirmar, cargando }: {
  abierto: boolean;
  carton: Carton;
  onCerrar: () => void;
  onConfirmar: (body: { comprador: string; telefono: string; precio?: number; notas: string }) => void;
  cargando: boolean;
}) {
  const [comprador, setComprador] = useState(carton.comprador ?? '');
  const [telefono, setTelefono] = useState(carton.telefono_comprador ?? '');
  const [precio, setPrecio] = useState('');
  const [notas, setNotas] = useState('');
  const [error, setError] = useState('');

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!comprador.trim()) {
      setError('El comprador es obligatorio');
      return;
    }
    onConfirmar({
      comprador: comprador.trim(),
      telefono: telefono.trim(),
      ...(precio.trim() ? { precio: Number(precio) } : {}),
      notas: notas.trim(),
    });
  }

  return (
    <Dialogo abierto={abierto} titulo={`Vender cartón #${carton.numero}`} onCerrar={onCerrar}>
      <form onSubmit={onSubmit}>
        <Campo label="Comprador *">
          <input className={inputCls} value={comprador} onChange={(e) => setComprador(e.target.value)} />
        </Campo>
        <Campo label="Teléfono">
          <input className={inputCls} type="tel" value={telefono} onChange={(e) => setTelefono(e.target.value)} />
        </Campo>
        <Campo label="Precio">
          <input className={inputCls} type="number" step="0.01" min="0" inputMode="decimal" value={precio} onChange={(e) => setPrecio(e.target.value)} />
        </Campo>
        <Campo label="Notas">
          <textarea className={inputCls} rows={2} value={notas} onChange={(e) => setNotas(e.target.value)} />
        </Campo>
        {error && <p className="mb-2 text-sm text-bad">{error}</p>}
        <div className="flex gap-2">
          <Boton variante="secundario" className="flex-1" onClick={onCerrar}>Cancelar</Boton>
          <Boton type="submit" variante="verde" className="flex-1" disabled={cargando}>Vender</Boton>
        </div>
      </form>
    </Dialogo>
  );
}

function DialogoReservar({ abierto, onCerrar, onConfirmar, cargando }: {
  abierto: boolean;
  onCerrar: () => void;
  onConfirmar: (body: { comprador: string; telefono: string }) => void;
  cargando: boolean;
}) {
  const [comprador, setComprador] = useState('');
  const [telefono, setTelefono] = useState('');
  return (
    <Dialogo abierto={abierto} titulo="Reservar cartón" onCerrar={onCerrar}>
      <Campo label="Comprador (opcional)">
        <input className={inputCls} value={comprador} onChange={(e) => setComprador(e.target.value)} />
      </Campo>
      <Campo label="Teléfono (opcional)">
        <input className={inputCls} type="tel" value={telefono} onChange={(e) => setTelefono(e.target.value)} />
      </Campo>
      <div className="flex gap-2">
        <Boton variante="secundario" className="flex-1" onClick={onCerrar}>Cancelar</Boton>
        <Boton
          variante="ambar"
          className="flex-1"
          disabled={cargando}
          onClick={() => onConfirmar({ comprador: comprador.trim(), telefono: telefono.trim() })}
        >
          Reservar
        </Boton>
      </div>
    </Dialogo>
  );
}
