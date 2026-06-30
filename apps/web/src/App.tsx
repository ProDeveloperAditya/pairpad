import { Routes, Route } from 'react-router-dom';
import { ThemeProvider } from './lib/theme';
import { Home } from './pages/Home';
import { Room } from './pages/Room';

export function App() {
  return (
    <ThemeProvider>
      <div className="gradient-mesh" aria-hidden="true" />
      <div className="relative z-10 min-h-dvh">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/room/:id" element={<Room />} />
        </Routes>
      </div>
    </ThemeProvider>
  );
}
