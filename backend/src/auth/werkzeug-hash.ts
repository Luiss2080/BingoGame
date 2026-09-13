import { pbkdf2Sync, scryptSync, timingSafeEqual } from 'node:crypto';

/**
 * Verifica hashes generados por werkzeug.security.generate_password_hash
 * (los usuarios migrados desde el backend Flask conservan su contraseña).
 * Formatos soportados:
 *   pbkdf2:sha256:600000$<salt>$<hex>
 *   scrypt:32768:8:1$<salt>$<hex>
 */
export function esHashWerkzeug(hash: string): boolean {
  return hash.startsWith('pbkdf2:') || hash.startsWith('scrypt:');
}

export function verificarHashWerkzeug(hash: string, password: string): boolean {
  const [method, salt, hexdigest] = hash.split('$');
  if (!method || !salt || !hexdigest) return false;

  const esperado = Buffer.from(hexdigest, 'hex');
  let calculado: Buffer;

  if (method.startsWith('pbkdf2:')) {
    // pbkdf2:<digest>[:<iteraciones>]
    const [, digest, iterStr] = method.split(':');
    const iteraciones = iterStr ? parseInt(iterStr, 10) : 260000;
    if (!digest || !Number.isFinite(iteraciones)) return false;
    calculado = pbkdf2Sync(
      Buffer.from(password, 'utf8'),
      Buffer.from(salt, 'utf8'),
      iteraciones,
      esperado.length,
      digest,
    );
  } else if (method.startsWith('scrypt:')) {
    // scrypt:<N>:<r>:<p> — werkzeug usa dklen=64
    const [, nStr, rStr, pStr] = method.split(':');
    const N = parseInt(nStr, 10);
    const r = parseInt(rStr, 10);
    const p = parseInt(pStr, 10);
    if (![N, r, p].every(Number.isFinite)) return false;
    calculado = scryptSync(
      Buffer.from(password, 'utf8'),
      Buffer.from(salt, 'utf8'),
      64,
      { N, r, p, maxmem: 0x7fffffff },
    );
  } else {
    return false;
  }

  return (
    calculado.length === esperado.length && timingSafeEqual(calculado, esperado)
  );
}
