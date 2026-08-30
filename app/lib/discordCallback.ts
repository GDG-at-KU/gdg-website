export type DiscordCallbackNotice = {
  kind: "join" | "connected" | "error";
  message: string;
};

const JOIN_MESSAGE = "We could not find this account in the GDG KU Discord server. Join the server, finish its rules screen, then verify again.";
const ERROR_MESSAGE = "Discord connection could not be completed. Please try again.";
const SAFE_ERROR_MESSAGES = new Set([
  "Discord connection expired. Start again from your member pass.",
  "Discord did not return an authorization code.",
  "Discord authorization was not completed.",
  "Discord account details could not be verified.",
]);

export function discordCallbackNotice(search: string): DiscordCallbackNotice | null {
  const params = new URLSearchParams(search);
  const outcome = params.get("discord");

  if (outcome === "join") return { kind: "join", message: JOIN_MESSAGE };
  if (outcome === "connected") return { kind: "connected", message: "Discord connected successfully." };
  if (outcome === "error") {
    const detail = params.get("message")?.trim();
    const message = detail && SAFE_ERROR_MESSAGES.has(detail) ? detail : ERROR_MESSAGE;
    return { kind: "error", message };
  }

  return null;
}
