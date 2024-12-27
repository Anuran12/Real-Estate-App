import {
  Account,
  Avatars,
  Client,
  Databases,
  OAuthProvider,
  Query,
} from "react-native-appwrite";
import * as Linking from "expo-linking";
import { openAuthSessionAsync } from "expo-web-browser";
import { router } from "expo-router";
import { useEffect } from "react";

export const config = {
  platform: "com.anu.restate",
  endpoint: process.env.EXPO_PUBLIC_APPWRITE_ENDPOINT,
  projectId: process.env.EXPO_PUBLIC_APPWRITE_PROJECT_ID,
  databaseId: process.env.EXPO_PUBLIC_APPWRITE_DATABASE_ID,
  galleriesCollectionId:
    process.env.EXPO_PUBLIC_APPWRITE_GALLERIES_COLLECTION_ID,
  reviewsCollectionId: process.env.EXPO_PUBLIC_APPWRITE_REVIEWS_COLLECTION_ID,
  agentsCollectionId: process.env.EXPO_PUBLIC_APPWRITE_AGENTS_COLLECTION_ID,
  propertiesCollectionId:
    process.env.EXPO_PUBLIC_APPWRITE_PROPERTIES_COLLECTION_ID,
};

export const client = new Client();

client
  .setEndpoint(config.endpoint!)
  .setProject(config.projectId!)
  .setPlatform(config.platform!);

export const avatar = new Avatars(client);
export const account = new Account(client);
export const databases = new Databases(client);

export function useCheckSession() {
  useEffect(() => {
    const checkSession = async () => {
      try {
        const user = await getCurrentUser();
        console.log(user);

        if (!user) {
          // No user found, redirect to sign-in
          router.replace("/sign-in");
        }
      } catch (error) {
        console.error("Session check failed:", error);
        // On error, redirect to sign-in as a safety measure
        router.replace("/sign-in");
      }
    };

    checkSession();
  }, []); // Empty dependency array means this runs once when component mounts
}

// Alternative: If you prefer a regular function over a hook
export async function checkSession(shouldRedirect = true) {
  try {
    const user = await getCurrentUser();

    if (!user && shouldRedirect) {
      router.replace("/sign-in");
    }

    return !!user; // Returns true if user is logged in, false otherwise
  } catch (error) {
    console.error("Session check failed:", error);
    if (shouldRedirect) {
      router.replace("/sign-in");
    }
    return false;
  }
}

export async function login() {
  try {
    console.log("Starting login process...");
    const redirectUri = Linking.createURL("/");
    console.log("Redirect URI:", redirectUri);

    console.log("Creating OAuth2 token...");
    const response = await account.createOAuth2Token(
      OAuthProvider.Google,
      redirectUri
    );

    if (!response) {
      console.error("No response from createOAuth2Token");
      throw new Error("OAuth token creation failed");
    }

    console.log("Opening auth session...");
    const browserResult = await openAuthSessionAsync(
      response.toString(),
      redirectUri,
      {
        showInRecents: true,
      }
    );

    console.log("Browser result type:", browserResult.type);
    if (browserResult.type !== "success") {
      console.error("Browser auth failed:", browserResult);
      throw new Error("Browser authentication failed");
    }

    console.log("Parsing URL:", browserResult.url);
    const url = new URL(browserResult.url);
    const secret = url.searchParams.get("secret");
    const userId = url.searchParams.get("userId");

    if (!secret || !userId) {
      console.error(
        "Missing parameters - Secret:",
        !!secret,
        "UserID:",
        !!userId
      );
      throw new Error("Missing authentication parameters");
    }

    console.log("Creating session...");
    const session = await account.createSession(userId, secret);

    if (!session) {
      console.error("Session creation failed");
      throw new Error("Failed to create session");
    }

    console.log("Login successful!");
    return true;
  } catch (error) {
    console.error("Login error full details:", {
      error,
      message: error instanceof Error ? error.message : "Unknown error",
      stack: error instanceof Error ? error.stack : undefined,
    });
    return false;
  }
}

export async function logout() {
  try {
    await account.deleteSession("current");
    return true;
  } catch (error) {
    if (error instanceof Error && error.toString().includes("missing scope")) {
      // Already logged out
      return true;
    }
    console.error(error);
    return false;
  }
}

export async function getCurrentUser() {
  try {
    const response = await account.get();

    if (response.$id) {
      const userAvatar = avatar.getInitials(response.name);

      return {
        ...response,
        avatar: userAvatar.toString(),
      };
    }
    return null;
  } catch (error) {
    if (error instanceof Error && error.toString().includes("missing scope")) {
      // User is not authenticated
      return null;
    }
    console.error(error);
    return null;
  }
}

export async function getLatestProperties() {
  try {
    const result = await databases.listDocuments(
      config.databaseId!,
      config.propertiesCollectionId!,
      [Query.orderAsc("$createdAt"), Query.limit(5)]
    );
    return result.documents;
  } catch (error) {
    console.error(error);
    return [];
  }
}

export async function getProperties({
  filter,
  query,
  limit,
}: {
  filter: string;
  query: string;
  limit?: number;
}) {
  try {
    const buildQuery = [Query.orderDesc("$createdAt")];
    if (filter && filter !== "All") {
      buildQuery.push(Query.equal("type", filter));
    }

    if (query) {
      buildQuery.push(
        Query.or([
          Query.search("name", query),
          Query.search("address", query),
          Query.search("type", query),
        ])
      );
    }

    if (limit) buildQuery.push(Query.limit(limit));

    const result = await databases.listDocuments(
      config.databaseId!,
      config.propertiesCollectionId!,
      buildQuery
    );
    return result.documents;
  } catch (error) {
    console.error(error);
    return [];
  }
}
