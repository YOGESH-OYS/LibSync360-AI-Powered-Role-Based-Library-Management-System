import React from 'react';
import { Link } from 'react-router-dom';
import { 
  BookOpenIcon, 
  UserGroupIcon, 
  AcademicCapIcon,
  ChartBarIcon,
  BellIcon,
  ShieldCheckIcon,
  SparklesIcon,
  ArrowRightIcon
} from '@heroicons/react/24/outline';

const Home = () => {
  const features = [
    {
      icon: BookOpenIcon,
      title: 'AI-Powered Search',
      description: 'Find books using natural language with our advanced semantic search technology.'
    },
    {
      icon: SparklesIcon,
      title: 'Smart Recommendations',
      description: 'Get personalized book suggestions based on your reading history and preferences.'
    },
    {
      icon: BellIcon,
      title: 'Smart Notifications',
      description: 'Receive timely reminders for due dates and personalized recommendations.'
    },
    {
      icon: ChartBarIcon,
      title: 'Analytics Dashboard',
      description: 'Track your reading progress and discover insights about your reading habits.'
    },
    {
      icon: ShieldCheckIcon,
      title: 'Secure & Reliable',
      description: 'Your data is protected with enterprise-grade security and backup systems.'
    },
    {
      icon: UserGroupIcon,
      title: 'Community Features',
      description: 'Connect with other readers, share reviews, and participate in reading challenges.'
    }
  ];

  const stats = [
    { number: '50,000+', label: 'Books Available' },
    { number: '10,000+', label: 'Active Students' },
    { number: '99.9%', label: 'Uptime' },
    { number: '24/7', label: 'Support' }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
      {/* Navigation */}
      <nav className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <BookOpenIcon className="h-8 w-8 text-blue-600" />
              <span className="ml-2 text-xl font-bold text-gray-900">Library Management</span>
            </div>
            <div className="hidden md:flex items-center space-x-8">
              <Link to="/help" className="text-gray-600 hover:text-gray-900">Help</Link>
              <Link to="/login" className="text-gray-600 hover:text-gray-900">About Collage</Link>
              <Link 
                to="/login" 
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
              >
                Get Started
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
          <div className="text-center">
            <h1 className="text-4xl md:text-6xl font-bold text-gray-900 mb-6">
              Welcome to the Future of
              <span className="text-blue-600"> Library Management</span>
            </h1>
            <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
              Experience the next generation of library services with AI-powered search, 
              personalized recommendations, and smart notifications designed for modern academic institutions.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link 
                to="/login" 
                className="bg-blue-600 text-white px-8 py-3 rounded-lg text-lg font-semibold hover:bg-blue-700 transition-colors flex items-center justify-center"
              >
                Sign In
                <ArrowRightIcon className="ml-2 h-5 w-5" />
              </Link>
              {/* <Link 
                to="/register" 
                className="border-2 border-blue-600 text-blue-600 px-8 py-3 rounded-lg text-lg font-semibold hover:bg-blue-50 transition-colors"
              >
                Create Account
              </Link> */}
            </div>
          </div>
        </div>
        
        {/* Background decoration */}
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden -z-10">
          <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-200 rounded-full opacity-20"></div>
          <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-indigo-200 rounded-full opacity-20"></div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Powered by Advanced AI Technology
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Our library management system leverages cutting-edge artificial intelligence 
              to provide an unparalleled user experience.
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <div key={index} className="bg-gray-50 rounded-xl p-8 hover:shadow-lg transition-shadow">
                <feature.icon className="h-12 w-12 text-blue-600 mb-4" />
                <h3 className="text-xl font-semibold text-gray-900 mb-3">{feature.title}</h3>
                <p className="text-gray-600">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-24 bg-blue-600">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
              Trusted by Thousands of Students
            </h2>
            <p className="text-xl text-blue-100">
              Join the growing community of students and staff who rely on our platform.
            </p>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map((stat, index) => (
              <div key={index} className="text-center">
                <div className="text-4xl md:text-5xl font-bold text-white mb-2">{stat.number}</div>
                <div className="text-blue-100">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            Ready to Transform Your Library Experience?
          </h2>
          <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
            Start exploring our AI-powered library management system today and discover 
            a new way to access knowledge and resources.
          </p>
          <Link 
            to="/login" 
            className="inline-flex items-center bg-blue-600 text-white px-8 py-3 rounded-lg text-lg font-semibold hover:bg-blue-700 transition-colors"
          >
            Get Started Now
            <ArrowRightIcon className="ml-2 h-5 w-5" />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center mb-4">
                <BookOpenIcon className="h-8 w-8 text-blue-400" />
                <span className="ml-2 text-xl font-bold">Library Management</span>
              </div>
              <p className="text-gray-400">
                Empowering academic institutions with next-generation library technology.
              </p>
            </div>
            
            <div>
              <h3 className="text-lg font-semibold mb-4">Quick Links</h3>
              <ul className="space-y-2">
                <li><Link to="/help" className="text-gray-400 hover:text-white">Help & Support</Link></li>
                <li><Link to="/login" className="text-gray-400 hover:text-white">Login</Link></li>
                <li><Link to="/register" className="text-gray-400 hover:text-white">Register</Link></li>
              </ul>
            </div>
            
            <div>
              <h3 className="text-lg font-semibold mb-4">Features</h3>
              <ul className="space-y-2">
                <li className="text-gray-400">AI-Powered Search</li>
                <li className="text-gray-400">Smart Recommendations</li>
                <li className="text-gray-400">Digital Notifications</li>
              </ul>
            </div>
            
            <div>
              <h3 className="text-lg font-semibold mb-4">Contact</h3>
              <ul className="space-y-2">
                <li className="text-gray-400">support@library.edu</li>
                <li className="text-gray-400">+1 (555) 123-4567</li>
                <li className="text-gray-400">24/7 Support Available</li>
              </ul>
            </div>
          </div>
          
          <div className="border-t border-gray-800 mt-8 pt-8 text-center">
            <p className="text-gray-400">
              © 2024 Library Management System. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Home; 