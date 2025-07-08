import React, { useState } from "react";
import { userAPI } from "../../services/api";
import { toast } from "react-hot-toast";

const emptyStudent = {
  username: "",
  email: "",
  password: "",
  role: "student",
  firstName: "",
  lastName: "",
  registrationNumber: "",
  rollNumber: "",
  academicCredentials: {
    department: "",
    year: "",
    semester: "",
    cgpa: "",
  },
  phone: "",
  address: {
    street: "",
    city: "",
    state: "",
    zipCode: "",
    country: "",
  },
  isActive: true,
  isEmailVerified: true,
};

const emptyStaff = {
  username: "",
  email: "",
  password: "",
  role: "staff",
  firstName: "",
  lastName: "",
  registrationNumber: "",
  isActive: true,
  isEmailVerified: true,
};

const emptyAdmin = {
  username: "",
  email: "",
  password: "",
  role: "admin",
  firstName: "",
  lastName: "",
  registrationNumber: "",
  isActive: true,
  isEmailVerified: true,
};

const AddUserModal = ({
  open,
  onClose,
  onUserAdded,
  availableRoles,
  availableDepartments,
}) => {
  const [role, setRole] = useState("student");
  const [form, setForm] = useState({ ...emptyStudent });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  React.useEffect(() => {
    if (role === "student") setForm({ ...emptyStudent });
    else if (role === "staff") setForm({ ...emptyStaff });
    else if (role === "admin") setForm({ ...emptyAdmin });
    setErrors({});
  }, [role, open]);

  if (!open) return null;

  const validate = () => {
    const errs = {};
    if (!form.username) errs.username = "Username is required";
    if (!form.email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(form.email))
      errs.email = "Valid email is required";
    if (!form.password || form.password.length < 6)
      errs.password = "Password (min 6 chars) is required";
    if (!form.firstName) errs.firstName = "First name is required";
    if (!form.lastName) errs.lastName = "Last name is required";
    if (!form.registrationNumber)
      errs.registrationNumber = "Registration number is required";
    if (role === "student") {
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    // console.log('[DEBUG] Form data before validation:', form);
    const errs = validate();
    console.log('[DEBUG] Validation errors:', errs);
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;
    setLoading(true);
    try {
      let payload = { ...form };
      if (role !== "student") {
        delete payload.rollNumber;
        delete payload.academicCredentials;
        delete payload.phone;
        delete payload.address;
      }
      // console.log('[DEBUG] Payload to be sent to API:', payload);
      const resp = await userAPI.create(payload);
      // console.log('[DEBUG] API response:', resp);
      toast.success("User added successfully");
      onClose();
      if (onUserAdded) onUserAdded();
    } catch (err) {
      console.log('[DEBUG] API error:', err);
      toast.error(err?.response?.data?.message || "Failed to add user");
    } finally {
      setLoading(false);
    }
  };

  // Dynamic fields based on role
  const renderFields = () => {
    const inputClass =
      "input border border-gray-300 rounded px-3 py-2 w-full placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-200";
    const common = (
      <>
        <div>
          <label>Username</label>
          <input
            name="username"
            value={form.username || ""}
            onChange={handleChange}
            onInput={handleChange}
            placeholder="e.g. STU01"
            className={inputClass}
            autoComplete="username"
          />
          {errors.username && (
            <div className="text-red-500 text-xs">{errors.username}</div>
          )}
        </div>
        <div>
          <label>Email</label>
          <input
            name="email"
            value={form.email || ""}
            onChange={handleChange}
            onInput={handleChange}
            placeholder="e.g. student@example.com"
            className={inputClass}
            autoComplete="email"
          />
          {errors.email && (
            <div className="text-red-500 text-xs">{errors.email}</div>
          )}
        </div>
        <div>
          <label>Password</label>
          <input
            name="password"
            value={form.password || ""}
            onChange={handleChange}
            onInput={handleChange}
            placeholder="e.g. Password123!"
            className={inputClass}
            type="password"
            autoComplete="new-password"
          />
          {errors.password && (
            <div className="text-red-500 text-xs">{errors.password}</div>
          )}
        </div>
        <div>
          <label>First Name</label>
          <input
            name="firstName"
            value={form.firstName || ""}
            onChange={handleChange}
            onInput={handleChange}
            placeholder="e.g. John"
            className={inputClass}
            autoComplete="given-name"
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
            onInput={handleChange}
            placeholder="e.g. Doe"
            className={inputClass}
            autoComplete="family-name"
          />
          {errors.lastName && (
            <div className="text-red-500 text-xs">{errors.lastName}</div>
          )}
        </div>
        <div>
          <label>Registration Number</label>
          <input
            name="registrationNumber"
            value={form.registrationNumber || ""}
            onChange={handleChange}
            onInput={handleChange}
            placeholder="e.g. STU2024001"
            className={inputClass}
            autoComplete="off"
          />
          {errors.registrationNumber && (
            <div className="text-red-500 text-xs">
              {errors.registrationNumber}
            </div>
          )}
        </div>
        <div>
          <label>Role</label>
          <select
            name="role"
            value={role}
            onChange={(e) => setRole(e.target.value)}
            className={inputClass}
            autoComplete="off"
          >
            {availableRoles.map((r) => (
              <option key={r} value={r}>
                {r.charAt(0).toUpperCase() + r.slice(1)}
              </option>
            ))}
          </select>
        </div>
        <div className="flex items-center space-x-4 mt-2">
          <label className="flex items-center">
            <input
              type="checkbox"
              name="isActive"
              checked={form.isActive}
              onChange={handleChange}
            />
            <span className="ml-1">Active</span>
          </label>
          <label className="flex items-center">
            <input
              type="checkbox"
              name="isEmailVerified"
              checked={form.isEmailVerified}
              onChange={handleChange}
            />
            <span className="ml-1">Email Verified</span>
          </label>
        </div>
      </>
    );
    if (role === "student") {
      return (
        <>
          {common}
          <div>
            <label>Roll Number</label>
            <input
              name="rollNumber"
              value={form.rollNumber || ""}
              onChange={handleChange}
              onInput={handleChange}
              placeholder="e.g. CS2024001"
              className={inputClass}
              autoComplete="off"
            />
            {errors.rollNumber && (
              <div className="text-red-500 text-xs">{errors.rollNumber}</div>
            )}
          </div>
          <div>
            <label>Department</label>
            <select
              name="academicCredentials.department"
              value={form.academicCredentials?.department || ""}
              onChange={handleChange}
              onInput={handleChange}
              className={inputClass}
              autoComplete="off"
            >
              <option value="">Select department</option>
              {availableDepartments.map((dep) => (
                <option key={dep} value={dep}>
                  {dep}
                </option>
              ))}
            </select>
            {errors.department && (
              <div className="text-red-500 text-xs">{errors.department}</div>
            )}
          </div>
          <div>
            <label>Year</label>
            <input
              name="academicCredentials.year"
              value={form.academicCredentials?.year || ""}
              onChange={handleChange}
              onInput={handleChange}
              placeholder="e.g. 3"
              className={inputClass}
              type="number"
              min="1"
              max="5"
              autoComplete="off"
            />
            {errors.year && (
              <div className="text-red-500 text-xs">{errors.year}</div>
            )}
          </div>
          <div>
            <label>Semester</label>
            <input
              name="academicCredentials.semester"
              value={form.academicCredentials?.semester || ""}
              onChange={handleChange}
              onInput={handleChange}
              placeholder="e.g. 5"
              className={inputClass}
              type="number"
              min="1"
              max="10"
              autoComplete="off"
            />
            {errors.semester && (
              <div className="text-red-500 text-xs">{errors.semester}</div>
            )}
          </div>
          <div>
            <label>CGPA</label>
            <input
              name="academicCredentials.cgpa"
              value={form.academicCredentials?.cgpa || ""}
              onChange={handleChange}
              onInput={handleChange}
              placeholder="e.g. 3.8"
              className={inputClass}
              type="number"
              step="0.01"
              min="0"
              max="10"
              autoComplete="off"
            />
            {errors.cgpa && (
              <div className="text-red-500 text-xs">{errors.cgpa}</div>
            )}
          </div>
          <div>
            <label>Phone</label>
            <input
              name="phone"
              value={form.phone || ""}
              onChange={handleChange}
              onInput={handleChange}
              placeholder="e.g. +1234567890"
              className={inputClass}
              autoComplete="tel"
            />
            {errors.phone && (
              <div className="text-red-500 text-xs">{errors.phone}</div>
            )}
          </div>
          <div>
            <label>Address</label>
            <input
              name="address.street"
              value={form.address?.street || ""}
              onChange={handleChange}
              onInput={handleChange}
              placeholder="e.g. 123 College Street"
              className={inputClass}
              autoComplete="address-line1"
            />
            {errors.street && (
              <div className="text-red-500 text-xs">{errors.street}</div>
            )}
            <input
              name="address.city"
              value={form.address?.city || ""}
              onChange={handleChange}
              onInput={handleChange}
              placeholder="e.g. University City"
              className={inputClass + " mt-1"}
              autoComplete="address-level2"
            />
            {errors.city && (
              <div className="text-red-500 text-xs">{errors.city}</div>
            )}
            <input
              name="address.state"
              value={form.address?.state || ""}
              onChange={handleChange}
              onInput={handleChange}
              placeholder="e.g. CA"
              className={inputClass + " mt-1"}
              autoComplete="address-level1"
            />
            {errors.state && (
              <div className="text-red-500 text-xs">{errors.state}</div>
            )}
            <input
              name="address.zipCode"
              value={form.address?.zipCode || ""}
              onChange={handleChange}
              onInput={handleChange}
              placeholder="e.g. 12345"
              className={inputClass + " mt-1"}
              autoComplete="postal-code"
            />
            {errors.zipCode && (
              <div className="text-red-500 text-xs">{errors.zipCode}</div>
            )}
            <input
              name="address.country"
              value={form.address?.country || ""}
              onChange={handleChange}
              onInput={handleChange}
              placeholder="e.g. USA"
              className={inputClass + " mt-1"}
              autoComplete="country"
            />
            {errors.country && (
              <div className="text-red-500 text-xs">{errors.country}</div>
            )}
          </div>
        </>
      );
    }
    return common;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
      <div
        className={`bg-white rounded-lg shadow-lg w-full max-w-2xl p-8 relative border-4 ${
          role === "admin" ? "border-red-500" : "border-transparent"
        } transition-all duration-200`}
        style={{ minHeight: 600, maxHeight: 700, overflowY: "auto" }}
      >
        <button
          className="absolute top-2 right-2 text-gray-400 hover:text-gray-700 text-2xl"
          onClick={onClose}
        >
          &times;
        </button>
        <h2 className="text-2xl font-bold mb-4">
          Add New {role.charAt(0).toUpperCase() + role.slice(1)}
        </h2>
        {role === "admin" && (
          <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
            <strong>Warning:</strong> You are creating an <b>Admin</b> user.
            Admins have full access to the system.
          </div>
        )}
        <form
          className="grid grid-cols-1 md:grid-cols-2 gap-4"
          onSubmit={handleSubmit}
        >
          {renderFields()}
        </form>
        <div className="mt-6 flex justify-end">
          <button
            className="bg-gray-200 text-gray-700 px-4 py-2 rounded mr-2"
            onClick={onClose}
            type="button"
            disabled={loading}
          >
            Cancel
          </button>
          <button
            className={`bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700 ${
              loading ? "opacity-50 cursor-not-allowed" : ""
            }`}
            type="submit"
            onClick={handleSubmit}
            disabled={loading}
          >
            {loading ? "Adding..." : "Add User"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AddUserModal;
