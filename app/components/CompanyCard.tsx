"use client";

import { useState } from 'react';
import StarRating from './StarRating';

interface CompanyCardProps {
  logoUrl: string;
  name: string;
  ticker: string;
  esgRatings: {
    [category: string]: {
      rating: number;
      explanation: string;
      sources?: string[];
    };
  };
}

const renderWithBold = (text: string) => {
  const boldedText = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  return { __html: boldedText };
};

const CompanyCard: React.FC<CompanyCardProps> = ({ logoUrl, name, ticker, esgRatings }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="border rounded-lg p-4 mb-4 shadow-sm bg-white transition-shadow duration-300 hover:shadow-md">
      {/* Collapsed State */}
      <div className="flex items-center justify-between cursor-pointer" onClick={() => setIsExpanded(!isExpanded)}>
        <div className="flex items-center">
          <img src={logoUrl} alt={`${name} logo`} className="h-12 w-12 mr-4 object-contain" />
          <div>
            <h2 className="text-lg font-bold">{name}</h2>
            <p className="text-sm text-gray-500">{ticker}</p>
          </div>
        </div>
        <button
          className="text-sm font-semibold text-blue-600 hover:underline"
        >
          {isExpanded ? 'Hide Details ▲' : 'Expand Details ▼'}
        </button>
      </div>

      {/* Expanded State */}
      {isExpanded && (
        <div className="mt-4 pt-4 border-t border-gray-200">
          <h3 className="text-md font-semibold mb-3 text-gray-800">ESG Ratings Breakdown</h3>
          <div className="space-y-4">
            {Object.entries(esgRatings).map(([category, data]) => (
              <div key={category}>
                <div className="flex items-center justify-between">
                  <p className="font-semibold capitalize text-gray-700">{category.replace(/_/g, ' ')}</p>
                  <div className="flex items-center">
                    <StarRating rating={data.rating} />
                    <span className="ml-2 text-sm font-medium text-gray-800">{data.rating}/5</span>
                  </div>
                </div>
                <p 
                    className="text-sm text-gray-600 mt-1"
                    dangerouslySetInnerHTML={renderWithBold(data.explanation)}></p>
                {data.sources && data.sources.length > 0 && (
                  <div className="mt-2">
                    <p className="text-xs font-semibold text-gray-500">Sources:</p>
                    <ul className="list-disc list-inside space-y-1">
                      {data.sources.map((source, index) => (
                        <li key={index} className="text-xs text-blue-500 hover:underline">
                          <a href={source} target="_blank" rel="noopener noreferrer">{new URL(source).hostname}</a>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default CompanyCard;
