'use client';

import { useSession } from '@/lib/auth-client';
import { useRouter } from 'next/navigation';
import { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { motion } from 'framer-motion';

export default function Home() {
  const { data: session, isPending } = useSession();
  const router = useRouter();

  // Redirect authenticated users to the app
  useEffect(() => {
    if (!isPending && session) {
      router.push('/new');
    }
  }, [session, isPending, router]);

  if (isPending) {
    return (
      <div
        className='min-h-screen flex items-center justify-center'
        style={{ background: 'var(--background)' }}
      >
        {/* <div
          className='animate-spin rounded-full h-8 w-8 border-b-2'
          style={{ borderColor: 'var(--accent)' }}
        ></div> */}
      </div>
    );
  }

  if (session) {
    return (
      <div
        className='min-h-screen flex items-center justify-center'
        style={{ background: 'var(--background)' }}
      >
        <div
          className='animate-spin rounded-full h-8 w-8 border-b-2'
          style={{ borderColor: 'var(--accent)' }}
        ></div>
      </div>
    );
  }

  return (
    <div
      className='min-h-screen relative overflow-hidden font-[var(--font-dm-sans)]'
      style={{
        background: '#2d2d2d',
      }}
    >
      {/* Circular gradient behind navbar */}
      <div className='absolute top-0 left-1/2 transform -translate-x-1/2 w-[800px] h-[400px] bg-gradient-to-r from-[#c96342]/20 via-[#e07c54]/15 to-[#c96342]/20 opacity-60 blur-3xl'></div>
      <div className='absolute top-0 left-1/2 transform -translate-x-1/2 w-[600px] h-[300px] bg-gradient-to-r from-[#e07c54]/25 to-[#c96342]/25 opacity-40 blur-2xl'></div>

      {/* Glass Morphism Navigation */}
      <nav className='fixed top-6 left-1/2 transform -translate-x-1/2 z-50'>
        <div className='bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl px-6 py-3 shadow-2xl'>
          <div className='flex items-center space-x-15'>
            {/* Logo */}
            <div className='flex items-center space-x-3'>
              <Image
                src='/logo.svg'
                alt='ReadItEasy Logo'
                width={32}
                height={32}
                className='object-contain'
              />
              {/* <h1 className='text-xl font-bold bg-gradient-to-r from-[#c96342] to-[#e07c54] bg-clip-text text-transparent'>
                ReadItEasy
              </h1> */}
            </div>

            {/* Center Menu */}
            <div className='flex items-center space-x-6'>
              <div className='text-white/80 hover:text-white'>
                <Link
                  href='/pricing'
                  className=' font-medium transition-colors duration-300 text-sm'
                >
                  Pricing
                </Link>
              </div>
              <div className='text-white/80 hover:text-white'>
                <Link
                  href='#features'
                  className='text-white/80 hover:text-white font-medium transition-colors duration-300 text-sm'
                >
                  Features
                </Link>
              </div>
              <div className='text-white/80 hover:text-white'>
                <Link
                  href='#faqs'
                  className='text-white/80 hover:text-white font-medium transition-colors duration-300 text-sm'
                >
                  FAQs
                </Link>
              </div>
            </div>

            {/* Right Actions */}
            <div className='flex items-center space-x-3'>
              <div className='text-white/80 hover:text-white'>
                <Link
                  href='/signin'
                  className='text-white/80 hover:text-white font-medium transition-colors duration-300 text-sm'
                >
                  Sign In
                </Link>
              </div>
              <Link
                href='/signup'
                className='px-4 py-2 bg-gradient-to-r from-[#c96342] to-[#e07c54] text-white font-medium rounded-xl hover:opacity-90 hover:scale-105 transition-all duration-300 shadow-lg text-sm'
              >
                Sign Up
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <div
        className='min-h-screen flex flex-col items-center text-center px-4 pt-32'
        style={{
          background:
            'linear-gradient(180deg, #1a1a1a 0%, #1a1a1a 50%, #1a1a1a 100%)',
        }}
      >
        <div className='max-w-4xl mx-auto'>
          {/* Top Text */}
          <motion.div
            className='mb-4'
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.1 }}
          >
            <motion.p
              className='text-[#c96342] font-semibold text-base md:text-lg tracking-[0.2em] uppercase mb-4'
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
            >
              MAKE YOUR LIFE EASILY
            </motion.p>
            <motion.h1
              className='text-4xl sm:text-5xl md:text-6xl lg:text-7xl text-white leading-[0.9] tracking-tight mb-4'
              style={{
                fontFamily:
                  'var(--font-archivo-black), "Archivo Black", sans-serif',
              }}
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.3 }}
            >
              THE MODERN WAY
              <br />
              TO READ
            </motion.h1>
          </motion.div>

          {/* Start Now Button */}
          <motion.div
            className='mb-4'
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.5 }}
          >
            <Link
              href='/signup'
              className='inline-flex items-center px-4 py-2 bg-gradient-to-r from-[#c96342] to-[#e07c54] text-white font-semibold text-lg rounded-2xl hover:scale-105 transition-all duration-300 shadow-2xl hover:shadow-[#c96342]/25'
            >
              Start now
            </Link>
          </motion.div>

          {/* Main Product Image with 3D Features */}
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.6 }}
          >
            <div className='relative mx-auto max-w-4xl'>
              <ProductShowcase />
            </div>
          </motion.div>
        </div>
      </div>

      {/* Features Section */}
      <div
        id='features'
        className='py-24 px-4 relative'
        style={{
          background:
            'linear-gradient(180deg, #1a1a1a 0%, #2d2d2d 50%, #1a1a1a 100%)',
        }}
      >
        {/* Central gradient for glass morphism effect */}
        <div className='absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[800px] h-[600px] bg-gradient-to-r from-[#c96342]/20 via-[#e07c54]/15 to-[#c96342]/20 opacity-80 blur-3xl'></div>
        <div className='absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] bg-gradient-to-r from-[#e07c54]/25 to-[#c96342]/25 opacity-60 blur-2xl'></div>

        <div className='max-w-7xl mx-auto relative z-10'>
          {/* Section Header */}
          <div className='text-left mb-16'>
            <p className='text-[#c96342] font-semibold text-base tracking-[0.2em] uppercase mb-4'>
              The Features
            </p>
            <div className='grid grid-cols-1 xl:grid-cols-[3fr_2fr] xl:gap-24 mb-8'>
              <h2
                className='text-4xl md:text-5xl lg:text-6xl text-white leading-tight mb-8 xl:mb-0'
                style={{
                  fontFamily:
                    'var(--font-archivo-black), "Archivo Black", sans-serif',
                }}
              >
                Experience the
                <br />
                Unique Benefits of
                <br />
                Choosing Soun AI
              </h2>
              <div className='xl:flex xl:items-center xl:h-full'>
                <p className='text-white/70 text-lg leading-relaxed'>
                  Unlock the full potential of your reading with Soun AI. Enjoy
                  multilingual support, customizable voices, and clear, accurate
                  readings—all in an easy-to-use platform.
                </p>
              </div>
            </div>
          </div>

          {/* Features Grid */}
          <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8'>
            {/* Accessibility Text */}
            <div className='backdrop-blur-md bg-white/10 border border-white/10 rounded-3xl p-8 hover:bg-white hover:border-white transition-all duration-300 group'>
              <div className='w-16 h-16 bg-gradient-to-r from-[#c96342] to-[#e07c54] rounded-2xl flex items-center justify-center mb-6'>
                <svg
                  className='w-8 h-8 text-white'
                  fill='none'
                  stroke='currentColor'
                  viewBox='0 0 24 24'
                >
                  <path
                    strokeLinecap='round'
                    strokeLinejoin='round'
                    strokeWidth={2}
                    d='M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253'
                  />
                </svg>
              </div>
              <h3 className='text-xl font-bold text-white group-hover:text-black transition-colors duration-300'>
                Accessibility Text
              </h3>
              <p className='text-white/70 group-hover:text-black/70 transition-colors duration-300 leading-relaxed'>
                Make reading accessible for everyone, including those with
                visual impairments, by converting text into clear, audible
                content.
              </p>
            </div>

            {/* High Accuracy Text */}
            <div className='backdrop-blur-md bg-white/10 border border-white/10 rounded-3xl p-8 hover:bg-white hover:border-white transition-all duration-300 group'>
              <div className='w-16 h-16 bg-gradient-to-r from-[#c96342] to-[#e07c54] rounded-2xl flex items-center justify-center mb-6'>
                <svg
                  className='w-8 h-8 text-white'
                  fill='none'
                  stroke='currentColor'
                  viewBox='0 0 24 24'
                >
                  <path
                    strokeLinecap='round'
                    strokeLinejoin='round'
                    strokeWidth={2}
                    d='M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z'
                  />
                </svg>
              </div>
              <h3 className='text-xl font-bold text-white group-hover:text-black transition-colors duration-300'>
                High Accuracy Text
              </h3>
              <p className='text-white/70 group-hover:text-black/70 transition-colors duration-300 leading-relaxed'>
                Enjoy precise and clear readings with advanced AI technology for
                accurate pronunciation and intonation.
              </p>
            </div>

            {/* Voice Options Text */}
            <div className='backdrop-blur-md bg-white/10 border border-white/10 rounded-3xl p-8 hover:bg-white hover:border-white transition-all duration-300 group'>
              <div className='w-16 h-16 bg-gradient-to-r from-[#c96342] to-[#e07c54] rounded-2xl flex items-center justify-center mb-6'>
                <svg
                  className='w-8 h-8 text-white'
                  fill='none'
                  stroke='currentColor'
                  viewBox='0 0 24 24'
                >
                  <path
                    strokeLinecap='round'
                    strokeLinejoin='round'
                    strokeWidth={2}
                    d='M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z'
                  />
                </svg>
              </div>
              <h3 className='text-xl font-bold text-white group-hover:text-black transition-colors duration-300'>
                Voice Options Text
              </h3>
              <p className='text-white/70 group-hover:text-black/70 transition-colors duration-300 leading-relaxed'>
                Select from various gender options to customize your listening
                experience according to your preference.
              </p>
            </div>

            {/* Multilingual Support Text */}
            <div className='backdrop-blur-md bg-white/10 border border-white/10 rounded-3xl p-8 hover:bg-white hover:border-white transition-all duration-300 group'>
              <div className='w-16 h-16 bg-gradient-to-r from-[#c96342] to-[#e07c54] rounded-2xl flex items-center justify-center mb-6'>
                <svg
                  className='w-8 h-8 text-white'
                  fill='none'
                  stroke='currentColor'
                  viewBox='0 0 24 24'
                >
                  <path
                    strokeLinecap='round'
                    strokeLinejoin='round'
                    strokeWidth={2}
                    d='M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z'
                  />
                </svg>
              </div>
              <h3 className='text-xl font-bold text-white group-hover:text-black transition-colors duration-300'>
                Multilingual Support Text
              </h3>
              <p className='text-white/70 group-hover:text-black/70 transition-colors duration-300 leading-relaxed'>
                Choose from a range of languages to have your documents read
                aloud in your preferred language.
              </p>
            </div>

            {/* User-Friendly Interface */}
            <div className='backdrop-blur-md bg-white/10 border border-white/10 rounded-3xl p-8 hover:bg-white hover:border-white transition-all duration-300 group'>
              <div className='w-16 h-16 bg-gradient-to-r from-[#c96342] to-[#e07c54] rounded-2xl flex items-center justify-center mb-6'>
                <svg
                  className='w-8 h-8 text-white'
                  fill='none'
                  stroke='currentColor'
                  viewBox='0 0 24 24'
                >
                  <path
                    strokeLinecap='round'
                    strokeLinejoin='round'
                    strokeWidth={2}
                    d='M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4'
                  />
                </svg>
              </div>
              <h3 className='text-xl font-bold text-white group-hover:text-black transition-colors duration-300'>
                User-Friendly Interface
              </h3>
              <p className='text-white/70 group-hover:text-black/70 transition-colors duration-300 leading-relaxed'>
                Easily navigate our intuitive platform, ensuring a smooth and
                simple reading experience.
              </p>
            </div>

            {/* Bottom Right Content */}
            <div className='flex flex-col justify-between p-8'>
              <div className='mb-8'>
                <p className='text-white/70 text-lg leading-relaxed'>
                  Every Soun AI feature is crafted to make reading more
                  intuitive, accessible, and personalized. Discover more with
                  Soun AI today.
                </p>
              </div>
              <div>
                <a
                  href='/features'
                  className='inline-flex items-center px-6 py-3 bg-gradient-to-r from-[#c96342] to-[#e07c54] text-white font-semibold rounded-xl hover:opacity-90 transition-opacity duration-200 shadow-lg'
                >
                  Explore More
                  <svg
                    className='w-5 h-5 ml-2'
                    fill='none'
                    stroke='currentColor'
                    viewBox='0 0 24 24'
                  >
                    <path
                      strokeLinecap='round'
                      strokeLinejoin='round'
                      strokeWidth={2}
                      d='M17 8l4 4m0 0l-4 4m4-4H3'
                    />
                  </svg>
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* FAQs Section */}
      <div
        id='faqs'
        className='py-24 px-4 relative'
        style={{
          background:
            'linear-gradient(180deg, #1a1a1a 0%, #2d2d2d 50%, #1a1a1a 100%)',
        }}
      >
        {/* Central gradient for glass morphism effect */}
        <div className='absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[800px] h-[600px] bg-gradient-to-r from-[#c96342]/20 via-[#e07c54]/15 to-[#c96342]/20 opacity-80 blur-3xl'></div>
        <div className='absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] bg-gradient-to-r from-[#e07c54]/25 to-[#c96342]/25 opacity-60 blur-2xl'></div>

        <div className='max-w-4xl mx-auto relative z-10'>
          <div className='text-center mb-16'>
            <p className='text-[#c96342] font-semibold text-base tracking-[0.2em] uppercase mb-4'>
              FREQUENTLY ASKED QUESTIONS
            </p>
            <h2
              className='text-4xl md:text-5xl lg:text-6xl text-white leading-tight'
              style={{
                fontFamily:
                  'var(--font-archivo-black), "Archivo Black", sans-serif',
              }}
            >
              Got Questions?
              <br />
              We&apos;ve Got Answers
            </h2>
          </div>

          <FAQAccordion />
        </div>
      </div>

      {/* CTA Section */}
      <div
        className='py-32 px-4 text-center relative overflow-hidden'
        style={{
          background:
            'linear-gradient(180deg, #1a1a1a 0%, #2d2d2d 50%, #1a1a1a 100%)',
        }}
      >
        {/* Grid Background */}
        <div className='absolute inset-0'>
          <svg className='w-full h-full' xmlns='http://www.w3.org/2000/svg'>
            <defs>
              <pattern
                id='grid'
                width='160'
                height='160'
                patternUnits='userSpaceOnUse'
              >
                <path
                  d='M 160 0 L 0 0 0 160'
                  fill='none'
                  stroke='#c96342'
                  strokeWidth='3'
                  opacity='1'
                />
              </pattern>
              <radialGradient id='gridFade' cx='50%' cy='50%' r='60%'>
                <stop offset='0%' stopColor='#c96342' stopOpacity='0.4' />
                <stop offset='50%' stopColor='#c96342' stopOpacity='0.25' />
                <stop offset='80%' stopColor='#c96342' stopOpacity='0.1' />
                <stop offset='100%' stopColor='#c96342' stopOpacity='0' />
              </radialGradient>
            </defs>
            <rect
              width='100%'
              height='100%'
              fill='url(#grid)'
              mask='url(#gridMask)'
            />
            <mask id='gridMask'>
              <rect width='100%' height='100%' fill='url(#gridFade)' />
            </mask>
          </svg>
        </div>

        <div className='max-w-4xl mx-auto relative z-10'>
          <h2
            className='text-5xl md:text-6xl lg:text-7xl text-white leading-tight mb-12'
            style={{
              fontFamily:
                'var(--font-archivo-black), "Archivo Black", sans-serif',
            }}
          >
            Excited to try it
            <br />
            out? See how Soun
            <br />
            AI works.
          </h2>
          <div>
            <a
              href='/signup'
              className='group relative inline-flex items-center px-8 py-4 text-white font-semibold text-lg rounded-xl transition-all duration-300 overflow-hidden'
              style={{ border: '2px solid white' }}
            >
              {/* Button background - shows on hover */}
              <div className='absolute inset-0 bg-gradient-to-r from-[#c96342] to-[#e07c54] opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-xl'></div>

              {/* Border effect - changes on hover */}
              <div className='absolute inset-0 rounded-xl group-hover:border-2 group-hover:border-transparent group-hover:bg-gradient-to-r group-hover:from-[#c96342] group-hover:to-[#e07c54] transition-all duration-300'></div>

              <span className='relative z-10'>Try Now</span>
              <svg
                className='relative z-10 w-5 h-5 ml-3'
                fill='none'
                stroke='currentColor'
                viewBox='0 0 24 24'
              >
                <path
                  strokeLinecap='round'
                  strokeLinejoin='round'
                  strokeWidth={2}
                  d='M17 8l4 4m0 0l-4 4m4-4H3'
                />
              </svg>
            </a>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer
        className='py-16 px-4'
        style={{
          background: 'linear-gradient(180deg, #1a1a1a 0%, #0d0d0d 100%)',
        }}
      >
        <div className='max-w-7xl mx-auto'>
          <div className='text-center mb-8'>
            <h3 className='text-xl font-bold text-white mb-4'>ReadItEasy</h3>
            <div className='flex flex-wrap justify-center items-center gap-8 text-white/60'>
              <div className=' text-white/60 hover:text-white transition-colors duration-200'>
                <a href='/terms'>Terms & Conditions</a>
              </div>
              <div className=' text-white/60 hover:text-white transition-colors duration-200'>
                <a
                  href='/privacy'
                  className='hover:text-white transition-colors duration-300'
                >
                  Privacy Policy
                </a>
              </div>
              <div className=' text-white/60 hover:text-white transition-colors duration-200'>
                <a
                  href='/legal'
                  className='hover:text-white transition-colors duration-300'
                >
                  Legal
                </a>
              </div>
              <div className=' text-white/60 hover:text-white transition-colors duration-200'>
                <a
                  href='/contact'
                  className='hover:text-white transition-colors duration-300'
                >
                  Contact
                </a>
              </div>
            </div>
          </div>
          <div className='text-center pt-8 border-t border-white/10'>
            <p className='text-white/40 text-sm'>
              © 2024 ReadItEasy. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}

// FAQ Accordion Component
function FAQAccordion() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const faqs = [
    {
      question: 'What file formats does ReadItEasy support?',
      answer:
        'ReadItEasy supports a wide variety of file formats including PDF, DOCX, TXT, and more. You can upload documents in multiple formats and our AI will accurately convert them to speech.',
    },
    {
      question: 'How many languages are supported?',
      answer:
        'We support over 30 languages with natural-sounding voices. Whether you need English, Spanish, French, German, or many other languages, ReadItEasy has you covered with high-quality pronunciation.',
    },
    {
      question: 'Can I customize the voice and reading speed?',
      answer:
        'Absolutely! You can choose from various voice options including different genders and accents. You can also adjust the reading speed to match your preference for a personalized listening experience.',
    },
    {
      question: 'Is ReadItEasy suitable for people with visual impairments?',
      answer:
        'Yes, ReadItEasy is designed with accessibility in mind. Our platform provides clear, accurate text-to-speech conversion that makes reading accessible for everyone, including those with visual impairments or reading difficulties.',
    },
    {
      question: 'How accurate is the text-to-speech conversion?',
      answer:
        'Our advanced AI technology ensures high accuracy in pronunciation, intonation, and natural speech patterns. We continuously improve our system to provide the most realistic and clear audio output possible.',
    },
    {
      question: 'Do I need to install any software to use ReadItEasy?',
      answer:
        'No installation required! ReadItEasy is a web-based platform that works directly in your browser. Simply upload your document and start listening immediately from any device with internet access.',
    },
  ];

  const toggleFAQ = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <div className='space-y-6'>
      {faqs.map((faq, index) => (
        <div
          key={index}
          className='backdrop-blur-md bg-white/10 border border-white/10 rounded-3xl hover:bg-white hover:border-white transition-all duration-300 group overflow-hidden'
        >
          <button
            onClick={() => toggleFAQ(index)}
            className='w-full p-8 text-left flex justify-between items-center'
          >
            <h3 className='text-xl font-bold text-white group-hover:text-black transition-colors duration-300'>
              {faq.question}
            </h3>
            <div
              className={`transform transition-transform duration-300 ${
                openIndex === index ? 'rotate-180' : ''
              }`}
            >
              <svg
                className='w-6 h-6 text-white group-hover:text-black transition-colors duration-300'
                fill='none'
                stroke='currentColor'
                viewBox='0 0 24 24'
              >
                <path
                  strokeLinecap='round'
                  strokeLinejoin='round'
                  strokeWidth={2}
                  d='M19 9l-7 7-7-7'
                />
              </svg>
            </div>
          </button>
          <div
            className={`overflow-hidden transition-all duration-500 ease-in-out ${
              openIndex === index ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
            }`}
          >
            <div className='px-8 pb-8'>
              <p className='text-white/70 group-hover:text-black/70 transition-colors duration-300 leading-relaxed'>
                {faq.answer}
              </p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// 3D Product Showcase with Unified 3D Movement
function ProductShowcase() {
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!containerRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left - rect.width / 2) / (rect.width / 2);
    const y = (e.clientY - rect.top - rect.height / 2) / (rect.height / 2);

    setMousePosition({ x, y });
  };

  const handleMouseLeave = () => {
    setMousePosition({ x: 0, y: 0 });
  };

  return (
    <div
      ref={containerRef}
      className='relative w-full aspect-[16/10] transform-gpu'
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{
        perspective: '1500px',
      }}
    >
      {/* 3D Scene Container - Clean image with subtle effects */}
      <div
        className='relative w-full h-full transform-gpu transition-all duration-700 ease-out group cursor-pointer'
        style={{
          transform: `
            rotateY(${mousePosition.x * 8}deg) 
            rotateX(${-mousePosition.y * 8}deg)
            rotateZ(-2deg)
          `,
          transformStyle: 'preserve-3d',
        }}
      >
        {/* Main Product Image with Enhanced Shadows */}
        <div
          className='relative w-full h-full transition-all duration-500 group-hover:scale-[1.02]'
          style={{ transform: 'translateZ(0px)' }}
        >
          <Image
            src='/product_image.png'
            alt='ReadItEasy Dashboard'
            fill
            className='object-contain transition-all duration-500'
            style={{
              filter: 'drop-shadow(0 25px 50px rgba(0, 0, 0, 0.15))',
            }}
            priority
          />

          {/* Hover Shadow Effect */}
          <div
            className='absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none'
            style={{
              filter:
                'drop-shadow(0 35px 70px rgba(201, 99, 66, 0.15)) drop-shadow(0 15px 35px rgba(224, 124, 84, 0.1))',
            }}
          >
            <Image
              src='/product_image.png'
              alt='ReadItEasy Dashboard'
              fill
              className='object-contain'
            />
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(30px) translateZ(var(--depth));
          }
          to {
            opacity: 1;
            transform: translateY(0) translateZ(var(--depth));
          }
        }
        .animate-fadeInUp {
          animation: fadeInUp 1s ease-out forwards;
          animation-fill-mode: both;
        }
      `}</style>
    </div>
  );
}
