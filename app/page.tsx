// async function getCompanies() {
//   // This fetch runs on the server at build time.
//   const res = await fetch("http://localhost:8000/api/companies", {
//     cache: 'force-cache' // The default behavior, great for SSG
//   });

//   if (!res.ok) {
//     throw new Error("Failed to fetch companies");
//   }

//   const data = await res.json();
//   return data.companies.map((c: any) => c.name);
// }

"use client";
import { useState, useEffect, useMemo } from 'react';
import EsgFilterSlider from './components/EsgFilterSlider';
import CompanyCard from './components/CompanyCard';
import ScreenedOutCompanyCard from './components/ScreenedOutCompanyCard';
import { Company } from './types';

const initialSliderState = {
  "Climate & Carbon": 1,
  "Pollution & Waste": 1,
  "Labor & Employees": 1,
  "Community & Customers": 1,
  "Supply Chain": 1,
  "Corporate Governance": 1,
  "Corporate Behavior": 1,
};

// Helper to calculate overall ESG score
const calculateOverallEsg = (esgRatings: Company['esg_ratings']) => {
  if (!esgRatings || Object.keys(esgRatings).length === 0) {
    return 0;
  }
  const total = Object.values(esgRatings).reduce((acc, { rating }) => acc + rating, 0);
  return total / Object.keys(esgRatings).length;
};


export default function Home() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [sliderValues, setSliderValues] = useState(initialSliderState);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortOrder, setSortOrder] = useState('name-asc');
  const [isScreenedOutVisible, setIsScreenedOutVisible] = useState(false);

  useEffect(() => {
    const fetchCompanies = async () => {
      try {
        setLoading(true);
        const res = await fetch(`/api/companies`);
        if (!res.ok) {
          throw new Error(`Failed to fetch companies: ${res.statusText}`);
        }
        const data = await res.json();
        setCompanies(data.companies);
        setError(null);
      } catch (err: any) {
        setError(err.message);
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchCompanies();
  }, []);


  const handleSliderChange = (category: string, newValue: number) => {
    setSliderValues(prevValues => ({
      ...prevValues,
      [category]: newValue,
    }));
  };

  const resetFilters = () => {
    setSliderValues(initialSliderState);
    setSearchTerm('');
    setSortOrder('name-asc');
    console.log("Filters reset!");
  };

  const { passed, failed } = useMemo(() => {
    const passed: Company[] = [];
    const failed: (Company & { reasons: string[] })[] = [];

    companies
      .filter(company =>
        company.name.toLowerCase().includes(searchTerm.toLowerCase())
      )
      .forEach(company => {
        if (!company.esg_ratings) {
          failed.push({ ...company, reasons: ["Missing ESG ratings."] });
          return;
        }

        const failedCriteria: string[] = [];
        for (const [category, minRating] of Object.entries(sliderValues)) {
          const companyRating = company.esg_ratings[category]?.rating;

          // Check if the company's rating is below the minimum set by the slider
          if (companyRating !== undefined && companyRating < minRating) {
            failedCriteria.push(`Failed on ${category} (Score: ${companyRating}, Your Min: ${minRating})`);
          }
        }

        if (failedCriteria.length > 0) {
          failed.push({ ...company, reasons: failedCriteria });
        } else {
          passed.push(company);
        }
      });

    // Sorting for passed companies
    passed.sort((a, b) => {
      switch (sortOrder) {
        case 'name-asc':
          return a.name.localeCompare(b.name);
        case 'name-desc':
          return b.name.localeCompare(a.name);
        case 'esg-asc':
          return calculateOverallEsg(a.esg_ratings) - calculateOverallEsg(b.esg_ratings);
        case 'esg-desc':
          return calculateOverallEsg(b.esg_ratings) - calculateOverallEsg(a.esg_ratings);
        default:
          return 0;
      }
    });

    return { passed, failed };
  }, [companies, searchTerm, sliderValues, sortOrder]);

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-gray-50">
      {/* Left Column: Control Panel */}
      <div className="w-full md:w-[30%] bg-white p-6 border-r border-gray-200 flex flex-col">
        <div>
          <h1 className="text-2xl font-bold mb-2">Customize Your Minimum ESG Criteria</h1>
          <p className="text-gray-600 mb-6">
            Showing {passed.length} / {companies.length} Companies
          </p>
          
          <div className="mb-6">
            <input
              type="text"
              placeholder="Search by company name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded-md"
            />
          </div>

          {Object.keys(initialSliderState).map(category => (
            <EsgFilterSlider 
              key={category}
              category={category}
              methodology={`Minimum acceptable rating for ${category}.`}
              value={sliderValues[category as keyof typeof sliderValues]}
              onChange={(newValue) => handleSliderChange(category, newValue)}
            />
          ))}
        </div>

        <button 
          onClick={resetFilters}
          className="w-full bg-gray-800 text-white py-2 px-4 rounded hover:bg-gray-700 transition-colors mt-6"
        >
          Reset Filters
        </button>
      </div>

      {/* Right Column: Results Display */}
      <div className="w-full md:w-[70%] p-6">
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-2xl font-bold">Results Display</h1>
        </div>
        
        {loading && <p>Loading companies...</p>}
        {error && <p className="text-red-500">Error: {error}</p>}
        {!loading && !error && (
          <>
            <div className="space-y-4">
              {passed.map(company => (
                <CompanyCard 
                  key={company.id}
                  // TODO: Add logo and ticker to the database and API
                  logoUrl={`https://logo.clearbit.com/${company.name.replace(/\s+/g, '').toLowerCase()}.com`}
                  name={company.name}
                  ticker={company.name.substring(0, 4).toUpperCase()} // Placeholder
                  esgRatings={company.esg_ratings}
                />
              ))}
            </div>

            {failed.length > 0 && (
              <div className="mt-8">
                <button
                  onClick={() => setIsScreenedOutVisible(!isScreenedOutVisible)}
                  className="w-full text-left p-3 bg-gray-200 border border-gray-300 rounded-lg hover:bg-gray-300 focus:outline-none transition-colors"
                >
                  <span className="font-semibold text-gray-800">
                    View {failed.length} Screened-Out Companies {isScreenedOutVisible ? '▲' : '▼'}
                  </span>
                </button>
                {isScreenedOutVisible && (
                  <div className="mt-4 border-t pt-4">
                    {failed.map(company => (
                      <ScreenedOutCompanyCard
                        key={company.id}
                        logoUrl={`https://logo.clearbit.com/${company.name.replace(/\s+/g, '').toLowerCase()}.com`}
                        name={company.name}
                        ticker={company.name.substring(0, 4).toUpperCase()} // Placeholder
                        reasons={company.reasons}
                        esgRatings={company.esg_ratings}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}