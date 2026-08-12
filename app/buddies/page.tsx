"use client";

import { BuddyMatch } from "../components/BuddyMatch";
import { MemberAuth } from "../components/MemberAuth";

export default function BuddiesPage() {
  return <MemberAuth>{(member) => <BuddyMatch member={member} />}</MemberAuth>;
}
