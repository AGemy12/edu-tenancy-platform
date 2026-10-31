import type { Shape } from "../../translate";
import type ar from "../ar/settings";

const settings: Shape<typeof ar> = {
  title: "Settings",
  center: {
    title: "Center details",
    description: "The name your teachers and students see, and the timezone and currency used by schedules and billing.",
    name: "Center name",
    timezone: "Timezone",
    timezoneHint: "Monthly schedules are laid out in it",
    currency: "Currency",
    currencyHint: "Session prices and billing are shown in it",
    saved: "Center details saved",
  },
  logo: {
    title: "Center logo",
    description: "Printed beside the platform's brand at the top of every PDF report from your center.",
    upload: "Upload logo",
    replace: "Change logo",
    remove: "Remove logo",
    hint: "A PNG, JPG or WebP image up to {mb} MB. A square logo on a transparent background looks best.",
    tooLarge: "The logo must be {mb} MB or smaller",
    saved: "Logo saved",
    removed: "Logo removed",
    alt: "Center logo",
  },
  integrations: "Meeting accounts",
  integrationsDescription:
    "Connect your meeting account and your session links are created for you. Every session runs on its teacher's account, even when the administration books it.",
  adminDescription: "Zoom and Google Meet sessions are created on the session's own teacher's account, not the administration's.",
  adminNote:
    "Each teacher connects their account from their own settings. The teachers page shows who has and who hasn't, and lets you remind them. If you teach yourself, add yourself as a teacher first, then connect your account here.",
  adminTeachers: "Teachers page",
  unusedAccount: "This account isn't used because you don't teach in this center. You can disconnect it.",
  unavailable: "Unavailable",
  connected: "Connected",
  disconnect: "Disconnect",
  connectFailed: "Couldn't start the connection",
  disconnectFailed: "Couldn't disconnect",
  notConfigured: "Not enabled on the platform yet. Contact the platform team",
  google: {
    description: "Connect your Google account to create Google Meet sessions on your calendar automatically.",
    connect: "Connect Google account",
    connectSuccess: "Your Google account is connected.",
    connectError: "Couldn't connect your Google account. Please try again.",
    disconnected: "Google account disconnected",
  },
  zoom: {
    description:
      "Connect your Zoom account to create a meeting for every session automatically. Meetings run on your own account and licence, and recordings stay with you.",
    connect: "Connect Zoom account",
    connectSuccess: "Your Zoom account is connected.",
    connectError: "Couldn't connect your Zoom account. Please try again.",
    disconnected: "Zoom account disconnected",
  },
};

export default settings;
