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
  deleteUser,
} from 'firebase/auth';
import { initializeFirestore, memoryLocalCache, collection, doc, setDoc, deleteDoc, getDocs, onSnapshot, Unsubscribe } from 'firebase/firestore';
import config from '../../firebase-config.json';
import { applySnapshot, attachBackend, setBackendError, setAuth, setNotice, resetData, startLoadTimer, waitForWrites } from './cloud';

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
    // 프로필 사진은 쓰지 않음 (이름 첫 글자로 표시)
    setAuth('signedIn', { name: user.displayName || '', email: user.email || '' });
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
        const code = (err as any)?.code || 'unknown';
        if (code === 'permission-denied') {
          // 허용 명단에 없는 계정
          setAuth('notInvited', { name: user.displayName || '', email: user.email || '' });
          return;
        }
        const hint =
          code === 'permission-denied'
            ? '접근 권한이 없어요. (Firestore 보안 규칙 확인 필요)'
            : code === 'unavailable'
            ? '저장 서버에 연결하지 못했어요. 학교·회사 와이파이가 막고 있을 수 있어요.'
            : '기록을 불러오지 못했어요. 다시 로그인해 주세요.';
        setBackendError(`${hint} [firestore/${code}]`);
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
    const tag = code ? ` [${code}]` : '';
    if (code === 'auth/popup-blocked') return '로그인 창이 차단됐어요. 브라우저에서 팝업을 허용한 뒤 다시 눌러 주세요.' + tag;
    if (code === 'auth/unauthorized-domain') return '이 주소는 아직 로그인이 허용되지 않았어요. (Firebase 승인된 도메인 설정 필요)' + tag;
    if (code === 'auth/network-request-failed')
      return '로그인 서버에 연결하지 못했어요. 학교·회사 와이파이가 구글 로그인을 막고 있을 수 있어요. 휴대폰 데이터나 다른 와이파이로 다시 해 보세요.' + tag;
    if (code === 'auth/operation-not-allowed') return '구글 로그인이 아직 켜져 있지 않아요. (Firebase Authentication 설정 필요)' + tag;
    if (code.startsWith('auth/requests-from-referer')) return '이 주소에서는 로그인이 허용되지 않았어요. (API 키 사용처 제한 확인 필요)' + tag;
    if (code === 'auth/web-storage-unsupported') return '이 브라우저에서는 로그인할 수 없어요. 크롬이나 사파리로 열어 주세요.' + tag;
    return '로그인하지 못했어요. 잠시 후 다시 시도해 주세요.' + (tag || ` [${String(e?.message || 'unknown').slice(0, 80)}]`);
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
    const tag = e?.code ? ` [${e.code}]` : '';
    if (e?.code === 'auth/popup-closed-by-user') return { ok: false, message: '구글 드라이브 권한을 허용해야 시트를 만들 수 있어요.' + tag };
    if (e?.code === 'auth/popup-blocked') return { ok: false, message: '권한 창이 차단됐어요. 팝업을 허용한 뒤 다시 눌러 주세요.' + tag };
    if (e?.code === 'auth/network-request-failed') return { ok: false, message: '구글 서버에 연결하지 못했어요. 다른 네트워크에서 다시 해 보세요.' + tag };
    return { ok: false, message: '구글 드라이브 권한을 받지 못했어요.' + tag };
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
    if (!r.ok) {
      let reason = '';
      try {
        reason = (await r.json())?.error?.message || '';
      } catch {}
      return { ok: false, message: `구글 드라이브가 파일을 만들지 못했어요. [HTTP ${r.status}${reason ? ' ' + reason.slice(0, 80) : ''}]` };
    }
    const j = await r.json();
    return { ok: true, url: j.webViewLink || `https://docs.google.com/spreadsheets/d/${j.id}/edit` };
  } catch (e: any) {
    return { ok: false, message: `구글 드라이브에 연결하지 못했어요. 다른 네트워크에서 다시 해 보세요. [${String(e?.message || 'network').slice(0, 60)}]` };
  }
}

// 탈퇴: 구글로 다시 로그인해 본인 확인 → 기록 전부 삭제 → 로그인 계정 삭제
export type DeleteStep = 'reauth' | 'data' | 'account' | 'done';
export async function deleteMyAccount(onStep?: (s: DeleteStep) => void): Promise<{ ok: true } | { ok: false; message: string; step: DeleteStep }> {
  const user = auth.currentUser;
  if (!user) return { ok: false, message: '로그인이 필요해요.', step: 'reauth' };
  try {
    onStep?.('reauth');
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ login_hint: user.email || '' });
    await reauthenticateWithPopup(user, provider);
  } catch (e: any) {
    const tag = e?.code ? ` [${e.code}]` : '';
    if (e?.code === 'auth/user-mismatch') return { ok: false, message: '같은 구글 계정으로 다시 로그인해 주세요.' + tag, step: 'reauth' };
    return { ok: false, message: '본인 확인이 끝나지 않아 탈퇴하지 않았어요.' + tag, step: 'reauth' };
  }
  try {
    onStep?.('data');
    await waitForWrites();
    if (unsubData) {
      unsubData();
      unsubData = null;
    }
    const col = collection(db, 'users', user.uid, 'data');
    const snap = await getDocs(col);
    for (const d of snap.docs) await deleteDoc(d.ref);
  } catch (e: any) {
    return { ok: false, message: `기록을 지우는 중 문제가 생겼어요. 일부 기록이 남아 있을 수 있어요. [${e?.code || 'unknown'}]`, step: 'data' };
  }
  try {
    onStep?.('account');
    await deleteUser(user);
  } catch (e: any) {
    return { ok: false, message: `기록은 모두 지웠지만 로그인 계정 삭제에 실패했어요. 다시 시도해 주세요. [${e?.code || 'unknown'}]`, step: 'account' };
  }
  onStep?.('done');
  setNotice('탈퇴가 끝났어요. 기록과 로그인 계정을 모두 지웠어요.');
  return { ok: true };
}
