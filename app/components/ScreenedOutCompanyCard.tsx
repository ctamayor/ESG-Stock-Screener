"use client";
import { useState } from 'react';
import { Company } from '../types';

type ScreenedOutCompanyCardProps = {
  logoUrl: string;
  name: string;
  ticker: string;
  reasons: string[];
  esgRatings: Company['esg_ratings'];
};

// Helper component to parse and render text with **bold** tags
const BoldRenderer = ({ text }: { text: string }) => {
  if (!text) return null;

  const parts = text.split('**');
  return (
    <>
      {parts.map((part, index) =>
        index % 2 === 1 ? <strong key={index}>{part}</strong> : <span key={index}>{part}</span>
      )}
    </>
  );
};

const ScreenedOutCompanyCard = ({ name, logoUrl, ticker, reasons, esgRatings }: ScreenedOutCompanyCardProps) => {
  const [isDropdownVisible, setIsDropdownVisible] = useState(false);

  // Extract the names of the failed categories from the 'reasons' prop for easy lookup
  const failedCategories = new Set(
    reasons.map(reason => {
      // Extracts "Category Name" from "Failed on Category Name (Score: X, Your Min: Y)"
      const match = reason.match(/^Failed on (.*?)\s\(/);
      return match ? match[1] : null;
    }).filter(Boolean)
  );

  const allExplanations: { category: string; explanation: string; rating: number; isFailure: boolean }[] = [];

  // Populate explanations and determine if they were a failure point
  if (esgRatings) {
    for (const [category, data] of Object.entries(esgRatings)) {
      if (data && data.explanation) {
        allExplanations.push({
          category,
          explanation: data.explanation,
          rating: data.rating,
          isFailure: failedCategories.has(category),
        });
      }
    }
  }

  // Sort explanations to put failed ones at the top
  allExplanations.sort((a, b) => {
    if (a.isFailure && !b.isFailure) return -1;
    if (!a.isFailure && b.isFailure) return 1;
    return a.category.localeCompare(b.category);
  });


  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 mb-3 shadow-sm">
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          <img src={logoUrl} alt={`${name} logo`} className="w-10 h-10 rounded-full mr-4" />
          <div>
            <h3 className="font-bold text-lg text-gray-800">{name}</h3>
            <p className="text-sm text-gray-500">{ticker}</p>
          </div>
        </div>
        <button
          onClick={() => setIsDropdownVisible(!isDropdownVisible)}
          className="text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold py-2 px-4 rounded-lg transition-colors"
        >
          {isDropdownVisible ? 'Hide Explanations' : 'Show Explanations'}
        </button>
      </div>
      <div className="mt-3">
        <p className="text-sm font-semibold text-red-600">Screened Out For:</p>
        <ul className="list-disc list-inside text-sm text-red-500 mt-1">
          {reasons.map((reason, index) => (
            <li key={index}>{reason}</li>
          ))}
        </ul>
      </div>

      {isDropdownVisible && (
        <div className="mt-4 border-t border-gray-200 pt-3">
          <h4 className="font-semibold text-md text-gray-800 mb-2">ESG Rating Explanations</h4>
          <div className="space-y-3">
            {allExplanations.length > 0 ? (
              allExplanations.map(({ category, explanation, rating, isFailure }) => (
                <div key={category} className={`p-3 rounded-md ${isFailure ? 'bg-red-50 border border-red-200' : 'bg-gray-50'}`}>
                  <p className="font-bold text-gray-900">
                    {category} - <span className="font-normal">Score: {rating}</span>
                    {isFailure && <span className="text-red-600 font-bold ml-2">(Failed Criteria)</span>}
                  </p>
                  <p className="text-sm text-gray-600 mt-1">
                    <BoldRenderer text={explanation} />
                  </p>
                </div>
              ))
            ) : (
              <p className="text-sm text-gray-500">No detailed explanations available.</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default ScreenedOutCompanyCard;