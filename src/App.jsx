import React, { useState, useEffect } from 'react'
import Scene from './Scene'
import { CheckCircle, ShieldCheck, Zap, Lock, Mail, Instagram, Twitter, Facebook } from 'lucide-react'
import { motion } from 'framer-motion'

// Custom FadeIn component for reusable animations
const FadeIn = ({ children, delay = 0 }) => {
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: 0.6, delay }}
        >
            {children}
        </motion.div>
    );
};

// ── Store config ──────────────────────────────────────────────────
const CLOVER_CHECKOUT_WORKER = 'https://lashoedepeugh-checkout.lashoedepeugh.workers.dev';
const WEB3FORMS_ACCESS_KEY = '2aa7b618-3036-4ecc-8a7f-a68e50712d80';
const BOTTLE_PRICE = 14.99; // base / single-bottle price
const BULK_MIN_QTY = 12;
const MAX_RETAIL_QTY = 11;
// Volume discount — per-bottle price drops as the cart grows. MUST stay in sync
// with unitPriceCentsFor() in the Cloudflare Worker (the Worker is what actually
// charges the card). 1 → $14.99 · 2–4 → $12.99 ea · 5–8 → $12.99 ea (+free ship) · 9–11 → $11.59 ea
const unitPriceFor = (q) => (q >= 9 ? 11.59 : q >= 2 ? 12.99 : BOTTLE_PRICE);
// Flat shipping per order — mirrors the Cloudflare Worker (display only; the Worker
// is the source of truth for what's actually charged).
const shippingFor = (q) => (q >= 5 ? 0 : q >= 3 ? 1.95 : q === 2 ? 3.95 : 5.95);
const usd = (n) => `$${n.toFixed(2)}`;

// ── Retail checkout: Clover Hosted Checkout via the Cloudflare Worker ──
const BuyWidget = ({ onBulk }) => {
    const [qty, setQty] = useState(1);
    const [status, setStatus] = useState('idle'); // idle | loading | error
    const [error, setError] = useState('');

    const unitPrice = unitPriceFor(qty);
    const shipping = shippingFor(qty);
    const subtotal = unitPrice * qty;
    const savings = (BOTTLE_PRICE - unitPrice) * qty;
    const total = subtotal + shipping;

    const checkout = async () => {
        setStatus('loading');
        setError('');
        try {
            const res = await fetch(CLOVER_CHECKOUT_WORKER, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ quantity: qty }),
            });
            const data = await res.json().catch(() => ({}));
            if (data.href) {
                window.location.href = data.href; // off to Clover's secure hosted page
            } else {
                setStatus('error');
                setError(data.error || 'Checkout is temporarily unavailable. Please try again.');
            }
        } catch {
            setStatus('error');
            setError('Network error. Please try again.');
        }
    };

    const stepBtn = { width: 44, height: 44, borderRadius: '0.6rem', border: '1px solid rgba(255,255,255,0.25)', background: 'rgba(255,255,255,0.06)', color: '#fff', fontSize: '1.4rem', cursor: 'pointer', lineHeight: 1 };
    const row = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: 'rgba(255,255,255,0.85)', padding: '0.35rem 0' };

    return (
        <div style={{ maxWidth: 460, margin: '0 auto', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '1rem', padding: '2rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
                <span style={{ color: 'rgba(255,255,255,0.7)' }}>Quantity</span>
                <button type="button" onClick={() => setQty((q) => Math.max(1, q - 1))} style={stepBtn} aria-label="Decrease quantity">−</button>
                <span style={{ minWidth: 32, textAlign: 'center', color: '#fff', fontSize: '1.5rem', fontWeight: 700 }}>{qty}</span>
                <button type="button" onClick={() => setQty((q) => Math.min(MAX_RETAIL_QTY, q + 1))} style={stepBtn} aria-label="Increase quantity">+</button>
            </div>

            <div style={{ borderTop: '1px solid rgba(255,255,255,0.1)', borderBottom: '1px solid rgba(255,255,255,0.1)', padding: '0.75rem 0', marginBottom: '1.5rem' }}>
                <div style={row}><span>{qty} × bottle</span><span>{usd(BOTTLE_PRICE * qty)}</span></div>
                {savings > 0 && (
                    <div style={{ ...row, color: '#86e3a3' }}>
                        <span>Volume discount ({usd(unitPrice)}/bottle)</span>
                        <span>−{usd(savings)}</span>
                    </div>
                )}
                <div style={row}><span>Shipping (USA)</span><span>{shipping === 0 ? 'FREE' : usd(shipping)}</span></div>
                <div style={{ ...row, color: '#fff', fontWeight: 700, fontSize: '1.25rem', paddingTop: '0.6rem' }}><span>Total</span><span>{usd(total)}</span></div>
            </div>

            <button type="button" onClick={checkout} disabled={status === 'loading'} className="btn btn-primary" style={{ width: '100%', background: '#fff', color: '#121f28', fontSize: '1.1rem', padding: '1rem' }}>
                {status === 'loading' ? 'Taking you to checkout…' : `Buy Now — ${usd(total)}`}
            </button>

            {status === 'error' && <p style={{ color: '#ffb4b4', fontSize: '0.9rem', marginTop: '0.75rem' }}>{error}</p>}

            <p style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.55)', marginTop: '1rem' }}>
                {qty < 2
                    ? `Add 1 more to save — 2+ bottles are just ${usd(unitPriceFor(2))} each. `
                    : qty < 5
                        ? `Add ${5 - qty} more for FREE shipping. `
                        : qty < 9
                            ? `Add ${9 - qty} more to drop to ${usd(unitPriceFor(9))}/bottle. `
                            : 'Best price unlocked — FREE shipping too! '}
                Secure checkout powered by Clover.
            </p>
            <button type="button" onClick={onBulk} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.75)', textDecoration: 'underline', cursor: 'pointer', marginTop: '0.75rem', fontSize: '0.9rem' }}>
                Ordering {BULK_MIN_QTY}+ bottles? Request bulk / wholesale pricing →
            </button>
        </div>
    );
};

// ── Bulk / wholesale request: emails the details via Web3Forms ──
const BulkRequestForm = ({ onBack }) => {
    const [form, setForm] = useState({ name: '', email: '', phone: '', quantity: '', message: '' });
    const [status, setStatus] = useState('idle'); // idle | submitting | success | error
    const [error, setError] = useState('');
    const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

    const submit = async (e) => {
        e.preventDefault();
        if (!form.name.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email) || !form.quantity) {
            setStatus('error');
            setError('Please enter your name, a valid email, and the quantity you need.');
            return;
        }
        setStatus('submitting');
        setError('');
        try {
            const res = await fetch('https://api.web3forms.com/submit', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
                body: JSON.stringify({
                    access_key: WEB3FORMS_ACCESS_KEY,
                    subject: `Bulk Order Request — ${form.quantity} bottles`,
                    from_name: 'La Shoe de Peugh Website',
                    name: form.name,
                    email: form.email,
                    phone: form.phone,
                    quantity: form.quantity,
                    message: form.message,
                }),
            });
            const data = await res.json().catch(() => ({}));
            if (data.success) {
                setStatus('success');
            } else {
                setStatus('error');
                setError(data.message || 'Something went wrong. Please try again.');
            }
        } catch {
            setStatus('error');
            setError('Network error. Please try again.');
        }
    };

    if (status === 'success') {
        return (
            <div style={{ maxWidth: 460, margin: '0 auto', padding: '2rem', background: 'rgba(46,139,87,0.18)', borderRadius: '1rem', border: '1px solid rgba(255,255,255,0.18)' }}>
                <p style={{ color: '#fff', fontSize: '1.1rem', margin: 0, lineHeight: 1.6 }}>Thanks! Your bulk request is in — we'll email you a custom quote shortly. 🌿</p>
                <button type="button" onClick={onBack} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.8)', textDecoration: 'underline', cursor: 'pointer', marginTop: '1rem' }}>← Back to checkout</button>
            </div>
        );
    }

    return (
        <form onSubmit={submit} style={{ maxWidth: 460, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '0.9rem', textAlign: 'left' }}>
            <input className="input-premium" placeholder="Your name" value={form.name} onChange={set('name')} required />
            <input className="input-premium" type="email" placeholder="Email" value={form.email} onChange={set('email')} required />
            <input className="input-premium" placeholder="Phone (optional)" value={form.phone} onChange={set('phone')} />
            <input className="input-premium" type="number" min={BULK_MIN_QTY} placeholder={`Quantity needed (${BULK_MIN_QTY}+)`} value={form.quantity} onChange={set('quantity')} required />
            <textarea className="input-premium" rows={3} placeholder="Anything else? (optional)" value={form.message} onChange={set('message')} style={{ resize: 'vertical' }} />
            <button type="submit" className="btn btn-primary" disabled={status === 'submitting'} style={{ background: '#fff', color: '#121f28' }}>
                {status === 'submitting' ? 'Sending…' : 'Request Bulk Pricing'}
            </button>
            {status === 'error' && <p style={{ color: '#ffb4b4', fontSize: '0.9rem', margin: 0 }}>{error}</p>}
            <button type="button" onClick={onBack} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.7)', textDecoration: 'underline', cursor: 'pointer', fontSize: '0.9rem' }}>← Back to standard checkout</button>
        </form>
    );
};

// Toggles between buying (1–11) and the bulk request form (12+).
const StoreWidget = () => {
    const [mode, setMode] = useState('buy');
    return mode === 'buy'
        ? <BuyWidget onBulk={() => setMode('bulk')} />
        : <BulkRequestForm onBack={() => setMode('buy')} />;
};

// ── Visitor counter ───────────────────────────────────────────────
// Per-browser counter: seeds a random starting number on first visit, bumps it
// each time the page loads, and ticks up slowly while the visitor is on the page.
// Stored in localStorage so it keeps climbing for returning visitors.
const VisitorCounter = () => {
    const [count, setCount] = useState(null);

    useEffect(() => {
        const KEY = 'lsdp_visitor_count';
        let n = parseInt(localStorage.getItem(KEY), 10);
        if (!Number.isFinite(n)) {
            n = 13000 + Math.floor(Math.random() * 4000); // random seed: 13,000–17,000
        }
        n += 1; // count this visit
        localStorage.setItem(KEY, String(n));
        setCount(n);

        // Gentle live tick while they're on the page.
        const id = setInterval(() => {
            setCount((c) => {
                const next = c + 1;
                localStorage.setItem(KEY, String(next));
                return next;
            });
        }, 9000);
        return () => clearInterval(id);
    }, []);

    if (count === null) return null;

    return (
        <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: '0.85rem', marginTop: '1.5rem', letterSpacing: '0.05em' }}>
            <span role="img" aria-label="eyes">👀</span>{' '}
            <strong style={{ color: 'rgba(255,255,255,0.7)' }}>{count.toLocaleString()}</strong> have visited to save their soles{' '}
            <span role="img" aria-label="sneaker" style={{ fontSize: '2.5rem', verticalAlign: 'middle', display: 'inline-block', marginLeft: '0.25rem' }}>👟</span>
        </p>
    );
};

function App() {
    return (
        <div className="app">
            {/* Premium Navigation */}
            <nav className="navbar">
                <div className="container" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h2 style={{ fontSize: '1.2rem', margin: 0 }}>LA SHOE DE PEUGH</h2>
                    <div style={{ display: 'flex', gap: '2rem', alignItems: 'center' }}>
                        <a href="#about" className="nav-link">Story</a>
                        <a href="#features" className="nav-link">Features</a>
                        <a href="#gallery" className="nav-link">Gallery</a>
                        <a href="#notify" className="btn btn-primary" style={{ padding: '0.6rem 1.5rem', fontSize: '0.9rem' }}>Buy Now</a>
                    </div>
                </div>
            </nav>

            {/* Hero Section */}
            <section className="hero">
                <div className="container" style={{ display: 'flex', height: '100%' }}>
                    <div className="hero-content">
                        <motion.h1
                            className="hero-title"
                            initial={{ opacity: 0, y: 30 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.8, ease: "easeOut" }}
                        >
                            The Evolution of Freshness.
                        </motion.h1>
                        <motion.p
                            className="hero-tagline"
                            initial={{ opacity: 0, y: 30 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.8, delay: 0.2, ease: "easeOut" }}
                            style={{ maxWidth: '600px', lineHeight: '1.8' }}
                        >
                            Step into freshness with La Shoe de Peugh Shoe & Foot Deodorizing Spray, the effortless way to keep every step clean, cool, and confidently odor-free. Made with a crisp peppermint scent, this spray works instantly to neutralize unwanted odors while leaving shoes and feet smelling refreshingly clean.
                        </motion.p>
                        <motion.div
                            className="btn-group"
                            style={{ display: 'flex', gap: '1rem' }}
                            initial={{ opacity: 0, y: 30 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.8, delay: 0.4, ease: "easeOut" }}
                        >
                            <a href="#notify" className="btn btn-primary">Buy Now</a>
                            <a href="#about" className="btn btn-outline">Discover the Science</a>
                        </motion.div>
                    </div>
                </div>
                <div className="hero-3d">
                    <Scene />
                </div>
            </section>

            {/* Value Proposition */}
            <section id="about" style={{ position: 'relative', zIndex: 10 }}>
                <div className="container">
                    <FadeIn>
                        <div className="glass-card" style={{ padding: '5rem 3rem', textAlign: 'center', background: 'var(--bg-gradient)' }}>
                            <h2 style={{ fontSize: 'clamp(2rem, 4vw, 3rem)', marginBottom: '1.5rem' }}>Eliminate Odors with Absolute Confidence</h2>
                            <p style={{ fontSize: '1.25rem', color: 'var(--text-light)', maxWidth: '800px', margin: '0 auto 2rem auto', lineHeight: '1.8' }}>
                                Peppermint oil tackles smelly feet and shoes with its crisp, naturally deodorizing power. It neutralizes stubborn odors at the source, while its strong, refreshing menthol scent revitalizes the skin and provides a long-lasting clean, cool feeling.
                            </p>

                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '2rem', textAlign: 'left', marginTop: '3rem' }}>
                                <div style={{ background: 'rgba(255,255,255,0.05)', padding: '2rem', borderRadius: '1rem' }}>
                                    <h4 style={{ fontSize: '1.3rem', marginBottom: '1rem', color: 'var(--accent)' }}>How It Works on Feet</h4>
                                    <ul style={{ listStyleType: 'none', padding: 0 }}>
                                        <li style={{ marginBottom: '1rem' }}><strong>Neutralizes Odor:</strong> Peppermint oil naturally breaks down and neutralizes the odors that build up on tired feet.</li>
                                        <li><strong>Cooling & Soothing:</strong> Menthol provides a revitalizing, cooling sensation and helps soothe tired feet.</li>
                                    </ul>
                                </div>
                                <div style={{ background: 'rgba(255,255,255,0.05)', padding: '2rem', borderRadius: '1rem' }}>
                                    <h4 style={{ fontSize: '1.3rem', marginBottom: '1rem', color: '#4a90e2' }}>How It Works on Shoes</h4>
                                    <ul style={{ listStyleType: 'none', padding: 0 }}>
                                        <li style={{ marginBottom: '1rem' }}><strong>Deodorizes & Freshens:</strong> Strong aroma effectively neutralizes and helps keep away unpleasant shoe odors.</li>
                                        <li><strong>Keeps Them Fresh:</strong> Regular use helps keep new odors from building up inside the shoes.</li>
                                    </ul>
                                </div>
                            </div>
                        </div>
                    </FadeIn>
                </div>
            </section>

            {/* Features Section */}
            <section id="features">
                <div className="container">
                    <FadeIn>
                        <h2 className="section-title">Engineered for Performance</h2>
                    </FadeIn>
                    <div className="features-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '2rem' }}>
                        <FadeIn delay={0.1}>
                            <div className="glass-card" style={{ padding: '3rem 2rem', height: '100%' }}>
                                <div style={{ background: 'rgba(46, 139, 87, 0.1)', padding: '1rem', borderRadius: '1rem', display: 'inline-block', marginBottom: '1.5rem' }}>
                                    <ShieldCheck size={32} color="var(--accent)" />
                                </div>
                                <h3 style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>Odor Neutralizing</h3>
                                <p style={{ color: 'var(--text-light)' }}>Actively targets and neutralizes odors directly at the source for fresh, long-lasting odor control.</p>
                            </div>
                        </FadeIn>
                        <FadeIn delay={0.2}>
                            <div className="glass-card" style={{ padding: '3rem 2rem', height: '100%' }}>
                                <div style={{ background: 'rgba(168, 216, 234, 0.2)', padding: '1rem', borderRadius: '1rem', display: 'inline-block', marginBottom: '1.5rem' }}>
                                    <CheckCircle size={32} color="#4a90e2" />
                                </div>
                                <h3 style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>Non-Medicated & Safe</h3>
                                <p style={{ color: 'var(--text-light)' }}>Our formula is completely non-medicated and safe for daily use on both feet and footwear without any sticky residue.</p>
                            </div>
                        </FadeIn>
                        <FadeIn delay={0.3}>
                            <div className="glass-card" style={{ padding: '3rem 2rem', height: '100%' }}>
                                <div style={{ background: 'rgba(255, 193, 7, 0.1)', padding: '1rem', borderRadius: '1rem', display: 'inline-block', marginBottom: '1.5rem' }}>
                                    <Lock size={32} color="#ffc107" />
                                </div>
                                <h3 style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>Locking Spray Nozzle</h3>
                                <p style={{ color: 'var(--text-light)' }}>Designed for athletes, professionals, and anyone on the go. Features a locking spray nozzle perfect for travel and toss-and-go convenience.</p>
                            </div>
                        </FadeIn>
                        <FadeIn delay={0.4}>
                            <div className="glass-card" style={{ padding: '3rem 2rem', height: '100%' }}>
                                <div style={{ background: 'rgba(46, 139, 87, 0.1)', padding: '1rem', borderRadius: '1rem', display: 'inline-block', marginBottom: '1.5rem' }}>
                                    <Zap size={32} color="var(--accent)" />
                                </div>
                                <h3 style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>The Peppermint Difference</h3>
                                <p style={{ color: 'var(--text-light)' }}>Infused with crisp peppermint oil to provide a revitalizing, cooling sensation while naturally enhancing freshness and soothing the skin.</p>
                            </div>
                        </FadeIn>
                    </div>

                    {/* Ingredients Section */}
                    <FadeIn delay={0.5}>
                        <div className="ingredients-box" style={{ marginTop: '4rem', padding: '3rem', background: 'rgba(255, 255, 255, 0.4)', borderRadius: '1rem', backdropFilter: 'blur(10px)', border: '1px solid rgba(255, 255, 255, 0.5)', textAlign: 'center' }}>
                            <h3 style={{ fontSize: '1.8rem', marginBottom: '1rem' }}>Pure Ingredients</h3>
                            <p style={{ fontSize: '1.1rem', color: 'var(--text-dark)', lineHeight: '1.8', maxWidth: '800px', margin: '0 auto' }}>
                                <strong>Ingredients:</strong> Distilled Water, Alcohol-Free Steam Distilled Witch Hazel, 100% Pure and Natural Peppermint Essential Oil Steam Distilled from the Leaf, Calcium Bentonite.
                            </p>
                        </div>
                    </FadeIn>
                </div>
            </section>

            {/* Product Showcase */}
            <section id="product-showcase" style={{ padding: '4rem 0', position: 'relative', zIndex: 10 }}>
                <div className="container">
                    <FadeIn>
                        <h2 className="section-title">Our Premium Design</h2>
                    </FadeIn>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '2rem', justifyContent: 'center' }}>
                        {["20260201_193347.png", "20260201_193632.png", "20260201_194022.png"].map((imgSrc, index) => (
                            <FadeIn key={index} delay={index * 0.1}>
                                <div className="glass-card" style={{ padding: '2rem', display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
                                    <img src={`/assets/${imgSrc}`} alt={`Product View ${index + 1}`} style={{ maxHeight: '400px', objectFit: 'contain', filter: 'drop-shadow(0 10px 20px rgba(0,0,0,0.15))' }} loading="lazy" />
                                </div>
                            </FadeIn>
                        ))}
                    </div>
                </div>
            </section>

            {/* Image Gallery */}
            <section id="gallery">
                <div className="container">
                    <FadeIn>
                        <h2 className="section-title">Fresh Fits for Every Footwear</h2>
                    </FadeIn>
                    <div className="gallery-grid">
                        {[
                            "lsdp_gym_shoes.jpg", "lsdp_office_shoes.jpg", "lsdp_work_boots.jpg",
                            "lsdp_slippers.jpg", "lsdp_kids_shoes.jpg", "lsdp_skate_shoes.jpg",
                            "lsdp_winter_boots.jpg", "lsdp_motorcycle_boots.jpg", "lsdp_jogging_shoes.jpg"
                        ].map((imgSrc, index) => (
                            <FadeIn key={index} delay={index * 0.05}>
                                <div className="gallery-item glass-card">
                                    <img src={`/assets/${imgSrc}`} alt={`LaShoeDePeugh Application ${index + 1}`} loading="lazy" />
                                </div>
                            </FadeIn>
                        ))}
                    </div>
                    <FadeIn>
                        <p style={{ textAlign: 'center', marginTop: '4rem', fontSize: 'clamp(2.25rem, 5vw, 3.5rem)', fontWeight: 700, fontStyle: 'italic', lineHeight: 1.3, color: 'var(--text-light)' }}>
                            Perfect for <strong>sneakers, boots, heels, work shoes & more.</strong>
                        </p>
                    </FadeIn>
                </div>
            </section>

            {/* Testimonials */}
            <section id="testimonials" style={{ padding: '6rem 0' }}>
                <div className="container">
                    <FadeIn>
                        <h2 className="section-title">What People Are Saying</h2>
                        <p style={{ textAlign: 'center', color: 'var(--text-light)', maxWidth: '600px', margin: '0 auto 4rem auto', fontSize: '1.2rem' }}>
                            Discover why athletes, professionals, and everyday people trust La Shoe de Peugh for guaranteed freshness.
                        </p>
                    </FadeIn>
                    <div className="testimonials-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem' }}>
                        <FadeIn delay={0.1}>
                            <div className="testimonial-card glass-card" style={{ padding: '2.5rem 2rem', borderTop: '4px solid var(--accent)' }}>
                                <div style={{ display: 'flex', gap: '0.2rem', marginBottom: '1rem', color: '#ffc107' }}>
                                    ★★★★★
                                </div>
                                <p style={{ fontSize: '1.1rem', fontStyle: 'italic', marginBottom: '2rem', lineHeight: '1.6' }}>
                                    "I work 12-hour shifts constantly on my feet. This spray is a lifesaver. The peppermint smells amazing and it completely handles the odors. Highly recommend."
                                </p>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                    <div style={{ width: '40px', height: '40px', background: 'var(--accent)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 'bold' }}>JR</div>
                                    <div>
                                        <h4 style={{ margin: 0, fontSize: '1rem' }}>James R.</h4>
                                        <span style={{ fontSize: '0.85rem', color: 'var(--text-light)' }}>Healthcare Worker</span>
                                    </div>
                                </div>
                            </div>
                        </FadeIn>

                        <FadeIn delay={0.2}>
                            <div className="testimonial-card glass-card" style={{ padding: '2.5rem 2rem', borderTop: '4px solid #4a90e2' }}>
                                <div style={{ display: 'flex', gap: '0.2rem', marginBottom: '1rem', color: '#ffc107' }}>
                                    ★★★★★
                                </div>
                                <p style={{ fontSize: '1.1rem', fontStyle: 'italic', marginBottom: '2rem', lineHeight: '1.6' }}>
                                    "I bought this for my gym bag and my life will never be the same. My gym shoes are usually horrid, but 2 mists of this after my workout and they smell minty fresh the next day."
                                </p>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                    <div style={{ width: '40px', height: '40px', background: '#4a90e2', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 'bold' }}>SK</div>
                                    <div>
                                        <h4 style={{ margin: 0, fontSize: '1rem' }}>Sarah K.</h4>
                                        <span style={{ fontSize: '0.85rem', color: 'var(--text-light)' }}>Fitness Enthusiast</span>
                                    </div>
                                </div>
                            </div>
                        </FadeIn>

                        <FadeIn delay={0.3}>
                            <div className="testimonial-card glass-card" style={{ padding: '2.5rem 2rem', borderTop: '4px solid var(--accent)' }}>
                                <div style={{ display: 'flex', gap: '0.2rem', marginBottom: '1rem', color: '#ffc107' }}>
                                    ★★★★★
                                </div>
                                <p style={{ fontSize: '1.1rem', fontStyle: 'italic', marginBottom: '2rem', lineHeight: '1.6' }}>
                                    "Finally, a deodorizer that doesn't just smell like chemicals. The cooling sensation on my feet is a great bonus. Perfect for my kids' sports cleats too!"
                                </p>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                    <div style={{ width: '40px', height: '40px', background: 'var(--text-dark)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 'bold' }}>MT</div>
                                    <div>
                                        <h4 style={{ margin: 0, fontSize: '1rem' }}>Marcus T.</h4>
                                        <span style={{ fontSize: '0.85rem', color: 'var(--text-light)' }}>Parent & Coach</span>
                                    </div>
                                </div>
                            </div>
                        </FadeIn>
                    </div>
                </div>
            </section>

            {/* Contact / Notify / Pre-order Section */}
            <section id="notify" style={{ position: 'relative', overflow: 'hidden' }}>
                <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', background: '#121f28', zIndex: 0 }}></div>
                <div className="container" style={{ position: 'relative', zIndex: 1 }}>
                    <FadeIn>
                        <div className="glass-card" style={{ padding: '5rem 3rem', textAlign: 'center', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}>
                            <h2 style={{ fontSize: '3rem', marginBottom: '1rem', color: '#fff' }}>Order Yours Today</h2>
                            <p style={{ marginBottom: '3rem', fontSize: '1.2rem', color: 'rgba(255,255,255,0.7)', maxWidth: '600px', margin: '0 auto 3rem auto' }}>
                                Fresh peppermint protection, shipped to your door. Buy a single bottle or stock up — shipping drops as you add more, and orders of 5+ ship FREE.
                            </p>
                            <StoreWidget />
                        </div>
                    </FadeIn>
                </div>
            </section>

            {/* Footer */}
            <footer style={{ padding: '4rem 0', background: '#0a1117', color: '#fff', textAlign: 'center' }}>
                <div className="container">
                    <h2 style={{ color: '#fff', marginBottom: '2rem', fontSize: '1.5rem', letterSpacing: '0.1em' }}>LA SHOE DE PEUGH</h2>
                    <div style={{ display: 'flex', justifyContent: 'center', gap: '2rem', marginBottom: '3rem' }}>
                        <a href="#" style={{ color: 'rgba(255,255,255,0.6)', transition: 'color 0.3s' }} onMouseOver={e => e.currentTarget.style.color = '#fff'} onMouseOut={e => e.currentTarget.style.color = 'rgba(255,255,255,0.6)'}><Instagram size={24} /></a>
                        <a href="#" style={{ color: 'rgba(255,255,255,0.6)', transition: 'color 0.3s' }} onMouseOver={e => e.currentTarget.style.color = '#fff'} onMouseOut={e => e.currentTarget.style.color = 'rgba(255,255,255,0.6)'}><Twitter size={24} /></a>
                        <a href="#" style={{ color: 'rgba(255,255,255,0.6)', transition: 'color 0.3s' }} onMouseOver={e => e.currentTarget.style.color = '#fff'} onMouseOut={e => e.currentTarget.style.color = 'rgba(255,255,255,0.6)'}><Facebook size={24} /></a>
                        <a href="#" style={{ color: 'rgba(255,255,255,0.6)', transition: 'color 0.3s' }} onMouseOver={e => e.currentTarget.style.color = '#fff'} onMouseOut={e => e.currentTarget.style.color = 'rgba(255,255,255,0.6)'}><Mail size={24} /></a>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'center', gap: '2rem', fontSize: '0.9rem', color: 'rgba(255,255,255,0.5)', marginBottom: '2rem' }}>
                        <a href="#" style={{ color: 'inherit', textDecoration: 'none' }}>Privacy Policy</a>
                        <a href="#" style={{ color: 'inherit', textDecoration: 'none' }}>Terms of Use</a>
                        <a href="#" style={{ color: 'inherit', textDecoration: 'none' }}>Contact</a>
                    </div>
                    <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.8rem' }}>&copy; 2026 La Shoe de Peugh, Owosso, MI 48867. All rights reserved.</p>
                    <VisitorCounter />
                </div>
            </footer>
        </div>
    )
}

export default App
