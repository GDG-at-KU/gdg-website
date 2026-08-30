import assert from "node:assert/strict";
import test from "node:test";

import { discordCallbackNotice } from "../app/lib/discordCallback.ts";

test("explains that a Discord account must join the server before verification", () => {
  assert.deepEqual(discordCallbackNotice("?discord=join"), {
    kind: "join",
    message: "We could not find this account in the GDG KU Discord server. Join the server, finish its rules screen, then verify again.",
  });
});

test("reports a completed Discord connection", () => {
  assert.deepEqual(discordCallbackNotice("?discord=connected"), {
    kind: "connected",
    message: "Discord connected successfully.",
  });
});

test("shows only allowlisted callback errors and ignores unrelated query strings", () => {
  assert.deepEqual(discordCallbackNotice("?discord=error&message=Discord%20authorization%20was%20not%20completed."), {
    kind: "error",
    message: "Discord authorization was not completed.",
  });
  assert.deepEqual(discordCallbackNotice("?discord=error&message=Click%20this%20untrusted%20link"), {
    kind: "error",
    message: "Discord connection could not be completed. Please try again.",
  });
  assert.equal(discordCallbackNotice("?anything=else"), null);
});
