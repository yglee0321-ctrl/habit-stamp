import React, { useState, useEffect } from 'react';
import { LogOut, Trash2, ShieldCheck, UserX, Loader2, X } from 'lucide-react';
import { askConfirm } from '../lib/ui';
import * as cloud from '../lib/cloud';

export const LoginScreen: React.FC = () => {
  const [shared, setShared] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const login = async () => {
    setBusy(true);
    setError(null);
    if (import.meta.env.VITE_TARGET !== 'web') return;
    const fb = await import('../lib/firebaseBackend');
    const err = await fb.signInWithGoogle(shared);
    if (err) setError(err);
    setBusy(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#FCFAF6] dark:bg-[#121110] px-5 font-serif-kr">
      <div className="w-full max-w-sm text-center">
        <div className="w-16 h-16 mx-auto mb-4 rounded-2xl border-[3px] border-[#C23B22] text-[#C23B22] flex items-center justify-center text-3xl font-black rotate-[-4deg]">
          印
        </div>
        <h1 className="text-2xl font-bold font-batang text-[#2C2723] dark:text-[#E6E1DA]">습관 도장</h1>
        <p className="text-xs text-[#7A7265] dark:text-[#A89F91] mt-1 mb-8">매일의 기록과 달성을 한 장의 표로</p>

        <button
          onClick={login}
          disabled={busy}
          className="w-full py-3.5 rounded-2xl bg-white dark:bg-[#201D1A] border border-[#E2DBD0] dark:border-[#38332C] text-sm font-bold text-[#2C2723] dark:text-[#E6E1DA] flex items-center justify-center gap-2.5 shadow-sm hover:bg-[#F3EFE6] dark:hover:bg-[#25221F] disabled:opacity-60"
        >
          {busy ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <svg className="w-4 h-4" viewBox="0 0 24 24" aria-hidden="true">
              <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z" />
              <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.35 24 12 24z" />
              <path fill="#FBBC05" d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.98 0 12s.45 3.82 1.25 5.42l4.03-3.15z" />
              <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.35 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z" />
            </svg>
          )}
          Google 계정으로 시작하기
        </button>

        <label className="flex items-center justify-center gap-2 mt-4 text-xs text-[#5C5549] dark:text-[#C5BEB3] cursor-pointer">
          <input type="checkbox" checked={shared} onChange={(e) => setShared(e.target.checked)} className="w-4 h-4 accent-[#C23B22]" />
          공용 컴퓨터예요 (창을 닫으면 자동 로그아웃)
        </label>

        {error && <p className="mt-4 text-xs text-[#C23B22]" role="alert">{error}</p>}
        {!error && cloud.getState().notice && (
          <p className="mt-4 text-xs text-emerald-700 dark:text-emerald-300" role="status">{cloud.getState().notice}</p>
        )}

        <div className="mt-10 text-left rounded-2xl border border-[#E8E2D5] dark:border-[#2C2824] p-4 text-[11px] leading-relaxed text-[#7A7265] dark:text-[#A89F91]">
          <div className="flex items-center gap-1.5 font-bold text-[#2C2723] dark:text-[#E6E1DA] mb-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-600" aria-hidden="true" /> 다른 사용자는 내 기록을 볼 수 없어요
          </div>
          <ul className="list-disc pl-4 space-y-0.5">
            <li>구글 계정의 이름·이메일은 로그인 확인에만 써요.</li>
            <li>기록은 내 계정 전용 공간에 저장되고, 다른 사용자는 볼 수 없어요.</li>
            <li>기록은 미국에 있는 구글(Firebase) 서버에 저장돼요.</li>
            <li>이 앱을 운영하는 사람(yungyulee)은 관리 화면에서 저장된 기록에 접근할 수 있어요. 문의: yglee0321@gmail.com</li>
            <li>기기에는 기록을 남기지 않아요. 계정 메뉴에서 언제든 탈퇴하고 모든 기록을 지울 수 있어요.</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export const AccountMenu: React.FC = () => {
  const [open, setOpen] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const acc = cloud.getState().account;
  if (!cloud.IS_WEB || !acc) return null;

  const logout = async () => {
    setOpen(false);
    if (import.meta.env.VITE_TARGET !== 'web') return;
    const fb = await import('../lib/firebaseBackend');
    await fb.logout();
  };
  const wipe = async () => {
    setOpen(false);
    if (!(await askConfirm('내 습관과 기록을 모두 지울까요?\n지운 기록은 되돌릴 수 없어요.', '모두 삭제'))) return;
    await cloud.deleteAllMyData();
  };

  return (
    <div className="relative shrink-0">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-8 h-8 rounded-full overflow-hidden border border-[#E2DBD0] dark:border-[#38332C] bg-[#C23B22] text-white text-sm font-bold flex items-center justify-center"
        title={acc.email}
        aria-label="계정 메뉴"
        aria-expanded={open}
      >
        {(acc.name || acc.email || '?').trim().charAt(0).toUpperCase()}
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 mt-1.5 w-60 z-50 rounded-2xl bg-[#FCFAF6] dark:bg-[#1A1816] border border-[#E8E2D5] dark:border-[#2C2824] shadow-xl py-1.5 text-xs font-serif-kr">
            <div className="px-3.5 py-2 border-b border-[#E8E2D5] dark:border-[#2C2824]">
              <div className="font-bold text-[#2C2723] dark:text-[#E6E1DA] truncate">{acc.name || '내 계정'}</div>
              <div className="text-[#8A8174] truncate">{acc.email}</div>
            </div>
            <button onClick={logout} className="w-full px-3.5 py-2.5 text-left flex items-center gap-2 text-[#2C2723] dark:text-[#E6E1DA] hover:bg-[#F3EFE6] dark:hover:bg-[#25221F]">
              <LogOut className="w-4 h-4" /> 로그아웃
            </button>
            <button onClick={wipe} className="w-full px-3.5 py-2.5 text-left flex items-center gap-2 text-[#C23B22] hover:bg-[#F3EFE6] dark:hover:bg-[#25221F]">
              <Trash2 className="w-4 h-4" aria-hidden="true" /> 내 기록 모두 삭제
            </button>
            <button
              onClick={() => {
                setOpen(false);
                setLeaving(true);
              }}
              className="w-full px-3.5 py-2.5 text-left flex items-center gap-2 text-[#C23B22] hover:bg-[#F3EFE6] dark:hover:bg-[#25221F]"
            >
              <UserX className="w-4 h-4" aria-hidden="true" /> 탈퇴 (계정과 기록 삭제)
            </button>
          </div>
        </>
      )}
      {leaving && <LeaveDialog onClose={() => setLeaving(false)} />}
    </div>
  );
};

const STEP_LABEL: Record<string, string> = {
  reauth: '구글로 본인 확인 중…',
  data: '기록 지우는 중…',
  account: '로그인 계정 지우는 중…',
  done: '탈퇴가 끝났어요.',
};

const LeaveDialog: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const [busy, setBusy] = useState(false);
  const [step, setStep] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !busy) onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [busy, onClose]);

  const leave = async () => {
    if (import.meta.env.VITE_TARGET !== 'web') return;
    setBusy(true);
    setError(null);
    const fb = await import('../lib/firebaseBackend');
    const r = await fb.deleteMyAccount((s) => setStep(s));
    setBusy(false);
    if (r.ok === true) setDone(true);
    else setError(r.message);
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/45 p-4" role="dialog" aria-modal="true" aria-labelledby="leave-title">
      <div className="w-full max-w-sm rounded-3xl bg-[#FCFAF6] dark:bg-[#1A1816] border border-[#E8E2D5] dark:border-[#2C2824] p-5 font-serif-kr shadow-2xl">
        <div className="flex items-start justify-between mb-3">
          <h2 id="leave-title" className="text-base font-bold font-batang text-[#2C2723] dark:text-[#E6E1DA]">탈퇴</h2>
          {!busy && (
            <button onClick={onClose} aria-label="닫기" className="p-1.5 rounded-lg text-[#6E665A] dark:text-[#A89F91] hover:bg-[#F3EFE6] dark:hover:bg-[#25221F]">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
        {done ? (
          <p className="text-sm text-[#2C2723] dark:text-[#E6E1DA] leading-relaxed">
            탈퇴가 끝났어요. 기록과 로그인 계정을 모두 지웠어요. 구글 계정 설정의 &quot;타사 앱 및 서비스&quot;에서 이 앱 연결도 해제할 수 있어요.
          </p>
        ) : (
          <>
            <ul className="text-xs text-[#5C5549] dark:text-[#C5BEB3] leading-relaxed list-disc pl-4 space-y-1 mb-4">
              <li>모든 습관과 기록, 로그인 계정이 지워지고 되돌릴 수 없어요.</li>
              <li>내 구글 드라이브에 내보낸 시트는 지워지지 않아요.</li>
              <li>필요하면 먼저 기록표의 &quot;내보내기&quot;로 기록을 보관해 두세요.</li>
              <li>본인 확인을 위해 구글 로그인 창이 한 번 더 떠요.</li>
            </ul>
            {step && busy && <p className="text-xs text-[#2C2723] dark:text-[#E6E1DA] mb-2" role="status">{STEP_LABEL[step]}</p>}
            {error && <p className="text-xs text-[#C23B22] mb-2" role="alert">{error}</p>}
            <div className="flex gap-2">
              <button onClick={onClose} disabled={busy} className="flex-1 py-2.5 rounded-xl text-sm font-bold border border-[#E2DBD0] dark:border-[#38332C] text-[#5C5549] dark:text-[#C5BEB3] disabled:opacity-50">
                취소
              </button>
              <button onClick={leave} disabled={busy} className="flex-[2] py-2.5 rounded-xl text-sm font-bold bg-[#C23B22] hover:bg-[#A82E18] text-white disabled:opacity-60 flex items-center justify-center gap-2">
                {busy && <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />}
                탈퇴하기
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
