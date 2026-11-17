// 독립 웹사이트용 저장소: Firebase 구글 로그인 + Firestore
// 기록은 users/<내 uid>/data/ 아래에만 저장되고, 보안 규칙(firestore.rules)으로 본인만 읽고 쓸 수 있다.
import { initializeApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithPopup,
  signOut,
  setPersistence,
  browserLocalPersistence,
  browserSessionPersistence,
  reauthenticateWithPopup,
} from 'firebase/auth';
import { initializeFirestore, memoryLocalCache, collection, doc, setDoc, deleteDoc, onSnapshot, Unsubscribe } from 'firebase/firestore';
import config from '../../firebase-config.json';
import { applySnapshot, attachBackend, setBackendError, setAuth, resetData, startLoadTimer, waitForWrites } from './cloud';

const app = initializeApp(config);
const auth = getAuth(app);
auth.languageCode = 'ko';
// memoryLocalCache: 기록을 이 기기(브라우저)에 저장하지 않음 — 공용 컴퓨터에서도 흔적이 남지 않게
const db = initializeFirestore(app, { localCache: memoryLocalCache() });

let unsubData: Unsubscribe | null = null;

export function startFirebase() {
  onAuthStateChanged(auth, (user) => {
    if (unsubData) {
      unsubData();
      unsubData = null;
    }
    resetData();
    if (!user) {
      attachBackend(null, null);
      setAuth('signedOut');
      return;
    }
    setAuth('signedIn', { name: user.displayName || '', email: user.email || '', photo: user.photoURL || undefined });
    const col = collection(db, 'users', user.uid, 'data');
    attachBackend(
      {
        write: (id, body) => setDoc(doc(col, id), body),
        remove: (id) => deleteDoc(doc(col, id)),
      },
      user.uid
    );
    startLoadTimer();
    unsubData = onSnapshot(
      col,
      { includeMetadataChanges: false },
      (snap) => {
        const docs = snap.docs.map((d) => ({ id: d.id, data: d.data(), pending: d.metadata.hasPendingWrites }));
        const removed = snap
          .docChanges()
          .filter((c) => c.type === 'removed')
          .map((c) => c.doc.id);
        applySnapshot(docs, removed, snap.metadata.fromCache);
      },
      (err) => {
        console.warn(err);
        setBackendError('기록을 불러오지 못했어요. 다시 로그인해 주세요.');
      }
    );
  });
}

export async function signInWithGoogle(sharedComputer: boolean): Promise<string | null> {
  try {
    // 공용 컴퓨터: 창(탭)을 닫으면 로그아웃되는 세션 로그인
    await setPersistence(auth, sharedComputer ? browserSessionPersistence : browserLocalPersistence);
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });
    await signInWithPopup(auth, provider);
    return null;
  } catch (e: any) {
    const code = e?.code || '';
    if (code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request') return null;
    if (code === 'auth/popup-blocked') return '로그인 창이 차단됐어요. 브라우저에서 팝업을 허용한 뒤 다시 눌러 주세요.';
    if (code === 'auth/unauthorized-domain') return '이 주소는 아직 로그인이 허용되지 않았어요. (Firebase 승인된 도메인 설정 필요)';
    if (code === 'auth/network-request-failed') return '인터넷 연결을 확인해 주세요.';
    return '로그인하지 못했어요. 잠시 후 다시 시도해 주세요.';
  }
}

export async function logout() {
  await waitForWrites();
  await signOut(auth);
}

// 구글 시트로 내보내기: drive.file 권한(이 앱이 만든 파일에만 접근)으로 CSV를 올려 시트로 변환
export async function uploadCsvAsSheet(title: string, csv: string): Promise<{ ok: true; url: string } | { ok: false; message: string }> {
  const user = auth.currentUser;
  if (!user) return { ok: false, message: '로그인이 필요해요.' };
  let token: string | undefined;
  try {
    const provider = new GoogleAuthProvider();
    provider.addScope('https://www.googleapis.com/auth/drive.file');
    provider.setCustomParameters({ login_hint: user.email || '' });
    const res = await reauthenticateWithPopup(user, provider);
    token = GoogleAuthProvider.credentialFromResult(res)?.accessToken;
  } catch (e: any) {
    if (e?.code === 'auth/popup-closed-by-user') return { ok: false, message: '구글 드라이브 권한을 허용해야 시트를 만들 수 있어요.' };
    if (e?.code === 'auth/popup-blocked') return { ok: false, message: '권한 창이 차단됐어요. 팝업을 허용한 뒤 다시 눌러 주세요.' };
    return { ok: false, message: '구글 드라이브 권한을 받지 못했어요.' };
  }
  if (!token) return { ok: false, message: '구글 드라이브 권한을 받지 못했어요.' };

  const boundary = 'habitstamp' + Math.random().toString(36).slice(2);
  const meta = { name: title, mimeType: 'application/vnd.google-apps.spreadsheet' };
  const body =
    `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(meta)}\r\n` +
    `--${boundary}\r\nContent-Type: text/csv; charset=UTF-8\r\n\r\n${csv}\r\n--${boundary}--`;
  try {
    const r = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,webViewLink', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': `multipart/related; boundary=${boundary}` },
      body,
    });
    if (!r.ok) return { ok: false, message: `구글 드라이브가 파일을 만들지 못했어요. (${r.status})` };
    const j = await r.json();
    return { ok: true, url: j.webViewLink || `https://docs.google.com/spreadsheets/d/${j.id}/edit` };
  } catch {
    return { ok: false, message: '인터넷 연결을 확인해 주세요.' };
  }
}
