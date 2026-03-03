import ChangePasswordDialog from "@/components/profile/ChangePasswordDialog";
import LoginHistoryTable from "@/components/profile/LoginHistoryTable";
import ProfileForm from "@/components/profile/ProfileForm";
import UserInfoCard from "@/components/profile/UserInfoCard";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";

export default async function ProfilePage() {
   const session = await auth();
   if (!session?.user?.id) {
      redirect("/login");
   }

   const userType = (session?.user as any)?.userType as string | undefined;
   const userId = BigInt(session.user.id);

   let user: any = null;

   // Fetch from appropriate table based on user type
   if (userType === "ADMIN") {
      user = await prisma.admin.findUnique({
         where: { id: userId },
         select: {
            name: true,
            email: true,
            username: true,
            image: true,
            profile: true,
            loginHistory: {
               take: 10,
               orderBy: { createdAt: "desc" },
            },
         },
      });
   } else {
      user = await prisma.user.findUnique({
         where: { id: userId },
         select: {
            name: true,
            email: true,
            username: true,
            image: true,
            profile: true,
            loginHistory: {
               take: 10,
               orderBy: { createdAt: "desc" },
            },
         },
      });
   }

   if (!user) {
      redirect("/login");
   }

   const userData = {
      name: user.name ?? "",
      email: user.email ?? "",
      username: user.username ?? "",
      image: user.image,
   };

   const userInfoData = {
      dateOfBirth: user.profile?.dateOfBirth?.toISOString() ?? null,
      phone: user.profile?.phone ?? null,
      gender: user.profile?.gender ?? null,
      address: user.profile?.address ?? null,
      profession: user.profile?.profession ?? null,
      hobbys: user.profile?.hobbys ?? null,
   };

   // Ensure non-null history
   const loginHistoryData = (user.loginHistory ?? []).map((h: any) => ({
      id: h.id.toString(),
      ipAddress: h.ipAddress,
      userAgent: h.userAgent,
      location: h.location,
      createdAt: h.createdAt.toISOString(),
   }));

   return (
      <div className="p-8 space-y-8 max-w-5xl mx-auto">
         <h1 className="text-3xl font-bold">My Profile</h1>

         <div className="grid gap-8 md:grid-cols-2">
            <ProfileForm user={userData} />
            <ChangePasswordDialog />
         </div>

         <div className="w-full">
            <UserInfoCard initialData={userInfoData} />
         </div>

         <div className="w-full">
            <LoginHistoryTable history={loginHistoryData} />
         </div>
      </div>
   );
}
