import { useState } from 'react';
import { Modal } from '../ui/Modal';
import { Icon } from '../ui/Icon';
import type { Block, Category } from '../../data/types';
import { CATEGORIES, CATEGORY_META } from '../../data/selectors';
import { deleteBlock, saveBlock } from '../../data/actions';
import { uid } from '../../data/store';
import { hhmm, parseHHMM } from '../../lib/date';
import { navigate } from '../../lib/router';

export function BlockEditor({ block, isNew, onClose }: { block: Block; isNew: boolean; onClose: () => void }) {
  const [b, setB] = useState<Block>(block);
  const [sub, setSub] = useState('');
  const [error, setError] = useState('');
  const set = <K extends keyof Block>(k: K, v: Block[K]) => setB((x) => ({ ...x, [k]: v }));

  const save = () => {
    if (!b.title.trim()) return setError('Назвіть блок');
    if (b.end <= b.start) return setError('Кінець має бути пізніше за початок');
    saveBlock({ ...b, title: b.title.trim() });
    onClose();
  };

  const addSub = () => {
    const t = sub.trim();
    if (!t) return;
    set('subtasks', [...b.subtasks, { id: uid(), title: t, done: false }]);
    setSub('');
  };

  return (
    <Modal title={isNew ? 'Новий блок' : 'Блок'} onClose={onClose}>
      <form onSubmit={(e) => { e.preventDefault(); save(); }}>
        <label className="field">
          <span>Назва</span>
          <input className="input" value={b.title} onChange={(e) => set('title', e.target.value)} placeholder="Напр. Глибока робота: звіт" />
        </label>
        <div className="row2">
          <label className="field">
            <span>Початок</span>
            <input className="input" type="time" step={300} value={hhmm(b.start)} onChange={(e) => e.target.value && set('start', parseHHMM(e.target.value))} />
          </label>
          <label className="field">
            <span>Кінець</span>
            <input className="input" type="time" step={300} value={hhmm(Math.min(b.end, 23 * 60 + 59))} onChange={(e) => e.target.value && set('end', parseHHMM(e.target.value))} />
          </label>
        </div>
        <label className="field">
          <span>Дата</span>
          <input className="input" type="date" value={b.date} onChange={(e) => e.target.value && set('date', e.target.value)} />
        </label>
        <div className="field">
          <span>Категорія</span>
          <div className="chips" role="radiogroup" aria-label="Категорія">
            {CATEGORIES.map((c: Category) => (
              <button type="button" key={c} className="chip" role="radio" aria-checked={b.category === c} aria-pressed={b.category === c} onClick={() => set('category', c)}>
                <i className="sw" style={{ background: CATEGORY_META[c].color }} />
                {CATEGORY_META[c].label}
              </button>
            ))}
          </div>
        </div>
        <div className="field">
          <span>Підзадачі</span>
          {b.subtasks.map((st) => (
            <div key={st.id} className="top3-row" style={{ fontWeight: 700 }}>
              <button type="button" className={`chk${st.done ? ' on' : ''}`} aria-label={st.done ? 'Зняти позначку' : 'Позначити'}
                onClick={() => set('subtasks', b.subtasks.map((x) => (x.id === st.id ? { ...x, done: !x.done } : x)))}>
                {st.done && <Icon name="check" size={14} stroke={4} />}
              </button>
              <span style={{ flex: 1, textDecoration: st.done ? 'line-through' : undefined, color: st.done ? 'var(--c-muted-3)' : undefined }}>{st.title}</span>
              <button type="button" className="icon-btn" style={{ width: 36, height: 36 }} aria-label="Видалити підзадачу"
                onClick={() => set('subtasks', b.subtasks.filter((x) => x.id !== st.id))}>
                <Icon name="close" size={14} stroke={2.6} />
              </button>
            </div>
          ))}
          <div style={{ display: 'flex', gap: 8 }}>
            <input className="input" value={sub} placeholder="+ підзадача" onChange={(e) => setSub(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addSub(); } }} />
            <button type="button" className="pill pill-dark" onClick={addSub} aria-label="Додати підзадачу"><Icon name="plus" size={18} stroke={2.8} /></button>
          </div>
        </div>
        <label className="top3-row" style={{ margin: '4px 0 18px', fontWeight: 700 }}>
          <button type="button" className={`chk${b.done ? ' on' : ''}`} onClick={() => set('done', !b.done)} aria-label="Готово">
            {b.done && <Icon name="check" size={14} stroke={4} />}
          </button>
          Готово
        </label>
        {error && <p role="alert" style={{ color: '#FF8A8A', fontWeight: 700, margin: '0 0 12px' }}>{error}</p>}
        <div className="modal-actions">
          <button type="submit" className="pill pill-lime grow">{isNew ? 'Додати блок' : 'Зберегти'}</button>
          {!isNew && (
            <button type="button" className="pill pill-dark" onClick={() => { saveBlock(b); onClose(); navigate('focus', { block: b.id }); }}>
              <Icon name="target" size={18} />Фокус
            </button>
          )}
          {!isNew && (
            <button type="button" className="pill danger" onClick={() => { deleteBlock(b.id); onClose(); }} aria-label="Видалити блок">
              <Icon name="trash" size={18} />
            </button>
          )}
        </div>
      </form>
    </Modal>
  );
}
