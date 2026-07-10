import os
import httpx
from typing import Optional

class LLMClient:
    def __init__(self, api_key: Optional[str] = None):
        self.api_key = api_key or os.environ.get("ANTHROPIC_API_KEY")

    def phrase_question(self, obligation_text: str, item_text: str) -> str:
        """
        Phrases a checklist item into a natural language question.
        Falls back to a clean deterministic template if no API key is set.
        """
        if not self.api_key:
            # Deterministic natural phrasing fallback
            clean_item = item_text.strip().rstrip('.')
            # De-capitalize the first letter if it is not an acronym
            if clean_item and clean_item[0].isupper() and not clean_item[1:3].isupper():
                clean_item = clean_item[0].lower() + clean_item[1:]
                
            return f"Please describe how you address the following requirement: {clean_item}."
        
        # Real Claude API integration if API key is provided
        headers = {
            "x-api-key": self.api_key,
            "anthropic-version": "2023-06-01",
            "content-type": "application/json"
        }
        
        prompt = (
            f"You are an expert privacy auditor. Convert the following technical checklist item "
            f"into a natural, professional question that asks an organization how they comply.\n\n"
            f"Context Obligation: {obligation_text}\n"
            f"Checklist Item: {item_text}\n\n"
            f"Rules:\n"
            f"1. Ask a direct, open-ended question.\n"
            f"2. Do not include any intro, outro, or conversational filler.\n"
            f"3. Return only the question text."
        )
        
        payload = {
            "model": "claude-3-5-sonnet-20240620",
            "max_tokens": 150,
            "messages": [
                {"role": "user", "content": prompt}
            ]
        }
        
        try:
            response = httpx.post("https://api.anthropic.com/v1/messages", json=payload, headers=headers, timeout=10.0)
            if response.status_code == 200:
                result = response.json()
                question = result["content"][0]["text"].strip()
                return question
            else:
                raise RuntimeError(f"Claude API returned status {response.status_code}: {response.text}")
        except Exception as e:
            # Safe fallback if API call fails
            clean_item = item_text.strip().rstrip('.')
            if clean_item and clean_item[0].isupper() and not clean_item[1:3].isupper():
                clean_item = clean_item[0].lower() + clean_item[1:]
            return f"Please explain your process for ensuring: {clean_item} (Fallback due to: {str(e)})."

    def generate_assessor_reply(self, question: str, answer: str, item_text: str, verdict: str, citation: str) -> str:
        """
        Generates a conversational, context-aware reply from the auditor explaining the verdict.
        Falls back to dynamic rule-based conversational replies if API key is not set.
        """
        if not self.api_key:
            # Smart dynamic local templates based on verdict
            if verdict == "PRESENT":
                return (
                    f"Excellent. Based on your response, compliance is verified for the checklist item: "
                    f"'{item_text}' under {citation}. Your evidence shows a solid alignment with the requirements."
                )
            elif verdict == "MISSING":
                return (
                    f"I've flagged a compliance gap under {citation} regarding: '{item_text}'. "
                    f"Your answer indicating '{answer}' does not meet the necessary criteria. A remediation recommendation has been created."
                )
            else:
                return (
                    f"The details provided ('{answer}') do not contain sufficient evidence to evaluate compliance "
                    f"for: '{item_text}' under {citation}. Could you specify the exact mechanisms, safeguards, or procedures in place?"
                )

        headers = {
            "x-api-key": self.api_key,
            "anthropic-version": "2023-06-01",
            "content-type": "application/json"
        }
        
        prompt = (
            f"You are a professional DPDPA 2023 compliance auditor. Write a short, natural, conversational response "
            f"to the user's answer to our audit question.\n\n"
            f"Checklist Item: {item_text}\n"
            f"Question Asked: {question}\n"
            f"User Answer: {answer}\n"
            f"Compliance Verdict: {verdict}\n"
            f"Section Citation: {citation}\n\n"
            f"Rules:\n"
            f"1. Explain the compliance verdict clearly and link it to the DPDPA citation.\n"
            f"2. Keep the tone professional, direct, and slightly conversational.\n"
            f"3. Maximum 3 sentences.\n"
            f"4. Do not include introductory or concluding conversational fluff. Start directly with the feedback."
        )
        
        payload = {
            "model": "claude-3-5-sonnet-20240620",
            "max_tokens": 200,
            "messages": [
                {"role": "user", "content": prompt}
            ]
        }
        
        try:
            response = httpx.post("https://api.anthropic.com/v1/messages", json=payload, headers=headers, timeout=10.0)
            if response.status_code == 200:
                return response.json()["content"][0]["text"].strip()
            else:
                raise RuntimeError(f"Claude API returned status {response.status_code}")
        except Exception as e:
            # Fallback
            if verdict == "PRESENT":
                return f"Verified compliance under {citation} for: {item_text}."
            elif verdict == "MISSING":
                return f"Flagged a gap under {citation} for: {item_text}. Corrective action registered."
            else:
                return f"Insufficient evidence to verify {citation} ({item_text}). Fallback error: {str(e)}"
