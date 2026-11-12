import { useEffect } from 'react';
import { SignInForm } from '../components/account/Account';
import { BotanicalBlossom, BotanicalSpray } from '../components/flora/Botanical';
import { Icon } from '../components/ui/Icon';
import { href, navigate, useLocation } from '../lib/router';
import { useAccount } from '../sync/account';

/** Сторінка входу й реєстрації */
export function LoginScreen() {
  const { params } = useLocation();
  const acc = useAccount();
  const mode = params.get('m') === 'up' ? 'up' : 'in';

  // щойно людина увійшла — у застосунок
  useEffect(() => {
    if (acc.user) navigate('today');
  }, [acc.user]);

  return (
    <div className="login">
      <a className="login-back" href={href('welcome')}>
        <Icon name="chev-left" size={18} stroke={2.6} />Про «Ритм»
      </a>
      <main className="tile login-card flora-host">
        <BotanicalSpray className="flora-head-phone" />
        <span className="rail-logo wl-mark" aria-hidden="true"><i /><BotanicalBlossom className="flora-logo" /></span>
        <h1 className="disp">{mode === 'up' ? 'Новий акаунт' : 'Вхід'}</h1>
        <p className="acc-muted">
          {mode === 'up'
            ? 'Акаунт потрібен, щоб записи були однакові на всіх ваших пристроях.'
            : 'Увійдіть, щоб побачити свої записи з інших пристроїв.'}
        </p>
        {!acc.configured ? (
          <p className="acc-note">Синхронізацію на цьому сайті не налаштовано.</p>
        ) : (
          <SignInForm mode={mode} onModeChange={(m) => location.replace(href('login', m === 'up' ? { m: 'up' } : undefined))} />
        )}
      </main>
      <p className="login-skip">
        <a href={href('today')}>Продовжити без акаунта</a> — дані зберігатимуться лише в цьому браузері.
      </p>
    </div>
  );
}
