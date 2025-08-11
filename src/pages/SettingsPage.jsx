import React, { useEffect, useState } from 'react';
import { supabase } from '../services/supabase';

function SettingsPage() {
  const [profile, setProfile] = useState(null);
  const [saving, setSaving] = useState(false);
  const [password, setPassword] = useState({ current: '', next: '', confirm: '' });
  const [message, setMessage] = useState('');

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase.from('user_profiles').select('*').eq('id', user.id).single();
      setProfile({
        id: user.id,
        display_name: user.user_metadata?.full_name || '',
        preferred_currency: data?.currency || 'USD',
        theme: data?.theme || 'dark',
        avatar_url: data?.avatar_url || '',
        pay_cycle_start_day: data?.pay_cycle_start_day || 1,
      });
    };
    load();
  }, []);

  const updateProfile = async () => {
    if (!profile) return;
    setSaving(true);
    setMessage('');
    try {
      await supabase.from('user_profiles').update({
        currency: profile.preferred_currency,
        theme: profile.theme,
        avatar_url: profile.avatar_url || null,
        pay_cycle_start_day: Math.min(31, Math.max(1, Number(profile.pay_cycle_start_day) || 1)),
      }).eq('id', profile.id);
      // Also update display name in auth metadata
      await supabase.auth.updateUser({
        data: { full_name: profile.display_name }
      });
      setMessage('Saved');
    } catch (e) {
      setMessage(e.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const changePassword = async () => {
    if (!password.next || password.next !== password.confirm) {
      setMessage('Passwords do not match');
      return;
    }
    setSaving(true);
    setMessage('');
    try {
      const { error } = await supabase.auth.updateUser({ password: password.next });
      if (error) throw error;
      setMessage('Password updated');
      setPassword({ current: '', next: '', confirm: '' });
    } catch (e) {
      setMessage(e.message || 'Failed to update password');
    } finally {
      setSaving(false);
    }
  };

  const cyclePreview = () => {
    if (!profile) return '';
    const start = Number(profile.pay_cycle_start_day) || 1;
    const now = new Date();
    const startDate = new Date(now);
    if (now.getDate() >= start) startDate.setDate(start);
    else startDate.setMonth(now.getMonth() - 1, start);
    const endDate = new Date(startDate);
    endDate.setMonth(startDate.getMonth() + 1);
    endDate.setDate(start - 1);
    const s = startDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    const e = endDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    const y = endDate.getFullYear();
    return `${s} – ${e} ${y}`;
  };

  if (!profile) return <div className="card">Loading…</div>;

  return (
    <div className="space-y-6">
      <div className="card">
        <h2 className="text-2xl font-bold text-white mb-4">Settings</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div>
              <label className="block text-sm text-gray-300 mb-1">Display Name</label>
              <input className="input" value={profile.display_name} onChange={e=>setProfile(p=>({...p, display_name: e.target.value}))} />
            </div>
            <div>
              <label className="block text-sm text-gray-300 mb-1">Currency</label>
              <select className="input" value={profile.preferred_currency} onChange={e=>setProfile(p=>({...p, preferred_currency: e.target.value}))}>
                <option value="USD">USD</option>
                <option value="MYR">MYR</option>
                <option value="EUR">EUR</option>
                <option value="GBP">GBP</option>
                <option value="JPY">JPY</option>
              </select>
            </div>
            <div>
              <label className="block text-sm text-gray-300 mb-1">Theme</label>
              <select className="input" value={profile.theme} onChange={e=>setProfile(p=>({...p, theme: e.target.value}))}>
                <option value="dark">Dark</option>
                <option value="light">Light</option>
                <option value="auto">Auto</option>
              </select>
            </div>
            <div>
              <label className="block text-sm text-gray-300 mb-1">Avatar URL</label>
              <input className="input" value={profile.avatar_url} onChange={e=>setProfile(p=>({...p, avatar_url: e.target.value}))} placeholder="https://..." />
            </div>
            <div>
              <label className="block text-sm text-gray-300 mb-1">Income start day</label>
              <input type="number" min={1} max={31} className="input" value={profile.pay_cycle_start_day} onChange={e=>setProfile(p=>({...p, pay_cycle_start_day: e.target.value}))} />
              <p className="text-xs text-gray-400 mt-1">Current period: {cyclePreview()}</p>
            </div>
            <div>
              <button className="btn-primary" disabled={saving} onClick={updateProfile}>Save Settings</button>
            </div>
            {message && <p className="text-sm text-gray-300">{message}</p>}
          </div>
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-white">Change Password</h3>
            <input className="input" type="password" placeholder="New password" value={password.next} onChange={e=>setPassword(p=>({...p, next: e.target.value}))} />
            <input className="input" type="password" placeholder="Confirm new password" value={password.confirm} onChange={e=>setPassword(p=>({...p, confirm: e.target.value}))} />
            <button className="btn-secondary" disabled={saving} onClick={changePassword}>Update Password</button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default SettingsPage;


