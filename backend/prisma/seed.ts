import { PrismaClient } from '@prisma/client';
import * as argon2 from 'argon2';
import { DEFAULTS_VENDEDOR, PERMISOS } from '@bingo/common';

const prisma = new PrismaClient();

async function main() {
  const adminPassword = process.env.ADMIN_PASSWORD ?? 'admin1234';
  const admin = await prisma.user.upsert({
    where: { username: 'admin' },
    update: {},
    create: {
      username: 'admin',
      passwordHash: await argon2.hash(adminPassword),
      rol: 'admin',
    },
  });
  console.log(`Admin listo (id=${admin.id})`);

  for (const permiso of PERMISOS) {
    await prisma.permisoRol.upsert({
      where: { uq_permiso_rol: { rol: 'vendedor', permiso } },
      update: {},
      create: {
        rol: 'vendedor',
        permiso,
        habilitado: DEFAULTS_VENDEDOR[permiso],
      },
    });
  }
  console.log('Permisos por defecto del rol vendedor listos');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
