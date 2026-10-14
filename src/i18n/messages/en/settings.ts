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
  integrations: "Meeting accounts",
  integrationsDescription: "Connect your meeting account and session links are created for you.",
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
