import { initializeApp } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js";
import { getAuth, onAuthStateChanged, GoogleAuthProvider, signInWithPopup, signInWithRedirect, signInAnonymously, linkWithPopup, signInWithCredential, linkWithCredential, signOut } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";
import { initializeFirestore, persistentLocalCache, persistentMultipleTabManager, getFirestore, collection, doc, getDoc, getDocs, setDoc, updateDoc, deleteDoc, addDoc, query, orderBy, limit, where, onSnapshot, serverTimestamp, increment, writeBatch } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";
import { firebaseConfig } from "./firebase-config.js";

const fbApp = initializeApp(firebaseConfig);
const auth = getAuth(fbApp);
let db;
try {
  db = initializeFirestore(fbApp, { localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }) });
} catch {
  db = getFirestore(fbApp);
}

const $ = (s, r = document) => r.querySelector(s);
const app = $("#app");
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const toMs = t => (t && t.toMillis ? t.toMillis() : typeof t === "number" ? t : Date.now());
const ago = ms => {
  const s = (Date.now() - ms) / 1000;
  if (s < 60) return "just now";
  if (s < 3600) return Math.floor(s / 60) + "m ago";
  if (s < 86400) return Math.floor(s / 3600) + "h ago";
  if (s < 604800) return Math.floor(s / 86400) + "d ago";
  return new Date(ms).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
};
const dec = s => { try { return decodeURIComponent(s); } catch { return s; } };
const isOnline = u => !!(u && u.lastSeen && Date.now() - u.lastSeen < 70000);
const safePhoto = p => (typeof p === "string" && /^(https?:|data:image\/)/.test(p) ? p : "");
const urlPhoto = p => (/^https?:/.test(p || "") ? p : "");
const avInner = (name, photo) => {
  const ph = safePhoto(photo);
  return ph
    ? `<img class="av" src="${esc(ph)}" alt="" referrerpolicy="no-referrer">`
    : `<span class="av">${esc((name || "?").trim()[0]?.toUpperCase() || "?")}</span>`;
};
const DECO = {
  sakura: '<span class="deco"><b class="orb"><u style="--t:0deg">✦</u><u style="--t:120deg">✧</u><u style="--t:240deg">✦</u></b><i class="sp a"></i><i class="sp b"></i><i class="sp c"></i><i class="sp d"></i><i class="sp e"></i><i class="pt p1"></i><i class="pt p2"></i><i class="pt p3"></i></span>'
};
const avBody = (fr, name, photo) => avInner(name, photo) + (DECO[fr] || "");
const avStatic = (frame, name, photo, cls = "") => `<span class="avf fr-${FRAMES[frame] ? frame : "none"} ${cls}">${avBody(frame, name, photo)}</span>`;
const av = (uid, name, photo = "", cls = "") => {
  if (uid) watch(uid);
  const p = uid ? presence[uid] : null;
  const ph = p && "photo" in p ? p.photo : photo;
  const nm = (p && p.name) || name;
  const fr = p && FRAMES[p.frame] ? p.frame : "none";
  return `<span class="avf fr-${fr} ${cls}" data-u="${esc(uid || "")}" data-fn="${esc(name || "")}" data-fp="${esc(safePhoto(photo))}" data-sig="${esc(fr + "|" + (ph || "") + "|" + nm)}">${avBody(fr, nm, ph)}</span>`;
};
function refreshAvatars() {
  document.querySelectorAll(".avf[data-u]").forEach(el => {
    const p = presence[el.dataset.u];
    if (!p) return;
    const ph = "photo" in p ? p.photo : el.dataset.fp;
    const nm = p.name || el.dataset.fn;
    const fr = FRAMES[p.frame] ? p.frame : "none";
    const sig = fr + "|" + (ph || "") + "|" + nm;
    if (el.dataset.sig === sig) return;
    el.dataset.sig = sig;
    el.className = el.className.replace(/\bfr-\S+/, "fr-" + fr);
    el.innerHTML = avBody(fr, nm, ph);
  });
}
window.addEventListener("presence", refreshAvatars);

const FRAMES = {
  sakura: { n: "Sakura Bloom", admin: true, hint: "Exclusive" },
  none: { n: "None", free: true },
  ink: { n: "Ink", free: true },
  rose: { n: "Rose", free: true },
  bronze: { n: "Bronze", badge: "first", hint: "Publish your first piece" },
  silver: { n: "Silver", posts: 5, hint: "Publish 5 pieces" },
  gold: { n: "Gold", badge: "prolific", hint: "Publish 10 pieces" },
  laurel: { n: "Laurel", badge: "poet", hint: "Publish a poem" },
  vine: { n: "Vine", badge: "teller", hint: "Publish a story" },
  stamp: { n: "Stamp", badge: "prompted", hint: "Answer a daily prompt" },
  stitch: { n: "Stitched", badge: "serial", hint: "Write a 3-chapter story" },
  glow: { n: "Glow", badge: "streak3", hint: "Write 3 days in a row" },
  aurora: { n: "Aurora", badge: "streak7", hint: "Write 7 days in a row" }
};
const frameOpen = (k, u) => { const f = FRAMES[k]; return !!f && !!(f.free || (f.admin && u.admin) || (f.badge && (u.badges || []).includes(f.badge)) || (f.posts && (u.postCount || 0) >= f.posts)); };
const svgAv = (bg, body) => "data:image/svg+xml," + encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" fill="${bg}"/>${body}</svg>`);
const AVATARS = [
  svgAv("#f1e0c0", '<path d="M72 18C42 24 26 50 28 80c18-8 36-26 44-62z" fill="#8e3b2b"/><path d="M28 80L20 92" stroke="#5b4423" stroke-width="3" stroke-linecap="round"/><path d="M34 68C46 56 56 42 64 28" stroke="#f1e0c0" stroke-width="2" fill="none"/>'),
  svgAv("#d9e4d0", '<path d="M50 34C40 27 26 27 16 31v40c10-4 24-4 34 2 10-6 24-6 34-2V31C74 27 60 27 50 34z" fill="#fbf5e6" stroke="#5b4423" stroke-width="3" stroke-linejoin="round"/><path d="M50 34v39" stroke="#5b4423" stroke-width="3"/><path d="M24 42c8-2 16-1 22 2M24 52c8-2 16-1 22 2M76 42c-8-2-16-1-22 2M76 52c-8-2-16-1-22 2" stroke="#a0703a" stroke-width="2" fill="none" stroke-linecap="round"/>'),
  svgAv("#2b2f4a", '<path d="M62 20a30 30 0 1 0 18 52A24 24 0 0 1 62 20z" fill="#f6e7b4"/><circle cx="26" cy="26" r="2" fill="#f6e7b4"/><circle cx="80" cy="30" r="1.6" fill="#f6e7b4"/><circle cx="72" cy="82" r="1.6" fill="#f6e7b4"/>'),
  svgAv("#3a2a22", '<rect x="40" y="48" width="20" height="36" rx="3" fill="#f3e9d2"/><path d="M50 18c-9 12-9 21 0 27 9-6 9-15 0-27z" fill="#f2a93b"/><path d="M50 30c-4 6-4 10 0 13 4-3 4-7 0-13z" fill="#fff1b8"/><rect x="34" y="82" width="32" height="5" rx="2" fill="#a0703a"/>'),
  svgAv("#dfead2", '<path d="M24 76C22 44 44 24 78 24 78 58 58 78 24 76z" fill="#4f7a55"/><path d="M24 76C40 60 54 46 70 32" stroke="#dfead2" stroke-width="3" fill="none" stroke-linecap="round"/>'),
  svgAv("#f4d6cf", '<path d="M26 46h42v12c0 12-9 20-21 20S26 70 26 58z" fill="#fbf5e6" stroke="#8e3b2b" stroke-width="3" stroke-linejoin="round"/><path d="M68 50c14-2 14 16-2 14" fill="none" stroke="#8e3b2b" stroke-width="3" stroke-linecap="round"/><path d="M38 38c-4-6 4-8 0-14M50 38c-4-6 4-8 0-14M58 38c-3-5 3-7 0-12" stroke="#b9533f" stroke-width="2.5" fill="none" stroke-linecap="round"/>'),
  svgAv("#f0e0a8", '<path d="M24 40l6-20 16 12h8l16-12 6 20c6 22-6 44-26 44S18 62 24 40z" fill="#a0703a"/><circle cx="40" cy="52" r="4" fill="#33291f"/><circle cx="60" cy="52" r="4" fill="#33291f"/><path d="M46 62h8l-4 5z" fill="#e8a3a0"/><path d="M50 67c-3 5-8 5-10 3M50 67c3 5 8 5 10 3" stroke="#33291f" stroke-width="2" fill="none" stroke-linecap="round"/>'),
  svgAv("#cfd8e8", '<ellipse cx="50" cy="56" rx="26" ry="30" fill="#7a5a8c"/><path d="M28 34l4-14 14 10M72 34l-4-14-14 10" fill="#7a5a8c"/><circle cx="40" cy="46" r="10" fill="#fbf5e6"/><circle cx="60" cy="46" r="10" fill="#fbf5e6"/><circle cx="40" cy="47" r="4.5" fill="#33291f"/><circle cx="60" cy="47" r="4.5" fill="#33291f"/><path d="M46 56h8l-4 8z" fill="#f2a93b"/><path d="M36 74c6 6 22 6 28 0" stroke="#5f4570" stroke-width="3" fill="none" stroke-linecap="round"/>'),
  svgAv("#f3e1c8", '<path d="M18 28l20 10h24l20-10-4 34C72 80 60 86 50 86S28 80 22 62z" fill="#d9772b"/><path d="M34 62c6 12 26 12 32 0 0 14-10 22-16 22S34 76 34 62z" fill="#fbf5e6"/><circle cx="38" cy="52" r="3.5" fill="#33291f"/><circle cx="62" cy="52" r="3.5" fill="#33291f"/><circle cx="50" cy="72" r="3.5" fill="#33291f"/>'),
  svgAv("#1f2a38", '<path d="M50 14v10" stroke="#f6d36b" stroke-width="3" stroke-linecap="round"/><rect x="34" y="24" width="32" height="8" rx="3" fill="#b5832f"/><path d="M36 32h28l4 36H32z" fill="#f2a93b"/><path d="M42 40h16l2 20H40z" fill="#fff1b8"/><rect x="32" y="68" width="36" height="7" rx="3" fill="#b5832f"/>'),
  svgAv("#7a5a8c", '<path d="M50 16l9 22 24 2-18 16 6 24-21-13-21 13 6-24-18-16 24-2z" fill="#f6e7b4"/>'),
  svgAv("#e8e0cc", '<rect x="42" y="18" width="16" height="12" rx="2" fill="#5b4423"/><path d="M40 30h20l12 18v32c0 4-3 6-6 6H34c-3 0-6-2-6-6V48z" fill="#33291f"/><path d="M36 58c8 4 20 4 28 0" stroke="#5b7c99" stroke-width="3" fill="none"/><path d="M62 14c6-4 16-2 20 4" stroke="#8e3b2b" stroke-width="3" fill="none" stroke-linecap="round"/>')
];
const squareImage = file => new Promise((res, rej) => {
  const img = new Image();
  const url = URL.createObjectURL(file);
  img.onload = () => {
    const s = Math.min(img.width, img.height);
    const c = document.createElement("canvas");
    c.width = c.height = 192;
    c.getContext("2d").drawImage(img, (img.width - s) / 2, (img.height - s) / 2, s, s, 0, 0, 192, 192);
    URL.revokeObjectURL(url);
    res(c.toDataURL("image/jpeg", 0.82));
  };
  img.onerror = rej;
  img.src = url;
});
const wordCount = s => (String(s).trim().match(/\S+/g) || []).length;
const readTime = w => Math.max(1, Math.round(w / 200)) + " min read";
const parseTags = s => [...new Set(s.toLowerCase().split(/[\s,]+/).map(t => t.replace(/^#/, "").slice(0, 20)).filter(Boolean))].slice(0, 5);
const dayStr = (off = 0) => {
  const d = new Date();
  d.setDate(d.getDate() + off);
  return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
};

const inline = s => esc(s).replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>").replace(/\*(.+?)\*/g, "<em>$1</em>");
const plain = s => String(s).replace(/\*\*(.+?)\*\*/g, "$1").replace(/\*(.+?)\*/g, "$1").replace(/^(-{3,}|\*{3,})$/gm, "");
const paras = b => String(b).split(/\n\s*\n/).map(x => x.replace(/^\n+|\n+$/g, "")).filter(x => x.trim());
const isRule = p => /^(-{3,}|\*{3,})$/.test(p.trim());
const excerpt = p => {
  const t = plain(p.body);
  return p.type === "poem"
    ? t.split("\n").filter(l => l.trim()).slice(0, 4).join("\n")
    : t.length > 200 ? t.slice(0, 200).trim() + "…" : t;
};

const store = {
  get: k => { try { return localStorage.getItem(k); } catch { return null; } },
  set: (k, v) => { try { localStorage.setItem(k, v); } catch {} }
};
document.documentElement.dataset.theme = store.get("theme") || "light";
let scale = parseFloat(store.get("sc")) || 1;
const applyScale = () => document.documentElement.style.setProperty("--sc", scale);
applyScale();
let hideMature = store.get("hm") !== "0";

const GENRES = ["Romance", "Fantasy", "Mystery", "Horror", "Sci-Fi", "Drama", "Humor", "Slice of life", "Nature", "Love", "Grief", "Hope", "Other"];
const MOODS = { plain: ["Plain", "#b5832f"], rain: ["Rain", "#5b7c99"], dusk: ["Dusk", "#7a5a8c"], sepia: ["Sepia", "#a0703a"], rose: ["Rose", "#b5546a"], forest: ["Forest", "#4f7a55"] };
const BADGES = {
  first: ["✒️", "First words"], poet: ["🌸", "Poet"], teller: ["📖", "Storyteller"], serial: ["📚", "Serial writer"],
  streak3: ["🔥", "3-day streak"], streak7: ["🌟", "Week of words"], prolific: ["🏆", "Prolific"], prompted: ["💡", "Prompted"]
};
const PROMPTS = [
  "Write about a letter that arrives fifty years late.", "A lighthouse keeper finds something unexpected in the tide.", "Describe the last rain of the season.",
  "Two strangers share an umbrella and a secret.", "Write a poem about a door that is always open.", "A city where it never gets dark.",
  "The smell of your grandmother's kitchen.", "Someone returns home after a long time away.", "A promise made under a mango tree.",
  "Write about the moment before a storm.", "A shop that sells forgotten memories.", "What the moon sees tonight.",
  "A song stuck in your head that you can't place.", "The last bus home.", "A garden that grows at night.",
  "Write a poem in which every line starts with 'Maybe'.", "A character who can only tell the truth for one day.", "The sound of an empty house.",
  "A message in a bottle, read by the wrong person.", "Describe a color to someone who has never seen it.", "A small kindness that changed everything.",
  "An old photograph with one face scratched out.", "Write about an ordinary morning that felt magical.", "The village where everyone knows your name but you.",
  "A train that stops at a station that isn't on the map.", "Write a goodbye that is really a beginning.", "Your favorite place, seen by someone who hates it.",
  "A thunderstorm in a very small town.", "The first page of a book that doesn't exist yet.", "Write about waiting."
];
const todayPrompt = () => {
  const n = new Date();
  return PROMPTS[Math.round(new Date(n.getFullYear(), n.getMonth(), n.getDate()).getTime() / 86400000) % PROMPTS.length];
};

const CHECK = '<svg class="ck" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>';
const badgeHtml = list => (list || []).filter(b => BADGES[b]).map(b => `<span class="bdg">${BADGES[b][0]} ${esc(BADGES[b][1])}</span>`).join("");
const liveStreak = u => (u && (u.lastWriteDay === dayStr() || u.lastWriteDay === dayStr(-1)) ? u.streak || 0 : 0);
const moodStyle = p => (p.mood && p.mood !== "plain" && MOODS[p.mood] ? ` style="--mood:${MOODS[p.mood][1]}"` : "");
const safeCover = c => (typeof c === "string" && /^data:image\//.test(c) ? c : "");

const cardHtml = (p, showAuthor = true) => {
  const w = p.words || wordCount(p.body);
  const cv = safeCover(p.cover);
  return `<a class="card ${p.type}"${moodStyle(p)} href="#/post/${p.id}">
    ${cv ? `<img class="cover" src="${esc(cv)}" alt="" loading="lazy">` : ""}
    <div class="cbody">
    <span class="badge">${p.type === "poem" ? "Poem" : "Story"}</span>${p.genre ? `<span class="gen">${esc(p.genre)}</span>` : ""}${p.mature ? '<span class="mat">18+</span>' : ""}
    <h2>${esc(p.title)}</h2>
    <p class="by">${showAuthor ? av(p.authorId, p.authorName, p.authorPhoto, "xs") + " " + esc(p.authorName) + " · " : ""}${ago(toMs(p.createdAt))}${p.type === "story" ? " · " + readTime(w) : ""}${p.chapterCount > 1 ? " · " + p.chapterCount + " chapters" : ""}</p>
    ${p.series ? `<p class="ser">${esc(p.series)}${p.seriesNo ? " #" + p.seriesNo : ""}</p>` : ""}
    <p class="excerpt">${esc(excerpt(p))}</p>
    <div class="meta"><div class="tags">${(p.tags || []).map(t => `<span>#${esc(t)}</span>`).join("")}</div><span>♥ ${p.likeCount || 0}</span><span>✎ ${p.commentCount || 0}</span></div></div></a>`;
};

let toastTimer;
function toast(m) {
  const t = $("#toast");
  t.textContent = m;
  t.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove("show"), 2800);
}
window.addEventListener("offline", () => toast("You're offline. Saved pieces still work."));
window.addEventListener("online", () => toast("Back online"));

let installEvt = null;
const NATIVE = !!window.Capacitor?.isNativePlatform?.();
const plugCache = {};
const plug = n => {
  const C = window.Capacitor;
  if (!C) return undefined;
  if (C.Plugins?.[n]) return C.Plugins[n];
  if (!plugCache[n] && C.registerPlugin) { try { plugCache[n] = C.registerPlugin(n); } catch {} }
  return plugCache[n];
};
const errMsg = e => e?.code || e?.message || String(e);
const isStandalone = () => NATIVE || matchMedia("(display-mode: standalone)").matches || navigator.standalone === true;

const notifLink = n => (n.type === "follow" ? "#/u/" + n.fromUid : n.type === "chapter" ? "#/post/" + n.postId + "/" + n.chapter : "#/post/" + n.postId);
const notifText = n => ({ like: `liked “${n.title}”`, comment: `commented on “${n.title}”${n.text ? ": " + n.text : ""}`, reply: `replied to your comment on “${n.title}”${n.text ? ": " + n.text : ""}`, follow: "started following you", post: `published “${n.title}”`, chapter: `added chapter ${n.chapter} to “${n.title}”` }[n.type] || "did something");

const notifPerm = async () => {
  if (NATIVE && plug("LocalNotifications")) { try { return (await plug("LocalNotifications").checkPermissions()).display; } catch { return "denied"; } }
  return "Notification" in window ? ({ default: "prompt", granted: "granted", denied: "denied" })[Notification.permission] : "unsupported";
};
const askNotifPerm = async () => {
  try {
    if (NATIVE && plug("LocalNotifications")) return (await plug("LocalNotifications").requestPermissions()).display;
    if ("Notification" in window) return ({ default: "prompt", granted: "granted", denied: "denied" })[await Notification.requestPermission()];
  } catch {}
  return "unsupported";
};
async function pushLocal(title, body, hash) {
  if (!document.hidden) { toast(title + (body ? ": " + body : "")); return; }
  try {
    if (NATIVE && plug("LocalNotifications")) {
      await plug("LocalNotifications").schedule({ notifications: [{ id: Date.now() % 2147483000, title, body, extra: { hash } }] });
    } else if ("Notification" in window && Notification.permission === "granted") {
      const reg = await navigator.serviceWorker?.getRegistration();
      if (reg) await reg.showNotification(title, { body, icon: "icon-192.png", badge: "icon-192.png", tag: hash, data: { hash } });
      else new Notification(title, { body });
    }
  } catch {}
}
if (NATIVE && plug("LocalNotifications")) {
  plug("LocalNotifications").addListener("localNotificationActionPerformed", e => { const h = e.notification?.extra?.hash; if (h) location.hash = h; });
}
navigator.serviceWorker?.addEventListener("message", e => { if (e.data?.hash) location.hash = e.data.hash; });
const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);
window.addEventListener("beforeinstallprompt", e => { e.preventDefault(); installEvt = e; window.dispatchEvent(new Event("installable")); });
window.addEventListener("appinstalled", () => { installEvt = null; window.dispatchEvent(new Event("installable")); toast("Quill & Margin installed"); });

let me = null;
let subs = [];
let tok = 0;
let globalSubs = [];
let timers = [];
let chatsCache = [];
let notifs = [];
let presence = {};
let presenceSubs = {};
let pendingTag = "";
let pendingPrompt = "";
let following = new Set();
let blocks = new Map();
let mutes = new Map();
const viewed = new Set();

const clearSubs = () => { subs.forEach(f => f()); subs = []; };
const otherOf = c => c.members.find(m => m !== me.uid);
const visible = p => p.authorId === me.uid || (!blocks.has(p.authorId) && !mutes.has(p.authorId) && !(p.mature && hideMature));
const notifData = (type, post, extra = {}) => ({ type, fromUid: me.uid, fromName: me.name, postId: post.id, title: post.title, createdAt: serverTimestamp(), read: false, ...extra });

function watch(uid) {
  if (!uid || presenceSubs[uid]) return;
  presenceSubs[uid] = onSnapshot(doc(db, "users", uid), s => {
    presence[uid] = s.data() || null;
    window.dispatchEvent(new CustomEvent("presence", { detail: uid }));
    refreshDots();
  }, () => {});
}
function refreshDots() {
  document.querySelectorAll("[data-dot]").forEach(el => el.classList.toggle("on", isOnline(presence[el.dataset.dot])));
}

function startGlobal() {
  const beat = () => { if (me && !document.hidden) updateDoc(doc(db, "users", me.uid), { lastSeen: Date.now() }).catch(() => {}); };
  const hide = () => { if (me) updateDoc(doc(db, "users", me.uid), { lastSeen: 0 }).catch(() => {}); };
  timers.push(setInterval(beat, 30000), setInterval(refreshDots, 15000));
  document.addEventListener("visibilitychange", beat);
  window.addEventListener("pagehide", hide);
  globalSubs.push(() => { document.removeEventListener("visibilitychange", beat); window.removeEventListener("pagehide", hide); });
  const sub = (ref, fn) => globalSubs.push(onSnapshot(ref, fn, () => {}));
  watch(me.uid);
  if (NATIVE && !store.get("np")) { store.set("np", "1"); askNotifPerm(); }
  const seenUnread = {};
  let chatsFirst = true, notifsFirst = true;
  sub(query(collection(db, "chats"), where("members", "array-contains", me.uid)), s => {
    s.docs.forEach(d => {
      const c = d.data(), u = c.unread?.[me.uid] || 0, o = otherOf({ id: d.id, ...c });
      if (!chatsFirst && u > (seenUnread[d.id] || 0) && c.lastFrom !== me.uid && !blocks.has(o) && location.hash !== "#/chat/" + o) {
        pushLocal(presence[o]?.name || c.names?.[o] || "New message", c.lastMessage || "", "#/chat/" + o);
      }
      seenUnread[d.id] = u;
    });
    chatsFirst = false;
    chatsCache = s.docs.map(d => ({ id: d.id, ...d.data() })).sort((a, b) => toMs(b.lastAt) - toMs(a.lastAt));
    const n = chatsCache.reduce((a, c) => a + (c.unread?.[me.uid] || 0), 0);
    const b = $("#badge");
    if (b) { b.textContent = n > 9 ? "9+" : n; b.hidden = !n; }
    chatsCache.forEach(c => watch(otherOf(c)));
    window.dispatchEvent(new Event("chats"));
  });
  sub(query(collection(db, "users", me.uid, "notifs"), orderBy("createdAt", "desc"), limit(40)), s => {
    if (!notifsFirst) s.docChanges().forEach(ch => {
      const x = ch.doc.data();
      if (ch.type === "added" && !x.read && !ch.doc.metadata.hasPendingWrites && location.hash !== "#/notifs") pushLocal(x.fromName || "Quill & Margin", notifText(x), notifLink(x));
    });
    notifsFirst = false;
    notifs = s.docs.map(d => ({ id: d.id, ...d.data() }));
    const n = notifs.filter(x => !x.read).length;
    const b = $("#nb");
    if (b) { b.textContent = n > 9 ? "9+" : n; b.hidden = !n; }
    window.dispatchEvent(new Event("notifs"));
  });
  sub(collection(db, "users", me.uid, "following"), s => {
    following = new Set(s.docs.map(d => d.id));
    window.dispatchEvent(new Event("prefs"));
  });
  sub(collection(db, "users", me.uid, "blocks"), s => {
    blocks = new Map(s.docs.map(d => [d.id, d.data().name || "Writer"]));
    window.dispatchEvent(new Event("prefs"));
  });
  sub(collection(db, "users", me.uid, "mutes"), s => {
    mutes = new Map(s.docs.map(d => [d.id, d.data().name || "Writer"]));
    window.dispatchEvent(new Event("prefs"));
  });
}
function teardownGlobal() {
  timers.forEach(clearInterval);
  timers = [];
  globalSubs.forEach(f => f());
  globalSubs = [];
  Object.values(presenceSubs).forEach(f => f());
  presenceSubs = {};
  presence = {};
  chatsCache = [];
  notifs = [];
  following = new Set();
  blocks = new Map();
  mutes = new Map();
  clearSubs();
}

async function nativeCred() {
  const r = await plug("FirebaseAuthentication").signInWithGoogle({ skipNativeAuth: true });
  return GoogleAuthProvider.credential(r.credential?.idToken || null);
}

async function googleSignIn() {
  const p = new GoogleAuthProvider();
  try {
    if (NATIVE) { await signInWithCredential(auth, await nativeCred()); return; }
    await signInWithPopup(auth, p);
  } catch (e) {
    if (["auth/popup-blocked", "auth/operation-not-supported-in-this-environment"].includes(e.code)) signInWithRedirect(auth, p);
    else if (!["auth/popup-closed-by-user", "auth/cancelled-popup-request"].includes(e.code)) toast("Sign-in failed: " + errMsg(e));
  }
}

function showLogin() {
  app.innerHTML = `<div class="login"><span class="seal">Q</span><h1>Quill &amp; Margin</h1><p class="tag">A cozy corner for stories and poems.</p>
    <button class="btn primary" id="g">Continue with Google</button>
    <button class="btn ghost" id="guest">Browse as a guest</button>
    <p class="fine">Guests can read, write, like, comment and chat. Link Google later from your profile to keep your account.</p></div>`;
  $("#g").onclick = googleSignIn;
  $("#guest").onclick = async () => { try { await signInAnonymously(auth); } catch (e) { toast("Guest sign-in failed: " + e.code); } };
}

onAuthStateChanged(auth, async user => {
  teardownGlobal();
  if (!user) { me = null; showLogin(); return; }
  const ref = doc(db, "users", user.uid);
  let data;
  try {
    const snap = await getDoc(ref);
    data = snap.exists() ? snap.data() : { name: user.displayName || "Guest " + Math.floor(1000 + Math.random() * 9000), photo: user.photoURL || "" };
    await setDoc(ref, { name: data.name, photo: data.photo || "", anon: user.isAnonymous, lastSeen: Date.now() }, { merge: true });
  } catch (e) {
    toast("Database error: " + e.code);
    return;
  }
  const ad = await getDoc(doc(db, "admins", user.uid)).catch(() => null);
  me = {
    uid: user.uid, name: data.name, photo: data.photo || "", anon: user.isAnonymous, admin: !!ad?.exists(),
    streak: data.streak || 0, lastWriteDay: data.lastWriteDay || "", wordsDay: data.wordsDay || "", wordsToday: data.wordsToday || 0,
    badges: data.badges || [], postCount: data.postCount || 0, goal: data.goal || 300, frame: data.frame || "none"
  };
  startGlobal();
  renderShell();
  route();
});

function renderShell() {
  const dark = document.documentElement.dataset.theme === "dark";
  app.innerHTML = `<header class="top"><div class="topin"><a href="#/" class="brand"><span class="seal sm">Q</span><span>Quill &amp; Margin</span></a>
    <div class="topbtns"><a href="#/notifs" class="iconbtn" id="bell" aria-label="Notifications">🔔<i id="nb" hidden></i></a><button id="tm" class="iconbtn" aria-label="Toggle night mode">${dark ? "☀" : "☾"}</button></div></div></header>
    <main id="view"></main>
    <nav class="bar"><a href="#/" data-n="home"><b>⌂</b>Home</a><a href="#/write" data-n="write"><b>✎</b>Write</a><a href="#/shelf" data-n="shelf"><b>★</b>Shelf</a><a href="#/chats" data-n="chats"><b>✉</b>Chats<i id="badge" hidden></i></a><a href="#/u/${me.uid}" data-n="me"><b>☺</b>Me</a></nav>`;
  const n = chatsCache.reduce((a, c) => a + (c.unread?.[me.uid] || 0), 0);
  const b = $("#badge");
  b.textContent = n > 9 ? "9+" : n;
  b.hidden = !n;
  const un = notifs.filter(x => !x.read).length;
  const nb = $("#nb");
  nb.textContent = un > 9 ? "9+" : un;
  nb.hidden = !un;
  $("#tm").onclick = () => {
    const d = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
    document.documentElement.dataset.theme = d;
    store.set("theme", d);
    $("#tm").textContent = d === "dark" ? "☀" : "☾";
  };
}

function route() {
  if (!me) return;
  clearSubs();
  const t = ++tok;
  const [page = "", a = "", b = ""] = location.hash.split("/").slice(1).map(dec);
  const v = $("#view");
  if (!v) return;
  window.scrollTo(0, 0);
  let br = $("#backrow");
  if (!br) {
    br = document.createElement("div");
    br.id = "backrow";
    br.innerHTML = '<button type="button" class="backbtn" aria-label="Back"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 5l-7 7 7 7"/></svg><span>Back</span></button>';
    br.firstChild.onclick = () => { if (history.length > 1) history.back(); else location.hash = "#/"; };
    v.parentNode.insertBefore(br, v);
  }
  br.hidden = ["", "shelf", "chats", "chat"].includes(page) || (page === "u" && a === me.uid);
  const key = page === "write" || page === "chapter" ? "write" : page === "shelf" ? "shelf" : page === "chats" || page === "chat" ? "chats" : page === "u" && a === me.uid ? "me" : page === "stats" ? "me" : page === "" || page === "post" ? "home" : "";
  document.querySelectorAll(".bar a").forEach(x => x.classList.toggle("on", x.dataset.n === key));
  if (page === "post") postView(v, a, b);
  else if (page === "write") writeView(v, a, t);
  else if (page === "chapter") chapterView(v, a, parseInt(b) || 2, t);
  else if (page === "shelf") shelfView(v, t);
  else if (page === "stats") statsView(v);
  else if (page === "notifs") notifsView(v);
  else if (page === "series") seriesView(v, a, b, t);
  else if (page === "admin") adminView(v);
  else if (page === "chats") chatsView(v);
  else if (page === "chat") chatView(v, a, t);
  else if (page === "u") profileView(v, a, t);
  else feedView(v, t);
}
window.addEventListener("hashchange", route);

async function removePost(id) {
  for (const sub of ["comments", "chapters"]) {
    const cs = await getDocs(collection(db, "posts", id, sub));
    const b = writeBatch(db);
    cs.docs.slice(0, 400).forEach(d => b.delete(d.ref));
    await b.commit();
  }
  await deleteDoc(doc(db, "posts", id));
  if (me.admin) {
    const rs = await getDocs(query(collection(db, "reports"), where("postId", "==", id)));
    const rb = writeBatch(db);
    rs.docs.forEach(d => rb.delete(d.ref));
    await rb.commit();
  }
}

async function notifyFollowers(type, post, extra = {}) {
  try {
    const s = await getDocs(collection(db, "users", me.uid, "followers"));
    if (s.empty) return;
    const b = writeBatch(db);
    s.docs.slice(0, 100).forEach(d => b.set(doc(collection(db, "users", d.id, "notifs")), notifData(type, post, extra)));
    await b.commit();
  } catch {}
}

async function bumpStats({ words = 0, type = "", chapters = 0, newPost = false, prompted = false }) {
  const day = dayStr();
  let streak = me.streak || 0;
  if (me.lastWriteDay !== day) streak = me.lastWriteDay === dayStr(-1) ? streak + 1 : 1;
  const old = new Set(me.badges || []);
  const badges = new Set(old);
  const postCount = (me.postCount || 0) + (newPost ? 1 : 0);
  if (newPost) {
    badges.add("first");
    if (type === "poem") badges.add("poet");
    if (type === "story") badges.add("teller");
    if (prompted) badges.add("prompted");
    if (postCount >= 10) badges.add("prolific");
  }
  if (chapters >= 3) badges.add("serial");
  if (streak >= 3) badges.add("streak3");
  if (streak >= 7) badges.add("streak7");
  const upd = { lastWriteDay: day, streak, wordsDay: day, wordsToday: (me.wordsDay === day ? me.wordsToday || 0 : 0) + words, badges: [...badges], postCount };
  Object.assign(me, upd);
  try {
    await updateDoc(doc(db, "users", me.uid), upd);
    const fresh = [...badges].filter(b => !old.has(b));
    if (fresh.length) toast("New badge: " + BADGES[fresh[0]][1] + " " + BADGES[fresh[0]][0]);
  } catch {}
}

function feedView(v, t) {
  let tab = store.get("tab") || "latest", type = "all", tag = pendingTag, genre = "", q = "", posts = [], lim = 30, unsub = null, loaded = false;
  pendingTag = "";
  v.innerHTML = `<div id="ib"></div><div id="pp"></div><div id="cr"></div>
    <div class="controls">
      <input id="q" type="search" placeholder="Search titles, writers, tags, words…">
      <div class="seg" id="tabs"><button data-t="latest">Latest</button><button data-t="trending">Trending</button><button data-t="following">Following</button></div>
      <div class="seg" id="seg"><button data-t="all" class="on">All</button><button data-t="story">Stories</button><button data-t="poem">Poems</button></div>
      <div class="row2"><select id="gs"><option value="">All genres</option>${GENRES.map(g => `<option>${esc(g)}</option>`).join("")}</select><button class="btn ghost sm" id="mt"></button></div>
      <div class="tags" id="tagbar"></div></div>
    <div id="list" class="list"><p class="muted">Loading…</p></div>
    <div class="center"><button class="btn ghost" id="more" hidden>Load more</button></div>`;
  const score = p => ((p.likeCount || 0) * 2 + (p.commentCount || 0) * 3 + (p.views || 0) * 0.3 + 1) / Math.pow((Date.now() - toMs(p.createdAt)) / 86400000 + 2, 1.2);
  const drawPrompt = () => {
    const el = $("#pp");
    if (tab !== "latest" || q) { el.innerHTML = ""; return; }
    const pr = todayPrompt();
    el.innerHTML = `<div class="prompt"><small>Today's prompt</small><p>“${esc(pr)}”</p><button class="btn primary sm" id="wp">Write from this prompt</button></div>`;
    $("#wp").onclick = () => { pendingPrompt = pr; location.hash = "#/write"; };
  };
  const draw = () => {
    document.querySelectorAll("#tabs button").forEach(b => b.classList.toggle("on", b.dataset.t === tab));
    $("#mt").textContent = hideMature ? "18+ hidden" : "18+ shown";
    drawPrompt();
    let list = posts.filter(visible).filter(p => (type === "all" || p.type === type) && (!genre || p.genre === genre));
    const counts = {};
    list.forEach(p => (p.tags || []).forEach(x => { counts[x] = (counts[x] || 0) + 1; }));
    const top = Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 12).map(e => e[0]);
    if (tag && !top.includes(tag)) top.unshift(tag);
    $("#tagbar").innerHTML = top.map(x => `<button data-g="${esc(x)}" class="${x === tag ? "on" : ""}">#${esc(x)}</button>`).join("");
    const ql = q.trim().toLowerCase();
    list = list.filter(p => (!tag || (p.tags || []).includes(tag)) && (!ql || (p.title + " " + p.authorName + " " + (p.tags || []).join(" ") + " " + (p.genre || "") + " " + (p.series || "") + " " + p.body).toLowerCase().includes(ql)));
    if (tab === "trending") list.sort((a, b) => score(b) - score(a));
    else list.sort((a, b) => toMs(b.createdAt) - toMs(a.createdAt));
    $("#list").innerHTML = !loaded
      ? '<p class="muted center">Loading…</p>'
      : list.length
        ? list.map(p => cardHtml(p)).join("")
        : `<p class="muted center">${tab === "following" ? (following.size ? "Nothing new from the writers you follow." : "Follow a writer from their profile to fill this feed.") : posts.length ? "Nothing matches yet." : "No writings yet. Be the first to post."}</p>`;
    $("#more").hidden = !(posts.length >= lim && tab !== "following" || (tab === "following" && posts.length >= lim));
  };
  const load = () => {
    if (unsub) unsub();
    unsub = null;
    loaded = false;
    const col = collection(db, "posts");
    let qy;
    if (tab === "following") {
      const ids = [...following].slice(0, 30);
      if (!ids.length) { posts = []; loaded = true; draw(); return; }
      qy = query(col, where("authorId", "in", ids), limit(lim));
    } else if (tab === "trending") qy = query(col, orderBy("likeCount", "desc"), limit(lim));
    else qy = query(col, orderBy("createdAt", "desc"), limit(lim));
    unsub = onSnapshot(qy, s => {
      posts = s.docs.map(d => ({ id: d.id, ...d.data() }));
      loaded = true;
      draw();
    }, e => { loaded = true; toast("Can't load posts: " + e.code); draw(); });
  };
  subs.push(() => { if (unsub) unsub(); });
  $("#q").oninput = e => { q = e.target.value; draw(); };
  $("#tabs").onclick = e => {
    const b = e.target.closest("button");
    if (!b || b.dataset.t === tab) return;
    tab = b.dataset.t;
    store.set("tab", tab);
    lim = 30;
    load();
  };
  $("#seg").onclick = e => {
    const b = e.target.closest("button");
    if (!b) return;
    type = b.dataset.t;
    document.querySelectorAll("#seg button").forEach(x => x.classList.toggle("on", x === b));
    draw();
  };
  $("#gs").onchange = e => { genre = e.target.value; draw(); };
  $("#mt").onclick = () => { hideMature = !hideMature; store.set("hm", hideMature ? "1" : "0"); draw(); };
  $("#tagbar").onclick = e => {
    const b = e.target.closest("button");
    if (!b) return;
    tag = tag === b.dataset.g ? "" : b.dataset.g;
    draw();
  };
  $("#more").onclick = () => { lim += 30; load(); };
  const onPrefs = () => { if (tab === "following") load(); else draw(); };
  window.addEventListener("prefs", onPrefs);
  subs.push(() => window.removeEventListener("prefs", onPrefs));
  const drawInstall = () => {
    const el = $("#ib");
    if (!el) return;
    if (isStandalone() || store.get("ib") === "0" || !(installEvt || isIOS)) { el.innerHTML = ""; return; }
    el.innerHTML = `<div class="installbar"><span class="seal sm">Q</span><div><b>Install Quill &amp; Margin</b><small>${installEvt ? "Add it to your home screen. Opens full screen, and saved pieces work offline." : "Tap the Share button, then “Add to Home Screen”."}</small></div>${installEvt ? '<button class="btn primary sm" id="ibi">Install</button>' : ""}<button class="lnk" id="ibx" aria-label="Dismiss">✕</button></div>`;
    $("#ibx").onclick = () => { store.set("ib", "0"); drawInstall(); };
    const bi = $("#ibi");
    if (bi) bi.onclick = async () => { installEvt.prompt(); try { await installEvt.userChoice; } catch {} installEvt = null; drawInstall(); };
  };
  drawInstall();
  window.addEventListener("installable", drawInstall);
  subs.push(() => window.removeEventListener("installable", drawInstall));
  load();

  let alive = true;
  subs.push(() => { alive = false; });
  subs.push(onSnapshot(query(collection(db, "users", me.uid, "progress"), orderBy("at", "desc"), limit(4)), async s => {
    const items = s.docs.map(d => ({ id: d.id, ...d.data() }));
    const docs = await Promise.all(items.map(i => getDoc(doc(db, "posts", i.id)).catch(() => null)));
    const el = $("#cr");
    if (!alive || t !== tok || !el) return;
    const rows = docs.map((d, i) => (d && d.exists() ? { id: d.id, ...d.data(), ch: items[i].chapter || 1 } : null)).filter(p => p && visible(p));
    el.innerHTML = rows.length
      ? `<h3 class="h2">Continue reading</h3><div class="hrow">${rows.map(p => `<a class="chip" href="#/post/${p.id}/${p.ch}"><b>${esc(p.title)}</b><small>${p.chapterCount > 1 ? "Chapter " + p.ch + " of " + p.chapterCount : esc(p.authorName)}</small></a>`).join("")}</div>`
      : "";
  }, () => {}));
}

function postView(v, id, n0) {
  let n = Math.max(1, parseInt(n0) || 1);
  let post = null, chapters = [], comments = [], liked = false, saved = false, bodyKey = "", openPara = -1, replyId = null;
  v.innerHTML = `<article id="art"><div id="ah"></div><div id="ab" class="body"></div><div id="an"></div></article>
    <section id="cm"><h3>Comments</h3>
    <form id="cf"><textarea id="ct" maxlength="600" rows="2" placeholder="Leave a kind word… (tap 💬 beside any passage to comment on it)"></textarea><button class="btn primary">Post</button></form>
    <div id="cl"></div></section>`;
  const art = $("#art"), ah = $("#ah"), ab = $("#ab"), an = $("#an");

  const cur = () => {
    if (!post) return null;
    if (n === 1) return { title: post.ch1Title || "Chapter 1", body: post.body };
    const c = chapters.find(x => x.n === n);
    return c ? { title: c.title || "Chapter " + n, body: c.body } : null;
  };
  const commentRow = (c, isReply = false) => `<div class="cmt" data-c="${c.id}">${av(c.uid, c.name, c.photo, "xs")}<div class="cb"><b>${esc(c.name)}</b> <small>${ago(toMs(c.createdAt))}</small><p>${isReply && c.replyTo ? `<span class="rto">↪ ${esc(c.replyTo)}</span> ` : ""}${esc(c.text)}</p>
    <div class="cact"><button class="lnk" data-r="${c.id}">${replyId === c.id ? "cancel" : "reply"}</button>${c.uid === me.uid || post?.authorId === me.uid || me.admin ? `<button class="lnk" data-d="${c.id}">delete</button>` : ""}</div>
    ${replyId === c.id ? `<form class="rf"><input maxlength="300" placeholder="Reply to ${esc(c.name)}…"><button class="btn primary sm">Send</button></form>` : ""}</div></div>`;
  const threadHtml = items => {
    const ids = new Set(items.map(c => c.id));
    const kids = {};
    items.filter(c => c.parent && ids.has(c.parent)).forEach(c => { (kids[c.parent] = kids[c.parent] || []).push(c); });
    return items.filter(c => !c.parent || !ids.has(c.parent)).map(c => commentRow(c, !!c.parent) + ((kids[c.id] || []).length ? `<div class="replies">${kids[c.id].map(r => commentRow(r, true)).join("")}</div>` : "")).join("");
  };

  const drawHead = () => {
    if (!post) return;
    const mine = post.authorId === me.uid;
    const total = post.chapterCount || 1;
    art.className = post.type;
    if (post.mood && post.mood !== "plain" && MOODS[post.mood]) art.style.setProperty("--mood", MOODS[post.mood][1]);
    else art.style.removeProperty("--mood");
    const cv = safeCover(post.cover);
    const w = post.words || wordCount(post.body);
    const toc = total > 1
      ? `<details class="toc"><summary>Chapters (${total})</summary>${Array.from({ length: total }, (_, i) => {
          const k = i + 1;
          const title = k === 1 ? post.ch1Title || "Chapter 1" : chapters.find(x => x.n === k)?.title || "Chapter " + k;
          return `<a href="#/post/${id}/${k}" class="${k === n ? "on" : ""}">${k}. ${esc(title)}</a>`;
        }).join("")}</details>`
      : "";
    ah.innerHTML = `${cv ? `<img class="cover big" src="${esc(cv)}" alt="">` : ""}
      <span class="badge">${post.type === "poem" ? "Poem" : "Story"}</span>${post.genre ? `<span class="gen">${esc(post.genre)}</span>` : ""}${post.mature ? '<span class="mat">18+</span>' : ""}
      <h1>${esc(post.title)}</h1>
      <p class="by"><a href="#/u/${esc(post.authorId)}">${av(post.authorId, post.authorName, post.authorPhoto, "xs")} ${esc(post.authorName)}</a>${!mine ? ` <button class="lnk" id="fw">${following.has(post.authorId) ? "Following " + CHECK : "+ Follow"}</button>` : ""} · ${ago(toMs(post.createdAt))}${post.updatedAt ? " · edited" : ""}${post.type === "story" ? " · " + readTime(w) : ""} · 👁 ${post.views || 0}</p>
      ${post.series ? `<p class="ser"><a href="#/series/${esc(post.authorId)}/${encodeURIComponent(post.series)}">${esc(post.series)}${post.seriesNo ? " #" + post.seriesNo : ""}</a></p>` : ""}
      ${post.prompt ? `<p class="pnote">Written for the prompt: “${esc(post.prompt)}”</p>` : ""}
      ${toc}
      <div class="tools"><span>Text size</span><button class="lnk" id="fm">A−</button><button class="lnk" id="fp">A+</button></div>`;
    const tags = (post.tags || []).map(t => `<button data-g="${esc(t)}">#${esc(t)}</button>`).join("");
    $("#an").dataset.tags = tags;
    ah.querySelector("#fw")?.addEventListener("click", () => toggleFollow(post.authorId, post.authorName));
    $("#fm").onclick = () => setScale(-0.1);
    $("#fp").onclick = () => setScale(0.1);
    drawActions();
  };

  const setScale = d => {
    scale = Math.min(1.6, Math.max(0.8, Math.round((scale + d) * 10) / 10));
    store.set("sc", String(scale));
    applyScale();
  };

  const drawActions = () => {
    if (!post) return;
    const mine = post.authorId === me.uid;
    const total = post.chapterCount || 1;
    const acts = $("#acts") || document.createElement("div");
    acts.id = "acts";
    acts.className = "actions";
    acts.innerHTML = `<button class="btn ${liked ? "on" : ""}" id="lk">${liked ? "♥" : "♡"} ${post.likeCount || 0}</button>
      <button class="btn ${saved ? "on" : ""}" id="sv">${saved ? "★ Saved" : "☆ Save"}</button>
      <button class="btn" id="sh">Share</button>
      ${mine ? '<button class="btn" id="ed">Edit</button>' : ""}
      ${mine && post.type === "story" ? `<button class="btn" id="ac">+ Chapter</button>` : ""}
      ${mine && total > 1 && n > 1 ? '<button class="btn" id="ec">Edit chapter</button>' : ""}
      ${mine || me.admin ? '<button class="btn danger" id="del">Delete</button>' : ""}
      ${!mine ? '<button class="lnk" id="rp">Report</button>' : ""}`;
    if (!acts.parentNode) art.insertBefore(acts, ab);
    $("#lk").onclick = async () => {
      const b = writeBatch(db);
      const lr = doc(db, "posts", id, "likes", me.uid);
      const pr = doc(db, "posts", id);
      if (liked) { b.delete(lr); b.update(pr, { likeCount: increment(-1) }); }
      else {
        b.set(lr, { at: Date.now() });
        b.update(pr, { likeCount: increment(1) });
        if (!mine) b.set(doc(collection(db, "users", post.authorId, "notifs")), notifData("like", post));
      }
      try { await b.commit(); } catch (e) { toast("Couldn't update: " + e.code); }
    };
    $("#sv").onclick = async () => {
      const r = doc(db, "users", me.uid, "shelf", id);
      try { if (saved) await deleteDoc(r); else await setDoc(r, { at: Date.now() }); } catch (e) { toast("Couldn't save: " + e.code); }
    };
    $("#sh").onclick = async () => {
      const url = location.href.split("#")[0] + "#/post/" + id;
      const text = post.title + " by " + post.authorName;
      if (navigator.share) { try { await navigator.share({ title: post.title, text, url }); } catch {} }
      else { try { await navigator.clipboard.writeText(url); toast("Link copied"); } catch { toast(url); } }
    };
    const on = (sel, fn) => { const el = acts.querySelector(sel); if (el) el.onclick = fn; };
    on("#ed", () => { location.hash = "#/write/" + id; });
    on("#ac", () => { location.hash = "#/chapter/" + id + "/" + (total + 1); });
    on("#ec", () => { location.hash = "#/chapter/" + id + "/" + n; });
    on("#del", async () => {
      if (!confirm("Delete this piece and all its chapters for good?")) return;
      try { await removePost(id); location.hash = "#/"; } catch (e) { toast("Couldn't delete: " + e.code); }
    });
    on("#rp", async () => {
      const reason = (prompt("What's wrong with this piece? (spam, abuse, plagiarism…)") || "").trim();
      if (!reason) return;
      try {
        await setDoc(doc(db, "reports", id + "_" + me.uid), { postId: id, postTitle: post.title, reason: reason.slice(0, 300), by: me.uid, byName: me.name, createdAt: serverTimestamp() });
        toast("Thanks, we'll take a look.");
      } catch (e) { toast("You've already reported this piece."); }
    });
  };

  const drawFoot = () => {
    if (!post) return;
    const total = post.chapterCount || 1;
    const tags = $("#an").dataset.tags || "";
    an.innerHTML = `${total > 1 ? `<div class="chnav">${n > 1 ? `<a class="btn" href="#/post/${id}/${n - 1}">‹ Previous</a>` : "<span></span>"}<span class="muted">${n} / ${total}</span>${n < total ? `<a class="btn primary" href="#/post/${id}/${n + 1}">Next ›</a>` : "<span></span>"}</div>` : ""}<div class="tags">${tags}</div>`;
    an.querySelectorAll("[data-g]").forEach(b => b.onclick = () => { pendingTag = b.dataset.g; location.hash = "#/"; });
  };

  const refreshInline = () => {
    const groups = {};
    comments.filter(c => (c.para ?? -1) >= 0 && (c.ch || 1) === n && !blocks.has(c.uid)).forEach(c => { (groups[c.para] = groups[c.para] || []).push(c); });
    ab.querySelectorAll(".pc").forEach(b => {
      const cnt = (groups[+b.dataset.p] || []).length;
      b.querySelector("span").textContent = cnt || "";
      b.classList.toggle("has", !!cnt);
    });
    if (openPara >= 0) {
      const pl = ab.querySelector(`.para[data-i="${openPara}"] .pl`);
      if (pl) pl.innerHTML = (groups[openPara] || []).length ? threadHtml(groups[openPara]) : '<p class="muted fine">No comments on this passage yet.</p>';
    }
  };

  const openPanel = k => {
    ab.querySelectorAll(".pp").forEach(x => { x.hidden = true; x.innerHTML = ""; });
    openPara = k;
    if (k < 0) return;
    const pp = ab.querySelector(`.para[data-i="${k}"] .pp`);
    if (!pp) { openPara = -1; return; }
    pp.hidden = false;
    pp.innerHTML = '<div class="pl"></div><form class="pf"><input maxlength="300" placeholder="Comment on this passage…"><button class="btn primary sm">Send</button></form>';
    refreshInline();
  };

  const drawBody = () => {
    const c = cur();
    if (!c) { ab.innerHTML = '<p class="muted center">Loading…</p>'; return; }
    const key = n + "|" + c.title + "|" + c.body;
    if (key === bodyKey) return;
    const first = bodyKey === "";
    bodyKey = key;
    const keep = ab.querySelector(".pf input")?.value || "";
    const prev = openPara;
    ab.innerHTML = ((post.chapterCount || 1) > 1 ? `<h2 class="chtitle">${n}. ${esc(c.title)}</h2>` : "")
      + paras(c.body).map((p, i) => isRule(p)
        ? "<hr>"
        : `<div class="para" data-i="${i}"><div class="ptxt">${inline(p)}</div><button class="pc" data-p="${i}" aria-label="Comments on this passage">💬<span></span></button><div class="pp" hidden></div></div>`).join("");
    refreshInline();
    if (!first && prev >= 0) {
      openPanel(prev);
      const inp = ab.querySelector(".pf input");
      if (inp) inp.value = keep;
    } else openPara = -1;
    setDoc(doc(db, "users", me.uid, "progress", id), { chapter: n, at: Date.now() }).catch(() => {});
  };

  ab.onclick = e => {
    const b = e.target.closest(".pc");
    if (!b) return;
    const k = +b.dataset.p;
    if (openPara === k) { openPanel(-1); return; }
    openPanel(k);
    ab.querySelector(".pf input")?.focus();
  };
  const onFormSubmit = async e => {
    const f = e.target;
    const isReply = f.classList.contains("rf");
    if (!isReply && !f.classList.contains("pf")) return;
    e.preventDefault();
    const inp = f.querySelector("input");
    const text = inp.value.trim();
    if (!text) return;
    inp.value = "";
    if (isReply) {
      const target = comments.find(c => c.id === replyId);
      replyId = null;
      if (target) await addComment(text, -1, null, target);
    } else await addComment(text, openPara, inp);
  };
  ab.onsubmit = onFormSubmit;
  $("#cl").onsubmit = onFormSubmit;

  const addComment = async (text, para, inp, parent = null) => {
    const b = writeBatch(db);
    const extra = parent ? { parent: parent.parent || parent.id, replyTo: parent.name } : {};
    b.set(doc(collection(db, "posts", id, "comments")), {
      uid: me.uid, name: me.name, photo: urlPhoto(me.photo), text, createdAt: serverTimestamp(),
      para: parent ? parent.para ?? -1 : para, ch: parent ? parent.ch || 1 : n, ...extra
    });
    b.update(doc(db, "posts", id), { commentCount: increment(1) });
    const snippet = text.slice(0, 80);
    if (parent && parent.uid !== me.uid) b.set(doc(collection(db, "users", parent.uid, "notifs")), notifData("reply", post, { text: snippet }));
    if (post.authorId !== me.uid && !(parent && parent.uid === post.authorId)) b.set(doc(collection(db, "users", post.authorId, "notifs")), notifData("comment", post, { text: snippet }));
    try { await b.commit(); } catch (err) { toast("Couldn't post: " + err.code); if (inp) inp.value = text; }
  };

  const delComment = async e => {
    const b = e.target.closest("[data-d]");
    if (!b) return;
    const bt = writeBatch(db);
    bt.delete(doc(db, "posts", id, "comments", b.dataset.d));
    bt.update(doc(db, "posts", id), { commentCount: increment(-1) });
    try { await bt.commit(); } catch (err) { toast("Couldn't delete: " + err.code); }
  };
  const drawComments = () => {
    const cl = $("#cl");
    if (!cl) return;
    const items = comments.filter(c => (c.para ?? -1) < 0 && !blocks.has(c.uid));
    cl.innerHTML = items.length ? threadHtml(items) : '<p class="muted">No comments yet.</p>';
  };
  const redraw = () => {
    const open = document.querySelector(".rf input");
    const keep = open ? open.value : "";
    const focused = !!open && document.activeElement === open;
    drawComments();
    refreshInline();
    const inp = document.querySelector(".rf input");
    if (inp) { inp.value = keep; if (focused) inp.focus(); }
  };
  const onCmtClick = e => {
    const r = e.target.closest("[data-r]");
    if (r) {
      document.querySelectorAll(".rf input").forEach(i => { i.value = ""; });
      replyId = replyId === r.dataset.r ? null : r.dataset.r;
      redraw();
      document.querySelector(".rf input")?.focus();
      return;
    }
    delComment(e);
  };
  $("#cl").onclick = onCmtClick;
  ab.addEventListener("click", onCmtClick);

  $("#cf").onsubmit = async e => {
    e.preventDefault();
    const text = $("#ct").value.trim();
    if (!text) return;
    $("#ct").value = "";
    await addComment(text, -1);
    $("#ct").value = "";
  };

  subs.push(onSnapshot(doc(db, "posts", id), s => {
    if (!s.exists()) { art.innerHTML = '<p class="muted center">This piece is gone.</p>'; return; }
    post = { id, ...s.data() };
    if (n > (post.chapterCount || 1)) n = post.chapterCount || 1;
    drawHead();
    drawBody();
    drawFoot();
    if (!viewed.has(id)) {
      viewed.add(id);
      if (post.authorId !== me.uid) updateDoc(doc(db, "posts", id), { views: increment(1) }).catch(() => {});
    }
  }, e => toast("Can't load: " + e.code)));
  subs.push(onSnapshot(doc(db, "posts", id, "likes", me.uid), s => { liked = s.exists(); drawActions(); }, () => {}));
  subs.push(onSnapshot(doc(db, "users", me.uid, "shelf", id), s => { saved = s.exists(); drawActions(); }, () => {}));
  subs.push(onSnapshot(query(collection(db, "posts", id, "chapters"), orderBy("n", "asc")), s => {
    chapters = s.docs.map(d => ({ id: d.id, ...d.data() }));
    if (post) { drawHead(); drawBody(); }
  }, () => {}));
  subs.push(onSnapshot(query(collection(db, "posts", id, "comments"), orderBy("createdAt", "asc")), s => {
    comments = s.docs.map(d => ({ id: d.id, ...d.data() }));
    redraw();
  }, () => {}));
  const onPrefs = () => { if (post) { drawHead(); redraw(); } };
  window.addEventListener("prefs", onPrefs);
  subs.push(() => window.removeEventListener("prefs", onPrefs));
}

async function toggleFollow(uid, name) {
  const b = writeBatch(db);
  const fr = doc(db, "users", me.uid, "following", uid);
  const er = doc(db, "users", uid, "followers", me.uid);
  if (following.has(uid)) { b.delete(fr); b.delete(er); }
  else {
    b.set(fr, { name: name || "", at: Date.now() });
    b.set(er, { name: me.name, at: Date.now() });
    b.set(doc(collection(db, "users", uid, "notifs")), { type: "follow", fromUid: me.uid, fromName: me.name, postId: "", title: "", createdAt: serverTimestamp(), read: false });
  }
  try { await b.commit(); } catch (e) { toast("Couldn't update: " + e.code); }
}

const shrinkImage = file => new Promise((res, rej) => {
  const img = new Image();
  const url = URL.createObjectURL(file);
  img.onload = () => {
    const k = Math.min(1, 480 / img.width, 640 / img.height);
    const w = Math.max(1, Math.round(img.width * k)), h = Math.max(1, Math.round(img.height * k));
    const c = document.createElement("canvas");
    c.width = w;
    c.height = h;
    c.getContext("2d").drawImage(img, 0, 0, w, h);
    URL.revokeObjectURL(url);
    res(c.toDataURL("image/jpeg", 0.6));
  };
  img.onerror = rej;
  img.src = url;
});

const fmtBar = () => `<div class="fmtbar"><button type="button" data-f="b" aria-label="Bold"><b>B</b></button><button type="button" data-f="i" aria-label="Italic"><i>I</i></button><button type="button" data-f="hr">⁂ scene break</button><span id="wc" class="fine"></span></div>`;
function bindFmt(onChange) {
  const ta = $("#wb");
  const wrap = (a, b = a) => {
    const s = ta.selectionStart, e = ta.selectionEnd;
    ta.setRangeText(a + (ta.value.slice(s, e) || "text") + b, s, e, "select");
    ta.focus();
    onChange();
  };
  document.querySelector(".fmtbar").onclick = e => {
    const b = e.target.closest("button");
    if (!b) return;
    if (b.dataset.f === "b") wrap("**");
    else if (b.dataset.f === "i") wrap("*");
    else {
      ta.setRangeText("\n\n---\n\n", ta.selectionStart, ta.selectionEnd, "end");
      ta.focus();
      onChange();
    }
  };
}

async function writeView(v, editId, t) {
  let editing = null, type = "story", mood = "plain", cover = "", prompt = pendingPrompt, published = false, dt = null;
  pendingPrompt = "";
  if (editId) {
    v.innerHTML = '<p class="muted center">Loading…</p>';
    try {
      const s = await getDoc(doc(db, "posts", editId));
      if (t !== tok) return;
      if (!s.exists() || s.data().authorId !== me.uid) { location.hash = "#/"; return; }
      editing = s.data();
      type = editing.type;
      mood = editing.mood || "plain";
      cover = editing.cover || "";
      prompt = editing.prompt || "";
    } catch (e) { toast("Can't load: " + e.code); return; }
  }
  v.innerHTML = `<h1 class="h">${editing ? "Edit your piece" : "Write something"}</h1><form class="write" id="wf">
    <div class="seg" id="wt"><button type="button" data-t="story">Story</button><button type="button" data-t="poem">Poem</button></div>
    <p class="pnote" id="pn" hidden></p>
    <label>Title<input id="wti" maxlength="120" required></label>
    <label id="c1l">Chapter 1 title (optional)<input id="wc1" maxlength="100"></label>
    <div class="field"><span class="lbl" id="wl"></span>${fmtBar()}<textarea id="wb" maxlength="20000" required></textarea></div>
    <div class="goal"><div class="gbar"><i id="gf"></i></div><small id="gt"></small></div>
    <label>Tags (up to 5, separated by commas)<input id="wg" placeholder="love, rain, fantasy"></label>
    <div class="row2"><label>Genre<select id="wge"><option value="">None</option>${GENRES.map(g => `<option>${esc(g)}</option>`).join("")}</select></label>
    <label class="chk"><input type="checkbox" id="wm"> Mature content (18+)</label></div>
    <div class="row2"><label>Series / collection (optional)<input id="wse" maxlength="60"></label><label>Part #<input id="wsn" type="number" min="1" max="999"></label></div>
    <div class="field"><span class="lbl">Cover mood</span><div class="moods" id="mo">${Object.entries(MOODS).map(([k, m]) => `<button type="button" data-m="${k}" style="--c:${m[1]}"><i></i>${m[0]}</button>`).join("")}</div></div>
    <div class="field"><span class="lbl">Cover image (optional)</span><div id="cv"></div><input type="file" id="cfile" accept="image/*" hidden><button type="button" class="btn ghost sm" id="cb">Choose image</button></div>
    <p class="fine" id="ds"></p>
    <button class="btn primary" id="wp">${editing ? "Save changes" : "Publish"}</button></form>`;

  const setType = x => {
    type = x;
    document.querySelectorAll("#wt button").forEach(b => b.classList.toggle("on", b.dataset.t === x));
    $("#wl").textContent = x === "poem" ? "Your poem (line breaks are kept)" : "Your story";
    $("#c1l").hidden = x !== "story";
  };
  const setMood = k => {
    mood = k;
    document.querySelectorAll("#mo button").forEach(b => b.classList.toggle("on", b.dataset.m === k));
  };
  const drawCover = () => {
    const cv = safeCover(cover);
    $("#cv").innerHTML = cv ? `<img class="cover prev" src="${esc(cv)}" alt=""><button type="button" class="lnk" id="cx">remove image</button>` : "";
    const x = $("#cx");
    if (x) x.onclick = () => { cover = ""; drawCover(); saveDraft(); };
  };
  const drawPrompt = () => {
    const pn = $("#pn");
    pn.hidden = !prompt;
    pn.innerHTML = prompt ? `Responding to the prompt: “${esc(prompt)}” <button type="button" class="lnk" id="px">remove</button>` : "";
    const px = $("#px");
    if (px) px.onclick = () => { prompt = ""; drawPrompt(); saveDraft(); };
  };
  const updCount = () => {
    const w = wordCount($("#wb").value);
    $("#wc").textContent = w + " words";
    const g = $(".goal");
    g.hidden = !!editing;
    if (editing) return;
    const done = (me.wordsDay === dayStr() ? me.wordsToday || 0 : 0) + w;
    $("#gf").style.width = Math.min(100, (done / (me.goal || 300)) * 100) + "%";
    $("#gt").innerHTML = done + " / " + (me.goal || 300) + " words today" + (done >= (me.goal || 300) ? " " + CHECK : "");
  };
  const fields = () => ({ type, title: $("#wti").value, ch1: $("#wc1").value, body: $("#wb").value, tags: $("#wg").value, genre: $("#wge").value, mature: $("#wm").checked, series: $("#wse").value, seriesNo: $("#wsn").value, mood, prompt });
  const saveDraft = () => {
    if (editing) return;
    const d = fields();
    if (!d.title && !d.body) return;
    store.set("draft", JSON.stringify(d));
    clearTimeout(dt);
    dt = setTimeout(() => {
      if (published) return;
      setDoc(doc(db, "users", me.uid, "drafts", "current"), { ...d, at: Date.now() }).then(() => { const s = $("#ds"); if (s && !published) s.textContent = "Draft saved to your account."; }).catch(() => {});
    }, 1200);
  };
  subs.push(() => clearTimeout(dt));

  if (editing) {
    $("#wti").value = editing.title;
    $("#wc1").value = editing.ch1Title || "";
    $("#wb").value = editing.body;
    $("#wg").value = (editing.tags || []).join(", ");
    $("#wge").value = editing.genre || "";
    $("#wm").checked = !!editing.mature;
    $("#wse").value = editing.series || "";
    $("#wsn").value = editing.seriesNo || "";
  } else {
    let d = null;
    try { const s = await getDoc(doc(db, "users", me.uid, "drafts", "current")); if (s.exists()) d = s.data(); } catch {}
    if (t !== tok) return;
    if (!d) { try { d = JSON.parse(store.get("draft") || "null"); } catch {} }
    if (d && (d.title || d.body)) {
      $("#wti").value = d.title || "";
      $("#wc1").value = d.ch1 || "";
      $("#wb").value = d.body || "";
      $("#wg").value = d.tags || "";
      $("#wge").value = d.genre || "";
      $("#wm").checked = !!d.mature;
      $("#wse").value = d.series || "";
      $("#wsn").value = d.seriesNo || "";
      type = d.type || "story";
      mood = d.mood || "plain";
      if (!prompt && d.prompt) prompt = d.prompt;
      $("#ds").textContent = "Draft restored.";
    } else $("#ds").textContent = "Drafts save automatically to your account.";
  }
  setType(type);
  setMood(mood);
  drawCover();
  drawPrompt();
  updCount();
  bindFmt(() => { updCount(); saveDraft(); });

  $("#wf").oninput = () => { updCount(); saveDraft(); };
  $("#wt").onclick = e => { const b = e.target.closest("button"); if (b) { setType(b.dataset.t); saveDraft(); } };
  $("#mo").onclick = e => { const b = e.target.closest("button"); if (b) { setMood(b.dataset.m); saveDraft(); } };
  $("#cb").onclick = () => $("#cfile").click();
  $("#cfile").onchange = async e => {
    const f = e.target.files[0];
    if (!f) return;
    try { cover = await shrinkImage(f); drawCover(); } catch { toast("Couldn't read that image."); }
    e.target.value = "";
  };

  $("#wf").onsubmit = async e => {
    e.preventDefault();
    const title = $("#wti").value.trim(), body = $("#wb").value.trim();
    if (!title || body.length < 10) { toast("Add a title and a little more text."); return; }
    const series = $("#wse").value.trim();
    let tags = parseTags($("#wg").value);
    if (prompt && !tags.includes("prompt")) tags = [...tags.slice(0, 4), "prompt"];
    const f = {
      title, body, type, tags, ch1Title: type === "story" ? $("#wc1").value.trim() : "",
      genre: $("#wge").value, mature: $("#wm").checked, series, seriesNo: series ? parseInt($("#wsn").value) || 0 : 0,
      mood, cover: safeCover(cover), prompt
    };
    const words = wordCount(body);
    $("#wp").disabled = true;
    try {
      if (editing) {
        await updateDoc(doc(db, "posts", editId), { ...f, words: increment(words - (editing.words ? wordCount(editing.body) : wordCount(editing.body))), updatedAt: serverTimestamp() });
        location.hash = "#/post/" + editId;
      } else {
        published = true;
        clearTimeout(dt);
        const r = await addDoc(collection(db, "posts"), {
          ...f, authorId: me.uid, authorName: me.name, authorPhoto: urlPhoto(me.photo),
          createdAt: serverTimestamp(), likeCount: 0, commentCount: 0, views: 0, chapterCount: 1, words
        });
        store.set("draft", "");
        deleteDoc(doc(db, "users", me.uid, "drafts", "current")).catch(() => {});
        await bumpStats({ words, type, newPost: true, prompted: !!prompt });
        notifyFollowers("post", { id: r.id, title });
        location.hash = "#/post/" + r.id;
      }
    } catch (err) {
      published = false;
      toast("Couldn't save: " + err.code);
      $("#wp").disabled = false;
    }
  };
}

async function chapterView(v, id, n, t) {
  v.innerHTML = '<p class="muted center">Loading…</p>';
  let post, existing = null;
  try {
    const s = await getDoc(doc(db, "posts", id));
    if (t !== tok) return;
    if (!s.exists() || s.data().authorId !== me.uid) { location.hash = "#/"; return; }
    post = { id, ...s.data() };
    const total = post.chapterCount || 1;
    if (n <= 1) { location.hash = "#/write/" + id; return; }
    if (n > total + 1) n = total + 1;
    if (n <= total) {
      const c = await getDoc(doc(db, "posts", id, "chapters", String(n)));
      if (t !== tok) return;
      if (c.exists()) existing = c.data();
    }
  } catch (e) { toast("Can't load: " + e.code); return; }
  const total = post.chapterCount || 1;
  const isLast = n === total;
  v.innerHTML = `<h1 class="h">${existing ? "Edit chapter " + n : "New chapter " + n}</h1><p class="muted">${esc(post.title)}</p>
    <form class="write" id="wf"><label>Chapter title (optional)<input id="wti" maxlength="100"></label>
    <div class="field"><span class="lbl">Chapter text</span>${fmtBar()}<textarea id="wb" maxlength="20000" required></textarea></div>
    <button class="btn primary" id="wp">${existing ? "Save chapter" : "Publish chapter"}</button>
    ${existing && isLast ? '<button type="button" class="btn danger" id="dc">Delete this chapter</button>' : ""}</form>`;
  if (existing) { $("#wti").value = existing.title || ""; $("#wb").value = existing.body || ""; }
  const upd = () => { $("#wc").textContent = wordCount($("#wb").value) + " words"; };
  bindFmt(upd);
  $("#wb").oninput = upd;
  upd();
  $("#wf").onsubmit = async e => {
    e.preventDefault();
    const title = $("#wti").value.trim(), body = $("#wb").value.trim();
    if (body.length < 10) { toast("Add a little more text."); return; }
    const w = wordCount(body);
    $("#wp").disabled = true;
    const b = writeBatch(db);
    const pr = doc(db, "posts", id);
    if (existing) {
      b.update(doc(db, "posts", id, "chapters", String(n)), { title, body });
      b.update(pr, { words: increment(w - wordCount(existing.body || "")), updatedAt: serverTimestamp() });
    } else {
      b.set(doc(db, "posts", id, "chapters", String(n)), { n, title, body, createdAt: serverTimestamp() });
      b.update(pr, { chapterCount: n, words: increment(w), updatedAt: serverTimestamp() });
    }
    try {
      await b.commit();
      if (!existing) {
        await bumpStats({ words: w, chapters: n });
        notifyFollowers("chapter", post, { chapter: n });
      }
      location.hash = "#/post/" + id + "/" + n;
    } catch (err) {
      toast("Couldn't save: " + err.code);
      $("#wp").disabled = false;
    }
  };
  const dc = $("#dc");
  if (dc) dc.onclick = async () => {
    if (!confirm("Delete this chapter?")) return;
    const b = writeBatch(db);
    b.delete(doc(db, "posts", id, "chapters", String(n)));
    b.update(doc(db, "posts", id), { chapterCount: n - 1, words: increment(-wordCount(existing.body || "")) });
    try { await b.commit(); location.hash = "#/post/" + id + "/" + (n - 1); } catch (err) { toast("Couldn't delete: " + err.code); }
  };
}

function shelfView(v, t) {
  v.innerHTML = '<h1 class="h">My shelf</h1><div id="sl" class="list"><p class="muted center">Loading…</p></div>';
  subs.push(onSnapshot(collection(db, "users", me.uid, "shelf"), async s => {
    const ids = s.docs.map(d => ({ id: d.id, at: d.data().at || 0 })).sort((a, b) => b.at - a.at).slice(0, 50);
    const docs = await Promise.all(ids.map(i => getDoc(doc(db, "posts", i.id)).catch(() => null)));
    if (t !== tok) return;
    const ps = docs.filter(d => d && d.exists()).map(d => ({ id: d.id, ...d.data() })).filter(visible);
    const sl = $("#sl");
    if (sl) sl.innerHTML = ps.length ? ps.map(p => cardHtml(p)).join("") : '<p class="muted center">Nothing saved yet. Tap ☆ Save on any piece.</p>';
  }, e => toast("Can't load shelf: " + e.code)));
}

function seriesView(v, uid, name, t) {
  v.innerHTML = `<h1 class="h">${esc(name)}</h1><p class="muted"><a href="#/u/${esc(uid)}">View writer</a></p><div id="sl" class="list"><p class="muted center">Loading…</p></div>`;
  subs.push(onSnapshot(query(collection(db, "posts"), where("authorId", "==", uid), where("series", "==", name)), s => {
    const ps = s.docs.map(d => ({ id: d.id, ...d.data() })).filter(visible).sort((a, b) => (a.seriesNo || 999) - (b.seriesNo || 999) || toMs(a.createdAt) - toMs(b.createdAt));
    const sl = $("#sl");
    if (sl) sl.innerHTML = ps.length ? ps.map(p => cardHtml(p, false)).join("") : '<p class="muted center">Nothing here yet.</p>';
  }, e => toast("Can't load: " + e.code)));
}

function statsView(v) {
  v.innerHTML = '<h1 class="h">My stats</h1><div id="st"><p class="muted center">Loading…</p></div>';
  let followers = 0, ps = [];
  const draw = () => {
    const el = $("#st");
    if (!el) return;
    const sum = k => ps.reduce((a, p) => a + (p[k] || 0), 0);
    const tiles = [["Pieces", ps.length], ["Views", sum("views")], ["Likes", sum("likeCount")], ["Comments", sum("commentCount")], ["Words", sum("words")], ["Followers", followers], ["Streak", liveStreak(me) + " d"], ["Best goal", (me.goal || 300) + " w/day"]];
    el.innerHTML = `<div class="tiles">${tiles.map(([k, x]) => `<div class="tile"><b>${x}</b><small>${k}</small></div>`).join("")}</div>
      <div class="badges">${badgeHtml(me.badges) || '<span class="muted fine">Publish your first piece to earn badges.</span>'}</div>
      <h3 class="h2">By piece</h3><div class="srows">${ps.sort((a, b) => (b.views || 0) - (a.views || 0)).map(p => `<a class="srow" href="#/post/${p.id}"><b>${esc(p.title)}</b><span>👁 ${p.views || 0}</span><span>♥ ${p.likeCount || 0}</span><span>✎ ${p.commentCount || 0}</span><span>${p.words || wordCount(p.body)} w</span></a>`).join("") || '<p class="muted">No pieces yet.</p>'}</div>`;
  };
  subs.push(onSnapshot(query(collection(db, "posts"), where("authorId", "==", me.uid)), s => { ps = s.docs.map(d => ({ id: d.id, ...d.data() })); draw(); }, () => {}));
  subs.push(onSnapshot(collection(db, "users", me.uid, "followers"), s => { followers = s.size; draw(); }, () => {}));
}

function notifsView(v) {
  v.innerHTML = '<h1 class="h">Notifications</h1><div id="nl" class="chats"></div>';
  const seen = new Set(notifs.filter(x => !x.read).map(x => x.id));
  const link = notifLink, text = notifText;
  const draw = () => {
    const el = $("#nl");
    if (!el) return;
    el.innerHTML = notifs.length
      ? notifs.map(n => `<a class="crow ${seen.has(n.id) ? "new" : ""}" href="${esc(link(n))}">${av(n.fromUid, n.fromName, "")}<div class="cinfo"><b>${esc(n.fromName)}</b><span class="wrap">${esc(text(n))}</span></div><div class="cmeta"><small>${ago(toMs(n.createdAt))}</small></div></a>`).join("")
      : '<p class="muted center">Nothing yet. Likes, comments, follows and new chapters will show up here.</p>';
    const un = notifs.filter(x => !x.read);
    if (un.length) {
      const b = writeBatch(db);
      un.forEach(x => b.update(doc(db, "users", me.uid, "notifs", x.id), { read: true }));
      b.commit().catch(() => {});
    }
  };
  draw();
  window.addEventListener("notifs", draw);
  subs.push(() => window.removeEventListener("notifs", draw));
}

function adminView(v) {
  if (!me.admin) { v.innerHTML = '<p class="muted center">Admins only.</p>'; return; }
  v.innerHTML = '<h1 class="h">Reports</h1><div id="rl" class="list"><p class="muted center">Loading…</p></div>';
  subs.push(onSnapshot(query(collection(db, "reports"), orderBy("createdAt", "desc"), limit(100)), s => {
    const rl = $("#rl");
    if (!rl) return;
    rl.innerHTML = s.docs.length
      ? s.docs.map(d => {
          const r = d.data();
          return `<div class="rep"><a href="#/post/${esc(r.postId)}"><b>${esc(r.postTitle)}</b></a><p>${esc(r.reason)}</p><small>${esc(r.byName)} · ${ago(toMs(r.createdAt))}</small>
            <div class="actions"><button class="lnk" data-dis="${esc(d.id)}">dismiss</button><button class="lnk" data-rm="${esc(r.postId)}">delete post</button></div></div>`;
        }).join("")
      : '<p class="muted center">No reports. All quiet.</p>';
  }, e => toast("Can't load reports: " + e.code)));
  v.onclick = async e => {
    const dis = e.target.closest("[data-dis]");
    const rm = e.target.closest("[data-rm]");
    try {
      if (dis) await deleteDoc(doc(db, "reports", dis.dataset.dis));
      else if (rm && confirm("Delete this post and its comments?")) await removePost(rm.dataset.rm);
    } catch (err) { toast("Failed: " + err.code); }
  };
  subs.push(() => { v.onclick = null; });
}

async function profileView(v, uid, t) {
  v.innerHTML = '<p class="muted center">Loading…</p>';
  let us;
  try { us = await getDoc(doc(db, "users", uid)); } catch (e) { toast("Can't load: " + e.code); return; }
  if (t !== tok) return;
  if (!us.exists()) { v.innerHTML = '<p class="muted center">No such writer.</p>'; return; }
  const u = us.data();
  const mine = uid === me.uid;
  const st = liveStreak(u);
  const HAM = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h16"/></svg>';
  const menu = mine
    ? `<button type="button" class="mi" id="opic">Profile picture &amp; border</button>
       <form id="nf"><input id="nn" value="${esc(u.name)}" maxlength="30" required aria-label="Name"><button class="btn sm">Save</button></form>
       <form id="gf2"><label class="inl">Daily goal <input id="gi" type="number" min="50" max="5000" step="50" value="${me.goal || 300}"></label><button class="btn sm">Set</button></form>
       <a class="mi" href="#/stats">My stats</a>
       ${me.admin ? '<a class="mi" href="#/admin">Review reports</a>' : ""}
       ${me.anon ? '<button type="button" class="mi" id="lg">Link Google to keep this account</button>' : ""}
       <button type="button" class="mi" id="nt"></button>
       <button type="button" class="mi" id="ins" hidden>Install app</button>
       <p class="fine" id="insn">To install: browser menu, then “Add to Home screen”.</p>
       <div id="bl"></div>
       <button type="button" class="mi" id="so">Sign out</button>
       <p class="fine">Your ID: ${esc(me.uid)}</p>`
    : `<button type="button" class="mi" id="fw"></button><a class="mi" href="#/chat/${esc(uid)}">Message</a><button type="button" class="mi" id="mu"></button><button type="button" class="mi dng" id="bk"></button>`;
  v.innerHTML = `<section class="profile"><div class="pmenu"><button type="button" class="pmbtn" id="pmb" aria-label="Menu" aria-expanded="false">${HAM}</button><div class="pmd" id="pmd" hidden>${menu}</div></div>${av(uid, u.name, u.photo, "lg")}<h1>${esc(u.name)}</h1><p class="muted" id="pst"></p>
    <p class="muted"><span id="fc">0 followers</span>${mine ? ' · <span id="fg">0 following</span>' : ""}${st ? ` · 🔥 ${st}-day streak` : ""}</p>
    <div class="badges">${badgeHtml(mine ? me.badges : u.badges)}</div></section>
    ${mine ? '<div class="sheet" id="sheet" hidden><div class="sheet-h"><b>Picture &amp; border</b><button type="button" class="btn sm" id="shx">Done</button></div><div id="pe" class="pe"></div></div>' : ""}
    <h3>Writings</h3><div id="pl" class="list"></div>`;
  const pmb = $("#pmb"), pmd = $("#pmd");
  const closeMenu = () => { pmd.hidden = true; pmb.setAttribute("aria-expanded", "false"); };
  pmb.onclick = e => { e.stopPropagation(); pmd.hidden = !pmd.hidden; pmb.setAttribute("aria-expanded", String(!pmd.hidden)); };
  const outside = e => { if (!pmd.hidden && !e.target.closest(".pmenu")) closeMenu(); };
  document.addEventListener("click", outside);
  pmd.addEventListener("click", e => { if (e.target.closest("a.mi, #so, #lg, #ins, #fw, #mu, #bk, #opic")) closeMenu(); });
  subs.push(() => document.removeEventListener("click", outside));
  subs.push(onSnapshot(collection(db, "users", uid, "followers"), s => {
    const el = $("#fc");
    if (el) el.textContent = s.size + " follower" + (s.size === 1 ? "" : "s");
  }, () => {}));
  if (!mine) {
    watch(uid);
    const pst = () => {
      const p = presence[uid];
      const el = $("#pst");
      if (el) el.textContent = isOnline(p) ? "online now" : p?.lastSeen ? "last seen " + ago(p.lastSeen) : "";
    };
    pst();
    window.addEventListener("presence", pst);
    const iv = setInterval(pst, 15000);
    subs.push(() => { window.removeEventListener("presence", pst); clearInterval(iv); });
    const btns = () => {
      $("#fw").innerHTML = following.has(uid) ? "Following " + CHECK : "+ Follow";
      $("#mu").textContent = mutes.has(uid) ? "Unmute" : "Mute";
      $("#bk").textContent = blocks.has(uid) ? "Unblock" : "Block";
    };
    btns();
    window.addEventListener("prefs", btns);
    subs.push(() => window.removeEventListener("prefs", btns));
    $("#fw").onclick = () => toggleFollow(uid, u.name);
    $("#mu").onclick = () => (mutes.has(uid) ? deleteDoc(doc(db, "users", me.uid, "mutes", uid)) : setDoc(doc(db, "users", me.uid, "mutes", uid), { name: u.name })).catch(e => toast("Failed: " + e.code));
    $("#bk").onclick = () => {
      if (!blocks.has(uid) && !confirm("Block " + u.name + "? You won't see their writing and they can't message you.")) return;
      (blocks.has(uid) ? deleteDoc(doc(db, "users", me.uid, "blocks", uid)) : setDoc(doc(db, "users", me.uid, "blocks", uid), { name: u.name })).catch(e => toast("Failed: " + e.code));
    };
  } else {
    subs.push(onSnapshot(collection(db, "users", me.uid, "following"), s => { const el = $("#fg"); if (el) el.textContent = s.size + " following"; }, () => {}));
    const googlePhoto = () => auth.currentUser?.providerData?.find(p => p.photoURL)?.photoURL || auth.currentUser?.photoURL || "";
    const savePE = async patch => {
      try {
        await updateDoc(doc(db, "users", me.uid), patch);
        Object.assign(me, patch);
        drawPE();
      } catch (err) { toast("Couldn't save: " + err.code); }
    };
    const drawPE = () => {
      const el = $("#pe");
      if (!el) return;
      const keepOpen = !$("#avg")?.hidden && !!$("#avg");
      const cur = presence[me.uid] && "photo" in presence[me.uid] ? presence[me.uid].photo : me.photo;
      const g = googlePhoto();
      el.innerHTML = `<h3 class="h2">Profile picture</h3>
        <div class="pe-btns"><button type="button" class="btn sm" id="pu">Upload photo</button>${g ? '<button type="button" class="btn sm" id="pg">Use Google photo</button>' : ""}<button type="button" class="btn sm" id="pa">Choose avatar</button>${cur ? '<button type="button" class="btn ghost sm" id="pr">Remove</button>' : ""}</div>
        <input type="file" id="pfile" accept="image/*" hidden>
        <div class="avgrid" id="avg" ${keepOpen ? "" : "hidden"}>${AVATARS.map((a, i) => `<button type="button" data-i="${i}" aria-label="Avatar ${i + 1}"><img src="${esc(a)}" alt=""></button>`).join("")}</div>
        <h3 class="h2">Border</h3>
        <div class="frgrid">${Object.entries(FRAMES).filter(([, f]) => !f.admin || me.admin).map(([k, f]) => {
          const ok = frameOpen(k, me);
          return `<button type="button" class="frb ${me.frame === k ? "on" : ""} ${ok ? "" : "lock"}" data-k="${k}">${avStatic(k, me.name, cur, "md")}<span>${esc(f.n)}</span>${ok ? "" : `<small>${esc(f.hint)}</small>`}</button>`;
        }).join("")}</div>`;
    };
    drawPE();
    const sheet = $("#sheet");
    const setSheet = on => { sheet.hidden = !on; document.body.classList.toggle("noscroll", on); };
    $("#opic").onclick = () => setSheet(true);
    $("#shx").onclick = () => setSheet(false);
    subs.push(() => document.body.classList.remove("noscroll"));
    $("#pe").onclick = e => {
      const b = e.target.closest("button");
      if (!b) return;
      if (b.id === "pu") $("#pfile").click();
      else if (b.id === "pg") savePE({ photo: googlePhoto() });
      else if (b.id === "pa") $("#avg").hidden = !$("#avg").hidden;
      else if (b.id === "pr") savePE({ photo: "" });
      else if (b.closest("#avg")) savePE({ photo: AVATARS[+b.dataset.i] });
      else if (b.dataset.k) {
        if (!frameOpen(b.dataset.k, me)) { toast("Locked: " + FRAMES[b.dataset.k].hint); return; }
        savePE({ frame: b.dataset.k });
      }
    };
    $("#pe").onchange = async e => {
      if (e.target.id !== "pfile" || !e.target.files[0]) return;
      try { await savePE({ photo: await squareImage(e.target.files[0]) }); } catch { toast("Couldn't read that image."); }
    };
    $("#nf").onsubmit = async e => {
      e.preventDefault();
      const name = $("#nn").value.trim();
      if (!name) return;
      try {
        await updateDoc(doc(db, "users", me.uid), { name });
        me.name = name;
        toast("Name saved");
      } catch (err) { toast("Couldn't save: " + err.code); }
    };
    $("#gf2").onsubmit = async e => {
      e.preventDefault();
      const goal = Math.min(5000, Math.max(50, parseInt($("#gi").value) || 300));
      try { await updateDoc(doc(db, "users", me.uid), { goal }); me.goal = goal; toast("Goal set to " + goal + " words"); } catch (err) { toast("Couldn't save: " + err.code); }
    };
    const drawNt = async () => {
      const b = $("#nt");
      if (!b) return;
      const p = await notifPerm();
      b.hidden = p === "unsupported";
      b.textContent = p === "granted" ? "Notifications: on ✓" : p === "denied" ? "Notifications blocked (allow in phone settings)" : "Turn on notifications";
    };
    drawNt();
    $("#nt").onclick = async () => { if ((await notifPerm()) !== "granted") { await askNotifPerm(); drawNt(); } };
    const ins = $("#ins");
    if (installEvt) {
      ins.hidden = false;
      $("#insn").hidden = true;
      ins.onclick = async () => { installEvt.prompt(); try { await installEvt.userChoice; } catch {} installEvt = null; ins.hidden = true; };
    }
    const drawBl = () => {
      const el = $("#bl");
      if (!el) return;
      const rows = [...blocks].map(([id, n]) => ["blocks", id, n, "Blocked"]).concat([...mutes].map(([id, n]) => ["mutes", id, n, "Muted"]));
      el.innerHTML = rows.length ? `<h3 class="h2">Blocked &amp; muted</h3>${rows.map(r => `<div class="brow"><span>${esc(r[2])} <small class="muted">${r[3]}</small></span><button class="lnk" data-c="${r[0]}" data-i="${esc(r[1])}">undo</button></div>`).join("")}` : "";
    };
    drawBl();
    $("#bl").onclick = e => {
      const b = e.target.closest("[data-c]");
      if (b) deleteDoc(doc(db, "users", me.uid, b.dataset.c, b.dataset.i)).catch(err => toast("Failed: " + err.code));
    };
    window.addEventListener("prefs", drawBl);
    subs.push(() => window.removeEventListener("prefs", drawBl));
    $("#so").onclick = async () => {
      if (me.anon && !confirm("Guest accounts can't be recovered after signing out. Continue?")) return;
      await updateDoc(doc(db, "users", me.uid), { lastSeen: 0 }).catch(() => {});
      if (NATIVE) { try { await plug("FirebaseAuthentication").signOut(); } catch {} }
      signOut(auth);
    };
    const lg = $("#lg");
    if (lg) lg.onclick = async () => {
      const p = new GoogleAuthProvider();
      let cred = null;
      try {
        if (NATIVE) cred = await nativeCred();
        const r = NATIVE ? await linkWithCredential(auth.currentUser, cred) : await linkWithPopup(auth.currentUser, p);
        me.anon = false;
        if (!me.photo && r.user.photoURL) me.photo = r.user.photoURL;
        await updateDoc(doc(db, "users", me.uid), { anon: false, photo: me.photo || "" });
        toast("Google account linked");
        route();
      } catch (err) {
        if (err.code === "auth/credential-already-in-use") {
          toast("That Google account already exists. Signing in with it…");
          try { await (NATIVE ? signInWithCredential(auth, cred) : signInWithPopup(auth, p)); } catch (e2) { toast("Sign-in failed: " + errMsg(e2)); }
        } else if (!["auth/popup-closed-by-user", "auth/cancelled-popup-request"].includes(err.code)) toast("Couldn't link: " + errMsg(err));
      }
    };
  }
  subs.push(onSnapshot(query(collection(db, "posts"), where("authorId", "==", uid)), s => {
    const ps = s.docs.map(d => ({ id: d.id, ...d.data() })).filter(visible).sort((a, b) => toMs(b.createdAt) - toMs(a.createdAt));
    const pl = $("#pl");
    if (!pl) return;
    pl.innerHTML = ps.length ? ps.map(p => cardHtml(p, false)).join("") : '<p class="muted center">Nothing published yet.</p>';
  }, () => {}));
}

function chatsView(v) {
  v.innerHTML = '<h1 class="h">Chats</h1><div id="cl2" class="chats"></div>';
  const draw = () => {
    const el = $("#cl2");
    if (!el) return;
    const list = chatsCache.filter(c => !blocks.has(otherOf(c)));
    el.innerHTML = list.length
      ? list.map(c => {
          const o = otherOf(c);
          const un = c.unread?.[me.uid] || 0;
          const name = presence[o]?.name || c.names?.[o] || "Writer";
          const photo = presence[o]?.photo ?? c.photos?.[o];
          return `<a class="crow" href="#/chat/${esc(o)}"><span class="avw">${av(o, name, photo)}<i class="dot" data-dot="${esc(o)}"></i></span>
            <div class="cinfo"><b>${esc(name)}</b><span>${c.lastFrom === me.uid ? "You: " : ""}${esc(c.lastMessage || "")}</span></div>
            <div class="cmeta"><small>${ago(toMs(c.lastAt))}</small>${un ? `<em class="badge2">${un}</em>` : ""}</div></a>`;
        }).join("")
      : '<p class="muted center">No conversations yet. Open a writer’s profile and tap Message.</p>';
    refreshDots();
  };
  draw();
  window.addEventListener("chats", draw);
  window.addEventListener("presence", draw);
  window.addEventListener("prefs", draw);
  subs.push(() => { window.removeEventListener("chats", draw); window.removeEventListener("presence", draw); window.removeEventListener("prefs", draw); });
}

async function chatView(v, other, t) {
  if (other === me.uid) { location.hash = "#/chats"; return; }
  v.innerHTML = '<p class="muted center">Loading…</p>';
  let ou;
  try { ou = await getDoc(doc(db, "users", other)); } catch (e) { toast("Can't load: " + e.code); return; }
  if (t !== tok) return;
  if (!ou.exists()) { v.innerHTML = '<p class="muted center">No such writer.</p>'; return; }
  watch(other);
  const oname = () => presence[other]?.name || ou.data().name;
  const ophoto = () => presence[other]?.photo ?? ou.data().photo;
  const members = [me.uid, other].sort();
  const cref = doc(db, "chats", members.join("_"));
  let chat = null, msgs = [], lastTyping = 0, marked = false, first = true;

  v.innerHTML = `<div class="chat"><div class="chat-head"><a href="#/chats" class="back">‹</a>
    <a href="#/u/${esc(other)}" class="avw">${av(other, oname(), ophoto())}<i class="dot" data-dot="${esc(other)}"></i></a>
    <div><b>${esc(oname())}</b><small id="st"></small></div></div>
    <div id="ml" class="msgs"></div>
    ${blocks.has(other)
      ? '<p class="muted center">You blocked this writer. Unblock them from their profile to chat.</p>'
      : '<form id="mf"><input id="mi" autocomplete="off" maxlength="1000" placeholder="Write a message…"><button class="btn primary">Send</button></form>'}</div>`;
  refreshDots();

  const drawSt = () => {
    const st = $("#st");
    if (!st) return;
    const ty = chat?.typing?.[other];
    const p = presence[other];
    st.textContent = ty && Date.now() - ty < 4000 ? "typing…" : isOnline(p) ? "online" : p?.lastSeen ? "last seen " + ago(p.lastSeen) : "offline";
  };
  const drawMsgs = () => {
    const ml = $("#ml");
    if (!ml) return;
    const near = ml.scrollHeight - ml.scrollTop - ml.clientHeight < 120;
    const lastMine = [...msgs].reverse().find(m => m.from === me.uid);
    ml.innerHTML = msgs.length
      ? msgs.map(m => {
          const mine = m.from === me.uid;
          const bub = `<div class="msg ${mine ? "mine" : ""}"><p>${esc(m.text)}</p><small>${new Date(toMs(m.createdAt)).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}${m === lastMine && (chat?.lastRead?.[other] || 0) >= toMs(m.createdAt) ? " · Seen" : ""}</small></div>`;
          return mine ? bub : `<div class="mrow">${av(other, oname(), ophoto(), "xs")}${bub}</div>`;
        }).join("")
      : '<p class="muted center">Say hello 👋</p>';
    if (near || first) ml.scrollTop = ml.scrollHeight;
    first = false;
  };
  const markRead = () => {
    if (!chat) return;
    if ((chat.unread?.[me.uid] || 0) > 0 || !marked) {
      marked = true;
      updateDoc(cref, { ["unread." + me.uid]: 0, ["lastRead." + me.uid]: Date.now() }).catch(() => {});
    }
  };

  subs.push(onSnapshot(cref, s => { chat = s.exists() ? s.data() : null; drawSt(); drawMsgs(); markRead(); }, e => toast("Can't load chat: " + e.code)));
  subs.push(onSnapshot(query(collection(cref, "messages"), orderBy("createdAt", "desc"), limit(200)), s => {
    msgs = s.docs.map(d => ({ id: d.id, ...d.data() })).reverse();
    drawMsgs();
  }, e => toast("Can't load messages: " + e.code)));
  const iv = setInterval(drawSt, 1500);
  window.addEventListener("presence", drawSt);
  subs.push(() => { clearInterval(iv); window.removeEventListener("presence", drawSt); });

  const mi = $("#mi");
  if (mi) {
    mi.oninput = () => {
      if (!chat) return;
      const n = Date.now();
      if (n - lastTyping > 2000) {
        lastTyping = n;
        updateDoc(cref, { ["typing." + me.uid]: n }).catch(() => {});
      }
    };
    $("#mf").onsubmit = async e => {
      e.preventDefault();
      const text = mi.value.trim();
      if (!text) return;
      mi.value = "";
      const b = writeBatch(db);
      b.set(cref, {
        members,
        names: { [me.uid]: me.name, [other]: oname() },
        photos: { [me.uid]: urlPhoto(me.photo), [other]: urlPhoto(ophoto()) },
        lastMessage: text.slice(0, 80),
        lastAt: serverTimestamp(),
        lastFrom: me.uid,
        unread: { [other]: increment(1) },
        typing: { [me.uid]: 0 }
      }, { merge: true });
      b.set(doc(collection(cref, "messages")), { from: me.uid, text, createdAt: serverTimestamp() });
      try { await b.commit(); } catch (err) { toast(err.code === "permission-denied" ? "Message not delivered. You may be blocked." : "Couldn't send: " + err.code); mi.value = text; }
    };
  }
}

if ("serviceWorker" in navigator && location.protocol.startsWith("http") && !NATIVE) {
  navigator.serviceWorker.register("sw.js").catch(() => {});
}
