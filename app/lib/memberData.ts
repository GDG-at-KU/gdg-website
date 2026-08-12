import { collection, doc, getDoc, getDocs, serverTimestamp, setDoc } from "firebase/firestore";
import { memberDb } from "./firebase";

export type MemberProfile = {
  displayName: string;
  major: string;
  graduationYear: string;
  leetCodeUsername: string;
  interests: string;
};

export const blankProfile: MemberProfile = { displayName: "", major: "", graduationYear: "", leetCodeUsername: "", interests: "" };

export type DirectoryMember = MemberProfile & { uid: string };

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
    };
  }).filter((member) => member.displayName).sort((a, b) => a.displayName.localeCompare(b.displayName));
}

type AttendancePayload = { eventId: string; checkInCode: string };

function parseAttendancePayload(rawCode: string): AttendancePayload {
  const match = rawCode.trim().match(/^GDGKU\|([a-zA-Z0-9_-]{8,64})\|([a-zA-Z0-9_-]{12,128})$/);
  if (!match) throw new Error("This is not an active GDG KU attendance QR code.");
  return { eventId: match[1], checkInCode: match[2] };
}

export async function saveAttendance(uid: string, rawCode: string) {
  const { eventId, checkInCode } = parseAttendancePayload(rawCode);
  await setDoc(doc(database(), "attendance", `${eventId}_${uid}`), {
    memberId: uid,
    eventId,
    eventTitle: "GDG KU event",
    checkInCode,
    checkedInAt: serverTimestamp(),
  });
  return "GDG KU event";
}
