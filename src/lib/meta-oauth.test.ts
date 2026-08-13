import assert from "node:assert/strict";
import test from "node:test";
import {
  buildMetaOAuthUrl,
  getMissingMetaOAuthConfig,
  isMetaOAuthConfigured,
  type MetaOAuthConfig,
} from "./meta-oauth.ts";

const completeConfig: MetaOAuthConfig = {
  clientId: "facebook-app-id",
  clientSecret: "facebook-app-secret",
  redirectUri: "https://wehearyou.app/api/integrations/meta/connect",
};

test("getMissingMetaOAuthConfig identifies each required OAuth setting", () => {
  assert.deepEqual(
    getMissingMetaOAuthConfig({ clientId: "", clientSecret: " ", redirectUri: "" }),
    ["META_APP_ID", "META_APP_SECRET", "META_OAUTH_REDIRECT_URI"],
  );
  assert.equal(isMetaOAuthConfigured(completeConfig), true);
  assert.equal(isMetaOAuthConfigured({ ...completeConfig, redirectUri: "" }), false);
});

test("buildMetaOAuthUrl refuses incomplete configuration instead of emitting an invalid provider URL", () => {
  const originalAppId = process.env.META_APP_ID;
  const originalSecret = process.env.META_APP_SECRET;
  const originalRedirectUri = process.env.META_OAUTH_REDIRECT_URI;

  try {
    process.env.META_APP_ID = "";
    process.env.META_APP_SECRET = "";
    process.env.META_OAUTH_REDIRECT_URI = "";

    assert.throws(
      () => buildMetaOAuthUrl("state-value"),
      /Meta OAuth is not configured: missing META_APP_ID, META_APP_SECRET, META_OAUTH_REDIRECT_URI/,
    );
  } finally {
    if (originalAppId === undefined) delete process.env.META_APP_ID;
    else process.env.META_APP_ID = originalAppId;
    if (originalSecret === undefined) delete process.env.META_APP_SECRET;
    else process.env.META_APP_SECRET = originalSecret;
    if (originalRedirectUri === undefined) delete process.env.META_OAUTH_REDIRECT_URI;
    else process.env.META_OAUTH_REDIRECT_URI = originalRedirectUri;
  }
});

test("buildMetaOAuthUrl requests only the Page access needed to list Pages and read recommendations", () => {
  const originalAppId = process.env.META_APP_ID;
  const originalSecret = process.env.META_APP_SECRET;
  const originalRedirectUri = process.env.META_OAUTH_REDIRECT_URI;

  try {
    process.env.META_APP_ID = completeConfig.clientId;
    process.env.META_APP_SECRET = completeConfig.clientSecret;
    process.env.META_OAUTH_REDIRECT_URI = completeConfig.redirectUri;

    const url = new URL(buildMetaOAuthUrl("state-value"));
    assert.equal(url.searchParams.get("client_id"), completeConfig.clientId);
    assert.equal(url.searchParams.get("redirect_uri"), completeConfig.redirectUri);
    assert.equal(url.searchParams.get("state"), "state-value");
    assert.equal(
      url.searchParams.get("scope"),
      "pages_show_list,pages_read_engagement,pages_read_user_content",
    );
  } finally {
    if (originalAppId === undefined) delete process.env.META_APP_ID;
    else process.env.META_APP_ID = originalAppId;
    if (originalSecret === undefined) delete process.env.META_APP_SECRET;
    else process.env.META_APP_SECRET = originalSecret;
    if (originalRedirectUri === undefined) delete process.env.META_OAUTH_REDIRECT_URI;
    else process.env.META_OAUTH_REDIRECT_URI = originalRedirectUri;
  }
});
