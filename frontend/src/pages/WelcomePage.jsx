import { Link } from 'react-router-dom'
import { 
  HiVideoCamera, 
  HiDesktopComputer, 
  HiChatAlt2, 
  HiCloudDownload,
  HiUsers,
  HiCalendar,
  HiLockClosed,
  HiPlay,
  HiMenu,
  HiX
} from 'react-icons/hi'
import { 
  FaTwitter, 
  FaLinkedin, 
  FaGithub, 
  FaYoutube,
  FaStar,
  FaQuoteLeft
} from 'react-icons/fa'
import { useState } from 'react'

const WelcomePage = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const features = [
    {
      icon: HiVideoCamera,
      title: 'High-Quality Video & Audio',
      description: 'Crystal clear HD video and audio that adapts to your network conditions for the best experience.',
    },
    {
      icon: HiDesktopComputer,
      title: 'Screen Sharing',
      description: 'Share your entire screen or specific applications with one click. Perfect for presentations and collaboration.',
    },
    {
      icon: HiChatAlt2,
      title: 'Real-Time Chat',
      description: 'Send messages, links, and files during meetings. All chats are saved for future reference.',
    },
    {
      icon: HiCloudDownload,
      title: 'Cloud Recording',
      description: 'Record your meetings and access them anytime. Never miss important discussions again.',
    },
  ]

  const steps = [
    {
      number: '01',
      title: 'Create a Meeting',
      description: 'Set up your meeting in seconds with a custom name, schedule, and invite list.',
      icon: HiCalendar,
    },
    {
      number: '02',
      title: 'Invite Participants',
      description: 'Share the meeting link or send email invitations to your team members.',
      icon: HiUsers,
    },
    {
      number: '03',
      title: 'Join and Collaborate',
      description: 'Connect instantly and start collaborating with video, audio, and screen sharing.',
      icon: HiPlay,
    },
  ]

  const testimonials = [
    {
      name: 'Sarah Johnson',
      role: 'Product Manager at TechCorp',
      image: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&h=150&fit=crop&crop=face',
      quote: 'MeetUp has transformed how our remote team collaborates. The video quality is exceptional and the interface is so intuitive.',
      rating: 5,
    },
    {
      name: 'Michael Chen',
      role: 'Software Engineer at StartupXYZ',
      image: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face',
      quote: 'Best video conferencing tool I\'ve used. The screen sharing feature is seamless and the recording quality is top-notch.',
      rating: 5,
    },
    {
      name: 'Emily Davis',
      role: 'CEO at DesignStudio',
      image: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&h=150&fit=crop&crop=face',
      quote: 'We switched our entire company to MeetUp and couldn\'t be happier. It\'s reliable, fast, and our clients love it.',
      rating: 5,
    },
  ]

  const stats = [
    { value: '10M+', label: 'Active Users' },
    { value: '500K+', label: 'Meetings Daily' },
    { value: '99.9%', label: 'Uptime' },
    { value: '150+', label: 'Countries' },
  ]

  return (
    <div className="page-shell overflow-hidden">
      {/* Navbar */}
      <nav className="nav-shell">
        <div className="section-shell">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <Link to="/" className="flex items-center space-x-2">
              <div className="w-10 h-10 rounded-xl gradient-bg flex items-center justify-center">
                <HiVideoCamera className="w-6 h-6 text-white" />
              </div>
              <span className="text-xl font-bold text-dark">MeetUp</span>
            </Link>

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center space-x-8">
              <a href="#features" className="text-gray-600 hover:text-primary-600 font-medium transition">
                Features
              </a>
              <a href="#how-it-works" className="text-gray-600 hover:text-primary-600 font-medium transition">
                How It Works
              </a>
              <a href="#testimonials" className="text-gray-600 hover:text-primary-600 font-medium transition">
                Testimonials
              </a>
              <Link to="/login" className="text-gray-600 hover:text-primary-600 font-medium transition">
                Login
              </Link>
              <Link to="/signup" className="btn-primary">
                Get Started Free
              </Link>
            </div>

            {/* Mobile menu button */}
            <button 
              className="md:hidden p-2 rounded-lg hover:bg-gray-100"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? (
                <HiX className="w-6 h-6 text-gray-600" />
              ) : (
                <HiMenu className="w-6 h-6 text-gray-600" />
              )}
            </button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {mobileMenuOpen && (
          <div className="md:hidden bg-white border-t border-gray-200">
            <div className="px-4 py-4 space-y-3">
              <a href="#features" className="block text-gray-600 hover:text-primary-600 font-medium">
                Features
              </a>
              <a href="#how-it-works" className="block text-gray-600 hover:text-primary-600 font-medium">
                How It Works
              </a>
              <a href="#testimonials" className="block text-gray-600 hover:text-primary-600 font-medium">
                Testimonials
              </a>
              <Link to="/login" className="block text-gray-600 hover:text-primary-600 font-medium">
                Login
              </Link>
              <Link to="/signup" className="block btn-primary text-center">
                Get Started Free
              </Link>
            </div>
          </div>
        )}
      </nav>

      {/* Hero Section */}
      <section className="section-spacing pt-32 relative overflow-hidden">
        {/* Background Pattern */}
        <div className="absolute inset-0 bg-linear-to-br from-primary-50 via-white to-blue-50 -z-10" />
        <div className="absolute top-0 right-0 w-1/2 h-full opacity-10 -z-10">
          <div className="absolute top-20 right-20 w-72 h-72 bg-primary-400 rounded-full blur-3xl" />
          <div className="absolute bottom-20 right-40 w-96 h-96 bg-blue-400 rounded-full blur-3xl" />
        </div>

        <div className="section-shell">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Hero Content */}
            <div className="text-center lg:text-left animate-fade-in">
              <div className="inline-flex items-center bg-primary-100 text-primary-700 px-4 py-2 rounded-full text-sm font-medium mb-6">
                <HiLockClosed className="w-4 h-4 mr-2" />
                Secure & Encrypted
              </div>
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-dark leading-tight mb-6">
                Connect, Collaborate, and Communicate{' '}
                <span className="text-primary-600">Effortlessly</span>
              </h1>
              <p className="text-lg md:text-xl text-gray-600 mb-8 max-w-xl">
                High-quality video meetings with anyone, anywhere. Experience seamless 
                communication with crystal-clear video and powerful collaboration tools.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
                <Link to="/signup" className="btn-primary text-center">
                  Get Started Free
                </Link>
                <a href="#how-it-works" className="btn-secondary text-center flex items-center justify-center">
                  <HiPlay className="w-5 h-5 mr-2" />
                  Learn More
                </a>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mt-12 pt-8 border-t border-gray-200">
                {stats.map((stat, index) => (
                  <div key={index} className="text-center lg:text-left">
                    <div className="text-2xl md:text-3xl font-bold text-primary-600">{stat.value}</div>
                    <div className="text-sm text-gray-500">{stat.label}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Hero Image */}
            <div className="relative animate-slide-up">
              <div className="relative bg-linear-to-br from-primary-600 to-primary-800 rounded-3xl p-4 shadow-2xl">
                <img
                  src="https://images.unsplash.com/photo-1609619385002-f40f1df9b7eb?w=800&h=600&fit=crop"
                  alt="Video meeting"
                  className="rounded-2xl w-full"
                />
                {/* Floating Cards */}
                <div className="absolute -left-8 top-1/4 bg-white rounded-xl shadow-lg p-4 hidden md:block animate-pulse-slow">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                      <HiVideoCamera className="w-5 h-5 text-green-600" />
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-dark">HD Quality</div>
                      <div className="text-xs text-gray-500">1080p streaming</div>
                    </div>
                  </div>
                </div>
                <div className="absolute -right-8 bottom-1/4 bg-white rounded-xl shadow-lg p-4 hidden md:block animate-pulse-slow">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center">
                      <HiUsers className="w-5 h-5 text-primary-600" />
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-dark">50+ Participants</div>
                      <div className="text-xs text-gray-500">Per meeting</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Trusted By */}
      <section className="py-16 bg-gray-50 border-y border-gray-100">
        <div className="section-shell">
          <p className="text-center text-gray-500 mb-8">Trusted by leading companies worldwide</p>
          <div className="flex flex-wrap justify-center items-center gap-8 md:gap-16 opacity-50">
            <div className="text-2xl font-bold text-gray-400">Google</div>
            <div className="text-2xl font-bold text-gray-400">Microsoft</div>
            <div className="text-2xl font-bold text-gray-400">Apple</div>
            <div className="text-2xl font-bold text-gray-400">Amazon</div>
            <div className="text-2xl font-bold text-gray-400">Meta</div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="section-spacing">
        <div className="section-shell">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-dark mb-4">
              Everything you need for{' '}
              <span className="text-primary-600">seamless meetings</span>
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Powerful features designed to make your virtual meetings as productive as in-person ones.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feature, index) => (
              <div 
                key={index} 
                className="card group hover:border-primary-200 border border-transparent"
              >
                <div className="w-14 h-14 rounded-2xl gradient-bg flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                  <feature.icon className="w-7 h-7 text-white" />
                </div>
                <h3 className="text-xl font-semibold text-dark mb-3">{feature.title}</h3>
                <p className="text-gray-600">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="section-spacing bg-gray-50">
        <div className="section-shell">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-dark mb-4">
              Get started in{' '}
              <span className="text-primary-600">3 simple steps</span>
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Join millions of users who are already connecting through MeetUp.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {steps.map((step, index) => (
              <div key={index} className="relative">
                <div className="bg-white rounded-2xl p-8 shadow-lg hover:shadow-xl transition-shadow">
                  <div className="text-5xl font-bold text-primary-100 mb-4">{step.number}</div>
                  <div className="w-14 h-14 rounded-2xl bg-primary-100 flex items-center justify-center mb-6">
                    <step.icon className="w-7 h-7 text-primary-600" />
                  </div>
                  <h3 className="text-xl font-semibold text-dark mb-3">{step.title}</h3>
                  <p className="text-gray-600">{step.description}</p>
                </div>
                {index < steps.length - 1 && (
                  <div className="hidden md:block absolute top-1/2 -right-4 w-8 h-0.5 bg-primary-200 transform -translate-y-1/2" />
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section id="testimonials" className="section-spacing">
        <div className="section-shell">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-dark mb-4">
              Loved by teams{' '}
              <span className="text-primary-600">worldwide</span>
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              See what our users have to say about their experience with MeetUp.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {testimonials.map((testimonial, index) => (
              <div key={index} className="card">
                <FaQuoteLeft className="w-8 h-8 text-primary-200 mb-4" />
                <p className="text-gray-600 mb-6 italic">"{testimonial.quote}"</p>
                <div className="flex items-center mb-4">
                  {[...Array(testimonial.rating)].map((_, i) => (
                    <FaStar key={i} className="w-4 h-4 text-yellow-400" />
                  ))}
                </div>
                <div className="flex items-center">
                  <img
                    src={testimonial.image}
                    alt={testimonial.name}
                    className="w-12 h-12 rounded-full mr-4 object-cover"
                  />
                  <div>
                    <div className="font-semibold text-dark">{testimonial.name}</div>
                    <div className="text-sm text-gray-500">{testimonial.role}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="section-spacing gradient-bg">
        <div className="section-shell max-w-4xl text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            Ready to transform your meetings?
          </h2>
          <p className="text-lg text-primary-100 mb-8 max-w-2xl mx-auto">
            Join thousands of teams already using MeetUp for their daily collaboration.
          </p>
          <Link 
            to="/signup" 
            className="inline-block bg-white text-primary-600 px-8 py-4 rounded-lg font-semibold hover:bg-gray-100 transition-all shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
          >
            Get Started Free — No Credit Card Required
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-dark py-16 text-white">
        <div className="section-shell">
          <div className="grid md:grid-cols-4 gap-12 mb-12">
            {/* Logo & Description */}
            <div className="md:col-span-2">
              <Link to="/" className="flex items-center space-x-2 mb-4">
                <div className="w-10 h-10 rounded-xl gradient-bg flex items-center justify-center">
                  <HiVideoCamera className="w-6 h-6 text-white" />
                </div>
                <span className="text-xl font-bold text-white">MeetUp</span>
              </Link>
              <p className="text-gray-400 mb-6 max-w-md">
                Connect, collaborate, and communicate effortlessly with our powerful 
                video conferencing platform. Built for modern teams.
              </p>
              <div className="flex space-x-4">
                <a href="#" className="w-10 h-10 rounded-full bg-gray-800 flex items-center justify-center hover:bg-primary-600 transition">
                  <FaTwitter className="w-5 h-5 text-gray-400 hover:text-white" />
                </a>
                <a href="#" className="w-10 h-10 rounded-full bg-gray-800 flex items-center justify-center hover:bg-primary-600 transition">
                  <FaLinkedin className="w-5 h-5 text-gray-400 hover:text-white" />
                </a>
                <a href="#" className="w-10 h-10 rounded-full bg-gray-800 flex items-center justify-center hover:bg-primary-600 transition">
                  <FaGithub className="w-5 h-5 text-gray-400 hover:text-white" />
                </a>
                <a href="#" className="w-10 h-10 rounded-full bg-gray-800 flex items-center justify-center hover:bg-primary-600 transition">
                  <FaYoutube className="w-5 h-5 text-gray-400 hover:text-white" />
                </a>
              </div>
            </div>

            {/* Links */}
            <div>
              <h4 className="text-white font-semibold mb-4">Product</h4>
              <ul className="space-y-3">
                <li><a href="#features" className="text-gray-400 hover:text-white transition">Features</a></li>
                <li><a href="#" className="text-gray-400 hover:text-white transition">Pricing</a></li>
                <li><a href="#" className="text-gray-400 hover:text-white transition">Security</a></li>
                <li><a href="#" className="text-gray-400 hover:text-white transition">Enterprise</a></li>
              </ul>
            </div>

            <div>
              <h4 className="text-white font-semibold mb-4">Company</h4>
              <ul className="space-y-3">
                <li><a href="#" className="text-gray-400 hover:text-white transition">About</a></li>
                <li><a href="#" className="text-gray-400 hover:text-white transition">Contact</a></li>
                <li><a href="#" className="text-gray-400 hover:text-white transition">Privacy Policy</a></li>
                <li><a href="#" className="text-gray-400 hover:text-white transition">Terms of Service</a></li>
              </ul>
            </div>
          </div>

          <div className="border-t border-gray-800 pt-8 text-center text-gray-400">
            <p>© {new Date().getFullYear()} MeetUp. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}

export default WelcomePage
