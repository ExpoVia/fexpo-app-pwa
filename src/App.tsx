import { Route, Routes, Navigate } from 'react-router-dom';
import { Shell } from './ui/Shell';
import { HomePage } from './pages/Home';
import { MapPage } from './pages/Map';
import { CheckinPage } from './pages/Checkin';
import { MissionsPage, RewardsPage } from './pages/Missions';
import { ProfilePage } from './pages/Profile';
import { StandsPage, StandPage } from './pages/Stands';
import { QrPage, NotificationsPage, EventPage, NotFoundPage } from './pages/Secondary';

export function App() {
  return (
    <Routes>
      <Route element={<Shell />}>
        <Route index element={<HomePage />} />
        <Route path="map" element={<MapPage />} />
        <Route path="scan" element={<CheckinPage />} />
        <Route path="missions" element={<MissionsPage />} />
        <Route path="profile" element={<ProfilePage />} />
        <Route path="stands" element={<StandsPage />} />
        <Route path="stands/:id" element={<StandPage />} />
        <Route path="my-qr" element={<QrPage />} />
        <Route path="rewards" element={<RewardsPage />} />
        <Route path="notifications" element={<NotificationsPage />} />
        <Route path="events/:id" element={<EventPage />} />
        <Route path="check-in" element={<Navigate to="/scan" replace />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}
