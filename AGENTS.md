<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

## Project rules
- SEFAZ/AL API is called only from server code (`src/lib/economiza/proxy.server.ts`) via server functions; the browser never sees the token or the upstream URL.
- The real integration refuses non-HTTPS base URLs, because the AppToken must never travel unencrypted.
- All raw API response quirks are mapped in `src/lib/economiza/adapter.ts`; no field fallbacks elsewhere.
- Request validation lives in `src/lib/economiza/validation.ts` and is shared by form and server so both enforce identical limits.
- Lists, favorites and preferences are localStorage-only (no login/database) by product decision.
