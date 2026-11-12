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

/** Головна сторінка-представлення «Ритму» */
export function WelcomeScreen() {
  const theme = useTheme();
  const acc = useAccount();
  const shot = (name: string) => `./welcome/${name}-${theme === 'bloom' ? 'bloom' : 'dark'}.jpg`;

  return (
    <div className="welcome">
      <header className="wl-top">
        <a className="wl-logo" href={href('welcome')} aria-label="Ритм">
          <span className="rail-logo wl-mark" aria-hidden="true"><i /><BotanicalBlossom className="flora-logo" /></span>
          <span className="disp">Ритм</span>
        </a>
        <div className="wl-top-actions">
          <button className="pill pill-dark" onClick={() => setTheme(theme === 'bloom' ? 'dark' : 'bloom')}
            aria-label={theme === 'bloom' ? 'Увімкнути темну тему' : 'Увімкнути квіткову тему'}>
            {theme === 'bloom' ? 'Темна тема' : 'Квіткова тема'}
          </button>
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
        <h2 id="wl-f" className="k wl-sec-k">Що вміє «Ритм»</h2>
        <div className="wl-grid">
          {FEATURES.map((f) => (
            <article key={f.title} className="tile wl-feat">
              <span className="wl-ic" style={{ background: `var(--cat-${f.cat}-bg)`, color: `var(--cat-${f.cat}-fg)` }}>
                <Icon name={f.icon} size={22} />
              </span>
              <h3>{f.title}</h3>
              <p>{f.text}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="wl-how">
        <div className="tile wl-step"><b className="disp">1</b><p><strong>Відкрийте сайт</strong> на телефоні чи комп’ютері — встановлювати нічого не треба.</p></div>
        <div className="tile wl-step"><b className="disp">2</b><p><strong>Спробуйте на демо-даних</strong> або почніть з чистого аркуша в налаштуваннях.</p></div>
        <div className="tile wl-step"><b className="disp">3</b><p><strong>Створіть акаунт</strong>, коли захочете бачити записи на всіх пристроях.</p></div>
      </section>

      <section className="tile wl-final flora-host">
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
