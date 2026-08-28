import { collection, doc, getDoc, getDocs, query, serverTimestamp, setDoc, where } from "firebase/firestore";
import { memberDb } from "./firebase";

export type MemberProfile = {
  displayName: string;
  major: string;
  graduationYear: string;
  leetCodeUsername: string;
  interests: string;
  discordUsername: string;
  instagramUsername: string;
};

export const blankProfile: MemberProfile = { displayName: "", major: "", graduationYear: "", leetCodeUsername: "", interests: "", discordUsername: "", instagramUsername: "" };

export type DirectoryMember = MemberProfile & { uid: string };

export type DiscordLink = {
  discordId: string;
  username: string;
  consistentMember: boolean;
};

export type BuddyPreferences = { goal: string; availability: string };
export type BuddyRequest = {
  id: string;
  fromUid: string;
  toUid: string;
  fromName: string;
  goal: string;
  availability: string;
  status: "pending" | "accepted" | "declined";
};

export const blankBuddyPreferences: BuddyPreferences = { goal: "Build a project", availability: "Weekday evenings" };

function database() {
  if (!memberDb) throw new Error("Firebase Firestore is not configured.");
  return memberDb;
}

export async function loadProfile(uid: string): Promise<MemberProfile> {
  const snapshot = await getDoc(doc(database(), "members", uid));
  if (!snapshot.exists()) return blankProfile;
  const data = snapshot.data();
  return {
    displayName: typeof data.displayName === "string" ? data.displayName : "",
    major: typeof data.major === "string" ? data.major : "",
    graduationYear: typeof data.graduationYear === "string" ? data.graduationYear : "",
    leetCodeUsername: typeof data.leetCodeUsername === "string" ? data.leetCodeUsername : "",
    interests: Array.isArray(data.interests) ? data.interests.join(", ") : "",
    discordUsername: typeof data.discordUsername === "string" ? data.discordUsername : "",
    instagramUsername: typeof data.instagramUsername === "string" ? data.instagramUsername : "",
  };
}

export async function saveProfile(uid: string, email: string, profile: MemberProfile) {
  const interests = profile.interests.split(",").map((item) => item.trim()).filter(Boolean).slice(0, 8);
  await setDoc(doc(database(), "members", uid), {
    uid, email, ...profile, interests,
    updatedAt: serverTimestamp(),
    createdAt: serverTimestamp(),
  }, { merge: true });
  await setDoc(doc(database(), "memberDirectory", uid), {
    uid,
    displayName: profile.displayName.trim(),
    major: profile.major.trim(),
    graduationYear: profile.graduationYear.trim(),
    leetCodeUsername: profile.leetCodeUsername.trim(),
    interests,
    discordUsername: profile.discordUsername.trim().replace(/^@/, ""),
    instagramUsername: profile.instagramUsername.trim().replace(/^@/, ""),
    updatedAt: serverTimestamp(),
  }, { merge: true });
}

export async function loadDirectory(): Promise<DirectoryMember[]> {
  const snapshot = await getDocs(collection(database(), "memberDirectory"));
  return snapshot.docs.map((entry) => {
    const data = entry.data();
    return {
      uid: entry.id,
      displayName: typeof data.displayName === "string" ? data.displayName : "GDG Member",
      major: typeof data.major === "string" ? data.major : "",
      graduationYear: typeof data.graduationYear === "string" ? data.graduationYear : "",
      leetCodeUsername: typeof data.leetCodeUsername === "string" ? data.leetCodeUsername : "",
      interests: Array.isArray(data.interests) ? data.interests.join(", ") : "",
      discordUsername: typeof data.discordUsername === "string" ? data.discordUsername : "",
      instagramUsername: typeof data.instagramUsername === "string" ? data.instagramUsername : "",
    };
  }).filter((member) => member.displayName).sort((a, b) => a.displayName.localeCompare(b.displayName));
}

export async function loadDiscordLink(uid: string): Promise<DiscordLink | null> {
  const snapshot = await getDoc(doc(database(), "discordLinks", uid));
  if (!snapshot.exists()) return null;
  const data = snapshot.data();
  if (typeof data.discordId !== "string" || typeof data.username !== "string") return null;
  return {
    discordId: data.discordId,
    username: data.username,
    consistentMember: data.consistentMember === true,
  };
}

export async function loadBuddyPreferences(uid: string): Promise<BuddyPreferences> {
  const snapshot = await getDoc(doc(database(), "buddyPreferences", uid));
  if (!snapshot.exists()) return blankBuddyPreferences;
  const data = snapshot.data();
  return {
    goal: typeof data.goal === "string" ? data.goal : blankBuddyPreferences.goal,
    availability: typeof data.availability === "string" ? data.availability : blankBuddyPreferences.availability,
  };
}

export async function saveBuddyPreferences(uid: string, preferences: BuddyPreferences) {
  await setDoc(doc(database(), "buddyPreferences", uid), {
    uid,
    goal: preferences.goal,
    availability: preferences.availability,
    updatedAt: serverTimestamp(),
  }, { merge: true });
}

export async function loadBuddyRequests(uid: string): Promise<BuddyRequest[]> {
  const [incoming, outgoing] = await Promise.all([
    getDocs(query(collection(database(), "buddyRequests"), where("toUid", "==", uid))),
    getDocs(query(collection(database(), "buddyRequests"), where("fromUid", "==", uid))),
  ]);
  const records = new Map<string, BuddyRequest>();
  for (const snapshot of [...incoming.docs, ...outgoing.docs]) {
    const data = snapshot.data();
    if (typeof data.fromUid !== "string" || typeof data.toUid !== "string") continue;
    records.set(snapshot.id, {
      id: snapshot.id,
      fromUid: data.fromUid,
      toUid: data.toUid,
      fromName: typeof data.fromName === "string" ? data.fromName : "GDG KU member",
      goal: typeof data.goal === "string" ? data.goal : "Build a project",
      availability: typeof data.availability === "string" ? data.availability : "Flexible",
      status: data.status === "accepted" || data.status === "declined" ? data.status : "pending",
    });
  }
  return [...records.values()];
}

export async function sendBuddyRequest(request: Omit<BuddyRequest, "id" | "status">) {
  const requestRef = doc(collection(database(), "buddyRequests"));
  await setDoc(requestRef, { ...request, status: "pending", createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
}

export async function respondToBuddyRequest(requestId: string, status: "accepted" | "declined") {
  await setDoc(doc(database(), "buddyRequests", requestId), { status, updatedAt: serverTimestamp() }, { merge: true });
}

type AttendancePayload = { kind: "checkin" | "wrapup"; eventId: string; code: string };
export type WrapUpPrompt = { eventId: string; title: string; question: string; options: string[] };

function parseAttendancePayload(rawCode: string): AttendancePayload {
  const match = rawCode.trim().match(/^GDGKU(?:-(END))?\|([a-zA-Z0-9_-]{8,64})\|([a-zA-Z0-9_-]{12,128})$/);
  if (!match) throw new Error("This is not an active GDG KU attendance QR code.");
  return { kind: match[1] ? "wrapup" : "checkin", eventId: match[2], code: match[3] };
}

export async function beginAttendance(uid: string, rawCode: string) {
  const payload = parseAttendancePayload(rawCode);
  if (payload.kind === "wrapup") {
    const prompt = await getDoc(doc(database(), "engagementPrompts", payload.eventId));
    if (!prompt.exists()) throw new Error("The wrap-up question is not ready yet.");
    const data = prompt.data();
    return { kind: "wrapup" as const, code: payload.code, prompt: {
      eventId: payload.eventId,
      title: typeof data.title === "string" ? data.title : "GDG KU event",
      question: typeof data.question === "string" ? data.question : "What was the key idea from this session?",
      options: Array.isArray(data.options) ? data.options.filter((option): option is string => typeof option === "string").slice(0, 4) : [],
    }};
  }
  await setDoc(doc(database(), "attendance", `${payload.eventId}_${uid}`), {
    memberId: uid,
    eventId: payload.eventId,
    checkInCode: payload.code,
    checkedInAt: serverTimestamp(),
  });
  return { kind: "checkin" as const };
}

export async function saveWrapUp(uid: string, prompt: WrapUpPrompt, code: string, answerIndex: number, reflection: string) {
  await setDoc(doc(database(), "engagement", `${prompt.eventId}_${uid}`), {
    memberId: uid, eventId: prompt.eventId, checkOutCode: code, answerIndex,
    reflection: reflection.trim(), submittedAt: serverTimestamp(),
  });
}
