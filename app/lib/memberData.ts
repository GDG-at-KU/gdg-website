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

export async function saveAttendance(uid: string, email: string, eventCode: string) {
  const safeCode = eventCode.trim().toUpperCase().replace(/[^A-Z0-9_-]/g, "").slice(0, 64);
  if (!safeCode) throw new Error("That event code is not valid.");
  await setDoc(doc(database(), "attendance", `${uid}_${safeCode}`), {
    memberId: uid, email, eventCode: safeCode, checkedInAt: serverTimestamp(), source: "member-pwa-pilot",
  }, { merge: true });
  return safeCode;
}
