import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  LogIn,
  LogOut,
  Shield,
  X,
  UsersRound,
  UserPlus,
  RefreshCw,
  Trash2,
  Save,
  ImagePlus
} from 'lucide-react';
import { adminApi } from '../lib/apiClient';
import { useAuth } from './AuthContext';

const emptyAuthForm = { email: '', password: '', displayName: '' };
const emptyUserForm = { email: '', password: '', displayName: '', role: 'user' };

export default function AuthControls() {
  const { user, isAdmin, isLoading, login, logout, register, updateProfile } = useAuth();
  const [activeDrawer, setActiveDrawer] = useState(null);
  const [authMode, setAuthMode] = useState('login');
  const [authForm, setAuthForm] = useState(emptyAuthForm);
  const [status, setStatus] = useState('');
  const [profileStatus, setProfileStatus] = useState('');
  const [profileForm, setProfileForm] = useState({ displayName: '', avatarUrl: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const initials = useMemo(() => {
    const source = user?.displayName || user?.email || 'D';
    return source.slice(0, 2).toUpperCase();
  }, [user]);

  useEffect(() => {
    if (user) {
      setProfileForm({
        displayName: user.displayName || '',
        avatarUrl: user.avatarUrl || ''
      });
    }
  }, [user]);

  const handleAuthSubmit = async (event) => {
    event.preventDefault();
    setStatus('');
    setIsSubmitting(true);
    try {
      if (authMode === 'login') {
        await login({ email: authForm.email, password: authForm.password });
      } else {
        await register(authForm);
      }
      setAuthForm(emptyAuthForm);
      setActiveDrawer('account');
    } catch (err) {
      setStatus(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    setActiveDrawer(null);
  };

  const handleProfileSubmit = async (event) => {
    event.preventDefault();
    setProfileStatus('');
    setIsSubmitting(true);
    try {
      await updateProfile(profileForm);
      setProfileStatus('Profile updated.');
    } catch (err) {
      setProfileStatus(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <div className="auth-dock" aria-label="Account controls">
        {user ? (
          <>
            <button className="auth-pill" onClick={() => setActiveDrawer('account')} title="Account">
              <Avatar user={user} initials={initials} />
              <span className="auth-pill-text">{user.displayName || user.email}</span>
            </button>
            {isAdmin && (
              <button className="auth-icon-button admin" onClick={() => setActiveDrawer('admin')} title="Admin">
                <Shield size={18} />
              </button>
            )}
          </>
        ) : (
          <button className="auth-pill" onClick={() => setActiveDrawer('auth')} disabled={isLoading}>
            <LogIn size={18} />
            <span className="auth-pill-text">{isLoading ? 'Checking' : 'Login'}</span>
          </button>
        )}
      </div>

      <Drawer open={activeDrawer === 'auth'} title={authMode === 'login' ? 'Login' : 'Create Account'} onClose={() => setActiveDrawer(null)}>
        <form className="drawer-form" onSubmit={handleAuthSubmit}>
          <div className="auth-segmented" role="tablist" aria-label="Authentication mode">
            <button type="button" className={authMode === 'login' ? 'active' : ''} onClick={() => setAuthMode('login')}>Login</button>
            <button type="button" className={authMode === 'register' ? 'active' : ''} onClick={() => setAuthMode('register')}>Register</button>
          </div>

          {authMode === 'register' && (
            <label>
              <span>Display name</span>
              <input value={authForm.displayName} onChange={(e) => setAuthForm({ ...authForm, displayName: e.target.value })} autoComplete="name" />
            </label>
          )}

          <label>
            <span>Email</span>
            <input type="email" value={authForm.email} onChange={(e) => setAuthForm({ ...authForm, email: e.target.value })} autoComplete="email" required />
          </label>

          <label>
            <span>Password</span>
            <input type="password" value={authForm.password} onChange={(e) => setAuthForm({ ...authForm, password: e.target.value })} autoComplete={authMode === 'login' ? 'current-password' : 'new-password'} minLength={10} required />
          </label>

          {status && <div className="drawer-status error">{status}</div>}

          <button className="drawer-primary" type="submit" disabled={isSubmitting}>
            <LogIn size={18} />
            {isSubmitting ? 'Working...' : authMode === 'login' ? 'Login' : 'Create Account'}
          </button>
        </form>
      </Drawer>

      <Drawer open={activeDrawer === 'account'} title="Account" onClose={() => setActiveDrawer(null)}>
        {user && (
          <div className="account-panel">
            <div className="account-identity">
              <Avatar user={user} initials={initials} size="large" />
              <div>
                <h2>{user.displayName || 'Droplet User'}</h2>
                <p>{user.email}</p>
              </div>
            </div>
            <form className="drawer-form profile-form" onSubmit={handleProfileSubmit}>
              <h3><ImagePlus size={17} /> Profile Image</h3>
              <label>
                <span>Display name</span>
                <input value={profileForm.displayName} onChange={(e) => setProfileForm({ ...profileForm, displayName: e.target.value })} autoComplete="name" />
              </label>
              <label>
                <span>Avatar image URL</span>
                <input type="url" value={profileForm.avatarUrl} onChange={(e) => setProfileForm({ ...profileForm, avatarUrl: e.target.value })} placeholder="https://..." />
              </label>
              {profileStatus && <div className={`drawer-status ${profileStatus.includes('updated') ? 'success' : 'error'}`}>{profileStatus}</div>}
              <button className="drawer-primary" type="submit" disabled={isSubmitting}>
                <Save size={17} />
                {isSubmitting ? 'Saving...' : 'Save Profile'}
              </button>
            </form>
            <div className="account-meta">
              <span>Role</span>
              <strong>{user.role || 'user'}</strong>
            </div>
            <button className="drawer-secondary danger" onClick={handleLogout}>
              <LogOut size={18} />
              Logout
            </button>
          </div>
        )}
      </Drawer>

      <AdminDrawer open={activeDrawer === 'admin'} onClose={() => setActiveDrawer(null)} />
    </>
  );
}

function AdminDrawer({ open, onClose }) {
  const { isAdmin, user } = useAuth();
  const [users, setUsers] = useState([]);
  const [userForm, setUserForm] = useState(emptyUserForm);
  const [status, setStatus] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const loadUsers = useCallback(async () => {
    if (!isAdmin) return;
    setIsLoading(true);
    setStatus('');
    try {
      const payload = await adminApi.users();
      setUsers(payload.users);
    } catch (err) {
      setStatus(err.message);
    } finally {
      setIsLoading(false);
    }
  }, [isAdmin]);

  useEffect(() => {
    if (open) loadUsers();
  }, [loadUsers, open]);

  const createUser = async (event) => {
    event.preventDefault();
    setStatus('');
    try {
      await adminApi.createUser(userForm);
      setUserForm(emptyUserForm);
      setStatus('User created.');
      await loadUsers();
    } catch (err) {
      setStatus(err.message);
    }
  };

  const updateUser = async (targetUser, nextRole) => {
    setStatus('');
    try {
      await adminApi.updateUser(targetUser.id, {
        displayName: targetUser.displayName,
        avatarUrl: targetUser.avatarUrl,
        role: nextRole
      });
      await loadUsers();
    } catch (err) {
      setStatus(err.message);
    }
  };

  const deleteUser = async (targetUser) => {
    setStatus('');
    try {
      await adminApi.deleteUser(targetUser.id);
      await loadUsers();
    } catch (err) {
      setStatus(err.message);
    }
  };

  return (
    <Drawer open={open} title="Admin" onClose={onClose}>
      <div className="admin-stack">
        <div className="admin-toolbar">
          <div>
            <h2>User Control</h2>
            <p>{users.length} account{users.length === 1 ? '' : 's'} in Droplet</p>
          </div>
          <button className="auth-icon-button" onClick={loadUsers} disabled={isLoading} title="Refresh users">
            <RefreshCw size={17} />
          </button>
        </div>

        <form className="drawer-form admin-create" onSubmit={createUser}>
          <h3><UserPlus size={17} /> Create User</h3>
          <label>
            <span>Display name</span>
            <input value={userForm.displayName} onChange={(e) => setUserForm({ ...userForm, displayName: e.target.value })} />
          </label>
          <label>
            <span>Email</span>
            <input type="email" value={userForm.email} onChange={(e) => setUserForm({ ...userForm, email: e.target.value })} required />
          </label>
          <label>
            <span>Password</span>
            <input type="password" value={userForm.password} onChange={(e) => setUserForm({ ...userForm, password: e.target.value })} minLength={10} required />
          </label>
          <label>
            <span>Role</span>
            <select value={userForm.role} onChange={(e) => setUserForm({ ...userForm, role: e.target.value })}>
              <option value="user">User</option>
              <option value="admin">Admin</option>
            </select>
          </label>
          <button className="drawer-primary" type="submit">
            <Save size={17} />
            Create
          </button>
        </form>

        {status && <div className={`drawer-status ${status.includes('created') ? 'success' : 'error'}`}>{status}</div>}

        <div className="admin-users" aria-live="polite">
          <div className="admin-list-heading">
            <UsersRound size={17} />
            Accounts
          </div>
          {users.map((targetUser) => (
            <div className="admin-user-row" key={targetUser.id}>
              <Avatar user={targetUser} initials={(targetUser.displayName || targetUser.email || 'U').slice(0, 2).toUpperCase()} />
              <div>
                <strong>{targetUser.displayName || 'Unnamed user'}</strong>
                <span>{targetUser.email}</span>
                <small>{targetUser.canvasCount} canvas{targetUser.canvasCount === 1 ? '' : 'es'}</small>
              </div>
              <select
                value={targetUser.role}
                onChange={(event) => updateUser(targetUser, event.target.value)}
                disabled={targetUser.id === user?.id}
                aria-label={`Role for ${targetUser.email}`}
              >
                <option value="user">User</option>
                <option value="admin">Admin</option>
              </select>
              <button className="auth-icon-button danger" onClick={() => deleteUser(targetUser)} disabled={targetUser.id === user?.id} title="Delete user">
                <Trash2 size={16} />
              </button>
            </div>
          ))}
        </div>
      </div>
    </Drawer>
  );
}

function Avatar({ user, initials, size }) {
  if (user?.avatarUrl) {
    return (
      <span className={`auth-avatar ${size === 'large' ? 'large' : ''}`}>
        <img src={user.avatarUrl} alt="" loading="lazy" referrerPolicy="no-referrer" />
      </span>
    );
  }

  return <span className={`auth-avatar ${size === 'large' ? 'large' : ''}`}>{initials}</span>;
}

function Drawer({ open, title, onClose, children }) {
  if (!open) return null;

  return (
    <div className="drawer-shell" role="dialog" aria-modal="true" aria-label={title}>
      <button className="drawer-scrim" onClick={onClose} aria-label="Close drawer" />
      <aside className="drawer-panel">
        <header className="drawer-header">
          <div>
            <span>Droplet</span>
            <h1>{title}</h1>
          </div>
          <button className="auth-icon-button" onClick={onClose} title="Close">
            <X size={18} />
          </button>
        </header>
        {children}
      </aside>
    </div>
  );
}
