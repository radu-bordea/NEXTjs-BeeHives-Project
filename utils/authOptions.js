// /utils/authOptions.js
import GoogleProvider from "next-auth/providers/google";
import clientPromise from "@/lib/mongodb";

export const authOptions = {
  secret: process.env.NEXTAUTH_SECRET, // ✅ Required in production
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
        const db = client.db(); // uses default DB from URI
        const usersCollection = db.collection("users");

        const existingUser = await usersCollection.findOne({
          email: profile.email,
        });

        if (!existingUser) {
          await usersCollection.insertOne({
            email: profile.email,
            name: profile.name,
            image: profile.picture,
            createdAt: new Date(),
          });
        }

        return true;
      } catch (error) {
        console.error("Error in signIn callback:", error);
        return false;
      }
    },

    async session({ session }) {
      try {
        const client = await clientPromise;
        const db = client.db();

        const user = await db
          .collection("users")
          .findOne({ email: session.user.email });

        if (user) {
          session.user.id = user._id.toString(); // attach MongoDB _id to session
        }

        return session;
      } catch (error) {
        console.error("Error in session callback:", error);
        return session; // fallback session
      }
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
};
