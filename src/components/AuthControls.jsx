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
  ImagePlus,
  Upload,
  Link as LinkIcon
} from 'lucide-react';
import { adminApi } from '../lib/apiClient';
import { useAuth } from './AuthContext';

const emptyAuthForm = { email: '', password: '', displayName: '' };
const emptyUserForm = { email: '', password: '', displayName: '', role: 'user' };
const avatarPresets = [
  createPresetAvatar('tide', '#4B5EFA', '#00ffcc', 'wave'),
  createPresetAvatar('ember', '#FF6A00', '#4B5EFA', 'spark'),
  createPresetAvatar('violet', '#7928ca', '#00ffcc', 'orbit'),
  createPresetAvatar('moss', '#3F4A38', '#F3EEE5', 'drop'),
  createPresetAvatar('chrome', '#A6ACB8', '#4B5EFA', 'bolt'),
  createPresetAvatar('midnight', '#111317', '#FF6A00', 'ring'),
  createPresetAvatar('bone', '#F3EEE5', '#4B5EFA', 'grid'),
  createPresetAvatar('dusk', '#5B4A6F', '#FF6A00', 'star')
];

export default function AuthControls() {
  const { user, isAdmin, isLoading, login, logout, register, updateProfile } = useAuth();
  const [activeDrawer, setActiveDrawer] = useState(null);
  const [authMode, setAuthMode] = useState('login');
  const [authForm, setAuthForm] = useState(emptyAuthForm);
  const [status, setStatus] = useState('');
  const [profileStatus, setProfileStatus] = useState('');
  const [profileForm, setProfileForm] = useState({ displayName: '', avatarUrl: '' });
  const [isAvatarPickerOpen, setIsAvatarPickerOpen] = useState(false);
  const [isSavingAvatar, setIsSavingAvatar] = useState(false);
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

  const saveAvatar = async (avatarUrl) => {
    const nextProfile = { ...profileForm, avatarUrl };
    setProfileForm(nextProfile);
    setProfileStatus('');
    setIsSavingAvatar(true);
    try {
      await updateProfile(nextProfile);
      setProfileStatus(avatarUrl ? 'Avatar saved.' : 'Avatar cleared.');
      setIsAvatarPickerOpen(false);
    } catch (err) {
      setProfileStatus(err.message);
    } finally {
      setIsSavingAvatar(false);
    }
  };

  const handleAvatarUrlChange = (avatarUrl) => {
    setProfileForm((current) => ({ ...current, avatarUrl }));
    setProfileStatus('Press Save Avatar or Save Profile to keep this URL.');
  };

  const handleAvatarUpload = async (event) => {
    const [file] = event.target.files || [];
    if (!file) return;

    setProfileStatus('');
    try {
      const avatarUrl = await resizeAvatarFile(file);
      await saveAvatar(avatarUrl);
    } catch (err) {
      setProfileStatus(err.message);
    } finally {
      event.target.value = '';
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
              <div className="avatar-picker-anchor">
                <button className="avatar-edit-button" type="button" onClick={() => setIsAvatarPickerOpen((open) => !open)} title="Edit avatar">
                  <Avatar user={{ ...user, avatarUrl: profileForm.avatarUrl }} initials={initials} size="large" />
                  <span className="avatar-edit-badge"><ImagePlus size={15} /></span>
                </button>
                {isAvatarPickerOpen && (
                  <div className="avatar-picker-panel">
                    <div className="avatar-picker-actions">
                      <label className="avatar-upload-button">
                        <Upload size={16} />
                        {isSavingAvatar ? 'Saving...' : 'Upload'}
                        <input type="file" accept="image/png,image/jpeg,image/webp,image/gif" onChange={handleAvatarUpload} />
                      </label>
                      <button type="button" onClick={() => saveAvatar('')} disabled={isSavingAvatar}>Clear</button>
                    </div>
                    <label className="avatar-url-control">
                      <span><LinkIcon size={14} /> Image URL</span>
                      <input type="url" value={profileForm.avatarUrl} onChange={(e) => handleAvatarUrlChange(e.target.value)} placeholder="https://..." />
                    </label>
                    <button className="avatar-save-button" type="button" onClick={() => saveAvatar(profileForm.avatarUrl)} disabled={isSavingAvatar}>
                      <Save size={15} />
                      {isSavingAvatar ? 'Saving...' : 'Save Avatar'}
                    </button>
                    <div className="avatar-collage" aria-label="Avatar icon presets">
                      {avatarPresets.map((preset) => (
                        <button type="button" key={preset.id} onClick={() => saveAvatar(preset.url)} disabled={isSavingAvatar} title={preset.name}>
                          <img src={preset.url} alt="" />
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              <div>
                <h2>{user.displayName || 'Droplet User'}</h2>
                <p>{user.email}</p>
              </div>
            </div>
            <form className="drawer-form profile-form" onSubmit={handleProfileSubmit}>
              <h3><ImagePlus size={17} /> Profile</h3>
              <label>
                <span>Display name</span>
                <input value={profileForm.displayName} onChange={(e) => setProfileForm({ ...profileForm, displayName: e.target.value })} autoComplete="name" />
              </label>
              {profileStatus && <div className={`drawer-status ${profileStatus.includes('updated') || profileStatus.includes('saved') || profileStatus.includes('cleared') ? 'success' : 'error'}`}>{profileStatus}</div>}
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

function createPresetAvatar(id, primary, secondary, mark) {
  const marks = {
    wave: '<path d="M16 67c14-18 28-18 42 0s28 18 42 0" fill="none" stroke="white" stroke-width="8" stroke-linecap="round" opacity=".88"/>',
    spark: '<path d="M58 18l8 24 25 8-25 8-8 24-8-24-25-8 25-8 8-24z" fill="white" opacity=".9"/>',
    orbit: '<circle cx="58" cy="58" r="11" fill="white"/><ellipse cx="58" cy="58" rx="38" ry="17" fill="none" stroke="white" stroke-width="6" opacity=".72" transform="rotate(-25 58 58)"/>',
    drop: '<path d="M58 17c18 23 28 38 28 54 0 16-12 27-28 27S30 87 30 71c0-16 10-31 28-54z" fill="white" opacity=".88"/>',
    bolt: '<path d="M64 12L30 63h26l-8 41 38-55H61l3-37z" fill="white" opacity=".9"/>',
    ring: '<circle cx="58" cy="58" r="31" fill="none" stroke="white" stroke-width="9" opacity=".9"/><circle cx="58" cy="58" r="8" fill="white"/>',
    grid: '<path d="M26 28h64v64H26zM58 28v64M26 60h64" fill="none" stroke="white" stroke-width="7" opacity=".86"/>',
    star: '<path d="M58 17l10 28 30 1-24 18 8 29-24-17-25 17 9-29-24-18 30-1 10-28z" fill="white" opacity=".9"/>'
  };
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="116" height="116" viewBox="0 0 116 116"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop stop-color="${primary}"/><stop offset="1" stop-color="${secondary}"/></linearGradient><filter id="s"><feDropShadow dx="0" dy="9" stdDeviation="7" flood-color="#000" flood-opacity=".32"/></filter></defs><rect width="116" height="116" rx="58" fill="url(#g)"/><circle cx="30" cy="28" r="34" fill="rgba(255,255,255,.18)"/><circle cx="94" cy="90" r="42" fill="rgba(0,0,0,.14)"/><g filter="url(#s)">${marks[mark]}</g></svg>`;
  return {
    id,
    name: id,
    url: `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`
  };
}

function resizeAvatarFile(file) {
  if (!file.type.startsWith('image/')) {
    return Promise.reject(new Error('Choose an image file.'));
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Could not read that image.'));
    reader.onload = () => {
      const image = new Image();
      image.onerror = () => reject(new Error('Could not load that image.'));
      image.onload = () => {
        const size = 256;
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        canvas.width = size;
        canvas.height = size;

        const sourceSize = Math.min(image.width, image.height);
        const sourceX = (image.width - sourceSize) / 2;
        const sourceY = (image.height - sourceSize) / 2;
        context.drawImage(image, sourceX, sourceY, sourceSize, sourceSize, 0, 0, size, size);
        resolve(canvas.toDataURL('image/webp', 0.82));
      };
      image.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
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
