import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import Link from "next/link";

export default async function AdminDashboard() {
  // Create the Supabase client for authentication
  const supabase = await createClient();

  // Fetch the user from Supabase auth
  const {
    data: { user },
  } = await supabase.auth.getUser();

  console.log("=== Admin Dashboard Access Attempt ===");
  console.log("Supabase user:", user ? { id: user.id, email: user.email } : "null");

  if (!user) {
    console.log("No user found, redirecting to sign-in");
    return redirect("/sign-in");
  }

  // Default values in case profile check fails
  let profileRole = "No profile";
  let isUserAdmin = false;

  try {
    console.log("Looking up profile for user ID:", user.id);
    
    // Verify database connection
    try {
      await prisma.$connect();
      console.log("Database connection verified");
    } catch (connErr) {
      console.error("Database connection failed:", connErr);
      return redirect("/");
    }
    
    // Get the profile with minimal fields needed
    const profile = await prisma.profile.findUnique({
      where: { id: user.id },
      select: { role: true }
    });

    console.log("Profile data:", profile);
    
    if (!profile) {
      console.log("No profile found for user ID:", user.id);
      return redirect("/");
    }
    
    // Stringified role comparison - works with any type of enum
    profileRole = String(profile.role || "");
    console.log("Raw role value:", profileRole, "Type:", typeof profile.role);
    
    // Check for ADMIN in any form, case-insensitive
    isUserAdmin = profileRole.toUpperCase().includes("ADMIN");
    console.log("Is admin check result:", isUserAdmin);
    
    if (!isUserAdmin) {
      console.log("User doesn't have admin role");
      return redirect("/");
    }
    
  } catch (error) {
    console.error("Error in admin access check:", error);
    return redirect("/");
  }

  return (
    <div className="container mx-auto py-10">
      <h1 className="text-3xl font-bold mb-6">Admin Dashboard</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <DashboardCard 
          title="Orders" 
          href="/admin/orders" 
          description="Manage customer orders" 
        />
        <DashboardCard 
          title="Products" 
          href="/admin/products" 
          description="Manage store products" 
        />
        <DashboardCard 
          title="Categories" 
          href="/admin/categories" 
          description="Manage product categories" 
        />
        <DashboardCard 
          title="Settings" 
          href="/admin/settings" 
          description="Configure store settings" 
        />
        <DashboardCard 
          title="Users" 
          href="/admin/users" 
          description="Manage user accounts" 
        />
        <DashboardCard 
          title="Business Hours" 
          href="/admin/hours" 
          description="Set store hours" 
        />
      </div>
      
      <div className="mt-10 p-4 bg-gray-100 rounded-lg">
        <p className="text-sm text-gray-600 mb-2">Debug Info:</p>
        <p className="text-sm">User: {user.email} (ID: {user.id})</p>
        <p className="text-sm">Role Value: {profileRole}</p>
        <p className="text-sm">Is Admin: {isUserAdmin ? "Yes" : "No"}</p>
      </div>
    </div>
  );
}

function DashboardCard({ 
  title, 
  href, 
  description 
}: { 
  title: string; 
  href: string; 
  description: string;
}) {
  return (
    <Link 
      href={href} 
      className="block p-6 bg-white rounded-lg border border-gray-200 shadow-md hover:bg-gray-50"
    >
      <h5 className="mb-2 text-xl font-bold tracking-tight">{title}</h5>
      <p className="text-gray-600">{description}</p>
    </Link>
  );
} 