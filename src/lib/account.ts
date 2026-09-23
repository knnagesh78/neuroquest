export function normalizeUsername(value: string): string {
  const username = value.trim().toLowerCase();
  if (!/^[a-z0-9][a-z0-9_]{2,23}$/.test(username)) {
    throw new Error(
      "Use 3–24 letters, numbers or underscores. Start with a letter or number.",
    );
  }
  return username;
}

/** Firebase's password provider requires an email identifier. This alias is never mailed. */
export function usernameEmail(value: string): string {
  return `${normalizeUsername(value)}@users.neuroquest.invalid`;
}

export function accountError(error: unknown): string {
  const code =
    typeof error === "object" && error !== null && "code" in error
      ? String(error.code)
      : "";
  const messages: Record<string, string> = {
    "auth/email-already-in-use":
      "That username is already taken. Try another one.",
    "auth/invalid-credential": "The username or password is incorrect.",
    "auth/user-not-found": "The username or password is incorrect.",
    "auth/wrong-password": "The username or password is incorrect.",
    "auth/weak-password":
      "Choose a stronger password with at least 8 characters.",
    "auth/password-does-not-meet-requirements":
      "Use at least 8 characters, including uppercase, lowercase, a number and a symbol.",
    "auth/too-many-requests":
      "Too many attempts. Please wait a little before trying again.",
    "auth/network-request-failed":
      "Unable to connect. Check your internet connection and try again.",
    "auth/user-disabled":
      "This account has been disabled. Contact your project administrator.",
    "auth/operation-not-allowed":
      "Account sign-in has not been enabled yet. Ask the project owner to finish Firebase setup.",
    "auth/configuration-not-found":
      "Account sign-in has not been enabled yet. Ask the project owner to finish Firebase setup.",
    "auth/invalid-api-key":
      "The Firebase project configuration needs attention. Contact the project owner.",
    "permission-denied":
      "Your cloud workspace could not be accessed. Ask the project owner to check the database rules.",
    "failed-precondition":
      "The cloud database needs setup. Contact the project owner.",
    unavailable:
      "Cloud storage is unavailable. Check your connection and retry.",
    "resource-exhausted":
      "The cloud service limit was reached. Your current changes are still open; export a backup and retry later.",
  };
  if (messages[code]) return messages[code];
  if (code)
    return "Something went wrong connecting to your account. Please retry.";
  return error instanceof Error
    ? error.message
    : "Something went wrong. Please try again.";
}
