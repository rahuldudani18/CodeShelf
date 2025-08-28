import { useState, useEffect, useRef } from 'react';
import { useUser } from '@clerk/clerk-react';
import { useNavigate } from 'react-router-dom';
import './Profile.css';
import imageCompression from 'browser-image-compression';


const Profile = () => {
  const { user } = useUser();
  const navigate = useNavigate();

  const [snippets, setSnippets] = useState([]);
  const [search, setSearch] = useState('');
  const [languageFilter, setLanguageFilter] = useState('All');
  const [isEditing, setIsEditing] = useState(false);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [profileImg, setProfileImg] = useState(user?.imageUrl || '/public/user.png');
  const [activeSnippet, setActiveSnippet] = useState(null);
  const [copied, setCopied] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState('');
  const [deleteError, setDeleteError] = useState('');
  const [isEditingSnippet, setIsEditingSnippet] = useState(false);
  const [editingCode, setEditingCode] = useState('');
  const [showImageModal, setShowImageModal] = useState(false);


  const fileInputRef = useRef(null);

  useEffect(() => {
    async function fetchUserData() {
      const [snippetsRes, profileRes] = await Promise.all([
        fetch(`http://localhost:3001/api/get-user-snippets?userId=${user.id}`),
        fetch(`http://localhost:3001/api/get-user-profile?userId=${user.id}`)
      ]);

      const snippetsData = await snippetsRes.json();
      const profileData = await profileRes.json();

      setSnippets(snippetsData.snippets || []);
      if (profileData?.profile_img) {
        setProfileImg(profileData.profile_img);
      }
      if (profileData?.first_name) {
        setFirstName(profileData.first_name);
      }
      if (profileData?.last_name) {
        setLastName(profileData.last_name);
      }
    }

    if (user) {
      fetchUserData();
    }

    document.body.style.backgroundColor = '#2a2a2a';
    return () => {
      document.body.style.backgroundColor = '';
    };
  }, [user]);

  const handleSave = async () => {
    try {
      const res = await fetch('http://localhost:3001/api/update-user-profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          firstName,
          lastName,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message);

      alert('✅ Profile updated!');
      setIsEditing(false);
    } catch (err) {
      console.error('❌ Error saving profile:', err.message);
      alert('Error saving profile');
    }
  };


  const handleImageChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
      // ✅ Compress the image
      const compressedFile = await imageCompression(file, {
        maxSizeMB: 0.5,             // Limit size to 0.5MB
        maxWidthOrHeight: 512,      // Resize to 512x512 max
        useWebWorker: true,
      });

      // ✅ Convert to base64
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64Image = reader.result;
        setProfileImg(base64Image);

        // ✅ Upload to backend
        const res = await fetch('http://localhost:3001/api/upload-profile-image', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: user.id,
            imageData: base64Image,
          }),
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.message);
        console.log('✅ Profile image saved');
      };

      reader.readAsDataURL(compressedFile);
    } catch (err) {
      console.error('❌ Image processing error:', err);
      alert('Image is too large or invalid. Try a smaller one.');
    }
  };


  const handleProfileImgClick = () => {
    if (profileImg.includes('/public/user.png')) {
      alert('ℹ️ No profile photo uploaded.');
    } else {
      setShowImageModal(true);
    }
  };


  const handleCopy = () => {
    if (activeSnippet) {
      navigator.clipboard.writeText(activeSnippet.code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleSaveEditedSnippet = async () => {
    try {
      const res = await fetch('http://localhost:3001/api/update-snippet', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: user.id,
          snippetId: activeSnippet._id,
          updatedCode: editingCode,
        }),
      });

      const data = await res.json();

      if (res.ok) {
        alert('✅ Snippet updated!');
        setSnippets((prev) =>
          prev.map((s) =>
            s._id === activeSnippet._id ? { ...s, code: editingCode } : s
          )
        );
        setIsEditingSnippet(false);
        setActiveSnippet(null);
      } else {
        alert(data.message || 'Failed to update snippet');
      }
    } catch (err) {
      console.error('🔥 Error updating snippet:', err);
      alert('Error updating snippet');
    }
  };

  const handleDeleteSnippet = async (snippetId) => {
    const confirmed = window.confirm('Are you sure you want to delete this snippet?');
    if (!confirmed) return;

    try {
      const res = await fetch('http://localhost:3001/api/delete-snippet', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: user.id,
          snippetId: snippetId,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        alert('🗑️ Snippet deleted!');
        setSnippets(prev => prev.filter(snippet => snippet._id !== snippetId));

        if (activeSnippet && activeSnippet._id === snippetId) {
          setActiveSnippet(null);
          setIsEditingSnippet(false);
        }
      } else {
        alert(data.message || 'Failed to delete snippet');
      }
    } catch (err) {
      console.error('🔥 Error deleting snippet:', err);
      alert('Error deleting snippet');
    }
  };

  const filteredSnippets = snippets.filter(snippet => {
    const matchesSearch = snippet.title.toLowerCase().includes(search.toLowerCase());
    const matchesLanguage = languageFilter === 'All' || snippet.language === languageFilter;
    return matchesSearch && matchesLanguage;
  });

  const triggerImageUpload = () => fileInputRef.current?.click();
  const joinedDate = user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'N/A';

  const handleAccountDelete = async () => {
    if (deleteConfirm.toLowerCase() !== 'delete') {
      setDeleteError("Please type 'delete' exactly to confirm.");
      return;
    }

    try {
      const res = await fetch('http://localhost:3001/api/delete-account', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId: user.id }),
      });

      const data = await res.json();

      if (!res.ok) {
        setDeleteError(data.message || 'Failed to delete account');
        return;
      }

      alert('✅ Account deleted successfully!');
      setShowDeleteModal(false);

      // Redirect to home or sign out
      navigate('/');
    } catch (err) {
      console.error('❌ Error deleting account:', err);
      setDeleteError('An error occurred while deleting your account.');
    }
  };


  useEffect(() => {
    const body = document.body;

    if (activeSnippet || isEditingSnippet || showDeleteModal) {
      body.style.overflow = 'hidden';
    } else {
      body.style.overflow = 'auto';
    }

    return () => {
      body.style.overflow = 'auto';
    };
  }, [activeSnippet, isEditingSnippet, showDeleteModal]);


  return (
    <div className="profile-container">

      {/* Back button */}
      <img
        src="/public/back.png"
        alt="Back"
        className="back-button-global"
        onClick={() => navigate('/')}
      />

      {/* Main Content */}
      <div className="profile-main-content">

        {/* User Info */}
        <div className="user-info-card">
          <div className="top-right-edit">
            {!isEditing ? (
              <img
                src="/public/edit.png"
                alt="Edit"
                className="edit-icon-global"
                onClick={() => setIsEditing(true)}
              />
            ) : (
              <button className="save-button2" onClick={handleSave}>Save</button>
            )}
          </div>

          <div className="profile-left">
            <img
              src={profileImg}
              alt="Profile"
              className="profile-avatar-square"
              onClick={handleProfileImgClick}
            />
            <input
              type="file"
              accept="image/*"
              ref={fileInputRef}
              style={{ display: 'none' }}
              onChange={handleImageChange}
            />
            <div className="image-action-icons">
              <img src="/public/edit.png" alt="Edit" className="action-icon" onClick={triggerImageUpload} />
              <img
                src="/public/delete.png"
                alt="Delete"
                className="action-icon"
                onClick={async () => {
                  const confirmDelete = window.confirm('Are you sure you want to delete your profile image?');
                  if (!confirmDelete) return;

                  // Reset image in UI
                  setProfileImg('/public/user.png');

                  // Update backend
                  try {
                    const res = await fetch('http://localhost:3001/api/upload-profile-image', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        userId: user.id,
                        imageData: '/public/user.png',
                      }),
                    });

                    const data = await res.json();
                    if (!res.ok) throw new Error(data.message);
                    console.log('✅ Profile image deleted');
                  } catch (err) {
                    console.error('❌ Failed to delete profile image:', err.message);
                  }
                }}
              />

            </div>
          </div>

          <div className="profile-right">
            <div className="form-row">
              <div className="form-field editable">
                <input
                  type="text"
                  placeholder={user?.firstName || 'First Name'}
                  value={firstName}
                  onChange={e => setFirstName(e.target.value)}
                  disabled={!isEditing}
                />
              </div>
              <div className="form-field editable">
                <input
                  type="text"
                  placeholder={user?.lastName || 'Last Name'}
                  value={lastName}
                  onChange={e => setLastName(e.target.value)}
                  disabled={!isEditing}
                />
              </div>
            </div>
            <div className="form-row">
              <div className="form-field non-editable">
                <input type="text" value={user?.emailAddresses[0]?.emailAddress || ''} readOnly />
              </div>
            </div>
            <div className="form-row">
              <div className="form-field non-editable">
                <input type="text" value={`Joined: ${joinedDate}`} readOnly />
              </div>
            </div>
          </div>
        </div>

        {/* Controls */}
        <div className="profile-controls">
          <input
            type="text"
            placeholder="Search your files"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="profile-search"
          />
          <select
            value={languageFilter}
            onChange={e => setLanguageFilter(e.target.value)}
            className="profile-select"
          >
            {['All', ...new Set(snippets.map(s => s.language))].map(lang => (
              <option key={lang} value={lang}>{lang}</option>
            ))}
          </select>
        </div>

        {/* Snippets Container */}
        <div className="snippets-wrapper">
          {filteredSnippets.length === 0 ? (
            <p className="no-snippets">No  saved  files  found.</p>
          ) : (
            <div className="profile-snippets">
              {filteredSnippets.map(snippet => (
                <div key={snippet._id} className="snippet-card">
                  <div>
                    <h3 className="snippet-title">{snippet.title}</h3>
                    <p className="snippet-meta">
                      {snippet.language}    •    {new Date(snippet.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="snippet-actions">
                    <button
                      className="btn btn-view"
                      onClick={() => {
                        setIsEditingSnippet(false);
                        setActiveSnippet(snippet);
                      }}
                    >
                      View
                    </button>
                    <button
                      className="btn btn-edit"
                      onClick={() => {
                        setActiveSnippet(snippet);
                        setEditingCode(snippet.code);
                        setIsEditingSnippet(true);
                      }}
                    >
                      Edit
                    </button>
                    <button
                      className="btn btn-delete"
                      onClick={() => handleDeleteSnippet(snippet._id)}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Delete Account Button */}
      <div className="delete-button-wrapper">
        <button className="btn btn-delete" onClick={() => setShowDeleteModal(true)}>Delete Account</button>
      </div>

      {/* Code Snippet Modal */}
      {activeSnippet && (
        <div className="code-modal-overlay">
          <div className="code-modal">
            <div className="modal-header">
              <span>{activeSnippet.title}</span>
              <div className="modal-icons">
                <div className="copy-wrapper">
                  {copied && <div className="copied-text">Copied!</div>}
                  <img src="/public/copy.png" alt="Copy" className="modal-icon" onClick={handleCopy} />
                </div>
                <button className="modal-close" onClick={() => setActiveSnippet(null)}>×</button>
              </div>
            </div>
            <pre className="modal-code"><code>{activeSnippet.code}</code></pre>
          </div>
        </div>
      )}

      {isEditingSnippet && activeSnippet && (
        <div className="code-modal-overlay">
          <div className="code-modal">
            <div className="modal-header">
              <span>{activeSnippet.title}</span>
              <div className="modal-icons">
                <div className="copy-wrapper">
                  {copied && <div className="copied-text">Copied!</div>}
                  <img
                    src="/public/copy.png"
                    alt="Copy"
                    className="modal-icon"
                    onClick={() => {
                      navigator.clipboard.writeText(editingCode);
                      setCopied(true);
                      setTimeout(() => setCopied(false), 2000);
                    }}
                  />
                </div>
                <button
                  className="modal-close"
                  onClick={() => {
                    setIsEditingSnippet(false);
                    setActiveSnippet(null);  // 🔑 hide view modal too
                  }}
                >
                  ×
                </button>

              </div>
            </div>

            <div className="modal-code" style={{
              flex: 1,
              padding: '1rem',
              overflow: 'hidden', // Disable modal scrolling
              display: 'flex'
            }}>
              <textarea
                value={editingCode}
                onChange={(e) => setEditingCode(e.target.value)}
                style={{
                  width: '100%',
                  height: '100%',
                  backgroundColor: 'transparent',
                  border: 'none',
                  color: '#f1f1f1',
                  fontFamily: 'Fira Code, monospace',
                  fontSize: '0.95rem',
                  resize: 'none',
                  outline: 'none',
                  overflow: 'auto', // Let textarea handle scrolling
                  paddingBottom: '4rem',
                  flex: 1 // Ensure it fills available space
                }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '1rem', background: '#2c2c2c' }}>
              <button className="btn btn-edit" onClick={handleSaveEditedSnippet}>Save</button>
              <button
                className="btn btn-delete"
                onClick={() => {
                  setIsEditingSnippet(false);
                  setActiveSnippet(null); // 🔑 close both
                }}
                style={{ marginLeft: '0.5rem' }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {showImageModal && (
        <div className="code-modal-overlay" onClick={() => setShowImageModal(false)}>
          <div
            className="code-modal"
            onClick={(e) => e.stopPropagation()}
            style={{
              width: 'auto',
              height: 'auto',
              padding: '1rem',
              backgroundColor: '#111',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              maxWidth: '90vw',
              maxHeight: '90vh'
            }}
          >
            <button
              className="modal-close"
              onClick={() => setShowImageModal(false)}
              style={{ alignSelf: 'flex-end', marginBottom: '0.5rem' }}
            >
              ×
            </button>
            <img
              src={profileImg}
              alt="Full Profile"
              style={{ maxWidth: '80vw', maxHeight: '80vh', borderRadius: '1rem' }}
            />
          </div>
        </div>
      )}


      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="code-modal-overlay">
          <div className="code-modal" style={{ width: '30vw', height: 'auto', padding: '2rem', textAlign: 'center' }}>
            <h2>Are you sure you want to delete your account?</h2>
            <p>Type 'delete' below to confirm account deletion.</p>
            <input
              type="text"
              value={deleteConfirm}
              onChange={e => {
                setDeleteConfirm(e.target.value);
                setDeleteError('');
              }}
              placeholder="delete"
              style={{
                padding: '0.5rem 1rem',
                borderRadius: '6px',
                border: '1px solid #ccc',
                width: '80%',
                margin: '1rem auto'
              }}
            />
            {deleteError && (
              <p style={{ color: 'red', marginTop: '-0.5rem' }}>{deleteError}</p>
            )}
            <div style={{ marginTop: '1rem' }}>
              <button
                className="btn btn-delete"
                onClick={handleAccountDelete}
              >
                Delete Account
              </button>
              <button
                className="btn btn-edit"
                onClick={() => {
                  setDeleteConfirm('');
                  setDeleteError('');
                  setShowDeleteModal(false);
                }}
                style={{ marginLeft: '1rem' }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Profile;
