const THREAD_KEY = "un_chat_thread";
const TOKEN_KEY = "un_chat_token";

export function getChatSession() {
  try {
    const threadId = localStorage.getItem(THREAD_KEY) || "";
    const visitorToken = localStorage.getItem(TOKEN_KEY) || "";
    if (!threadId || !visitorToken) return null;
    return { threadId, visitorToken };
  } catch {
    return null;
  }
}

export function setChatSession(threadId, visitorToken) {
  try {
    if (!threadId || !visitorToken) {
      localStorage.removeItem(THREAD_KEY);
      localStorage.removeItem(TOKEN_KEY);
      return;
    }
    localStorage.setItem(THREAD_KEY, String(threadId));
    localStorage.setItem(TOKEN_KEY, String(visitorToken));
  } catch {
    // ignore
  }
}

export function clearChatSession() {
  setChatSession("", "");
}
