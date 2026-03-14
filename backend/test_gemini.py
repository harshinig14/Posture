import google.generativeai as genai
import warnings
warnings.filterwarnings("ignore")

genai.configure(api_key='AIzaSyB5X3p1I5vwlZIjAWuY3WmhQWq6y8LVveg')

models_to_try = [
    'gemini-1.5-flash',
    'gemini-pro',
    'gemini-1.0-pro',
    'models/gemini-1.5-flash',
    'models/gemini-pro',
]

for model_name in models_to_try:
    try:
        model = genai.GenerativeModel(model_name)
        response = model.generate_content('Say hi')
        print(f"SUCCESS with {model_name}: {response.text[:50]}")
        break
    except Exception as e:
        print(f"FAILED {model_name}: {str(e)[:80]}")
