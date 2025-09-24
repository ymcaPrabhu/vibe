use chrono::{DateTime, Utc};
use serde_json::Value;
use std::collections::HashMap;

// Function to format date in DD-Mon-YYYY format (Indian style)
pub fn format_indian_date(date: DateTime<Utc>) -> String {
    date.format("%d-%b-%Y").to_string()
}

// Function to normalize text in Government of India style
pub fn normalize_goi_text(text: &str) -> String {
    // In a real implementation, we would apply Government of India writing standards
    // For now, we'll just return the text as is
    text.to_string()
}

// Function to validate citation format
pub fn validate_citation_format(citation_json: &Value) -> Result<(), String> {
    // Check if required fields exist
    match citation_json {
        Value::Object(map) => {
            if !map.contains_key("url") && !map.contains_key("doi") {
                return Err("Citation must have either URL or DOI".to_string());
            }
            if !map.contains_key("title") {
                return Err("Citation must have a title".to_string());
            }
            if !map.contains_key("publisher") {
                return Err("Citation must have a publisher".to_string());
            }
            if !map.contains_key("year") {
                return Err("Citation must have a year".to_string());
            }
            Ok(())
        }
        _ => Err("Citation must be an object".to_string())
    }
}

// Function to deduplicate citations
pub fn deduplicate_citations(citations: Vec<crate::models::Citation>) -> Vec<crate::models::Citation> {
    let mut seen = std::collections::HashSet::new();
    let mut unique_citations = Vec::new();
    
    for citation in citations {
        let key = format!("{}-{}", citation.url, citation.title);
        if !seen.contains(&key) {
            seen.insert(key);
            unique_citations.push(citation);
        }
    }
    
    unique_citations
}