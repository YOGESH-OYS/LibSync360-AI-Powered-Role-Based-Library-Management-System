// TODO: When adding API calls to this page, use the session expiry utility functions:
// import { isSessionExpiredResponse, isSessionExpiredError } from '../../utils/sessionUtils';
// and follow the same error handling pattern as in BookCatalog.js and Dashboard.js.

import React, { useEffect, useState } from "react";
import { userAPI } from "../../services/api";

const Profile = () => {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProfile = async () => {
      setLoading(true);
      try {
        const profileRes = await userAPI.getProfile();
        setProfile(profileRes.data);
      } catch (err) {
        setProfile(null);
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, []);

  if (loading)
    return <div className="container mx-auto px-4 py-8">Loading...</div>;
  if (!profile)
    return (
      <div className="container mx-auto px-4 py-8">Profile not found.</div>
    );

  // Stats from profile
  const totalBorrowed = profile.totalBooksBorrowed || 0;
  const withStudent = Array.isArray(profile.borrowedBooks)
    ? profile.borrowedBooks.length
    : 0;
  const totalReturned = totalBorrowed - withStudent;
  const finesPaid = profile.totalFinesPaid || 0;
  const finesToPay = profile.currentFines || 0;
  const department = profile.academicCredentials?.department || "-";
  const year = profile.academicCredentials?.year || "-";

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-gray-900 mb-4">Profile</h1>
      <div className="bg-white rounded-lg shadow-md p-6 mb-8 flex flex-col md:flex-row gap-8">
        <div className="flex-1">
          <div className="text-xl font-semibold mb-2">
            {profile.firstName} {profile.lastName}
          </div>
          <div className="text-gray-600 mb-1">Email: {profile.email}</div>
          <div className="text-gray-600 mb-1">
            Reg No: {profile.registrationNumber}
          </div>
          <div className="text-gray-600 mb-1">Department: {department}</div>
          <div className="text-gray-600 mb-1">Year: {year}</div>
          <div className="text-gray-600 mb-1">Role: {profile.role}</div>
        </div>
        <div className="flex-1 flex flex-col gap-4">
          <div className="bg-gray-100 rounded-lg p-4 flex flex-wrap gap-6">
            <div className="flex-1 min-w-[120px] text-center">
              <div className="text-gray-500">Books Borrowed</div>
              <div className="text-2xl font-bold">{totalBorrowed}</div>
            </div>
            <div className="flex-1 min-w-[120px] text-center">
              <div className="text-gray-500">Books Returned</div>
              <div className="text-2xl font-bold">{totalReturned}</div>
            </div>
            <div className="flex-1 min-w-[120px] text-center">
              <div className="text-gray-500">Un Returned</div>
              <div className="text-2xl font-bold">{withStudent}</div>
            </div>
            <div className="flex-1 min-w-[120px] text-center">
              <div className="text-gray-500">Fines Paid</div>
              <div className="text-2xl font-bold text-green-600">
                ₹{finesPaid}
              </div>
            </div>
            <div className="flex-1 min-w-[120px] text-center">
              <div className="text-gray-500">Fines To Pay</div>
              <div className="text-2xl font-bold text-red-600">
                ₹{finesToPay}
              </div>
            </div>
          </div>
        </div>
      </div>
      {/* Recommendations Section */}
      <div className="bg-white rounded-lg shadow-md p-6 mt-8">
        <h2 className="text-xl font-bold mb-2">Recommendations</h2>
        <div className="text-gray-500">No recommendations yet.</div>
      </div>
    </div>
  );
};

export default Profile;
