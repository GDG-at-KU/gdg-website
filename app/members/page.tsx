"use client";

import { MemberAuth } from "../components/MemberAuth";
import { MemberDirectory } from "../components/MemberDirectory";

export default function MembersPage() {
  return <MemberAuth>{(member) => <MemberDirectory member={member} />}</MemberAuth>;
}
