import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { updateUserProfile, deleteUserAccount, getAllUsers, createUserAccount, uploadUserFace } from '../../services/api.js';
import { useConnectivity } from '../../hooks/useConnectivity';
import { useTheme } from '../../hooks/useTheme';
import { Sun, Moon } from 'lucide-react';
import ConfirmModal from '../../components/shared/ConfirmModal';

function getAuthUser() {
  const raw = localStorage.getItem('authUser');
  if (!raw) return null;
  try { return JSON.parse(raw); } catch { return null; }
}

const emptyForm = { name: '', email: '', password: '', role: 'participant' };

export default function ProfilePage() {
  const navigate = useNavigate();
  const currentUser = getAuthUser();

  if (!currentUser) {
    navigate('/login');
    return null;
  }

  const isStaff = currentUser.role === 'staff';
  const [mode, setMode] = useState('profile');

  return (
    <main className="directory-page" style={{ minHeight: '100dvh' }}>
      <header className="directory-header">
        <h1 className="directory-title">Profile</h1>
      </header>

      {isStaff && (
        <div className="px-4 pb-3">
          <div className="flex bg-slate-100 rounded-full p-0.5 max-w-[260px] mx-auto">
            <button
              className={`flex-1 rounded-full px-4 py-1.5 text-xs font-semibold transition-colors ${
                mode === 'profile' ? 'bg-sky-gradient text-white shadow-sm' : 'text-slate-500 hover:text-slate-700'
              }`}
              onClick={() => setMode('profile')}
            >
              My Profile
            </button>
            <button
              className={`flex-1 rounded-full px-4 py-1.5 text-xs font-semibold transition-colors ${
                mode === 'participants' ? 'bg-sky-gradient text-white shadow-sm' : 'text-slate-500 hover:text-slate-700'
              }`}
              onClick={() => setMode('participants')}
            >
              Participants
            </button>
          </div>
        </div>
      )}

      {mode === 'profile' && <ProfileSection currentUser={currentUser} navigate={navigate} />}
      {mode === 'participants' && <ParticipantSection currentUser={currentUser} />}
    </main>
  );
}

function ProfileSection({ currentUser, navigate }) {
  const [name, setName] = useState(currentUser?.name || '');
  const [email, setEmail] = useState(currentUser?.email || '');
  const [password, setPassword] = useState('');
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');
  const [deleteTarget, setDeleteTarget] = useState(false);

  const handleLogout = () => {
    localStorage.removeItem('authUser');
    navigate('/login');
  };

  const handleSave = async (event) => {
    event.preventDefault();
    setError('');
    setStatus('');

    try {
      const payload = { name, email };
      if (password) payload.password = password;

      const data = await updateUserProfile(payload, currentUser.token);
      localStorage.setItem('authUser', JSON.stringify({ ...currentUser, ...data, token: currentUser.token }));
      setStatus('Profile updated successfully');
      setPassword('');
    } catch (err) {
      setError(err.message || 'Profile update failed');
    }
  };

  const handleDelete = async () => {
    setDeleteTarget(false);
    setError('');
    setStatus('');

    try {
      await deleteUserAccount({}, currentUser.token);
      localStorage.removeItem('authUser');
      navigate('/login');
    } catch (err) {
      setError(err.message || 'Account deletion failed');
    }
  };

  return (
    <div className="px-4 pb-6 max-w-md mx-auto w-full space-y-4">
      <div className="rounded-2xl bg-white shadow-sm border border-slate-100 p-5">
        <div className="flex items-center gap-3 mb-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-sky-100 text-sky-700 text-base font-semibold">
            {currentUser.name?.charAt(0)}
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-800">{currentUser.name}</p>
            <p className="text-xs text-slate-400 capitalize">{currentUser.role}</p>
          </div>
        </div>

        <form onSubmit={handleSave} className="space-y-3">
          <label className="block text-sm font-medium text-slate-700">
            Full Name
            <input className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100" value={name} onChange={(event) => setName(event.target.value)} required />
          </label>
          <label className="block text-sm font-medium text-slate-700">
            Email
            <input type="email" className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100" value={email} onChange={(event) => setEmail(event.target.value)} required />
          </label>
          <label className="block text-sm font-medium text-slate-700">
            New Password
            <input type="password" className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100" value={password} onChange={(event) => setPassword(event.target.value)} />
          </label>
          {error && <p className="text-xs font-medium text-red-600">{error}</p>}
          {status && <p className="text-xs font-medium text-emerald-600">{status}</p>}
          <button type="submit" className="w-full rounded-full bg-sky-gradient px-4 py-2 text-sm font-semibold text-white">Save Profile</button>
        </form>
      </div>

      <AppearanceSection />

      <div className="flex gap-2">
        <button className="flex-1 rounded-full bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-200 transition-colors" onClick={handleLogout}>Logout</button>
        {currentUser.role === 'staff' && (
          <button className="flex-1 rounded-full bg-red-50 px-4 py-2 text-sm font-semibold text-red-600 hover:bg-red-100 transition-colors" onClick={() => setDeleteTarget(true)}>Delete Account</button>
        )}
      </div>
      {deleteTarget && (
        <ConfirmModal
          title="Delete Account"
          message="Delete your account? This cannot be undone."
          confirmLabel="Delete"
          onConfirm={handleDelete}
          onCancel={() => setDeleteTarget(false)}
        />
      )}
    </div>
  );
}

function AppearanceSection() {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === 'dark';

  return (
    <div className="rounded-2xl bg-white shadow-sm border border-slate-100 p-5">
      <h2 className="text-sm font-semibold text-slate-700 mb-3">Appearance</h2>
      <div className="flex bg-slate-100 rounded-full p-0.5 max-w-[280px]">
        <button
          type="button"
          className={`flex flex-1 items-center justify-center gap-1.5 rounded-full px-4 py-2 text-xs font-semibold transition-colors ${
            !isDark ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'
          }`}
          onClick={() => !isDark || toggleTheme()}
        >
          <Sun size={14} /> Light
        </button>
        <button
          type="button"
          className={`flex flex-1 items-center justify-center gap-1.5 rounded-full px-4 py-2 text-xs font-semibold transition-colors ${
            isDark ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'
          }`}
          onClick={() => isDark || toggleTheme()}
        >
          <Moon size={14} /> Dark
        </button>
      </div>
      <p className="mt-2 text-xs text-slate-500">Choose between light and dark appearance.</p>
    </div>
  );
}

function ParticipantSection({ currentUser }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);

  const { isOnline } = useConnectivity();

  const [accounts, setAccounts] = useState([]);
  const [selected, setSelected] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState('');
  const [status, setStatus] = useState('');
  const [faceSource, setFaceSource] = useState(null);
  const [faceImageBase64, setFaceImageBase64] = useState(null);
  const [facePreview, setFacePreview] = useState(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [uploadingFace, setUploadingFace] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);

  useEffect(() => {
    fetchAccounts();
  }, [isOnline]);

  useEffect(() => {
    const onSyncDone = () => fetchAccounts();
    window.addEventListener('sync:done', onSyncDone);
    return () => window.removeEventListener('sync:done', onSyncDone);
  }, []);

  const fetchAccounts = async () => {
    try {
      const data = await getAllUsers(currentUser.token);
      setAccounts(data);
    } catch (err) {
      setError(err.message || 'Unable to load accounts');
    }
  };

  const toBase64 = (blob) => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result.split(',')[1]);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });

  const handleUrlImage = async (url) => {
    try {
      const res = await fetch(url);
      const blob = await res.blob();
      const b64 = await toBase64(blob);
      setFaceImageBase64(b64);
      setFacePreview(URL.createObjectURL(blob));
    } catch {
      setError('Failed to load image from URL');
    }
  };

  const handleFileImage = (file) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const b64 = reader.result.split(',')[1];
      setFaceImageBase64(b64);
      setFacePreview(reader.result);
    };
    reader.onerror = () => setError('Failed to read image file');
    reader.readAsDataURL(file);
  };

  const startCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        setCameraActive(true);
      }
    } catch {
      setError('Camera access denied or not available');
    }
  }, []);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
  }, []);

  const captureFromCamera = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
    setFaceImageBase64(dataUrl.split(',')[1]);
    setFacePreview(dataUrl);
    stopCamera();
    setFaceSource('camera');
  };

  const clearFace = () => {
    stopCamera();
    setFaceSource(null);
    setFaceImageBase64(null);
    setFacePreview(null);
  };

  useEffect(() => {
    return () => stopCamera();
  }, [stopCamera]);

  const handleCreate = async (event) => {
    event.preventDefault();
    setError('');
    setStatus('');
    setUploadingFace(false);

    if (!faceImageBase64) {
      setError('Face image is required — use URL, file upload, or camera');
      return;
    }

    try {
      const payload = { ...form };
      if (!navigator.onLine) {
        payload.faceImage = faceImageBase64;
      }
      const newUser = await createUserAccount(payload, currentUser.token);
      //use online status to determine whether to upload face
      if (navigator.onLine) {
        setUploadingFace(true);
        try {
          await uploadUserFace(newUser.id, faceImageBase64, currentUser.token);
        } catch (faceErr) {
          setError('Account created but face upload failed: ' + (faceErr.message || ''));
        }
        setUploadingFace(false);
        setStatus('Account created successfully with face registration');
        fetchAccounts();
      } else {
        setStatus('Account queued. face registration will complete when connection is restored');
        setAccounts(prev => [...prev, { ...newUser, id: 'pending-' + Date.now() }]);
      }
      setForm(emptyForm);
      clearFace();
    } catch (err) {
      setError(err.message || 'Create account failed');
    }
  };

  const handleSelect = (account) => {
    setSelected(account);
    setForm({
      name: account.name || '',
      email: account.email || '',
      password: '',
      role: account.role || 'participant',
    });
    setStatus('Editing ' + account.name);
    setError('');
    clearFace();
  };

  const handleUpdate = async (event) => {
    event.preventDefault();
    if (!selected) return;
    setError('');
    setStatus('');

    try {
      const payload = { targetId: selected.id, name: form.name, email: form.email, role: form.role };
      if (form.password) payload.password = form.password;

      await updateUserProfile(payload, currentUser.token);
      setStatus('Account updated successfully');
      setSelected(null);
      setForm(emptyForm);
      clearFace();
      //obtain account list based on connectivity
      if (navigator.onLine) {
        fetchAccounts();
      } else {
        setAccounts(prev => prev.map(a =>
          a.id === (payload.targetId || selected.id)
            ? { ...a, name: form.name, email: form.email, role: form.role }
            : a
        ));
      }
    } catch (err) {
      setError(err.message || 'Update failed');
    }
  };

  const handleDelete = async (accountId) => {
    setError('');
    setStatus('');
    setDeleteTarget(null);

    try {
      await deleteUserAccount({ targetId: accountId }, currentUser.token);
      setStatus('Account deleted successfully');
      if (selected?.id === accountId) {
        setSelected(null);
        setForm(emptyForm);
      }
      if (navigator.onLine) {
        fetchAccounts();
      } else {
        setAccounts(prev => prev.filter(a => a.id !== accountId));
      }
    } catch (err) {
      setError(err.message || 'Delete failed');
    }
  };

  const handleCancelEdit = () => {
    setSelected(null);
    setForm(emptyForm);
    setStatus('');
    setError('');
    clearFace();
  };

  return (
    <div className="px-4 pb-6 max-w-2xl mx-auto w-full space-y-4">
      <div className="rounded-2xl bg-white shadow-sm border border-slate-100 overflow-hidden">
        <div className="p-5">
          <h2 className="text-sm font-semibold text-slate-700 mb-3">Accounts</h2>

          {error && <p className="text-xs font-medium text-red-600 mb-2">{error}</p>}
          {status && <p className="text-xs font-medium text-emerald-600 mb-2">{status}</p>}

          {accounts.length === 0 ? (
            <p className="text-xs text-slate-400">No accounts yet.</p>
          ) : (
            <div className="space-y-1">
              {accounts.map((account) => (
                <div key={account.id} className="flex items-center justify-between bg-slate-50 rounded-xl px-4 py-3 border border-slate-100">
                  <div>
                    <span className="text-sm text-slate-800">{account.name}</span>
                    <span className="ml-2 text-xs text-slate-400">{account.email}</span>
                    <span className={`ml-2 text-xs uppercase px-2 py-0.5 rounded-full ${
                      account.role === 'staff' ? 'bg-sky-50 text-sky-600' : 'bg-slate-100 text-slate-500'
                    }`}>{account.role}</span>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button className="text-xs text-slate-400 hover:text-sky-600 transition-colors font-semibold px-2 py-1" type="button" onClick={() => handleSelect(account)}>Edit</button>
                    <button className="text-xs text-slate-400 hover:text-red-600 transition-colors font-semibold px-2 py-1" type="button" onClick={() => setDeleteTarget(account)}>Delete</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {deleteTarget && (
        <ConfirmModal
          title="Delete Account"
          message={`Delete "${deleteTarget.name}"? This cannot be undone.`}
          confirmLabel="Delete"
          onConfirm={() => handleDelete(deleteTarget.id)}
          onCancel={() => setDeleteTarget(null)}
        />
      )}

      <div className="rounded-2xl bg-white shadow-sm border border-slate-100 p-5">
        <h2 className="text-sm font-semibold text-slate-700 mb-3">{selected ? 'Edit Account' : 'Create Account'}</h2>

        <form onSubmit={selected ? handleUpdate : handleCreate} className="space-y-3">
          <label className="block text-sm font-medium text-slate-700">
            Full Name
            <input className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} required />
          </label>
          <label className="block text-sm font-medium text-slate-700">
            Email
            <input type="email" className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} required />
          </label>
          <label className="block text-sm font-medium text-slate-700">
            Password
            <input type="password" className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100" value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} placeholder={selected ? 'Leave blank to keep current' : ''} required={!selected} />
          </label>
          <label className="block text-sm font-medium text-slate-700">
            Role
            <select className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100" value={form.role} onChange={(event) => setForm({ ...form, role: event.target.value })}>
              <option value="participant">Participant</option>
              <option value="staff">Staff</option>
            </select>
          </label>

          {!selected && (
            <fieldset className="rounded-xl border border-slate-200 p-3">
              <legend className="text-sm font-semibold text-slate-700">Face Registration <span className="text-red-600">*</span></legend>
              <p className="text-xs text-slate-500 mt-1">Attach a face image for facial recognition — required</p>

              <div className="mt-2 flex gap-2">
                {['url', 'file', 'camera'].map((src) => (
                  <button
                    key={src}
                    type="button"
                    className={`flex-1 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
                      faceSource === src ? 'border-sky-500 bg-sky-50 text-sky-700' : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50'
                    }`}
                    onClick={() => {
                      if (faceSource === src) { clearFace(); return; }
                      clearFace();
                      setFaceSource(src);
                      if (src === 'camera') startCamera();
                    }}
                  >
                    {src === 'url' ? 'URL' : src === 'file' ? 'Upload' : 'Camera'}
                  </button>
                ))}
              </div>

              {faceSource === 'url' && (
                <div className="mt-2 flex gap-2">
                  <input type="url" placeholder="https://example.com/face.jpg" className="flex-1 rounded-lg border border-slate-200 px-3 py-1.5 text-xs outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100" />
                  <button type="button" className="rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-200 transition-colors" onClick={(e) => handleUrlImage(e.target.previousElementSibling.value)}>Load</button>
                </div>
              )}

              {faceSource === 'file' && (
                <input type="file" accept="image/*" onChange={(e) => { const f = e.target.files[0]; if (f) handleFileImage(f); }} className="mt-2 block w-full text-xs text-slate-500 file:mr-2 file:rounded-lg file:border-0 file:bg-sky-50 file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-sky-700" />
              )}

              {faceSource === 'camera' && (
                <div className="mt-2 flex flex-col items-center gap-2">
                  <video ref={videoRef} className="w-full max-w-xs rounded-lg bg-black" playsInline muted />
                  <canvas ref={canvasRef} style={{ display: 'none' }} />
                  {cameraActive && (
                    <button type="button" className="rounded-full bg-sky-gradient px-4 py-2 text-sm font-semibold text-white" onClick={captureFromCamera}>Capture</button>
                  )}
                </div>
              )}

              {facePreview && (
                <div className="mt-2 flex items-center gap-3">
                  <img src={facePreview} alt="Face preview" className="h-14 w-14 rounded-full border-2 border-sky-200 object-cover" />
                  <button type="button" className="rounded-full bg-red-50 px-3 py-1 text-xs font-medium text-red-600 hover:bg-red-100 transition-colors" onClick={clearFace}>Remove</button>
                </div>
              )}
            </fieldset>
          )}

          <button className="w-full rounded-full bg-sky-gradient px-4 py-2 text-sm font-semibold text-white disabled:bg-slate-200 disabled:text-slate-400" type="submit" disabled={uploadingFace || (!selected && !faceImageBase64)}>
            {uploadingFace ? 'Uploading face...' : selected ? 'Update Account' : 'Create Account'}
          </button>
          {selected && (
            <button type="button" className="w-full rounded-full bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-200 transition-colors" onClick={handleCancelEdit}>Cancel</button>
          )}
        </form>
      </div>
    </div>
  );
}
