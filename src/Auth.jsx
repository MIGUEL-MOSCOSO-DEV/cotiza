import React, { useState } from 'react';
import { ArrowRight, Check, FileCheck2, Layers3, Link2 } from 'lucide-react';
import { api } from './api.js';
import { Brand, Button, Field, ErrorNotice, useTask } from './components.jsx';

export default function Auth({ onLogin }) {
  const [register, setRegister] = useState(false);
  const { busy, error, perform } = useTask();
  function submit(event) {
    event.preventDefault();
    const body = Object.fromEntries(new FormData(event.currentTarget));
    perform(async () => {
      const { user } = await api('/auth/' + (register ? 'register' : 'login'), {
        method: 'POST',
        body,
      });
      onLogin(user);
    });
  }
  return (
    <main className="auth-layout">
      <section className="auth-story">
        <Brand light />
        <div className="auth-copy">
          <span className="eyebrow">MENOS PAPELEO. MÁS PROYECTOS.</span>
          <h1>
            Tu trabajo merece
            <br />
            una buena
            <br />
            <em>propuesta.</em>
          </h1>
          <p>
            Del primer presupuesto al siguiente sí.
            <br />
            Todo lo que necesitas para cotizar con claridad.
          </p>
          <div className="auth-benefits">
            <span>
              <Layers3 size={18} /> Organiza tus clientes
            </span>
            <span>
              <Link2 size={18} /> Comparte con un enlace
            </span>
            <span>
              <FileCheck2 size={18} /> Recibe una respuesta
            </span>
          </div>
        </div>
        <div className="auth-foot">
          <span className="small-symbol">✦</span> Tu negocio. Tus datos. A tu manera.
        </div>
      </section>
      <section className="auth-panel">
        <div className="mobile-brand">
          <Brand />
        </div>
        <div className="auth-form-wrap">
          <span className="eyebrow purple">TU PRÓXIMO PROYECTO EMPIEZA AQUÍ</span>
          <h2>{register ? 'Haz espacio para crecer.' : 'Qué bueno verte.'}</h2>
          <p>
            {register
              ? 'Crea tu cuenta y prepara tu primera cotización.'
              : 'Entra a tu espacio y continúa donde lo dejaste.'}
          </p>
          <form onSubmit={submit} className="stack">
            <ErrorNotice message={error} />
            {register && (
              <Field
                label="Tu nombre"
                name="name"
                autoComplete="name"
                required
                minLength={2}
                maxLength={100}
              />
            )}
            <Field
              label="Correo electrónico"
              name="email"
              type="email"
              autoComplete="email"
              required
              maxLength={254}
            />
            <Field
              label="Contraseña"
              name="password"
              type="password"
              autoComplete={register ? 'new-password' : 'current-password'}
              required
              minLength={10}
              maxLength={128}
              hint={register ? 'Usa al menos 10 caracteres.' : undefined}
            />
            <Button busy={busy} type="submit">
              {register ? 'Crear mi cuenta' : 'Entrar a Cotiza'}
              <ArrowRight size={18} />
            </Button>
          </form>
          <p className="auth-switch">
            {register ? '¿Ya tienes una cuenta?' : '¿Primera vez por aquí?'}{' '}
            <button type="button" onClick={() => setRegister(!register)}>
              {register ? 'Inicia sesión' : 'Crea tu cuenta'}
            </button>
          </p>
          <div className="auth-note">
            <Check size={15} /> Sin servicios externos. Sin datos de relleno.
          </div>
        </div>
      </section>
    </main>
  );
}
