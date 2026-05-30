import React, { useState } from 'react'
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

// ── Waitlist signup ───────────────────────────────────────────────
// Posts to Formspree so it works on static hosting (GitHub Pages) with no backend.
// SETUP (2 min): create a free form at https://formspree.io, copy its endpoint,
// and paste it below in place of the placeholder. Until then submissions will fail
// gracefully with an error message.
const FORMSPREE_ENDPOINT = "https://formspree.io/f/REPLACE_WITH_FORM_ID";

const WaitlistForm = () => {
    const [email, setEmail] = useState('');
    const [status, setStatus] = useState('idle'); // idle | submitting | success | error
    const [error, setError] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            setStatus('error');
            setError('Please enter a valid email address.');
            return;
        }
        setStatus('submitting');
        setError('');
        try {
            const res = await fetch(FORMSPREE_ENDPOINT, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
                body: JSON.stringify({ email, _subject: 'New La Shoe de Peugh waitlist signup' }),
            });
            if (res.ok) {
                setStatus('success');
                setEmail('');
            } else {
                const data = await res.json().catch(() => ({}));
                setStatus('error');
                setError((data.errors && data.errors[0] && data.errors[0].message) || 'Something went wrong. Please try again.');
            }
        } catch {
            setStatus('error');
            setError('Network error. Please try again.');
        }
    };

    if (status === 'success') {
        return (
            <div style={{ maxWidth: '400px', margin: '0 auto', padding: '1.75rem', background: 'rgba(46,139,87,0.18)', borderRadius: '0.75rem', border: '1px solid rgba(255,255,255,0.18)' }}>
                <p style={{ color: '#fff', fontSize: '1.1rem', margin: 0, lineHeight: 1.6 }}>
                    You're on the list. We'll email you the moment La Shoe de Peugh goes live. 🌿
                </p>
            </div>
        );
    }

    return (
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem', maxWidth: '400px', margin: '0 auto' }}>
            <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your best email"
                className="input-premium"
                required
                aria-label="Email address"
            />
            <button
                type="submit"
                className="btn btn-primary"
                style={{ background: '#fff', color: '#121f28' }}
                disabled={status === 'submitting'}
            >
                {status === 'submitting' ? 'Reserving…' : 'Reserve My Order'}
            </button>
            {status === 'error' && (
                <p style={{ fontSize: '0.85rem', color: '#ffb4b4', margin: 0 }}>{error}</p>
            )}
            <p style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.5)', marginTop: '0.5rem' }}>
                No spam — just a heads-up when we launch. Secure checkout coming soon.
            </p>
        </form>
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
                        <a href="#notify" className="btn btn-primary" style={{ padding: '0.6rem 1.5rem', fontSize: '0.9rem' }}>Pre-Order</a>
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
                            <a href="#notify" className="btn btn-primary">Pre-Order Now</a>
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
                                Peppermint oil fights smelly feet and shoes by leveraging its natural antibacterial and antifungal properties. It actively kills odor-causing microbes and inhibits fungal growth, while its strong, refreshing scent (due to menthol) revitalizes the skin and provides a long-lasting clean feeling.
                            </p>

                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '2rem', textAlign: 'left', marginTop: '3rem' }}>
                                <div style={{ background: 'rgba(255,255,255,0.05)', padding: '2rem', borderRadius: '1rem' }}>
                                    <h4 style={{ fontSize: '1.3rem', marginBottom: '1rem', color: 'var(--accent)' }}>How It Works on Feet</h4>
                                    <ul style={{ listStyleType: 'none', padding: 0 }}>
                                        <li style={{ marginBottom: '1rem' }}><strong>Kills Bacteria & Fungi:</strong> Contains compounds that actively kill odor-causing bacteria and fungi.</li>
                                        <li><strong>Cooling & Soothing:</strong> Menthol provides a revitalizing, cooling sensation and helps soothe tired feet.</li>
                                    </ul>
                                </div>
                                <div style={{ background: 'rgba(255,255,255,0.05)', padding: '2rem', borderRadius: '1rem' }}>
                                    <h4 style={{ fontSize: '1.3rem', marginBottom: '1rem', color: '#4a90e2' }}>How It Works on Shoes</h4>
                                    <ul style={{ listStyleType: 'none', padding: 0 }}>
                                        <li style={{ marginBottom: '1rem' }}><strong>Deodorizes & Freshens:</strong> Strong aroma effectively neutralizes and helps keep away unpleasant shoe odors.</li>
                                        <li><strong>Inhibits Growth:</strong> By killing microbes, it prevents new odors from forming inside the shoes.</li>
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
                                <h3 style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>Antimicrobial Action</h3>
                                <p style={{ color: 'var(--text-light)' }}>Actively targets and eliminates odor-causing bacteria and fungi directly at the source for optimal odor control.</p>
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
                        <p style={{ textAlign: 'center', marginTop: '4rem', fontSize: '1.2rem', color: 'var(--text-light)' }}>
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
                            <h2 style={{ fontSize: '3rem', marginBottom: '1rem', color: '#fff' }}>Secure Your Bottle</h2>
                            <p style={{ marginBottom: '3rem', fontSize: '1.2rem', color: 'rgba(255,255,255,0.7)', maxWidth: '600px', margin: '0 auto 3rem auto' }}>
                                We are currently finalizing our payment systems, but you can secure your order today. Join the exclusive waitlist to be notified the moment we go live.
                            </p>
                            <WaitlistForm />
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
                </div>
            </footer>
        </div>
    )
}

export default App
