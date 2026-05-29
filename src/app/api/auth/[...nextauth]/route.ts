import NextAuth, { AuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import { compare } from 'bcryptjs';
import { prisma } from '@/lib/prisma';

export const authOptions: AuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
          include: { professional: { select: { id: true, slug: true, name: true } } },
        });

        if (!user) return null;

        const isValid = await compare(credentials.password, user.password);
        if (!isValid) return null;

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          professionalId: user.professionalId,
          professionalSlug: user.professional?.slug || null,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, trigger }) {
      if (user) {
        const u = user as unknown as { role: string; professionalId: string | null; professionalSlug: string | null };
        token.role = u.role;
        token.professionalId = u.professionalId;
        token.professionalSlug = u.professionalSlug;
        // Session epoch (issue #21): a token is valid only while issued at/after the
        // user's last password change. Stamped at login, refreshed on update().
        // NOTE: do NOT use token.iat — NextAuth re-stamps it on every session read.
        token.pwcAt = Date.now();
      }
      // After a user changes their own password, the client calls session update();
      // refresh pwcAt so the CURRENT session survives while the others are invalidated.
      if (trigger === 'update' && token.sub) {
        const dbUser = await prisma.user.findUnique({
          where: { id: token.sub },
          select: { passwordChangedAt: true },
        });
        token.pwcAt = dbUser?.passwordChangedAt?.getTime() ?? Date.now();
      }
      return token;
    },
    async session({ session, token }) {
      // Invalidate sessions whose JWT predates the user's last password change
      // (issue #21). One indexed PK lookup per session check is the cost of real
      // invalidation with a stateless JWT and no server-side session store.
      if (token.sub) {
        const dbUser = await prisma.user.findUnique({
          where: { id: token.sub },
          select: { passwordChangedAt: true },
        });
        if (
          dbUser?.passwordChangedAt &&
          (typeof token.pwcAt === 'number' ? token.pwcAt : 0) < dbUser.passwordChangedAt.getTime()
        ) {
          // Returning null → getServerSession() returns null → forces re-login.
          return null as unknown as typeof session;
        }
      }
      if (session.user) {
        (session.user as { id: string }).id = token.sub as string;
        (session.user as { role: string }).role = token.role as string;
        (session.user as { professionalId: string | null }).professionalId = token.professionalId as string | null;
        (session.user as { professionalSlug: string | null }).professionalSlug = token.professionalSlug as string | null;
      }
      return session;
    },
  },
  pages: {
    signIn: '/login',
  },
  session: {
    strategy: 'jwt',
    maxAge: 7 * 24 * 60 * 60, // 7 days
  },
  secret: process.env.NEXTAUTH_SECRET,
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
