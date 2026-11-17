// Claude 아티팩트 저장소 (data/users/<내 id>/ — 본인만 접근)
import { applySnapshot, attachBackend, setBackendError, setNoBackend } from './cloud';

export async function startClaude() {
  const c = (window as any).claude;
  if (!c?.use) return setNoBackend();
  const [dbNs, userNs] = await Promise.all([c.use('db'), c.use('user')]);
  const uid = userNs ? await userNs.id() : null;
  if (!dbNs || !uid) return setNoBackend();
  const col = dbNs.collection('data/users/' + uid);
  attachBackend(
    {
      write: (id, body) => col.doc(id).set(body),
      remove: (id) => col.doc(id).delete(),
    },
    uid
  );
  col.onSnapshot(
    (snap: any) => {
      const docs = snap.docs.map((d: any) => ({ id: d.id, data: d.data() || {}, pending: !!d.metadata?.hasPendingWrites }));
      const removed = snap
        .docChanges()
        .filter((ch: any) => ch.type === 'removed')
        .map((ch: any) => ch.doc.id);
      applySnapshot(docs, removed, !!snap.metadata?.fromCache);
    },
    (err: any) => {
      console.warn('snapshot error', err);
      setBackendError('저장소 연결이 끊겼어요. 페이지를 다시 열어 주세요.');
    }
  );
}
