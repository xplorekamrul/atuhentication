import { prisma } from "@/lib/prisma";

export interface RecordLoginHistoryParams {
  adminId?: bigint | null;
  userId?: bigint | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  location?: string | null;
  maxKeep?: number;
}

/**
 * Creates a login history record and automatically keeps only the last `maxKeep`
 * (default: 20) records for the given user or admin, cleaning up older records.
 */
export async function recordLoginHistory({
  adminId,
  userId,
  ipAddress,
  userAgent,
  location,
  maxKeep = 20,
}: RecordLoginHistoryParams) {
  if (!adminId && !userId) return;

  // 1. Create the new login history entry
  await prisma.loginHistory.create({
    data: {
      adminId: adminId || null,
      userId: userId || null,
      ipAddress: ipAddress || null,
      userAgent: userAgent || null,
      location: location || null,
    },
  });

  // 2. Clean up old records beyond the last `maxKeep`
  try {
    const whereClause = adminId ? { adminId } : { userId: userId! };

    // Fetch the IDs of the latest `maxKeep` entries
    const latestEntries = await prisma.loginHistory.findMany({
      where: whereClause,
      orderBy: { createdAt: "desc" },
      take: maxKeep,
      select: { id: true },
    });

    if (latestEntries.length === maxKeep) {
      const keepIds = latestEntries.map((e) => e.id);
      await prisma.loginHistory.deleteMany({
        where: {
          ...whereClause,
          id: { notIn: keepIds },
        },
      });
    }
  } catch (cleanupError) {
    console.error("Failed to clean up old login history:", cleanupError);
  }
}

