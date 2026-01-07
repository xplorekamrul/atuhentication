
import { PrismaClient } from "@prisma/client";
import dotenv from "dotenv";
dotenv.config();

const prisma = new PrismaClient();

async function main() {
   console.log("Connecting to DB...");
   const user = await prisma.user.findFirst();

   if (!user) {
      console.log("No users found. Cannot test LoginHistory creation.");
      return;
   }

   console.log("Found user:", user.email, user.id);

   console.log("Attempting to create LoginHistory entry...");
   try {
      const entry = await prisma.loginHistory.create({
         data: {
            userId: user.id,
            ipAddress: "127.0.0.1",
            userAgent: "Test Script/1.0",
            location: "Test Location",
         },
      });
      console.log("Successfully created LoginHistory entry:", entry);
   } catch (error) {
      console.error("Error creating LoginHistory:", error);
   }
}

main()
   .catch((e) => console.error(e))
   .finally(async () => {
      await prisma.$disconnect();
   });
