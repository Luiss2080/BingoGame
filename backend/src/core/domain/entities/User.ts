export enum Rol {
  ADMIN = 'admin',
  VENDEDOR = 'vendedor',
}

export class User {
  constructor(
    public readonly id: number,
    public username: string,
    public passwordHash: string,
    public rol: Rol,
    public activo: boolean,
    public grupoId: number | null,
    public readonly fechaCreacion: Date,
  ) {}

  desactivar(): void {
    this.activo = false;
  }

  activar(): void {
    this.activo = true;
  }

  cambiarRol(nuevoRol: Rol): void {
    this.rol = nuevoRol;
  }
}
