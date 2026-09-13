import { useEffect, useState } from "react";
import type { FormEvent } from "react";

import { CampaignSigil } from "@components/ui";
import { ArrowsClockwise, Check, Gear, User, WifiSlash } from "@assets/icons";
import { Button, InlineStatus, Input, SectionCard } from "@components/ui";
import type { AuthError, AuthSession } from "@application/ports/auth-port";
import { asAccountId } from "@domain/contracts/ids";
import type { AccountCampaign, AccountPanelProps, AccountSessionState } from "./types";
import styles from "./account.module.css";

type FormMode = "sign-in" | "register";

function authErrorMessage(error: AuthError): string {
  if (error.code === "auth-unavailable") {
    return "A autenticação está indisponível no momento. Continue no modo local ou tente novamente mais tarde.";
  }
  switch (error.reason) {
    case "email-already-in-use":
      return "Este email já está cadastrado. Entre na conta ou use outro email.";
    case "invalid-email":
      return "Confira o formato do email e tente novamente.";
    case "wrong-password":
    case "invalid-credential":
      return "Email ou senha não conferem. Confira os dados e tente novamente.";
    case "weak-password":
      return "Escolha uma senha com pelo menos 6 caracteres.";
    case "too-many-requests":
      return "Muitas tentativas. Aguarde um pouco antes de tentar novamente.";
    default:
      return error.message || "Não foi possível concluir a autenticação.";
  }
}

function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function syncCopy(state: AccountPanelProps["syncState"]): { readonly label: string; readonly description: string; readonly tone: "info" | "warning" | "success" } {
  switch (state) {
    case "offline": return { label: "Offline", description: "Sem conexão. Alterações locais serão enviadas quando a rede voltar.", tone: "warning" };
    case "pending": return { label: "Sincronização pendente", description: "Há alterações locais aguardando confirmação.", tone: "info" };
    case "synced": return { label: "Sincronizado", description: "Perfil e vínculos confirmados pela conta.", tone: "success" };
    default: return { label: "Somente neste dispositivo", description: "Este perfil permanece local até uma conta ser vinculada.", tone: "info" };
  }
}

function roleLabel(role: AccountCampaign["role"]): string {
  return role === "master" ? "Mestre" : role === "player" ? "Jogador" : "Papel não informado";
}

function initials(displayName: string, email: string | null | undefined): string {
  const source = displayName.trim() || email?.split("@")[0] || "Aventureiro";
  return source.split(/[\s._-]+/).filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase() ?? "").join("") || "A";
}

export function AccountPanel({ auth, availability, onBackToLocal, membership, syncState = "local", campaigns = [], onOpenCollaboration, onOpenSession, onOpenSettings }: AccountPanelProps) {
  const localActor = membership?.localActor?.();
  const [sessionState, setSessionState] = useState<AccountSessionState>(() => {
    if (!auth) return { status: "unavailable", session: null };
    return { status: "loading", session: auth.currentSession() };
  });
  const [mode, setMode] = useState<FormMode>("sign-in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [formError, setFormError] = useState<string>();
  const [busy, setBusy] = useState(false);
  const [displayName, setDisplayName] = useState("");
  const [profileMessage, setProfileMessage] = useState<string>();

  useEffect(() => {
    if (!auth) {
      setSessionState({ status: "unavailable", session: null });
      return;
    }
    setSessionState({ status: "loading", session: auth.currentSession() });
    try {
      return auth.observeSession((session) => {
        setSessionState(session ? { status: "signed-in", session } : { status: "signed-out", session: null });
      });
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "Não foi possível observar a sessão.");
      setSessionState({ status: "signed-out", session: null });
      return undefined;
    }
  }, [auth]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(undefined);
    if (!isValidEmail(email.trim())) {
      setFormError("Informe um email válido.");
      return;
    }
    if (!password) {
      setFormError("Informe sua senha.");
      return;
    }
    if (mode === "register" && password.length < 6) {
      setFormError("Escolha uma senha com pelo menos 6 caracteres.");
      return;
    }
    if (!auth) {
      setFormError("A autenticação não está configurada. O modo local continua disponível.");
      return;
    }
    setBusy(true);
    const result = mode === "register"
      ? await auth.registerWithEmailAndPassword(email.trim(), password)
      : await auth.signInWithEmailAndPassword(email.trim(), password);
    setBusy(false);
    setPassword("");
    if (!result.ok) {
      setFormError(authErrorMessage(result.error));
      return;
    }
    setSessionState({ status: "signed-in", session: result.value });
  }

  async function signOut() {
    if (!auth) return;
    setBusy(true);
    setFormError(undefined);
    const result = await auth.signOut();
    setBusy(false);
    if (!result.ok) {
      setFormError(authErrorMessage(result.error));
      return;
    }
    setSessionState({ status: "signed-out", session: null });
  }

  // A positive config diagnostic without an adapter means Firebase failed to
  // initialize; never expose a form that cannot submit in that state.
  const configured = Boolean(auth) && (availability?.available ?? true);
  const missing = availability?.missingKeys?.join(", ");
  const session: AuthSession | null = sessionState.status === "signed-in" ? sessionState.session : null;

  useEffect(() => {
    if (!session || !membership) return;
    void membership.ensureAccount({ actorId: asAccountId(session.uid), email: session.email }).then((result) => {
      if (result.ok) setDisplayName(result.value.displayName ?? "");
    });
  }, [membership, session]);

  async function saveProfile() {
    if (!session || !membership) return;
    setBusy(true);
    const result = await membership.ensureAccount({ actorId: asAccountId(session.uid), email: session.email, displayName: displayName.trim() });
    setBusy(false);
    setProfileMessage(result.ok ? "Perfil salvo neste dispositivo e aguardando sincronização." : result.error.message);
  }

  const sync = syncCopy(syncState);
  const isLocal = !session && Boolean(localActor);
  const profileName = displayName.trim() || localActor?.displayName || session?.email?.split("@")[0] || "Aventureiro";
  const authStage = sessionState.status === "unavailable" || !configured ? "Modo local" : sessionState.status === "loading" ? "Verificando sessão" : session ? "Sessão autenticada" : "Sessão encerrada";

  return (
    <section className={styles.panel} aria-labelledby="account-title">
      <header className={styles.hero}>
        <div>
          <p className={styles.eyebrow}>IDENTIDADE DA MESA</p>
          <h1 id="account-title" className={styles.title} tabIndex={-1}>Conta</h1>
          <p className={styles.intro}>Seu perfil, suas mesas e o estado real dos dados locais em um só lugar.</p>
        </div>
        <span className={styles.stage} data-stage={session ? "signed-in" : isLocal ? "local" : "signed-out"}>{authStage}</span>
      </header>

      <section className={styles.profile} aria-labelledby="account-profile-title">
        <div className={styles.avatar} aria-hidden="true">{initials(profileName, session?.email ?? localActor?.email)}</div>
        <div className={styles.profileIdentity}>
          <h2 id="account-profile-title">{profileName}</h2>
          <p>{session?.email ?? localActor?.email ?? "Identidade local"}</p>
          <InlineStatus tone={sync.tone}>
            {sync.label}
          </InlineStatus>
        </div>
        {membership && session ? <Button className={styles.profileEdit} variant="secondary" onClick={() => document.getElementById("account-name")?.focus()}><User size={17} aria-hidden="true" /> Editar perfil</Button> : null}
      </section>

      <p className={styles.syncDescription}>{sync.description}</p>

      {sessionState.status === "unavailable" || !configured ? (
        <SectionCard heading="Modo local" headingLevel={2}>
          <InlineStatus tone="info">Firebase Authentication ainda não está disponível. Você pode criar personagens, campanhas e sessões neste dispositivo sem entrar em uma conta.</InlineStatus>
          {localActor ? <p className={styles.availability}>Identidade local: {localActor.displayName}. Este perfil fica salvo neste dispositivo e não sincroniza sozinho.</p> : null}
          {missing ? <p className={styles.availability}>Configuração pendente: {missing}.</p> : null}
          {onBackToLocal ? <Button className={styles.modeLink} variant="secondary" onClick={onBackToLocal}>Continuar no modo local</Button> : null}
        </SectionCard>
      ) : sessionState.status === "loading" ? (
        <InlineStatus tone="info">Verificando a sessão…</InlineStatus>
      ) : session ? (
        <SectionCard heading="Sessão ativa" headingLevel={2}>
          <div className={styles.session}>
            <p className={styles.sessionEmail}>{session.email ?? "Conta sem email"}</p>
            <p className={styles.sessionMeta}>UID: {session.uid}</p>
            {membership ? <div className={styles.profileForm}>
              <Input id="account-name" label="Nome na mesa" value={displayName} onChange={(event) => setDisplayName(event.target.value)} maxLength={80} />
              <Button variant="secondary" busy={busy} disabled={busy} onClick={() => void saveProfile()}>Salvar perfil</Button>
              {profileMessage ? <InlineStatus tone={profileMessage.includes("salvo") ? "success" : "error"}>{profileMessage}</InlineStatus> : null}
            </div> : null}
            <Button variant="secondary" busy={busy} disabled={busy} onClick={() => void signOut()}>Sair da conta</Button>
          </div>
        </SectionCard>
      ) : (
        <SectionCard heading={mode === "sign-in" ? "Entrar" : "Criar conta"} headingLevel={2}>
          <form className={styles.form} onSubmit={(event) => void submit(event)} noValidate>
            <Input label="Email" type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} required error={formError?.includes("email") ? formError : undefined} />
            <Input label="Senha" type="password" autoComplete={mode === "register" ? "new-password" : "current-password"} value={password} onChange={(event) => setPassword(event.target.value)} required error={formError?.includes("senha") ? formError : undefined} />
            {formError && !formError.includes("email") && !formError.includes("senha") ? <InlineStatus tone="error" assertive>{formError}</InlineStatus> : null}
            <div className={styles.actions}>
              <Button type="submit" busy={busy} disabled={busy}>{mode === "sign-in" ? "Entrar" : "Criar conta"}</Button>
              <Button type="button" variant="ghost" disabled={busy} onClick={() => { setMode(mode === "sign-in" ? "register" : "sign-in"); setFormError(undefined); }}>{mode === "sign-in" ? "Criar uma conta" : "Já tenho uma conta"}</Button>
            </div>
          </form>
        </SectionCard>
      )}
      {campaigns.length > 0 ? <SectionCard heading="Minhas mesas" headingLevel={2}>
        <div className={styles.campaignGrid}>
          {campaigns.map((campaign) => <article className={styles.campaignCard} key={String(campaign.id)}>
            <div className={styles.campaignVisual}>
              {campaign.thumbnailUrl ? <img src={campaign.thumbnailUrl} alt="" loading="lazy" /> : <CampaignSigil aria-hidden="true" />}
            </div>
            <div className={styles.campaignBody}><h3>{campaign.name}</h3><p>{roleLabel(campaign.role)}{typeof campaign.participantCount === "number" ? ` · ${campaign.participantCount} participantes` : ""}</p></div>
            {onOpenSession ? <Button size="sm" variant="secondary" onClick={() => onOpenSession(campaign.id)}>Abrir mesa</Button> : null}
          </article>)}
        </div>
      </SectionCard> : null}
      <SectionCard heading="Mesa compartilhada" headingLevel={2}>
        <div className={styles.collaborationEntry}>
          <CampaignSigil title="Selo da mesa compartilhada" />
          <div><h3>Convide sua companhia</h3><p>Gerencie participantes, convites e fichas vinculadas sem deixar esta conta.</p></div>
          <Button variant="primary" disabled={!onOpenCollaboration} disabledReason={!onOpenCollaboration ? "A rota de colaboração ainda não foi conectada pelo shell." : undefined} onClick={onOpenCollaboration}>Abrir colaboração</Button>
        </div>
      </SectionCard>
      <SectionCard heading="Configurações da conta" headingLevel={2}>
        <div className={styles.settingsList}>
          <div className={styles.settingRow}><Gear size={21} aria-hidden="true" /><div><strong>Preferências</strong><span>Opções da aplicação ficam neste dispositivo.</span></div>{onOpenSettings ? <Button size="sm" variant="ghost" onClick={onOpenSettings}>Abrir</Button> : null}</div>
          <div className={styles.settingRow}><ArrowsClockwise size={21} aria-hidden="true" /><div><strong>Sincronização de dados</strong><span>{sync.description}</span></div></div>
          <details className={styles.credits}><summary>Créditos e licenças</summary><div><p>Ícones funcionais: Phosphor Icons, MIT.</p><p>Ícones de fantasia: Game-icons via <code>react-icons/gi</code>, CC BY 3.0.</p><a href="https://phosphoricons.com/">Phosphor Icons</a><a href="https://game-icons.net/">Game-icons.net</a><a href="https://creativecommons.org/licenses/by/3.0/">Licença CC BY 3.0</a><p>Registro completo: <code>src/assets/icons/ATTRIBUTION.md</code>.</p></div></details>
          {session ? <div className={styles.settingRow}><Check size={21} aria-hidden="true" /><div><strong>Conta autenticada</strong><span>Identidade: {session.uid}</span></div></div> : <div className={styles.settingRow}><WifiSlash size={21} aria-hidden="true" /><div><strong>Modo local</strong><span>Sem sessão remota; nada é apresentado como sincronizado.</span></div></div>}
        </div>
      </SectionCard>
      {formError && (sessionState.status === "unavailable" || !configured) ? <InlineStatus tone="error" assertive>{formError}</InlineStatus> : null}
    </section>
  );
}
