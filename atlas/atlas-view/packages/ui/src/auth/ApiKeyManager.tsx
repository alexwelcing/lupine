import { useCallback, useEffect, useState } from 'react';
import { LupiButton, LupiNotice, lupiUserColors } from '../user/LupiUserPrimitives';
import {
  createApiKey,
  exchangeEndpoint,
  listApiKeys,
  revokeApiKey,
  type ApiKeySummary,
  type CreatedApiKey,
} from './apiKeys';

function formatDay(ms: number | null): string {
  return ms ? new Date(ms).toISOString().slice(0, 10) : '—';
}

const inputStyle: React.CSSProperties = {
  background: 'rgba(255,255,255,0.05)',
  border: `1px solid ${lupiUserColors.line}`,
  borderRadius: 6,
  color: 'inherit',
  padding: '7px 9px',
  fontSize: 12,
  minWidth: 0,
};

const codeStyle: React.CSSProperties = {
  wordBreak: 'break-all',
  fontFamily: 'monospace',
  fontSize: 11,
  background: 'rgba(0,0,0,0.38)',
  padding: '6px 8px',
  borderRadius: 6,
  display: 'block',
};

export function ApiKeyManager({ uid }: { uid: string }) {
  const [keys, setKeys] = useState<ApiKeySummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [created, setCreated] = useState<CreatedApiKey | null>(null);
  const [copied, setCopied] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      setKeys(await listApiKeys(uid));
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [uid]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const onCreate = async () => {
    setBusy(true);
    setError(null);
    try {
      setCreated(await createApiKey(name.trim() || 'Agent key'));
      setName('');
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  const onRevoke = async (keyId: string) => {
    setBusy(true);
    setError(null);
    try {
      await revokeApiKey(keyId);
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  const copyKey = async () => {
    if (!created) return;
    await navigator.clipboard.writeText(created.rawKey);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1400);
  };

  return (
    <div style={{ display: 'grid', gap: 8, borderTop: `1px solid ${lupiUserColors.line}`, paddingTop: 10 }}>
      <div style={{ fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', opacity: 0.55 }}>
        API keys — let an agent sign in without OAuth
      </div>

      {error && <LupiNotice tone="pink">{error}</LupiNotice>}

      {created ? (
        <LupiNotice tone="green">
          <div style={{ display: 'grid', gap: 6 }}>
            <strong>Copy this key now — it will not be shown again.</strong>
            <code style={codeStyle}>{created.rawKey}</code>
            <div style={{ fontSize: 11, opacity: 0.8 }}>
              Agent exchange endpoint:
              <code style={{ ...codeStyle, marginTop: 4 }}>{exchangeEndpoint()}</code>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              <LupiButton tone="primary" onClick={copyKey}>
                {copied ? 'Copied' : 'Copy key'}
              </LupiButton>
              <LupiButton tone="quiet" onClick={() => setCreated(null)}>
                Done
              </LupiButton>
            </div>
          </div>
        </LupiNotice>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 8 }}>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !busy) void onCreate();
            }}
            placeholder="Key name (e.g. claude-code)"
            maxLength={80}
            style={inputStyle}
            aria-label="API key name"
          />
          <LupiButton tone="primary" onClick={() => void onCreate()} disabled={busy}>
            {busy ? '…' : 'Create'}
          </LupiButton>
        </div>
      )}

      {loading ? (
        <div style={{ fontSize: 12, opacity: 0.6 }}>Loading keys…</div>
      ) : keys.length === 0 ? (
        <div style={{ fontSize: 12, opacity: 0.6 }}>No keys yet.</div>
      ) : (
        <div style={{ display: 'grid' }}>
          {keys.map((k) => (
            <div
              key={k.keyId}
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr auto',
                alignItems: 'center',
                gap: 8,
                padding: '7px 0',
                borderTop: `1px solid ${lupiUserColors.line}`,
              }}
            >
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 12, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {k.name}
                </div>
                <div style={{ fontSize: 11, opacity: 0.55, fontFamily: 'monospace' }}>
                  {k.prefix}… · created {formatDay(k.createdAt)} · used {formatDay(k.lastUsedAt)}
                </div>
              </div>
              <LupiButton tone="danger" onClick={() => void onRevoke(k.keyId)} disabled={busy}>
                Revoke
              </LupiButton>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
