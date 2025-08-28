import { useState, useEffect } from 'react';
import './Navbar.css';
import { useCode } from '../../../context/CodeContext';
import { useNavigate } from 'react-router-dom';
import { useUser, useAuth, SignOutButton } from '@clerk/clerk-react';

function Navbar() {
    const [showLangDropdown, setShowLangDropdown] = useState(false);
    const [showProfileDropdown, setShowProfileDropdown] = useState(false);
    const [selectedLang, setSelectedLang] = useState('Select Language');
    const [selectedIcon, setSelectedIcon] = useState('/language.png');
    const [showTimerControls, setShowTimerControls] = useState(false);
    const [isRunning, setIsRunning] = useState(false);
    const [time, setTime] = useState(0);
    const [showSaveModal, setShowSaveModal] = useState(false);
    const [filename, setFilename] = useState('');
    const [profileImage, setProfileImage] = useState('/public/user.png');
    const { setLanguage, runCode, code } = useCode();
    const navigate = useNavigate();
    const { isSignedIn, signOut } = useAuth();
    const { user } = useUser();

    const languages = [
        { name: 'C', icon: '/c.png' },
        { name: 'C++', icon: '/cpp.png' },
        { name: 'C#', icon: '/csharp.png' },
        { name: 'JavaScript', icon: '/javascript.png' },
        { name: 'Java', icon: '/java.png' },
        { name: 'Python', icon: '/python.png' },
        { name: 'Ruby', icon: '/ruby.png' },
        { name: 'Rust', icon: '/rust.png' },
        { name: 'Swift', icon: '/swift.png' },
        { name: 'Go', icon: '/go.png' },
    ];

    useEffect(() => {
        const fetchProfileImage = async () => {
            if (!isSignedIn || !user) return;

            try {
                const res = await fetch(`http://localhost:3001/api/get-user-profile?userId=${user.id}`);
                const data = await res.json();

                if (data?.profile_img && !data.profile_img.includes('/public/user.png')) {
                    setProfileImage(data.profile_img);
                } else {
                    setProfileImage('/public/user.png');
                }
            } catch (err) {
                console.error('❌ Failed to fetch profile image:', err.message);
                setProfileImage('/public/user.png');
            }
        };

        fetchProfileImage();
    }, [isSignedIn, user]);

    useEffect(() => {
        let timer;
        if (isRunning) {
            timer = setInterval(() => {
                setTime((prev) => prev + 1);
            }, 1000);
        }
        return () => clearInterval(timer);
    }, [isRunning]);


    const formatTime = (seconds) => {
        const hrs = Math.floor(seconds / 3600);
        const mins = Math.floor((seconds % 3600) / 60);
        const secs = seconds % 60;
        return `${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    };

    const handleSelect = (lang) => {
        setSelectedLang(lang.name);
        setSelectedIcon(lang.icon);
        setShowLangDropdown(false);
        setLanguage(lang.name.toLowerCase());
    };

    const toggleTimer = () => {
        if (isRunning) {
            setIsRunning(false);
        }
        setShowTimerControls((prev) => !prev);
    };

    const toggleRunning = (e) => {
        e.stopPropagation();
        setIsRunning((prev) => !prev);
    };

    const resetTimer = (e) => {
        e.stopPropagation();
        setIsRunning(false);
        setTime(0);
    };

    const handleRunCode = () => {
        if (selectedLang === 'Select Language') {
            alert('⚠️ Please select a language before running your code.');
        } else {
            runCode();
            console.log(`Running code in ${selectedLang}`);
        }
    };

    const handleSaveClick = () => {
        if (selectedLang === 'Select Language') {
            alert('⚠️ Please select a language before saving your code.');
            return;
        }

        if (!isSignedIn) {
            navigate('/signin');
        } else {
            setShowSaveModal(true);
        }
    };

    const handleSaveToDB = async () => {
        if (!filename.trim()) {
            alert("Please enter a file name");
            return;
        }

        try {
            const res = await fetch('http://localhost:3001/api/save-code', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    userId: user.id,
                    title: filename,
                    language: selectedLang,
                    code,
                }),
            });

            const data = await res.json();

            if (res.ok) {
                alert('✅ File saved successfully!');
                setFilename('');
                setShowSaveModal(false);
            } else if (res.status === 409) {
                alert('⚠️ A file with this name already exists. Please choose another name.');
            } else {
                console.error("❌ Failed to save:", data);
                alert(data.message || 'Failed to save code');
            }

        } catch (err) {
            console.error('Server error:', err);
            alert('Server error');
        }
    };

    return (
        <div className="navbar">
            <h1>CodeShelf</h1>
            <ul className="list">
            
                <li style={{ display: 'flex', alignItems: 'center' }}>
                    <div className="custom-dropdown">
                        <button
                            className="dropdown-toggle"
                            onClick={() => {
                                setShowLangDropdown((prev) => !prev);
                                setShowProfileDropdown(false);
                            }}
                        >
                            <img src={selectedIcon} alt="Selected Language" className="icon" />
                            {selectedLang}
                        </button>

                        {showLangDropdown && (
                            <ul className="dropdown-menu">
                                {languages.map((lang) => (
                                    <li key={lang.name} onClick={() => handleSelect(lang)}>
                                        <img src={lang.icon} alt={lang.name} className="icon" />
                                        {lang.name}
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>


                    <div className="timer-section" onClick={toggleTimer}>
                        <img src="public/timer.png" alt="Timer" className="icon timer-icon" />
                        <div className={`timer-controls-wrapper ${showTimerControls ? 'show' : ''}`}>
                            <div className="separator-line" />
                            <div className="timer-controls">
                                <button onClick={toggleRunning} className="play-pause-button">
                                    <img
                                        src={isRunning ? 'public/pause.png' : 'public/play.png'}
                                        alt={isRunning ? 'Pause' : 'Play'}
                                        className="icon"
                                    />
                                </button>
                                <span className="timer-display">{formatTime(time)}</span>
                                <button onClick={resetTimer} className="reset-button">
                                    <img src="public/reset.png" alt="Reset" className="icon" />
                                </button>
                            </div>
                        </div>
                    </div>
                </li>

                <li>
                    <button className="Run-button" onClick={handleRunCode}>
                        <img src="public/run.png" className="icon" alt="Run" />
                        Run Code
                    </button>
                </li>

                <li>
                    <button className="save-button" onClick={handleSaveClick}>
                        <img src="public/save.png" className="icon" alt="Save" />
                        Save Code
                    </button>
                </li>

                {/* Profile button with dropdown */}
                <li>
                    <div className="profile-dropdown-wrapper">
                        <button
                            className="profile-button"
                            onClick={() => {
                                if (!isSignedIn) {
                                    navigate('/signin');
                                } else {
                                    setShowProfileDropdown((prev) => !prev);
                                    setShowLangDropdown(false);
                                }
                            }}
                        >
                            <img
                                src={profileImage}
                                alt="Profile"
                                className="profile-img-icon"
                            />
                        </button>

                        {isSignedIn && showProfileDropdown && (
                            <ul className="profile-dropdown-menu">
                                <li onClick={() => {
                                    setShowProfileDropdown(false);
                                    navigate('/profile');
                                }}>
                                    Your Profile
                                    <img src="public/next.png" alt="Next" className="icon" />
                                </li>

                                <li onClick={async () => {
                                    await signOut();
                                    setShowProfileDropdown(false);
                                    navigate('/');
                                }}>
                                    Logout
                                    <img src="public/logout.png" alt="Logout" className="icon" />
                                </li>

                            </ul>
                        )}
                    </div>
                </li>

            </ul>

            {/* Save Modal */}
            {showSaveModal && (
                <div className="save-modal-overlay">
                    <div className="save-modal">
                        <h3>Save Your File</h3>
                        <input
                            type="text"
                            placeholder="Enter file name"
                            value={filename}
                            onChange={(e) => setFilename(e.target.value)}
                            className="save-input"
                        />
                        <div className="save-modal-buttons">
                            <button onClick={handleSaveToDB} className="modal-save-btn">Save</button>
                            <button onClick={() => setShowSaveModal(false)} className="modal-cancel-btn">Cancel</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default Navbar;