import 'dotenv/config';
import { PrismaMariaDb } from '@prisma/adapter-mariadb';
import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
    prisma?: PrismaClient;
};

if (!globalForPrisma.prisma) {
    const dbUrl = process.env.DATABASE_URL || 'mysql://root:@localhost:3306/auth';
    const url = new URL(dbUrl);

    const adapter = new PrismaMariaDb({
        host: url.hostname,
        port: Number(url.port) || 3306,
        user: url.username,
        password: url.password,
        database: url.pathname.slice(1), // remove leading slash
    });

    globalForPrisma.prisma = new PrismaClient({ adapter });
}

export const prisma = globalForPrisma.prisma;
