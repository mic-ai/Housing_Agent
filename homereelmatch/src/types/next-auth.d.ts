import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      companyId: string | null;
      role: "SALESPERSON" | "ADMIN";
    } & DefaultSession["user"];
  }

  interface User {
    companyId: string | null;
    role: "SALESPERSON" | "ADMIN";
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    companyId: string | null;
    role: "SALESPERSON" | "ADMIN";
  }
}
