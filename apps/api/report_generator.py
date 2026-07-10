import os
import re
import json
from jinja2 import Template
from typing import Dict, Any, List

class ReportGenerator:
    HTML_TEMPLATE = """<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>DPDPA Compliance Audit Report</title>
    <style>
        body {
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            color: #1e293b;
            background-color: #f8fafc;
            line-height: 1.6;
            margin: 0;
            padding: 40px;
        }
        .container {
            max-width: 1000px;
            margin: 0 auto;
            background: #ffffff;
            padding: 40px;
            border-radius: 12px;
            box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1);
            border: 1px solid #e2e8f0;
        }
        h1 {
            color: #0f172a;
            border-bottom: 2px solid #3b82f6;
            padding-bottom: 15px;
            margin-top: 0;
        }
        h2 {
            color: #1e293b;
            border-bottom: 1px solid #e2e8f0;
            padding-bottom: 8px;
            margin-top: 30px;
        }
        h3 {
            color: #334155;
            margin-top: 20px;
        }
        .score-box {
            display: flex;
            align-items: center;
            justify-content: space-between;
            background: #f1f5f9;
            padding: 24px;
            border-radius: 8px;
            margin-bottom: 30px;
            border-left: 6px solid #3b82f6;
        }
        .score-value {
            font-size: 48px;
            font-weight: 800;
            color: {{ overall_score_color }};
        }
        table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 15px;
            margin-bottom: 25px;
        }
        th, td {
            text-align: left;
            padding: 12px;
            border-bottom: 1px solid #e2e8f0;
        }
        th {
            background-color: #f1f5f9;
            color: #334155;
            font-weight: 600;
        }
        .badge {
            display: inline-block;
            padding: 4px 8px;
            border-radius: 4px;
            font-size: 12px;
            font-weight: 600;
            text-transform: uppercase;
        }
        .badge-present { background-color: #dcfce7; color: #15803d; }
        .badge-missing { background-color: #fee2e2; color: #b91c1c; }
        .badge-insufficient { background-color: #fef9c3; color: #a16207; }
        .badge-review { background-color: #ffedd5; color: #c2410c; }
        
        .badge-severity-high { background-color: #fca5a5; color: #991b1b; }
        .badge-severity-medium { background-color: #fde047; color: #854d0e; }
        .badge-severity-low { background-color: #cbd5e1; color: #334155; }

        .raci-matrix td {
            text-align: center;
            font-weight: bold;
        }
        .raci-matrix td:first-child {
            text-align: left;
            font-weight: normal;
        }
        .roadmap-item {
            padding: 15px;
            border: 1px solid #e2e8f0;
            border-radius: 6px;
            margin-bottom: 15px;
            background: #fafafa;
        }
        .roadmap-item-HIGH { border-left: 5px solid #ef4444; }
        .roadmap-item-MEDIUM { border-left: 5px solid #eab308; }
        .roadmap-item-LOW { border-left: 5px solid #64748b; }
    </style>
</head>
<body>
    <div class="container">
        <h1>DPDPA 2023 Audit Report</h1>
        <p><strong>Audit Reference:</strong> {{ audit_id }}</p>
        
        <!-- Scorecard Section -->
        <h2>1. Executive Scorecard</h2>
        <div class="score-box">
            <div>
                <p style="margin: 0; font-weight: 600; text-transform: uppercase; color: #64748b;">Overall Compliance Rating</p>
                <p style="margin: 5px 0 0 0; color: #475569;">Calculated by re-normalizing category weights based on active applicability criteria.</p>
            </div>
            <div class="score-value">{{ overall_score }}%</div>
        </div>

        <h3>Category Compliance Roll-up</h3>
        <table>
            <thead>
                <tr>
                    <th>Category</th>
                    <th>Average Score</th>
                </tr>
            </thead>
            <tbody>
                {% for cat, score in category_scores.items() %}
                <tr>
                    <td style="text-transform: capitalize; font-weight: 500;">{{ cat.capitalize() }} Obligations</td>
                    <td>{{ (score * 100) | round(2) }}%</td>
                </tr>
                {% endfor %}
            </tbody>
        </table>

        <!-- Gap Register Section -->
        <h2>2. Compliance Gap Register</h2>
        <table>
            <thead>
                <tr>
                    <th>Citation</th>
                    <th>Checklist Requirement</th>
                    <th>Verdict</th>
                    <th>Evidence Snippet</th>
                </tr>
            </thead>
            <tbody>
                {% for item in gap_register %}
                <tr>
                    <td style="font-weight: 600; white-space: nowrap;">{{ item.section_citation }}</td>
                    <td>{{ item.item_text }}</td>
                    <td>
                        {% if item.verdict == "PRESENT" %}
                        <span class="badge badge-present">Compliant</span>
                        {% elif item.verdict == "MISSING" %}
                        <span class="badge badge-missing">Non-Compliant</span>
                        {% elif item.verdict == "INSUFFICIENT_EVIDENCE" %}
                        <span class="badge badge-insufficient">Insufficient Evidence</span>
                        {% else %}
                        <span class="badge badge-review">Human Review</span>
                        {% endif %}
                    </td>
                    <td style="font-style: italic; color: #475569; font-size: 13px;">"{{ item.raw_evidence }}"</td>
                </tr>
                {% endfor %}
            </tbody>
        </table>

        <!-- Derived ROPA Section -->
        <h2>3. Auto-Derived Record of Processing Activities (ROPA)</h2>
        <p>Derived dynamically from evidence responses for Section 5(1) & 5(2) obligations:</p>
        <table>
            <thead>
                <tr>
                    <th>Data Category</th>
                    <th>Processing Purpose</th>
                    <th>Retention Period</th>
                </tr>
            </thead>
            <tbody>
                {% for ropa in derived_ropa %}
                <tr>
                    <td style="font-weight: 500;">{{ ropa.data_category }}</td>
                    <td>{{ ropa.purpose }}</td>
                    <td>{{ ropa.retention }}</td>
                </tr>
                {% endfor %}
            </tbody>
        </table>

        <!-- RACI Matrix Section -->
        <h2>4. Auto-Suggested RACI Matrix</h2>
        <p>Roles: <strong>R</strong>esponsible, <strong>A</strong>ccountable, <strong>C</strong>onsulted, <strong>I</strong>nformed</p>
        <table class="raci-matrix">
            <thead>
                <tr>
                    <th>DPDPA Operational Area</th>
                    <th>Data Protection Officer (DPO)</th>
                    <th>IT/Security Team</th>
                    <th>Legal & Compliance</th>
                    <th>Board / Executive</th>
                </tr>
            </thead>
            <tbody>
                {% for row in raci_matrix %}
                <tr>
                    <td>{{ row.area }}</td>
                    <td>{{ row.dpo }}</td>
                    <td>{{ row.it_security }}</td>
                    <td>{{ row.legal }}</td>
                    <td>{{ row.board }}</td>
                </tr>
                {% endfor %}
            </tbody>
        </table>

        <!-- Remediation Roadmap Section -->
        <h2>5. Severity-Ranked Remediation Roadmap</h2>
        {% if roadmap_items %}
            {% for item in roadmap_items %}
            <div class="roadmap-item roadmap-item-{{ item.severity }}">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                    <span style="font-weight: bold; color: #0f172a;">{{ item.section_citation }} ({{ item.obligation_id }})</span>
                    <span class="badge badge-severity-{{ item.severity | lower }}">{{ item.severity }} Priority</span>
                </div>
                <p style="margin: 0 strong 5px 0;"><strong>Gap:</strong> {{ item.item_text }}</p>
                <p style="margin: 5px 0 0 0; color: #334155; font-style: italic;"><strong>Remediation:</strong> {{ item.remediation }}</p>
            </div>
            {% endfor %}
        {% else %}
            <p style="color: #15803d; font-weight: 600;">No compliance gaps identified. Perfect audit score!</p>
        {% endif %}
    </div>
</body>
</html>
"""

    @staticmethod
    def get_report_dir() -> str:
        base_dir = os.path.dirname(os.path.abspath(__file__))
        report_dir = os.path.join(base_dir, "reports")
        os.makedirs(report_dir, exist_ok=True)
        return report_dir

    @classmethod
    def get_report_path(cls, audit_id: str) -> str:
        return os.path.join(cls.get_report_dir(), f"report_{audit_id}.html")

    @classmethod
    def derive_ropa(cls, audit_log: Dict[str, Any]) -> List[Dict[str, str]]:
        """
        Auto-derives ROPA categories and purposes from Section 5(1)/5(2) evidence.
        Falls back to default categories if not specifically mentioned.
        """
        # Look for notice collect answers
        notice_evidence = ""
        purpose_evidence = ""
        
        state = audit_log.get("current_state", {})
        if "ob_s5_1_notice_consent" in state:
            notice_items = state["ob_s5_1_notice_consent"]
            for text, details in notice_items.items():
                if "categories" in text.lower():
                    notice_evidence = details.get("raw_evidence", "")
                if "purpose" in text.lower():
                    purpose_evidence = details.get("raw_evidence", "")

        # Extract categories using basic keyword scanning
        data_categories = []
        if notice_evidence:
            for kw in ["name", "email", "phone", "location", "birthdate", "age", "address", "ip address"]:
                if re.search(rf"\b{kw}\b", notice_evidence, re.IGNORECASE):
                    data_categories.append(kw.title())
        
        if not data_categories:
            data_categories = ["User Identity Data (Name, Email, Phone)", "Technical Identifiers (IP, Device ID)"]

        # Extract purpose using basic keyword scanning
        derived_purpose = ""
        if purpose_evidence:
            purpose_match = re.search(r"only for\s+([^.]+)", purpose_evidence, re.IGNORECASE)
            if purpose_match:
                derived_purpose = purpose_match.group(1).strip()

        if not derived_purpose:
            derived_purpose = "User account registration and core service fulfillment"

        # Construct ROPA
        ropa_list = []
        for i, cat in enumerate(data_categories):
            # Assign retention periods
            retention = "Until account deletion"
            if "payment" in cat.lower() or "transaction" in cat.lower():
                retention = "7 years (regulatory financial records)"
            
            ropa_list.append({
                "data_category": cat,
                "purpose": derived_purpose if i == 0 else "Customer service and fraud prevention",
                "retention": retention
            })
            
        return ropa_list

    @classmethod
    def build_raci_matrix(cls, audit_log: Dict[str, Any]) -> List[Dict[str, str]]:
        """
        Builds the RACI matrix dynamically based on applicable obligation categories.
        """
        raci = []
        state = audit_log.get("current_state", {})
        
        if "ob_s5_1_notice_consent" in state or "ob_s6_1_consent_quality" in state:
            raci.append({
                "area": "Deploy privacy notices and consent checkboxes (s5, s6)",
                "dpo": "C", "it_security": "I", "legal": "R", "board": "A"
            })
        if "ob_s8_5_security_safeguards" in state:
            raci.append({
                "area": "Implement database encryption & MFA safeguards (s8(5))",
                "dpo": "C", "it_security": "R", "legal": "I", "board": "A"
            })
        if "ob_s8_6_breach_notification" in state:
            raci.append({
                "area": "Data breach incident reporting within timelines (s8(6))",
                "dpo": "R", "it_security": "R", "legal": "C", "board": "A"
            })
        if "ob_s9_1_child_consent" in state:
            raci.append({
                "area": "Parental consent and age gating (s9)",
                "dpo": "C", "it_security": "I", "legal": "R", "board": "A"
            })
        if "ob_s10_2_a_sdf_dpo" in state:
            raci.append({
                "area": "DPO legal appointment and Board reporting (s10)",
                "dpo": "R", "it_security": "I", "legal": "C", "board": "A"
            })
        if "ob_s11_rights_access" in state:
            raci.append({
                "area": "Deploy user access/erasure self-service dashboard (s11)",
                "dpo": "C", "it_security": "R", "legal": "I", "board": "A"
            })
        if "ob_s16_cross_border_transfer" in state:
            raci.append({
                "area": "Data localization and cross-border routing maps (s16)",
                "dpo": "C", "it_security": "R", "legal": "C", "board": "A"
            })
            
        return raci

    @classmethod
    def rank_roadmaps(cls, recommendations: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """
        Ranks recommendations by priority/severity:
        - HIGH: SDF obligations, Child consent, or breach notifications.
        - MEDIUM: Notice, consent quality, and user access rights.
        - LOW: Other checklist gaps.
        """
        ranked = []
        for rec in recommendations:
            ob_id = rec.get("obligation_id", "")
            
            if ob_id in ["ob_s10_2_a_sdf_dpo", "ob_s9_1_child_consent", "ob_s8_6_breach_notification"]:
                severity = "HIGH"
            elif ob_id in ["ob_s5_1_notice_consent", "ob_s5_2_notice_pre_consent", "ob_s6_1_consent_quality", "ob_s11_rights_access"]:
                severity = "MEDIUM"
            else:
                severity = "LOW"
                
            ranked.append({
                "obligation_id": ob_id,
                "section_citation": rec.get("section_citation"),
                "item_text": rec.get("item_text"),
                "remediation": rec.get("remediation"),
                "severity": severity
            })
            
        # Sort so HIGH is first, then MEDIUM, then LOW
        priority_map = {"HIGH": 0, "MEDIUM": 1, "LOW": 2}
        ranked.sort(key=lambda x: priority_map.get(x["severity"], 3))
        return ranked

    @classmethod
    def assemble_report(cls, audit_id: str, scores: Dict[str, Any], recommendations: List[Dict[str, Any]]) -> str:
        """
        Assembles and saves a styled compliance HTML report using Jinja2 templates.
        """
        log = os.path.join(os.path.dirname(os.path.abspath(__file__)), "audit_logs", f"audit_{audit_id}.json")
        audit_log = {}
        if os.path.exists(log):
            with open(log, "r", encoding="utf-8") as f:
                audit_log = json.load(f)

        # 1. Prepare gap register list
        gap_register = []
        for ob_id, items in audit_log.get("current_state", {}).items():
            for item_text, state in items.items():
                gap_register.append({
                    "section_citation": ob_id.replace("ob_s", "Section ").replace("_", " ").title().split()[1],
                    # Let's derive a correct citation string (e.g. s5_1_notice -> Section 5(1))
                    "section_citation": "Section 5(1)" if "s5_1" in ob_id else 
                                       "Section 5(2)" if "s5_2" in ob_id else
                                       "Section 6(1)" if "s6_1" in ob_id else
                                       "Section 8(5)" if "s8_5" in ob_id else
                                       "Section 8(6)" if "s8_6" in ob_id else
                                       "Section 9(1)" if "s9_1" in ob_id else
                                       "Section 10(2)(a)" if "s10_2" in ob_id else
                                       "Section 11" if "s11" in ob_id else
                                       "Section 16" if "s16" in ob_id else "Section Code",
                    "item_text": item_text,
                    "verdict": state.get("resolved_verdict"),
                    "raw_evidence": state.get("raw_evidence")
                })

        # 2. Derive ROPA & RACI & Roadmap
        derived_ropa = cls.derive_ropa(audit_log)
        raci_matrix = cls.build_raci_matrix(audit_log)
        roadmap_items = cls.rank_roadmaps(recommendations)

        # 3. Determine Overall Score Colors
        score = scores.get("overall_score", 0.0)
        score_color = "#16a34a" # Green (>= 80%)
        if score < 50.0:
            score_color = "#dc2626" # Red (< 50%)
        elif score < 80.0:
            score_color = "#ca8a04" # Yellow (50% - 79%)

        # 4. Render
        t = Template(cls.HTML_TEMPLATE)
        html_out = t.render(
            audit_id=audit_id,
            overall_score=score,
            overall_score_color=score_color,
            category_scores=scores.get("category_scores", {}),
            gap_register=gap_register,
            derived_ropa=derived_ropa,
            raci_matrix=raci_matrix,
            roadmap_items=roadmap_items
        )

        # 5. Save report
        path = cls.get_report_path(audit_id)
        with open(path, "w", encoding="utf-8") as f:
            f.write(html_out)
            
        return path
