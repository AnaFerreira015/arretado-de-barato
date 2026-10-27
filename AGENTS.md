## Project rules
- SEFAZ/AL API is called only from server code (`src/lib/economiza/proxy.server.ts`) via server functions; the browser never sees the token or the upstream URL.
- HTTP is allowed only for the documented SEFAZ endpoint with ECONOMIZA_ALLOW_HTTP=true; use HTTPS when available.
- All raw API response quirks are mapped in `src/lib/economiza/adapter.ts`; no field fallbacks elsewhere.
- Request validation lives in `src/lib/economiza/validation.ts` and is shared by form and server so both enforce identical limits.
- Lists, favorites and preferences are localStorage-only (no login/database) by product decision.
