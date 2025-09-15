"use client";

// No longer needs its own 'useState'
// import { useState } from 'react';

interface EsgFilterSliderProps {
  category: string;
  methodology: string;
  value: number; // Add 'value' prop
  onChange: (newValue: number) => void; // Add 'onChange' prop
}

const ratingDescriptions = {
  1: "Very Poor: Significant issues and lack of transparency.",
  2: "Poor: Some effort, but major concerns remain.",
  3: "Average: Meets basic standards, but has room for improvement.",
  4: "Good: Strong performance and clear reporting.",
  5: "Excellent: Leader in the industry with outstanding practices."
};

const EsgFilterSlider: React.FC<EsgFilterSliderProps> = ({ category, methodology, value, onChange }) => {
  // REMOVE the internal state: const [value, setValue] = useState(3);

  return (
    <div className="mb-6">
      <div className="flex items-center mb-2">
        <label className="font-semibold mr-2">{category}</label>
        <div className="relative flex items-center">
          <span className="cursor-pointer text-gray-500 peer">ⓘ</span>
          <div className="absolute bottom-full mb-2 w-64 bg-black text-white text-xs rounded py-1 px-2 opacity-0 peer-hover:opacity-100 transition-opacity duration-300 pointer-events-none">
            {methodology}
          </div>
        </div>
      </div>
      <input
        type="range"
        min="1"
        max="5"
        value={value} // Use the 'value' from props
        onChange={(e) => onChange(Number(e.target.value))} // Call the 'onChange' function from props
        className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
      />
      <div className="flex justify-between text-xs text-gray-600 mt-1">
        <span>Very Poor</span>
        <div className="relative flex items-center">
          <span className="cursor-pointer peer">Ratings ⓘ</span>
          <div className="absolute bottom-full mb-2 w-72 bg-black text-white text-xs rounded py-2 px-3 opacity-0 peer-hover:opacity-100 transition-opacity duration-300 pointer-events-none">
            <ul className="list-none p-0">
              {Object.entries(ratingDescriptions).map(([key, desc]) => (
                <li key={key} className="mb-1"><strong>{key}:</strong> {desc}</li>
              ))}
            </ul>
          </div>
        </div>
        <span>Excellent</span>
      </div>
    </div>
  );
};

export default EsgFilterSlider;