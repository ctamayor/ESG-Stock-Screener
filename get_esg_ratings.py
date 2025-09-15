import os
from google import genai
from google.genai import types
from dotenv import load_dotenv
import json
import re
import time
import pandas as pd
import requests
from langchain_core.runnables import RunnableLambda, RunnableConfig
from app import crud, database, models

def get_esg_ratings(llm,company_name: str, search_grounding=False):
    """
    Queries the Gemini 2.5 Pro API with web search grounding to get ESG ratings for a given company.

    Args:
        company_name: The name of the company to get ESG ratings for.
        search_grounding: Whether to use web search grounding.

    Returns:
        A dictionary containing the ESG ratings and explanations, or None if an error occurs.
    """
    final_result = {"company_name": company_name}
    categories = [
        "Climate & Carbon",
        "Natural Resources",
        "Pollution & Waste",
        "Labor & Employees",
        "Community & Customers",
        "Supply Chain",
        "Corporate Governance",
        "Corporate Behavior"
    ]
    descriptions = {"Climate & Carbon":"Focuses on energy use and emissions. This could include metrics like carbon intensity (CO2​e per dollar of revenue), absolute emissions (Scope 1, 2, and 3), and commitment to renewable energy.", 
                  "Natural Resources":"Relates to the company's impact on the natural world. Key issues are water stress, biodiversity impact, and land use.", 
                  "Pollution & Waste":"Addresses the outputs of a company's operations. This includes toxic chemical releases, plastic waste generation, and recycling policies.",
                  "Labor & Employees":"How a company treats its workforce. Metrics could include employee turnover, safety incidents, commitment to diversity and inclusion (DEI), and fair wage policies.",
                  "Community & Customers":"How a company interacts with the outside world. This is a broad category covering data privacy, product safety, ethical marketing, and community relations, including engagement with indigenous communities.",
                  "Supply Chain":"Focuses on the ethics of a company's suppliers. The primary concern here is screening for human rights abuses like forced or child labor within the supply chain.",
                  "Corporate Governance":"The mechanics of the board and management. Topics could include if an independent board chairman exists, executive compensation, or shareholder rights.",
                  "Corporate Behavior":"The ethics of how the company operates. This includes lobbying activities, political contributions, history of corruption or bribery, and anti-competitive practices."
    }
    max_retries = 3
    base_sleep_time = 5  # seconds

    try:
        print(f"Fetching ratings for {company_name}...")
        for category in categories:
            prompt = f"""
            For the company {company_name}, provide a single rating for the category {category} with the description: {descriptions[category]}.

            The rating should be on a scale of 1 to 5, where:
            1 = Very Poor: Significant issues and lack of transparency.
            2 = Poor: Some effort, but major concerns remain.
            3 = Average: Meets basic standards, but has room for improvement.
            4 = Good: Strong performance and clear reporting.
            5 = Excellent: Leader in the industry with outstanding practices.

            Provide:
            1. A single integer rating from 1 to 5.
            2. A thorough explanation for the rating, citing specific examples, data, and/or news.

            Return the output as a JSON object wrapped in a markdown code block (```json ... ```) with the following structure:
            {{
              "{category.lower()}": {{
                "rating": <integer>,
                "explanation": "<string>"
              }}
            }}
            """

            response = None
            retries = 0
            while retries < max_retries:
                try:
                    if search_grounding:
                        grounding_tool = types.Tool(google_search=types.GoogleSearch())
                        config = types.GenerateContentConfig(tools=[grounding_tool])
                        response = llm.generate_content(
                            model="gemini-2.5-pro",
                            contents=prompt,
                            config=config,
                        )
                    else:
                        response = llm.generate_content(
                            model="gemini-2.5-pro",
                            contents=prompt
                        )
                    
                    if response and response.text:
                        break  # Success, exit retry loop
                    else:
                        raise ValueError("Received an empty or invalid response from the API.")

                except Exception as e:
                    error_message = str(e)
                    print(f"Attempt {retries + 1} for '{category}' failed: {error_message}")
                    retries += 1
                    if retries >= max_retries:
                        raise Exception(f"All {max_retries} retries failed for category '{category}'.")

                    quota_match = re.search(r'retry after (\d+)', error_message, re.IGNORECASE)
                    if quota_match:
                        sleep_time = int(quota_match.group(1))
                        print(f"Quota error detected. Retrying in {sleep_time} seconds...")
                        time.sleep(sleep_time)
                    else:
                        sleep_time = base_sleep_time * (2 ** (retries - 1))
                        print(f"Retrying in {sleep_time} seconds...")
                        time.sleep(sleep_time)
            
            text_to_parse = response.text
            
            json_match = re.search(r'```json\n({.*?})\n```', text_to_parse, re.DOTALL)
            if not json_match:
                raise ValueError(f"Failed to find a JSON block in the response.\nRaw Response:\n{text_to_parse}")
            
            json_text = json_match.group(1)
            category_data = json.loads(json_text)

            final_result.update(category_data)
        
        return final_result

    except Exception as e:
        print(f"An error occurred: {e}")
        return None

def get_sp500_companies():
    """
    Fetches the list of S&P 500 company names from Wikipedia.
    
    Returns:
        A list of strings, where each string is a company name.
    """
    # URL for the Wikipedia page
    url = 'https://en.wikipedia.org/wiki/List_of_S&P_500_companies'
    
    # Add a User-Agent header to mimic a web browser 🕵️‍♂️
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.36'
    }
    
    # 1. Fetch the page content using requests
    response = requests.get(url, headers=headers)
    
    # 2. Pass the HTML content (response.text) to pandas
    #    This avoids the 403 error because requests handled the "browser-like" access
    tables = pd.read_html(response.text)
    
    # The rest of the code is the same
    sp500_table = tables[0]
    company_names = sp500_table['Security'].tolist()
    
    return company_names

if __name__ == "__main__":
    load_dotenv()
    api_key = os.getenv("GEMINI_API_KEY")
    llm = genai.Client(api_key=api_key).models
    all_companies = get_sp500_companies()

    get_esg_ratings_runnable = RunnableLambda(
        lambda company: get_esg_ratings(
            llm, company, search_grounding=False
        ),
        name="ESGRatingsWorker"
    )

    batch_config = RunnableConfig(max_concurrency=min(len(all_companies), 25))

    results = get_esg_ratings_runnable.batch(all_companies, config=batch_config)

    # Save results to the database
    db = database.SessionLocal()
    try:
        # Ensure the table is created
        models.Base.metadata.create_all(bind=database.engine)
        
        for esg_data in results:
            if esg_data:
                company_name = esg_data.get("company_name")
                crud.create_or_update_company(db=db, company_data=esg_data)
                print(f"Successfully saved data for {company_name}.")
            else:
                print("Skipping empty ESG data.")
    except Exception as e:
        print(f"Failed to save data to the database: {e}")
    finally:
        db.close()
    
    print("All companies have been processed.")    



    # print("\n--- Verifying Data in Database ---")
    # db_verify = None # Initialize to ensure it's defined
    # try:
    #     # Open a new session for verification
    #     db_verify = database.SessionLocal() 
        
    #     # Fetch all companies that were just added
    #     companies_in_db = db_verify.query(models.Company).all()
        
    #     print(f"✅ Found {len(companies_in_db)} companies in the database.")

    #     # Print the details for each company to confirm
    #     for company in companies_in_db:
    #         print(f"  - Company: {company.name}")
    #         print(f"  - Supply Chain: {company.esg_ratings.get('Supply Chain')}")
    #         print(f"  - Climate & Carbon: {company.esg_ratings.get('Climate & Carbon')}")

    # except Exception as e:
    #     print(f"❌ Verification failed: {e}")
    # finally:
    #     if db_verify:
    #         db_verify.close()


