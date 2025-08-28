import { Routes, Route, useLocation } from 'react-router-dom';
import Navbar from './assets/components/Navbar/Navbar.jsx';
import Spilit from './assets/components/Spilit/Spilit.jsx';
import SignIn from './assets/components/Auth/Login.jsx';
import SignUp from './assets/components/Auth/SignUpPage.jsx';
import Profile from './assets/components/Profile/Profile.jsx';
import { CodeProvider } from './context/CodeContext.jsx';

function App() {
  const location = useLocation();

  const hideNavbar = location.pathname !== '/';

  return (
    <CodeProvider>
      {!hideNavbar && <Navbar />}
      <Routes>
        <Route path="/" element={<Spilit />} />
        <Route path="/signin/*" element={<SignIn />} />
        <Route path="/signup/*" element={<SignUp />} />
        <Route path="/profile" element={<Profile />} />
      </Routes>
    </CodeProvider>
  );
}

export default App;
