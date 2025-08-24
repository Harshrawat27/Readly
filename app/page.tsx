'use client';

import { useSession } from '@/lib/auth-client';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import Link from 'next/link';

export default function Home() {
  const { data: session, isPending } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (!isPending && session) {
      router.push('/new');
    }
  }, [session, isPending, router]);

  if (isPending) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--background)]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--accent)]"></div>
      </div>
    );
  }

  if (session) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--background)]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--accent)]"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--background)]">
      {/* Navigation */}
      <nav className="border-b border-[var(--border)] bg-[var(--card-background)]/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-[var(--accent)] rounded-lg flex items-center justify-center">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                  </svg>
                </div>
                <h1 className="text-xl font-bold text-[var(--text-primary)]">
                  Readly
                </h1>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Link
                href="/signin"
                className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] px-4 py-2 rounded-lg text-sm font-medium transition-colors"
              >
                Sign In
              </Link>
              <Link
                href="/signup"
                className="bg-[var(--accent)] text-white hover:opacity-90 px-4 py-2 rounded-lg text-sm font-medium transition-opacity"
              >
                Get Started
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-16">
        <div className="text-center mb-16">
          <div className="inline-flex items-center px-4 py-2 rounded-full bg-[var(--accent)]/10 border border-[var(--accent)]/20 text-[var(--accent)] text-sm font-medium mb-6">
            Solutions
          </div>
          <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold text-[var(--text-primary)] mb-6 leading-tight">
            Think, plan, and track
            <span className="block text-[var(--text-muted)] mt-2">all in one place</span>
          </h1>
          <p className="text-xl text-[var(--text-secondary)] mb-8 max-w-2xl mx-auto">
            Efficiently manage your PDFs and boost productivity
          </p>
          <Link
            href="/signup"
            className="inline-flex items-center bg-[var(--accent)] text-white hover:opacity-90 px-8 py-4 rounded-lg text-lg font-medium transition-opacity"
          >
            Get started
          </Link>
        </div>

        {/* Hero Visual Elements */}
        <div className="relative max-w-6xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-center">
            {/* Left side - Task items */}
            <div className="space-y-4">
              <div className="bg-[var(--card-background)] border border-[var(--border)] rounded-xl p-4 shadow-sm">
                <div className="flex items-center space-x-3">
                  <div className="w-4 h-4 bg-[var(--accent)] rounded-sm"></div>
                  <span className="text-[var(--text-primary)] font-medium">Today's tasks</span>
                </div>
              </div>
              <div className="bg-yellow-100 border-l-4 border-yellow-400 p-4 rounded-r-lg transform rotate-1">
                <p className="text-sm text-yellow-800 font-handwritten">Don't forget about your upcoming meeting this afternoon!</p>
              </div>
            </div>

            {/* Center - Main interface */}
            <div className="bg-[var(--card-background)] border border-[var(--border)] rounded-2xl p-6 shadow-lg">
              <div className="flex items-center justify-center mb-6">
                <div className="w-12 h-12 bg-gradient-to-br from-blue-400 to-blue-600 rounded-xl flex items-center justify-center">
                  <div className="grid grid-cols-2 gap-1">
                    <div className="w-2 h-2 bg-white rounded-full"></div>
                    <div className="w-2 h-2 bg-blue-200 rounded-full"></div>
                    <div className="w-2 h-2 bg-blue-200 rounded-full"></div>
                    <div className="w-2 h-2 bg-white rounded-full"></div>
                  </div>
                </div>
              </div>
              <div className="text-center">
                <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-2">PDF Analytics Hub</h3>
                <p className="text-sm text-[var(--text-muted)]">Smart document processing</p>
              </div>
            </div>

            {/* Right side - Integrations */}
            <div className="space-y-4">
              <div className="text-center">
                <p className="text-sm text-[var(--text-muted)] mb-4">100+ Integrations</p>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="w-12 h-12 bg-red-500 rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-lg">G</span>
                </div>
                <div className="w-12 h-12 bg-blue-600 rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-lg">O</span>
                </div>
                <div className="w-12 h-12 bg-green-600 rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-lg">E</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Solutions Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="text-center mb-16">
          <div className="inline-flex items-center px-4 py-2 rounded-full bg-[var(--accent)]/10 border border-[var(--accent)]/20 text-[var(--accent)] text-sm font-medium mb-6">
            Solutions
          </div>
          <h2 className="text-4xl sm:text-5xl font-bold text-[var(--text-primary)] mb-6">
            Solve your team's
            <span className="block">biggest challenges</span>
          </h2>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12 mb-16">
          {/* Feature 1 */}
          <div className="text-center">
            <div className="w-16 h-16 bg-orange-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <svg className="w-8 h-8 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-[var(--text-primary)] mb-3">
              Ensure your team is always on the same page
            </h3>
            <p className="text-[var(--text-secondary)]">
              with task sharing and transparent updates.
            </p>
          </div>

          {/* Feature 2 */}
          <div className="text-center">
            <div className="w-16 h-16 bg-blue-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-[var(--text-primary)] mb-3">
              Prioritize and manage tasks effectively
            </h3>
            <p className="text-[var(--text-secondary)]">
              so your team can focus on what matters most.
            </p>
          </div>

          {/* Feature 3 */}
          <div className="text-center">
            <div className="w-16 h-16 bg-purple-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <svg className="w-8 h-8 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-[var(--text-primary)] mb-3">
              Hold everyone accountable
            </h3>
            <p className="text-[var(--text-secondary)]">
              without the need for constant check-ins.
            </p>
          </div>
        </div>

        {/* Large Interface Preview */}
        <div className="bg-gradient-to-br from-cyan-50 to-blue-100 rounded-3xl p-8 lg:p-12">
          <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
            <div className="bg-gray-50 p-4 border-b">
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-red-400 rounded-full"></div>
                <div className="w-3 h-3 bg-yellow-400 rounded-full"></div>
                <div className="w-3 h-3 bg-green-400 rounded-full"></div>
              </div>
            </div>
            <div className="p-8">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Sidebar */}
                <div className="space-y-4">
                  <h3 className="font-semibold text-gray-700">My Workspace</h3>
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2 text-sm">
                      <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                      <span>Home</span>
                    </div>
                    <div className="flex items-center space-x-2 text-sm">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      <span>My Tasks</span>
                      <span className="bg-gray-200 text-xs px-2 py-1 rounded">23</span>
                    </div>
                  </div>
                </div>

                {/* Main Content */}
                <div className="lg:col-span-2">
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-2xl font-bold">Good morning, Amanda</h2>
                  </div>
                  <div className="space-y-4">
                    <div className="bg-blue-50 p-4 rounded-lg">
                      <h3 className="font-semibold text-blue-900 mb-2">To do list</h3>
                      <div className="space-y-2">
                        <div className="flex items-center space-x-2">
                          <input type="checkbox" className="rounded" />
                          <span className="text-sm">Finish the sales presentation</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <input type="checkbox" className="rounded" />
                          <span className="text-sm">Send follow-up emails to prospects</span>
                        </div>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-gray-50 p-4 rounded-lg">
                        <h4 className="font-semibold text-gray-700 mb-2">Time tracker</h4>
                        <div className="text-3xl font-bold">04:21:58</div>
                      </div>
                      <div className="bg-gray-50 p-4 rounded-lg">
                        <h4 className="font-semibold text-gray-700 mb-2">Activity</h4>
                        <div className="w-16 h-16 bg-gradient-to-br from-blue-400 to-purple-500 rounded-full mx-auto"></div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="text-center mb-16">
          <div className="inline-flex items-center px-4 py-2 rounded-full bg-[var(--accent)]/10 border border-[var(--accent)]/20 text-[var(--accent)] text-sm font-medium mb-6">
            Features
          </div>
          <h2 className="text-4xl sm:text-5xl font-bold text-[var(--text-primary)]">
            Keep everything in one place
          </h2>
          <p className="text-xl text-[var(--text-secondary)] mt-4">
            Forget complex project management tools.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          {/* Seamless Collaboration */}
          <div>
            <div className="bg-[var(--card-background)] border border-[var(--border)] rounded-2xl p-8">
              <div className="space-y-4">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                    <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                  </div>
                  <span className="font-medium text-[var(--text-primary)]">Branding and Identity</span>
                </div>
                <div className="pl-11">
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <div className="w-6 h-6 bg-blue-500 rounded-full"></div>
                      <span className="text-sm text-[var(--text-secondary)]">Marketing 2</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className="w-6 h-6 bg-gray-300 rounded-full"></div>
                      <span className="text-sm text-[var(--text-secondary)]">Invite members</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="mt-6">
              <h3 className="text-2xl font-bold text-[var(--text-primary)] mb-3">Seamless Collaboration</h3>
              <p className="text-[var(--text-secondary)]">
                Work together with your team effortlessly, share tasks, and update progress in real-time.
              </p>
            </div>
          </div>

          {/* Time Management Tools */}
          <div>
            <div className="bg-[var(--card-background)] border border-[var(--border)] rounded-2xl p-8">
              <div className="text-center">
                <div className="inline-block bg-blue-500 text-white px-4 py-2 rounded-lg mb-4">
                  Weekly Schedule
                </div>
                <div className="grid grid-cols-3 gap-4 mb-6">
                  <div className="space-y-2">
                    <div className="text-2xl font-bold">15</div>
                    <div className="text-sm text-[var(--text-muted)]">Mon</div>
                  </div>
                  <div className="space-y-2">
                    <div className="text-2xl font-bold">16</div>
                    <div className="text-sm text-[var(--text-muted)]">Tue</div>
                  </div>
                  <div className="space-y-2">
                    <div className="text-2xl font-bold">17</div>
                    <div className="text-sm text-[var(--text-muted)]">Wed</div>
                  </div>
                </div>
                <div className="bg-yellow-100 rounded-lg p-3">
                  <div className="text-3xl font-bold">75%</div>
                  <div className="text-sm text-gray-600">Team workload</div>
                </div>
              </div>
            </div>
            <div className="mt-6">
              <h3 className="text-2xl font-bold text-[var(--text-primary)] mb-3">Time Management Tools</h3>
              <p className="text-[var(--text-secondary)]">
                Optimize your time with integrated tools like timers, reminders, and schedules.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="text-center mb-16">
          <div className="inline-flex items-center px-4 py-2 rounded-full bg-[var(--accent)]/10 border border-[var(--accent)]/20 text-[var(--accent)] text-sm font-medium mb-6">
            Testimonials
          </div>
          <h2 className="text-4xl sm:text-5xl font-bold text-[var(--text-primary)] mb-6">
            People just like you
            <span className="block">are already using Readly</span>
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {/* Testimonial 1 */}
          <div className="bg-[var(--card-background)] border border-[var(--border)] rounded-2xl p-6">
            <p className="text-[var(--text-secondary)] mb-6">
              "This PDF manager has completely transformed how my team works. We now collaborate in real-time and always meet deadlines."
            </p>
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-gradient-to-br from-pink-400 to-purple-500 rounded-full flex items-center justify-center">
                <span className="text-white font-semibold">SW</span>
              </div>
              <div>
                <div className="font-semibold text-[var(--text-primary)]">Sarah W.</div>
                <div className="text-sm text-[var(--text-muted)]">Freelance Designer</div>
              </div>
            </div>
          </div>

          {/* Testimonial 2 */}
          <div className="bg-[var(--card-background)] border border-[var(--border)] rounded-2xl p-6">
            <p className="text-[var(--text-secondary)] mb-6">
              "An essential tool for anyone looking to manage their documents better."
            </p>
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-400 to-cyan-500 rounded-full flex items-center justify-center">
                <span className="text-white font-semibold">SJ</span>
              </div>
              <div>
                <div className="font-semibold text-[var(--text-primary)]">Sam J.</div>
                <div className="text-sm text-[var(--text-muted)]">Project Coordinator</div>
              </div>
            </div>
          </div>

          {/* Testimonial 3 */}
          <div className="bg-[var(--card-background)] border border-[var(--border)] rounded-2xl p-6">
            <p className="text-[var(--text-secondary)] mb-6">
              "The built-in analytics give me a complete overview of our team's productivity."
            </p>
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-gradient-to-br from-green-400 to-emerald-500 rounded-full flex items-center justify-center">
                <span className="text-white font-semibold">JD</span>
              </div>
              <div>
                <div className="font-semibold text-[var(--text-primary)]">John D.</div>
                <div className="text-sm text-[var(--text-muted)]">Marketing Lead</div>
              </div>
            </div>
          </div>

          {/* Testimonial 4 */}
          <div className="bg-[var(--card-background)] border border-[var(--border)] rounded-2xl p-6 md:col-span-2 lg:col-span-1">
            <p className="text-[var(--text-secondary)] mb-6">
              "The time-tracking feature has been a game-changer for my freelance projects. It helps me stay organized and productive."
            </p>
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-gradient-to-br from-orange-400 to-red-500 rounded-full flex items-center justify-center">
                <span className="text-white font-semibold">AM</span>
              </div>
              <div>
                <div className="font-semibold text-[var(--text-primary)]">Alex M.</div>
                <div className="text-sm text-[var(--text-muted)]">Freelance Developer</div>
              </div>
            </div>
          </div>

          {/* Testimonial 5 */}
          <div className="bg-[var(--card-background)] border border-[var(--border)] rounded-2xl p-6">
            <p className="text-[var(--text-secondary)] mb-6">
              "I love how easy it is to create and assign tasks. The platform's interface makes work feel less overwhelming."
            </p>
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full flex items-center justify-center">
                <span className="text-white font-semibold">DT</span>
              </div>
              <div>
                <div className="font-semibold text-[var(--text-primary)]">Daniela T.</div>
                <div className="text-sm text-[var(--text-muted)]">Operations Manager</div>
              </div>
            </div>
          </div>

          {/* Video testimonial placeholder */}
          <div className="bg-gradient-to-br from-gray-100 to-gray-200 rounded-2xl p-6 flex items-center justify-center relative">
            <div className="absolute inset-0 bg-black/50 rounded-2xl flex items-center justify-center">
              <div className="w-16 h-16 bg-red-600 rounded-full flex items-center justify-center cursor-pointer hover:bg-red-700 transition-colors">
                <svg className="w-8 h-8 text-white ml-1" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M8 5v14l11-7z"/>
                </svg>
              </div>
            </div>
            <div className="text-center z-10">
              <div className="text-white font-medium mb-2">Watch video review</div>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="text-center mb-16">
          <div className="inline-flex items-center px-4 py-2 rounded-full bg-[var(--accent)]/10 border border-[var(--accent)]/20 text-[var(--accent)] text-sm font-medium mb-6">
            Pricing
          </div>
          <h2 className="text-4xl sm:text-5xl font-bold text-[var(--text-primary)]">
            Simple pricing plans
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          {/* Basic Plan */}
          <div className="bg-[var(--card-background)] border border-[var(--border)] rounded-2xl p-8">
            <div className="mb-8">
              <h3 className="text-xl font-bold text-[var(--text-primary)] mb-2">Basic plan</h3>
              <p className="text-[var(--text-muted)] mb-6">Perfect for individuals</p>
              <div className="flex items-baseline">
                <span className="text-4xl font-bold text-[var(--text-primary)]">$5</span>
                <span className="text-[var(--text-muted)]">/mo</span>
              </div>
            </div>
            <Link
              href="/signup"
              className="w-full block text-center bg-[var(--accent)] text-white hover:opacity-90 px-6 py-3 rounded-lg font-medium transition-opacity mb-8"
            >
              Get started
            </Link>
            <ul className="space-y-4">
              <li className="flex items-center space-x-3">
                <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                </svg>
                <span className="text-[var(--text-secondary)]">All product features</span>
              </li>
              <li className="flex items-center space-x-3">
                <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                </svg>
                <span className="text-[var(--text-secondary)]">Unlimited lists & tasks</span>
              </li>
              <li className="flex items-center space-x-3">
                <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                </svg>
                <span className="text-[var(--text-secondary)]">Priority support</span>
              </li>
              <li className="flex items-center space-x-3">
                <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                </svg>
                <span className="text-[var(--text-secondary)]">Unlimited tasks</span>
              </li>
            </ul>
          </div>

          {/* Pro Plan - Featured */}
          <div className="bg-[var(--accent)] text-white rounded-2xl p-8 relative transform scale-105">
            <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
              <div className="bg-yellow-400 text-yellow-900 px-4 py-1 rounded-full text-sm font-medium flex items-center">
                ⚡ Pro plan
              </div>
            </div>
            <div className="mb-8 mt-4">
              <h3 className="text-xl font-bold mb-2">Pro plan</h3>
              <p className="text-white/80 mb-6">Ideal for small teams</p>
              <div className="flex items-baseline">
                <span className="text-4xl font-bold">$9</span>
                <span className="text-white/80">/mo</span>
              </div>
              <p className="text-white/80 mt-2">Best choice</p>
            </div>
            <Link
              href="/signup"
              className="w-full block text-center bg-white text-[var(--accent)] hover:bg-gray-50 px-6 py-3 rounded-lg font-medium transition-colors mb-8"
            >
              Get started
            </Link>
            <ul className="space-y-4">
              <li className="flex items-center space-x-3">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                </svg>
                <span>All product features</span>
              </li>
              <li className="flex items-center space-x-3">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                </svg>
                <span>Unlimited lists & tasks</span>
              </li>
              <li className="flex items-center space-x-3">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                </svg>
                <span>Priority support</span>
              </li>
              <li className="flex items-center space-x-3">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                </svg>
                <span>Unlimited tasks</span>
              </li>
              <li className="flex items-center space-x-3">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                </svg>
                <span>Unlimited file storage</span>
              </li>
              <li className="flex items-center space-x-3">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                </svg>
                <span>Unlimited projects</span>
              </li>
            </ul>
          </div>

          {/* Advanced Plan */}
          <div className="bg-[var(--card-background)] border border-[var(--border)] rounded-2xl p-8">
            <div className="mb-8">
              <h3 className="text-xl font-bold text-[var(--text-primary)] mb-2">Advanced plan</h3>
              <p className="text-[var(--text-muted)] mb-6">Best for large organizations</p>
              <div className="flex items-baseline">
                <span className="text-4xl font-bold text-[var(--text-primary)]">$15</span>
                <span className="text-[var(--text-muted)]">/mo</span>
              </div>
            </div>
            <Link
              href="/signup"
              className="w-full block text-center bg-[var(--accent)] text-white hover:opacity-90 px-6 py-3 rounded-lg font-medium transition-opacity mb-8"
            >
              Get started
            </Link>
            <ul className="space-y-4">
              <li className="flex items-center space-x-3">
                <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                </svg>
                <span className="text-[var(--text-secondary)]">All product features</span>
              </li>
              <li className="flex items-center space-x-3">
                <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                </svg>
                <span className="text-[var(--text-secondary)]">Unlimited lists & tasks</span>
              </li>
              <li className="flex items-center space-x-3">
                <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                </svg>
                <span className="text-[var(--text-secondary)]">Priority support</span>
              </li>
              <li className="flex items-center space-x-3">
                <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                </svg>
                <span className="text-[var(--text-secondary)]">Unlimited tasks</span>
              </li>
              <li className="flex items-center space-x-3">
                <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                </svg>
                <span className="text-[var(--text-secondary)]">Unlimited file storage</span>
              </li>
              <li className="flex items-center space-x-3">
                <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                </svg>
                <span className="text-[var(--text-secondary)]">Unlimited projects</span>
              </li>
            </ul>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="text-center mb-16">
          <div className="inline-flex items-center px-4 py-2 rounded-full bg-[var(--accent)]/10 border border-[var(--accent)]/20 text-[var(--accent)] text-sm font-medium mb-6">
            FAQ
          </div>
          <h2 className="text-4xl sm:text-5xl font-bold text-[var(--text-primary)]">
            Frequently Asked Questions
          </h2>
        </div>

        <div className="space-y-6">
          <details className="bg-[var(--card-background)] border border-[var(--border)] rounded-xl p-6 group">
            <summary className="flex items-center justify-between cursor-pointer text-lg font-semibold text-[var(--text-primary)] list-none">
              <span>How does the AI analysis work?</span>
              <svg className="w-5 h-5 text-[var(--text-muted)] transform group-open:rotate-180 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
              </svg>
            </summary>
            <p className="mt-4 text-[var(--text-secondary)]">
              Our AI analyzes your PDF content using advanced natural language processing and computer vision. You can ask questions about the document, and it provides contextual answers based on the content.
            </p>
          </details>

          <details className="bg-[var(--card-background)] border border-[var(--border)] rounded-xl p-6 group">
            <summary className="flex items-center justify-between cursor-pointer text-lg font-semibold text-[var(--text-primary)] list-none">
              <span>Can I collaborate with team members?</span>
              <svg className="w-5 h-5 text-[var(--text-muted)] transform group-open:rotate-180 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
              </svg>
            </summary>
            <p className="mt-4 text-[var(--text-secondary)]">
              Yes! You can share documents with team members, add collaborative annotations, and work together on the same PDF in real-time.
            </p>
          </details>

          <details className="bg-[var(--card-background)] border border-[var(--border)] rounded-xl p-6 group">
            <summary className="flex items-center justify-between cursor-pointer text-lg font-semibold text-[var(--text-primary)] list-none">
              <span>What file formats are supported?</span>
              <svg className="w-5 h-5 text-[var(--text-muted)] transform group-open:rotate-180 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
              </svg>
            </summary>
            <p className="mt-4 text-[var(--text-secondary)]">
              Currently, we support PDF files. We're working on adding support for Word documents, PowerPoint presentations, and other common formats.
            </p>
          </details>

          <details className="bg-[var(--card-background)] border border-[var(--border)] rounded-xl p-6 group">
            <summary className="flex items-center justify-between cursor-pointer text-lg font-semibold text-[var(--text-primary)] list-none">
              <span>Is my data secure?</span>
              <svg className="w-5 h-5 text-[var(--text-muted)] transform group-open:rotate-180 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
              </svg>
            </summary>
            <p className="mt-4 text-[var(--text-secondary)]">
              Absolutely. We use enterprise-grade encryption and security measures to protect your documents. Your data is never shared with third parties without your consent.
            </p>
          </details>

          <details className="bg-[var(--card-background)] border border-[var(--border)] rounded-xl p-6 group">
            <summary className="flex items-center justify-between cursor-pointer text-lg font-semibold text-[var(--text-primary)] list-none">
              <span>Can I cancel my subscription anytime?</span>
              <svg className="w-5 h-5 text-[var(--text-muted)] transform group-open:rotate-180 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
              </svg>
            </summary>
            <p className="mt-4 text-[var(--text-secondary)]">
              Yes, you can cancel your subscription at any time. There are no long-term commitments or cancellation fees.
            </p>
          </details>
        </div>
      </section>

      {/* Final CTA Section */}
      <section className="bg-[var(--accent)] py-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="flex items-center justify-center space-x-2 mb-8">
            <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5 text-[var(--accent)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
            </div>
            <span className="text-white font-bold text-xl">Readly</span>
          </div>
          <h2 className="text-4xl sm:text-5xl font-bold text-white mb-6">
            Stay organized and
            <span className="block">boost your productivity</span>
          </h2>
          <Link
            href="/signup"
            className="inline-flex items-center bg-white text-[var(--accent)] hover:bg-gray-100 px-8 py-4 rounded-lg text-lg font-medium transition-colors"
          >
            Get started for free
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-[var(--card-background)] border-t border-[var(--border)] py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
            {/* Logo and Description */}
            <div className="lg:col-span-1">
              <div className="flex items-center space-x-2 mb-4">
                <div className="w-8 h-8 bg-[var(--accent)] rounded-lg flex items-center justify-center">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                  </svg>
                </div>
                <span className="text-xl font-bold text-[var(--text-primary)]">Readly</span>
              </div>
              <p className="text-[var(--text-secondary)] text-sm">
                Transform your PDF experience with AI-powered analysis and collaboration tools.
              </p>
            </div>

            {/* Links */}
            <div>
              <h3 className="font-semibold text-[var(--text-primary)] mb-4">Product</h3>
              <ul className="space-y-2 text-sm">
                <li><a href="#" className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors">Features</a></li>
                <li><a href="#" className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors">Solutions</a></li>
                <li><a href="#" className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors">Integrations</a></li>
                <li><a href="#" className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors">Pricing</a></li>
              </ul>
            </div>

            <div>
              <h3 className="font-semibold text-[var(--text-primary)] mb-4">Company</h3>
              <ul className="space-y-2 text-sm">
                <li><a href="#" className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors">About Us</a></li>
                <li><a href="#" className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors">Contact</a></li>
                <li><a href="#" className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors">Careers</a></li>
                <li><a href="#" className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors">What's New</a></li>
              </ul>
            </div>

            <div>
              <h3 className="font-semibold text-[var(--text-primary)] mb-4">Support</h3>
              <ul className="space-y-2 text-sm">
                <li><a href="#" className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors">Help Center</a></li>
                <li><a href="#" className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors">Privacy Policy</a></li>
                <li><a href="#" className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors">Terms of Service</a></li>
              </ul>
            </div>
          </div>

          <div className="border-t border-[var(--border)] mt-8 pt-8 text-center">
            <p className="text-[var(--text-muted)] text-sm">
              © 2024. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}