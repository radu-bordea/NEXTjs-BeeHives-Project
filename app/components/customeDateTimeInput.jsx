import React, { useState, forwardRef } from "react";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";

export default function CustomDateTimePicker() {
  const [startDate, setStartDate] = useState(new Date());

  const CustomInputButton = forwardRef(({ value, onClick }, ref) => (
    <button
      onClick={onClick}
      ref={ref}
      className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl shadow transition"
    >
      <span role="img" aria-label="calendar">
        📅
      </span>
      <span>{value || "Select Date & Time"}</span>
    </button>
  ));

  return (
    <div className="p-4">
      <label className="block mb-2 font-semibold text-gray-700">
        Choose Date and Time:
      </label>

      <DatePicker
        selected={startDate}
        onChange={(date) => setStartDate(date)}
        showTimeSelect
        timeIntervals={15}
        timeCaption="Time"
        dateFormat="Pp"
        customInput={<CustomInputButton />}
      />
    </div>
  );
}
