import React, { useState, forwardRef } from "react";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";

export default function CustomInputDatePicker() {
  const [startDate, setStartDate] = useState(new Date());

  const CustomButton = forwardRef(({ value, onClick }, ref) => (
    <button
      onClick={onClick}
      ref={ref}
      className="bg-blue-600 text-white px-4 py-2 rounded shadow-md"
    >
      📅 {value}
    </button>
  ));

  return (
    <div className="p-4">
      <label className="block mb-2 font-semibold">Select Date:</label>
      <DatePicker
        selected={startDate}
        onChange={(date) => setStartDate(date)}
        customInput={<CustomButton />}
        dateFormat="P" // You can use "Pp" if you want time too
      />
    </div>
  );
}
