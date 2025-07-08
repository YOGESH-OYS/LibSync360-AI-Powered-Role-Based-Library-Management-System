import React, { useState, useEffect } from "react";
import { userAPI } from "../../services/api";
import { toast } from "react-hot-toast";

const EditUserModal = ({
  open,
  onClose,
  user,
  onUserUpdated,
  availableRoles,
  availableDepartments,
}) => {
  const [form, setForm] = useState(null);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [verified, setVerified] = useState(false);
  const [password, setPassword] = useState("");
  const [verifyError, setVerifyError] = useState("");

  useEffect(() => {
    if (user) {
      setForm({ ...user });
      setVerified(false);
      setPassword("");
      setVerifyError("");
      setErrors({});
    }
  }, [user, open]);

  useEffect(() => {
    if (open) {
      document.body.classList.add("overflow-hidden");
    } else {
      document.body.classList.remove("overflow-hidden");
    }
    return () => {
      document.body.classList.remove("overflow-hidden");
    };
  }, [open]);

  if (!open || !form) return null;

  const nonEditableFields = ["role", "registrationNumber", "email"];

  const validate = () => {
    const errs = {};
    if (!form.firstName) errs.firstName = "First name is required";
    if (!form.lastName) errs.lastName = "Last name is required";
    if (form.role === "student") {
      if (!form.rollNumber) errs.rollNumber = "Roll number is required";
      if (!form.academicCredentials?.department)
        errs.department = "Department is required";
      if (!form.academicCredentials?.year) errs.year = "Year is required";
      if (!form.academicCredentials?.semester)
        errs.semester = "Semester is required";
      if (
        form.academicCredentials?.cgpa === undefined ||
        form.academicCredentials?.cgpa === ""
      )
        errs.cgpa = "CGPA is required";
      if (!form.phone) errs.phone = "Phone is required";
      if (!form.address?.street) errs.street = "Street is required";
      if (!form.address?.city) errs.city = "City is required";
      if (!form.address?.state) errs.state = "State is required";
      if (!form.address?.zipCode) errs.zipCode = "Zip code is required";
      if (!form.address?.country) errs.country = "Country is required";
    }
    return errs;
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    if (type === "checkbox") {
      setForm((f) => ({ ...f, [name]: checked }));
    } else if (name.startsWith("academicCredentials.")) {
      const key = name.split(".")[1];
      setForm((f) => ({
        ...f,
        academicCredentials: { ...(f.academicCredentials || {}), [key]: value },
      }));
    } else if (name.startsWith("address.")) {
      const key = name.split(".")[1];
      setForm((f) => ({
        ...f,
        address: { ...(f.address || {}), [key]: value },
      }));
    } else {
      setForm((f) => ({ ...f, [name]: value }));
    }
  };

  const handleVerify = async () => {
    setVerifying(true);
    setVerifyError("");
    try {
      await userAPI.verifyPassword(password);
      setVerified(true);
      toast.success("Password verified. You can now edit fields.");
    } catch (err) {
      setVerifyError(
        err?.response?.data?.message || "Password verification failed"
      );
      setVerified(false);
    } finally {
      setVerifying(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validate();
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;
    setLoading(true);
    try {
      // Only send editable fields
      const payload = { ...form };
      nonEditableFields.forEach((field) => delete payload[field]);
      const resp = await userAPI.update(user._id, payload);
      toast.success("User updated successfully");
      onClose();
      if (onUserUpdated) onUserUpdated();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to update user");
    } finally {
      setLoading(false);
    }
  };

  const inputClass =
    "input border border-gray-300 rounded px-3 py-2 w-full placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-200 disabled:bg-gray-100";
  const borderClass =
    "fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-30";
  const modalClass = `bg-white rounded-lg shadow-lg w-full max-w-2xl p-8 relative border-4 ${
    verified ? "border-blue-400" : "border-red-500"
  } max-h-[70vh] overflow-y-auto`;

  return (
    <div className={borderClass}>
      <div className={modalClass}>
        <button
          className="absolute top-2 right-2 text-gray-400 hover:text-gray-600"
          onClick={onClose}
        >
          ×
        </button>
        <h2 className="text-2xl font-bold mb-4">Edit User</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label>Role</label>
              <input
                name="role"
                value={form.role || ""}
                disabled
                className={inputClass}
              />
            </div>
            <div>
              <label>Registration Number</label>
              <input
                name="registrationNumber"
                value={form.registrationNumber || ""}
                disabled
                className={inputClass}
              />
            </div>
            <div>
              <label>Email</label>
              <input
                name="email"
                value={form.email || ""}
                disabled
                className={inputClass}
              />
            </div>
            <div>
              <label>First Name</label>
              <input
                name="firstName"
                value={form.firstName || ""}
                onChange={handleChange}
                disabled={!verified}
                className={inputClass}
              />
              {errors.firstName && (
                <div className="text-red-500 text-xs">{errors.firstName}</div>
              )}
            </div>
            <div>
              <label>Last Name</label>
              <input
                name="lastName"
                value={form.lastName || ""}
                onChange={handleChange}
                disabled={!verified}
                className={inputClass}
              />
              {errors.lastName && (
                <div className="text-red-500 text-xs">{errors.lastName}</div>
              )}
            </div>
            <div>
              <label>Phone</label>
              <input
                name="phone"
                value={form.phone || ""}
                onChange={handleChange}
                disabled={!verified}
                className={inputClass}
              />
              {errors.phone && (
                <div className="text-red-500 text-xs">{errors.phone}</div>
              )}
            </div>
            <div>
              <label>Status</label>
              <select
                name="isActive"
                value={form.isActive ? "active" : "inactive"}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    isActive: e.target.value === "active",
                  }))
                }
                disabled={!verified}
                className={inputClass}
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
            <div>
              <label>Street</label>
              <input
                name="address.street"
                value={form.address?.street || ""}
                onChange={handleChange}
                disabled={!verified}
                className={inputClass}
              />
              {errors.street && (
                <div className="text-red-500 text-xs">{errors.street}</div>
              )}
            </div>
            <div>
              <label>City</label>
              <input
                name="address.city"
                value={form.address?.city || ""}
                onChange={handleChange}
                disabled={!verified}
                className={inputClass}
              />
              {errors.city && (
                <div className="text-red-500 text-xs">{errors.city}</div>
              )}
            </div>
            <div>
              <label>State</label>
              <input
                name="address.state"
                value={form.address?.state || ""}
                onChange={handleChange}
                disabled={!verified}
                className={inputClass}
              />
              {errors.state && (
                <div className="text-red-500 text-xs">{errors.state}</div>
              )}
            </div>
            <div>
              <label>Zip Code</label>
              <input
                name="address.zipCode"
                value={form.address?.zipCode || ""}
                onChange={handleChange}
                disabled={!verified}
                className={inputClass}
              />
              {errors.zipCode && (
                <div className="text-red-500 text-xs">{errors.zipCode}</div>
              )}
            </div>
            <div>
              <label>Country</label>
              <input
                name="address.country"
                value={form.address?.country || ""}
                onChange={handleChange}
                disabled={!verified}
                className={inputClass}
              />
              {errors.country && (
                <div className="text-red-500 text-xs">{errors.country}</div>
              )}
            </div>
            {form.role === "student" && (
              <>
                <div>
                  <label>Roll Number</label>
                  <input
                    name="rollNumber"
                    value={form.rollNumber || ""}
                    onChange={handleChange}
                    disabled={!verified}
                    className={inputClass}
                  />
                  {errors.rollNumber && (
                    <div className="text-red-500 text-xs">
                      {errors.rollNumber}
                    </div>
                  )}
                </div>
                <div>
                  <label>Department</label>
                  <select
                    name="academicCredentials.department"
                    value={form.academicCredentials?.department || ""}
                    onChange={handleChange}
                    disabled={!verified}
                    className={inputClass}
                  >
                    <option value="">Select Department</option>
                    {availableDepartments?.map((dep) => (
                      <option key={dep} value={dep}>
                        {dep}
                      </option>
                    ))}
                  </select>
                  {errors.department && (
                    <div className="text-red-500 text-xs">
                      {errors.department}
                    </div>
                  )}
                </div>
                <div>
                  <label>Year</label>
                  <input
                    name="academicCredentials.year"
                    type="number"
                    value={form.academicCredentials?.year || ""}
                    onChange={handleChange}
                    disabled={!verified}
                    className={inputClass}
                  />
                  {errors.year && (
                    <div className="text-red-500 text-xs">{errors.year}</div>
                  )}
                </div>
                <div>
                  <label>Semester</label>
                  <input
                    name="academicCredentials.semester"
                    type="number"
                    value={form.academicCredentials?.semester || ""}
                    onChange={handleChange}
                    disabled={!verified}
                    className={inputClass}
                  />
                  {errors.semester && (
                    <div className="text-red-500 text-xs">
                      {errors.semester}
                    </div>
                  )}
                </div>
                <div>
                  <label>CGPA</label>
                  <input
                    name="academicCredentials.cgpa"
                    type="number"
                    step="0.01"
                    value={form.academicCredentials?.cgpa || ""}
                    onChange={handleChange}
                    disabled={!verified}
                    className={inputClass}
                  />
                  {errors.cgpa && (
                    <div className="text-red-500 text-xs">{errors.cgpa}</div>
                  )}
                </div>
              </>
            )}
          </div>
          {!verified && (
            <div className="mt-4">
              <label>Enter your password to enable editing:</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={inputClass}
                autoFocus
              />
              {verifyError && (
                <div className="text-red-500 text-xs">{verifyError}</div>
              )}
              <button
                type="button"
                onClick={handleVerify}
                className="mt-2 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                disabled={verifying || !password}
              >
                {verifying ? "Verifying..." : "Verify"}
              </button>
            </div>
          )}
          <div className="flex justify-end mt-6">
            <button
              type="submit"
              className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
              disabled={!verified || loading}
            >
              {loading ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditUserModal;
