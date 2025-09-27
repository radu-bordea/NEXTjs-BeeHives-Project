// /utils/authOptions.js
import GoogleProvider from "next-auth/providers/google";
import clientPromise from "@/lib/mongodb";

const adminEmails = (process.env.ADMIN_EMAILS || "")
  .split(",")
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean);

export const authOptions = {
  secret: process.env.NEXTAUTH_SECRET,
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      authorization: {
        params: {
          prompt: "consent",
          access_type: "offline",
          response_type: "code",
        },
      },
    }),
  ],
  callbacks: {
    async signIn({ profile }) {
      try {
        const client = await clientPromise;
        const db = client.db();
        const usersCollection = db.collection("users");

        const email = profile?.email?.toLowerCase();

        const existingUser = await usersCollection.findOne({ email });
        if (!existingUser) {
          await usersCollection.insertOne({
            email,
            name: profile.name,
            image: profile.picture,
            createdAt: new Date(),
          });
        }
        return true; // ✅ everyone can sign in
      } catch (error) {
        console.error("Error in signIn callback:", error);
        return false;
      }
    },

    // Store isAdmin on the JWT first
    async jwt({ token, user }) {
      // user is only present on initial sign-in
      const email = (user?.email || token?.email || "").toLowerCase();
      token.isAdmin = adminEmails.includes(email);
      return token;
    },

    // Then mirror that onto the session
    async session({ session, token }) {
      try {
        const client = await clientPromise;
        const db = client.db();
        const email = (session?.user?.email || "").toLowerCase();

        const userDoc = await db.collection("users").findOne({ email });
        if (userDoc) {
          session.user.id = userDoc._id.toString();
        }

        // ✅ expose admin flag in the client
        session.user.isAdmin = Boolean(token?.isAdmin);
        return session;
      } catch (error) {
        console.error("Error in session callback:", error);
        session.user.isAdmin = Boolean(token?.isAdmin);
        return session;
      }
    },
  },
};
