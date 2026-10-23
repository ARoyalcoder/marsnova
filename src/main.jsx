import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { createRootRoute, createRoute, createRouter, Link, Outlet, RouterProvider } from '@tanstack/react-router';
import { ArrowDown, ArrowRight, ArrowUpRight, Instagram, Menu, Play, X } from 'lucide-react';
import RoutePage from './RoutePage';
import TurnstileWidget from './TurnstileWidget';
import { backendReady, supabase } from './lib/supabase';
import { industries, services } from './data';
import './style.css';

function HomePage() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [sent, setSent] = useState(false);
  const [captured,setCaptured]=useState(false);
  const [dark, setDark] = useState(() => {try{return localStorage.getItem('uxg-theme')!=='light'}catch{return true}});
  const [captchaToken,setCaptchaToken]=useState('');
  const [formNotice,setFormNotice]=useState('');
  const submit = (e) => {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    const msg = `Hi UXG Studio, I'm ${data.get('name')} from ${data.get('company') || 'my business'}. Phone: ${data.get('phone')}. Email: ${data.get('email')}. Industry: ${data.get('industry')}. Service: ${data.get('service')}. Budget: ${data.get('budget')}. Deadline: ${data.get('deadline')}. ${data.get('message')}`;
    if(backendReady&&import.meta.env.VITE_TURNSTILE_SITE_KEY){
      if(!captchaToken){setFormNotice('Please complete the verification before sending your brief.');return;}
      const whatsapp=window.open('about:blank','_blank');
      supabase.functions.invoke('submit-inquiry',{body:{full_name:data.get('name'),email:data.get('email'),phone:data.get('phone'),business_name:data.get('company'),industry:data.get('industry'),service:data.get('service'),estimated_budget:data.get('budget'),project_deadline:data.get('deadline'),brief_message:data.get('message'),turnstile_token:captchaToken}}).then(({error})=>{
        if(error){whatsapp?.close();setFormNotice('We could not save your enquiry. Please contact us by WhatsApp or email.');return;}
        const url=`https://wa.me/917208591595?text=${encodeURIComponent(msg)}`;if(whatsapp)whatsapp.location.href=url;else window.location.href=url;setSent(true);setFormNotice('Your brief is saved. WhatsApp is opening so you can add any details.');
      });return;
    }
    window.open(`https://wa.me/917208591595?text=${encodeURIComponent(msg)}`, '_blank', 'noopener,noreferrer');
    setSent(true);
  };
  const captureFrame=()=>{setCaptured(true);window.setTimeout(()=>setCaptured(false),950)};
  return <div className={dark ? 'site dark' : 'site light'}>
    <header className="topbar">
      <a href="#home" className="wordmark" aria-label="UXG Studio home">UXG<span>®</span><small>STUDIO</small></a>
      <nav className={menuOpen ? 'nav open' : 'nav'}>
        <a href="#work" onClick={() => setMenuOpen(false)}>Industries</a><a href="#services" onClick={() => setMenuOpen(false)}>Services</a><a href="#about" onClick={() => setMenuOpen(false)}>About</a>
        <Link to="/login" onClick={() => setMenuOpen(false)}>Login</Link><a href="#contact" className="nav-cta" onClick={() => setMenuOpen(false)}>Start your project <ArrowUpRight size={15}/></a>
      </nav>
      <div className="top-actions"><button className="theme-toggle" onClick={() => {const next=!dark;setDark(next);try{localStorage.setItem('uxg-theme',next?'dark':'light')}catch{}}} aria-label="Toggle color theme"><span /></button><button className="menu-toggle" onClick={() => setMenuOpen(!menuOpen)} aria-label="Toggle menu">{menuOpen ? <X/> : <Menu/>}</button></div>
    </header>
    <main>
      <section className="hero" id="home">
        <div className="hero-copy"><div className="eyebrow"><i/> MUMBAI · NAVI MUMBAI · THANE</div>
          <h1>We Shoot Content<br/>That <em>Grows</em><br/>Businesses.</h1>
          <p className="hero-desc">A Mumbai digital marketing, social media and video production agency — brand films, reels, ads, websites and social content, engineered to convert.</p>
          <div className="hero-links"><a className="button primary" href="#contact">Start your project <ArrowRight size={16}/></a><a className="text-link" href="#work">Explore industries <ArrowDown size={14}/></a></div>
          <div className="hero-foot"><span>Scroll to explore</span><span>19°12' N · 72°50' E</span></div>
        </div>
        <div className={`hero-image ${captured?'captured':''}`}><img src="https://images.unsplash.com/photo-1485846234645-a62644f84728?auto=format&fit=crop&w=1400&q=85" alt="Cinematographer filming a scene"/><div className="image-shade"/><div className="hero-image-caption"><span>01 / 04</span><span>Frames with feeling</span></div><button className="play-button" onClick={captureFrame} aria-label="Capture a frame"><Play fill="currentColor" size={18}/></button>{captured&&<span className="capture-label">FRAME CAPTURED</span>}<div className="vertical-label">UXG STUDIO · IN-HOUSE PRODUCTION</div></div>
        <div className="hero-index">01 <span>—</span> 04</div>
      </section>
      <section className="marquee" aria-label="Services"><div>{[...services,...services].map(([s],i)=><span key={i}>{s}<b>✳</b></span>)}</div></section>
      <section className="work section" id="work"><div className="section-head"><div><div className="eyebrow">INDUSTRIES</div><h2>Built for brands<br/><em>across every world.</em></h2></div><a href="#contact" className="circle-link" aria-label="Start a project"><ArrowUpRight/></a></div>
        <div className="work-grid">{industries.map(([title,area,copy,img],i)=><Link to={`/industries/${area}`} className={`work-card card-${i+1}`} key={title}><div className="work-photo"><img src={`https://images.unsplash.com/${img}?auto=format&fit=crop&w=1100&q=80`} alt={`${title} creative production`} loading="lazy"/><span className="work-num">0{i+1} / INDUSTRY</span><span className="work-arrow"><ArrowUpRight/></span></div><div className="work-meta"><div><h3>{title}</h3><p>{copy}</p></div><span>CONTENT · STORY</span></div></Link>)}</div>
        <div className="center-link"><a href="#contact" className="text-link">Have a project in mind? <ArrowRight size={15}/></a></div>
      </section>
      <section className="manifesto" id="about"><div className="manifesto-photo"><img src="https://images.unsplash.com/photo-1492619375914-88005aa9e8fb?auto=format&fit=crop&w=1300&q=85" alt="Creative production team working on set" loading="lazy"/><span>KANDIVALI BASED · MUMBAI FOCUSED</span></div><div className="manifesto-copy"><div className="eyebrow">ABOUT UXG STUDIO</div><h2>Kandivali based.<br/><em>Mumbai focused.</em></h2><p>We help businesses grow through premium content, cinematic storytelling and strategic media production — built for brands that treat their image as an asset. Shoot, edit and delivery, all in-house.</p><a className="button outline" href="#contact">Tell us about your project <ArrowUpRight size={15}/></a><div className="signature">Mumbai · Navi Mumbai · Thane <span>✳</span></div></div></section>
      <section className="team section"><div className="eyebrow">THE TEAM</div><h2>The people behind<br/><em>the frame.</em></h2><div className="team-grid"><article><span>01 / DIRECTION</span><h3>Creative direction</h3><p>Brand storytelling, visual language and content strategy across every project.</p></article><article><span>02 / PRODUCTION</span><h3>Production & cinematography</h3><p>On-location framing, lighting and direction for every shot.</p></article><article><span>03 / POST</span><h3>Post production</h3><p>Editing, colour grading, sound design and delivery for every platform.</p></article></div></section>
      <section className="services section" id="services"><div className="services-intro"><div className="eyebrow">THOUGHTFUL FROM START TO FINISH</div><h2>Ideas, meet<br/><em>execution.</em></h2><p>One team. Every step. All the details that turn a good idea into work worth remembering.</p></div><div className="service-list">{services.slice(0,10).map(([s,path],i)=><Link to={`/${path}`} key={s}><span>{String(i+1).padStart(2,'0')}</span><h3>{s}</h3><ArrowUpRight size={18}/></Link>)}</div></section>
      <section className="contact" id="contact"><div className="contact-left"><div className="eyebrow">HAVE A GOOD ONE IN MIND?</div><h2>Let’s make<br/><em>something matter.</em></h2><p>Tell us what you’re dreaming up. We’ll bring coffee, curiosity, and a few good ideas.</p><a href="https://wa.me/917208591595" className="contact-detail">WhatsApp <span>+91 72085 91595 <ArrowUpRight size={14}/></span></a><a href="mailto:contact@uxgstudio.in" className="contact-detail">Email <span>contact@uxgstudio.in <ArrowUpRight size={14}/></span></a></div>
        <form className="contact-form" onSubmit={submit}><div className="form-row"><label>Full name<input name="name" placeholder="The name we should know" required/></label><label>Company name<input name="company" placeholder="Your business name" required/></label></div><div className="form-row"><label>Phone number<input name="phone" type="tel" autoComplete="tel" required/></label><label>Email address<input name="email" type="email" placeholder="you@company.com" required/></label></div><div className="form-row"><label>Business type<select name="industry" defaultValue="" required><option value="" disabled>Select business type</option>{industries.map(([name])=><option key={name}>{name}</option>)}<option>Other</option></select></label><label>Service required<select name="service" defaultValue="" required><option value="" disabled>Select a service</option>{services.map(([s])=><option key={s}>{s}</option>)}</select></label></div><div className="form-row"><label>Monthly budget<select name="budget" defaultValue="" required><option value="" disabled>Select a budget</option><option>Under ₹50k</option><option>₹50k – ₹1.5L</option><option>₹1.5L – ₹5L</option><option>₹5L+</option></select></label><label>Project deadline<input name="deadline" type="date" required/></label></div><label>Message / project brief<textarea name="message" rows="3" placeholder="What do you want to create?" required/></label><TurnstileWidget onToken={setCaptchaToken}/><button className="button primary" type="submit">{sent ? 'Opening WhatsApp…' : 'Start your project'} <ArrowUpRight size={16}/></button><small>Your details open directly in WhatsApp — no waiting on email.</small>{formNotice&&<small role="status">{formNotice}</small>}</form>
      </section>
    </main>
    <section className="home-links"><div><h3>Areas we serve</h3>{['Mumbai','Thane','Navi Mumbai','Borivali','Kandivali','Malad','Andheri','Bandra','Powai'].map(x=><Link to={`/locations/${x.toLowerCase().replaceAll(' ','-')}`} key={x}>{x}</Link>)}</div><div><h3>Explore UXG</h3><Link to="/portfolio">Portfolio</Link><Link to="/case-studies">Case studies</Link><Link to="/blog">Journal</Link><Link to="/join-our-team">Join our team</Link></div><div><h3>Frequently asked</h3><details><summary>What services does UXG Studio offer?</summary><p>Video, photography, editing, social media, websites, brand content, event coverage, streaming and digital marketing.</p></details><details><summary>Which areas do you cover?</summary><p>Mumbai, Thane and Navi Mumbai, including Kandivali, Borivali, Malad, Andheri, Bandra and Powai.</p></details><details><summary>How do I get a quote?</summary><p>Send your brief through the form or WhatsApp and the team will follow up with scope, timeline and quote.</p></details></div></section>
    <footer><a href="#home" className="wordmark">UXG<span>®</span><small>STUDIO</small></a><span>KANDIVALI BASED · MUMBAI FOCUSED</span><div><a href="https://www.instagram.com/uxgstudio" aria-label="Instagram"><Instagram size={17}/></a><a href="mailto:contact@uxgstudio.in">EMAIL ↗</a><Link to="/privacy">PRIVACY</Link><Link to="/terms">TERMS</Link></div><small>© UXG STUDIO 2026</small></footer>
  </div>;
}

const rootRoute=createRootRoute({component:()=> <Outlet/>,notFoundComponent:RoutePage});
const indexRoute=createRoute({getParentRoute:()=>rootRoute,path:'/',component:HomePage});
const staticPaths=['/portfolio','/case-studies','/blog','/join-our-team','/privacy','/terms','/login','/recovery','/change-password','/portal','/admin'];
const dynamicPaths=['/portfolio/$slug','/case-studies/$slug','/blog/$slug','/portal/projects/$projectId','/industries/$slug','/locations/$slug',...services.map(([,path])=>`/${path}`)];
const siteRoutes=[...new Set([...staticPaths,...dynamicPaths])].map(path=>createRoute({getParentRoute:()=>rootRoute,path:path.replace(/^\//,''),component:RoutePage}));
const router=createRouter({routeTree:rootRoute.addChildren([indexRoute,...siteRoutes])});
function App(){return <RouterProvider router={router}/>}
createRoot(document.getElementById('root')).render(<App/>);
