import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../api/client';
import { useI18n } from '../../i18n';
import { AppBar, Badge, Card, EmptyState, ErrorState, ListSkeleton, Modal, Button } from '../../ui/components';
import { TransactionIcon, txTypeLabel } from './Wallet';
import type { TranslationKey } from '../../i18n/en';

type Tx = {
  id: string; type: string; points: number; status: string; description: string; created_at: string;
};

export default function Transactions() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const [txs, setTxs] = useState<Tx[] | null>(null);
  const [error, setError] = useState(false);

  const load = useCallback(async () => {
    setError(false);
    try {
      const res = await api.get<{ transactions: Tx[] }>('/wallet/transactions?limit=100');
      setTxs(res.transactions);
    } catch {
      setError(true);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="page page-no-nav">
      <AppBar onBack={() => navigate(-1)} title={t('transactions')} />
      <div className="mt-3 col" style={{ gap: 'var(--sp-3)' }}>
        {error ? (
          <ErrorState onRetry={load} />
        ) : txs === null ? (
          <ListSkeleton rows={6} />
        ) : txs.length === 0 ? (
          <EmptyState icon={<></>} title={t('no_transactions')} desc={t('no_transactions_desc')} />
        ) : (
          txs.map((tx) => (
            <Card key={tx.id} className="row" style={{ gap: 'var(--sp-3)' }}>
              <TransactionIcon type={tx.type} />
              <div className="grow col" style={{ gap: 2, minWidth: 0 }}>
                <span className="t-card-title" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {tx.description}
                </span>
                <span className="t-caption text-muted">
                  {txTypeLabel(tx.type, t as never)} · {new Date(tx.created_at).toLocaleDateString()} {new Date(tx.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
              <div className="col" style={{ alignItems: 'flex-end', gap: 4 }}>
                <span className={`t-card-title tnum`} style={{ color: tx.points > 0 ? 'var(--primary)' : 'var(--error)', fontWeight: 700 }}>
                  {tx.points > 0 ? `+${tx.points}` : tx.points}
                </span>
                {tx.status === 'pending' && <Badge variant="gold">{t('status_pending')}</Badge>}
              </div>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
