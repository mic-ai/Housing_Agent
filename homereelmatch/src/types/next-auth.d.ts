import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      companyId: string;
      role: "SALESPERSON" | "ADMIN";
    } & DefaultSession["user"];
  }

  interface User {
    companyId: string;
    role: "SALESPERSON" | "ADMIN";
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    companyId: string;
    role: "SALESPERSON" | "ADMIN";
  }
}
