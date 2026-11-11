// Public client config. The publishable key is designed to ship in browser code:
// every table is protected by row-level security, and scores are written only by
// server-side functions. Never put the service_role / secret key here.
module.exports = {
  url: "https://vxzbiytdjcyaqupgxjzx.supabase.co",
  key: "sb_publishable_JKmm-b6Iz0bvOpxP23wVOg_POF2ECrn",
  storageKey: "sb-vxzbiytdjcyaqupgxjzx-auth-token",
  // Cloudflare Turnstile site key (public). Empty = no CAPTCHA. Set it, deploy, then switch on
  // Supabase → Auth → Attack Protection → CAPTCHA with the matching secret key.
  // Show "Continue with Google" only once Supabase → Auth → Providers → Google is enabled.
  googleEnabled: true,
  turnstileSiteKey: "0x4AAAAAAF6JIgCLMeuj-3Ca",
};
