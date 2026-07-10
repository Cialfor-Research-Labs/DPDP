import re
from typing import List, Dict, Any

class DeterministicChecker:
    @staticmethod
    def clean_text(text: str) -> str:
        # Normalize smart quotes to standard single quote
        text = text.replace('’', "'").replace('‘', "'").replace('`', "'")
        # Lowercase, clean punctuation, and whitespace
        text = text.lower().strip()
        text = re.sub(r'[^\w\s\-\']', ' ', text)
        return ' '.join(text.split())

    @classmethod
    def evaluate_item(cls, answer: str, item_text: str, positive_keywords: List[str], negative_keywords: List[str]) -> str:
        cleaned_answer = cls.clean_text(answer)
        
        # Check if the answer is completely empty or extremely short/irrelevant
        if not cleaned_answer or len(cleaned_answer.split()) < 3:
            return "INSUFFICIENT_EVIDENCE"

        # Generic negations in English (including contractions)
        generic_negations = [
            "not", "no", "dont", "don't", "doesnt", "doesn't", "didnt", "didn't",
            "without", "fail", "failed", "missing", "omit", "omitted", "lacks",
            "lack", "absent", "except", "prevent", "avoid"
        ]

        # Split original answer by major clause boundaries (semi-colon, but, however, yet)
        # to prevent negations in one clause from incorrectly overriding positives in another clause.
        clauses = re.split(r'[;]|\bbut\b|\bhowever\b|\byet\b', answer, flags=re.IGNORECASE)
        
        has_active_negative = False
        has_valid_positive = False
        has_negated_positive = False

        for clause in clauses:
            cleaned_clause = cls.clean_text(clause)
            if not cleaned_clause:
                continue

            # 1. Remove negated negative keyword phrases from the clause text
            for neg_kw in negative_keywords:
                neg_idx = cleaned_clause.find(neg_kw)
                if neg_idx != -1:
                    # Look at the text immediately preceding the negative keyword (last 20 chars)
                    preceding = cleaned_clause[max(0, neg_idx-20):neg_idx]
                    for neg in generic_negations:
                        neg_match = re.search(rf"\b{neg}\b", preceding)
                        if neg_match:
                            # Strip from negation word to the end of the negative keyword
                            start = neg_idx - len(preceding) + neg_match.start()
                            end = neg_idx + len(neg_kw)
                            cleaned_clause = cleaned_clause[:start] + " " + cleaned_clause[end:]
                            break

            # 2. Check if any negative keyword is still present (unnegated)
            clause_negatives_found = False
            for neg_kw in negative_keywords:
                neg_idx = cleaned_clause.find(neg_kw)
                if neg_idx != -1:
                    clause_negatives_found = True
                    break

            if clause_negatives_found:
                has_active_negative = True

            # 3. Check positive keywords in this clause
            clause_positives = [pos for pos in positive_keywords if pos in cleaned_clause]
            for pos_kw in clause_positives:
                pos_idx = cleaned_clause.find(pos_kw)
                if pos_idx != -1:
                    # Look at the text preceding the positive keyword (last 35 chars)
                    preceding = cleaned_clause[max(0, pos_idx-35):pos_idx]
                    if any(re.search(rf"\b{neg}\b", preceding) for neg in generic_negations):
                        has_negated_positive = True
                    else:
                        has_valid_positive = True

        # Resolve overall status
        if has_active_negative:
            return "MISSING"
        elif has_negated_positive:
            return "MISSING"
        elif has_valid_positive:
            return "PRESENT"
        else:
            return "INSUFFICIENT_EVIDENCE"

    @classmethod
    def evaluate_obligation(cls, answer: str, obligation: Dict[str, Any]) -> List[Dict[str, Any]]:
        results = []
        evidence_checklist = obligation.get("evidence_checklist", [])
        
        for rule in evidence_checklist:
            # support both object and dict format
            if isinstance(rule, dict):
                item_text = rule.get("item", "")
                pos_kws = rule.get("positive_keywords", [])
                neg_kws = rule.get("negative_keywords", [])
            else:
                # ChecklistRule object
                item_text = getattr(rule, "item", "")
                pos_kws = getattr(rule, "positive_keywords", [])
                neg_kws = getattr(rule, "negative_keywords", [])
            
            status = cls.evaluate_item(answer, item_text, pos_kws, neg_kws)
            results.append({
                "item": item_text,
                "status": status
            })
            
        return results
