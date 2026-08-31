/** Cloudflare Worker entry point for the vinext-starter template. */
import { handleImageOptimization, DEFAULT_DEVICE_SIZES, DEFAULT_IMAGE_SIZES } from "vinext/server/image-optimization";
import handler from "vinext/server/app-router-entry";

interface Env {
  ASSETS: Fetcher;
  DB: D1Database;
  FIREBASE_WEB_API_KEY?: string;
  FIREBASE_PROJECT_ID?: string;
  FIREBASE_SERVICE_ACCOUNT_EMAIL?: string;
  FIREBASE_SERVICE_ACCOUNT_PRIVATE_KEY?: string;
  DISCORD_CLIENT_ID?: string;
  DISCORD_CLIENT_SECRET?: string;
  DISCORD_BOT_TOKEN?: string;
  DISCORD_GUILD_ID?: string;
  DISCORD_VERIFIED_ROLE_ID?: string;
  DISCORD_CONSISTENT_ROLE_ID?: string;
  DISCORD_REDIRECT_URI?: string;
  DISCORD_STATE_SECRET?: string;
  IMAGES: {
    input(stream: ReadableStream): {
      transform(options: Record<string, unknown>): {
        output(options: { format: string; quality: number }): Promise<{ response(): Response }>;
      };
    };
  };
}

type DiscordLink = { discordId: string; username: string; consistentMember: boolean; linkedAt?: string; consecutiveMisses?: number };
type FirebaseIdentity = { uid: string; email: string };
const ORGANIZER_EMAILS = new Set(["heet2404@gmail.com", "hpa2309@gmail.com"]);
const encoder = new TextEncoder();

function json(data: unknown, status = 200) { return Response.json(data, { status }); }
function base64Url(bytes: Uint8Array) { return btoa(String.fromCharCode(...bytes)).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", ""); }
function base64UrlText(value: string) { return base64Url(encoder.encode(value)); }
function base64UrlDecode(value: string) {
  const normalized = value.replaceAll("-", "+").replaceAll("_", "/") + "=".repeat((4 - value.length % 4) % 4);
  return Uint8Array.from(atob(normalized), (character) => character.charCodeAt(0));
}

function discordReady(env: Env) {
  return Boolean(env.FIREBASE_WEB_API_KEY && env.FIREBASE_PROJECT_ID && env.FIREBASE_SERVICE_ACCOUNT_EMAIL && env.FIREBASE_SERVICE_ACCOUNT_PRIVATE_KEY && env.DISCORD_CLIENT_ID && env.DISCORD_CLIENT_SECRET && env.DISCORD_BOT_TOKEN && env.DISCORD_GUILD_ID && env.DISCORD_VERIFIED_ROLE_ID && env.DISCORD_CONSISTENT_ROLE_ID && env.DISCORD_REDIRECT_URI && env.DISCORD_STATE_SECRET);
}

async function firebaseIdentity(request: Request, env: Env): Promise<FirebaseIdentity> {
  const token = request.headers.get("Authorization")?.replace(/^Bearer\s+/i, "");
  if (!token || !env.FIREBASE_WEB_API_KEY) throw new Error("Sign in with Google before connecting Discord.");
  const response = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${encodeURIComponent(env.FIREBASE_WEB_API_KEY)}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ idToken: token }) });
  const payload = await response.json() as { users?: Array<{ localId?: string; email?: string }> };
  const user = payload.users?.[0];
  if (!response.ok || !user?.localId || !user.email) throw new Error("Your Google session has expired. Sign in again and retry.");
  return { uid: user.localId, email: user.email.toLowerCase() };
}

async function firebaseUid(request: Request, env: Env) {
  return (await firebaseIdentity(request, env)).uid;
}

async function signState(uid: string, secret: string) {
  const payload = base64UrlText(JSON.stringify({ uid, exp: Date.now() + 10 * 60_000, nonce: crypto.randomUUID() }));
  const key = await crypto.subtle.importKey("raw", encoder.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const signature = base64Url(new Uint8Array(await crypto.subtle.sign("HMAC", key, encoder.encode(payload))));
  return `${payload}.${signature}`;
}

async function verifyState(value: string | null, secret: string) {
  if (!value) throw new Error("Discord connection expired. Start again from your member pass.");
  const [payload, signature] = value.split(".");
  if (!payload || !signature) throw new Error("Invalid Discord connection state.");
  const key = await crypto.subtle.importKey("raw", encoder.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["verify"]);
  const valid = await crypto.subtle.verify("HMAC", key, base64UrlDecode(signature), encoder.encode(payload));
  if (!valid) throw new Error("Invalid Discord connection state.");
  const decoded = JSON.parse(new TextDecoder().decode(base64UrlDecode(payload))) as { uid?: string; exp?: number };
  if (!decoded.uid || !decoded.exp || decoded.exp < Date.now()) throw new Error("Discord connection expired. Start again from your member pass.");
  return decoded.uid;
}

function privateKeyBytes(value: string) {
  const pem = value.replaceAll("\\n", "\n").replace(/-----BEGIN PRIVATE KEY-----|-----END PRIVATE KEY-----|\s/g, "");
  return Uint8Array.from(atob(pem), (character) => character.charCodeAt(0));
}

async function firestoreToken(env: Env) {
  const issuedAt = Math.floor(Date.now() / 1000);
  const header = base64UrlText(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const claims = base64UrlText(JSON.stringify({ iss: env.FIREBASE_SERVICE_ACCOUNT_EMAIL, sub: env.FIREBASE_SERVICE_ACCOUNT_EMAIL, scope: "https://www.googleapis.com/auth/datastore", aud: "https://oauth2.googleapis.com/token", iat: issuedAt, exp: issuedAt + 3600 }));
  const signingInput = `${header}.${claims}`;
  const key = await crypto.subtle.importKey("pkcs8", privateKeyBytes(env.FIREBASE_SERVICE_ACCOUNT_PRIVATE_KEY!), { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, false, ["sign"]);
  const signature = base64Url(new Uint8Array(await crypto.subtle.sign("RSASSA-PKCS1-v1_5", key, encoder.encode(signingInput))));
  const response = await fetch("https://oauth2.googleapis.com/token", { method: "POST", headers: { "content-type": "application/x-www-form-urlencoded" }, body: new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion: `${signingInput}.${signature}` }) });
  const payload = await response.json() as { access_token?: string };
  if (!response.ok || !payload.access_token) throw new Error("Firebase service account is not configured correctly.");
  return payload.access_token;
}

async function firestoreRequest(env: Env, path: string, init: RequestInit = {}) {
  const token = await firestoreToken(env);
  const base = `https://firestore.googleapis.com/v1/projects/${encodeURIComponent(env.FIREBASE_PROJECT_ID!)}/databases/(default)`;
  const target = path.startsWith("documents:") ? `${base}/${path}` : `${base}/documents/${path}`;
  const response = await fetch(target, { ...init, headers: { Authorization: `Bearer ${token}`, "content-type": "application/json", ...(init.headers || {}) } });
  return response;
}

async function readDiscordLink(env: Env, uid: string): Promise<DiscordLink | null> {
  const response = await firestoreRequest(env, `discordLinks/${encodeURIComponent(uid)}`);
  if (response.status === 404) return null;
  const payload = await response.json() as { fields?: Record<string, { stringValue?: string; booleanValue?: boolean; timestampValue?: string; integerValue?: string }> };
  const fields = payload.fields;
  const discordId = fields?.discordId?.stringValue;
  const username = fields?.username?.stringValue;
  return discordId && username ? {
    discordId,
    username,
    consistentMember: fields?.consistentMember?.booleanValue === true,
    linkedAt: fields?.linkedAt?.timestampValue,
    consecutiveMisses: Number(fields?.consecutiveMisses?.integerValue || 0),
  } : null;
}

async function writeDiscordLink(env: Env, uid: string, link: DiscordLink) {
  const body = { fields: {
    discordId: { stringValue: link.discordId }, username: { stringValue: link.username },
    consistentMember: { booleanValue: link.consistentMember },
    linkedAt: { timestampValue: link.linkedAt || new Date().toISOString() },
    consecutiveMisses: { integerValue: String(link.consecutiveMisses || 0) },
  } };
  const query = new URLSearchParams();
  ["discordId", "username", "consistentMember", "linkedAt", "consecutiveMisses"].forEach((field) => query.append("updateMask.fieldPaths", field));
  const response = await firestoreRequest(env, `discordLinks/${encodeURIComponent(uid)}?${query}`, { method: "PATCH", body: JSON.stringify(body) });
  if (!response.ok) throw new Error("Could not save your verified Discord connection.");
}

async function addDiscordRole(env: Env, discordId: string, roleId: string) {
  const response = await fetch(`https://discord.com/api/v10/guilds/${encodeURIComponent(env.DISCORD_GUILD_ID!)}/members/${encodeURIComponent(discordId)}/roles/${encodeURIComponent(roleId)}`, { method: "PUT", headers: { Authorization: `Bot ${env.DISCORD_BOT_TOKEN}` } });
  if (!response.ok && response.status !== 204) throw new Error("Discord could not assign this role. Check the bot's role order and Manage Roles permission.");
}

async function removeDiscordRole(env: Env, discordId: string, roleId: string) {
  const response = await fetch(`https://discord.com/api/v10/guilds/${encodeURIComponent(env.DISCORD_GUILD_ID!)}/members/${encodeURIComponent(discordId)}/roles/${encodeURIComponent(roleId)}`, { method: "DELETE", headers: { Authorization: `Bot ${env.DISCORD_BOT_TOKEN}` } });
  if (!response.ok && response.status !== 204) throw new Error("Discord could not remove this role. Check the bot's role order and Manage Roles permission.");
}

async function isGuildMember(env: Env, discordId: string) {
  const response = await fetch(`https://discord.com/api/v10/guilds/${encodeURIComponent(env.DISCORD_GUILD_ID!)}/members/${encodeURIComponent(discordId)}`, { headers: { Authorization: `Bot ${env.DISCORD_BOT_TOKEN}` } });
  return response.status === 200;
}

async function completedEventIds(env: Env, uid: string) {
  const query = (collectionId: string) => firestoreRequest(env, "documents:runQuery", { method: "POST", body: JSON.stringify({ structuredQuery: { from: [{ collectionId }], where: { fieldFilter: { field: { fieldPath: "memberId" }, op: "EQUAL", value: { stringValue: uid } } }, select: { fields: [{ fieldPath: "eventId" }] }, limit: 100 } }) });
  const [attendanceResponse, engagementResponse] = await Promise.all([query("attendance"), query("engagement")]);
  const extract = async (response: Response) => {
    const rows = await response.json() as Array<{ document?: { fields?: { eventId?: { stringValue?: string } } } }>;
    return new Set(rows.map((row) => row.document?.fields?.eventId?.stringValue).filter((eventId): eventId is string => Boolean(eventId)));
  };
  const [attendance, engagement] = await Promise.all([extract(attendanceResponse), extract(engagementResponse)]);
  return new Set([...attendance].filter((eventId) => engagement.has(eventId)));
}

async function countedEventsSince(env: Env, linkedAt?: string) {
  const response = await firestoreRequest(env, "documents:runQuery", { method: "POST", body: JSON.stringify({ structuredQuery: { from: [{ collectionId: "events" }], limit: 100 } }) });
  if (!response.ok) throw new Error("Could not read completed GDG KU sessions.");
  const rows = await response.json() as Array<{ document?: { name?: string; fields?: Record<string, { booleanValue?: boolean; timestampValue?: string }> } }>;
  const linkedTime = linkedAt ? Date.parse(linkedAt) : Date.now();
  return rows.map((row) => {
    const id = row.document?.name?.split("/").pop();
    const fields = row.document?.fields;
    const completedAt = fields?.completedAt?.timestampValue;
    return id && fields?.attendanceEligible?.booleanValue === true && completedAt ? { id, completedAt } : null;
  }).filter((event): event is { id: string; completedAt: string } => Boolean(event))
    .filter((event) => Date.parse(event.completedAt) >= linkedTime)
    .sort((a, b) => Date.parse(b.completedAt) - Date.parse(a.completedAt))
    .slice(0, 3);
}

async function reconcileDiscordMember(env: Env, uid: string, link: DiscordLink) {
  if (!await isGuildMember(env, link.discordId)) throw new Error("Join the GDG KU Discord server, then connect Discord again.");
  const [completedIds, sessions] = await Promise.all([completedEventIds(env, uid), countedEventsSince(env, link.linkedAt)]);
  let consecutiveMisses = 0;
  for (const session of sessions) {
    if (completedIds.has(session.id)) break;
    consecutiveMisses += 1;
  }
  const consistentMember = consecutiveMisses < 3;
  if (consistentMember) await addDiscordRole(env, link.discordId, env.DISCORD_CONSISTENT_ROLE_ID!);
  else await removeDiscordRole(env, link.discordId, env.DISCORD_CONSISTENT_ROLE_ID!);
  await writeDiscordLink(env, uid, { ...link, consistentMember, consecutiveMisses });
  return { completedEvents: completedIds.size, countedSessions: sessions.length, consecutiveMisses, consistentMember };
}

async function allDiscordLinks(env: Env) {
  const response = await firestoreRequest(env, "documents:runQuery", { method: "POST", body: JSON.stringify({ structuredQuery: { from: [{ collectionId: "discordLinks" }], limit: 100 } }) });
  if (!response.ok) throw new Error("Could not read Discord connections.");
  const rows = await response.json() as Array<{ document?: { name?: string; fields?: Record<string, { stringValue?: string; booleanValue?: boolean; timestampValue?: string; integerValue?: string }> } }>;
  return rows.map((row) => {
    const uid = row.document?.name?.split("/").pop();
    const fields = row.document?.fields;
    const discordId = fields?.discordId?.stringValue;
    const username = fields?.username?.stringValue;
    return uid && discordId && username ? { uid, link: { discordId, username, consistentMember: fields?.consistentMember?.booleanValue === true, linkedAt: fields?.linkedAt?.timestampValue, consecutiveMisses: Number(fields?.consecutiveMisses?.integerValue || 0) } } : null;
  }).filter((entry): entry is { uid: string; link: DiscordLink } => Boolean(entry));
}

type FirestoreDocument = { name?: string; fields?: Record<string, { stringValue?: string; booleanValue?: boolean }> };

async function queryCollection(env: Env, collectionId: string, fieldPath?: string, value?: string) {
  const structuredQuery: Record<string, unknown> = { from: [{ collectionId }], limit: 100 };
  if (fieldPath && value) structuredQuery.where = { fieldFilter: { field: { fieldPath }, op: "EQUAL", value: { stringValue: value } } };
  const response = await firestoreRequest(env, "documents:runQuery", { method: "POST", body: JSON.stringify({ structuredQuery }) });
  if (!response.ok) throw new Error(`Could not read ${collectionId}.`);
  const rows = await response.json() as Array<{ document?: FirestoreDocument }>;
  return rows.map((row) => row.document).filter((document): document is FirestoreDocument => Boolean(document?.name));
}

async function deleteFirestoreDocument(env: Env, path: string) {
  const response = await firestoreRequest(env, path, { method: "DELETE" });
  if (!response.ok && response.status !== 404) throw new Error("Could not remove the requested Firestore record.");
}

async function deleteClosedSessionHistory(env: Env) {
  const events = await queryCollection(env, "events");
  const closed = events.filter((event) => event.fields?.active?.booleanValue !== true && event.fields?.engagementActive?.booleanValue !== true);
  let attendance = 0, wrapUps = 0;
  for (const event of closed) {
    const eventId = event.name!.split("/").pop()!;
    const [checkIns, engagement] = await Promise.all([queryCollection(env, "attendance", "eventId", eventId), queryCollection(env, "engagement", "eventId", eventId)]);
    await Promise.all([...checkIns.map((record) => deleteFirestoreDocument(env, record.name!.replace(/^.*\/documents\//, ""))), ...engagement.map((record) => deleteFirestoreDocument(env, record.name!.replace(/^.*\/documents\//, "")))]);
    attendance += checkIns.length; wrapUps += engagement.length;
    await Promise.all([deleteFirestoreDocument(env, `engagementPrompts/${encodeURIComponent(eventId)}`), deleteFirestoreDocument(env, `events/${encodeURIComponent(eventId)}`)]);
  }
  return { sessions: closed.length, attendance, wrapUps };
}

async function hideDirectoryMember(env: Env, email: string) {
  const members = await queryCollection(env, "members", "email", email.toLowerCase());
  if (!members.length) throw new Error("No member profile was found for that email.");
  let requests = 0;
  for (const profile of members) {
    const uid = profile.name!.split("/").pop()!;
    const [sent, received] = await Promise.all([queryCollection(env, "buddyRequests", "fromUid", uid), queryCollection(env, "buddyRequests", "toUid", uid)]);
    const unique = new Map([...sent, ...received].map((request) => [request.name!, request]));
    await Promise.all([...unique.values()].map((request) => deleteFirestoreDocument(env, request.name!.replace(/^.*\/documents\//, ""))));
    requests += unique.size;
    await deleteFirestoreDocument(env, `memberDirectory/${encodeURIComponent(uid)}`);
  }
  return { profiles: members.length, requests };
}

interface ExecutionContext {
  waitUntil(promise: Promise<unknown>): void;
  passThroughOnException(): void;
}

// Image security config. SVG sources with .svg extension auto-skip the
// optimization endpoint on the client side (served directly, no proxy).
// To route SVGs through the optimizer (with security headers), set
// dangerouslyAllowSVG: true in next.config.js and uncomment below:
// const imageConfig: ImageConfig = { dangerouslyAllowSVG: true };

const worker = {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === "/api/discord/connect") {
      if (!discordReady(env)) return json({ error: "Discord connection is not configured yet. Ask a GDG KU organizer to finish the Discord setup." }, 503);
      try {
        const uid = await firebaseUid(request, env);
        const state = await signState(uid, env.DISCORD_STATE_SECRET!);
        const authorizationUrl = new URL("https://discord.com/oauth2/authorize");
        authorizationUrl.search = new URLSearchParams({ client_id: env.DISCORD_CLIENT_ID!, response_type: "code", redirect_uri: env.DISCORD_REDIRECT_URI!, scope: "identify", state, prompt: "consent" }).toString();
        return json({ url: authorizationUrl.toString() });
      } catch (error) { return json({ error: error instanceof Error ? error.message : "Could not start Discord connection." }, 401); }
    }

    if (url.pathname === "/api/discord/callback") {
      const memberPage = new URL("/member", url.origin);
      try {
        if (!discordReady(env)) throw new Error("Discord is not configured yet.");
        const uid = await verifyState(url.searchParams.get("state"), env.DISCORD_STATE_SECRET!);
        const code = url.searchParams.get("code");
        if (!code) throw new Error("Discord did not return an authorization code.");
        const tokenResponse = await fetch("https://discord.com/api/v10/oauth2/token", { method: "POST", headers: { "content-type": "application/x-www-form-urlencoded" }, body: new URLSearchParams({ client_id: env.DISCORD_CLIENT_ID!, client_secret: env.DISCORD_CLIENT_SECRET!, grant_type: "authorization_code", code, redirect_uri: env.DISCORD_REDIRECT_URI! }) });
        const tokenPayload = await tokenResponse.json() as { access_token?: string };
        if (!tokenResponse.ok || !tokenPayload.access_token) throw new Error("Discord authorization was not completed.");
        const userResponse = await fetch("https://discord.com/api/v10/users/@me", { headers: { Authorization: `Bearer ${tokenPayload.access_token}` } });
        const user = await userResponse.json() as { id?: string; username?: string; global_name?: string };
        if (!userResponse.ok || !user.id || !user.username) throw new Error("Discord account details could not be verified.");
        if (!await isGuildMember(env, user.id)) { memberPage.searchParams.set("discord", "join"); return Response.redirect(memberPage, 302); }
        const existingLink = await readDiscordLink(env, uid);
        const link = {
          discordId: user.id,
          username: user.global_name || user.username,
          consistentMember: existingLink?.consistentMember ?? true,
          linkedAt: existingLink?.linkedAt,
          consecutiveMisses: existingLink?.consecutiveMisses ?? 0,
        };
        await writeDiscordLink(env, uid, link);
        await addDiscordRole(env, user.id, env.DISCORD_VERIFIED_ROLE_ID!);
        await reconcileDiscordMember(env, uid, link);
        memberPage.searchParams.set("discord", "connected");
      } catch (error) { memberPage.searchParams.set("discord", "error"); memberPage.searchParams.set("message", error instanceof Error ? error.message : "Discord connection failed."); }
      return Response.redirect(memberPage, 302);
    }

    if (url.pathname === "/api/discord/sync-role" && request.method === "POST") {
      if (!discordReady(env)) return json({ error: "Discord role sync is not configured yet." }, 503);
      try {
        const uid = await firebaseUid(request, env);
        const link = await readDiscordLink(env, uid);
        if (!link) return json({ error: "Connect Discord before checking role progress." }, 400);
        return json(await reconcileDiscordMember(env, uid, link));
      } catch (error) { return json({ error: error instanceof Error ? error.message : "Could not sync your Discord role." }, 400); }
    }

    if (url.pathname === "/api/discord/reconcile-roles" && request.method === "POST") {
      if (!discordReady(env)) return json({ error: "Discord role sync is not configured yet." }, 503);
      try {
        const identity = await firebaseIdentity(request, env);
        if (!ORGANIZER_EMAILS.has(identity.email)) return json({ error: "Only GDG KU organizers can review community access." }, 403);
        const links = await allDiscordLinks(env);
        const results = await Promise.allSettled(links.map(({ uid, link }) => reconcileDiscordMember(env, uid, link)));
        const updated = results.filter((result) => result.status === "fulfilled").length;
        const removed = results.filter((result) => result.status === "fulfilled" && !result.value.consistentMember).length;
        return json({ reviewed: links.length, updated, removed });
      } catch (error) { return json({ error: error instanceof Error ? error.message : "Could not review Discord roles." }, 400); }
    }

    if (url.pathname === "/api/admin/cleanup-closed-sessions" && request.method === "POST") {
      try {
        const identity = await firebaseIdentity(request, env);
        if (!ORGANIZER_EMAILS.has(identity.email)) return json({ error: "Only GDG KU organizers can remove session history." }, 403);
        return json(await deleteClosedSessionHistory(env));
      } catch (error) { return json({ error: error instanceof Error ? error.message : "Could not remove closed session history." }, 400); }
    }

    if (url.pathname === "/api/admin/hide-directory-member" && request.method === "POST") {
      try {
        const identity = await firebaseIdentity(request, env);
        if (!ORGANIZER_EMAILS.has(identity.email)) return json({ error: "Only GDG KU organizers can manage the directory." }, 403);
        const payload = await request.json() as { email?: string };
        const email = payload.email?.trim().toLowerCase();
        if (!email) return json({ error: "A member email is required." }, 400);
        return json(await hideDirectoryMember(env, email));
      } catch (error) { return json({ error: error instanceof Error ? error.message : "Could not hide this member from CoBuilder." }, 400); }
    }

    // Firebase redirect sign-in uses helper pages under /__/auth and
    // /__/firebase. Proxying them through this same domain prevents Safari
    // (and other browsers with storage partitioning) from losing the sign-in
    // state during the Google redirect.
    if (url.pathname.startsWith("/__/auth/") || url.pathname === "/__/firebase/init.json") {
      const firebaseUrl = new URL(`https://gdg-campus-ku.firebaseapp.com${url.pathname}${url.search}`);
      return fetch(new Request(firebaseUrl, request));
    }

    if (url.pathname === "/_vinext/image") {
      const allowedWidths = [...DEFAULT_DEVICE_SIZES, ...DEFAULT_IMAGE_SIZES];
      return handleImageOptimization(request, {
        fetchAsset: (path) => env.ASSETS.fetch(new Request(new URL(path, request.url))),
        transformImage: async (body, { width, format, quality }) => {
          const result = await env.IMAGES.input(body).transform(width > 0 ? { width } : {}).output({ format, quality });
          return result.response();
        },
      }, allowedWidths);
    }

    return handler.fetch(request, env, ctx);
  },
};

export default worker;
