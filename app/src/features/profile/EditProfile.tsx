import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../api/client';
import { useI18n } from '../../i18n';
import { useStore } from '../../state/store';
import { useToast } from '../../ui/components';
import { AppBar, Button, Field, Input, Select, Textarea } from '../../ui/components';

export default function EditProfile() {
  const { t } = useI18n();
  const toast = useToast();
  const navigate = useNavigate();
  const { user, refreshUser } = useStore();
  const [form, setForm] = useState({
    name: user?.name ?? '',
    bio: '',
    city: '',
    country: '',
  });
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      await api.put('/users/me', {
        name: form.name,
        bio: form.bio || undefined,
        city: form.city || undefined,
        country: form.country || undefined,
      });
      await refreshUser();
      toast(t('saved'), 'success');
      navigate('/profile');
    } catch {
      toast(t('err_generic'), 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="page page-no-nav">
      <AppBar onBack={() => navigate(-1)} title={t('edit_profile')} />
      <form onSubmit={submit} className="mt-4" noValidate>
        <Field label={t('name')}>
          <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        </Field>
        <Field label={`${t('bio')} (${t('optional')})`}>
          <Textarea value={form.bio} onChange={(e) => setForm({ ...form, bio: e.target.value })} maxLength={280} />
        </Field>
        <div className="grid-2">
          <Field label={`${t('country')} (${t('optional')})`}>
            <Input value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })} />
          </Field>
          <Field label={`${t('city')} (${t('optional')})`}>
            <Input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
          </Field>
        </div>
        <Field label={`${t('email')}`}>
          <Input value={user?.email ?? ''} disabled />
        </Field>
        <Button type="submit" block size="lg" loading={busy}>
          {t('save')}
        </Button>
      </form>
    </div>
  );
}
