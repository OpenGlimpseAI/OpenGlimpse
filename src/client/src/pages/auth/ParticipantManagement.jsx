import { useEffect, useState, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { getAllUsers, createUserAccount, updateUserProfile, deleteUserAccount, uploadUserFace } from '../../services/api.js';
import { useConnectivity } from '../../hooks/useConnectivity';

function getAuthUser() {
  const raw = localStorage.getItem('authUser');
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

const emptyForm = { name: '', email: '', password: '', role: 'participant' };

export default function ParticipantManagement() {
  const navigate = useNavigate();
  const currentUser = getAuthUser();
  const { isOnline } = useConnectivity();

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);

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

  if (!currentUser) {
    navigate('/login');
    return null;
  }
  if (currentUser.role !== 'staff') {
    navigate('/profile');
    return null;
  }

  useEffect(() => {
    //refetch accounts when online status changes
    fetchAccounts();
  }, [isOnline]);

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
//upload face image if offline
    try {
      const payload = { ...form };
      if (!navigator.onLine) {
        payload.faceImage = faceImageBase64;
      }
      const newUser = await createUserAccount(payload, currentUser.token);
//online condition
      if (navigator.onLine) {
        setUploadingFace(true);
        try {
          await uploadUserFace(newUser.id, faceImageBase64, currentUser.token);
        } catch (faceErr) {
          setError('Account created but face upload failed: ' + (faceErr.message || ''));
        }
        setUploadingFace(false);
      }
//response messages based on face upload status
      setStatus(navigator.onLine
        ? 'Account created successfully with face registration'
        : 'Account queued. face registration will complete when connection is restored');
      setForm(emptyForm);
      clearFace();
      fetchAccounts();
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
      fetchAccounts();
    } catch (err) {
      setError(err.message || 'Update failed');
    }
  };

  const handleDelete = async (accountId) => {
    const confirmed = window.confirm('Delete this account?');
    if (!confirmed) return;
    setError('');
    setStatus('');

    try {
      await deleteUserAccount({ targetId: accountId }, currentUser.token);
      setStatus('Account deleted successfully');
      if (selected?.id === accountId) {
        setSelected(null);
        setForm(emptyForm);
      }
      fetchAccounts();
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
    <main className="staff-mgmt-page">
      <header className="staff-mgmt-header">
        <h1>Participant Management</h1>
        <p>Welcome back, {currentUser.name}. Manage participant and staff accounts below.</p>
      </header>

      {error && <p className="auth-error-text">{error}</p>}
      {status && <p className="auth-success-text">{status}</p>}

      <div className="staff-mgmt-grid">
        <section className="staff-mgmt-panel staff-mgmt-panel-main">
          <h2>Accounts</h2>
          {accounts.length === 0 ? (
            <p className="auth-small-note">No accounts yet.</p>
          ) : (
            <table className="staff-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {accounts.map((account) => (
                  <tr key={account.id}>
                    <td>{account.name}</td>
                    <td>{account.email}</td>
                    <td>{account.role}</td>
                    <td>
                      <button className="auth-button auth-button-secondary" type="button" onClick={() => handleSelect(account)}>
                        Edit
                      </button>
                      <button className="auth-button auth-button-danger" type="button" onClick={() => handleDelete(account.id)}>
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>

        <section className="staff-mgmt-panel staff-mgmt-panel-form">
          <h2>{selected ? 'Edit Account' : 'Create Account'}</h2>
          <form onSubmit={selected ? handleUpdate : handleCreate} className="auth-form">
            <label>
              Full Name
              <input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} required />
            </label>
            <label>
              Email
              <input type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} required />
            </label>
            <label>
              Password
              <input
                type="password"
                value={form.password}
                onChange={(event) => setForm({ ...form, password: event.target.value })}
                placeholder={selected ? 'Leave blank to keep current password' : ''}
                required={!selected}
              />
            </label>
            <label>
              Role
              <select value={form.role} onChange={(event) => setForm({ ...form, role: event.target.value })}>
                <option value="participant">Participant</option>
                <option value="staff">Staff</option>
              </select>
            </label>

            {!selected && (
              <fieldset className="auth-fieldset">
                <legend>Face Registration <span className="auth-required">*</span></legend>
                <p className="auth-small-note">Attach a face image for facial recognition — required</p>

                <div className="face-source-tabs">
                  {['url', 'file', 'camera'].map((src) => (
                    <button
                      key={src}
                      type="button"
                      className={`face-source-btn ${faceSource === src ? 'active' : ''}`}
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
                  <div className="face-url-row">
                    <input
                      type="url"
                      placeholder="https://example.com/face.jpg"
                      className="face-url-input"
                      onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleUrlImage(e.target.value); } }}
                    />
                    <button type="button" className="auth-button auth-button-secondary" onClick={(e) => handleUrlImage(e.target.closest('.face-url-row').querySelector('input').value)}>
                      Load
                    </button>
                  </div>
                )}

                {faceSource === 'file' && (
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => { const f = e.target.files[0]; if (f) handleFileImage(f); }}
                    className="face-file-input"
                  />
                )}

                {faceSource === 'camera' && (
                  <div className="face-camera-box">
                    <video ref={videoRef} className="face-camera-video" playsInline muted />
                    <canvas ref={canvasRef} style={{ display: 'none' }} />
                    {cameraActive && (
                      <button type="button" className="auth-button" onClick={captureFromCamera}>
                        Capture
                      </button>
                    )}
                  </div>
                )}

                {facePreview && (
                  <div className="face-preview-row">
                    <img src={facePreview} alt="Face preview" className="face-preview-img" />
                    <button type="button" className="auth-button auth-button-danger" onClick={clearFace}>
                      Remove
                    </button>
                  </div>
                )}
              </fieldset>
            )}

            <button className="auth-button" type="submit" disabled={uploadingFace || (!selected && !faceImageBase64)}>
              {uploadingFace ? 'Uploading face...' : selected ? 'Update Account' : 'Create Account'}
            </button>
            {selected && (
              <button type="button" className="auth-button auth-button-secondary" onClick={handleCancelEdit}>
                Cancel
              </button>
            )}
          </form>
        </section>
      </div>
    </main>
  );
}
