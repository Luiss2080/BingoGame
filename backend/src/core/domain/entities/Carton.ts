export enum EstadoCarton {
  DISPONIBLE = 'disponible',
  VENDIDO = 'vendido',
  RESERVADO = 'reservado',
}

export class Carton {
  constructor(
    public readonly id: number,
    public readonly numero: string,
    public readonly pdfId: number,
    public readonly paginaOrigen: number,
    public readonly rutaImagen: string,
    public estado: EstadoCarton,
    public vendedorId?: number | null,
    public grupoId?: number | null,
    public comprador?: string | null,
    public telefonoComprador?: string | null,
    public fechaVenta?: Date | null,
    public precio?: number | null,
    public notas?: string | null,
    public readonly fechaCreacion?: Date,
    public fechaActualizacion?: Date,
  ) {}

  public marcarComoVendido(
    vendedorId: number,
    comprador: string,
    precio: number,
    telefono?: string,
  ): void {
    if (this.estado !== EstadoCarton.DISPONIBLE && this.estado !== EstadoCarton.RESERVADO) {
      throw new Error(`El cartón no está disponible para la venta. Estado actual: ${this.estado}`);
    }
    
    this.estado = EstadoCarton.VENDIDO;
    this.vendedorId = vendedorId;
    this.comprador = comprador;
    this.precio = precio;
    this.telefonoComprador = telefono || null;
    this.fechaVenta = new Date();
    this.fechaActualizacion = new Date();
  }

  public liberar(): void {
    this.estado = EstadoCarton.DISPONIBLE;
    this.vendedorId = null;
    this.comprador = null;
    this.precio = null;
    this.telefonoComprador = null;
    this.fechaVenta = null;
    this.fechaActualizacion = new Date();
  }
}
