"""
OpenRouter API client - replacement for OpenAI SDK
Uses free models available on OpenRouter
"""
import os
import requests
import json

# Free models available on OpenRouter (must include :free suffix)
# Check https://openrouter.ai/models for current free models
# Note: Some models require data policy configuration at https://openrouter.ai/settings/privacy
FREE_MODELS = {
    'chat': 'deepseek/deepseek-r1-0528:free',  # Primary free model (works, but slower)
    # Note: Most other free models return 404 errors
    # Note: openai/gpt-oss-120b:free requires data policy configuration
    # Note: google/gemini-2.0-flash-exp:free is not available (404 error)
    # Note: meta-llama/llama-3.1-8b-instruct:free is not available (404 error)
    # Note: microsoft/phi-3-mini-128k-instruct:free is not available (404 error)
}

class OpenRouterClient:
    def __init__(self, api_key=None):
        self.api_key = api_key or os.getenv('OPENROUTER_API_KEY')
        if not self.api_key:
            raise ValueError("OPENROUTER_API_KEY not set in environment variables")
        
        # OpenRouter API endpoint
        self.base_url = "https://openrouter.ai/api/v1"
        self.headers = {
            "Authorization": f"Bearer {self.api_key}",
            "HTTP-Referer": "https://github.com/your-repo",  # Optional: for analytics
            "X-Title": "News Viewer App",  # Optional: for analytics
            "Content-Type": "application/json"
        }
        
        # OpenRouter API keys can have various formats, no need to validate format
        
    
    def chat_completions_create(self, model=None, messages=None, temperature=0.7, max_tokens=1000, **kwargs):
        """
        Create a chat completion using OpenRouter API
        Compatible with OpenAI SDK format
        Uses free models by default (models with :free suffix)
        Automatically tries alternative models if the primary one fails
        """
        if not model:
            model = FREE_MODELS['chat']  # Default to deepseek/deepseek-r1-0528:free
        
        # Ensure model has :free suffix if it's a free model
        if model in FREE_MODELS.values() and not model.endswith(':free'):
            model = f"{model}:free"
        
        url = f"{self.base_url}/chat/completions"
        
        # Try the requested model, and if it fails with data policy error, try alternatives
        models_to_try = [model] + [m for m in FREE_MODELS.values() if m != model]
        
        last_error = None
        for attempt_model in models_to_try:
            payload = {
                "model": attempt_model,
                "messages": messages or [],
                "temperature": temperature,
                "max_tokens": max_tokens,
                **kwargs
            }
            
            try:
                print(f"Making OpenRouter API request to: {url}")
                print(f"Using model: {attempt_model}")
                
                response = requests.post(url, headers=self.headers, json=payload, timeout=60)
                
                # Log response details for debugging
                print(f"Response status: {response.status_code}")
                if response.status_code != 200:
                    print(f"Response text: {response.text[:500]}")
                
                response.raise_for_status()
                
                # Success! Return the response
                data = response.json()
                
                # Return in OpenAI-compatible format
                class Choice:
                    def __init__(self, choice_data):
                        self.message = type('Message', (), {
                            'content': choice_data['message']['content'],
                            'role': choice_data['message']['role']
                        })()
                
                class Response:
                    def __init__(self, data):
                        self.choices = [Choice(choice) for choice in data.get('choices', [])]
                
                return Response(data)
                
            except requests.exceptions.HTTPError as e:
                error_detail = ""
                try:
                    error_data = e.response.json()
                    if isinstance(error_data, dict) and 'error' in error_data:
                        error_detail = error_data['error'].get('message', str(e))
                except:
                    error_detail = e.response.text[:200] if hasattr(e, 'response') else str(e)
                
                # If it's a data policy error and we have more models to try, continue
                if 'data policy' in error_detail.lower() or 'privacy' in error_detail.lower():
                    if attempt_model != models_to_try[-1]:  # Not the last model
                        print(f"Model {attempt_model} requires data policy configuration. Trying alternative...")
                        last_error = f"OpenRouter API HTTP error: {e.response.status_code} - {error_detail}"
                        continue
                
                # For other errors or if this is the last model, raise the error
                error_msg = f"OpenRouter API HTTP error: {e.response.status_code}"
                if error_detail:
                    error_msg += f" - {error_detail}"
                    if 'data policy' in error_detail.lower():
                        error_msg += "\n\nTo fix this: Go to https://openrouter.ai/settings/privacy and configure your data policy settings."
                raise Exception(error_msg)
            
            except requests.exceptions.RequestException as e:
                # For network errors, try next model if available
                if attempt_model != models_to_try[-1]:
                    print(f"Network error with {attempt_model}. Trying alternative...")
                    last_error = str(e)
                    continue
                raise Exception(f"OpenRouter API error: {str(e)}")
        
        # If we've tried all models and failed, raise the last error
        if last_error:
            raise Exception(last_error)
        raise Exception("Failed to get response from OpenRouter API after trying all models")
    
    def audio_speech_create(self, model=None, voice=None, input_text=None):
        """
        OpenRouter doesn't support TTS directly
        This is a placeholder - you can integrate with Google TTS or another service
        For now, returns None to indicate TTS is not available
        """
        # OpenRouter doesn't have TTS API
        # You could integrate Google TTS here if needed
        raise NotImplementedError("TTS not available through OpenRouter. Consider using Google TTS or another service.")
