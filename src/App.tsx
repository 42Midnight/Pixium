import { HashRouter as Router, Routes, Route, Outlet } from 'react-router-dom';
import WaterFall from './components/WaterFall/Waterfall';
import Detail from './components/Detail/Detail';
import Upload from './components/Upload/Upload';
import Settings from './components/Settings/Settings';
import CreateCollection from './components/CreateCollection/CreateCollection';
import EditCollection from './components/EditCollection/EditCollection';
import Favorites from './components/Favorites/Favorites';
import './index.css';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<WaterFall />} />
        <Route path="/:folderName" element={<WaterFall />} />
        <Route path="/detail/:fileName" element={<Detail />} />
        <Route path="/upload" element={<Upload />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/favorites" element={<Favorites />} />
        <Route path="/create-collection" element={<CreateCollection />} />
        <Route path="/edit-collection" element={<EditCollection />} />
      </Routes>
    </Router>
  );
}

export default App;
