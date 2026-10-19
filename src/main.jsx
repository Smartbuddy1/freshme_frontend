import React, { lazy, Suspense, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Routes, Route, useLocation, useParams } from 'react-router-dom';
import '@fontsource/fredoka/latin-500.css';
import '@fontsource/fredoka/latin-600.css';
import '@fontsource/dm-sans/latin-400.css';
import '@fontsource/dm-sans/latin-500.css';
import '@fontsource/dm-sans/latin-600.css';
import '@fontsource/dm-sans/latin-700.css';
import './styles.css';
import './audit-fixes.css';
import { Menu, Token } from './store.jsx';
import { OfflineBanner, Empty, unlockScroll } from './components.jsx';
const Admin = lazy(() => import('./admin.jsx'));
const SuperAdmin = lazy(() => import('./super-admin.jsx'));
function ShopMenu(){const {shopSlug}=useParams();return <Menu key={shopSlug}/>;}
function ShopToken(){const {shopSlug,id}=useParams();return <Token key={shopSlug+id}/>;}

function ScrollReset() {
  const { pathname } = useLocation();
  useEffect(() => {
    unlockScroll();
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}

class Boundary extends React.Component {
  state = { error: false };
  static getDerivedStateFromError() { return { error: true }; }
  render() { return this.state.error ? <Empty title="Let’s try that again"><button className="primary" onClick={() => location.reload()}>Reload Fresh Me</button></Empty> : this.props.children; }
}
createRoot(document.getElementById('root')).render(
  <Boundary>
    <BrowserRouter basename={location.pathname === '/freshme' || location.pathname.startsWith('/freshme/') ? '/freshme' : '/'}>
      <ScrollReset />
      <OfflineBanner />
      <Suspense fallback={<div className="page-loading">Getting things fresh…</div>}>
        <Routes>
          <Route path="/" element={<Menu />} />
          <Route path="/admin/*" element={<Admin />} />
          <Route path="/super-admin/*" element={<SuperAdmin />} />
          <Route path="/order/:id" element={<Token />} />
          <Route path="/shop/:shopSlug" element={<ShopMenu />} />
          <Route path="/shop/:shopSlug/order/:id" element={<ShopToken />} />
          <Route path="/fresheme/:shopSlug" element={<ShopMenu />} />
          <Route path="/fresheme/:shopSlug/order/:id" element={<ShopToken />} />
          <Route path="/:shopSlug" element={<ShopMenu />} />
          <Route path="/:shopSlug/order/:id" element={<ShopToken />} />
          <Route path="*" element={<Empty title="This flavor is off the menu"><a href="/freshme">Back to Fresh Me</a></Empty>} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  </Boundary>
);

