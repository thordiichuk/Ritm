import { useEffect, useRef, type CSSProperties } from 'react';
import { Icon } from '../components/ui/Icon';
import { BotanicalBlossom, BotanicalSpray, BotanicalSprig } from '../components/flora/Botanical';
import { href } from '../lib/router';
import { markWelcomed } from '../lib/welcome';
import { setTheme, useTheme } from '../lib/theme';
import { useAccount } from '../sync/account';

type IconName = Parameters<typeof Icon>[0]['name'];

const FEATURES: Array<{ icon: IconName; title: string; text: string; cat: string }> = [
  { icon: 'clock', title: 'День блоками', text: 'Розклад по годинах: що зараз, що далі й де є вільний час. Невиконане — в один дотик на завтра.', cat: 'work' },
  { icon: 'flame', title: 'Звички й серії', text: 'Відмічайте щоденні звички й дивіться, скільки днів поспіль тримаєтесь.', cat: 'health' },
  { icon: 'target', title: 'Фокус-таймер', text: 'Робота сесіями з перервами, прив’язана до блоку розкладу. Сповіщення, коли час минув.', cat: 'study' },
  { icon: 'note', title: 'Вечірній підсумок', text: 'Настрій, одна перемога дня й що робити з незробленим — за хвилину.', cat: 'personal' },
  { icon: 'stats', title: 'Статистика', text: 'Скільки часу пішло на роботу, навчання й себе, коли у вас пік енергії і які звички допомагають.', cat: 'errands' },
  { icon: 'calendar', title: 'На всіх пристроях', text: 'Увійдіть — і записи однакові на телефоні й комп’ютері. Працює навіть без інтернету.', cat: 'work' },
];

const STEPS: Array<[string, string]> = [
  ['Відкрийте сайт', ' на телефоні чи комп’ютері — встановлювати нічого не треба.'],
  ['Спробуйте на демо-даних', ' або почніть з чистого аркуша в налаштуваннях.'],
  ['Створіть акаунт', ', коли захочете бачити записи на всіх пристроях.'],
];

/**
 * Плавна поява блоків під час прокручування: елементи з класом .reveal отримують .in,
 * щойно потрапляють на екран. Самі анімації — у CSS і лише для тих, хто не вимкнув рух у системі.
 */
function useReveal() {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const els = ref.current?.querySelectorAll<HTMLElement>('.reveal') ?? [];
    if (!('IntersectionObserver' in window)) {
      els.forEach((el) => el.classList.add('in'));
      return;
    }
    const io = new IntersectionObserver(
      (entries) => entries.forEach((e) => {
        if (e.isIntersecting) {
          e.target.classList.add('in');
          io.unobserve(e.target);
        }
      }),
      { rootMargin: '0px 0px -8% 0px', threshold: 0.12 },
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);
  return ref;
}

/** Перемикач теми: повзунок «місяць — квітка» */
function ThemeSwitch() {
  const theme = useTheme();
  const bloom = theme === 'bloom';
  return (
    <button className="theme-switch" role="switch" aria-checked={bloom} aria-label="Квіткова тема"
      title={bloom ? 'Увімкнути темну тему' : 'Увімкнути квіткову тему'} onClick={() => setTheme(bloom ? 'dark' : 'bloom')}>
      <span className="ts-track" aria-hidden="true">
        <span className="ts-knob" />
        <span className="ts-ic ts-moon"><Icon name="moon" size={16} stroke={2.2} /></span>
        <span className="ts-ic ts-flower"><Icon name="flower" size={17} stroke={1.9} /></span>
      </span>
      <span className="ts-label">{bloom ? 'Квіткова' : 'Темна'}</span>
    </button>
  );
}

/** Головна сторінка-представлення «Ритму» */
export function WelcomeScreen() {
  const theme = useTheme();
  const acc = useAccount();
  const root = useReveal();
  const shot = (name: string) => `./welcome/${name}-${theme === 'bloom' ? 'bloom' : 'dark'}.jpg`;

  return (
    <div className="welcome" ref={root}>
      <header className="wl-top">
        <a className="wl-logo" href={href('welcome')} aria-label="Ритм">
          <span className="rail-logo wl-mark" aria-hidden="true"><i /><BotanicalBlossom className="flora-logo" /></span>
          <span className="disp">Ритм</span>
        </a>
        <div className="wl-top-actions">
          <ThemeSwitch />
          {acc.user
            ? <a className="pill pill-lime" href={href('today')}>Відкрити Ритм</a>
            : <a className="pill pill-dark" href={href('login')}>Увійти</a>}
        </div>
      </header>

      <section className="tile wl-hero flora-host">
        <BotanicalSpray className="flora-head" />
        <div className="wl-hero-text">
          <p className="k">Планувальник дня</p>
          <h1 className="disp">Живіть у своєму ритмі</h1>
          <p className="wl-lead">
            Розклад, звички, фокус і вечірній підсумок — в одному спокійному місці.
            Плануйте день блоками, тримайте серії й бачте, куди йде ваш час.
          </p>
          <div className="wl-cta">
            <a className="pill pill-lime wl-big" href={href('today')} onClick={markWelcomed}>
              Спробувати без реєстрації <Icon name="chev-right" size={18} stroke={2.6} />
            </a>
            {!acc.user && <a className="pill pill-dark wl-big" href={href('login', { m: 'up' })}>Створити акаунт</a>}
          </div>
          <p className="wl-small">Безкоштовно. Без реєстрації все зберігається лише у вашому браузері.</p>
        </div>
        <div className="wl-shots" aria-hidden="true">
          <img className="wl-shot wl-shot-back" src={shot('habits')} alt="" width={390} height={844} />
          <img className="wl-shot wl-shot-front" src={shot('today')} alt="" width={390} height={844} />
        </div>
      </section>

      <section aria-labelledby="wl-f">
        <h2 id="wl-f" className="wl-h2 disp reveal">Що вміє «Ритм»</h2>
        <div className="wl-grid">
          {FEATURES.map((f, i) => (
            <article key={f.title} className="tile wl-feat reveal" style={{ '--d': `${(i % 3) * 90}ms` } as CSSProperties}>
              <span className="wl-ic" style={{ background: `var(--cat-${f.cat}-bg)`, color: `var(--cat-${f.cat}-fg)` }}>
                <Icon name={f.icon} size={22} />
              </span>
              <h3>{f.title}</h3>
              <p>{f.text}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="wl-how-sec" aria-labelledby="wl-how">
        <h2 id="wl-how" className="wl-h2 disp reveal">Як почати</h2>
        <ol className="wl-how">
          {STEPS.map(([title, rest], i) => (
            <li key={title} className="tile wl-step reveal" style={{ '--d': `${i * 110}ms` } as CSSProperties}>
              <b className="disp" aria-hidden="true">{i + 1}</b>
              <p><strong>{title}</strong>{rest}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="tile wl-final flora-host reveal">
        <BotanicalSprig className="flora-sprig-corner" />
        <h2 className="disp">Спланувати сьогодні?</h2>
        <a className="pill pill-lime wl-big" href={href('today')} onClick={markWelcomed}>
          Відкрити «Ритм» <Icon name="chev-right" size={18} stroke={2.6} />
        </a>
      </section>

      <footer className="wl-foot">
        <span>«Ритм» · дані належать вам: копія у файл — у налаштуваннях</span>
        <span>
          <a href={href('login')}>Вхід</a> · <a href={href('notes', { s: 'settings' })} onClick={markWelcomed}>Налаштування</a>
        </span>
      </footer>
    </div>
  );
}
