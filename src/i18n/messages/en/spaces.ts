import type { Shape } from "../../translate";
import type ar from "../ar/spaces";

const spaces: Shape<typeof ar> = {
  title: "Your spaces",
  description: "Every center or teaching account you belong to, in any role. Choose the one to open.",
  count: {
    zero: "No spaces on your account yet",
    one: "{count} space on your account",
    other: "{count} spaces on your account",
  },
  search: "Search by center name or id…",
  noResults: "No space matches that.",
  groups: {
    platform: "Platform",
    TENANT_ADMIN: "You run",
    TEACHER: "You teach in",
    STUDENT: "You study in",
  },
  open: "Open",
  current: "Last opened",
  unavailable: "Unavailable right now",
  switcherLabel: "Spaces",
  all: "All spaces",
  platform: "Platform console",
  platformDescription: "Centers and subscriptions across the platform.",
  newSpace: "Create a new space",
  trialNote: "14-day free trial",
  newSpaceDescription: "Start a center or a teaching account of your own with the same sign-in, with a 14-day free trial. One trial at a time, and a limit on spaces per account.",
  newSpaceDialog: "The space is added to your account with you as its admin, and opens right away.",
  create: "Create",
  switched: "Opened {name}",
  signedInAs: "Signed in as {email}",
};

export default spaces;
