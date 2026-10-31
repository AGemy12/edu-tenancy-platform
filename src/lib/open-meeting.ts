/**
 * Opens the meeting link the API hands out ({ url }: a fresh Zoom start link for the host; for
 * students it also records attendance). The tab is opened before the request so the browser
 * doesn't treat it as a popup, and closed again if the request fails (the error is rethrown).
 */
export async function openMeeting<T extends { url: string }>(request: () => Promise<T>): Promise<T> {
  const tab = window.open("", "_blank");
  try {
    const data = await request();
    if (tab) {
      tab.opener = null;
      tab.location.href = data.url;
    } else {
      window.location.assign(data.url);
    }
    return data;
  } catch (e) {
    tab?.close();
    throw e;
  }
}
