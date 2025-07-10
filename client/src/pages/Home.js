import React from 'react';
import { Link } from 'react-router-dom';
import { 
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
      icon: UserGroupIcon,
      title: 'Role-Based Access',
      description: 'Manage permissions and access for Admins, Staff, and Students with fine-grained control.'
    },
    {
      icon: AcademicCapIcon,
      title: 'Academic Integration',
      description: 'Seamlessly connect user roles to academic departments, years, and credentials.'
    },
    {
      icon: BellIcon,
      title: 'Smart Notifications',
      description: 'Automated reminders and alerts tailored to each user role.'
    },
    {
      icon: ChartBarIcon,
      title: 'Analytics & Insights',
      description: 'Track activity, permissions changes, and user engagement across all roles.'
    },
    {
      icon: ShieldCheckIcon,
      title: 'Secure & Auditable',
      description: 'Enterprise-grade security, audit logs, and compliance for all user actions.'
    },
    {
      icon: SparklesIcon,
      title: 'Customizable Workflows',
      description: 'Adapt role management to your institution’s unique needs and policies.'
    }
  ];

  const stats = [
    { number: '3+', label: 'User Roles' },
    { number: '10,000+', label: 'Active Users' },
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
              <UserGroupIcon className="h-8 w-8 text-blue-600" />
              <span className="ml-2 text-xl font-bold text-gray-900">Roles Management</span>
            </div>
            <div className="hidden md:flex items-center space-x-8">
              <Link to="/help" className="text-gray-600 hover:text-gray-900">Help</Link>
              <Link to="/login" className="text-gray-600 hover:text-gray-900">About Project</Link>
              <Link 
                to="/login" 
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
              >
                Sign In
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
              <span className="text-blue-600"> Roles Management</span>
            </h1>
            <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
              Experience next-generation user and permissions management for academic institutions. Assign, audit, and empower every role—admin, staff, and student—with confidence and clarity.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link 
                to="/login" 
                className="bg-blue-600 text-white px-8 py-3 rounded-lg text-lg font-semibold hover:bg-blue-700 transition-colors flex items-center justify-center"
              >
                Sign In
                <ArrowRightIcon className="ml-2 h-5 w-5" />
              </Link>
            </div>
          </div>
        </div>
        {/* Background decoration */}
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden -z-10">
          <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-200 rounded-full opacity-20"></div>
          <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-indigo-200 rounded-full opacity-20"></div>
        </div>
      </section>

      {/* Project About Section */}
      <section className="py-20 bg-white border-b">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            About This Project
          </h2>
          <p className="text-lg text-gray-600 mb-6">
            This Roles Management System is designed for modern academic institutions to streamline user access, automate permissions, and ensure secure, auditable operations. Built with a focus on flexibility, security, and user experience, it supports:
          </p>
          <ul className="text-left max-w-2xl mx-auto space-y-2 text-gray-700">
            <li><span className="font-semibold text-blue-600">• Admins:</span> Full control over users, roles, and system settings.</li>
            <li><span className="font-semibold text-blue-600">• Staff:</span> Manage day-to-day operations, lend resources, and assist students.</li>
            <li><span className="font-semibold text-blue-600">• Students:</span> Access resources, receive notifications, and track their own activity.</li>
            <li><span className="font-semibold text-blue-600">• Auditing:</span> Every action is logged for transparency and compliance.</li>
            <li><span className="font-semibold text-blue-600">• Custom Workflows:</span> Adaptable to your institution’s unique policies and needs.</li>
          </ul>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Why Choose Our Roles Management Platform?
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Built for scale, security, and ease of use, our platform empowers every user and administrator.
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
              Trusted by Academic Leaders
            </h2>
            <p className="text-xl text-blue-100">
              Join the growing community of institutions and users who rely on our platform.
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
            Ready to Modernize Your Institution’s User Management?
          </h2>
          <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
            Start exploring our roles management platform today and discover a new way to empower your users and secure your systems.
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
                <UserGroupIcon className="h-8 w-8 text-blue-400" />
                <span className="ml-2 text-xl font-bold">Roles Management</span>
              </div>
              <p className="text-gray-400">
                Empowering academic institutions with next-generation roles and permissions technology.
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
                <li className="text-gray-400">Role-Based Access</li>
                <li className="text-gray-400">Academic Integration</li>
                <li className="text-gray-400">Smart Notifications</li>
              </ul>
            </div>
            
            <div>
              <h3 className="text-lg font-semibold mb-4">Contact</h3>
              <ul className="space-y-2">
                <li className="text-gray-400">support@roles.edu</li>
                <li className="text-gray-400">+1 (555) 123-4567</li>
                <li className="text-gray-400">24/7 Support Available</li>
              </ul>
            </div>
          </div>
          
          <div className="border-t border-gray-800 mt-8 pt-8 text-center">
            <p className="text-gray-400">
              © 2024 Roles Management System. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Home; 