import { createRoot } from 'react-dom/client';
import { StylingApp } from './StylingApp';

const root=document.getElementById('stylingu-design-root');
if(root && window.stylinguDesign) createRoot(root).render(<StylingApp/>);
