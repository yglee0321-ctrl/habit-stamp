// 브라우저 confirm()이 막혀 있어서 직접 만든 확인 창
export function askConfirm(message: string, okLabel = '확인'): Promise<boolean> {
  return new Promise((resolve) => {
    const dark = document.documentElement.classList.contains('dark');
    const wrap = document.createElement('div');
    wrap.style.cssText = 'position:fixed;inset:0;z-index:9999;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,.45);padding:16px';
    const box = document.createElement('div');
    box.style.cssText = `max-width:340px;width:100%;border-radius:20px;padding:20px;font-family:"Noto Serif KR",serif;background:${dark ? '#1A1816' : '#FCFAF6'};color:${dark ? '#E6E1DA' : '#2C2723'};border:1px solid ${dark ? '#2C2824' : '#E8E2D5'};box-shadow:0 10px 30px rgba(0,0,0,.25)`;
    const p = document.createElement('p');
    p.textContent = message;
    p.style.cssText = 'font-size:14px;line-height:1.6;margin:0 0 16px;white-space:pre-line';
    const row = document.createElement('div');
    row.style.cssText = 'display:flex;gap:8px;justify-content:flex-end';
    const mk = (label: string, primary: boolean, val: boolean) => {
      const b = document.createElement('button');
      b.textContent = label;
      b.style.cssText = `padding:8px 16px;border-radius:12px;font-size:13px;font-weight:700;cursor:pointer;border:1px solid ${primary ? '#C23B22' : dark ? '#38332C' : '#E2DBD0'};background:${primary ? '#C23B22' : 'transparent'};color:${primary ? '#fff' : 'inherit'}`;
      b.onclick = () => close(val);
      return b;
    };
    row.append(mk('취소', false, false), mk(okLabel, true, true));
    box.append(p, row);
    wrap.append(box);
    const prev = document.activeElement as HTMLElement | null;
    const close = (v: boolean) => { wrap.remove(); document.removeEventListener('keydown', onKey); prev?.focus?.(); resolve(v); };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') close(false); };
    document.addEventListener('keydown', onKey);
    wrap.setAttribute('role', 'alertdialog');
    wrap.setAttribute('aria-modal', 'true');
    wrap.onclick = (e) => { if (e.target === wrap) close(false); };
    document.body.append(wrap);
    (row.lastElementChild as HTMLElement | null)?.focus();
  });
}
