import { FormEvent, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, mensajeError } from '../api/client';
import { Fab, Pantalla } from '../components/Layout';
import { Boton, Campo, Dialogo, Spinner, Vacio, inputCls } from '../components/ui';

interface Usuario {
  id: number;
  username: string;
  rol: 'admin' | 'vendedor';
  activo: boolean;
  grupo_id: number | null;
}
interface Grupo { id: number; nombre: string }

export default function Usuarios() {
  const qc = useQueryClient();
  const [editar, setEditar] = useState<Usuario | 'nuevo' | null>(null);
  const [aEliminar, setAEliminar] = useState<Usuario | null>(null);
  const [error, setError] = useState('');

  const { data: usuarios, isLoading } = useQuery<Usuario[]>({
    queryKey: ['auth-usuarios'],
    queryFn: async () => (await api.get('/auth/usuarios')).data,
  });
  const { data: grupos } = useQuery<Grupo[]>({
    queryKey: ['grupos'],
    queryFn: async () => (await api.get('/grupos')).data,
  });

  const invalidar = () => qc.invalidateQueries({ queryKey: ['auth-usuarios'] });

  const eliminar = useMutation({
    mutationFn: async (id: number) => (await api.delete(`/auth/usuarios/${id}`)).data,
    onSuccess: () => {
      invalidar();
      setAEliminar(null);
      setError('');
    },
    onError: (e) => setError(mensajeError(e)),
  });

  return (
    <Pantalla titulo="Usuarios">
      {isLoading ? (
        <Spinner />
      ) : !usuarios?.length ? (
        <Vacio mensaje="Sin usuarios" />
      ) : (
        <div className="space-y-2.5">
          {usuarios.map((u) => (
            <div key={u.id} className="flex items-center gap-3 rounded-2xl border border-line bg-surface p-4 shadow-sm shadow-black/20">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand/15 font-bold text-brand">
                {u.username[0].toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold text-white">{u.username}</p>
                <div className="flex gap-1.5">
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${
                    u.rol === 'admin' ? 'bg-brand/15 text-brand' : 'bg-ok/15 text-ok'
                  }`}>
                    {u.rol}
                  </span>
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${
                    u.activo ? 'bg-ok/15 text-ok' : 'bg-bad/15 text-bad'
                  }`}>
                    {u.activo ? 'Activo' : 'Inactivo'}
                  </span>
                </div>
              </div>
              <button aria-label="Editar" className="rounded-full p-2 active:bg-white/10" onClick={() => setEditar(u)}>✏️</button>
              <button aria-label="Eliminar" className="rounded-full p-2 active:bg-white/10" onClick={() => setAEliminar(u)}>🗑</button>
            </div>
          ))}
        </div>
      )}

      <Fab onClick={() => setEditar('nuevo')} />

      {editar && (
        <DialogoUsuario
          usuario={editar === 'nuevo' ? null : editar}
          grupos={grupos ?? []}
          onCerrar={() => setEditar(null)}
          onGuardado={() => {
            invalidar();
            setEditar(null);
          }}
        />
      )}

      <Dialogo abierto={!!aEliminar} titulo={`¿Eliminar a ${aEliminar?.username}?`} onCerrar={() => setAEliminar(null)}>
        <p className="mb-4 text-sm text-muted">Sus cartones quedarán sin vendedor asignado.</p>
        {error && <p className="mb-2 text-sm text-bad">{error}</p>}
        <div className="flex gap-2">
          <Boton variante="secundario" className="flex-1" onClick={() => setAEliminar(null)}>Cancelar</Boton>
          <Boton variante="peligro" className="flex-1" disabled={eliminar.isPending} onClick={() => aEliminar && eliminar.mutate(aEliminar.id)}>
            Eliminar
          </Boton>
        </div>
      </Dialogo>
    </Pantalla>
  );
}

function DialogoUsuario({ usuario, grupos, onCerrar, onGuardado }: {
  usuario: Usuario | null;
  grupos: Grupo[];
  onCerrar: () => void;
  onGuardado: () => void;
}) {
  const esNuevo = usuario === null;
  const [username, setUsername] = useState(usuario?.username ?? '');
  const [password, setPassword] = useState('');
  const [confirmar, setConfirmar] = useState('');
  const [rol, setRol] = useState<'admin' | 'vendedor'>(usuario?.rol ?? 'vendedor');
  const [grupoId, setGrupoId] = useState(usuario?.grupo_id ?? 0);
  const [activo, setActivo] = useState(usuario?.activo ?? true);
  const [error, setError] = useState('');
  const [cargando, setCargando] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    if (esNuevo && !username.trim()) return setError('Usuario requerido');
    if (esNuevo && !password) return setError('Contraseña requerida');
    if (password && password !== confirmar) return setError('Las contraseñas no coinciden');

    setCargando(true);
    try {
      if (esNuevo) {
        await api.post('/auth/usuarios', {
          username: username.trim(),
          password,
          rol,
          grupo_id: grupoId || null,
        });
      } else {
        await api.put(`/auth/usuarios/${usuario.id}`, {
          ...(password ? { password } : {}),
          rol,
          activo,
          grupo_id: grupoId || null,
        });
      }
      onGuardado();
    } catch (e2) {
      setError(mensajeError(e2));
    } finally {
      setCargando(false);
    }
  }

  return (
    <Dialogo abierto titulo={esNuevo ? 'Nuevo usuario' : `Editar ${usuario.username}`} onCerrar={onCerrar}>
      <form onSubmit={onSubmit}>
        <Campo label="Usuario">
          <input className={inputCls} value={username} disabled={!esNuevo} onChange={(e) => setUsername(e.target.value)} autoCapitalize="none" />
        </Campo>
        <Campo label={esNuevo ? 'Contraseña' : 'Nueva contraseña (dejar vacío para no cambiar)'}>
          <input className={inputCls} type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
        </Campo>
        <Campo label="Confirmar contraseña">
          <input className={inputCls} type="password" value={confirmar} onChange={(e) => setConfirmar(e.target.value)} />
        </Campo>
        <Campo label="Rol">
          <select className={inputCls} value={rol} onChange={(e) => setRol(e.target.value as 'admin' | 'vendedor')}>
            <option value="vendedor">Vendedor</option>
            <option value="admin">Admin</option>
          </select>
        </Campo>
        <Campo label="Grupo">
          <select className={inputCls} value={grupoId} onChange={(e) => setGrupoId(Number(e.target.value))}>
            <option value={0}>Sin grupo</option>
            {grupos.map((g) => (
              <option key={g.id} value={g.id}>{g.nombre}</option>
            ))}
          </select>
        </Campo>
        {!esNuevo && (
          <label className="mb-3 flex items-center gap-2 text-sm font-medium text-muted">
            <input type="checkbox" className="h-4 w-4 accent-brand" checked={activo} onChange={(e) => setActivo(e.target.checked)} />
            Usuario activo
          </label>
        )}
        {error && <p className="mb-2 text-sm text-bad">{error}</p>}
        <div className="flex gap-2">
          <Boton variante="secundario" className="flex-1" onClick={onCerrar}>Cancelar</Boton>
          <Boton type="submit" className="flex-1" disabled={cargando}>Guardar</Boton>
        </div>
      </form>
    </Dialogo>
  );
}
