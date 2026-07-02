import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { z } from "zod";

const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

export const { handlers, auth, signIn, signOut } = NextAuth({
  trustHost: true,
  // AUTH_SECRET がなければ NEXTAUTH_SECRET にフォールバック（Vercel 環境変数名の揺れ対策）
  secret: process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET,
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const parsed = LoginSchema.safeParse(credentials);
        if (!parsed.success) return null;

        const salesperson = await prisma.salesperson.findUnique({
          where: { email: parsed.data.email },
          select: {
            id: true,
            name: true,
            email: true,
            password: true,
            companyId: true,
            role: true,
          },
        });
        if (!salesperson) return null;

        const valid = await bcrypt.compare(
          parsed.data.password,
          salesperson.password
        );
        if (!valid) return null;

        return {
          id: salesperson.id,
          name: salesperson.name,
          email: salesperson.email,
          companyId: salesperson.companyId,
          role: salesperson.role,
        };
      },
    }),
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.id = user.id as string;
        token.companyId = user.companyId;
        token.role = user.role;
      }
      return token;
    },
    session({ session, token }) {
      if (token) {
        session.user.id = token.id as string;
        session.user.companyId = (token.companyId as string | null) ?? null;
        session.user.role = token.role as "SALESPERSON" | "ADMIN";
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
  session: { strategy: "jwt" },
});
