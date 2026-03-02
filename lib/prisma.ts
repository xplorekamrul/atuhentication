import 'dotenv/config';
import { PrismaMariaDb } from '@prisma/adapter-mariadb';
import { PrismaClient } from '@prisma/client';

let prisma: PrismaClient;

const globalForPrisma = globalThis as unknown as {
    prisma?: PrismaClient;
};

if (!globalForPrisma.prisma) {
    const adapter = new PrismaMariaDb({
        host: process.env.MARIADB_HOST || 'localhost',
        port: Number(process.env.MARIADB_PORT) || 3306,
        user: process.env.MARIADB_USER || 'root',
        password: process.env.MARIADB_PASSWORD || '',
        database: process.env.MARIADB_DATABASE || 'obokash',
    });

    globalForPrisma.prisma = new PrismaClient({ adapter });
}

prisma = globalForPrisma.prisma;

export { prisma };
