from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any

class ChecklistRule(BaseModel):
    item: str = Field(..., description="Checklist verification item text")
    positive_keywords: List[str] = Field(..., description="List of positive substrings to match presence")
    negative_keywords: List[str] = Field(default_factory=list, description="List of negative/negation substrings to look for")

class Obligation(BaseModel):
    id: str = Field(..., description="Unique string identifier for the obligation (e.g., ob_s5_1_notice)")
    section_citation: str = Field(..., description="The specific section citation in the Act (e.g., Section 5(1))")
    chapter: str = Field(..., description="The chapter designation (e.g., Chapter II)")
    obligation_text: str = Field(..., description="Text summarizing or defining the core obligation")
    applicability_conditions: Dict[str, Any] = Field(
        ..., 
        description="Conditions under which this obligation applies. E.g., {'role': 'Data Fiduciary', 'handles_children_data': true}"
    )
    evidence_checklist: List[ChecklistRule] = Field(
        ..., 
        description="List of specific, verifiable evidence items and their matching rules"
    )
    exemption_refs: List[str] = Field(
        default_factory=list,
        description="List of sections under which exemptions can apply (e.g., ['Section 17(1)', 'Section 17(2)'])"
    )
    penalty_ref: Optional[str] = Field(
        None, 
        description="Reference to Section 33 or the Schedule specifying penalties for non-compliance"
    )
    version: int = Field(1, description="Schema version number")
