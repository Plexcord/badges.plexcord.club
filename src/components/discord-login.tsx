export function DiscordLoginButton() {
  return (
    // Plain <a>: the OAuth route redirects off-site, so client-side navigation must not prefetch it.
    <a href="/api/auth/login" className="btn btn-primary w-full !h-10">
      Sign in with Discord
    </a>
  );
}
