import type { OidcProviderConfig } from "./oidc.js";

// Provider registry. Each factory returns null when its env vars are missing,
// so an operator can enable providers independently by setting their creds.

function readAzureProvider(): OidcProviderConfig | null {
  const tenantId = process.env["AZURE_AD_TENANT_ID"];
  const clientId = process.env["AZURE_AD_CLIENT_ID"];
  const clientSecret = process.env["AZURE_AD_CLIENT_SECRET"];
  const redirectUri = process.env["AZURE_AD_REDIRECT_URI"];
  const homeTenantSlug = process.env["AZURE_AD_HOME_TENANT_SLUG"] ?? "berkeley";
  if (!tenantId || !clientId || !clientSecret || !redirectUri) return null;

  const authority = `https://login.microsoftonline.com/${tenantId}`;
  return {
    id: "azure",
    label: "Microsoft",
    authorizationEndpoint: `${authority}/oauth2/v2.0/authorize`,
    tokenEndpoint: `${authority}/oauth2/v2.0/token`,
    jwksUri: `${authority}/discovery/v2.0/keys`,
    allowedIssuers: [`${authority}/v2.0`],
    clientId,
    clientSecret,
    redirectUri,
    scopes: ["profile", "email", "offline_access"],
    subjectClaim: "oid",
    homeTenantSlug,
    expectedTid: tenantId,
  };
}

function readGoogleProvider(): OidcProviderConfig | null {
  const clientId = process.env["GOOGLE_CLIENT_ID"];
  const clientSecret = process.env["GOOGLE_CLIENT_SECRET"];
  const redirectUri = process.env["GOOGLE_REDIRECT_URI"];
  const homeTenantSlug = process.env["GOOGLE_HOME_TENANT_SLUG"] ?? "berkeley";
  if (!clientId || !clientSecret || !redirectUri) return null;

  return {
    id: "google",
    label: "Google",
    authorizationEndpoint: "https://accounts.google.com/o/oauth2/v2/auth",
    tokenEndpoint: "https://oauth2.googleapis.com/token",
    jwksUri: "https://www.googleapis.com/oauth2/v3/certs",
    // Google emits either URL depending on SDK/version; both are valid.
    allowedIssuers: ["https://accounts.google.com", "accounts.google.com"],
    clientId,
    clientSecret,
    redirectUri,
    scopes: ["profile", "email"],
    subjectClaim: "sub",
    homeTenantSlug,
  };
}

export function readOidcProviders(): Record<string, OidcProviderConfig> {
  const providers: Record<string, OidcProviderConfig> = {};
  const azure = readAzureProvider();
  if (azure) providers[azure.id] = azure;
  const google = readGoogleProvider();
  if (google) providers[google.id] = google;
  return providers;
}

export function readOidcProvider(id: string): OidcProviderConfig | null {
  return readOidcProviders()[id] ?? null;
}
