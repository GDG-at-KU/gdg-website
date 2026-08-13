"use client";

import { AttendanceAdmin } from "../../components/AttendanceAdmin";
import { MemberAuth } from "../../components/MemberAuth";

export default function AttendanceAdminPage() {
  return <MemberAuth>{(member) => <AttendanceAdmin member={member} />}</MemberAuth>;
}
