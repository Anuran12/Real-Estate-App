import { Account, Avatars, Client, OAuthProvider } from "react-native-appwrite";
import * as Linking from "expo-linking";
import { openAuthSessionAsync } from "expo-web-browser";

export const config = {
  platform: "com.anu.restate",
  endpoint: process.env.EXPO_PUBLIC_APPWRITE_ENDPOINT,
  projectId: process.env.EXPO_PUBLIC_APPWRITE_PROJECT_ID,
};

export const client = new Client();

client
  .setEndpoint(config.endpoint!)
  .setProject(config.projectId!)
  .setPlatform(config.platform!);

export const avatar = new Avatars(client);
export const account = new Account(client);

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
